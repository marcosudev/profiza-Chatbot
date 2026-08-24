import { extrairIntencao } from "./ai"
import {
  buscarProfissional,
  buscarProfissionalFallback,
  salvarLead,
  atualizarLeadMensagemId,
} from "./supabase"
import { enviarMensagem } from "./zapi"
import { mensagens } from "./messages"

export interface MensagemRecebida {
  telefone: string   // número do cliente (E.164)
  nome: string       // nome do contato no WhatsApp
  texto: string      // conteúdo da mensagem
}

// Memória simples de conversa: guarda a última categoria/bairro parcial por telefone
// Expira após 10 minutos de inatividade
interface ContextoConversa {
  categoria: string | null
  bairro: string | null
  timestamp: number
}

const contextos = new Map<string, ContextoConversa>()
const TIMEOUT_CONTEXTO_MS = 10 * 60 * 1000 // 10 minutos

function obterContexto(telefone: string): ContextoConversa | null {
  const ctx = contextos.get(telefone)
  if (!ctx) return null
  if (Date.now() - ctx.timestamp > TIMEOUT_CONTEXTO_MS) {
    contextos.delete(telefone)
    return null
  }
  return ctx
}

function salvarContexto(telefone: string, categoria: string | null, bairro: string | null) {
  contextos.set(telefone, { categoria, bairro, timestamp: Date.now() })
}

function limparContexto(telefone: string) {
  contextos.delete(telefone)
}

export async function processarMensagem(msg: MensagemRecebida): Promise<void> {
  console.log(`[bot] Mensagem de ${msg.telefone}: "${msg.texto}"`)

  // 1. Extrair intenção via IA
  const intencao = await extrairIntencao(msg.texto)
  console.log(`[bot] Intenção:`, intencao)

  // Busca contexto anterior da conversa
  const ctxAnterior = obterContexto(msg.telefone)

  // Mescla com contexto anterior: se a IA não encontrou categoria mas temos do contexto, usa
  let categoria = intencao.categoria ?? ctxAnterior?.categoria ?? null
  let bairro = intencao.bairro ?? ctxAnterior?.bairro ?? null

  console.log(`[bot] Contexto final: categoria=${categoria}, bairro=${bairro}`)

  // Não entendeu nada e não tem contexto — pede para reformular
  if (!categoria) {
    await enviarMensagem(msg.telefone, mensagens.naoEntendeu())
    return
  }

  // Entendeu categoria mas não bairro — pede o bairro e salva contexto
  if (!bairro) {
    salvarContexto(msg.telefone, categoria, null)
    await enviarMensagem(msg.telefone, mensagens.pedirBairro(categoria))
    await salvarLead({
      nomeCliente: msg.nome,
      whatsappCliente: msg.telefone,
      categoria,
      bairro: "Não informado",
      profissionalId: null,
      status: "novo",
      mensagemOriginal: msg.texto,
    })
    return
  }

  // Temos categoria + bairro — limpa contexto e busca profissional
  limparContexto(msg.telefone)

  // 2. Buscar profissional com match exato (categoria + bairro)
  const profissional = await buscarProfissional(categoria, bairro)

  if (profissional) {
    const envio = await enviarMensagem(
      msg.telefone,
      mensagens.profissionalEncontrado(profissional, categoria, bairro)
    )
    const leadId = await salvarLead({
      nomeCliente: msg.nome,
      whatsappCliente: msg.telefone,
      categoria,
      bairro,
      profissionalId: profissional.id,
      status: "enviado",
      mensagemOriginal: msg.texto,
    })
    // Salva messageId para rastrear entrega e cobrar
    if (leadId && envio.messageId) {
      await atualizarLeadMensagemId(leadId, envio.messageId)
    }
    console.log(`[bot] Lead roteado → ${profissional.nome}`)
    return
  }

  // 3. Fallback — busca qualquer profissional da categoria (sem filtro de bairro)
  const fallback = await buscarProfissionalFallback(categoria)

  if (fallback) {
    const envio = await enviarMensagem(
      msg.telefone,
      mensagens.profissionalFallback(fallback, categoria, bairro)
    )
    const leadId = await salvarLead({
      nomeCliente: msg.nome,
      whatsappCliente: msg.telefone,
      categoria,
      bairro,
      profissionalId: fallback.id,
      status: "enviado",
      mensagemOriginal: msg.texto,
    })
    // Salva messageId para rastrear entrega e cobrar
    if (leadId && envio.messageId) {
      await atualizarLeadMensagemId(leadId, envio.messageId)
    }
    console.log(`[bot] Lead roteado via fallback → ${fallback.nome}`)
    return
  }

  // 4. Sem match nenhum — registra como sem_resposta
  await enviarMensagem(
    msg.telefone,
    mensagens.semMatch(categoria, bairro)
  )
  await salvarLead({
    nomeCliente: msg.nome,
    whatsappCliente: msg.telefone,
    categoria,
    bairro,
    profissionalId: null,
    status: "sem_resposta",
    mensagemOriginal: msg.texto,
  })
  console.log(`[bot] Sem match para ${categoria} em ${bairro}`)
}
