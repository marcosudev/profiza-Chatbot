import { createClient } from "@supabase/supabase-js"
import { config } from "./config"
import { hashContato, hashContatoLegado } from "./privacidade"

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

const SESSION_TTL_MS = Number(process.env.SESSION_TIMEOUT_MS ?? 1800000) // 30 min

export interface Sessao {
  versao?: 1
  categoria: string | null
  bairro: string | null
  bairroCandidato?: string | null
  bairroSugerido?: string | null
  bairroSugeridoRegiao?: string | null
  tentativasLocalizacao?: number
  leadSemBairroRegistrado?: boolean
  regiao: string | null
  urgente?: boolean | null
  perguntaPendente?: "categoria" | "bairro" | "urgencia" | null
  turnosRecentes?: TurnoConversa[]
  buscaConcluida?: boolean
  resultadoUltimaBusca?: "match" | "fallback" | "sem_match" | "indisponivel" | null
  nome: string | null
  profissionaisIndicados: string[]
  tentativasEsclarecimento: number
  ultimaIntencao: string | null
  categoriasPendentes?: string[]
  servicosNaFila?: string[]
  servicoAtual?: string | null
  aguardandoConfirmacaoServico?: boolean
  humano_ativo?: boolean
  primeiraInteracao?: boolean
}

export interface TurnoConversa {
  role: "user" | "assistant"
  content: string
}

export function normalizarSessao(estado: unknown): Sessao {
  const salvo = estado && typeof estado === "object" && !Array.isArray(estado)
    ? estado as Partial<Sessao>
    : {}

  if (salvo.versao !== 1) {
    return {
      ...sessaoVazia(),
      nome: typeof salvo.nome === "string" ? salvo.nome : null,
    }
  }

  return {
    ...sessaoVazia(),
    ...salvo,
    turnosRecentes: Array.isArray(salvo.turnosRecentes) ? salvo.turnosRecentes : [],
    profissionaisIndicados: Array.isArray(salvo.profissionaisIndicados) ? salvo.profissionaisIndicados : [],
  }
}

export function adicionarTurnoConversa(
  sessao: Sessao,
  role: TurnoConversa["role"],
  content: string
): void {
  const textoSeguro = content
    .trim()
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[e-mail]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento]")
    .replace(/(?<!\d)(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}(?!\d)/g, "[telefone]")
    .slice(0, 1200)

  if (!textoSeguro) return
  sessao.turnosRecentes = [...(sessao.turnosRecentes ?? []), { role, content: textoSeguro }].slice(-8)
}

export async function carregarSessao(telefone: string): Promise<Sessao> {
  const hash = hashContato(telefone)
  const hashLegado = hashContatoLegado(telefone)
  const { data: sessaoNova } = await supabase
    .from("sessoes")
    .select("estado, atualizado_em")
    .eq("contato_hash", hash)
    .single()
  let data = sessaoNova

  if (!data) {
    const { data: sessaoLegada } = await supabase
      .from("sessoes")
      .select("estado, atualizado_em")
      .eq("contato_hash", hashLegado)
      .single()
    data = sessaoLegada
  }

  if (!data) return sessaoVazia()

  const atualizado = new Date(data.atualizado_em).getTime()
  if (Date.now() - atualizado > SESSION_TTL_MS) {
    await supabase.from("sessoes").delete().eq("contato_hash", hash)
    return sessaoVazia()
  }

  return normalizarSessao(data.estado)
}

export async function salvarSessao(telefone: string, sessao: Sessao): Promise<void> {
  const hash = hashContato(telefone)
  await supabase.from("sessoes").upsert({
    contato_hash: hash,
    estado: { ...sessao, versao: 1 },
    atualizado_em: new Date().toISOString(),
  })
}

export async function limparSessao(telefone: string): Promise<void> {
  const hashes = [hashContato(telefone), hashContatoLegado(telefone)]
  await supabase.from("sessoes").delete().in("contato_hash", hashes)
}

function sessaoVazia(): Sessao {
  return {
    versao: 1,
    categoria: null,
    bairro: null,
    bairroCandidato: null,
    bairroSugerido: null,
    tentativasLocalizacao: 0,
    leadSemBairroRegistrado: false,
    regiao: null,
    urgente: null,
    perguntaPendente: null,
    turnosRecentes: [],
    buscaConcluida: false,
    resultadoUltimaBusca: null,
    nome: null,
    profissionaisIndicados: [],
    tentativasEsclarecimento: 0,
    ultimaIntencao: null,
    categoriasPendentes: [],
    servicosNaFila: [],
    servicoAtual: null,
    aguardandoConfirmacaoServico: false,
    primeiraInteracao: true,
  }
}
