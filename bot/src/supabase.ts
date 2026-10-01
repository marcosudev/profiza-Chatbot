import { createClient } from "@supabase/supabase-js"
import { config } from "./config"
import { hashContato, hashContatoLegado } from "./privacidade"

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

export interface Profissional {
  id: string
  nome: string
  whatsapp: string
  categoria: string
  bairros: string[]
  regiao: string | null
  status: string
  leadId?: string
  linkContato?: string
}

export interface ResultadoBuscaProfissionais {
  status: "encontrado" | "sem_match" | "indisponivel"
  profissionais: Profissional[]
  prioridadeMatch: 1 | 2 | 3 | null
}

function resultadoBusca(
  profissionais: Profissional[],
  prioridadeMatch: 1 | 2 | 3 | null = null
): ResultadoBuscaProfissionais {
  return {
    status: profissionais.length > 0 ? "encontrado" : "sem_match",
    profissionais,
    prioridadeMatch: profissionais.length > 0 ? prioridadeMatch : null,
  }
}

function buscaIndisponivel(erro: unknown): ResultadoBuscaProfissionais {
  console.error("[supabase] Falha ao buscar profissionais:", erro)
  return { status: "indisponivel", profissionais: [], prioridadeMatch: null }
}

// ─── Busca de profissionais ───────────────────────────────────────────────────

// Prioridade 1: mesmo bairro
// Prioridade 2: mesma região
// Prioridade 3: atende cidade toda (fallback)
// Dentro de cada prioridade: rodízio por ultimo_lead_em ASC (nulls primeiro)

export async function buscarProfissionais(
  categoria: string,
  bairro: string,
  ignoreIds: string[] = [],
  limit: number = 4
): Promise<ResultadoBuscaProfissionais> {
  // Resolve bairro_id e regiao_id
  const { data: bairroData, error: bairroError } = await supabase
    .from("bairros")
    .select("id, regiao_id, regioes(nome)")
    .ilike("nome", bairro)
    .maybeSingle()

  if (bairroError) return buscaIndisponivel(bairroError.message)
  if (!bairroData) return resultadoBusca([])

  const bairroId = bairroData.id
  const regiaoId = bairroData.regiao_id

  // Busca por bairro exato (prioridade 1)
  const bairroResult = await _buscarPorBairroId(categoria, bairroId, ignoreIds, limit)
  if (bairroResult.status !== "sem_match") return bairroResult

  // Busca por região (prioridade 2)
  if (regiaoId) {
    const regiaoResult = await _buscarPorRegiaoId(categoria, regiaoId, bairroId, ignoreIds, limit)
    if (regiaoResult.status !== "sem_match") return regiaoResult
  }

  return resultadoBusca([])
}

// Fallback: profissionais que atendem a cidade toda
export async function buscarProfissionaisFallback(
  categoria: string,
  ignoreIds: string[] = [],
  limit: number = 4
): Promise<ResultadoBuscaProfissionais> {
  let query = supabase
    .from("profissionais")
    .select("id, nome, whatsapp, categoria, ultimo_lead_em, atende_cidade_toda")
    .ilike("categoria", categoria)
    .in("assinatura_status", ["trial", "ativa"])
    .gte("nivel_verificacao", 1)
    .eq("ativo", true)
    .eq("atende_cidade_toda", true)
    .order("ultimo_lead_em", { ascending: true, nullsFirst: true })
    .limit(limit)

  if (ignoreIds.length > 0) {
    query = query.not("id", "in", `(${ignoreIds.join(",")})`)
  }

  const { data, error } = await query
  if (error) return buscaIndisponivel(error.message)
  if (!data) return resultadoBusca([])

  return resultadoBusca(data.map((d: any) => ({
    id: d.id,
    nome: d.nome,
    whatsapp: d.whatsapp,
    categoria: d.categoria,
    bairros: ["Bauru e região"],
    regiao: null,
    status: d.assinatura_status,
  })), 3)
}

async function _buscarPorBairroId(
  categoria: string,
  bairroId: number,
  ignoreIds: string[],
  limit: number
): Promise<ResultadoBuscaProfissionais> {
  let query = supabase
    .from("profissional_bairros")
    .select(`
      profissional_id,
      profissionais!inner(
        id, nome, whatsapp, categoria, ativo, nivel_verificacao,
        assinatura_status, ultimo_lead_em, atende_cidade_toda
      )
    `)
    .eq("bairro_id", bairroId)
    .eq("profissionais.ativo", true)
    .gte("profissionais.nivel_verificacao", 1)
    .in("profissionais.assinatura_status", ["trial", "ativa"])
    .ilike("profissionais.categoria", categoria)

  if (ignoreIds.length > 0) {
    query = query.not("profissional_id", "in", `(${ignoreIds.join(",")})`)
  }

  const { data, error } = await query
  if (error) return buscaIndisponivel(error.message)
  if (!data) return resultadoBusca([])

  return resultadoBusca(_ordenarEMapear(data, limit, bairroId), 1)
}

async function _buscarPorRegiaoId(
  categoria: string,
  regiaoId: number,
  excluirBairroId: number | null,
  ignoreIds: string[],
  limit: number
): Promise<ResultadoBuscaProfissionais> {
  // Pega todos os bairros da região
  const { data: bairrosRegiao, error: bairrosError } = await supabase
    .from("bairros")
    .select("id")
    .eq("regiao_id", regiaoId)

  if (bairrosError) return buscaIndisponivel(bairrosError.message)
  if (!bairrosRegiao || bairrosRegiao.length === 0) return resultadoBusca([])

  const bairroIds = bairrosRegiao
    .map((b: any) => b.id)
    .filter((id: number) => id !== excluirBairroId)

  if (bairroIds.length === 0) return resultadoBusca([])

  let query = supabase
    .from("profissional_bairros")
    .select(`
      profissional_id, bairro_id,
      profissionais!inner(
        id, nome, whatsapp, categoria, ativo, nivel_verificacao,
        assinatura_status, ultimo_lead_em
      )
    `)
    .in("bairro_id", bairroIds)
    .eq("profissionais.ativo", true)
    .gte("profissionais.nivel_verificacao", 1)
    .in("profissionais.assinatura_status", ["trial", "ativa"])
    .ilike("profissionais.categoria", categoria)

  if (ignoreIds.length > 0) {
    query = query.not("profissional_id", "in", `(${ignoreIds.join(",")})`)
  }

  const { data, error } = await query
  if (error) return buscaIndisponivel(error.message)
  if (!data) return resultadoBusca([])

  return resultadoBusca(_ordenarEMapear(data, limit, null), 2)
}

function _ordenarEMapear(data: any[], limit: number, bairroIdPrincipal: number | null): Profissional[] {
  // Deduplica por profissional_id
  const seen = new Set<string>()
  const unique = data.filter((row: any) => {
    const id = row.profissional_id ?? row.profissionais?.id
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  // Rodízio: ordena por ultimo_lead_em ASC (nulls primeiro)
  unique.sort((a: any, b: any) => {
    const tA = a.profissionais?.ultimo_lead_em ? new Date(a.profissionais.ultimo_lead_em).getTime() : 0
    const tB = b.profissionais?.ultimo_lead_em ? new Date(b.profissionais.ultimo_lead_em).getTime() : 0
    return tA - tB
  })

  return unique.slice(0, limit).map((row: any) => {
    const p = row.profissionais
    return {
      id: p.id,
      nome: p.nome,
      whatsapp: p.whatsapp,
      categoria: p.categoria,
      bairros: [],   // preenchido abaixo se necessário
      regiao: null,
      status: p.assinatura_status,
    }
  })
}

// Carrega os bairros de um profissional para exibição na mensagem
export async function carregarBairrosDoProfissional(profissionalId: string): Promise<string[]> {
  const { data } = await supabase
    .from("profissional_bairros")
    .select("bairros(nome)")
    .eq("profissional_id", profissionalId)

  if (!data) return []
  return data.map((row: any) => row.bairros?.nome).filter(Boolean)
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface SalvarLeadInput {
  nomeCliente: string
  whatsappCliente: string
  categoria: string
  bairro: string
  profissionalId: string | null
  status: "enviado" | "sem_resposta" | "novo"
  mensagemOriginal: string
  prioridadeMatch?: 1 | 2 | 3
}

export async function salvarLead(input: SalvarLeadInput): Promise<string | null> {
  const payload: Record<string, any> = {
    nome_cliente: input.nomeCliente,
    whatsapp_cliente: "[protegido]",
    contato_hash: hashContato(input.whatsappCliente),
    categoria: input.categoria,
    bairro: input.bairro,
    profissional_id: input.profissionalId,
    status: input.status,
  }
  if (input.prioridadeMatch !== undefined) {
    payload.prioridade_match = input.prioridadeMatch
  }

  let { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("id")
    .single()

  if (error && error.message.includes("prioridade_match")) {
    delete payload.prioridade_match
    const retry = await supabase
      .from("leads")
      .insert(payload)
      .select("id")
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) {
    console.error("[supabase] Erro ao salvar lead:", error.message)
    return null
  }

  if (input.profissionalId) {
    await supabase.from("leads_eventos").insert({
      profissional_id: input.profissionalId,
      origem: "whatsapp",
    })
    // Atualiza ultimo_lead_em no profissional
    await supabase
      .from("profissionais")
      .update({ ultimo_lead_em: new Date().toISOString() })
      .eq("id", input.profissionalId)
  }

  return data?.id ?? null
}

export async function atualizarLeadMensagemId(leadId: string, mensagemId: string): Promise<void> {
  await supabase
    .from("leads")
    .update({ mensagem_id: mensagemId, status: "contato_enviado" })
    .eq("id", leadId)
}

export async function buscarLeadPorMensagemId(mensagemId: string) {
  const { data } = await supabase
    .from("leads")
    .select("id, profissional_id, status, cobrado, valor")
    .eq("mensagem_id", mensagemId)
    .single()
  return data
}

export async function atualizarStatusEntrega(leadId: string, statusEntrega: string): Promise<void> {
  await supabase
    .from("leads")
    .update({ status_entrega: statusEntrega })
    .eq("id", leadId)
}

export async function confirmarEntregaECobrar(leadId: string): Promise<boolean> {
  const { data: lead } = await supabase
    .from("leads")
    .select("id, status")
    .eq("id", leadId)
    .single()

  if (!lead) return false
  if (["entrega_confirmada", "falhou", "cancelado"].includes(lead.status)) return false

  await supabase
    .from("leads")
    .update({ status: "entrega_confirmada", entrega_confirmada_at: new Date().toISOString() })
    .eq("id", leadId)

  return true
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export type FeedbackStatus =
  | "cliente_respondeu"
  | "orcamento_enviado"
  | "servico_fechado"
  | "sem_resposta"
  | "contato_invalido"

const feedbackLabels: Record<FeedbackStatus, string> = {
  cliente_respondeu: "Cliente respondeu",
  orcamento_enviado: "Orçamento enviado",
  servico_fechado: "Serviço fechado",
  sem_resposta: "Cliente não respondeu",
  contato_invalido: "Contato inválido",
}

export function interpretarFeedback(texto: string): FeedbackStatus | null {
  const porNumero: Record<string, FeedbackStatus> = {
    "1": "cliente_respondeu",
    "2": "orcamento_enviado",
    "3": "servico_fechado",
    "4": "sem_resposta",
    "5": "contato_invalido",
  }
  return porNumero[texto.trim()] ?? null
}

export function rotuloFeedback(status: FeedbackStatus): string {
  return feedbackLabels[status]
}

export async function buscarProfissionalPorWhatsApp(whatsapp: string) {
  const numero = whatsapp.replace(/\D/g, "")
  const { data } = await supabase
    .from("profissionais")
    .select("id, nome")
    .in("whatsapp", [whatsapp, numero, `+${numero}`])
    .in("assinatura_status", ["trial", "ativa"])
    .maybeSingle()
  return data
}

export async function buscarLeadPendenteFeedback(profissionalId: string) {
  const limite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from("leads")
    .select("id, categoria, bairro")
    .eq("profissional_id", profissionalId)
    .is("feedback_status", null)
    .in("status", ["enviado", "contato_enviado", "entrega_confirmada"])
    .gte("created_at", limite)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function registrarFeedbackLead(leadId: string, status: FeedbackStatus): Promise<boolean> {
  const { error } = await supabase
    .from("leads")
    .update({ feedback_status: status, feedback_at: new Date().toISOString() })
    .eq("id", leadId)
    .is("feedback_status", null)
  return !error
}

// ─── Relatórios semanais ──────────────────────────────────────────────────────

interface RelatorioProfissional {
  id: string
  nome: string
  whatsapp: string
  total: number
  clientesResponderam: number
  orcamentos: number
  servicosFechados: number
  bairros: string[]
}

export async function buscarRelatoriosSemanais(inicio: string, fim: string): Promise<RelatorioProfissional[]> {
  const [{ data: profissionais }, { data: leads }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome, whatsapp")
      .in("assinatura_status", ["trial", "ativa"]),
    supabase
      .from("leads")
      .select("profissional_id, bairro, feedback_status")
      .not("profissional_id", "is", null)
      .gte("created_at", inicio)
      .lt("created_at", fim),
  ])

  if (!profissionais || !leads) return []

  return profissionais.flatMap((p) => {
    const leadsP = leads.filter((l) => l.profissional_id === p.id)
    if (leadsP.length === 0) return []
    return [{
      ...p,
      total: leadsP.length,
      clientesResponderam: leadsP.filter((l) =>
        ["cliente_respondeu", "orcamento_enviado", "servico_fechado"].includes(l.feedback_status)
      ).length,
      orcamentos: leadsP.filter((l) =>
        ["orcamento_enviado", "servico_fechado"].includes(l.feedback_status)
      ).length,
      servicosFechados: leadsP.filter((l) => l.feedback_status === "servico_fechado").length,
      bairros: Array.from(new Set(leadsP.map((l) => l.bairro).filter(Boolean))),
    }]
  })
}

export async function reservarRelatorioSemanal(profissionalId: string, semanaInicio: string): Promise<boolean> {
  const { error } = await supabase
    .from("relatorios_semanais_profissionais")
    .insert({ profissional_id: profissionalId, semana_inicio: semanaInicio })
  return !error
}

// ─── Handoff / sessão humano ──────────────────────────────────────────────────

export async function marcarSessaoHumanoAtivo(telefone: string, ativo: boolean): Promise<void> {
  const hash = hashContato(telefone)
  const hashLegado = hashContatoLegado(telefone)
  let hashSessao = hash
  let { data } = await supabase
    .from("sessoes")
    .select("estado")
    .eq("contato_hash", hash)
    .single()

  if (!data) {
    hashSessao = hashLegado
    const resultado = await supabase
      .from("sessoes")
      .select("estado")
      .eq("contato_hash", hashLegado)
      .single()
    data = resultado.data
  }

  if (!data) return

  const estado = { ...(data.estado as any), humano_ativo: ativo }
  await supabase
    .from("sessoes")
    .update({ estado, atualizado_em: new Date().toISOString() })
    .eq("contato_hash", hashSessao)
}

export async function sessaoHumanoAtivo(telefone: string): Promise<boolean> {
  const hash = hashContato(telefone)
  const hashLegado = hashContatoLegado(telefone)
  let { data } = await supabase
    .from("sessoes")
    .select("estado")
    .eq("contato_hash", hash)
    .single()

  if (!data) {
    const resultado = await supabase
      .from("sessoes")
      .select("estado")
      .eq("contato_hash", hashLegado)
      .single()
    data = resultado.data
  }

  return (data?.estado as any)?.humano_ativo === true
}

// ─── Assinatura / trial ───────────────────────────────────────────────────────

export interface ProfissionalTrialAviso {
  id: string
  nome: string
  whatsapp: string
  trial_ate: string
  diasRestantes: number
}

export async function buscarProfissionaisParaAviso(diasRestantes: number): Promise<ProfissionalTrialAviso[]> {
  const alvo = new Date()
  alvo.setDate(alvo.getDate() + diasRestantes)
  const dataAlvo = alvo.toISOString().split("T")[0]

  const { data } = await supabase
    .from("profissionais")
    .select("id, nome, whatsapp, trial_ate")
    .eq("assinatura_status", "trial")
    .eq("trial_ate", dataAlvo)

  if (!data) return []
  return data.map((p: any) => ({ ...p, diasRestantes }))
}

export async function buscarProfissionaisVencidos(): Promise<{ id: string; nome: string; whatsapp: string }[]> {
  const hoje = new Date().toISOString().split("T")[0]
  const { data } = await supabase
    .from("profissionais")
    .select("id, nome, whatsapp")
    .eq("assinatura_status", "ativa")
    .lt("assinatura_ate", hoje)

  return data ?? []
}

export async function atualizarStatusAssinatura(profissionalId: string, status: string): Promise<void> {
  await supabase
    .from("profissionais")
    .update({ assinatura_status: status })
    .eq("id", profissionalId)
}

export async function buscarProfissionalPorMpId(mpPreapprovalId: string) {
  const { data } = await supabase
    .from("profissionais")
    .select("id, nome, whatsapp, assinatura_status")
    .eq("mp_preapproval_id", mpPreapprovalId)
    .maybeSingle()
  return data
}

export async function atualizarMpPreapprovalId(profissionalId: string, mpId: string): Promise<void> {
  await supabase
    .from("profissionais")
    .update({ mp_preapproval_id: mpId })
    .eq("id", profissionalId)
}

// ─── Ocorrências ──────────────────────────────────────────────────────────────

export async function registrarOcorrencia(
  profissionalId: string | null,
  leadId: string | null,
  relato: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ocorrencias")
    .insert({ profissional_id: profissionalId, lead_id: leadId, relato })
    .select("id")
    .single()

  if (error) return null
  return data.id
}

// ─── Interesse em cidades ─────────────────────────────────────────────────────

export async function registrarInteresseCidade(telefone: string, cidadeTexto: string): Promise<void> {
  const hash = hashContato(telefone)
  await supabase.from("interesse_cidades").insert({ contato_hash: hash, cidade_texto: cidadeTexto })
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function registrarLog(
  entidade: string,
  entidadeId: string,
  evento: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  await supabase.from("logs_eventos").insert({ entidade, entidade_id: entidadeId, evento, payload })
}

// ─── Métricas (observabilidade RNF-05) ───────────────────────────────────────

// ─── Métricas para resumo diário ────────────────────────────────────────────

export interface ResumoDiario {
  conversas: number
  leads: number
  handoffs: number
  erros: number
  assinaturasVencendo: string[]
}

export async function buscarResumoDiario(): Promise<ResumoDiario> {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const inicioISO = inicio.toISOString()

  const [{ count: leads }, { count: conversas }, assinaturasVencendo] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", inicioISO),
    supabase
      .from("sessoes")
      .select("*", { count: "exact", head: true })
      .gte("atualizado_em", inicioISO),
    buscarProfissionaisParaAviso(7),
  ])

  return {
    conversas: conversas ?? 0,
    leads: leads ?? 0,
    handoffs: 0,
    erros: 0,
    assinaturasVencendo: assinaturasVencendo.map(p => p.nome),
  }
}

export async function apagarDadosContato(telefone: string): Promise<void> {
  const hash = hashContato(telefone)
  const hashLegado = hashContatoLegado(telefone)
  const resultados = await Promise.all([
    supabase.from("sessoes").delete().in("contato_hash", [hash, hashLegado]),
    supabase.from("interesse_cidades").delete().in("contato_hash", [hash, hashLegado]),
    Promise.resolve(supabase.from("metricas_bot").delete().in("contato_hash", [hash, hashLegado])).catch(() => ({ error: null })),
    supabase.from("leads").update({ nome_cliente: "[removido]", whatsapp_cliente: "[removido]" }).eq("contato_hash", hash),
    supabase.from("leads").update({ nome_cliente: "[removido]", whatsapp_cliente: "[removido]" }).eq("whatsapp_cliente", telefone),
  ])
  const falha = resultados.find((resultado: any) => resultado && resultado.error && !resultado.error?.message?.includes("contato_hash"))
  if (falha?.error) throw new Error(`Falha ao apagar dados do contato: ${falha.error.message}`)
}

export async function registrarMetricaMensagem(dados: {
  contatoHash: string
  categoria: string | null
  bairro: string | null
  confianca: number
  tempoTotalMs: number
  resultado: "match_bairro" | "match_regiao" | "fallback_cidade" | "sem_match" | "erro"
  custoTokensEstimado?: number
}): Promise<void> {
  try {
    await supabase.from("metricas_bot").upsert({
      contato_hash: dados.contatoHash,
      categoria: dados.categoria,
      bairro: dados.bairro,
      confianca: dados.confianca,
      tempo_total_ms: dados.tempoTotalMs,
      resultado: dados.resultado,
      custo_tokens_estimado: dados.custoTokensEstimado ?? null,
      criado_em: new Date().toISOString(),
    })
  } catch (err) {
    console.warn("[supabase] Erro não crítico ao registrar métrica:", err)
  }
}

// ─── Gerenciamento de Profissionais Mockups (Testes) ──────────────────────────

export const MOCK_PROFISSIONAIS = [
  {
    nome: "Carlos Andrade (Encanador)",
    categoria: "Encanador",
    whatsapp: "5514991234567",
    ativo: true,
    nivel_verificacao: 2,
    assinatura_status: "ativa",
    atende_cidade_toda: true,
  },
  {
    nome: "Marcos Obras (Pedreiro)",
    categoria: "Pedreiro",
    whatsapp: "5514997654321",
    ativo: true,
    nivel_verificacao: 2,
    assinatura_status: "ativa",
    atende_cidade_toda: true,
  },
  {
    nome: "Roberto Tintas (Pintor)",
    categoria: "Pintor",
    whatsapp: "5514998881122",
    ativo: true,
    nivel_verificacao: 2,
    assinatura_status: "ativa",
    atende_cidade_toda: true,
  },
  {
    nome: "Lucas Elétrica (Eletricista)",
    categoria: "Eletricista",
    whatsapp: "5514995554433",
    ativo: true,
    nivel_verificacao: 2,
    assinatura_status: "ativa",
    atende_cidade_toda: true,
  },
  {
    nome: "Juliana Clima (Ar-condicionado)",
    categoria: "Ar-condicionado",
    whatsapp: "5514994443322",
    ativo: true,
    nivel_verificacao: 2,
    assinatura_status: "ativa",
    atende_cidade_toda: true,
  },
  {
    nome: "Fernanda Verde (Jardinagem)",
    categoria: "Jardinagem",
    whatsapp: "5514993332211",
    ativo: true,
    nivel_verificacao: 2,
    assinatura_status: "ativa",
    atende_cidade_toda: true,
  },
  {
    nome: "Rodrigo Tech (Informática)",
    categoria: "Informática",
    whatsapp: "5514992221100",
    ativo: true,
    nivel_verificacao: 2,
    assinatura_status: "ativa",
    atende_cidade_toda: true,
  },
]

export async function cadastrarProfissionaisMockups(): Promise<string[]> {
  const { data: bairros } = await supabase.from("bairros").select("id, nome")
  const cadastrados: string[] = []

  for (const p of MOCK_PROFISSIONAIS) {
    const { data: existente } = await supabase
      .from("profissionais")
      .select("id, nome")
      .eq("whatsapp", p.whatsapp)
      .maybeSingle()

    let prof = existente
    if (existente) {
      const { error } = await supabase.from("profissionais").update(p).eq("id", existente.id)
      if (error) console.error(`[seed] Erro ao atualizar ${p.nome}:`, error.message)
    } else {
      const { data: novo, error } = await supabase.from("profissionais").insert(p).select("id, nome").single()
      if (error) console.error(`[seed] Erro ao inserir ${p.nome}:`, error.message)
      prof = novo
    }

    if (!prof) continue

    cadastrados.push(prof.nome)

    if (bairros && bairros.length > 0) {
      const vinculos = bairros.map((b: any) => ({
        profissional_id: prof.id,
        bairro_id: b.id,
      }))
      await Promise.resolve(supabase.from("profissional_bairros").upsert(vinculos, { onConflict: "profissional_id,bairro_id" })).catch(() => null)
    }
  }

  return cadastrados
}

export async function removerProfissionaisMockups(): Promise<void> {
  const whatsapps = MOCK_PROFISSIONAIS.map(p => p.whatsapp)
  await supabase.from("profissionais").delete().in("whatsapp", whatsapps)
}

export interface InfoRedirecionamentoLead {
  leadId: string
  profissionalWhatsapp: string
  categoria: string
  bairro: string
}

export async function buscarLeadParaRedirecionamento(leadId: string): Promise<InfoRedirecionamentoLead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select(`
      id, categoria, bairro,
      profissionais(whatsapp)
    `)
    .eq("id", leadId)
    .maybeSingle()

  if (error || !data) return null

  const prof = data.profissionais as any
  const whatsapp = prof?.whatsapp ?? null
  if (!whatsapp) return null

  return {
    leadId: data.id,
    profissionalWhatsapp: whatsapp,
    categoria: data.categoria,
    bairro: data.bairro ?? "Bauru",
  }
}

export async function registrarCliqueContato(leadId: string): Promise<void> {
  await Promise.all([
    supabase.from("cliques_contato").insert({ lead_id: leadId }),
    supabase.from("leads").update({ status: "contato_enviado" }).eq("id", leadId),
  ])
}

// ─── Feedback do Cliente (48h Pós-Lead) ──────────────────────────────────────

export interface LeadFeedbackCliente {
  leadId: string
  contatoHash: string
  whatsappCliente: string
  categoria: string
  nomeProfissional: string
}

export async function buscarLeadsParaFeedbackCliente(): Promise<LeadFeedbackCliente[]> {
  const quarentaEOitoHorasAtras = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const setentaEDuasHorasAtras = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("leads")
    .select(`
      id, contato_hash, whatsapp_cliente, categoria,
      profissionais(nome)
    `)
    .not("profissional_id", "is", null)
    .is("cliente_feedback", null)
    .gte("created_at", setentaEDuasHorasAtras)
    .lte("created_at", quarentaEOitoHorasAtras)

  if (error || !data) return []

  return data.map((d: any) => ({
    leadId: d.id,
    contatoHash: d.contato_hash,
    whatsappCliente: d.whatsapp_cliente,
    categoria: d.categoria,
    nomeProfissional: d.profissionais?.nome ?? "o profissional indicado",
  }))
}

export async function registrarFeedbackCliente(
  telefone: string,
  satisfeito: boolean
): Promise<{ registrado: boolean; leadId?: string; profissionalId?: string }> {
  const hash = hashContato(telefone)

  const { data: lead } = await supabase
    .from("leads")
    .select("id, profissional_id")
    .or(`contato_hash.eq.${hash},whatsapp_cliente.eq.${telefone}`)
    .not("profissional_id", "is", null)
    .is("cliente_feedback", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lead) return { registrado: false }

  const feedbackStatus = satisfeito ? "positivo" : "negativo"
  await supabase
    .from("leads")
    .update({
      cliente_feedback: feedbackStatus,
      cliente_feedback_at: new Date().toISOString(),
    })
    .eq("id", lead.id)

  if (!satisfeito) {
    await registrarOcorrencia(lead.profissional_id, lead.id, "Cliente deu feedback negativo no atendimento (👍 / 👎)")
  }

  return { registrado: true, leadId: lead.id, profissionalId: lead.profissional_id }
}

