import { createClient } from "@/lib/supabase/server"
import type { Professional, PaymentStatus } from "@/lib/profiza-data"

// Tipo que vem do banco (snake_case)
interface ProfissionalRow {
  id: string
  nome: string
  whatsapp: string
  categoria: string
  bairros: string[]
  status: PaymentStatus
  email: string | null
  teste_gratis_expira_em: string | null
  leads_semana: number
  ultima_atividade: string | null
}

function rowToProfessional(row: ProfissionalRow): Professional {
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    categoria: row.categoria,
    bairros: row.bairros,
    status: row.status,
    email: row.email ?? undefined,
    testeGratisExpiraEm: row.teste_gratis_expira_em ?? new Date().toISOString(),
    leadsSemana: row.leads_semana,
    ultimaAtividade: row.ultima_atividade ?? new Date().toISOString(),
  }
}

export async function getProfissionais(): Promise<Professional[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profissionais")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as ProfissionalRow[]).map(rowToProfessional)
}

export async function getProfissional(id: string): Promise<Professional | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profissionais")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return null
  return rowToProfessional(data as ProfissionalRow)
}

export async function createProfissional(
  input: Omit<Professional, "id" | "leadsSemana" | "ultimaAtividade">
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profissionais")
    .insert({
      nome: input.nome,
      whatsapp: input.whatsapp,
      categoria: input.categoria,
      bairros: input.bairros,
      status: input.status,
      email: input.email ?? null,
      teste_gratis_expira_em: input.testeGratisExpiraEm,
    })
    .select()
    .single()

  if (error) throw error
  return rowToProfessional(data as ProfissionalRow)
}

export async function updateProfissional(
  id: string,
  input: Partial<Omit<Professional, "id">>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profissionais")
    .update({
      ...(input.nome && { nome: input.nome }),
      ...(input.whatsapp && { whatsapp: input.whatsapp }),
      ...(input.categoria && { categoria: input.categoria }),
      ...(input.bairros && { bairros: input.bairros }),
      ...(input.status && { status: input.status }),
      ...(input.email !== undefined && { email: input.email ?? null }),
      ...(input.testeGratisExpiraEm && {
        teste_gratis_expira_em: input.testeGratisExpiraEm,
      }),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return rowToProfessional(data as ProfissionalRow)
}

export async function updateStatus(id: string, status: PaymentStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profissionais")
    .update({ status })
    .eq("id", id)

  if (error) throw error
}

export async function deleteProfissional(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profissionais")
    .delete()
    .eq("id", id)

  if (error) throw error
}

export async function clearAllData() {
  const supabase = await createClient()
  await supabase.from("cobrancas").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await supabase.from("leads_eventos").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await supabase.from("logs_eventos").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await supabase.from("metricas_bot").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await supabase.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await supabase.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await supabase.from("profissionais").delete().neq("id", "00000000-0000-0000-0000-000000000000")
}

// ============================================================
// Leads
// ============================================================

export type LeadStatus = "novo" | "enviado" | "sem_resposta" | "convertido"

export interface Lead {
  id: string
  cliente: string
  telefone: string
  categoria: string
  bairro: string
  profissional: string | null
  status: LeadStatus
  data: string
  mensagem?: string
}

interface LeadRow {
  id: string
  nome_cliente: string
  whatsapp_cliente: string
  categoria: string
  bairro: string
  status: LeadStatus
  profissional_id: string | null
  created_at: string
  profissionais?: { nome: string } | null
}

function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    cliente: row.nome_cliente,
    telefone: row.whatsapp_cliente,
    categoria: row.categoria,
    bairro: row.bairro,
    status: row.status,
    profissional: row.profissionais?.nome ?? null,
    data: row.created_at,
  }
}

export async function getLeads(): Promise<Lead[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .select("*, profissionais(nome)")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as LeadRow[]).map(rowToLead)
}

export interface MetricasBot {
  leadsEnviados: number
  dataUltimoLead: string | null
}

export async function getMetricasProfissional(profissionalId: string): Promise<MetricasBot> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("metricas_bot")
    .select("leads_enviados, data_ultimo_lead")
    .eq("profissional_id", profissionalId)
    .single()

  return {
    leadsEnviados: data?.leads_enviados ?? 0,
    dataUltimoLead: data?.data_ultimo_lead ?? null,
  }
}

// Retorna um map profissional_id → leads_enviados para uso em listagens
export async function getMetricasMap(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("metricas_bot")
    .select("profissional_id, leads_enviados")

  if (!data) return {}
  return Object.fromEntries(data.map((r) => [r.profissional_id, r.leads_enviados]))
}
export async function getLeadsByProfissional(profissionalId: string): Promise<Lead[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("profissional_id", profissionalId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return []
  return (data as LeadRow[]).map(rowToLead)
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)

  if (error) throw error
}

// ============================================================
// Dashboard
// ============================================================

// ============================================================
// Configurações
// ============================================================

export interface Configuracoes {
  cidade: string
  trialDays: number
  subscriptionPrice: number
  notifTesteVencendo: boolean
  notifNovoLead: boolean
  notifSemResposta: boolean
}

export async function getConfiguracoes(): Promise<Configuracoes> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("configuracoes")
    .select("*")
    .eq("id", "singleton")
    .single()

  return {
    cidade: data?.cidade ?? "Bauru - SP",
    trialDays: data?.trial_days ?? 14,
    subscriptionPrice: data?.subscription_price ?? 49.9,
    notifTesteVencendo: data?.notif_teste_vencendo ?? true,
    notifNovoLead: data?.notif_novo_lead ?? false,
    notifSemResposta: data?.notif_sem_resposta ?? true,
  }
}

export async function updateConfiguracoes(input: Partial<Configuracoes>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("configuracoes")
    .update({
      ...(input.cidade !== undefined && { cidade: input.cidade }),
      ...(input.trialDays !== undefined && { trial_days: input.trialDays }),
      ...(input.subscriptionPrice !== undefined && { subscription_price: input.subscriptionPrice }),
      ...(input.notifTesteVencendo !== undefined && { notif_teste_vencendo: input.notifTesteVencendo }),
      ...(input.notifNovoLead !== undefined && { notif_novo_lead: input.notifNovoLead }),
      ...(input.notifSemResposta !== undefined && { notif_sem_resposta: input.notifSemResposta }),
    })
    .eq("id", "singleton")

  if (error) throw error
}

// ============================================================
// Notificações calculadas
// ============================================================

export type NotificacaoTipo = "teste_vencendo" | "novo_lead" | "sem_resposta"

export interface NotificacaoCalculada {
  id: string
  type: NotificacaoTipo
  title: string
  description: string
  createdAt: string
}

export async function getNotificacoes(): Promise<NotificacaoCalculada[]> {
  const supabase = await createClient()

  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)

  const [{ data: vencendo }, { data: semResposta }, { data: novosLeads }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, teste_gratis_expira_em")
      .eq("status", "teste_gratis")
      .lte("teste_gratis_expira_em", sevenDaysFromNow.toISOString())
      .order("teste_gratis_expira_em", { ascending: true })
      .limit(5),
    supabase
      .from("leads")
      .select("id, nome_cliente, categoria, bairro, created_at")
      .eq("status", "sem_resposta")
      .gte("created_at", ontem.toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("leads")
      .select("id, nome_cliente, categoria, profissionais(nome), created_at")
      .eq("status", "enviado")
      .gte("created_at", ontem.toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const notifs: NotificacaoCalculada[] = []

  for (const p of vencendo ?? []) {
    const dias = Math.ceil(
      (new Date(p.teste_gratis_expira_em).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    notifs.push({
      id: `tv-${p.id}`,
      type: "teste_vencendo",
      title: "Teste vencendo",
      description: `${p.nome} vence em ${dias} dia${dias !== 1 ? "s" : ""}`,
      createdAt: p.teste_gratis_expira_em,
    })
  }

  for (const l of semResposta ?? []) {
    notifs.push({
      id: `sr-${l.id}`,
      type: "sem_resposta",
      title: "Lead sem resposta",
      description: `${l.nome_cliente} · ${l.categoria} em ${l.bairro}`,
      createdAt: l.created_at,
    })
  }

  for (const l of novosLeads ?? []) {
    const prof = (l as unknown as { profissionais?: { nome: string } | null }).profissionais
    notifs.push({
      id: `nl-${l.id}`,
      type: "novo_lead",
      title: "Novo lead roteado",
      description: `${l.nome_cliente} → ${prof?.nome ?? "sem profissional"}`,
      createdAt: l.created_at,
    })
  }

  return notifs
}

// ============================================================
// Métricas de retenção para sidebar
// ============================================================

export async function getRetencaoLeads(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("leads")
    .select("status")

  if (!data || data.length === 0) return 0
  const convertidos = data.filter((l) => l.status === "convertido").length
  return Math.round((convertidos / data.length) * 100)
}

export async function getDashboardSummary() {
  const supabase = await createClient()

  const inicioSemana = new Date()
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay())
  inicioSemana.setHours(0, 0, 0, 0)

  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const [{ data: profs, error }, { count: leadsSemana }] = await Promise.all([
    supabase.from("profissionais").select("status, teste_gratis_expira_em"),
    supabase
      .from("leads_eventos")
      .select("*", { count: "exact", head: true })
      .gte("created_at", inicioSemana.toISOString()),
  ])

  const list = profs ?? []

  return {
    ativos: list.filter((r) => r.status === "ativo").length,
    testeGratis: list.filter((r) => r.status === "teste_gratis").length,
    leadsSemana: leadsSemana ?? 0,
    vencendoSeteDias: list.filter((r) => {
      if (r.status !== "teste_gratis" || !r.teste_gratis_expira_em) return false
      return new Date(r.teste_gratis_expira_em) <= sevenDaysFromNow
    }).length,
  }
}
