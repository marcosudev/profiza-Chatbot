import { config } from "./config"
import { extrairIntencao } from "./ai"
import { categorias, resolverCategoriaPendente } from "./knowledge/categorias"
import { carregarSessao, salvarSessao, type Sessao } from "./session"
import {
  buscarProfissionais,
  buscarProfissionaisFallback,
  carregarBairrosDoProfissional,
  buscarProfissionalPorWhatsApp,
  buscarLeadPendenteFeedback,
  interpretarFeedback,
  registrarFeedbackLead,
  rotuloFeedback,
  salvarLead,
  atualizarLeadMensagemId,
  sessaoHumanoAtivo,
  marcarSessaoHumanoAtivo,
  registrarOcorrencia,
  registrarMetricaMensagem,
  registrarInteresseCidade,
  apagarDadosContato,
  registrarFeedbackCliente,
} from "./supabase"
import { enviarMensagem, enviarPresenca } from "./evolution"
import { mensagens } from "./messages"
import { enviarAlertaHandoff, isBotPausado } from "./telegram"
import { extrairCoordenadas, coordenadasParaBairro } from "./geo"
import type { ItemBuffer } from "./buffer"
import { hashContato, solicitouExclusaoDados } from "./privacidade"

export interface LoteRecebido {
  telefone: string
  nome: string
  itens: ItemBuffer[]
}

export async function processarLote(lote: LoteRecebido): Promise<void> {
  const { telefone, nome, itens } = lote

  // Bot pausado globalmente (/pausar no Telegram)
  if (isBotPausado()) return

  // Sessão com humano ativo — bot não responde
  if (await sessaoHumanoAtivo(telefone)) return

  // Resolve localização compartilhada antes de montar o texto
  const itensResolvidos = itens.map(item => {
    if (item.tipo !== "texto") return item
    const coords = extrairCoordenadas(item.conteudo)
    if (!coords) return item
    const bairroGeo = coordenadasParaBairro(coords.lat, coords.lng)
    if (!bairroGeo) return { ...item, conteudo: "__fora_de_bauru__" }
    return { ...item, conteudo: `meu bairro é ${bairroGeo.bairro}` }
  })

  // Verifica se cliente está fora de Bauru
  if (itensResolvidos.some(i => i.conteudo === "__fora_de_bauru__")) {
    const sessao = await carregarSessao(telefone)
    sessao.ultimaIntencao = "fora_bauru"
    await salvarSessao(telefone, sessao)
    await enviarPresenca(telefone, "paused")
    await enviarMensagem(telefone, mensagens.foraDeBauru())
    return
  }

  const textos = itensResolvidos
    .filter(i => i.tipo === "texto")
    .map(i => i.conteudo)
    .join("\n")

  if (!textos.trim()) return

  if (solicitouExclusaoDados(textos)) {
    try {
      await apagarDadosContato(telefone)
      await enviarMensagem(telefone, "Pronto. Apaguei sua sessão e removi seus dados pessoais dos registros de leads.")
    } catch (err) {
      console.error("[bot] Falha ao apagar dados do contato:", err)
      await enviarMensagem(telefone, "Não consegui concluir a exclusão agora. Nossa equipe vai verificar o pedido.")
    }
    return
  }

  console.log(`[bot] Lote de contato ${hashContato(telefone).slice(0, 12)}`)

  const inicio = Date.now()
  await enviarPresenca(telefone, "composing")

  // Verifica se é profissional respondendo feedback
  const profissional = await buscarProfissionalPorWhatsApp(telefone)
  const feedback = profissional ? interpretarFeedback(textos) : null
  if (profissional && feedback) {
    const lead = await buscarLeadPendenteFeedback(profissional.id)
    if (lead) {
      const atualizado = await registrarFeedbackLead(lead.id, feedback)
      if (atualizado) {
        await enviarPresenca(telefone, "paused")
        await enviarMensagem(telefone, mensagens.feedbackRegistrado(rotuloFeedback(feedback)))
      }
    } else {
      await enviarPresenca(telefone, "paused")
      await enviarMensagem(telefone, mensagens.semFeedbackPendente())
    }
    return
  }

  // Verifica se é cliente respondendo ao feedback 48h (👍 / 👎)
  const isPositivo = /👍|deu certo|ótimo|otimo|gostei|bom/i.test(textos.trim())
  const isNegativo = /👎|ruim|péssimo|pessimo|problema|não gostei|nao gostei/i.test(textos.trim())
  if (isPositivo || isNegativo) {
    const feedbackCliente = await registrarFeedbackCliente(telefone, isPositivo)
    if (feedbackCliente.registrado) {
      await enviarPresenca(telefone, "paused")
      const msg = isPositivo
        ? mensagens.agradecerFeedbackClientePositivo()
        : mensagens.agradecerFeedbackClienteNegativo()
      await enviarMensagem(telefone, msg)
      return
    }
  }

  // Carrega sessão persistida
  const sessao = await carregarSessao(telefone)
  if (nome && !sessao.nome) sessao.nome = nome

  // Extrai intenção via IA com RAG
  const intencao = await extrairIntencao(textos, sessao)

  if (sessao.categoriasPendentes?.length) {
    const selecionada = resolverCategoriaPendente(textos, sessao.categoriasPendentes)
      ?? (intencao.categoria && sessao.categoriasPendentes.includes(intencao.categoria)
        ? intencao.categoria
        : null)
    if (selecionada) {
      intencao.categoria = selecionada
      intencao.categoriasAlternativas = []
    } else {
      intencao.categoria = null
      intencao.categoriasAlternativas = []
    }
    sessao.categoriasPendentes = []
  }

  console.log("[bot] Intenção:", {
    categoria: intencao.categoria,
    categoriasAlternativas: intencao.categoriasAlternativas,
    bairro: intencao.bairro,
    intencao: intencao.intencao,
    confianca: intencao.confianca,
  })

  await enviarPresenca(telefone, "paused")

  // ── Intenções especiais ──────────────────────────────────────────────────────

  if (intencao.intencao === "emergencia") {
    await enviarMensagem(telefone, mensagens.emergencia())
    return
  }

  if (intencao.intencao === "cadastro_profissional") {
    await enviarMensagem(telefone, mensagens.cadastroProfissional())
    return
  }

  if (intencao.intencao === "fora_escopo") {
    // Verifica se cliente quer ser avisado sobre nova cidade
    const querAviso = /sim|quero|avisa|avise|pode/i.test(textos)
    if (sessao.ultimaIntencao === "fora_bauru" && querAviso) {
      await registrarInteresseCidade(telefone, textos)
      await enviarMensagem(telefone, "Anotado! Te avisamos quando chegarmos na sua cidade. 😊")
      return
    }
    await enviarMensagem(telefone, mensagens.foraEscopo())
    return
  }

  // Reclamação → handoff
  if (intencao.intencao === "reclamacao") {
    const ocorrenciaId = await registrarOcorrencia(null, null, textos)
    await _dispararHandoff(telefone, sessao, "Reclamação do cliente", textos)
    await enviarMensagem(telefone, mensagens.reclamacaoRegistrada())
    return
  }

  // Pedido de atendente humano → handoff
  if (intencao.intencao === "falar_humano") {
    await _dispararHandoff(telefone, sessao, "Cliente pediu atendente humano", textos)
    await enviarMensagem(telefone, mensagens.aguardeAtendente())
    return
  }

  const servicosNaFila = sessao.servicosNaFila ?? []
  if (sessao.aguardandoConfirmacaoServico && servicosNaFila.length > 0) {
    const selecionada = resolverCategoriaPendente(textos, servicosNaFila)
    const confirmou = /^\s*(sim|pode|isso|ok|claro|confirmo|vamos)\b/i.test(textos)
    const recusou = /^\s*(n[aã]o|nao)\b/i.test(textos)

    if (selecionada || confirmou) {
      const servicoAtual = selecionada ?? servicosNaFila[0]
      sessao.servicosNaFila = servicosNaFila.filter(slug => slug !== servicoAtual)
      sessao.servicoAtual = servicoAtual
      sessao.aguardandoConfirmacaoServico = false
      sessao.categoria = servicoAtual
      intencao.categoria = servicoAtual
      intencao.categoriasSolicitadas = []
      intencao.categoriasAlternativas = []
    } else if (recusou) {
      sessao.servicosNaFila = []
      sessao.servicoAtual = null
      sessao.aguardandoConfirmacaoServico = false
      sessao.categoria = null
      await salvarSessao(telefone, sessao)
      await enviarMensagem(telefone, "Tudo bem. Deixei os outros serviços de lado por enquanto.")
      return
    } else if (intencao.categoria && !servicosNaFila.includes(intencao.categoria)) {
      sessao.servicosNaFila = []
      sessao.servicoAtual = null
      sessao.aguardandoConfirmacaoServico = false
    } else {
      const opcoes = servicosNaFila.map(slug =>
        categorias.find(categoria => categoria.slug === slug)?.label ?? slug
      )
      await enviarMensagem(telefone, mensagens.confirmarOrdem(opcoes))
      return
    }
  }

  if (intencao.categoriasSolicitadas.length > 1) {
    sessao.servicosNaFila = intencao.categoriasSolicitadas
    sessao.servicoAtual = null
    sessao.aguardandoConfirmacaoServico = true
    sessao.categoria = null
    sessao.bairro = intencao.bairro ?? sessao.bairro
    sessao.regiao = intencao.regiao ?? sessao.regiao
    await salvarSessao(telefone, sessao)
    const opcoes = sessao.servicosNaFila.map(slug =>
      categorias.find(categoria => categoria.slug === slug)?.label ?? slug
    )
    await enviarMensagem(telefone, mensagens.confirmarOrdem(opcoes))
    return
  }

  if (intencao.intencao === "saudacao" && !intencao.categoria) {
    const respostaHumanizada = intencao.mensagem?.trim() || mensagens.naoEntendeu()
    await enviarMensagem(telefone, respostaHumanizada)
    return
  }

  if (intencao.categoriasAlternativas.length > 1) {
    sessao.categoria = null
    sessao.categoriasPendentes = intencao.categoriasAlternativas
    await salvarSessao(telefone, sessao)
    const opcoes = intencao.categoriasAlternativas.map(slug =>
      categorias.find(categoria => categoria.slug === slug)?.label ?? slug
    )
    await enviarMensagem(telefone, mensagens.categoriaAmbigua(opcoes))
    return
  }

  // ── Busca de profissionais ───────────────────────────────────────────────────

  const categoria = intencao.categoria ?? sessao.categoria
  const bairro = intencao.bairro ?? sessao.bairro
  const regiao = intencao.regiao ?? sessao.regiao

  if (!categoria) {
    sessao.tentativasEsclarecimento++
    if (sessao.tentativasEsclarecimento >= 3) {
      await _dispararHandoff(telefone, sessao, "3 tentativas sem identificar serviço", textos)
    }
    await salvarSessao(telefone, sessao)
    const msgHumanizada = intencao.mensagem?.trim() || mensagens.naoEntendeu()
    await enviarMensagem(telefone, msgHumanizada)
    return
  }

  if (!bairro) {
    sessao.categoria = categoria
    sessao.tentativasEsclarecimento++
    await salvarSessao(telefone, sessao)
    await salvarLead({
      nomeCliente: nome,
      whatsappCliente: telefone,
      categoria,
      bairro: "Não informado",
      profissionalId: null,
      status: "novo",
      mensagemOriginal: textos,
    })
    const msgPedirBairro = intencao.mensagem?.trim() || mensagens.pedirBairro(categoria)
    await enviarMensagem(telefone, msgPedirBairro)
    return
  }

  // Tem categoria + bairro
  sessao.categoria = categoria
  sessao.bairro = bairro
  sessao.regiao = regiao
  sessao.tentativasEsclarecimento = 0

  const ignoreIds = sessao.profissionaisIndicados

  // Prioridade 1 e 2: buscarProfissionais já tenta bairro → região
  const profissionais = await buscarProfissionais(categoria, bairro, ignoreIds, 4)

  if (profissionais.length > 0) {
    for (const prof of profissionais) {
      prof.bairros = await carregarBairrosDoProfissional(prof.id)
      sessao.profissionaisIndicados.push(prof.id)
      const leadId = await salvarLead({
        nomeCliente: nome,
        whatsappCliente: telefone,
        categoria,
        bairro,
        profissionalId: prof.id,
        status: "enviado",
        mensagemOriginal: textos,
        prioridadeMatch: 1,
      })
      if (leadId) {
        prof.leadId = leadId
        prof.linkContato = `${config.publicUrl}/c/${leadId}`
      }
    }

    const proximoServico = prepararProximoServico(sessao)
    const envio = await enviarMensagem(telefone, mensagens.profissionalEncontrado(profissionais, categoria, bairro, proximoServico))

    for (const prof of profissionais) {
      if (prof.leadId && envio.messageId) await atualizarLeadMensagemId(prof.leadId, envio.messageId)
      await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
    }

    await salvarSessao(telefone, sessao)
    await registrarMetricaMensagem({
      contatoHash: hashContato(telefone),
      categoria,
      bairro,
      confianca: intencao.confianca,
      tempoTotalMs: Date.now() - inicio,
      resultado: "match_bairro",
    })
    console.log(`[bot] Leads → ${profissionais.map(p => p.nome).join(", ")}`)
    return
  }

  // Prioridade 3: fallback cidade toda
  const fallbacks = await buscarProfissionaisFallback(categoria, ignoreIds, 4)

  if (fallbacks.length > 0) {
    for (const prof of fallbacks) {
      prof.bairros = await carregarBairrosDoProfissional(prof.id)
      sessao.profissionaisIndicados.push(prof.id)
      const leadId = await salvarLead({
        nomeCliente: nome,
        whatsappCliente: telefone,
        categoria,
        bairro,
        profissionalId: prof.id,
        status: "enviado",
        mensagemOriginal: textos,
        prioridadeMatch: 3,
      })
      if (leadId) {
        prof.leadId = leadId
        prof.linkContato = `${config.publicUrl}/c/${leadId}`
      }
    }

    const proximoServico = prepararProximoServico(sessao)
    const envio = await enviarMensagem(telefone, mensagens.profissionalFallback(fallbacks, categoria, bairro, proximoServico))

    for (const prof of fallbacks) {
      if (prof.leadId && envio.messageId) await atualizarLeadMensagemId(prof.leadId, envio.messageId)
      await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
    }

    await salvarSessao(telefone, sessao)
    await registrarMetricaMensagem({
      contatoHash: hashContato(telefone),
      categoria,
      bairro,
      confianca: intencao.confianca,
      tempoTotalMs: Date.now() - inicio,
      resultado: "fallback_cidade",
    })
    console.log(`[bot] Leads fallback → ${fallbacks.map(f => f.nome).join(", ")}`)
    return
  }

  // Sem match
  const proximoServico = prepararProximoServico(sessao)
  await enviarMensagem(telefone, mensagens.semMatch(categoria, bairro, undefined, proximoServico))
  await salvarLead({
    nomeCliente: nome,
    whatsappCliente: telefone,
    categoria,
    bairro,
    profissionalId: null,
    status: "sem_resposta",
    mensagemOriginal: textos,
  })
  await salvarSessao(telefone, sessao)
  await registrarMetricaMensagem({
    contatoHash: hashContato(telefone),
    categoria,
    bairro,
    confianca: intencao.confianca,
    tempoTotalMs: Date.now() - inicio,
    resultado: "sem_match",
  })
  console.log(`[bot] Sem match para ${categoria} em ${bairro}`)
}

function prepararProximoServico(sessao: Sessao): string | null {
  const proximoSlug = sessao.servicosNaFila?.[0]
  sessao.servicoAtual = null
  sessao.aguardandoConfirmacaoServico = Boolean(proximoSlug)

  if (!proximoSlug) {
    sessao.servicosNaFila = []
    return null
  }

  sessao.categoria = null
  return categorias.find(categoria => categoria.slug === proximoSlug)?.label ?? proximoSlug
}

// ─── Handoff ──────────────────────────────────────────────────────────────────

async function _dispararHandoff(
  telefone: string,
  sessao: Sessao,
  motivo: string,
  ultimasMensagens: string
): Promise<void> {
  await marcarSessaoHumanoAtivo(telefone, true)
  await enviarAlertaHandoff({
    telefone,
    motivo,
    categoria: sessao.categoria,
    bairro: sessao.bairro,
    resumo: `Categoria: ${sessao.categoria ?? "?"}, Bairro: ${sessao.bairro ?? "?"}`,
    ultimasMensagens,
  })
}
