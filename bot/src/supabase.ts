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

// Busca o melhor profissional ativo para categoria + bairro
// Prioriza quem tem menos leads recentes (distribuição justa)
export async function buscarProfissional(
  categoria: string,
  bairro: string
): Promise<Profissional | null> {
  const { data, error } = await supabase
    .from("profissionais")
    .select("id, nome, whatsapp, categoria, bairros, status")
    .in("status", ["ativo", "teste_gratis"])
    .ilike("categoria", categoria)
    .contains("bairros", [bairro])
    .limit(1)
    .single()

  if (error || !data) return null
  return data as Profissional
}

// Busca profissional com match parcial de bairro (fallback)
export async function buscarProfissionalFallback(
  categoria: string
): Promise<Profissional | null> {
  const { data, error } = await supabase
    .from("profissionais")
    .select("id, nome, whatsapp, categoria, bairros, status")
    .in("status", ["ativo", "teste_gratis"])
    .ilike("categoria", categoria)
    .limit(1)
    .single()

  if (error || !data) return null
  return data as Profissional
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

// Confirma entrega e cria cobrança (idempotente)
export async function confirmarEntregaECobrar(leadId: string): Promise<boolean> {
  // Busca lead com dados atuais
  const { data: lead } = await supabase
    .from("leads")
    .select("id, profissional_id, status, cobrado, valor")
    .eq("id", leadId)
    .single()

  if (!lead) return false
  if (lead.cobrado) return true // já cobrado, idempotente
  if (lead.status === "falhou" || lead.status === "cancelado") return false

  const valor = lead.valor ?? 10.00 // valor padrão R$10

  // Atualiza lead para entrega_confirmada
  await supabase
    .from("leads")
    .update({
      status: "entrega_confirmada",
      entrega_confirmada_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  // Cria cobrança
  const { data: cobranca, error } = await supabase
    .from("cobrancas")
    .insert({
      lead_id: leadId,
      profissional_id: lead.profissional_id,
      valor,
      status: "pendente",
    })
    .select("id")
    .single()

  if (error) {
    // Se erro de unique constraint, já existe cobrança
    if (error.code === "23505") return true
    console.error("[supabase] Erro ao criar cobrança:", error.message)
    return false
  }

  // Atualiza lead com cobrança_id e marca como cobrado
  await supabase
    .from("leads")
    .update({
      cobrado: true,
      cobranca_id: cobranca.id,
      status: "cobrado",
    })
    .eq("id", leadId)

  // Incrementa saldo devedor do profissional
  await supabase.rpc("incrementar_saldo_devedor", {
    p_profissional_id: lead.profissional_id,
    p_valor: valor,
  })

  // Registra log
  await registrarLog("lead", leadId, "cobranca_criada", { valor, cobranca_id: cobranca.id })

  console.log(`[cobranca] Lead ${leadId} cobrado: R$${valor}`)
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
