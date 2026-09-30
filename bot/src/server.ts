import Fastify from "fastify"
import { config } from "./config"
import { processarLote } from "./bot"
import { verificarConexao, enviarMensagem } from "./evolution"
import { adicionarAoBuffer, resolverAudioPendente } from "./buffer"
import { transcreverAudio, obterAudioBase64, audioExcedeDuracaoMaxima } from "./audio"
import {
  buscarRelatoriosSemanais,
  buscarLeadPorMensagemId,
  atualizarStatusEntrega,
  confirmarEntregaECobrar,
  reservarRelatorioSemanal,
  registrarLog,
  buscarResumoDiario,
  buscarLeadParaRedirecionamento,
  registrarCliqueContato,
  buscarLeadsParaFeedbackCliente,
} from "./supabase"
import { mensagens } from "./messages"
import { processarUpdateTelegram, enviarResumoDiario, type TelegramUpdate } from "./telegram"
import { executarAvisosDiarios, conferirAssinaturasMercadoPago, processarWebhookMp, type MpWebhookPayload } from "./assinatura"

const app = Fastify({ logger: true })

// ─── Tipos do payload Evolution API v2 ───────────────────────────────────────

interface EvolutionWebhookPayload {
  event: string
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
      participant?: string
    }
    pushName?: string
    message?: {
      conversation?: string
      extendedTextMessage?: { text?: string }
      audioMessage?: { url?: string; mimetype?: string; ptt?: boolean; seconds?: number }
      locationMessage?: { degreesLatitude?: number; degreesLongitude?: number }
    }
    messageType?: string
    status?: string
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/", async () => {
  const conectado = await verificarConexao()
  return {
    status: "ok",
    service: "profiza-bot",
    evolution: conectado ? "conectado" : "desconectado",
    timestamp: new Date().toISOString(),
  }
})

// ─── Webhook Evolution API ────────────────────────────────────────────────────

app.post<{ Body: EvolutionWebhookPayload; Querystring: { secret?: string } }>("/webhook", async (request, reply) => {
  // RNF-04 — valida WEBHOOK_SECRET
  const secret = request.headers["x-webhook-secret"] ?? request.query?.secret
  if (config.webhookSecret && secret !== config.webhookSecret) {
    return reply.status(401).send({ error: "unauthorized" })
  }

  const payload = request.body

  if (payload.event !== "messages.upsert") return reply.send({ ok: true })

  const { key, pushName, message, messageType } = payload.data

  if (key.fromMe) return reply.send({ ok: true })
  if (key.remoteJid.endsWith("@g.us")) return reply.send({ ok: true })

  const telefone = key.remoteJid.replace("@s.whatsapp.net", "")
  const nome = pushName || "Cliente"
  const messageId = key.id

  // Texto
  if (messageType === "conversation" || messageType === "extendedTextMessage") {
    const texto = (message?.conversation ?? message?.extendedTextMessage?.text ?? "").trim()
    if (!texto) return reply.send({ ok: true })

    adicionarAoBuffer(
      telefone,
      { tipo: "texto", conteudo: texto, messageId },
      nome,
      processarLote
    )
    return reply.send({ ok: true })
  }

  // Áudio
  if (messageType === "audioMessage") {
    if (audioExcedeDuracaoMaxima(message?.audioMessage?.seconds)) {
      setImmediate(() => {
        enviarMensagem(telefone, "O áudio passou do limite de duração. Pode enviar uma mensagem de texto? 😊")
      })
      return reply.send({ ok: true })
    }

    adicionarAoBuffer(
      telefone,
      { tipo: "audio", conteudo: "", messageId, pendente: true },
      nome,
      processarLote
    )

    setImmediate(async () => {
      try {
        const audio = await obterAudioBase64(
          config.evolution.baseUrl,
          config.evolution.instance,
          config.evolution.apiKey,
          messageId
        )

        if (!audio) {
          await enviarMensagem(telefone, "Não consegui entender o áudio. Pode digitar sua mensagem? 😊")
          resolverAudioPendente(telefone, messageId, null)
          return
        }

        let avisoTimer: NodeJS.Timeout
        let envioAviso: ReturnType<typeof enviarMensagem> | null = null
        avisoTimer = setTimeout(() => {
          envioAviso = enviarMensagem(telefone, "🎙️ Recebi seu áudio! Já te respondo.")
        }, 3000)

        let transcricao: string | null
        try {
          transcricao = await transcreverAudio(audio.base64, audio.mimeType)
        } finally {
          clearTimeout(avisoTimer)
        }
        if (envioAviso) await envioAviso

        if (!transcricao) {
          await enviarMensagem(telefone, "Não consegui entender o áudio. Pode digitar sua mensagem? 😊")
          resolverAudioPendente(telefone, messageId, null)
          return
        }

        resolverAudioPendente(telefone, messageId, transcricao)
      } catch (err) {
        console.error("[webhook] Erro ao processar áudio:", err)
        await enviarMensagem(telefone, "Não consegui entender o áudio. Pode digitar sua mensagem? 😊")
        resolverAudioPendente(telefone, messageId, null)
      }
    })

    return reply.send({ ok: true })
  }

  // Localização compartilhada (RF-11)
  if (messageType === "locationMessage") {
    const lat = payload.data.message?.locationMessage?.degreesLatitude
    const lng = payload.data.message?.locationMessage?.degreesLongitude
    if (lat && lng) {
      const textoLoc = `__localizacao:${lat},${lng}__`
      adicionarAoBuffer(telefone, { tipo: "texto", conteudo: textoLoc, messageId }, nome, processarLote)
    }
    return reply.send({ ok: true })
  }

  // Imagem, sticker, etc.
  if (messageType === "imageMessage" || messageType === "stickerMessage") {
    adicionarAoBuffer(
      telefone,
      { tipo: "texto", conteudo: "__midia__", messageId },
      nome,
      async ({ telefone }) => {
        await enviarMensagem(telefone, "Recebi sua imagem! Me conta em texto o que você precisa 😊")
      }
    )
    return reply.send({ ok: true })
  }

  return reply.send({ ok: true })
})

// ─── Link rastreável de contato do cliente ────────────────────────────────────

app.get<{ Params: { lead_id: string } }>("/c/:lead_id", async (request, reply) => {
  const { lead_id } = request.params
  const info = await buscarLeadParaRedirecionamento(lead_id)

  if (!info || !info.profissionalWhatsapp) {
    return reply.status(404).send("Link de indicação inválido ou expirado.")
  }

  await registrarCliqueContato(lead_id).catch(err => {
    console.error("[redirect] Erro ao registrar clique:", err)
  })

  const numero = info.profissionalWhatsapp.replace(/\D/g, "")
  const textoMensagem = encodeURIComponent(
    `Olá, vim pela Profiza e preciso de ${info.categoria} no ${info.bairro}`
  )
  const targetUrl = `https://wa.me/55${numero}?text=${textoMensagem}`

  return reply.redirect(302, targetUrl)
})

// ─── Webhook Telegram ───────────────────────────────────────────────────────

app.post<{ Body: TelegramUpdate }>("/webhook/telegram", async (request, reply) => {
  setImmediate(() => processarUpdateTelegram(request.body).catch(console.error))
  return reply.send({ ok: true })
})

// ─── Webhook Mercado Pago ─────────────────────────────────────────────────────

app.post<{ Body: MpWebhookPayload }>("/webhook/mercadopago", async (request, reply) => {
  setImmediate(() => processarWebhookMp(request.body).catch(console.error))
  return reply.send({ ok: true })
})

// ─── Webhook Status Evolution API ────────────────────────────────────────────

app.get("/webhook/status", async () => ({ ok: true }))

app.post<{ Body: EvolutionWebhookPayload }>("/webhook/status", async (request, reply) => {
  const payload = request.body
  const messageId = payload.data?.key?.id
  const status = payload.data?.status ?? ""

  if (!messageId) return reply.send({ ok: true })

  setImmediate(async () => {
    try {
      const lead = await buscarLeadPorMensagemId(messageId)
      if (!lead) return

      await atualizarStatusEntrega(lead.id, status)

      if (status === "RECEIVED" || status === "READ") {
        if (!lead.cobrado && lead.status !== "falhou" && lead.status !== "cancelado") {
          await confirmarEntregaECobrar(lead.id)
        }
      }

      if (status === "ERROR") {
        await registrarLog("lead", lead.id, "envio_falhou", { status })
      }
    } catch (err) {
      console.error("[webhook/status] Erro:", err)
    }
  })

  return reply.send({ ok: true })
})

// ─── Relatórios semanais ──────────────────────────────────────────────────────

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
  const get = (type: string) => partes.find((p) => p.type === type)?.value ?? ""
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
    await enviarMensagem(relatorio.whatsapp, mensagens.relatorioSemanal(relatorio))
  }
}

setInterval(() => {
  enviarRelatoriosSemanais().catch((err) => {
    console.error("[relatorio] Erro:", err)
  })
}, 60 * 60 * 1000)

// ─── Rotinas diárias (avisos trial + conferência MP) ─────────────────────────

function horaAtualBauru(): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date())
  return Number(partes.find(p => p.type === "hour")?.value ?? -1)
}

async function executarEnvioFeedbackClientes(): Promise<void> {
  try {
    const leadsFeedback = await buscarLeadsParaFeedbackCliente()
    for (const lead of leadsFeedback) {
      const msg = mensagens.pedirFeedbackCliente(lead.categoria, lead.nomeProfissional)
      await enviarMensagem(lead.whatsappCliente, msg)
      console.log(`[feedback-cliente] Pesquisa enviada -> ${lead.whatsappCliente} (Lead: ${lead.leadId})`)
    }
  } catch (err) {
    console.error("[feedback-cliente] Erro ao enviar pesquisas de feedback:", err)
  }
}

setInterval(async () => {
  const hora = horaAtualBauru()

  // Pesquisa de feedback 48h ao cliente
  if (hora >= 10 && hora <= 19) {
    await executarEnvioFeedbackClientes().catch(err => console.error("[feedback-cliente] Erro:", err))
  }

  // Avisos de trial e inadimplência: 9h
  if (hora === 9) {
    await executarAvisosDiarios().catch(err => console.error("[assinatura] Erro avisos:", err))
    await conferirAssinaturasMercadoPago().catch(err => console.error("[assinatura] Erro conferência MP:", err))
  }

  // Resumo diário no Telegram: 18h
  if (hora === 18) {
    const resumo = await buscarResumoDiario().catch(() => null)
    if (resumo) {
      await enviarResumoDiario(resumo).catch(err => console.error("[telegram] Erro resumo:", err))
    }
  }
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
      console.log("✅ Evolution API conectada ao WhatsApp")
    } else {
      console.warn("⚠️  Evolution API desconectada — verifique o QR Code no painel")
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
