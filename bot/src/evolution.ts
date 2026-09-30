import { config } from "./config"

// Normaliza número para formato E.164 sem o +
export function normalizarNumero(numero: string): string {
  const digits = numero.replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length >= 12) return digits
  return `55${digits}`
}

interface EvolutionResponse {
  key?: { id?: string }
  error?: string
  message?: string
}

export interface EnvioResult {
  sucesso: boolean
  messageId?: string
}

export async function enviarMensagem(
  para: string,
  texto: string
): Promise<EnvioResult> {
  const numero = normalizarNumero(para)

  try {
    const res = await fetch(
      `${config.evolution.baseUrl}/message/sendText/${config.evolution.instance}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.evolution.apiKey,
        },
        body: JSON.stringify({ number: numero, text: texto }),
      }
    )

    const data = (await res.json()) as EvolutionResponse

    if (!res.ok || data.error) {
      console.error("[evolution] Erro ao enviar mensagem:", data.error ?? data.message ?? res.status)
      return { sucesso: false }
    }

    const msgId = data.key?.id
    console.log(`[evolution] Mensagem enviada para ${numero} — id: ${msgId}`)
    return { sucesso: true, messageId: msgId }
  } catch (err) {
    console.error("[evolution] Falha na requisição:", err)
    return { sucesso: false }
  }
}

// Verifica se a instância Evolution API está conectada
export async function verificarConexao(): Promise<boolean> {
  try {
    const res = await fetch(
      `${config.evolution.baseUrl}/instance/connectionState/${config.evolution.instance}`,
      { headers: { apikey: config.evolution.apiKey } }
    )
    const data = (await res.json()) as { instance?: { state?: string } }
    return data.instance?.state === "open"
  } catch {
    return false
  }
}

// Envia indicador de "digitando..." ou "pausado"
export async function enviarPresenca(
  para: string,
  presence: "composing" | "paused"
): Promise<void> {
  const numero = normalizarNumero(para)
  try {
    await fetch(
      `${config.evolution.baseUrl}/chat/sendPresence/${config.evolution.instance}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.evolution.apiKey,
        },
        body: JSON.stringify({ number: numero, presence, delay: 1000 }),
      }
    )
  } catch {
    // Presença é best-effort, não bloqueia o fluxo
  }
}
