import Fastify from "fastify"
import { config } from "./config"
import { processarMensagem } from "./bot"
import { verificarConexao } from "./zapi"
import {
  buscarRelatoriosSemanais,
  buscarLeadPorMensagemId,
  atualizarStatusEntrega,
  confirmarEntregaECobrar,
  reservarRelatorioSemanal,
  registrarLog,
} from "./supabase"
import { enviarMensagem } from "./zapi"
import { mensagens } from "./messages"

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

// ─── Buffer de Mensagens (Pausas Inteligentes) ──────────────────────────────
const messageBuffer = new Map<string, {
  textos: string[],
  nome: string,
  timeout: NodeJS.Timeout
}>()

const TEMPO_PAUSA_MS = 12000 // Aguarda 12 segundos de inatividade

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

  const telefone = payload.phone
  const nome = payload.senderName || payload.chatName || "Cliente"

  // Logica de buffer
  const bufferAtual = messageBuffer.get(telefone)
  if (bufferAtual) {
    clearTimeout(bufferAtual.timeout)
    bufferAtual.textos.push(texto)
  } else {
    messageBuffer.set(telefone, {
      textos: [texto],
      nome,
      timeout: setTimeout(() => {}, 0) // será reescrito abaixo
    })
  }

  const novoBuffer = messageBuffer.get(telefone)!
  novoBuffer.timeout = setTimeout(() => {
    // Quando o timer estoura, processa todas as mensagens juntas
    const textoAgrupado = novoBuffer.textos.join("\n")
    messageBuffer.delete(telefone)

    processarMensagem({
      telefone,
      nome: novoBuffer.nome,
      texto: textoAgrupado,
    }).catch((err) => {
      console.error("[webhook] Erro ao processar mensagem agrupada:", err)
    })
  }, TEMPO_PAUSA_MS)

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

function dataNoFusoBauru(): { data: string; hora: number; diaSemana: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date())
  const get = (type: string) => partes.find((parte) => parte.type === type)?.value ?? ""
  const dias: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    data: `${get("year")}-${get("month")}-${get("day")}`,
    hora: Number(get("hour")),
    diaSemana: dias[get("weekday")] ?? -1,
  }
}

async function enviarRelatoriosSemanais(): Promise<void> {
  const agora = dataNoFusoBauru()
  if (agora.diaSemana !== 1 || agora.hora !== 9) return

  const fim = new Date()
  const inicio = new Date(fim.getTime() - 7 * 24 * 60 * 60 * 1000)
  const relatorios = await buscarRelatoriosSemanais(inicio.toISOString(), fim.toISOString())

  for (const relatorio of relatorios) {
    const reservado = await reservarRelatorioSemanal(relatorio.id, agora.data)
    if (!reservado) continue

    await enviarMensagem(
      relatorio.whatsapp,
      mensagens.relatorioSemanal(relatorio)
    )
  }
}

// O registro único por profissional/semana impede duplicidade após reinícios.
setInterval(() => {
  enviarRelatoriosSemanais().catch((err) => {
    console.error("[relatorio] Erro ao enviar resumos semanais:", err)
  })
}, 60 * 60 * 1000)

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

    await enviarRelatoriosSemanais().catch((err) => {
      console.error("[relatorio] Erro na verificação inicial:", err)
    })
  } catch (err) {
    console.error("Erro ao iniciar servidor:", err)
    process.exit(1)
  }
}

start()
