import OpenAI from "openai"
import { config } from "./config"

const openai = new OpenAI({ apiKey: config.openai.apiKey })

const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL ?? "whisper-1"
const AUDIO_MAX_SECONDS = Number(process.env.AUDIO_MAX_SECONDS ?? 120)
const TIMEOUT_MS = 15000

export async function transcreverAudio(
  base64: string,
  mimeType: string = "audio/ogg"
): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, "base64")

    // Limite de 25MB
    if (buffer.byteLength > 25 * 1024 * 1024) {
      console.warn("[audio] Arquivo muito grande:", buffer.byteLength)
      return null
    }

    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("mpeg") ? "mp3" : "ogg"
    const file = new File([buffer], `audio.${ext}`, { type: mimeType })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const result = await openai.audio.transcriptions.create({
        file,
        model: TRANSCRIBE_MODEL,
        language: "pt",
      })
      return result.text?.trim() || null
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    console.error("[audio] Erro na transcrição:", err)
    return null
  }
}

export async function obterAudioBase64(
  evolutionBaseUrl: string,
  evolutionInstance: string,
  evolutionApiKey: string,
  messageId: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(
      `${evolutionBaseUrl}/chat/getBase64FromMediaMessage/${evolutionInstance}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionApiKey,
        },
        body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
      }
    )

    if (!res.ok) return null

    const data = (await res.json()) as { base64?: string; mimetype?: string }
    if (!data.base64) return null

    return { base64: data.base64, mimeType: data.mimetype ?? "audio/ogg" }
  } catch (err) {
    console.error("[audio] Erro ao obter base64:", err)
    return null
  }
}

export { AUDIO_MAX_SECONDS }
