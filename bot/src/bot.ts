import { config } from "./config"
import { extrairIntencao, resolverUrgenciaLocal, VERSOES_SISTEMA } from "./ai"
import { categorias, resolverCategoria, resolverCategoriaPendente } from "./knowledge/categorias"
import { resolverBairro } from "./knowledge/bairros-bauru"
import { resolverLocalizacaoAvancada } from "./location-resolver"
import { avaliarPoliticaDialogo, detectarFrustracao } from "./dialog-policy"
import { validarSaida } from "./output-validator"
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
import {
  adicionarTurnoConversa,
  carregarSessao,
  salvarSessao,
  criarNovoPedido,
  fecharPedidoAtivoEArquivar,
  type Sessao,
  type TurnoConversa,
} from "./session"
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
  type Profissional,
} from "./supabase"
import { enviarMensagem, enviarPresenca } from "./evolution"
import { mensagens } from "./messages"
import { enviarAlertaHandoff, isBotPausado } from "./telegram"
import { extrairCoordenadas, coordenadasParaBairro } from "./geo"
import type { LoteProcessamento } from "./buffer"
import { validarEpochTurno } from "./buffer"
import { hashContato, solicitouExclusaoDados } from "./privacidade"

export async function processarLote(lote: LoteProcessamento): Promise<void> {
  const { turn_id, batch_epoch, telefone, nome, itens } = lote
  const inicioTurno = Date.now()

  // [1] Validação de pausa e sessão com humano ativo
  if (isBotPausado()) return
  if (await sessaoHumanoAtivo(telefone)) return

  // [2] Pré-processamento: geolocalização e áudio
  const itensResolvidos = itens.map(item => {
    if (item.tipo !== "texto") return item
    const coords = extrairCoordenadas(item.conteudo)
    if (!coords) return item
    const bairroGeo = coordenadasParaBairro(coords.lat, coords.lng)
    if (!bairroGeo) return { ...item, conteudo: "__fora_de_bauru__" }
    return { ...item, conteudo: `meu bairro é ${bairroGeo.bairro}` }
  })

  if (itensResolvidos.some(i => i.conteudo === "__fora_de_bauru__")) {
    const sessao = await carregarSessao(telefone)
    sessao.ultimaIntencao = "fora_bauru"
    await salvarSessao(telefone, sessao)
    await enviarPresenca(telefone, "paused")
    await enviarRespostaSegura(telefone, mensagens.foraDeBauru(), sessao, [], batch_epoch)
    return
  }

  const textos = itensResolvidos
    .filter(i => i.tipo === "texto")
    .map(i => i.conteudo)
    .join("\n")

  if (!textos.trim()) return

  // [3] Direito do Titular / LGPD
  if (solicitouExclusaoDados(textos)) {
    try {
      await apagarDadosContato(telefone)
      await enviarMensagem(telefone, "Pronto. Apaguei sua sessão e removi seus dados pessoais dos registros de leads conforme a LGPD.")
    } catch (err) {
      console.error("[bot] Falha ao apagar dados do contato:", err)
      await enviarMensagem(telefone, "Não consegui concluir a exclusão agora. Nossa equipe vai verificar o pedido.")
    }
    return
  }

  console.log(`[bot] Processando turno ${turn_id} (epoch ${batch_epoch}) para contato ${hashContato(telefone).slice(0, 12)}`)
  await enviarPresenca(telefone, "composing")

  // [4] Verificações de Feedback (Profissional e Cliente)
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

  // [5] Montagem de Contexto e Carregamento de Sessão
  const sessao = await carregarSessao(telefone)
  if (nome && !sessao.nome) sessao.nome = nome
  sessao.batch_epoch = batch_epoch

  if (!sessao.pedido_ativo) {
    sessao.pedido_ativo = criarNovoPedido()
  }
  const pedido = sessao.pedido_ativo

  // Detecção de Frustração e Reparo
  if (detectarFrustracao(textos)) {
    pedido.frustrations_count = (pedido.frustrations_count || 0) + 1
    pedido.repair_mode = true
    if (pedido.frustrations_count >= 2) {
      await _dispararHandoff(telefone, sessao, "Cliente expressou frustração repetida", textos)
    }
  }

  // [6] Interpretação (LLM com Saída Estruturada + Fallback)
  const inicioLLM = Date.now()
  const intencao = await extrairIntencao(textos, sessao)
  const duracaoLLM = Date.now() - inicioLLM
  adicionarTurnoConversa(sessao, "user", textos)

  // Resolução de Múltiplos Serviços / Fila
  if (pedido.pending_question?.field === "service" && sessao.pedido_ativo?.service.candidates.length) {
    const selecionada = resolverCategoriaPendente(textos, sessao.pedido_ativo.service.candidates)
      ?? (intencao.service && sessao.pedido_ativo.service.candidates.includes(intencao.service)
        ? intencao.service
        : null)
    if (selecionada) {
      intencao.service = selecionada
      intencao.service_candidates = []
    }
  }

  await enviarPresenca(telefone, "paused")

  // [7] Resolução de Entidades (Localização Tolerante + Serviços)
  const categoriaMencionada = resolverCategoria(textos)
  const urgenciaMencionada = resolverUrgenciaLocal(textos)
  let bairroMencionado = resolverBairro(textos)

  const confirmouSugestao = confirmouBairroSugerido(textos)
  const recusouSugestao = recusouBairroSugerido(textos)
  const refereSugestao = Boolean(pedido.location.candidate && refereBairroSugerido(textos, pedido.location.candidate))

  const respondendoEsclarecimento = deveTratarComoRespostaPendente({
    perguntaPendente: pedido.pending_question?.field === "service" ? "categoria" : pedido.pending_question?.field ?? null,
    categoriaMencionada: Boolean(categoriaMencionada),
    bairroMencionado: Boolean(bairroMencionado),
    bairroCandidato: Boolean(intencao.neighborhood_candidate),
    urgenciaMencionada: urgenciaMencionada === "urgent" ? true : urgenciaMencionada === "flexible" ? false : null,
    confirmouSugestao,
    recusouSugestao,
    refereSugestao,
    fragmentoDePedido: ehFragmentoDePedido(textos),
  })

  // Se o cliente confirmou ou se referiu à sugestão pendente
  if (pedido.pending_question?.field === "neighborhood" && pedido.location.candidate && (confirmouSugestao || refereSugestao) && !recusouSugestao) {
    bairroMencionado = {
      bairro: pedido.location.candidate,
      regiao: pedido.location.region ?? "Outros",
    }
    intencao.neighborhood = bairroMencionado.bairro
    intencao.region = bairroMencionado.regiao
  } else if (pedido.pending_question?.field === "neighborhood" && pedido.location.candidate && recusouSugestao) {
    const candidatoAnterior = pedido.location.candidate
    pedido.location.candidate = null
    pedido.location.neighborhood_name = null
    const tentativas = (pedido.pending_question?.attempts ?? 0) + 1
    pedido.pending_question = { field: "neighborhood", attempts: tentativas, state: "asking" }

    if (tentativas >= 2) {
      await _dispararHandoff(telefone, sessao, "Não foi possível confirmar o bairro após recusa", textos)
      await enviarRespostaSegura(telefone, mensagens.bairroAindaNaoConfirmado(candidatoAnterior), sessao, [], batch_epoch)
    } else {
      await enviarRespostaSegura(telefone, mensagens.bairroNaoEncontrado(candidatoAnterior), sessao, [], batch_epoch)
    }
    return
  } else if (!bairroMencionado && intencao.neighborhood_candidate) {
    // Validação tolerante com banco Supabase
    const resolucao = await buscarBairroNoSupabase(intencao.neighborhood_candidate)
    if (resolucao.status === "indisponivel") {
      await enviarRespostaSegura(telefone, mensagens.naoConseguiValidarBairro(), sessao, [], batch_epoch)
      return
    }

    if (resolucao.status === "encontrado") {
      bairroMencionado = { bairro: resolucao.bairro, regiao: resolucao.regiao ?? "Outros" }
      intencao.neighborhood = bairroMencionado.bairro
      intencao.region = bairroMencionado.regiao
      pedido.location.neighborhood_name = resolucao.bairro
      pedido.location.region = resolucao.regiao
      pedido.location.candidate = null
    } else if (resolucao.status === "aproximado") {
      const resAvancada = resolverLocalizacaoAvancada(intencao.neighborhood_candidate, undefined, true)

      if (resAvancada.status === "single_suggestion_confirm" && resAvancada.bairroOficial) {
        pedido.location.candidate = resAvancada.bairroOficial
        pedido.location.region = resAvancada.regiao
        pedido.pending_question = { field: "neighborhood", state: "suggesting", attempts: (pedido.pending_question?.attempts ?? 0) + 1 }
        await enviarRespostaSegura(
          telefone,
          mensagens.confirmarBairro(intencao.neighborhood_candidate, resAvancada.bairroOficial),
          sessao,
          [],
          batch_epoch
        )
        return
      } else if (resAvancada.status === "multiple_options_disambiguate" && resAvancada.opcoes.length > 1) {
        pedido.pending_question = { field: "neighborhood", state: "clarifying", attempts: (pedido.pending_question?.attempts ?? 0) + 1 }
        await enviarRespostaSegura(
          telefone,
          mensagens.desambiguarBairros(resAvancada.opcoes),
          sessao,
          [],
          batch_epoch
        )
        return
      } else {
        const tentativas = (pedido.pending_question?.attempts ?? 0) + 1
        pedido.pending_question = { field: "neighborhood", state: "asking", attempts: tentativas }
        if (tentativas >= 2) {
          await _dispararHandoff(telefone, sessao, "Não foi possível confirmar o bairro", textos)
          await enviarRespostaSegura(telefone, mensagens.bairroAindaNaoConfirmado(intencao.neighborhood_candidate), sessao, [], batch_epoch)
        } else {
          await enviarRespostaSegura(telefone, mensagens.bairroNaoEncontrado(intencao.neighborhood_candidate), sessao, [], batch_epoch)
        }
        return
      }
    }
  }

  if (bairroMencionado) {
    pedido.location.neighborhood_name = bairroMencionado.bairro
    pedido.location.region = bairroMencionado.regiao
    pedido.location.candidate = null
    intencao.neighborhood = bairroMencionado.bairro
    intencao.region = bairroMencionado.regiao
  }

  // Fragmentos de novo pedido
  if (deveAbrirNovoPedidoSemCategoria({
    buscaConcluida: pedido.status === "searched",
    categoriaMencionada: Boolean(categoriaMencionada),
    intencao: intencao.intent === "search_professional" ? "busca_profissional" : intencao.intent,
    mensagem: textos,
  })) {
    fecharPedidoAtivoEArquivar(sessao)
    sessao.pedido_ativo = criarNovoPedido()
    sessao.pedido_ativo.pending_question = { field: "service", state: "asking", attempts: 1 }

    if (ehFragmentoDePedido(textos)) {
      await salvarSessao(telefone, sessao)
      return
    }
    await enviarRespostaSegura(telefone, mensagens.pedirServico(), sessao, [], batch_epoch)
    return
  }

  if (pedido.pending_question?.field === "service" && ehFragmentoDePedido(textos)) {
    await salvarSessao(telefone, sessao)
    return
  }

  // Atualização apenas de urgência pós-busca
  if (urgenciaMencionada && deveAtualizarSomenteUrgencia({
    buscaConcluida: pedido.status === "searched",
    urgenciaMencionada: urgenciaMencionada === "urgent" ? true : urgenciaMencionada === "flexible" ? false : null,
    categoriaMencionada: Boolean(categoriaMencionada),
    bairroMencionado: Boolean(bairroMencionado),
    intencao: intencao.intent === "search_professional" ? "busca_profissional" : intencao.intent,
  })) {
    pedido.urgency = urgenciaMencionada
    const resposta = pedido.search.last_state === "no_match"
      ? mensagens.atualizarUrgenciaSemMatch(pedido.service.slug ?? "serviço", pedido.location.neighborhood_name ?? "sua região", urgenciaMencionada === "urgent")
      : mensagens.atualizarUrgenciaComMatch(urgenciaMencionada === "urgent")
    await enviarRespostaSegura(telefone, resposta, sessao, [], batch_epoch)
    return
  }

  // Novo pedido com serviço identificado
  if (categoriaMencionada && deveIniciarNovoPedido({
    buscaConcluida: pedido.status === "searched",
    aguardandoConfirmacaoServico: false,
    categoriaMencionada: Boolean(categoriaMencionada),
    intencao: intencao.intent === "search_professional" ? "busca_profissional" : intencao.intent,
  })) {
    const manterMesmoLocal = /\b(mesmo bairro|mesmo local|mesmo endereco|mesma casa|mesmo lugar)\b/i.test(textos)
    fecharPedidoAtivoEArquivar(sessao)
    sessao.pedido_ativo = criarNovoPedido({
      serviceSlug: categoriaMencionada.slug,
      neighborhoodName: bairroMencionado?.bairro ?? (manterMesmoLocal ? pedido.location.neighborhood_name : null),
      region: bairroMencionado?.regiao ?? (manterMesmoLocal ? pedido.location.region : null),
      urgency: urgenciaMencionada ?? "unknown",
    })
  }

  // [8] Avaliação da Política de Diálogo Determinística
  const decisao = avaliarPoliticaDialogo({
    pedido: sessao.pedido_ativo,
    extracao: intencao,
    mensagemBruta: textos,
    confirmouSugestaoLocal: confirmouSugestao,
    recusouSugestaoLocal: recusouSugestao,
    refereSugestaoLocal: refereSugestao,
    respondendoEsclarecimento,
  })

  console.log(`[bot] Ação da política: ${decisao.acao} (Regra #${decisao.regraId}: ${decisao.motivo})`)

  switch (decisao.acao) {
    case "EMERGENCY_PROTOCOL": {
      await enviarRespostaSegura(telefone, mensagens.emergencia(), sessao, [], batch_epoch)
      return
    }

    case "HANDOFF_HUMAN": {
      if (intencao.intent === "complaint") {
        await registrarOcorrencia(null, null, textos)
        await _dispararHandoff(telefone, sessao, "Reclamação do cliente", textos)
        await enviarRespostaSegura(telefone, mensagens.reclamacaoRegistrada(), sessao, [], batch_epoch)
      } else {
        await _dispararHandoff(telefone, sessao, "Cliente pediu atendente humano", textos)
        await enviarRespostaSegura(telefone, mensagens.aguardeAtendente(), sessao, [], batch_epoch)
      }
      return
    }

    case "INSTITUTIONAL_REPLY": {
      const tipo = decisao.dados?.tipo
      let resposta = mensagens.comoFunciona()
      if (tipo === "ask_price") resposta = mensagens.perguntaPreco()
      else if (tipo === "ask_best") resposta = mensagens.qualOMelhor()
      else if (tipo === "professional_signup") resposta = mensagens.cadastroProfissional()
      await enviarRespostaSegura(telefone, resposta, sessao, [], batch_epoch)
      return
    }

    case "OUT_OF_SCOPE": {
      await enviarRespostaSegura(telefone, mensagens.foraEscopo(), sessao, [], batch_epoch)
      return
    }

    case "GREETING": {
      const resposta = intencao.reply?.trim() || mensagens.naoEntendeu()
      await enviarRespostaSegura(telefone, resposta, sessao, [], batch_epoch)
      return
    }

    case "DISAMBIGUATE_SERVICE": {
      const candidatos = decisao.dados?.candidatos ?? []
      sessao.pedido_ativo!.service.candidates = candidatos
      sessao.pedido_ativo!.pending_question = { field: "service", state: "clarifying", attempts: 1 }
      const labels = candidatos.map((slug: string) => categorias.find(c => c.slug === slug)?.label ?? slug)
      await enviarRespostaSegura(telefone, mensagens.categoriaAmbigua(labels), sessao, [], batch_epoch)
      return
    }

    case "ASK_NEIGHBORHOOD": {
      const slug = decisao.dados?.servico
      sessao.pedido_ativo!.service.slug = slug
      sessao.pedido_ativo!.pending_question = { field: "neighborhood", state: "asking", attempts: 1 }
      const label = categorias.find(c => c.slug === slug)?.label ?? slug
      const msgPedirBairro = mensagens.pedirBairro(label)
      await enviarRespostaSegura(telefone, msgPedirBairro, sessao, [], batch_epoch)
      return
    }

    case "ASK_SERVICE":
    case "ASK_SERVICE_DESCRIPTION": {
      sessao.pedido_ativo!.pending_question = { field: "service", state: "asking", attempts: 1 }
      const msg = intencao.reply?.trim() || mensagens.pedirServico()
      await enviarRespostaSegura(telefone, msg, sessao, [], batch_epoch)
      return
    }

    case "OFFER_ALTERNATIVES_OR_HANDOFF": {
      await _dispararHandoff(telefone, sessao, "Limite de tentativas de esclarecimento atingido", textos)
      await enviarRespostaSegura(telefone, mensagens.aguardeAtendente(), sessao, [], batch_epoch)
      return
    }
  }

  // [9] Execução de Ferramentas: Busca de Profissionais
  const categoria = intencao.service ?? sessao.pedido_ativo?.service.slug
  const bairro = intencao.neighborhood ?? sessao.pedido_ativo?.location.neighborhood_name

  if (!categoria || !bairro) {
    const msg = mensagens.naoEntendeu()
    await enviarRespostaSegura(telefone, msg, sessao, [], batch_epoch)
    return
  }

  sessao.pedido_ativo!.service.slug = categoria
  sessao.pedido_ativo!.location.neighborhood_name = bairro
  sessao.pedido_ativo!.pending_question = null
  sessao.pedido_ativo!.status = "ready_to_search"

  const ignoreIds = sessao.pedido_ativo!.presented_professional_ids
  const inicioBusca = Date.now()
  const resultadoProfissionais = await buscarProfissionais(categoria, bairro, ignoreIds, 4)
  const duracaoBusca = Date.now() - inicioBusca

  if (resultadoProfissionais.status === "indisponivel") {
    sessao.pedido_ativo!.search.last_state = "unavailable"
    await enviarRespostaSegura(telefone, mensagens.buscaIndisponivel(), sessao, [], batch_epoch)
    await registrarMetricasTurno(telefone, categoria, bairro, intencao.confidence.intent, inicioTurno, "erro", duracaoLLM, duracaoBusca)
    return
  }

  const profissionais = resultadoProfissionais.profissionais
  const incluirNotaInstitucional = !sessao.notaInstitucionalExibida

  if (profissionais.length > 0) {
    for (const prof of profissionais) {
      const bairrosAtendidos = await carregarBairrosDoProfissional(prof.id)
      if (bairrosAtendidos.length > 0) prof.bairros = bairrosAtendidos
      sessao.pedido_ativo!.presented_professional_ids.push(prof.id)

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

    sessao.pedido_ativo!.search.last_state = "matched"
    sessao.pedido_ativo!.status = "searched"
    sessao.pedido_ativo!.search.prioridade_match = resultadoProfissionais.prioridadeMatch

    const textoResposta = mensagens.profissionalEncontrado(
      profissionais,
      categoria,
      bairro,
      null,
      sessao.pedido_ativo!.urgency === "urgent" ? true : sessao.pedido_ativo!.urgency === "flexible" ? false : null,
      resultadoProfissionais.prioridadeMatch === 2 ? 2 : 1,
      incluirNotaInstitucional
    )

    const envio = await enviarRespostaSegura(telefone, textoResposta, sessao, profissionais, batch_epoch)
    if (envio) {
      sessao.notaInstitucionalExibida = true
      for (const prof of profissionais) {
        if (prof.leadId && envio.messageId) await atualizarLeadMensagemId(prof.leadId, envio.messageId)
        await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
      }
    }

    await registrarMetricasTurno(
      telefone,
      categoria,
      bairro,
      intencao.confidence.intent,
      inicioTurno,
      resultadoProfissionais.prioridadeMatch === 2 ? "match_regiao" : "match_bairro",
      duracaoLLM,
      duracaoBusca
    )
    return
  }

  // Fallback cidade toda
  const resultadoFallback = await buscarProfissionaisFallback(categoria, ignoreIds, 4)
  if (resultadoFallback.status === "indisponivel") {
    sessao.pedido_ativo!.search.last_state = "unavailable"
    await enviarRespostaSegura(telefone, mensagens.buscaIndisponivel(), sessao, [], batch_epoch)
    await registrarMetricasTurno(telefone, categoria, bairro, intencao.confidence.intent, inicioTurno, "erro", duracaoLLM, duracaoBusca)
    return
  }

  const fallbacks = resultadoFallback.profissionais
  if (fallbacks.length > 0) {
    for (const prof of fallbacks) {
      const bairrosAtendidos = await carregarBairrosDoProfissional(prof.id)
      if (bairrosAtendidos.length > 0) prof.bairros = bairrosAtendidos
      sessao.pedido_ativo!.presented_professional_ids.push(prof.id)

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

    sessao.pedido_ativo!.search.last_state = "fallback"
    sessao.pedido_ativo!.status = "searched"
    sessao.pedido_ativo!.search.prioridade_match = 3

    const textoFallback = mensagens.profissionalFallback(
      fallbacks,
      categoria,
      bairro,
      null,
      sessao.pedido_ativo!.urgency === "urgent" ? true : sessao.pedido_ativo!.urgency === "flexible" ? false : null,
      incluirNotaInstitucional
    )

    const envio = await enviarRespostaSegura(telefone, textoFallback, sessao, fallbacks, batch_epoch)
    if (envio) {
      sessao.notaInstitucionalExibida = true
      for (const prof of fallbacks) {
        if (prof.leadId && envio.messageId) await atualizarLeadMensagemId(prof.leadId, envio.messageId)
        await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
      }
    }

    await registrarMetricasTurno(telefone, categoria, bairro, intencao.confidence.intent, inicioTurno, "fallback_cidade", duracaoLLM, duracaoBusca)
    return
  }

  // Sem match
  sessao.pedido_ativo!.search.last_state = "no_match"
  sessao.pedido_ativo!.status = "searched"
  const textoSemMatch = mensagens.semMatch(categoria, bairro)
  await enviarRespostaSegura(telefone, textoSemMatch, sessao, [], batch_epoch)

  await salvarLead({
    nomeCliente: nome,
    whatsappCliente: telefone,
    categoria,
    bairro,
    profissionalId: null,
    status: "sem_resposta",
    mensagemOriginal: textos,
  })

  await registrarMetricasTurno(telefone, categoria, bairro, intencao.confidence.intent, inicioTurno, "sem_match", duracaoLLM, duracaoBusca)
}

// [10] Envio com Validação de Saída (Guardrails) e Supersessão (Compare-and-Send)
async function enviarRespostaSegura(
  telefone: string,
  texto: string,
  sessao: Sessao,
  profissionaisRetornados: Profissional[],
  epochTurno: number
) {
  // Supersessão (RF-13, Invariante I-03): descarta se nova mensagem chegou durante processamento
  if (!validarEpochTurno(telefone, epochTurno)) {
    console.warn(`[bot] Supersessão ativada: turno com epoch ${epochTurno} superado por mensagem mais recente. Descartando resposta obsoleta.`)
    return null
  }

  const ultimoTextoEnviado = sessao.turnosRecentes.filter((t: TurnoConversa) => t.role === "assistant").slice(-1)[0]?.content ?? null

  const validacao = validarSaida({
    textoGerado: texto,
    profissionaisRetornados,
    ultimoTextoEnviado,
  })

  let textoFinal = texto
  if (!validacao.valido) {
    console.warn(`[bot] Guardrail acionado! Motivos: ${validacao.motivos.join("; ")}`)
    // Se a validação reprovou por anti-repetição ou contato inventado, higieniza com template seguro
    if (validacao.motivos.some((m: string) => m.includes("I-04"))) {
      textoFinal = `Continuando seu atendimento: se precisar de outros profissionais ou de mais opções para ${sessao.pedido_ativo?.service.slug ?? "este serviço"}, é só me avisar!`
    }
  }

  const envio = await enviarMensagem(telefone, textoFinal)
  adicionarTurnoConversa(sessao, "assistant", textoFinal)
  await salvarSessao(telefone, sessao)
  return envio
}

async function registrarMetricasTurno(
  telefone: string,
  categoria: string | null,
  bairro: string | null,
  confianca: number,
  inicioTurno: number,
  resultado: "match_bairro" | "match_regiao" | "fallback_cidade" | "sem_match" | "erro",
  duracaoLLMMs?: number,
  duracaoBuscaMs?: number
): Promise<void> {
  const tempoTotalMs = Date.now() - inicioTurno
  await registrarMetricaMensagem({
    contatoHash: hashContato(telefone),
    categoria,
    bairro,
    confianca,
    tempoTotalMs,
    resultado,
  })
  console.log(`[telemetria] Turno concluído em ${tempoTotalMs}ms (LLM: ${duracaoLLMMs ?? 0}ms, Busca: ${duracaoBuscaMs ?? 0}ms) -> ${resultado}`)
}

async function _dispararHandoff(
  telefone: string,
  sessao: Sessao,
  motivo: string,
  ultimasMensagens: string
): Promise<void> {
  await marcarSessaoHumanoAtivo(telefone, true)
  if (sessao.pedido_ativo) {
    sessao.pedido_ativo.status = "handoff"
  }
  await salvarSessao(telefone, sessao)
  await enviarAlertaHandoff({
    telefone,
    motivo,
    categoria: sessao.pedido_ativo?.service.slug ?? null,
    bairro: sessao.pedido_ativo?.location.neighborhood_name ?? null,
    resumo: `Categoria: ${sessao.pedido_ativo?.service.slug ?? "?"}, Bairro: ${sessao.pedido_ativo?.location.neighborhood_name ?? "?"}`,
    ultimasMensagens,
  })
}
