import { bairros, referencias, Bairro } from "./knowledge/bairros-bauru"

export interface CandidatoLocalizacao {
  nome: string
  regiao: string
  score: number
  matchType: "exact" | "alias" | "reference" | "phonetic" | "fuzzy" | "prefix_variant"
}

export type StatusResolucaoLocal =
  | "exact_match"
  | "single_suggestion_confirm"
  | "multiple_options_disambiguate"
  | "not_found"

export interface ResultadoResolucaoLocal {
  status: StatusResolucaoLocal
  bairroOficial: string | null
  regiao: string | null
  candidatoTexto: string
  score: number
  margem: number
  opcoes: Array<{ nome: string; regiao: string; score: number }>
}

const PREFIXOS_EXPANSOES: Record<string, string> = {
  "jd": "jardim",
  "jd.": "jardim",
  "j": "jardim",
  "j.": "jardim",
  "vl": "vila",
  "vl.": "vila",
  "v": "vila",
  "v.": "vila",
  "pq": "parque",
  "pq.": "parque",
  "p": "parque",
  "p.": "parque",
  "res": "residencial",
  "res.": "residencial",
  "nuc": "nucleo",
  "nuc.": "nucleo",
  "conj": "conjunto",
  "conj.": "conjunto",
  "sta": "santa",
  "sta.": "santa",
  "st": "santa",
  "st.": "santa",
  "sto": "santo",
  "sto.": "santo",
}

const STOPWORDS_LOCAL = new Set([
  "no", "na", "nos", "nas", "em", "do", "da", "dos", "das", "de",
  "perto", "proximo", "ao", "lado", "moro", "sou", "fica", "aqui",
  "bairro", "regiao", "cidade", "bauru", "la", "zona"
])

export function normalizarTextoLocal(texto: string): string {
  if (!texto) return ""
  let norm = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const tokens = norm.split(" ").map(token => PREFIXOS_EXPANSOES[token] || token)
  norm = tokens.join(" ").replace(/\./g, "").trim()

  norm = norm.replace(/(.)\1{2,}/g, "$1$1")
  return norm
}

export function limparStopwords(textoNormalizado: string): string {
  const tokens = textoNormalizado.split(" ").filter(t => t.length > 0 && !STOPWORDS_LOCAL.has(t))
  return tokens.join(" ")
}

export function foneticaPtBr(texto: string): string {
  let f = normalizarTextoLocal(texto)
  if (!f) return ""

  f = f.replace(/ph/g, "f")
  f = f.replace(/ch/g, "x")
  f = f.replace(/lh/g, "li")
  f = f.replace(/nh/g, "ni")
  f = f.replace(/eu/g, "o")
  f = f.replace(/ou/g, "o")
  f = f.replace(/ei/g, "e")
  f = f.replace(/qu([eēií])/g, "k$1")
  f = f.replace(/qu([aāoóu])/g, "k$1")
  f = f.replace(/q/g, "k")
  f = f.replace(/c([eēií])/g, "s$1")
  f = f.replace(/c([aāoóu])/g, "k$1")
  f = f.replace(/ç/g, "s")
  f = f.replace(/xc|sc/g, "s")
  f = f.replace(/ss/g, "s")
  f = f.replace(/z\b/g, "s")
  f = f.replace(/z/g, "s")
  f = f.replace(/x/g, "s")
  f = f.replace(/w/g, "v")
  f = f.replace(/y/g, "i")
  f = f.replace(/h/g, "")
  f = f.replace(/o\b/g, "u")
  f = f.replace(/e\b/g, "i")
  f = f.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1")
  return f.replace(/\s+/g, "")
}

export function distanciaDamerauLevenshtein(a: string, b: string): number {
  const la = a.length
  const lb = b.length
  if (la === 0) return lb
  if (lb === 0) return la

  const d: number[][] = []
  for (let i = 0; i <= la; i++) {
    d[i] = []
    d[i][0] = i
  }
  for (let j = 0; j <= lb; j++) {
    d[0][j] = j
  }

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost)
      }
    }
  }
  return d[la][lb]
}

function gerarTrigramas(texto: string): Set<string> {
  const s = `  ${texto}  `
  const trigramas = new Set<string>()
  for (let i = 0; i < s.length - 2; i++) {
    trigramas.add(s.slice(i, i + 3))
  }
  return trigramas
}

export function similaridadeTrigramas(a: string, b: string): number {
  if (a === b) return 1.0
  const triA = gerarTrigramas(a)
  const triB = gerarTrigramas(b)
  let intersecao = 0
  for (const t of triA) {
    if (triB.has(t)) intersecao++
  }
  const uniao = triA.size + triB.size - intersecao
  return uniao === 0 ? 0 : intersecao / uniao
}

function pontuarCandidato(consulta: string, alvo: string): number {
  const normConsulta = normalizarTextoLocal(consulta)
  const normAlvo = normalizarTextoLocal(alvo)

  if (normConsulta === normAlvo) return 1.0

  const semStopConsulta = limparStopwords(normConsulta)
  const semStopAlvo = limparStopwords(normAlvo)

  if (semStopConsulta && semStopAlvo && semStopConsulta === semStopAlvo) {
    return 0.98
  }

  const prefixos = ["jardim ", "vila ", "parque ", "nucleo ", "residencial ", "conjunto "]
  let prefConsulta: string | null = null
  let prefAlvo: string | null = null
  let semPrefConsulta = normConsulta
  let semPrefAlvo = normAlvo

  for (const p of prefixos) {
    if (normConsulta.startsWith(p)) {
      prefConsulta = p.trim()
      semPrefConsulta = normConsulta.slice(p.length)
    }
    if (normAlvo.startsWith(p)) {
      prefAlvo = p.trim()
      semPrefAlvo = normAlvo.slice(p.length)
    }
  }

  if (semPrefConsulta && semPrefAlvo && semPrefConsulta === semPrefAlvo) {
    if (prefConsulta && prefAlvo && prefConsulta === prefAlvo) return 0.98
    if (!prefConsulta || !prefAlvo) return 0.95
  }

  const distLev = distanciaDamerauLevenshtein(normConsulta, normAlvo)
  const maxLen = Math.max(normConsulta.length, normAlvo.length)
  const scoreLev = maxLen > 0 ? 1 - distLev / maxLen : 0

  const distLevSemPref = distanciaDamerauLevenshtein(semPrefConsulta, semPrefAlvo)
  const maxLenPref = Math.max(semPrefConsulta.length, semPrefAlvo.length)
  const scoreLevSemPref = maxLenPref > 0 ? 1 - distLevSemPref / maxLenPref : 0

  const simTri = similaridadeTrigramas(normConsulta, normAlvo)
  const simTriSemPref = similaridadeTrigramas(semPrefConsulta, semPrefAlvo)

  const fonConsulta = foneticaPtBr(normConsulta)
  const fonAlvo = foneticaPtBr(normAlvo)
  const distFon = distanciaDamerauLevenshtein(fonConsulta, fonAlvo)
  const maxFon = Math.max(fonConsulta.length, fonAlvo.length)
  const scoreFon = maxFon > 0 ? 1 - distFon / maxFon : 0

  const fonSemPrefConsulta = foneticaPtBr(semPrefConsulta)
  const fonSemPrefAlvo = foneticaPtBr(semPrefAlvo)
  const distFonSemPref = distanciaDamerauLevenshtein(fonSemPrefConsulta, fonSemPrefAlvo)
  const maxFonSemPref = Math.max(fonSemPrefConsulta.length, fonSemPrefAlvo.length)
  const scoreFonSemPref = maxFonSemPref > 0 ? 1 - distFonSemPref / maxFonSemPref : 0

  let melhorFuzzy = Math.max(
    scoreLev * 0.40 + simTri * 0.30 + scoreFon * 0.30,
    scoreLevSemPref * 0.40 + simTriSemPref * 0.30 + scoreFonSemPref * 0.30
  )

  // Ajuste de consistência de prefixo
  if (prefConsulta && prefAlvo) {
    if (prefConsulta === prefAlvo) {
      melhorFuzzy = Math.min(1.0, melhorFuzzy + 0.05)
    } else {
      melhorFuzzy = Math.max(0, melhorFuzzy - 0.12)
    }
  }

  return Math.min(1.0, Math.max(0, melhorFuzzy))
}

export function resolverLocalizacaoAvancada(
  textoEntrada: string,
  catalogoBairros: Bairro[] = bairros,
  contextoPerguntaPendente: boolean = false
): ResultadoResolucaoLocal {
  const normEntrada = normalizarTextoLocal(textoEntrada)
  const textoLimpo = limparStopwords(normEntrada)
  const bonusContexto = contextoPerguntaPendente ? 0.05 : 0.0

  if (!normEntrada) {
    return {
      status: "not_found",
      bairroOficial: null,
      regiao: null,
      candidatoTexto: textoEntrada,
      score: 0,
      margem: 0,
      opcoes: [],
    }
  }

  for (const [ref, bairroNome] of Object.entries(referencias)) {
    const normRef = normalizarTextoLocal(ref)
    if (normEntrada === normRef || normEntrada.includes(normRef)) {
      const b = catalogoBairros.find(item => item.nome === bairroNome)
      if (b) {
        return {
          status: "exact_match",
          bairroOficial: b.nome,
          regiao: b.regiao,
          candidatoTexto: textoEntrada,
          score: 1.0,
          margem: 1.0,
          opcoes: [{ nome: b.nome, regiao: b.regiao, score: 1.0 }],
        }
      }
    }
  }

  for (const b of catalogoBairros) {
    const normNome = normalizarTextoLocal(b.nome)
    if (normEntrada === normNome) {
      return {
        status: "exact_match",
        bairroOficial: b.nome,
        regiao: b.regiao,
        candidatoTexto: textoEntrada,
        score: 1.0,
        margem: 1.0,
        opcoes: [{ nome: b.nome, regiao: b.regiao, score: 1.0 }],
      }
    }
    for (const apelido of b.apelidos) {
      const normApelido = normalizarTextoLocal(apelido)
      if (normEntrada === normApelido || normEntrada === `no ${normApelido}` || normEntrada === `na ${normApelido}`) {
        return {
          status: "exact_match",
          bairroOficial: b.nome,
          regiao: b.regiao,
          candidatoTexto: textoEntrada,
          score: 1.0,
          margem: 1.0,
          opcoes: [{ nome: b.nome, regiao: b.regiao, score: 1.0 }],
        }
      }
    }
  }

  for (const b of catalogoBairros) {
    for (const apelido of b.apelidos) {
      const normApelido = normalizarTextoLocal(apelido)
      if (normApelido.length >= 4) {
        const regexPalavra = new RegExp(`\\b${normApelido.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i")
        if (regexPalavra.test(normEntrada)) {
          return {
            status: "exact_match",
            bairroOficial: b.nome,
            regiao: b.regiao,
            candidatoTexto: textoEntrada,
            score: 0.98,
            margem: 0.98,
            opcoes: [{ nome: b.nome, regiao: b.regiao, score: 0.98 }],
          }
        }
      }
    }
  }

  const candidatosPontuados: Array<{ nome: string; regiao: string; score: number }> = []

  for (const b of catalogoBairros) {
    let melhorScoreBairro = pontuarCandidato(textoLimpo || normEntrada, b.nome)
    for (const apelido of b.apelidos) {
      const scoreApelido = pontuarCandidato(textoLimpo || normEntrada, apelido)
      if (scoreApelido > melhorScoreBairro) melhorScoreBairro = scoreApelido
    }

    const scoreFinal = Math.min(1.0, melhorScoreBairro + bonusContexto)
    if (scoreFinal >= 0.60) {
      candidatosPontuados.push({
        nome: b.nome,
        regiao: b.regiao,
        score: Number(scoreFinal.toFixed(3)),
      })
    }
  }

  candidatosPontuados.sort((a, b) => b.score - a.score)

  if (candidatosPontuados.length === 0) {
    return {
      status: "not_found",
      bairroOficial: null,
      regiao: null,
      candidatoTexto: textoEntrada,
      score: 0,
      margem: 0,
      opcoes: [],
    }
  }

  const top1 = candidatosPontuados[0]
  const top2 = candidatosPontuados[1] ?? null
  const margem = top2 ? Number((top1.score - top2.score).toFixed(3)) : top1.score

  if (top1.score >= 0.96) {
    return {
      status: "exact_match",
      bairroOficial: top1.nome,
      regiao: top1.regiao,
      candidatoTexto: textoEntrada,
      score: top1.score,
      margem,
      opcoes: candidatosPontuados.slice(0, 3),
    }
  }

  if (top1.score >= 0.82 && margem >= 0.08) {
    return {
      status: "single_suggestion_confirm",
      bairroOficial: top1.nome,
      regiao: top1.regiao,
      candidatoTexto: textoEntrada,
      score: top1.score,
      margem,
      opcoes: [top1],
    }
  }

  if (top1.score >= 0.68) {
    return {
      status: "multiple_options_disambiguate",
      bairroOficial: null,
      regiao: null,
      candidatoTexto: textoEntrada,
      score: top1.score,
      margem,
      opcoes: candidatosPontuados.slice(0, 3),
    }
  }

  return {
    status: "not_found",
    bairroOficial: null,
    regiao: null,
    candidatoTexto: textoEntrada,
    score: top1.score,
    margem,
    opcoes: candidatosPontuados.slice(0, 3),
  }
}
