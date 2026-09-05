import { createClient } from "@supabase/supabase-js"
import { config } from "./config"

// Service Role Key — bypassa RLS, nunca expor no frontend
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
)

export interface Profissional {
  id: string
  nome: string
  whatsapp: string
  categoria: string
  bairros: string[]           // mapeado de bairro_atuacao
  status: string              // mapeado de status_pagamento
}

// Busca dinamicamente todas as categorias e bairros ativos no banco para a IA
export async function buscarCategoriasEBairrosAtivos(): Promise<{ categorias: string[]; bairros: string[] }> {
  const DEFAULT_CATS = [
    "Eletricista", "Encanador", "Diarista", "Pedreiro", "Pintor", "Limpeza",
    "Montador de Móveis", "Arquiteto", "Borracheiro", "Mecânico", "Jardineiro",
    "Marceneiro", "Técnico de Ar-condicionado", "Técnico de Informática",
    "Serralheiro", "Gesseiro", "Chaveiro", "Vidraceiro", "Desentupidor",
    "Frete e Mudança", "Tapeceiro", "Calheiro", "Bombeiro Hidráulico"
  ]
  const DEFAULT_BAIRROS = ["Centro", "Jardim Europa", "Vila São José", "Alto da Colina", "Jardim das Flores", "Parque São Paulo", "Vila Nery", "Bela Vista"]

  try {
    const { data } = await supabase
      .from("profissionais")
      .select("categoria, bairros")
      .in("status", ["ativo", "teste_gratis"])

    if (!data || data.length === 0) {
      return { categorias: DEFAULT_CATS, bairros: DEFAULT_BAIRROS }
    }

    const catSet = new Set<string>(DEFAULT_CATS)
    const bairroSet = new Set<string>(DEFAULT_BAIRROS)

    data.forEach((row) => {
      if (row.categoria) catSet.add(row.categoria)
      if (Array.isArray(row.bairros)) row.bairros.forEach((b: string) => bairroSet.add(b))
    })

    return { categorias: Array.from(catSet), bairros: Array.from(bairroSet) }
  } catch {
    return { categorias: DEFAULT_CATS, bairros: DEFAULT_BAIRROS }
  }
}

export async function buscarProfissionaisJaEnviados(
  whatsappCliente: string,
  categoria: string
): Promise<string[]> {
  const { data } = await supabase
    .from("leads")
    .select("profissional_id")
    .eq("whatsapp_cliente", whatsappCliente)
    .ilike("categoria", categoria)
    .not("profissional_id", "is", null)

  if (!data) return []
  return data.map((d: any) => d.profissional_id)
}

// Busca profissionais ativos para categoria + bairro
// Prioriza quem tem data_ultimo_lead mais antiga (distribuição justa)
export async function buscarProfissionais(
  categoria: string,
  bairro: string,
  ignoreIds: string[] = [],
  limit: number = 4
): Promise<Profissional[]> {
  let query = supabase
    .from("profissionais")
    .select("id, nome, whatsapp, categoria, bairros, status, metricas_bot!inner(data_ultimo_lead)")
    .in("status", ["ativo", "teste_gratis"])
    .ilike("categoria", categoria)
    .contains("bairros", [bairro])

  if (ignoreIds.length > 0) {
    query = query.not("id", "in", `(${ignoreIds.join(",")})`)
  }

  const { data, error } = await query

  if (error || !data) return []

  // Ordena no JS por garantia, os mais antigos primeiro (nulls = mais antigos ainda)
  const sorted = data.sort((a: any, b: any) => {
    const timeA = a.metricas_bot?.data_ultimo_lead ? new Date(a.metricas_bot.data_ultimo_lead).getTime() : 0
    const timeB = b.metricas_bot?.data_ultimo_lead ? new Date(b.metricas_bot.data_ultimo_lead).getTime() : 0
    return timeA - timeB
  })

  return sorted.slice(0, limit).map((d: any) => ({
    id: d.id,
    nome: d.nome,
    whatsapp: d.whatsapp,
    categoria: d.categoria,
    bairros: d.bairros,
    status: d.status
  }))
}

// Busca profissional com match parcial de bairro (fallback)
export async function buscarProfissionaisFallback(
  categoria: string,
  ignoreIds: string[] = [],
  limit: number = 4
): Promise<Profissional[]> {
  let query = supabase
    .from("profissionais")
    .select("id, nome, whatsapp, categoria, bairros, status, metricas_bot!inner(data_ultimo_lead)")
    .in("status", ["ativo", "teste_gratis"])
    .ilike("categoria", categoria)

  if (ignoreIds.length > 0) {
    query = query.not("id", "in", `(${ignoreIds.join(",")})`)
  }

  const { data, error } = await query

  if (error || !data) return []

  const sorted = data.sort((a: any, b: any) => {
    const timeA = a.metricas_bot?.data_ultimo_lead ? new Date(a.metricas_bot.data_ultimo_lead).getTime() : 0
    const timeB = b.metricas_bot?.data_ultimo_lead ? new Date(b.metricas_bot.data_ultimo_lead).getTime() : 0
    return timeA - timeB
  })

  return sorted.slice(0, limit).map((d: any) => ({
    id: d.id,
    nome: d.nome,
    whatsapp: d.whatsapp,
    categoria: d.categoria,
    bairros: d.bairros,
    status: d.status
  }))
}

export interface SalvarLeadInput {
  nomeCliente: string
  whatsappCliente: string
  categoria: string
  bairro: string
  profissionalId: string | null
  status: "enviado" | "sem_resposta" | "novo"
  mensagemOriginal: string
}

// Salva o lead e dispara o trigger de metricas_bot via leads_eventos
export async function salvarLead(input: SalvarLeadInput): Promise<string | null> {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      nome_cliente: input.nomeCliente,
      whatsapp_cliente: input.whatsappCliente,
      categoria: input.categoria,
      bairro: input.bairro,
      profissional_id: input.profissionalId,
      status: input.status,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[supabase] Erro ao salvar lead:", error.message)
    return null
  }

  // Registra evento para atualizar metricas_bot via trigger
  if (input.profissionalId) {
    await supabase.from("leads_eventos").insert({
      profissional_id: input.profissionalId,
      origem: "whatsapp",
    })
  }

  return data.id
}

// Atualiza lead com mensagem_id da Z-API para rastrear entrega
export async function atualizarLeadMensagemId(
  leadId: string,
  mensagemId: string
): Promise<void> {
  await supabase
    .from("leads")
    .update({ mensagem_id: mensagemId, status: "contato_enviado" })
    .eq("id", leadId)
}

// Busca lead pela mensagem_id
export async function buscarLeadPorMensagemId(mensagemId: string) {
  const { data } = await supabase
    .from("leads")
    .select("id, profissional_id, status, cobrado, valor")
    .eq("mensagem_id", mensagemId)
    .single()
  return data
}

// Atualiza status de entrega do lead
export async function atualizarStatusEntrega(
  leadId: string,
  statusEntrega: string
): Promise<void> {
  await supabase
    .from("leads")
    .update({ status_entrega: statusEntrega })
    .eq("id", leadId)
}

// Confirma entrega (sem cobrança por lead no novo modelo de mensalidade)
export async function confirmarEntregaECobrar(leadId: string): Promise<boolean> {
  const { data: lead } = await supabase
    .from("leads")
    .select("id, status")
    .eq("id", leadId)
    .single()

  if (!lead) return false
  if (lead.status === "entrega_confirmada" || lead.status === "falhou" || lead.status === "cancelado") return false

  // Atualiza lead para entrega_confirmada
  await supabase
    .from("leads")
    .update({
      status: "entrega_confirmada",
      entrega_confirmada_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  console.log(`[cobranca] Lead ${leadId} confirmado entregue (cobrança avulsa desativada)`)
  return true
}

// Registra log de evento
export async function registrarLog(
  entidade: string,
  entidadeId: string,
  evento: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  await supabase.from("logs_eventos").insert({
    entidade,
    entidade_id: entidadeId,
    evento,
    payload,
  })
}
