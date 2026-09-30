const BUFFER_TIMEOUT_MS = Number(process.env.BUFFER_TIMEOUT_MS ?? 8000)
const BUFFER_MAX_TIMEOUT_MS = Number(process.env.BUFFER_MAX_TIMEOUT_MS ?? 60000)

interface ItemBuffer {
  tipo: "texto" | "audio"
  conteudo: string        // texto ou URL do áudio
  messageId: string
}

interface EntradaBuffer {
  itens: ItemBuffer[]
  timeout: NodeJS.Timeout
  maxTimeout: NodeJS.Timeout
  nome: string
  iniciado: number
  processando: boolean
  proximoLote: ItemBuffer[]
}

type CallbackProcessar = (params: {
  telefone: string
  nome: string
  itens: ItemBuffer[]
}) => Promise<void>

const buffers = new Map<string, EntradaBuffer>()
const mensagensProcessadas = new Set<string>()

export function adicionarAoBuffer(
  telefone: string,
  item: ItemBuffer,
  nome: string,
  onProcessar: CallbackProcessar
): void {
  // Deduplicação
  if (mensagensProcessadas.has(item.messageId)) return
  mensagensProcessadas.add(item.messageId)
  setTimeout(() => mensagensProcessadas.delete(item.messageId), 24 * 60 * 60 * 1000)

  const entrada = buffers.get(telefone)

  if (entrada?.processando) {
    entrada.proximoLote.push(item)
    return
  }

  if (entrada) {
    clearTimeout(entrada.timeout)
    entrada.itens.push(item)
    entrada.timeout = agendarProcessamento(telefone, nome, onProcessar)
    return
  }

  const maxTimeout = setTimeout(() => {
    processarBuffer(telefone, nome, onProcessar)
  }, BUFFER_MAX_TIMEOUT_MS)

  buffers.set(telefone, {
    itens: [item],
    timeout: agendarProcessamento(telefone, nome, onProcessar),
    maxTimeout,
    nome,
    iniciado: Date.now(),
    processando: false,
    proximoLote: [],
  })
}

function agendarProcessamento(
  telefone: string,
  nome: string,
  onProcessar: CallbackProcessar
): NodeJS.Timeout {
  return setTimeout(() => {
    processarBuffer(telefone, nome, onProcessar)
  }, BUFFER_TIMEOUT_MS)
}

async function processarBuffer(
  telefone: string,
  nome: string,
  onProcessar: CallbackProcessar
): Promise<void> {
  const entrada = buffers.get(telefone)
  if (!entrada || entrada.itens.length === 0) {
    buffers.delete(telefone)
    return
  }

  clearTimeout(entrada.timeout)
  clearTimeout(entrada.maxTimeout)
  entrada.processando = true

  const itens = [...entrada.itens]
  entrada.itens = []

  try {
    await onProcessar({ telefone, nome, itens })
  } catch (err) {
    console.error("[buffer] Erro ao processar lote:", err)
  } finally {
    const proximoLote = entrada.proximoLote
    buffers.delete(telefone)

    if (proximoLote.length > 0) {
      for (const item of proximoLote) {
        adicionarAoBuffer(telefone, item, nome, onProcessar)
      }
    }
  }
}

export type { ItemBuffer, CallbackProcessar }
