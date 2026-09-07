import { extrairIntencao } from "./ai"
import {
  buscarProfissionais,
  buscarProfissionaisFallback,
  buscarProfissionaisJaEnviados,
  buscarLeadPendenteFeedback,
  buscarProfissionalPorWhatsApp,
  interpretarFeedback,
  registrarFeedbackLead,
  rotuloFeedback,
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
  console.log(`[bot] Mensagem agrupada de ${msg.telefone}: "${msg.texto}"`)

  // Mensagens curtas de profissionais são tratadas como feedback antes da IA.
  const profissional = await buscarProfissionalPorWhatsApp(msg.telefone)
  const feedback = profissional ? interpretarFeedback(msg.texto) : null
  if (profissional && feedback) {
    const lead = await buscarLeadPendenteFeedback(profissional.id)
    if (lead) {
      const atualizado = await registrarFeedbackLead(lead.id, feedback)
      if (atualizado) {
        await enviarMensagem(msg.telefone, mensagens.feedbackRegistrado(rotuloFeedback(feedback)))
      }
    } else {
      await enviarMensagem(msg.telefone, mensagens.semFeedbackPendente())
    }
    return
  }

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

  // Se o usuário pedir "mais" contatos (intenção de paginação mapeada pela IA ou mesmo repetindo a busca)
  // mantemos a categoria/bairro e passamos adiante.

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

  // 2. Buscar profissionais já enviados para não repeti-los
  const ignoreIds = await buscarProfissionaisJaEnviados(msg.telefone, categoria)

  // 3. Buscar profissionais com match exato (categoria + bairro)
  const profissionais = await buscarProfissionais(categoria, bairro, ignoreIds, 4)

  if (profissionais.length > 0) {
    const envio = await enviarMensagem(
      msg.telefone,
      mensagens.profissionalEncontrado(profissionais, categoria, bairro)
    )

    // Salva lead e métricas para cada profissional indicado
    for (const prof of profissionais) {
      const leadId = await salvarLead({
        nomeCliente: msg.nome,
        whatsappCliente: msg.telefone,
        categoria,
        bairro,
        profissionalId: prof.id,
        status: "enviado",
        mensagemOriginal: msg.texto,
      })
      if (leadId && envio.messageId) {
        await atualizarLeadMensagemId(leadId, envio.messageId)
      }
      await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
    }

    console.log(`[bot] Leads roteados → ${profissionais.map(p => p.nome).join(", ")}`)
    return
  }

  // 4. Fallback — busca qualquer profissional da categoria (sem filtro de bairro)
  const fallbacks = await buscarProfissionaisFallback(categoria, ignoreIds, 4)

  if (fallbacks.length > 0) {
    const envio = await enviarMensagem(
      msg.telefone,
      mensagens.profissionalFallback(fallbacks, categoria, bairro)
    )

    for (const fallback of fallbacks) {
      const leadId = await salvarLead({
        nomeCliente: msg.nome,
        whatsappCliente: msg.telefone,
        categoria,
        bairro,
        profissionalId: fallback.id,
        status: "enviado",
        mensagemOriginal: msg.texto,
      })
      if (leadId && envio.messageId) {
        await atualizarLeadMensagemId(leadId, envio.messageId)
      }
      await enviarMensagem(fallback.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
    }

    console.log(`[bot] Leads roteados via fallback → ${fallbacks.map(f => f.nome).join(", ")}`)
    return
  }

  // 5. Sem match nenhum (ou acabaram as opções) — registra como sem_resposta
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
  console.log(`[bot] Sem match para ${categoria} em ${bairro} (ou lista esgotada)`)
}
