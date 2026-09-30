import type { Profissional } from "./supabase"

export const mensagens = {
  feedbackProfissional(categoria: string, bairro: string): string {
    return [
      `Você recebeu uma oportunidade de *${categoria}* em *${bairro}*.`,
      `Como está o atendimento? Responda com uma opção:`,
      `1 - Cliente respondeu`,
      `2 - Orçamento enviado`,
      `3 - Serviço fechado`,
      `4 - Cliente não respondeu`,
      `5 - Contato inválido`,
    ].join("\n")
  },

  feedbackRegistrado(label: string): string {
    return `Obrigado! Registramos: *${label}*. Isso ajuda a melhorar suas oportunidades no Profiza.`
  },

  semFeedbackPendente(): string {
    return "Não encontrei uma oportunidade pendente para atualizar. Quando receber um novo contato, enviarei uma nova pergunta."
  },

  relatorioSemanal(input: {
    nome: string
    total: number
    clientesResponderam: number
    orcamentos: number
    servicosFechados: number
    bairros: string[]
  }): string {
    const bairros = input.bairros.length > 0 ? input.bairros.join(", ") : "não informado"
    return [
      `Olá, *${input.nome}*! Aqui está seu resumo semanal Profiza:`,
      ``,
      `📩 Oportunidades recebidas: *${input.total}*`,
      `💬 Clientes que responderam: *${input.clientesResponderam}*`,
      `🧾 Orçamentos enviados: *${input.orcamentos}*`,
      `✅ Serviços fechados: *${input.servicosFechados}*`,
      `📍 Regiões: ${bairros}`,
      ``,
      `Para atualizar uma oportunidade, responda à mensagem que recebeu com uma das opções numeradas.`,
      `Sua assinatura continua ativa e você pode ampliar seus bairros de atendimento quando quiser.`,
    ].join("\n")
  },

  // Profissional encontrado com match exato (categoria + bairro)
  profissionalEncontrado(profs: Profissional[], categoria: string, bairro: string): string {
    const header = `Ótima notícia! Encontrei opções de profissionais para você 🎉\n`

    const lista = profs.map(prof => {
      const bairros = prof.bairros.join(", ")
      return [
        `👷 *${prof.nome}*`,
        `🔧 ${categoria}`,
        `📍 Atende: ${bairros}`,
        `📱 ${prof.whatsapp}`
      ].join("\n")
    }).join("\n\n")

    return `${header}\n${lista}\n\nEntre em contato diretamente pelo WhatsApp e mencione que veio pelo Profiza! Se precisar de mais contatos, é só pedir!`
  },

  // Profissional encontrado mas em bairro diferente (fallback)
  profissionalFallback(profs: Profissional[], categoria: string, bairroSolicitado: string): string {
    const header = `Encontrei profissionais de *${categoria}*, mas talvez não atendam ${bairroSolicitado} ainda.\n`

    const lista = profs.map(prof => {
      const bairros = prof.bairros.join(", ")
      return [
        `👷 *${prof.nome}*`,
        `📍 Atende: ${bairros}`,
        `📱 ${prof.whatsapp}`
      ].join("\n")
    }).join("\n\n")

    return `${header}\n${lista}\n\nVale perguntar se eles conseguem atender sua região! 😊 Se precisar de mais contatos, é só pedir!`
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
      `Olá! Sou o assistente da *Profiza*.`,
      ``,
      `Me diga o serviço que precisa e o bairro em Bauru que eu encontro o profissional ideal para você! 🔧👷`,
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

  emergencia(): string {
    return [
      "⚠️ Isso parece uma emergência!",
      "",
      "Acione imediatamente:",
      "🚒 Bombeiros: 193",
      "🚑 SAMU: 192",
      "",
      "Depois que estiver seguro, me avise que indico um profissional para o reparo! 🔧",
    ].join("\n")
  },

  cadastroProfissional(): string {
    return [
      "Quer se cadastrar como profissional na Profiza? 👷",
      "",
      "Acesse: profiza.net/cadastro",
      "",
      "30 dias grátis, depois R$ 29,90/mês. Cancelamento a qualquer momento!",
    ].join("\n")
  },

  foraEscopo(): string {
    return "Sou especializado em indicar profissionais em Bauru. Me conta qual serviço você precisa e em qual bairro! 🔧👷"
  },
}
