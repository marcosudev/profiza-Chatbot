import {
  PedidoAtivo,
  ExtracaoEstruturada,
  DecisaoPolitica,
  AcaoPolitica,
} from "./types"

const FRUSTRATION_PATTERNS = [
  /\bj[aá]\s+(disse|falei|mandei|respondi|informei|coloquei)\b/i,
  /\bde\s+novo\b/i,
  /\boutra\s+vez\b/i,
  /\bquantas\s+vezes\b/i,
  /\bn[aã]o\s+l[eê]u\b/i,
  /\bburro|incompetente|porcaria\b/i,
]

export function detectarFrustracao(texto: string): boolean {
  if (!texto) return false
  return FRUSTRATION_PATTERNS.some(regex => regex.test(texto))
}

export function avaliarPoliticaDialogo(params: {
  pedido: PedidoAtivo | null
  extracao: ExtracaoEstruturada
  mensagemBruta: string
  confirmouSugestaoLocal: boolean
  recusouSugestaoLocal: boolean
  refereSugestaoLocal: boolean
  respondendoEsclarecimento: boolean
}): DecisaoPolitica {
  const {
    pedido,
    extracao,
    mensagemBruta,
    confirmouSugestaoLocal,
    recusouSugestaoLocal,
    refereSugestaoLocal,
    respondendoEsclarecimento,
  } = params

  const confiancaIntencao = extracao.confidence.intent
  const confiancaServico = extracao.confidence.service
  const confiancaLocal = extracao.confidence.location

  const servicoAtual = extracao.service ?? pedido?.service.slug ?? null
  const bairroAtual = extracao.neighborhood ?? pedido?.location.neighborhood_name ?? null
  const regiaoAtual = extracao.region ?? pedido?.location.region ?? null
  const candidatoBairro = extracao.neighborhood_candidate ?? pedido?.location.candidate ?? null

  const tentativasLocal = pedido?.pending_question?.field === "neighborhood" ? pedido.pending_question.attempts : 0
  const tentativasServico = pedido?.pending_question?.field === "service" ? pedido.pending_question.attempts : 0

  // 1. Sinal de emergência
  if (extracao.intent === "emergency" || extracao.urgency === "emergency") {
    return {
      acao: "EMERGENCY_PROTOCOL",
      motivo: "Sinal de emergência detectado por intenção ou termo de risco",
      regraId: 1,
    }
  }

  // 2. Pedido de atendente, reclamação ou risco de segurança
  if (extracao.intent === "human_request" || extracao.intent === "complaint") {
    return {
      acao: "HANDOFF_HUMAN",
      motivo: extracao.intent === "complaint" ? "Reclamação de cliente" : "Cliente pediu atendente humano",
      regraId: 2,
    }
  }

  // Tratamento de intenções institucionais
  if (
    !respondendoEsclarecimento &&
    (extracao.intent === "ask_how_it_works" ||
      extracao.intent === "ask_price" ||
      extracao.intent === "ask_best" ||
      extracao.intent === "professional_signup")
  ) {
    return {
      acao: "INSTITUTIONAL_REPLY",
      motivo: `Pergunta institucional do tipo ${extracao.intent}`,
      regraId: 12,
      dados: { tipo: extracao.intent },
    }
  }

  if (extracao.intent === "more_options" && pedido && pedido.status === "searched") {
    return {
      acao: "MORE_OPTIONS",
      motivo: "Cliente solicitou mais opções de profissionais",
      regraId: 101,
    }
  }

  if (extracao.intent === "greeting" && !servicoAtual && !bairroAtual) {
    return {
      acao: "GREETING",
      motivo: "Saudação inicial sem pedido",
      regraId: 102,
    }
  }

  if (extracao.intent === "out_of_scope" && !respondendoEsclarecimento) {
    return {
      acao: "OUT_OF_SCOPE",
      motivo: "Mensagem fora de escopo",
      regraId: 13,
    }
  }

  if (extracao.categoriasSolicitadas && extracao.categoriasSolicitadas.length > 1) {
    return {
      acao: "CONFIRM_SERVICE_ORDER",
      motivo: "Múltiplos serviços solicitados na mesma mensagem",
      regraId: 103,
      dados: { categorias: extracao.categoriasSolicitadas },
    }
  }

  // 10. Duas tentativas sem resposta útil no mesmo campo
  if (tentativasLocal >= 2 || tentativasServico >= 2) {
    return {
      acao: "OFFER_ALTERNATIVES_OR_HANDOFF",
      motivo: "Limite de 2 tentativas de esclarecimento excedido no mesmo campo",
      regraId: 10,
      dados: { campo: tentativasLocal >= 2 ? "neighborhood" : "service" },
    }
  }

  // 7. Serviço com 2–3 candidatos ambíguos
  if (extracao.service_candidates && extracao.service_candidates.length > 1 && !servicoAtual) {
    return {
      acao: "DISAMBIGUATE_SERVICE",
      motivo: "Categoria ambígua com 2 a 3 candidatos",
      regraId: 7,
      dados: { candidatos: extracao.service_candidates },
    }
  }

  // 3. Serviço resolvido (conf. >= 0.80) E bairro resolvido (conf. >= 0.80)
  const servicoResolvido = Boolean(servicoAtual) && confiancaServico >= 0.75
  const bairroResolvido = Boolean(bairroAtual) && confiancaLocal >= 0.75

  if (servicoResolvido && bairroResolvido) {
    return {
      acao: "SEARCH_PROFESSIONALS",
      motivo: "Serviço e bairro resolvidos com confiança suficiente",
      regraId: 3,
      dados: { servico: servicoAtual, bairro: bairroAtual, regiao: regiaoAtual },
    }
  }

  // 4. Serviço resolvido e bairro ausente
  if (servicoResolvido && !bairroAtual && !candidatoBairro) {
    return {
      acao: "ASK_NEIGHBORHOOD",
      motivo: "Serviço identificado, solicitando bairro",
      regraId: 4,
      dados: { servico: servicoAtual },
    }
  }

  // 5. Serviço resolvido e bairro ambíguo ou com baixa confiança / candidato pendente
  if (servicoResolvido && candidatoBairro && !bairroResolvido) {
    return {
      acao: "CONFIRM_NEIGHBORHOOD",
      motivo: "Bairro pendente de confirmação ou desambiguação",
      regraId: 5,
      dados: { candidato: candidatoBairro },
    }
  }

  // 6. Bairro resolvido e serviço ausente
  if (bairroResolvido && !servicoAtual) {
    return {
      acao: "ASK_SERVICE",
      motivo: "Bairro identificado, solicitando serviço",
      regraId: 6,
      dados: { bairro: bairroAtual },
    }
  }

  // 8. Serviço não identificado
  if (!servicoAtual && !bairroAtual) {
    if (confiancaIntencao < 0.60) {
      return {
        acao: "REFORMULATE_QUESTION",
        motivo: "Baixa confiança global sem dados claros",
        regraId: 9,
      }
    }
    return {
      acao: "ASK_SERVICE_DESCRIPTION",
      motivo: "Serviço e bairro não identificados",
      regraId: 8,
    }
  }

  // 11. Pergunta opcional (urgência) sem resposta e cliente reitera o pedido
  if (pedido && pedido.pending_question?.field === "urgency") {
    return {
      acao: "PROCEED_WITH_AVAILABLE",
      motivo: "Pergunta opcional de urgência prossegue com dados disponíveis",
      regraId: 11,
    }
  }

  return {
    acao: "ASK_SERVICE_DESCRIPTION",
    motivo: "Decisão padrão de fallback",
    regraId: 100,
  }
}

