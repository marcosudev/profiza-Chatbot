import { Profissional } from "./supabase"
import { distanciaDamerauLevenshtein } from "./location-resolver"

export interface ResultadoValidacaoSaida {
  valido: boolean
  motivos: string[]
  textoHigienizado?: string
}

const FORBIDDEN_PHRASES_PATTERNS = [
  /\bR\$\s*\d+/i,
  /\bcusta\s+(?:em\s+m[eé]dia\s+)?\d+/i,
  /\bvalor\s+(?:fixo|de)\s+\d+/i,
  /\bchega\s+em\s+\d+\s+(?:min|minutos|hora|horas)\b/i,
  /\bdispon[ií]vel\s+agora\b/i,
  /\baceitou\s+o\s+servi[çc]o\b/i,
  /\bgarantido\s+100%\b/i,
  /\bo\s+melhor\s+da\s+cidade\b/i,
  /\bo\s+melhor\s+avaliado\b/i,
]

export function calcularSimilaridadeTexto(a: string, b: string): number {
  if (!a || !b) return 0
  const normA = a.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim()
  const normB = b.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim()

  if (normA === normB) return 1.0

  const dist = distanciaDamerauLevenshtein(normA, normB)
  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen === 0) return 1.0

  return Math.max(0, 1 - dist / maxLen)
}

export function validarSaida(params: {
  textoGerado: string
  profissionaisRetornados: Profissional[]
  ultimoTextoEnviado?: string | null
  permitirTelefones?: boolean
}): ResultadoValidacaoSaida {
  const {
    textoGerado,
    profissionaisRetornados,
    ultimoTextoEnviado,
  } = params

  const motivos: string[] = []

  if (!textoGerado || !textoGerado.trim()) {
    return { valido: false, motivos: ["Texto de resposta vazio"] }
  }

  // 1. Verificação de frases proibidas (I-11)
  for (const pattern of FORBIDDEN_PHRASES_PATTERNS) {
    if (pattern.test(textoGerado)) {
      motivos.push(`Contém promessa ou afirmação proibida sem lastro: ${pattern.toString()}`)
    }
  }

  // 2. Grounding de telefones e links (I-01)
  const telefonesPermitidos = new Set(
    profissionaisRetornados.map(p => p.whatsapp.replace(/\D/g, ""))
  )
  const telefonesInstitucionais = new Set(["193", "192", "190", "199"])

  const telefonesEncontrados = textoGerado.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}|\b19[0-9]\b/g) || []

  for (const tel of telefonesEncontrados) {
    const numLimpo = tel.replace(/\D/g, "")
    if (telefonesInstitucionais.has(numLimpo)) continue

    let encontrado = false
    for (const permitido of telefonesPermitidos) {
      if (permitido.endsWith(numLimpo) || numLimpo.endsWith(permitido)) {
        encontrado = true
        break
      }
    }

    if (!encontrado && telefonesPermitidos.size > 0) {
      motivos.push(`Telefone ${tel} não pertence à lista de profissionais elegíveis retornados no turno (I-01)`)
    }
  }

  // 3. Verificação anti-repetição consecutiva (I-04)
  if (ultimoTextoEnviado) {
    const similaridade = calcularSimilaridadeTexto(textoGerado, ultimoTextoEnviado)
    if (similaridade >= 0.85) {
      motivos.push(`Similaridade consecutiva de ${similaridade.toFixed(2)} viola o Invariante I-04 (anti-repetição)`)
    }
  }

  return {
    valido: motivos.length === 0,
    motivos,
    textoHigienizado: textoGerado,
  }
}

