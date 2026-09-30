import { extrairIntencao } from "./ai"
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
} from "./supabase"
import { enviarMensagem, enviarPresenca } from "./evolution"
import { mensagens } from "./messages"
import { enviarAlertaHandoff, isBotPausado } from "./telegram"
import { extrairCoordenadas, coordenadasParaBairro } from "./geo"
import type { ItemBuffer } from "./buffer"

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

  console.log(`[bot] Lote de ${telefone}: "${textos}"`)

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

  // Carrega sessão persistida
  const sessao = await carregarSessao(telefone)
  if (nome && !sessao.nome) sessao.nome = nome

  // Extrai intenção via IA com RAG
  const intencao = await extrairIntencao(textos, sessao)
  console.log(`[bot] Intenção:`, intencao)

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

  if (intencao.intencao === "saudacao" && !intencao.categoria) {
    await enviarMensagem(telefone, mensagens.naoEntendeu())
    return
  }

  // ── Busca de profissionais ───────────────────────────────────────────────────

  const categoria = intencao.categoria ?? sessao.categoria
  const bairro = intencao.bairro ?? sessao.bairro
  const regiao = intencao.regiao ?? sessao.regiao

  if (!categoria) {
    sessao.tentativasEsclarecimento++
    // 2 tentativas sem sucesso → handoff
    if (sessao.tentativasEsclarecimento >= 2) {
      await _dispararHandoff(telefone, sessao, "2 tentativas sem identificar serviço", textos)
    }
    await salvarSessao(telefone, sessao)
    await enviarMensagem(telefone, mensagens.naoEntendeu())
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
    await enviarMensagem(telefone, mensagens.pedirBairro(categoria))
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
    // Carrega bairros de cada profissional para exibição
    for (const prof of profissionais) {
      prof.bairros = await carregarBairrosDoProfissional(prof.id)
    }

    const envio = await enviarMensagem(telefone, mensagens.profissionalEncontrado(profissionais, categoria, bairro))
    for (const prof of profissionais) {
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
      if (leadId && envio.messageId) await atualizarLeadMensagemId(leadId, envio.messageId)
      await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
    }
    await salvarSessao(telefone, sessao)
    await registrarMetricaMensagem({
      contatoHash: Buffer.from(telefone).toString("base64"),
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
    }

    const envio = await enviarMensagem(telefone, mensagens.profissionalFallback(fallbacks, categoria, bairro))
    for (const prof of fallbacks) {
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
      if (leadId && envio.messageId) await atualizarLeadMensagemId(leadId, envio.messageId)
      await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
    }
    await salvarSessao(telefone, sessao)
    await registrarMetricaMensagem({
      contatoHash: Buffer.from(telefone).toString("base64"),
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
  await enviarMensagem(telefone, mensagens.semMatch(categoria, bairro))
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
    contatoHash: Buffer.from(telefone).toString("base64"),
    categoria,
    bairro,
    confianca: intencao.confianca,
    tempoTotalMs: Date.now() - inicio,
    resultado: "sem_match",
  })
  console.log(`[bot] Sem match para ${categoria} em ${bairro}`)
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
