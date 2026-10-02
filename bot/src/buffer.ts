import crypto from "crypto"
import { ehFragmentoDePedido } from "./conversation-state"
import { resolverCategoria } from "./knowledge/categorias"
import { resolverBairro } from "./knowledge/bairros-bauru"

const BUFFER_BASE_TIMEOUT_MS = Number(process.env.BUFFER_TIMEOUT_MS ?? 3500)
const BUFFER_EXTENSION_MS = 4000
const BUFFER_MAX_TIMEOUT_MS = Number(process.env.BUFFER_MAX_TIMEOUT_MS ?? 12000)

export interface ItemBuffer {
  tipo: "texto" | "audio"
  conteudo: string
  messageId: string
  pendente?: boolean
  timestamp?: number
}

export interface LoteProcessamento {
  turn_id: string
  batch_epoch: number
  telefone: string
  nome: string
  itens: ItemBuffer[]
}

interface EntradaBuffer {
  itens: ItemBuffer[]
  timeout: NodeJS.Timeout
  maxTimeout: NodeJS.Timeout
  nome: string
  iniciado: number
  atualizado: number
  processando: boolean
  aguardandoAudio: boolean
  epoch: number
  proximoLote: ItemBuffer[]
  onProcessar: CallbackProcessar
}

export type CallbackProcessar = (lote: LoteProcessamento) => Promise<void>

const buffers = new Map<string, EntradaBuffer>()
const mensagensProcessadas = new Set<string>()
const contactLocks = new Map<string, { lockId: string; expiresAt: number }>()

export function adquirirLockContato(telefone: string, ttlMs: number = 20000): string | null {
  const agora = Date.now()
  const lockAtual = contactLocks.get(telefone)

  if (lockAtual && lockAtual.expiresAt > agora) {
    return null
  }

  const lockId = crypto.randomUUID()
  contactLocks.set(telefone, { lockId, expiresAt: agora + ttlMs })
  return lockId
}

export function liberarLockContato(telefone: string, lockId: string): void {
  const lockAtual = contactLocks.get(telefone)
  if (lockAtual && lockAtual.lockId === lockId) {
    contactLocks.delete(telefone)
  }
}

export function obterEpochAtual(telefone: string): number {
  return buffers.get(telefone)?.epoch ?? 1
}

export function validarEpochTurno(telefone: string, epoch: number): boolean {
  const entrada = buffers.get(telefone)
  if (!entrada) return true
  return entrada.epoch === epoch
}

function calcularJanelaAdaptativa(textoAcumulado: string): number {
  if (!textoAcumulado || !textoAcumulado.trim()) return BUFFER_BASE_TIMEOUT_MS

  const fragmento = ehFragmentoDePedido(textoAcumulado)
  const terminaIncompleto = /\b(um|uma|de|do|da|pra|para|e|com|no|na|quero|preciso)\s*$/i.test(textoAcumulado.trim())

  if (fragmento || terminaIncompleto) {
    return BUFFER_BASE_TIMEOUT_MS + BUFFER_EXTENSION_MS
  }

  const temCat = Boolean(resolverCategoria(textoAcumulado))
  const temBairro = Boolean(resolverBairro(textoAcumulado))
  if (temCat && temBairro) {
    return Math.min(BUFFER_BASE_TIMEOUT_MS, 2000)
  }

  return BUFFER_BASE_TIMEOUT_MS
}

export function adicionarAoBuffer(
  telefone: string,
  item: ItemBuffer,
  nome: string,
  onProcessar: CallbackProcessar
): void {
  if (mensagensProcessadas.has(item.messageId)) return
  mensagensProcessadas.add(item.messageId)
  setTimeout(() => mensagensProcessadas.delete(item.messageId), 24 * 60 * 60 * 1000)

  item.timestamp = Date.now()
  const entrada = buffers.get(telefone)

  if (entrada) {
    entrada.epoch += 1
    entrada.atualizado = Date.now()

    if (entrada.processando) {
      entrada.proximoLote.push(item)
      return
    }

    clearTimeout(entrada.timeout)
    entrada.aguardandoAudio = false
    entrada.itens.push(item)

    const textoAcumulado = entrada.itens.map(i => i.conteudo).join(" ")
    const janelaAdaptativa = calcularJanelaAdaptativa(textoAcumulado)

    entrada.timeout = setTimeout(() => {
      processarBuffer(telefone, nome, onProcessar)
    }, janelaAdaptativa)
    return
  }

  const agora = Date.now()
  const janelaInicial = calcularJanelaAdaptativa(item.conteudo)

  const novaEntrada: EntradaBuffer = {
    itens: [item],
    timeout: setTimeout(() => {
      processarBuffer(telefone, nome, onProcessar)
    }, janelaInicial),
    maxTimeout: setTimeout(() => {
      processarBuffer(telefone, nome, onProcessar)
    }, BUFFER_MAX_TIMEOUT_MS),
    nome,
    iniciado: agora,
    atualizado: agora,
    processando: false,
    aguardandoAudio: false,
    epoch: 1,
    proximoLote: [],
    onProcessar,
  }

  buffers.set(telefone, novaEntrada)
}

export function resolverAudioPendente(
  telefone: string,
  messageId: string,
  transcricao: string | null
): void {
  const entrada = buffers.get(telefone)
  if (!entrada) return

  const item = [...entrada.itens, ...entrada.proximoLote].find(
    candidato => candidato.messageId === messageId && candidato.pendente
  )
  if (!item) return

  item.tipo = "texto"
  item.conteudo = transcricao?.trim() ?? ""
  item.pendente = false

  if (!entrada.processando && entrada.aguardandoAudio && !entrada.itens.some(candidato => candidato.pendente)) {
    entrada.aguardandoAudio = false
    void processarBuffer(telefone, entrada.nome, entrada.onProcessar)
  }
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
  if (entrada.itens.some(item => item.pendente)) {
    entrada.aguardandoAudio = true
    return
  }

  clearTimeout(entrada.timeout)
  clearTimeout(entrada.maxTimeout)

  const lockId = adquirirLockContato(telefone)
  if (!lockId) {
    entrada.timeout = setTimeout(() => {
      processarBuffer(telefone, nome, onProcessar)
    }, 1000)
    return
  }

  entrada.processando = true
  const epochCapturado = entrada.epoch
  const itens = [...entrada.itens]
  entrada.itens = []

  const lote: LoteProcessamento = {
    turn_id: crypto.randomUUID(),
    batch_epoch: epochCapturado,
    telefone,
    nome,
    itens,
  }

  try {
    await onProcessar(lote)
  } catch (err) {
    console.error("[buffer] Erro ao processar lote:", err)
  } finally {
    liberarLockContato(telefone, lockId)

    const entradaAtual = buffers.get(telefone)
    if (entradaAtual && entradaAtual.proximoLote.length > 0) {
      const proximo = entradaAtual.proximoLote
      entradaAtual.itens = proximo
      entradaAtual.proximoLote = []
      entradaAtual.processando = false
      entradaAtual.aguardandoAudio = false
      entradaAtual.iniciado = Date.now()
      entradaAtual.atualizado = Date.now()

      const texto = entradaAtual.itens.map(i => i.conteudo).join(" ")
      const janela = calcularJanelaAdaptativa(texto)

      entradaAtual.timeout = setTimeout(() => {
        processarBuffer(telefone, nome, onProcessar)
      }, janela)
      entradaAtual.maxTimeout = setTimeout(() => {
        processarBuffer(telefone, nome, onProcessar)
      }, BUFFER_MAX_TIMEOUT_MS)
    } else {
      buffers.delete(telefone)
    }
  }
}
