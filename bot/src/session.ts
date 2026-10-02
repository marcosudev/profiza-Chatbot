import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import { config } from "./config"
import { hashContato, hashContatoLegado } from "./privacidade"
import {
  Sessao,
  PedidoAtivo,
  PedidoHistorico,
  TurnoConversa,
  UrgenciaNivel,
} from "./types"

export type { Sessao, PedidoAtivo, TurnoConversa }

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

const SESSION_TTL_MS = Number(process.env.SESSION_TIMEOUT_MS ?? 86400000) // 24 horas por padrão (PRD v3.0 RF-03)

export function criarNovoPedido(params?: {
  serviceSlug?: string | null
  neighborhoodName?: string | null
  region?: string | null
  urgency?: UrgenciaNivel
}): PedidoAtivo {
  const agora = new Date().toISOString()
  return {
    request_id: crypto.randomUUID(),
    status: "collecting",
    service: {
      slug: params?.serviceSlug ?? null,
      candidates: [],
      confidence: params?.serviceSlug ? 0.95 : 0,
      source: params?.serviceSlug ? "direct" : undefined,
    },
    details: [],
    location: {
      neighborhood_name: params?.neighborhoodName ?? null,
      region: params?.region ?? null,
      city: "Bauru",
      confidence: params?.neighborhoodName ? 0.95 : 0,
      source: params?.neighborhoodName ? "text" : undefined,
    },
    urgency: params?.urgency ?? "unknown",
    pending_question: null,
    repair_mode: false,
    frustrations_count: 0,
    last_outbound_fingerprints: [],
    presented_professional_ids: [],
    search: {
      last_state: null,
      prioridade_match: null,
    },
    created_at: agora,
    updated_at: agora,
  }
}

export function sessaoVazia(): Sessao {
  return {
    versao: 3,
    nome: null,
    pedido_ativo: criarNovoPedido(),
    pedidos_anteriores: [],
    turnosRecentes: [],
    notaInstitucionalExibida: false,
    batch_epoch: 1,
    humano_ativo: false,
    primeiraInteracao: true,
    ultimaIntencao: null,
  }
}

export function normalizarSessao(estado: unknown): Sessao {
  const salvo = estado && typeof estado === "object" && !Array.isArray(estado)
    ? (estado as Record<string, any>)
    : {}

  // Se já for versão 3, faz parse seguro
  if (salvo.versao === 3 && salvo.pedido_ativo) {
    return {
      versao: 3,
      nome: typeof salvo.nome === "string" ? salvo.nome : null,
      pedido_ativo: {
        ...criarNovoPedido(),
        ...salvo.pedido_ativo,
      },
      pedidos_anteriores: Array.isArray(salvo.pedidos_anteriores) ? salvo.pedidos_anteriores : [],
      turnosRecentes: Array.isArray(salvo.turnosRecentes) ? salvo.turnosRecentes : [],
      notaInstitucionalExibida: Boolean(salvo.notaInstitucionalExibida),
      batch_epoch: typeof salvo.batch_epoch === "number" ? salvo.batch_epoch : 1,
      humano_ativo: Boolean(salvo.humano_ativo),
      primeiraInteracao: salvo.primeiraInteracao !== undefined ? Boolean(salvo.primeiraInteracao) : false,
      ultimaIntencao: typeof salvo.ultimaIntencao === "string" ? salvo.ultimaIntencao : null,
    }
  }

  // Migração transparente de sessões legadas (versões 1 e 2 planas)
  const novoPedido = criarNovoPedido()
  if (typeof salvo.categoria === "string") novoPedido.service.slug = salvo.categoria
  if (typeof salvo.bairro === "string") novoPedido.location.neighborhood_name = salvo.bairro
  if (typeof salvo.regiao === "string") novoPedido.location.region = salvo.regiao
  if (typeof salvo.bairroCandidato === "string") novoPedido.location.candidate = salvo.bairroCandidato
  if (salvo.urgente === true) novoPedido.urgency = "urgent"
  else if (salvo.urgente === false) novoPedido.urgency = "flexible"

  if (Array.isArray(salvo.profissionaisIndicados)) {
    novoPedido.presented_professional_ids = salvo.profissionaisIndicados
  }
  if (salvo.perguntaPendente) {
    novoPedido.pending_question = {
      field: salvo.perguntaPendente === "categoria" ? "service" : salvo.perguntaPendente,
      attempts: typeof salvo.tentativasEsclarecimento === "number" ? salvo.tentativasEsclarecimento : 1,
    }
  }
  if (salvo.buscaConcluida) {
    novoPedido.status = "searched"
  }

  return {
    versao: 3,
    nome: typeof salvo.nome === "string" ? salvo.nome : null,
    pedido_ativo: novoPedido,
    pedidos_anteriores: [],
    turnosRecentes: Array.isArray(salvo.turnosRecentes) ? salvo.turnosRecentes : [],
    notaInstitucionalExibida: false,
    batch_epoch: 1,
    humano_ativo: Boolean(salvo.humano_ativo),
    primeiraInteracao: Boolean(salvo.primeiraInteracao),
    ultimaIntencao: typeof salvo.ultimaIntencao === "string" ? salvo.ultimaIntencao : null,
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
  sessao.turnosRecentes = [
    ...(sessao.turnosRecentes ?? []),
    { role, content: textoSeguro, timestamp: new Date().toISOString() },
  ].slice(-8)
}

export function fecharPedidoAtivoEArquivar(sessao: Sessao): void {
  const ativo = sessao.pedido_ativo
  if (!ativo) return

  ativo.status = "closed"
  const historico: PedidoHistorico = {
    request_id: ativo.request_id,
    service_slug: ativo.service.slug,
    neighborhood_name: ativo.location.neighborhood_name,
    region: ativo.location.region,
    closed_at: new Date().toISOString(),
  }

  sessao.pedidos_anteriores = [historico, ...sessao.pedidos_anteriores].slice(0, 5)
  sessao.pedido_ativo = criarNovoPedido()
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
  sessao.versao = 3
  if (sessao.pedido_ativo) {
    sessao.pedido_ativo.updated_at = new Date().toISOString()
  }

  await supabase.from("sessoes").upsert({
    contato_hash: hash,
    estado: sessao,
    atualizado_em: new Date().toISOString(),
  })
}

export async function limparSessao(telefone: string): Promise<void> {
  const hashes = [hashContato(telefone), hashContatoLegado(telefone)]
  await supabase.from("sessoes").delete().in("contato_hash", hashes)
}
