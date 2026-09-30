/**
 * RF-15 — Central Profiza via Telegram
 *
 * Fluxo:
 * 1. Bot dispara handoff → posta alerta no grupo Telegram
 * 2. Operador responde ao alerta → sistema envia ao cliente via WhatsApp
 * 3. /bot devolve ao bot automático
 * 4. /pausar e /voltar controlam o bot inteiro
 * 5. Resumo diário às 18h
 */

import { enviarMensagem } from "./evolution"
import { marcarSessaoHumanoAtivo } from "./supabase"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ""
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID ?? ""

// Controle global do bot (RF-15: /pausar e /voltar)
let botPausado = false
export function isBotPausado(): boolean { return botPausado }

// Map: message_id do alerta Telegram → telefone do cliente WhatsApp
const alertaParaTelefone = new Map<number, string>()

// ─── Envio de alertas ─────────────────────────────────────────────────────────

export async function enviarAlertaHandoff(params: {
  telefone: string
  motivo: string
  categoria: string | null
  bairro: string | null
  resumo: string
  ultimasMensagens: string
}): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) return

  const texto = [
    `🚨 *HANDOFF — Atendimento humano necessário*`,
    ``,
    `📱 Cliente: \`${params.telefone}\``,
    `📋 Motivo: ${params.motivo}`,
    params.categoria ? `🔧 Categoria: ${params.categoria}` : null,
    params.bairro ? `📍 Bairro: ${params.bairro}` : null,
    ``,
    `📝 Resumo: ${params.resumo}`,
    ``,
    `💬 Últimas mensagens:`,
    params.ultimasMensagens,
    ``,
    `_Responda esta mensagem para enviar ao cliente._`,
    `_/bot — devolver ao bot | /pausar — pausar bot_`,
  ].filter(Boolean).join("\n")

  const res = await _enviarTelegram(texto)
  if (res?.message_id) {
    alertaParaTelefone.set(res.message_id, params.telefone)
  }
}

export async function enviarResumoDiario(dados: {
  conversas: number
  leads: number
  handoffs: number
  erros: number
  assinaturasVencendo: string[]
}): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) return

  const vencendo = dados.assinaturasVencendo.length > 0
    ? dados.assinaturasVencendo.join(", ")
    : "nenhuma"

  const texto = [
    `📊 *Resumo diário Profiza*`,
    ``,
    `💬 Conversas: ${dados.conversas}`,
    `📩 Leads gerados: ${dados.leads}`,
    `🤝 Handoffs: ${dados.handoffs}`,
    `❌ Erros: ${dados.erros}`,
    `⚠️ Assinaturas vencendo em breve: ${vencendo}`,
  ].join("\n")

  await _enviarTelegram(texto)
}

// ─── Webhook Telegram ─────────────────────────────────────────────────────────

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { first_name?: string }
    chat?: { id: number }
    text?: string
    reply_to_message?: { message_id: number }
  }
}

export async function processarUpdateTelegram(update: TelegramUpdate): Promise<void> {
  const msg = update.message
  if (!msg?.text) return

  const texto = msg.text.trim()
  const chatId = msg.chat?.id
  const remetenteNome = msg.from?.first_name ?? "Operador"

  // Comandos globais
  if (texto === "/pausar") {
    botPausado = true
    await _enviarTelegram("⏸️ Bot pausado. Use /voltar para reativar.", chatId)
    return
  }

  if (texto === "/voltar") {
    botPausado = false
    await _enviarTelegram("▶️ Bot reativado.", chatId)
    return
  }

  // Resposta a um alerta (reply)
  const replyId = msg.reply_to_message?.message_id
  if (replyId) {
    const telefone = alertaParaTelefone.get(replyId)

    if (texto === "/bot") {
      if (telefone) {
        await marcarSessaoHumanoAtivo(telefone, false)
        alertaParaTelefone.delete(replyId)
        await _enviarTelegram(`✅ Conversa com ${telefone} devolvida ao bot.`, chatId)
      }
      return
    }

    if (telefone) {
      // Envia resposta do operador ao cliente via WhatsApp
      await enviarMensagem(telefone, texto)
      await _enviarTelegram(`✅ Mensagem enviada ao cliente por ${remetenteNome}.`, chatId)
      return
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _enviarTelegram(
  texto: string,
  chatId: string | number = TELEGRAM_GROUP_ID
): Promise<{ message_id: number } | null> {
  if (!TELEGRAM_BOT_TOKEN) return null

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: "Markdown",
      }),
    })
    const data = (await res.json()) as { ok: boolean; result?: { message_id: number } }
    return data.ok ? (data.result ?? null) : null
  } catch (err) {
    console.error("[telegram] Erro ao enviar mensagem:", err)
    return null
  }
}
