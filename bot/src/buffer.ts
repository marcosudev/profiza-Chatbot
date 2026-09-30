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
  proximoLoteIniciado: number | null
  proximoLoteAtualizado: number | null
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
    const agora = Date.now()
    if (entrada.proximoLote.length === 0) entrada.proximoLoteIniciado = agora
    entrada.proximoLoteAtualizado = agora
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
    proximoLoteIniciado: null,
    proximoLoteAtualizado: null,
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
    if (proximoLote.length > 0) {
      const agora = Date.now()
      const iniciado = entrada.proximoLoteIniciado ?? agora
      const atualizado = entrada.proximoLoteAtualizado ?? agora
      const esperaDebounce = Math.max(0, BUFFER_TIMEOUT_MS - (agora - atualizado))
      const esperaMaxima = Math.max(0, BUFFER_MAX_TIMEOUT_MS - (agora - iniciado))

      entrada.itens = proximoLote
      entrada.proximoLote = []
      entrada.proximoLoteIniciado = null
      entrada.proximoLoteAtualizado = null
      entrada.iniciado = iniciado
      entrada.processando = false
      entrada.timeout = setTimeout(() => {
        processarBuffer(telefone, nome, onProcessar)
      }, Math.min(esperaDebounce, esperaMaxima))
      entrada.maxTimeout = setTimeout(() => {
        processarBuffer(telefone, nome, onProcessar)
      }, esperaMaxima)
    } else {
      buffers.delete(telefone)
    }
  }
}

export type { ItemBuffer, CallbackProcessar }
