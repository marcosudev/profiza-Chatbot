import type { Profissional } from "./supabase"

export const mensagens = {
  // Profissional encontrado com match exato (categoria + bairro)
  profissionalEncontrado(prof: Profissional, categoria: string, bairro: string, templateCustomizado?: string): string {
    const bairros = prof.bairros.join(", ")
    if (templateCustomizado) {
      return templateCustomizado
        .replace(/\{nome\}/g, prof.nome)
        .replace(/\{categoria\}/g, categoria)
        .replace(/\{bairros\}/g, bairros)
        .replace(/\{whatsapp\}/g, prof.whatsapp)
    }
    return [
      `Ótima notícia! Encontrei um profissional para você 🎉`,
      ``,
      `👷 *${prof.nome}*`,
      `🔧 ${categoria}`,
      `📍 Atende: ${bairros}`,
      `📱 ${prof.whatsapp}`,
      ``,
      `Entre em contato diretamente pelo WhatsApp e mencione que veio pelo Profiza!`,
    ].join("\n")
  },

  // Profissional encontrado mas em bairro diferente (fallback)
  profissionalFallback(prof: Profissional, categoria: string, bairroSolicitado: string, templateCustomizado?: string): string {
    const bairros = prof.bairros.join(", ")
    if (templateCustomizado) {
      return templateCustomizado
        .replace(/\{nome\}/g, prof.nome)
        .replace(/\{categoria\}/g, categoria)
        .replace(/\{bairros\}/g, bairros)
        .replace(/\{whatsapp\}/g, prof.whatsapp)
    }
    return [
      `Encontrei um profissional de *${categoria}*, mas ele não atende ${bairroSolicitado} ainda.`,
      ``,
      `👷 *${prof.nome}*`,
      `📍 Atende: ${bairros}`,
      `📱 ${prof.whatsapp}`,
      ``,
      `Vale perguntar se ele consegue atender sua região! 😊`,
    ].join("\n")
  },

  // Nenhum profissional encontrado
  semMatch(categoria: string, bairro: string | null, templateCustomizado?: string): string {
    const local = bairro ? ` em ${bairro}` : ""
    if (templateCustomizado) {
      return templateCustomizado
        .replace(/\{categoria\}/g, categoria)
        .replace(/\{local\}/g, local)
    }
    return [
      `Ainda não temos um profissional de *${categoria}*${local} cadastrado. 😕`,
      ``,
      `Vou registrar sua solicitação e assim que tivermos alguém disponível na sua região, te avisamos!`,
      ``,
      `Obrigado por usar o Profiza 🙏`,
    ].join("\n")
  },

  // Não entendeu a mensagem (sem categoria)
  naoEntendeu(categoriasTexto?: string): string {
    return [
      `Olá! Sou o assistente do *Profiza* 👋`,
      ``,
      `Posso te ajudar a encontrar profissionais como:`,
      categoriasTexto || `• Eletricista\n• Encanador\n• Diarista\n• Pedreiro\n• Pintor\n• Limpeza\n• Montador\n• Arquiteto`,
      ``,
      `Me diga o que você precisa e em qual bairro de Bauru. Por exemplo:`,
      `_"Preciso de um eletricista no Centro"_`,
    ].join("\n")
  },

  // Categoria entendida mas bairro não informado
  pedirBairro(categoria: string, templateCustomizado?: string): string {
    if (templateCustomizado) {
      return templateCustomizado.replace(/\{categoria\}/g, categoria)
    }
    return [
      `Entendi, você precisa de um *${categoria}*! 👍`,
      ``,
      `Em qual bairro de Bauru você precisa do serviço?`,
    ].join("\n")
  },

  // Erro interno
  erroInterno(): string {
    return "Desculpe, tive um problema técnico. Tente novamente em alguns instantes. 🙏"
  },
}
