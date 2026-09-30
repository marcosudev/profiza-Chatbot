import { extrairIntencao } from "./ai"
import { carregarSessao, salvarSessao, type Sessao } from "./session"
import {
  buscarProfissionais,
  buscarProfissionaisFallback,
  buscarProfissionalPorWhatsApp,
  buscarLeadPendenteFeedback,
  interpretarFeedback,
  registrarFeedbackLead,
  rotuloFeedback,
  salvarLead,
  atualizarLeadMensagemId,
} from "./supabase"
import { enviarMensagem, enviarPresenca } from "./evolution"
import { mensagens } from "./messages"
import type { ItemBuffer } from "./buffer"

export interface LoteRecebido {
  telefone: string
  nome: string
  itens: ItemBuffer[]
}

export async function processarLote(lote: LoteRecebido): Promise<void> {
  const { telefone, nome, itens } = lote

  // Agrupa textos em ordem cronológica
  const textos = itens
    .filter(i => i.tipo === "texto")
    .map(i => i.conteudo)
    .join("\n")

  if (!textos.trim()) return

  console.log(`[bot] Lote de ${telefone}: "${textos}"`)

  // Indica que está digitando
  await enviarPresenca(telefone, "composing")

  // Verifica se é profissional respondendo feedback
  const profissional = await buscarProfissionalPorWhatsApp(telefone)
  const feedback = profissional ? interpretarFeedback(textos) : null
  if (profissional && feedback) {
    const lead = await buscarLeadPendenteFeedback(profissional.id)
    if (lead) {
      const atualizado = await registrarFeedbackLead(lead.id, feedback)
      if (atualizado) {
        await enviarPresenca(telefone, "paused")
        await enviarMensagem(telefone, mensagens.feedbackRegistrado(rotuloFeedback(feedback)))
      }
    } else {
      await enviarPresenca(telefone, "paused")
      await enviarMensagem(telefone, mensagens.semFeedbackPendente())
    }
    return
  }

  // Carrega sessão persistida
  const sessao = await carregarSessao(telefone)
  if (nome && !sessao.nome) sessao.nome = nome

  // Extrai intenção via IA com RAG
  const intencao = await extrairIntencao(textos, sessao)
  console.log(`[bot] Intenção:`, intencao)

  await enviarPresenca(telefone, "paused")

  // Trata intenções especiais
  if (intencao.intencao === "emergencia") {
    await enviarMensagem(telefone, mensagens.emergencia())
    return
  }

  if (intencao.intencao === "cadastro_profissional") {
    await enviarMensagem(telefone, mensagens.cadastroProfissional())
    return
  }

  if (intencao.intencao === "saudacao" && !intencao.categoria) {
    await enviarMensagem(telefone, mensagens.naoEntendeu())
    return
  }

  if (intencao.intencao === "fora_escopo") {
    await enviarMensagem(telefone, mensagens.foraEscopo())
    return
  }

  // Mescla com sessão anterior
  const categoria = intencao.categoria ?? sessao.categoria
  const bairro = intencao.bairro ?? sessao.bairro
  const regiao = intencao.regiao ?? sessao.regiao

  // Sem categoria — não entendeu
  if (!categoria) {
    sessao.tentativasEsclarecimento++
    await salvarSessao(telefone, sessao)
    await enviarMensagem(telefone, mensagens.naoEntendeu())
    return
  }

  // Tem categoria mas não bairro — pede o bairro
  if (!bairro) {
    sessao.categoria = categoria
    sessao.tentativasEsclarecimento++
    await salvarSessao(telefone, sessao)
    await salvarLead({
      nomeCliente: nome,
      whatsappCliente: telefone,
      categoria,
      bairro: "Não informado",
      profissionalId: null,
      status: "novo",
      mensagemOriginal: textos,
    })
    await enviarMensagem(telefone, mensagens.pedirBairro(categoria))
    return
  }

  // Tem categoria + bairro — busca profissionais
  sessao.categoria = categoria
  sessao.bairro = bairro
  sessao.regiao = regiao
  sessao.tentativasEsclarecimento = 0

  const ignoreIds = sessao.profissionaisIndicados

  // Busca por bairro exato
  const profissionais = await buscarProfissionais(categoria, bairro, ignoreIds, 4)

  if (profissionais.length > 0) {
    const envio = await enviarMensagem(telefone, mensagens.profissionalEncontrado(profissionais, categoria, bairro))
    for (const prof of profissionais) {
      sessao.profissionaisIndicados.push(prof.id)
      const leadId = await salvarLead({
        nomeCliente: nome,
        whatsappCliente: telefone,
        categoria,
        bairro,
        profissionalId: prof.id,
        status: "enviado",
        mensagemOriginal: textos,
      })
      if (leadId && envio.messageId) await atualizarLeadMensagemId(leadId, envio.messageId)
      await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
    }
    await salvarSessao(telefone, sessao)
    console.log(`[bot] Leads → ${profissionais.map(p => p.nome).join(", ")}`)
    return
  }

  // Fallback por região
  const fallbacks = await buscarProfissionaisFallback(categoria, ignoreIds, 4)

  if (fallbacks.length > 0) {
    const envio = await enviarMensagem(telefone, mensagens.profissionalFallback(fallbacks, categoria, bairro))
    for (const prof of fallbacks) {
      sessao.profissionaisIndicados.push(prof.id)
      const leadId = await salvarLead({
        nomeCliente: nome,
        whatsappCliente: telefone,
        categoria,
        bairro,
        profissionalId: prof.id,
        status: "enviado",
        mensagemOriginal: textos,
      })
      if (leadId && envio.messageId) await atualizarLeadMensagemId(leadId, envio.messageId)
      await enviarMensagem(prof.whatsapp, mensagens.feedbackProfissional(categoria, bairro))
    }
    await salvarSessao(telefone, sessao)
    console.log(`[bot] Leads fallback → ${fallbacks.map(f => f.nome).join(", ")}`)
    return
  }

  // Sem match
  await enviarMensagem(telefone, mensagens.semMatch(categoria, bairro))
  await salvarLead({
    nomeCliente: nome,
    whatsappCliente: telefone,
    categoria,
    bairro,
    profissionalId: null,
    status: "sem_resposta",
    mensagemOriginal: textos,
  })
  await salvarSessao(telefone, sessao)
  console.log(`[bot] Sem match para ${categoria} em ${bairro}`)
}
