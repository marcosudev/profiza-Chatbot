import { config } from "./config"

// Normaliza número para formato E.164 sem o +
// Z-API espera: 5514999990101 (sem + e sem caracteres especiais)
export function normalizarNumero(numero: string): string {
  const digits = numero.replace(/\D/g, "")
  // Se já começa com 55 e tem 12-13 dígitos, está ok
  if (digits.startsWith("55") && digits.length >= 12) return digits
  // Adiciona DDI Brasil
  return `55${digits}`
}

interface ZApiResponse {
  zaapId?: string
  messageId?: string
  error?: string
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
    const res = await fetch(`${config.zapi.baseUrl()}/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": config.zapi.clientToken,
      },
      body: JSON.stringify({
        phone: numero,
        message: texto,
      }),
    })

    const data = (await res.json()) as ZApiResponse

    if (!res.ok || data.error) {
      console.error("[zapi] Erro ao enviar mensagem:", data.error ?? res.status)
      return { sucesso: false }
    }

    console.log(`[zapi] Mensagem enviada para ${numero} — id: ${data.messageId}`)
    return { sucesso: true, messageId: data.messageId }
  } catch (err) {
    console.error("[zapi] Falha na requisição:", err)
    return { sucesso: false }
  }
}

// Verifica se a instância Z-API está conectada
export async function verificarConexao(): Promise<boolean> {
  try {
    const res = await fetch(`${config.zapi.baseUrl()}/status`, {
      headers: { "Client-Token": config.zapi.clientToken },
    })
    const data = (await res.json()) as { connected?: boolean }
    return data.connected === true
  } catch {
    return false
  }
}
