import { config } from "./config"
import { extrairIntencao, resolverUrgenciaLocal } from "./ai"
import { categorias, resolverCategoria, resolverCategoriaPendente } from "./knowledge/categorias"
import { resolverBairro } from "./knowledge/bairros-bauru"
import {
  deveAbrirNovoPedidoSemCategoria,
  deveAtualizarSomenteUrgencia,
  deveEvitarBuscaRepetida,
  deveIniciarNovoPedido,
  deveTratarComoRespostaPendente,
  confirmouBairroSugerido,
  ehFragmentoDePedido,
  refereBairroSugerido,
  recusouBairroSugerido,
} from "./conversation-state"
import { adicionarTurnoConversa, carregarSessao, salvarSessao, type Sessao } from "./session"
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
  buscarBairroNoSupabase,
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
  adicionarTurnoConversa(sessao, "user", textos)

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

  const respondendoEsclarecimento = deveTratarComoRespostaPendente({
    perguntaPendente: sessao.perguntaPendente,
    categoriaMencionada: Boolean(resolverCategoria(textos)),
    bairroMencionado: Boolean(resolverBairro(textos)),
    bairroCandidato: Boolean(intencao.bairroCandidato),
    urgenciaMencionada: resolverUrgenciaLocal(textos),
    confirmouSugestao: confirmouBairroSugerido(textos),
    recusouSugestao: recusouBairroSugerido(textos),
    refereSugestao: Boolean(sessao.bairroSugerido && refereBairroSugerido(textos, sessao.bairroSugerido)),
    fragmentoDePedido: ehFragmentoDePedido(textos),
  })

  if (intencao.intencao === "emergencia") {
    await enviarResposta(telefone, mensagens.emergencia(), sessao)
    return
  }

  if (intencao.intencao === "cadastro_profissional") {
    await enviarResposta(telefone, mensagens.cadastroProfissional(), sessao)
    return
  }

  if (intencao.intencao === "fora_escopo" && !respondendoEsclarecimento) {
    // Verifica se cliente quer ser avisado sobre nova cidade
    const querAviso = /sim|quero|avisa|avise|pode/i.test(textos)
    if (sessao.ultimaIntencao === "fora_bauru" && querAviso) {
      await registrarInteresseCidade(telefone, textos)
      await enviarResposta(telefone, "Anotado! Te avisamos quando chegarmos na sua cidade. 😊", sessao)
      return
    }
    await enviarResposta(telefone, mensagens.foraEscopo(), sessao)
    return
  }

  // Reclamação → handoff
  if (intencao.intencao === "reclamacao") {
    const ocorrenciaId = await registrarOcorrencia(null, null, textos)
    await _dispararHandoff(telefone, sessao, "Reclamação do cliente", textos)
    await enviarResposta(telefone, mensagens.reclamacaoRegistrada(), sessao)
    return
  }

  // Pedido de atendente humano → handoff
  if (intencao.intencao === "falar_humano") {
    await _dispararHandoff(telefone, sessao, "Cliente pediu atendente humano", textos)
    await enviarResposta(telefone, mensagens.aguardeAtendente(), sessao)
    return
  }

  const categoriaMencionada = resolverCategoria(textos)
  let bairroMencionado = resolverBairro(textos)
  const urgenciaMencionada = resolverUrgenciaLocal(textos)

  if (
    !bairroMencionado &&
    sessao.perguntaPendente === "bairro" &&
    sessao.bairroSugerido &&
    refereBairroSugerido(textos, sessao.bairroSugerido) &&
    !recusouBairroSugerido(textos)
  ) {
    bairroMencionado = {
      bairro: sessao.bairroSugerido,
      regiao: sessao.bairroSugeridoRegiao ?? "Outros",
    }
    intencao.bairro = bairroMencionado.bairro
    intencao.regiao = bairroMencionado.regiao
  }

  if (
    sessao.perguntaPendente === "bairro" &&
    sessao.bairroSugerido &&
    confirmouBairroSugerido(textos)
  ) {
    bairroMencionado = {
      bairro: sessao.bairroSugerido,
      regiao: sessao.bairroSugeridoRegiao ?? "Outros",
    }
    intencao.bairro = bairroMencionado.bairro
    intencao.regiao = bairroMencionado.regiao
  } else if (
    sessao.perguntaPendente === "bairro" &&
    sessao.bairroSugerido &&
    recusouBairroSugerido(textos) &&
    !intencao.bairroCandidato &&
    !bairroMencionado
  ) {
    const candidatoAnterior = sessao.bairroCandidato ?? sessao.bairroSugerido
    sessao.bairroSugerido = null
    sessao.bairroSugeridoRegiao = null
    sessao.bairroCandidato = null
    sessao.tentativasLocalizacao = (sessao.tentativasLocalizacao ?? 0) + 1
    if (sessao.tentativasLocalizacao >= 2) {
      await _dispararHandoff(telefone, sessao, "Não foi possível confirmar o bairro", textos)
      await enviarResposta(telefone, mensagens.bairroAindaNaoConfirmado(candidatoAnterior), sessao)
    } else {
      await enviarResposta(telefone, mensagens.bairroNaoEncontrado(candidatoAnterior), sessao)
    }
    return
  } else if (!bairroMencionado && intencao.bairroCandidato) {
    const resolucao = await buscarBairroNoSupabase(intencao.bairroCandidato)
    if (resolucao.status === "indisponivel") {
      await enviarResposta(telefone, mensagens.naoConseguiValidarBairro(), sessao)
      return
    }

    if (resolucao.status === "encontrado") {
      bairroMencionado = { bairro: resolucao.bairro, regiao: resolucao.regiao ?? "Outros" }
      intencao.bairro = bairroMencionado.bairro
      intencao.regiao = bairroMencionado.regiao
      sessao.bairroCandidato = null
      sessao.bairroSugerido = null
      sessao.bairroSugeridoRegiao = null
      sessao.tentativasLocalizacao = 0
    } else if (resolucao.status === "aproximado") {
      const mesmaSugestao = sessao.bairroSugerido === resolucao.bairro
      if (mesmaSugestao) {
        bairroMencionado = { bairro: resolucao.bairro, regiao: resolucao.regiao ?? "Outros" }
        intencao.bairro = bairroMencionado.bairro
        intencao.regiao = bairroMencionado.regiao
        sessao.bairroCandidato = null
        sessao.bairroSugerido = null
        sessao.bairroSugeridoRegiao = null
        sessao.tentativasLocalizacao = 0
      } else {
        sessao.bairroCandidato = intencao.bairroCandidato
        sessao.bairroSugerido = resolucao.bairro
        sessao.bairroSugeridoRegiao = resolucao.regiao
        sessao.perguntaPendente = "bairro"
        await enviarResposta(telefone, mensagens.confirmarBairro(intencao.bairroCandidato, resolucao.bairro), sessao)
        return
      }
    } else {
      sessao.tentativasLocalizacao = (sessao.tentativasLocalizacao ?? 0) + 1
      sessao.bairroCandidato = intencao.bairroCandidato
      sessao.perguntaPendente = "bairro"
      if (sessao.tentativasLocalizacao >= 2) {
        await _dispararHandoff(telefone, sessao, "Não foi possível confirmar o bairro", textos)
        await enviarResposta(telefone, mensagens.bairroAindaNaoConfirmado(intencao.bairroCandidato), sessao)
      } else {
        await enviarResposta(telefone, mensagens.bairroNaoEncontrado(intencao.bairroCandidato), sessao)
      }
      return
    }
  }

  if (bairroMencionado) {
    sessao.bairroCandidato = null
    sessao.bairroSugerido = null
    sessao.bairroSugeridoRegiao = null
    sessao.tentativasLocalizacao = 0
    intencao.bairro = bairroMencionado.bairro
    intencao.regiao = bairroMencionado.regiao
  }

  if (deveAbrirNovoPedidoSemCategoria({
    buscaConcluida: Boolean(sessao.buscaConcluida),
    categoriaMencionada: Boolean(categoriaMencionada),
    intencao: intencao.intencao,
    mensagem: textos,
  })) {
    sessao.categoria = null
    sessao.bairro = null
    sessao.regiao = null
    sessao.urgente = null
    sessao.profissionaisIndicados = []
    sessao.servicosNaFila = []
    sessao.servicoAtual = null
    sessao.aguardandoConfirmacaoServico = false
    sessao.buscaConcluida = false
    sessao.resultadoUltimaBusca = null
    sessao.perguntaPendente = "categoria"
    sessao.bairroCandidato = null
    sessao.bairroSugerido = null
    sessao.bairroSugeridoRegiao = null
    sessao.tentativasLocalizacao = 0
    sessao.leadSemBairroRegistrado = false
    if (ehFragmentoDePedido(textos)) {
      await salvarSessao(telefone, sessao)
      return
    }
    await enviarResposta(telefone, mensagens.pedirServico(), sessao)
    return
  }

  if (sessao.perguntaPendente === "categoria" && ehFragmentoDePedido(textos)) {
    await salvarSessao(telefone, sessao)
    return
  }

  if (urgenciaMencionada !== null && deveAtualizarSomenteUrgencia({
    buscaConcluida: Boolean(sessao.buscaConcluida),
    urgenciaMencionada,
    categoriaMencionada: Boolean(categoriaMencionada),
    bairroMencionado: Boolean(bairroMencionado),
    intencao: intencao.intencao,
  })) {
    sessao.urgente = urgenciaMencionada
    const resposta = sessao.resultadoUltimaBusca === "sem_match"
      ? mensagens.atualizarUrgenciaSemMatch(sessao.categoria ?? "serviço", sessao.bairro ?? "sua região", urgenciaMencionada)
      : mensagens.atualizarUrgenciaComMatch(urgenciaMencionada)
    await enviarResposta(telefone, resposta, sessao)
    return
  }

  if (categoriaMencionada && deveIniciarNovoPedido({
    buscaConcluida: Boolean(sessao.buscaConcluida),
    aguardandoConfirmacaoServico: Boolean(sessao.aguardandoConfirmacaoServico),
    categoriaMencionada: Boolean(categoriaMencionada),
    intencao: intencao.intencao,
  })) {
    const manterMesmoLocal = /\b(mesmo bairro|mesmo local|mesmo endereco|mesma casa|mesmo lugar)\b/i.test(textos)
    sessao.categoria = categoriaMencionada.slug
    sessao.urgente = urgenciaMencionada
    sessao.profissionaisIndicados = []
    sessao.buscaConcluida = false
    sessao.resultadoUltimaBusca = null
    sessao.perguntaPendente = null
    sessao.bairroCandidato = null
    sessao.bairroSugerido = null
    sessao.bairroSugeridoRegiao = null
    sessao.tentativasLocalizacao = 0
    sessao.leadSemBairroRegistrado = false
    intencao.categoria = categoriaMencionada.slug
    intencao.urgente = urgenciaMencionada
    intencao.bairro = bairroMencionado?.bairro ?? (manterMesmoLocal ? sessao.bairro : null)
    intencao.regiao = bairroMencionado?.regiao ?? (manterMesmoLocal ? sessao.regiao : null)
    if (!intencao.bairro) {
      sessao.bairro = null
      sessao.regiao = null
    }
  } else if (intencao.categoria && intencao.categoria !== sessao.categoria) {
    sessao.urgente = urgenciaMencionada
    sessao.profissionaisIndicados = []
  }

  if (intencao.urgente !== null) sessao.urgente = intencao.urgente

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
      await enviarResposta(telefone, "Tudo bem. Deixei os outros serviços de lado por enquanto.", sessao)
      return
    } else if (intencao.categoria && !servicosNaFila.includes(intencao.categoria)) {
      sessao.servicosNaFila = []
      sessao.servicoAtual = null
      sessao.aguardandoConfirmacaoServico = false
    } else {
      const opcoes = servicosNaFila.map(slug =>
        categorias.find(categoria => categoria.slug === slug)?.label ?? slug
      )
      await enviarResposta(telefone, mensagens.confirmarOrdem(opcoes), sessao)
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
    await enviarResposta(telefone, mensagens.confirmarOrdem(opcoes), sessao)
    return
  }

  if (intencao.intencao === "saudacao" && !intencao.categoria) {
    const respostaHumanizada = intencao.mensagem?.trim() || mensagens.naoEntendeu()
    await enviarResposta(telefone, respostaHumanizada, sessao)
    return
  }

  if (intencao.categoriasAlternativas.length > 1) {
    sessao.categoria = null
    sessao.categoriasPendentes = intencao.categoriasAlternativas
    sessao.perguntaPendente = "categoria"
    await salvarSessao(telefone, sessao)
    const opcoes = intencao.categoriasAlternativas.map(slug =>
      categorias.find(categoria => categoria.slug === slug)?.label ?? slug
    )
    await enviarResposta(telefone, mensagens.categoriaAmbigua(opcoes), sessao)
    return
  }

  // ── Busca de profissionais ───────────────────────────────────────────────────

  const categoria = intencao.categoria ?? sessao.categoria
  const bairro = intencao.bairro ?? sessao.bairro
  const regiao = intencao.regiao ?? sessao.regiao

  if (!categoria) {
    sessao.perguntaPendente = "categoria"
    sessao.tentativasEsclarecimento++
    if (sessao.tentativasEsclarecimento >= 3) {
      await _dispararHandoff(telefone, sessao, "3 tentativas sem identificar serviço", textos)
    }
    await salvarSessao(telefone, sessao)
    const msgHumanizada = intencao.mensagem?.trim() || mensagens.naoEntendeu()
    await enviarResposta(telefone, msgHumanizada, sessao)
    return
  }

  if (!bairro) {
    sessao.categoria = categoria
    sessao.perguntaPendente = "bairro"
    sessao.tentativasEsclarecimento++
    await salvarSessao(telefone, sessao)
    if (!sessao.leadSemBairroRegistrado) {
      await salvarLead({
        nomeCliente: nome,
        whatsappCliente: telefone,
        categoria,
        bairro: "Não informado",
        profissionalId: null,
        status: "novo",
        mensagemOriginal: textos,
      })
      sessao.leadSemBairroRegistrado = true
    }
    const respostaModelo = intencao.mensagem?.trim() ?? ""
    const msgPedirBairro = /\b(bairro|regi[aã]o)\b/i.test(respostaModelo)
      ? respostaModelo
      : mensagens.pedirBairro(categorias.find(item => item.slug === categoria)?.label ?? categoria)
    await enviarResposta(telefone, msgPedirBairro, sessao)
    return
  }

  if (deveEvitarBuscaRepetida({
    buscaConcluida: Boolean(sessao.buscaConcluida),
    aguardandoConfirmacaoServico: Boolean(sessao.aguardandoConfirmacaoServico),
    categoriaMencionada: Boolean(categoriaMencionada),
    bairroMencionado: Boolean(bairroMencionado),
    urgenciaMencionada,
    intencao: intencao.intencao,
  })) {
    await enviarResposta(
      telefone,
      mensagens.continuarPedido(categoria, bairro),
      sessao
    )
    return
  }

  // Tem categoria + bairro
  sessao.categoria = categoria
  sessao.bairro = bairro
  sessao.regiao = regiao
  sessao.perguntaPendente = null
  sessao.buscaConcluida = false
  sessao.resultadoUltimaBusca = null
  sessao.tentativasEsclarecimento = 0

  const ignoreIds = sessao.profissionaisIndicados

  // Prioridade 1 e 2: buscarProfissionais já tenta bairro → região
  const resultadoProfissionais = await buscarProfissionais(categoria, bairro, ignoreIds, 4)
  if (resultadoProfissionais.status === "indisponivel") {
    sessao.resultadoUltimaBusca = "indisponivel"
    await enviarResposta(telefone, mensagens.buscaIndisponivel(), sessao)
    await registrarMetricaMensagem({
      contatoHash: hashContato(telefone),
      categoria,
      bairro,
      confianca: intencao.confianca,
      tempoTotalMs: Date.now() - inicio,
      resultado: "erro",
    })
    return
  }
  const profissionais = resultadoProfissionais.profissionais

  if (profissionais.length > 0) {
    for (const prof of profissionais) {
      const bairrosAtendidos = await carregarBairrosDoProfissional(prof.id)
      if (bairrosAtendidos.length > 0) prof.bairros = bairrosAtendidos
      sessao.profissionaisIndicados.push(prof.id)
      const leadId = await salvarLead({
        nomeCliente: nome,
        whatsappCliente: telefone,
        categoria,
        bairro,
        profissionalId: prof.id,
        status: "enviado",
        mensagemOriginal: textos,
        prioridadeMatch: resultadoProfissionais.prioridadeMatch ?? 1,
      })
      if (leadId) {
        prof.leadId = leadId
        prof.linkContato = `${config.publicUrl}/c/${leadId}`
      }
    }

    const proximoServico = prepararProximoServico(sessao)
    sessao.resultadoUltimaBusca = "match"
    sessao.buscaConcluida = !sessao.aguardandoConfirmacaoServico
    const envio = await enviarResposta(
      telefone,
      mensagens.profissionalEncontrado(
        profissionais,
        categoria,
        bairro,
        proximoServico,
        sessao.urgente,
        resultadoProfissionais.prioridadeMatch === 2 ? 2 : 1
      ),
      sessao
    )

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
      resultado: resultadoProfissionais.prioridadeMatch === 2 ? "match_regiao" : "match_bairro",
    })
    console.log(`[bot] Leads → ${profissionais.map(p => p.nome).join(", ")}`)
    return
  }

  // Prioridade 3: fallback cidade toda
  const resultadoFallback = await buscarProfissionaisFallback(categoria, ignoreIds, 4)
  if (resultadoFallback.status === "indisponivel") {
    sessao.resultadoUltimaBusca = "indisponivel"
    await enviarResposta(telefone, mensagens.buscaIndisponivel(), sessao)
    await registrarMetricaMensagem({
      contatoHash: hashContato(telefone),
      categoria,
      bairro,
      confianca: intencao.confianca,
      tempoTotalMs: Date.now() - inicio,
      resultado: "erro",
    })
    return
  }
  const fallbacks = resultadoFallback.profissionais

  if (fallbacks.length > 0) {
    for (const prof of fallbacks) {
      const bairrosAtendidos = await carregarBairrosDoProfissional(prof.id)
      if (bairrosAtendidos.length > 0) prof.bairros = bairrosAtendidos
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
    sessao.resultadoUltimaBusca = "fallback"
    sessao.buscaConcluida = !sessao.aguardandoConfirmacaoServico
    const envio = await enviarResposta(telefone, mensagens.profissionalFallback(fallbacks, categoria, bairro, proximoServico, sessao.urgente), sessao)

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
  sessao.resultadoUltimaBusca = "sem_match"
  sessao.buscaConcluida = !sessao.aguardandoConfirmacaoServico
  await enviarResposta(telefone, mensagens.semMatch(categoria, bairro, undefined, proximoServico), sessao)
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

async function enviarResposta(
  telefone: string,
  texto: string,
  sessao: Sessao
) {
  const envio = await enviarMensagem(telefone, texto)
  adicionarTurnoConversa(sessao, "assistant", texto)
  await salvarSessao(telefone, sessao)
  return envio
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
