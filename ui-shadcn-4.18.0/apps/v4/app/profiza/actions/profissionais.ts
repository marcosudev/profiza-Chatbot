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
}
