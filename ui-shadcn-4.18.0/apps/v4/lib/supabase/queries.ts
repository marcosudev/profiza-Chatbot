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

  // Busca dias de teste grátis configurados pelo administrador
  const { data: configData } = await supabase
    .from("configuracoes")
    .select("trial_days")
    .eq("id", "singleton")
    .single()

  const trialDays = configData?.trial_days ?? 30
  const expiraEm = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("profissionais")
    .insert({
      nome: input.nome,
      whatsapp: input.whatsapp,
      categoria: input.categoria,
      bairros: input.bairros,
      status: input.status,
      email: input.email ?? null,
      teste_gratis_expira_em: expiraEm,
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
  feedbackStatus?: FeedbackStatus | null
  feedbackAt?: string | null
}

export type FeedbackStatus =
  | "cliente_respondeu"
  | "orcamento_enviado"
  | "servico_fechado"
  | "sem_resposta"
  | "contato_invalido"

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
  feedback_status?: FeedbackStatus | null
  feedback_at?: string | null
}

function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    cliente: row.nome_cliente,
    telefone: ["[protegido]", "[removido]"].includes(row.whatsapp_cliente)
      ? "Contato protegido"
      : row.whatsapp_cliente,
    categoria: row.categoria,
    bairro: row.bairro,
    status: row.status,
    profissional: row.profissionais?.nome ?? null,
    data: row.created_at,
    feedbackStatus: row.feedback_status ?? null,
    feedbackAt: row.feedback_at ?? null,
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
  maxProfissionaisLead: number
  promptSistemaAi: string
  msgProfissionalEncontrado: string
  msgSemMatch: string
  msgPedirBairro: string
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
    trialDays: data?.trial_days ?? 30,
    subscriptionPrice: data?.subscription_price ?? 29.9,
    notifTesteVencendo: data?.notif_teste_vencendo ?? true,
    notifNovoLead: data?.notif_novo_lead ?? false,
    notifSemResposta: data?.notif_sem_resposta ?? true,
    maxProfissionaisLead: data?.max_profissionais_lead ?? 1,
    promptSistemaAi: data?.prompt_sistema_ai ?? "Você é um extrator de intenção amigável e direto para um serviço de indicação de profissionais em Bauru/SP.",
    msgProfissionalEncontrado: data?.msg_profissional_encontrado ?? "Ótima notícia! Encontrei um profissional para você 🎉\n\n👷 *{nome}*\n🔧 {categoria}\n📍 Atende: {bairros}\n📱 {whatsapp}\n\nEntre em contato diretamente pelo WhatsApp!",
    msgSemMatch: data?.msg_sem_match ?? "Ainda não temos um profissional de *{categoria}*{local} cadastrado. 😕\n\nVou registrar sua solicitação e assim que tivermos alguém disponível, te avisamos!",
    msgPedirBairro: data?.msg_pedir_bairro ?? "Entendi, você precisa de um *{categoria}*! 👍\n\nEm qual bairro de Bauru você precisa do serviço?",
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
      ...(input.maxProfissionaisLead !== undefined && { max_profissionais_lead: input.maxProfissionaisLead }),
      ...(input.promptSistemaAi !== undefined && { prompt_sistema_ai: input.promptSistemaAi }),
      ...(input.msgProfissionalEncontrado !== undefined && { msg_profissional_encontrado: input.msgProfissionalEncontrado }),
      ...(input.msgSemMatch !== undefined && { msg_sem_match: input.msgSemMatch }),
      ...(input.msgPedirBairro !== undefined && { msg_pedir_bairro: input.msgPedirBairro }),
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
  const now = new Date()

  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)

  const [{ data: vencendo }, { data: semResposta }, { data: novosLeads }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, teste_gratis_expira_em")
      .eq("status", "teste_gratis")
      .gte("teste_gratis_expira_em", now.toISOString())
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

export async function getDashboardSummary() {
  const supabase = await createClient()

  const inicioSemana = new Date()
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay())
  inicioSemana.setHours(0, 0, 0, 0)

  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const now = new Date()

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
      const expires = new Date(r.teste_gratis_expira_em)
      return expires >= now && expires <= sevenDaysFromNow
    }).length,
  }
}

// ============================================================
// Módulo Financeiro & Fluxo de Caixa (Profiza Finance)
// ============================================================

export type CategoriaDespesa =
  | "infraestrutura_software"
  | "marketing_vendas"
  | "impostos_taxas"
  | "operacional_pessoal"
  | "outros"

export interface Despesa {
  id: string
  descricao: string
  categoria: CategoriaDespesa
  valor: number
  dataVencimento: string
  dataPagamento: string | null
  status: "pendente" | "pago" | "cancelado"
  recorrente: "unica" | "mensal" | "anual"
  observacoes?: string
}

export interface Fatura {
  id: string
  profissionalId: string
  profissionalNome: string
  profissionalWhatsapp: string
  mesReferencia: string
  valorPlano: number
  status: "pendente" | "pago" | "atrasado" | "cancelado"
  vencimentoAt: string
  pagoEm: string | null
  pixCopiaCola?: string
}

export async function getDespesas(): Promise<Despesa[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("despesas")
    .select("*")
    .order("data_vencimento", { ascending: false })

  if (error || !data) return []
  return data.map((d) => ({
    id: d.id,
    descricao: d.descricao,
    categoria: d.categoria as CategoriaDespesa,
    valor: Number(d.valor),
    dataVencimento: d.data_vencimento,
    dataPagamento: d.data_pagamento,
    status: d.status,
    recorrente: d.recorrente,
    observacoes: d.observacoes,
  }))
}

export async function createDespesa(input: Omit<Despesa, "id">): Promise<Despesa> {
  const supabase = await createClient()
  const dataPagamento = input.status === "pago"
    ? (input.dataPagamento || input.dataVencimento || new Date().toISOString().split("T")[0])
    : null

  const { data, error } = await supabase
    .from("despesas")
    .insert({
      descricao: input.descricao,
      categoria: input.categoria,
      valor: input.valor,
      data_vencimento: input.dataVencimento,
      data_pagamento: dataPagamento,
      status: input.status,
      recorrente: input.recorrente,
      observacoes: input.observacoes || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[createDespesa] Supabase error:", error)
    throw new Error(error.message || "Erro ao inserir despesa no banco de dados.")
  }

  return {
    id: data.id,
    descricao: data.descricao,
    categoria: data.categoria as CategoriaDespesa,
    valor: Number(data.valor),
    dataVencimento: data.data_vencimento,
    dataPagamento: data.data_pagamento,
    status: data.status,
    recorrente: data.recorrente,
    observacoes: data.observacoes,
  }
}

export async function updateDespesaStatus(id: string, status: "pendente" | "pago" | "cancelado") {
  const supabase = await createClient()
  const { error } = await supabase
    .from("despesas")
    .update({
      status,
      ...(status === "pago" && { data_pagamento: new Date().toISOString().split("T")[0] }),
    })
    .eq("id", id)

  if (error) throw error
}

export async function updateDespesa(id: string, input: Partial<Omit<Despesa, "id">>): Promise<void> {
  const supabase = await createClient()
  const dataPagamento = input.status === "pago"
    ? (input.dataPagamento || input.dataVencimento || new Date().toISOString().split("T")[0])
    : (input.status === "pendente" ? null : undefined)

  const { error } = await supabase
    .from("despesas")
    .update({
      ...(input.descricao !== undefined && { descricao: input.descricao }),
      ...(input.categoria !== undefined && { categoria: input.categoria }),
      ...(input.valor !== undefined && { valor: input.valor }),
      ...(input.dataVencimento !== undefined && { data_vencimento: input.dataVencimento }),
      ...(dataPagamento !== undefined && { data_pagamento: dataPagamento }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.recorrente !== undefined && { recorrente: input.recorrente }),
      ...(input.observacoes !== undefined && { observacoes: input.observacoes }),
    })
    .eq("id", id)

  if (error) {
    console.error("[updateDespesa] Supabase error:", error)
    throw new Error(error.message || "Erro ao atualizar despesa.")
  }
}

export async function deleteDespesa(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("despesas")
    .delete()
    .eq("id", id)

  if (error) throw error
}

export async function getFaturas(): Promise<Fatura[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("faturas")
    .select("*, profissionais(nome, whatsapp)")
    .order("vencimento_at", { ascending: false })

  if (error || !data) return []
  return data.map((f) => {
    const prof = f.profissionais as { nome?: string; whatsapp?: string } | null
    return {
      id: f.id,
      profissionalId: f.profissional_id,
      profissionalNome: prof?.nome ?? "Profissional",
      profissionalWhatsapp: prof?.whatsapp ?? "",
      mesReferencia: f.mes_referencia,
      valorPlano: Number(f.valor_plano),
      status: f.status,
      vencimentoAt: f.vencimento_at,
      pagoEm: f.pago_em,
      pixCopiaCola: f.pix_copia_cola,
    }
  })
}

export async function updateFaturaStatus(id: string, status: "pendente" | "pago" | "atrasado" | "cancelado") {
  const supabase = await createClient()
  const { error } = await supabase
    .from("faturas")
    .update({
      status,
      ...(status === "pago" && { pago_em: new Date().toISOString() }),
    })
    .eq("id", id)

  if (error) throw error
}

export async function getFinancasSummary() {
  const [despesas, faturas, profs, config] = await Promise.all([
    getDespesas(),
    getFaturas(),
    createClient().then((s) => s.from("profissionais").select("id, status")),
    getConfiguracoes(),
  ])

  const profsList = profs.data ?? []
  const ativosCount = profsList.filter((p) => p.status === "ativo").length
  const valorPlano = config.subscriptionPrice

  // MRR Previsto = Profissionais Ativos * Valor do Plano
  const mrrPrevisto = ativosCount * valorPlano

  // Entradas Efetivas em Caixa = Faturas Pagas no mês ou assinaturas ativas
  const faturasPagas = faturas.filter((f) => f.status === "pago")
  const receitaEfetiva = faturasPagas.reduce((acc, f) => acc + f.valorPlano, 0) || mrrPrevisto

  // Despesas pagas ou totais do mês
  const despesasTotais = despesas
    .filter((d) => d.status !== "cancelado")
    .reduce((acc, d) => acc + d.valor, 0)

  // Lucro Líquido = Receita Efetiva - Despesas Totais
  const lucroLiquido = receitaEfetiva - despesasTotais
  const margemLucro = receitaEfetiva > 0 ? Math.round((lucroLiquido / receitaEfetiva) * 100) : 0

  return {
    mrrPrevisto,
    receitaEfetiva,
    despesasTotais,
    lucroLiquido,
    margemLucro,
    ativosCount,
    valorPlano,
  }
}
