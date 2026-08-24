import Fastify from "fastify"
import { config } from "./config"
import { processarMensagem } from "./bot"
import { verificarConexao } from "./zapi"
import {
  buscarLeadPorMensagemId,
  atualizarStatusEntrega,
  confirmarEntregaECobrar,
  registrarLog,
} from "./supabase"

const app = Fastify({ logger: true })

// ─── Tipos do payload Z-API ───────────────────────────────────────────────────

interface ZApiWebhookPayload {
  instanceId: string
  messageId: string
  phone: string           // número do remetente
  fromMe: boolean         // true se foi o bot que enviou
  momment: number         // timestamp
  status: string
  chatName: string        // nome do contato
  senderPhoto?: string
  senderName: string
  participantPhone?: string
  photo?: string
  broadcast: boolean
  type: string            // "ReceivedCallback" | "DeliveryCallback" | etc
  text?: {
    message: string
  }
  image?: { caption?: string }
  audio?: object
  video?: { caption?: string }
  document?: object
  isGroup: boolean
}

interface ZApiStatusPayload {
  messageId: string
  phone: string
  status: "PENDING" | "SENT" | "RECEIVED" | "READ" | "PLAYED" | "ERROR"
  momment: number
  type: string            // "MessageStatusCallback"
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/", async () => {
  const zapiConectado = await verificarConexao()
  return {
    status: "ok",
    service: "profiza-bot",
    zapi: zapiConectado ? "conectado" : "desconectado",
    timestamp: new Date().toISOString(),
  }
})

// ─── Webhook Z-API ────────────────────────────────────────────────────────────

app.post<{ Body: ZApiWebhookPayload }>("/webhook", async (request, reply) => {
  // Valida token se enviado — Z-API não suporta headers customizados no painel
  const secret = request.headers["z-api-token"] ?? request.headers["x-webhook-secret"]
  if (secret && secret !== config.webhookSecret) {
    return reply.status(401).send({ error: "Unauthorized" })
  }

  const payload = request.body

  // Ignora mensagens enviadas pelo próprio bot, grupos e não-texto
  if (payload.fromMe) return reply.send({ ok: true })
  if (payload.isGroup) return reply.send({ ok: true })
  if (payload.type !== "ReceivedCallback") return reply.send({ ok: true })
  if (!payload.text?.message) return reply.send({ ok: true })

  const texto = payload.text.message.trim()
  if (!texto) return reply.send({ ok: true })

  // Processa de forma assíncrona — responde 200 imediatamente para a Z-API
  // (Z-API tem timeout curto no webhook)
  setImmediate(() => {
    processarMensagem({
      telefone: payload.phone,
      nome: payload.senderName || payload.chatName || "Cliente",
      texto,
    }).catch((err) => {
      console.error("[webhook] Erro ao processar mensagem:", err)
    })
  })

  return reply.send({ ok: true })
})

// ─── Webhook Status Z-API (confirmação de entrega) ────────────────────────────

app.get("/webhook/status", async () => ({ ok: true }))

app.post<{ Body: ZApiStatusPayload }>("/webhook/status", async (request, reply) => {
  const secret = request.headers["z-api-token"] ?? request.headers["x-webhook-secret"]
  if (secret && secret !== config.webhookSecret) {
    return reply.status(401).send({ error: "Unauthorized" })
  }

  const { messageId, status } = request.body

  if (!messageId) return reply.send({ ok: true })

  // Processa async
  setImmediate(async () => {
    try {
      const lead = await buscarLeadPorMensagemId(messageId)
      if (!lead) return

      // Atualiza status de entrega
      await atualizarStatusEntrega(lead.id, status)

      // Se entregue ou lido, confirma e cobra
      if (status === "RECEIVED" || status === "READ") {
        if (!lead.cobrado && lead.status !== "falhou" && lead.status !== "cancelado") {
          await confirmarEntregaECobrar(lead.id)
        }
      }

      // Se erro, marca como falhou
      if (status === "ERROR") {
        await registrarLog("lead", lead.id, "envio_falhou", { status })
      }
    } catch (err) {
      console.error("[webhook/status] Erro:", err)
    }
  })

  return reply.send({ ok: true })
})

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" })
    console.log(`\n🤖 Profiza Bot rodando na porta ${config.port}`)
    console.log(`📡 Webhook: POST http://localhost:${config.port}/webhook`)
    console.log(`❤️  Health:  GET  http://localhost:${config.port}/\n`)

    const conectado = await verificarConexao()
    if (conectado) {
      console.log("✅ Z-API conectada ao WhatsApp")
    } else {
      console.warn("⚠️  Z-API desconectada — verifique o QR Code no painel")
    }
  } catch (err) {
    console.error("Erro ao iniciar servidor:", err)
    process.exit(1)
  }
}

start()
