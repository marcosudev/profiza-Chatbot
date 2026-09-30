import { createClient } from "@supabase/supabase-js"
import { config } from "./config"

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

const SESSION_TTL_MS = Number(process.env.SESSION_TIMEOUT_MS ?? 1800000) // 30 min

export interface Sessao {
  categoria: string | null
  bairro: string | null
  regiao: string | null
  nome: string | null
  profissionaisIndicados: string[]
  tentativasEsclarecimento: number
  ultimaIntencao: string | null
}

function contatoHash(telefone: string): string {
  return Buffer.from(telefone).toString("base64")
}

export async function carregarSessao(telefone: string): Promise<Sessao> {
  const hash = contatoHash(telefone)
  const { data } = await supabase
    .from("sessoes")
    .select("estado, atualizado_em")
    .eq("contato_hash", hash)
    .single()

  if (!data) return sessaoVazia()

  const atualizado = new Date(data.atualizado_em).getTime()
  if (Date.now() - atualizado > SESSION_TTL_MS) {
    await supabase.from("sessoes").delete().eq("contato_hash", hash)
    return sessaoVazia()
  }

  return data.estado as Sessao
}

export async function salvarSessao(telefone: string, sessao: Sessao): Promise<void> {
  const hash = contatoHash(telefone)
  await supabase.from("sessoes").upsert({
    contato_hash: hash,
    estado: sessao,
    atualizado_em: new Date().toISOString(),
  })
}

export async function limparSessao(telefone: string): Promise<void> {
  const hash = contatoHash(telefone)
  await supabase.from("sessoes").delete().eq("contato_hash", hash)
}

function sessaoVazia(): Sessao {
  return {
    categoria: null,
    bairro: null,
    regiao: null,
    nome: null,
    profissionaisIndicados: [],
    tentativasEsclarecimento: 0,
    ultimaIntencao: null,
  }
}
