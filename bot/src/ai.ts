import OpenAI from "openai"
import { config } from "./config"
import { bairros, resolverBairro } from "./knowledge/bairros-bauru"
import { categorias, slugsValidos, resolverCategoria, resolverCategoriasSolicitadas } from "./knowledge/categorias"
import { promptSistema } from "./knowledge/institucional"
import { resolverLocalizacaoAvancada } from "./location-resolver"
import {
  ExtracaoEstruturada,
  IntencaoTipo,
  UrgenciaNivel,
  VersoesArtefatos,
  Sessao,
} from "./types"

const openai = new OpenAI({ apiKey: config.openai.apiKey })

export const VERSOES_SISTEMA: VersoesArtefatos = {
  prompt_version: "3.0.0",
  model_version: process.env.LLM_MODEL ?? "gpt-4o-mini",
  rules_version: "3.0.0",
  taxonomy_version: "2026.09.30",
}

const intencoesValidas: IntencaoTipo[] = [
  "search_professional",
  "answer_pending",
  "correct_info",
  "more_options",
  "change_service",
  "new_request",
  "ask_how_it_works",
  "ask_price",
  "ask_best",
  "professional_signup",
  "complaint",
  "human_request",
  "opt_out_lgpd",
  "greeting",
  "thanks",
  "closing",
  "emergency",
  "out_of_scope",
  "unknown",
]

const TERMOS_EMERGENCIA = [
  /\bcheiro\s+de\s+g[aá]s\b/i,
  /\bvazamento\s+de\s+g[aá]s\b/i,
  /\binc[eê]ndio\b/i,
  /\bfogo\b/i,
  /\bchoque\s+el[eé]trico\b/i,
  /\beletrocutado\b/i,
  /\bfuma[çc]a\s+saindo\b/i,
  /\bcurto[- ]circuito\s+com\s+fogo\b/i,
  /\bdesabando\b/i,
]

export function detectarEmergenciaDeterministica(mensagem: string): boolean {
  if (!mensagem) return false
  return TERMOS_EMERGENCIA.some(regex => regex.test(mensagem))
}

function montarContextoBairros(): string {
  const porRegiao: Record<string, string[]> = {}
  for (const b of bairros) {
    if (!porRegiao[b.regiao]) porRegiao[b.regiao] = []
    porRegiao[b.regiao].push(b.nome)
  }
  return Object.entries(porRegiao)
    .map(([regiao, nomes]) => `${regiao}: ${nomes.join(", ")}`)
    .join("\n")
}

function montarContextoCategorias(): string {
  return categorias.map(c => `${c.slug} (${c.label})`).join(", ")
}

export function resolverUrgenciaLocal(mensagem: string): UrgenciaNivel | null {
  const texto = mensagem
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (detectarEmergenciaDeterministica(mensagem)) {
    return "emergency"
  }
  if (/\b(nao\s+(?:e\s+)?urgente|sem\s+pressa|pode\s+aguardar|pode\s+esperar|nao\s+tem\s+pressa)\b/.test(texto)) {
    return "flexible"
  }
  if (/\b(urgente|urgencia|pra\s+hoje|para\s+hoje|o\s+quanto\s+antes|imediato|agora)\b/.test(texto)) {
    return "urgent"
  }
  return null
}

export function validarBairroExtraido(valor: string | null | undefined): {
  bairro: string | null
  bairroCandidato: string | null
  regiao: string | null
  confidence: number
} {
  if (!valor) return { bairro: null, bairroCandidato: null, regiao: null, confidence: 0 }

  const candidato = valor
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{M} '-]/gu, "")
    .trim()
    .slice(0, 80)

  if (!candidato || /^(null|desconhecido|nao informado|nao definido|outros|nao sei)$/i.test(candidato)) {
    return { bairro: null, bairroCandidato: null, regiao: null, confidence: 0 }
  }

  const resAvancada = resolverLocalizacaoAvancada(candidato)
  if (resAvancada.status === "exact_match") {
    return {
      bairro: resAvancada.bairroOficial,
      bairroCandidato: null,
      regiao: resAvancada.regiao,
      confidence: resAvancada.score,
    }
  }

  return {
    bairro: null,
    bairroCandidato: candidato,
    regiao: resAvancada.regiao ?? null,
    confidence: resAvancada.score,
  }
}

export async function extrairIntencao(
  mensagem: string,
  sessao: Sessao
): Promise<ExtracaoEstruturada> {
  // 1. Pré-processamento determinístico de emergência
  if (detectarEmergenciaDeterministica(mensagem)) {
    return {
      intent: "emergency",
      service: null,
      service_candidates: [],
      service_details: [],
      neighborhood: null,
      neighborhood_candidate: null,
      region: null,
      city: "Bauru",
      urgency: "emergency",
      corrections: [],
      answers_pending_question: false,
      confidence: { intent: 1.0, service: 0, location: 0 },
      reply: "⚠️ Isso parece uma emergência. Acione imediatamente os Bombeiros (193) ou o SAMU (192).",
    }
  }

  // 2. Extração determinística rápida de categoria e localização
  const catLocal = resolverCategoria(mensagem)
  const categoriasSolicitadas = resolverCategoriasSolicitadas(mensagem)
  const bairroLocal = resolverBairro(mensagem)
  const urgenteLocal = resolverUrgenciaLocal(mensagem)

  const pedidoAtivo = sessao.pedido_ativo
  const contextoSessao = [
    `PEDIDO ATIVO: id=${pedidoAtivo?.request_id ?? "nenhum"}, status=${pedidoAtivo?.status ?? "novo"}, serviço=${pedidoAtivo?.service.slug ?? "não definido"}, bairro=${pedidoAtivo?.location.neighborhood_name ?? "não definido"}, urgência=${pedidoAtivo?.urgency ?? "unknown"}`,
    `CAMPO PENDENTE: ${pedidoAtivo?.pending_question?.field ?? "nenhum"} (estado=${pedidoAtivo?.pending_question?.state ?? "nenhum"})`,
    `ÚLTIMA BUSCA: ${pedidoAtivo?.search.last_state ?? "nenhuma"}`,
  ].join("\n")

  const system = `${promptSistema(montarContextoBairros(), montarContextoCategorias())}\n\n${contextoSessao}`
  const historico = (sessao.turnosRecentes ?? []).slice(-8)

  try {
    const response = await openai.chat.completions.create({
      model: VERSOES_SISTEMA.model_version,
      messages: [
        { role: "system", content: system },
        ...historico,
        { role: "user", content: mensagem },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return fallback(catLocal, bairroLocal, categoriasSolicitadas, urgenteLocal)

    const parsed = JSON.parse(content) as any

    const service = catLocal?.ambiguo || categoriasSolicitadas.length > 1
      ? null
      : parsed.service && slugsValidos.includes(parsed.service)
      ? parsed.service
      : parsed.categoria && slugsValidos.includes(parsed.categoria)
      ? parsed.categoria
      : catLocal?.slug ?? null

    const rawNeighborhood = parsed.neighborhood || parsed.bairro || null
    const bairroExtraido = bairroLocal
      ? { bairro: bairroLocal.bairro, bairroCandidato: null, regiao: bairroLocal.regiao, confidence: 1.0 }
      : validarBairroExtraido(rawNeighborhood)

    let intent: IntencaoTipo = "search_professional"
    const parsedIntent = parsed.intent || parsed.intencao
    if (parsedIntent && intencoesValidas.includes(parsedIntent)) {
      intent = parsedIntent
    } else if (parsedIntent === "busca_profissional") {
      intent = "search_professional"
    } else if (parsedIntent === "falar_humano") {
      intent = "human_request"
    } else if (parsedIntent === "reclamacao") {
      intent = "complaint"
    } else if (parsedIntent === "saudacao") {
      intent = "greeting"
    } else if (parsedIntent === "fora_escopo") {
      intent = "out_of_scope"
    } else if (parsedIntent === "emergencia") {
      intent = "emergency"
    } else if (parsedIntent === "mais_opcoes") {
      intent = "more_options"
    }

    let urgency: UrgenciaNivel = urgenteLocal ?? "unknown"
    if (urgenteLocal === null) {
      if (parsed.urgency === "urgent" || parsed.urgente === true) urgency = "urgent"
      else if (parsed.urgency === "flexible" || parsed.urgente === false) urgency = "flexible"
      else if (parsed.urgency === "emergency") urgency = "emergency"
    }

    const confIntent = typeof parsed.confidence?.intent === "number"
      ? parsed.confidence.intent
      : typeof parsed.confianca === "number"
      ? parsed.confianca
      : 0.90

    const confService = typeof parsed.confidence?.service === "number"
      ? parsed.confidence.service
      : service ? 0.95 : 0.40

    const confLocation = typeof parsed.confidence?.location === "number"
      ? parsed.confidence.location
      : bairroExtraido.bairro ? 0.95 : bairroExtraido.bairroCandidato ? 0.70 : 0.30

    return {
      intent,
      service,
      service_candidates: catLocal?.ambiguo ? catLocal.alternativas : Array.isArray(parsed.service_candidates) ? parsed.service_candidates : [],
      service_details: Array.isArray(parsed.service_details) ? parsed.service_details : [],
      neighborhood: bairroExtraido.bairro,
      neighborhood_candidate: bairroExtraido.bairroCandidato,
      region: bairroExtraido.regiao,
      city: "Bauru",
      urgency,
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
      answers_pending_question: Boolean(parsed.answers_pending_question || parsed.answersPendingQuestion),
      confidence: {
        intent: confIntent,
        service: confService,
        location: confLocation,
      },
      reply: parsed.reply || parsed.mensagem || "",
      categoriasSolicitadas,
    }
  } catch (err) {
    console.error("[ai] Erro ao extrair intenção estruturada:", err)
    return fallback(catLocal, bairroLocal, categoriasSolicitadas, urgenteLocal)
  }
}

function fallback(
  catLocal: ReturnType<typeof resolverCategoria>,
  bairroLocal: ReturnType<typeof resolverBairro>,
  categoriasSolicitadas: string[],
  urgente: UrgenciaNivel | null
): ExtracaoEstruturada {
  return {
    intent: "search_professional",
    service: catLocal?.ambiguo || categoriasSolicitadas.length > 1 ? null : catLocal?.slug ?? null,
    service_candidates: catLocal?.ambiguo ? catLocal.alternativas : [],
    service_details: [],
    neighborhood: bairroLocal?.bairro ?? null,
    neighborhood_candidate: null,
    region: bairroLocal?.regiao ?? null,
    city: "Bauru",
    urgency: urgente ?? "unknown",
    corrections: [],
    answers_pending_question: false,
    confidence: {
      intent: 0.50,
      service: catLocal?.slug ? 0.90 : 0.30,
      location: bairroLocal?.bairro ? 0.90 : 0.30,
    },
    reply: "",
    categoriasSolicitadas,
  }
}
