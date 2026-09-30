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
  profissionalEncontrado(profs: Profissional[], categoria: string, bairro: string, proximoServico?: string | null): string {
    const header = `Ótima notícia! Encontrei opções de profissionais para você 🎉\n`

    const lista = profs.map(prof => {
      const bairros = prof.bairros.length > 0 ? prof.bairros.join(", ") : "Bauru e região"
      const item = [
        `👷 *${prof.nome}*`,
        `🔧 ${categoria}`,
        `📍 Atende: ${bairros}`,
        `📱 ${prof.whatsapp}`,
      ]
      if (prof.linkContato) {
        item.push(`👉 *Falar no WhatsApp:* ${prof.linkContato}`)
      }
      return item.join("\n")
    }).join("\n\n")

    const nota = `_A Profiza indica profissionais cadastrados; o serviço é combinado diretamente com eles._`

    const fechamento = proximoServico
      ? `Entre em contato diretamente e mencione que veio pelo Profiza! Posso buscar também profissionais de *${proximoServico}*?`
      : "Entre em contato diretamente e mencione que veio pelo Profiza! Se precisar de mais contatos, é só pedir!"
    return `${header}\n${lista}\n\n${nota}\n\n${fechamento}`
  },

  // Profissional encontrado mas em bairro diferente (fallback)
  profissionalFallback(profs: Profissional[], categoria: string, bairroSolicitado: string, proximoServico?: string | null): string {
    const header = `Encontrei profissionais de *${categoria}*, mas talvez não atendam ${bairroSolicitado} ainda.\n`

    const lista = profs.map(prof => {
      const bairros = prof.bairros.length > 0 ? prof.bairros.join(", ") : "Bauru e região"
      const item = [
        `👷 *${prof.nome}*`,
        `📍 Atende: ${bairros}`,
        `📱 ${prof.whatsapp}`,
      ]
      if (prof.linkContato) {
        item.push(`👉 *Falar no WhatsApp:* ${prof.linkContato}`)
      }
      return item.join("\n")
    }).join("\n\n")

    const nota = `_A Profiza indica profissionais cadastrados; o serviço é combinado diretamente com eles._`

    const fechamento = proximoServico
      ? `Vale perguntar se eles conseguem atender sua região! 😊 Posso buscar também profissionais de *${proximoServico}*?`
      : "Vale perguntar se eles conseguem atender sua região! 😊 Se precisar de mais contatos, é só pedir!"
    return `${header}\n${lista}\n\n${nota}\n\n${fechamento}`
  },

  pedirFeedbackCliente(categoria: string, nomeProfissional: string): string {
    return [
      `Olá! Há 2 dias te indicamos o profissional *${nomeProfissional}* para *${categoria}*.`,
      ``,
      `Como foi seu atendimento? Responda com uma das opções:`,
      `👍 - Deu tudo certo!`,
      `👎 - Tive problemas / Não fui atendido`,
    ].join("\n")
  },

  agradecerFeedbackClientePositivo(): string {
    return "Que ótimo saber que deu tudo certo! Obrigado pelo seu feedback. Se precisar de outros profissionais, conte com a Profiza! 😊"
  },

  agradecerFeedbackClienteNegativo(): string {
    return [
      "Lamentamos pelo ocorrido! Registramos seu relato para nossa equipe verificar o cadastro do profissional.",
      "",
      "Se desejar, podemos te indicar outro profissional para este serviço. É só me avisar! 🙏",
    ].join("\n")
  },

  // Nenhum profissional encontrado
  semMatch(categoria: string, bairro: string | null, templateCustomizado?: string, proximoServico?: string | null): string {
    const local = bairro ? ` em ${bairro}` : ""
    let resposta: string
    if (templateCustomizado) {
      resposta = templateCustomizado
        .replace(/\{categoria\}/g, categoria)
        .replace(/\{local\}/g, local)
    } else {
      resposta = [
        `Ainda não temos um profissional de *${categoria}*${local} cadastrado. 😕`,
        ``,
        `Vou registrar sua solicitação e assim que tivermos alguém disponível na sua região, te avisamos!`,
        ``,
        `Obrigado por usar o Profiza 🙏`,
      ].join("\n")
    }
    return proximoServico ? `${resposta}\n\nPosso buscar também profissionais de *${proximoServico}*?` : resposta
  },

  // Não entendeu a mensagem (sem categoria)
  naoEntendeu(categoriasTexto?: string): string {
    return [
      `Olá! Sou o assistente da *Profiza*.`,
      ``,
      `Me diga o serviço que precisa e o bairro em Bauru que eu encontro o profissional ideal para você! 🔧👷`,
    ].join("\n")
  },

  categoriaAmbigua(opcoes: string[]): string {
    return `Para eu acertar: qual serviço você precisa: ${opcoes.join(" ou ")}?`
  },

  confirmarOrdem(opcoes: string[]): string {
    const ordem = opcoes.length > 2
      ? `${opcoes.slice(0, -1).join(", ")} e ${opcoes.at(-1)}`
      : opcoes.join(" e ")
    return `Anotei: ${ordem}. Vou começar por *${opcoes[0]}* e depois buscar os demais. Posso seguir nessa ordem?`
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

  reclamacaoRegistrada(): string {
    return [
      "Registrei sua reclamação e nossa equipe vai analisar. 🙏",
      "",
      "Um atendente entrará em contato em breve.",
    ].join("\n")
  },

  aguardeAtendente(): string {
    return [
      "Entendido! Vou chamar um atendente para te ajudar. 👋",
      "",
      "Nossa equipe atende de segunda a sexta, 8h–18h, e sábado, 8h–12h.",
      "Fora desse horário, retornamos no próximo dia útil.",
    ].join("\n")
  },

  foraDeBauru(): string {
    return [
      "Obrigado por compartilhar sua localização! 📍",
      "",
      "Por enquanto a Profiza atende apenas Bauru/SP.",
      "Quer que eu te avise quando chegarmos na sua cidade? 😊",
    ].join("\n")
  },
}
