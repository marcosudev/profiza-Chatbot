"use server"

import { revalidatePath } from "next/cache"
import {
  createProfissional,
  updateProfissional,
  updateStatus,
  deleteProfissional,
  updateLeadStatus,
  updateConfiguracoes,
} from "@/lib/supabase/queries"
import type { Professional, PaymentStatus } from "@/lib/profiza-data"
import type { LeadStatus, Configuracoes } from "@/lib/supabase/queries"

export async function actionCreateProfissional(
  input: Omit<Professional, "id" | "leadsSemana" | "ultimaAtividade">
) {
  const prof = await createProfissional(input)
  revalidatePath("/profiza/profissionais")
  revalidatePath("/profiza")
  return prof
}

export async function actionUpdateProfissional(
  id: string,
  input: Partial<Omit<Professional, "id">>
) {
  const prof = await updateProfissional(id, input)
  revalidatePath("/profiza/profissionais")
  revalidatePath("/profiza")
  return prof
}

export async function actionUpdateStatus(id: string, status: PaymentStatus) {
  await updateStatus(id, status)
  revalidatePath("/profiza/profissionais")
  revalidatePath("/profiza")
  revalidatePath("/profiza/cobranca")
  revalidatePath("/profiza/financas")
}

export async function actionDeleteProfissional(id: string) {
  await deleteProfissional(id)
  revalidatePath("/profiza/profissionais")
  revalidatePath("/profiza")
}

export async function actionUpdateLeadStatus(id: string, status: LeadStatus) {
  await updateLeadStatus(id, status)
  revalidatePath("/profiza/leads")
}

export async function actionSaveConfiguracoes(data: Partial<Configuracoes>) {
  await updateConfiguracoes(data)
  revalidatePath("/profiza/configuracao")
  revalidatePath("/profiza/cobranca")
  revalidatePath("/profiza/financas")
}

export async function actionClearAllData() {
  const { clearAllData } = await import("@/lib/supabase/queries")
  await clearAllData()
  revalidatePath("/profiza")
  revalidatePath("/profiza/profissionais")
  revalidatePath("/profiza/leads")
  revalidatePath("/profiza/cobranca")
  revalidatePath("/profiza/configuracao")
  revalidatePath("/profiza/financas")
}

export async function actionCreateDespesa(input: any) {
  try {
    const { createDespesa } = await import("@/lib/supabase/queries")
    const res = await createDespesa(input)
    revalidatePath("/profiza/financas")
    return { success: true, data: res }
  } catch (err: any) {
    console.error("[actionCreateDespesa] Error:", err)
    return { success: false, error: err?.message || "Erro ao salvar despesa" }
  }
}

export async function actionUpdateDespesaStatus(id: string, status: any) {
  const { updateDespesaStatus } = await import("@/lib/supabase/queries")
  await updateDespesaStatus(id, status)
  revalidatePath("/profiza/financas")
}

export async function actionUpdateDespesa(id: string, input: any) {
  try {
    const { updateDespesa } = await import("@/lib/supabase/queries")
    await updateDespesa(id, input)
    revalidatePath("/profiza/financas")
    return { success: true }
  } catch (err: any) {
    console.error("[actionUpdateDespesa] Error:", err)
    return { success: false, error: err?.message || "Erro ao atualizar despesa" }
  }
}

export async function actionDeleteDespesa(id: string) {
  const { deleteDespesa } = await import("@/lib/supabase/queries")
  await deleteDespesa(id)
  revalidatePath("/profiza/financas")
}

export async function actionUpdateFaturaStatus(id: string, status: any) {
  const { updateFaturaStatus } = await import("@/lib/supabase/queries")
  await updateFaturaStatus(id, status)
  revalidatePath("/profiza/financas")
}
