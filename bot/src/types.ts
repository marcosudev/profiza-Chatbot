export type StatusCicloPedido =
  | "collecting"
  | "ready_to_search"
  | "searched"
  | "awaiting_feedback"
  | "closed"
  | "handoff"

export type UrgenciaNivel = "unknown" | "flexible" | "urgent" | "emergency"

export interface ServicoPedido {
  slug: string | null
  label?: string | null
  candidates: string[]
  confidence: number
  source?: "direct" | "symptom_mapping" | "clarification" | "fallback"
}

export interface LocalizacaoPedido {
  neighborhood_id?: number | null
  neighborhood_name: string | null
  region: string | null
  city: string
  confidence: number
  source?: "text" | "shared_location" | "previous_request_confirmed" | "phonetic_suggestion"
  candidate?: string | null
}

export interface PerguntaPendente {
  field: "service" | "neighborhood" | "urgency" | null
  state?: "asking" | "suggesting" | "clarifying"
  candidate?: string | null
  attempts: number
  asked_at?: string
  outboundMessageId?: string
}

export interface PedidoAtivo {
  request_id: string
  status: StatusCicloPedido
  service: ServicoPedido
  details: string[]
  location: LocalizacaoPedido
  urgency: UrgenciaNivel
  pending_question: PerguntaPendente | null
  repair_mode: boolean
  frustrations_count: number
  last_outbound_fingerprints: string[]
  presented_professional_ids: string[]
  search: {
    last_state: "matched" | "fallback" | "no_match" | "unavailable" | null
    last_run_at?: string
    prioridade_match?: 1 | 2 | 3 | null
  }
  created_at: string
  updated_at: string
}

export interface PedidoHistorico {
  request_id: string
  service_slug: string | null
  neighborhood_name: string | null
  region: string | null
  closed_at: string
}

export interface TurnoConversa {
  role: "user" | "assistant"
  content: string
  timestamp?: string
}

export interface Sessao {
  versao: 3
  contatoHash?: string
  nome: string | null
  pedido_ativo: PedidoAtivo | null
  pedidos_anteriores: PedidoHistorico[]
  turnosRecentes: TurnoConversa[]
  notaInstitucionalExibida: boolean
  batch_epoch: number
  humano_ativo?: boolean
  primeiraInteracao?: boolean
  ultimaIntencao?: string | null
}

export type IntencaoTipo =
  | "search_professional"
  | "answer_pending"
  | "correct_info"
  | "more_options"
  | "change_service"
  | "new_request"
  | "ask_how_it_works"
  | "ask_price"
  | "ask_best"
  | "professional_signup"
  | "complaint"
  | "human_request"
  | "opt_out_lgpd"
  | "greeting"
  | "thanks"
  | "closing"
  | "emergency"
  | "out_of_scope"
  | "unknown"

export interface ConfiancaExtracao {
  intent: number
  service: number
  location: number
}

export interface ExtracaoEstruturada {
  intent: IntencaoTipo
  service: string | null
  service_candidates: string[]
  service_details: string[]
  neighborhood: string | null
  neighborhood_candidate: string | null
  region: string | null
  city: string
  urgency: UrgenciaNivel
  corrections: string[]
  answers_pending_question: boolean
  confidence: ConfiancaExtracao
  reply?: string
  categoriasSolicitadas?: string[]
}

export type AcaoPolitica =
  | "EMERGENCY_PROTOCOL"
  | "HANDOFF_HUMAN"
  | "SEARCH_PROFESSIONALS"
  | "ASK_NEIGHBORHOOD"
  | "CONFIRM_NEIGHBORHOOD"
  | "ASK_SERVICE"
  | "DISAMBIGUATE_SERVICE"
  | "ASK_SERVICE_DESCRIPTION"
  | "REFORMULATE_QUESTION"
  | "OFFER_ALTERNATIVES_OR_HANDOFF"
  | "PROCEED_WITH_AVAILABLE"
  | "INSTITUTIONAL_REPLY"
  | "OUT_OF_SCOPE"
  | "GREETING"
  | "MORE_OPTIONS"
  | "CHANGE_SERVICE"
  | "CONFIRM_SERVICE_ORDER"
  | "CONTINUE_ACTIVE_ORDER"

export interface DecisaoPolitica {
  acao: AcaoPolitica
  motivo: string
  regraId: number
  dados?: Record<string, any>
}

export interface VersoesArtefatos {
  prompt_version: string
  model_version: string
  rules_version: string
  taxonomy_version: string
}

