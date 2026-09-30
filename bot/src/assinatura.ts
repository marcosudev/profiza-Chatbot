/**
 * RF-13 — Assinatura e período de teste
 *
 * - Avisos ao profissional: dia 7 antes do fim do trial, dia 2 antes, no vencimento, 3 dias depois
 * - Conferência diária: sincroniza assinatura_status com Mercado Pago
 * - Webhook MP: atualiza status em tempo real
 */

import {
  buscarProfissionaisParaAviso,
  buscarProfissionaisVencidos,
  atualizarStatusAssinatura,
  buscarProfissionalPorMpId,
} from "./supabase"
import { enviarMensagem } from "./evolution"

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? ""

// ─── Mensagens de aviso ───────────────────────────────────────────────────────

function msgAvisoTrial(nome: string, dias: number): string {
  if (dias === 7) {
    return [
      `Olá, *${nome}*! 👋`,
      ``,
      `Seu período de teste gratuito na Profiza termina em *7 dias*.`,
      `Para continuar recebendo indicações, assine por apenas *R$ 29,90/mês*:`,
      `👉 profiza.net/assinar`,
      ``,
      `Qualquer dúvida, é só responder aqui!`,
    ].join("\n")
  }

  if (dias === 2) {
    return [
      `Olá, *${nome}*! ⏰`,
      ``,
      `Faltam apenas *2 dias* para o fim do seu teste gratuito na Profiza.`,
      `Não perca suas indicações — assine agora:`,
      `👉 profiza.net/assinar`,
    ].join("\n")
  }

  // Vencimento (dias === 0)
  return [
    `Olá, *${nome}*! 🔔`,
    ``,
    `Seu período de teste na Profiza *encerrou hoje*.`,
    `Para continuar recebendo indicações de clientes, assine por *R$ 29,90/mês*:`,
    `👉 profiza.net/assinar`,
    ``,
    `Você tem *3 dias* de carência antes de sair da plataforma.`,
  ].join("\n")
}

function msgInadimplente(nome: string): string {
  return [
    `Olá, *${nome}*! ⚠️`,
    ``,
    `Sua assinatura Profiza está em atraso há 3 dias.`,
    `Para não perder suas indicações, regularize agora:`,
    `👉 profiza.net/assinar`,
    ``,
    `Se já pagou, aguarde alguns minutos para a confirmação.`,
  ].join("\n")
}

// ─── Rotina diária de avisos ──────────────────────────────────────────────────

export async function executarAvisosDiarios(): Promise<void> {
  // Aviso 7 dias antes do fim do trial
  const aviso7 = await buscarProfissionaisParaAviso(7)
  for (const p of aviso7) {
    await enviarMensagem(p.whatsapp, msgAvisoTrial(p.nome, 7))
    console.log(`[assinatura] Aviso 7 dias → ${p.nome}`)
  }

  // Aviso 2 dias antes
  const aviso2 = await buscarProfissionaisParaAviso(2)
  for (const p of aviso2) {
    await enviarMensagem(p.whatsapp, msgAvisoTrial(p.nome, 2))
    console.log(`[assinatura] Aviso 2 dias → ${p.nome}`)
  }

  // Aviso no vencimento (trial_ate = hoje)
  const avisoHoje = await buscarProfissionaisParaAviso(0)
  for (const p of avisoHoje) {
    await enviarMensagem(p.whatsapp, msgAvisoTrial(p.nome, 0))
    console.log(`[assinatura] Aviso vencimento → ${p.nome}`)
  }

  // Marca inadimplentes (assinatura_ate vencida há 3 dias)
  const vencidos = await buscarProfissionaisVencidos()
  for (const p of vencidos) {
    await atualizarStatusAssinatura(p.id, "inadimplente")
    await enviarMensagem(p.whatsapp, msgInadimplente(p.nome))
    console.log(`[assinatura] Inadimplente → ${p.nome}`)
  }
}

// ─── Conferência diária com Mercado Pago ─────────────────────────────────────

export async function conferirAssinaturasMercadoPago(): Promise<void> {
  if (!MP_ACCESS_TOKEN) return

  try {
    const res = await fetch(
      "https://api.mercadopago.com/preapproval/search?status=authorized&limit=100",
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    )
    const data = (await res.json()) as {
      results?: Array<{ id: string; status: string; next_payment_date?: string }>
    }

    for (const item of data.results ?? []) {
      const prof = await buscarProfissionalPorMpId(item.id)
      if (!prof) continue

      const novoStatus = _mpStatusParaInterno(item.status)
      if (novoStatus && novoStatus !== prof.assinatura_status) {
        await atualizarStatusAssinatura(prof.id, novoStatus)
        console.log(`[assinatura] MP sync: ${prof.nome} → ${novoStatus}`)
      }
    }
  } catch (err) {
    console.error("[assinatura] Erro na conferência MP:", err)
  }
}

// ─── Webhook Mercado Pago ─────────────────────────────────────────────────────

export interface MpWebhookPayload {
  action: string
  data: { id: string }
}

export async function processarWebhookMp(payload: MpWebhookPayload): Promise<void> {
  if (!payload.data?.id) return

  const mpId = payload.data.id

  try {
    const res = await fetch(`https://api.mercadopago.com/preapproval/${mpId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    const assinatura = (await res.json()) as { id: string; status: string }

    const prof = await buscarProfissionalPorMpId(assinatura.id)
    if (!prof) return

    const novoStatus = _mpStatusParaInterno(assinatura.status)
    if (novoStatus && novoStatus !== prof.assinatura_status) {
      await atualizarStatusAssinatura(prof.id, novoStatus)
      console.log(`[assinatura] Webhook MP: ${prof.nome} → ${novoStatus}`)
    }
  } catch (err) {
    console.error("[assinatura] Erro ao processar webhook MP:", err)
  }
}

function _mpStatusParaInterno(mpStatus: string): string | null {
  const mapa: Record<string, string> = {
    authorized: "ativa",
    paused: "inadimplente",
    cancelled: "cancelada",
    pending: "inadimplente",
  }
  return mapa[mpStatus] ?? null
}
