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
  profissionalEncontrado(
    profs: Profissional[],
    categoria: string,
    bairro: string,
    proximoServico?: string | null,
    urgente?: boolean | null,
    prioridadeMatch: 1 | 2 | null = 1
  ): string {
    const header = prioridadeMatch === 2
      ? `Não encontrei profissionais de *${categoria}* no bairro *${bairro}*, mas achei opções em outros bairros da mesma região.\n`
      : `Ótima notícia! Encontrei opções de profissionais para você 🎉\n`

    const lista = profs.map(prof => {
      const bairros = prof.bairros.length > 0 ? prof.bairros.join(", ") : "confirme a cobertura com o profissional"
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
    const observacaoUrgencia = urgente === true
      ? "\n\nEntendi que é urgente. Confirme diretamente com o profissional o prazo de atendimento."
      : urgente === false
        ? "\n\nAnotei que pode aguardar. Combine o prazo diretamente com o profissional."
        : ""

    const fechamento = proximoServico
      ? `Entre em contato diretamente e mencione que veio pelo Profiza! Posso buscar também profissionais de *${proximoServico}*? Se houver um prazo importante, me conte também.`
      : urgente === null
        ? "O atendimento é urgente ou pode aguardar? Se precisar de mais opções, é só pedir!"
        : "Entre em contato diretamente e mencione que veio pelo Profiza! Se precisar de mais contatos, é só pedir!"
    return `${header}\n${lista}\n\n${nota}${observacaoUrgencia}\n\n${fechamento}`
  },

  // Profissional encontrado mas em bairro diferente (fallback)
  profissionalFallback(profs: Profissional[], categoria: string, bairroSolicitado: string, proximoServico?: string | null, urgente?: boolean | null): string {
    const header = `Encontrei profissionais de *${categoria}*, mas talvez não atendam ${bairroSolicitado} ainda.\n`

    const lista = profs.map(prof => {
      const bairros = prof.bairros.length > 0 ? prof.bairros.join(", ") : "confirme a cobertura com o profissional"
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
    const observacaoUrgencia = urgente === true
      ? "\n\nEntendi que é urgente. Confirme diretamente com o profissional se ele consegue atender no prazo que você precisa."
      : urgente === false
        ? "\n\nAnotei que pode aguardar. Combine o prazo diretamente com o profissional."
        : ""

    const fechamento = proximoServico
      ? `Vale confirmar se eles atendem sua região. Posso buscar também profissionais de *${proximoServico}*? Se houver um prazo importante, me conte também.`
      : urgente === null
        ? "Vale confirmar se eles atendem sua região. O atendimento é urgente ou pode aguardar? Se precisar de mais opções, é só pedir!"
        : "Vale confirmar se eles atendem sua região. 😊 Se precisar de mais contatos, é só pedir!"
    return `${header}\n${lista}\n\n${nota}${observacaoUrgencia}\n\n${fechamento}`
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

  pedirServico(): string {
    return "Claro, o que você precisa resolver? Pode me explicar do seu jeito."
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
      `Claro, vou te ajudar a encontrar um profissional de *${categoria}*.`,
      ``,
      `Em qual bairro de Bauru fica o serviço? Se tiver um prazo importante, pode me contar também.`,
    ].join("\n")
  },

  confirmarBairro(candidato: string, bairroOficial: string): string {
    return `Você quis dizer *${bairroOficial}*, em vez de *${candidato}*? Se sim, pode responder “sim”; se não, me diga outro bairro ou uma referência próxima.`
  },

  bairroNaoEncontrado(candidato: string): string {
    return `Não consegui confirmar *${candidato}* como bairro de Bauru. Pode me dizer outro nome de bairro ou um ponto de referência próximo?`
  },

  bairroAindaNaoConfirmado(candidato: string): string {
    return `Ainda não consegui confirmar *${candidato}*. Vou pedir ajuda à equipe para localizar a região certa.`
  },

  naoConseguiValidarBairro(): string {
    return "Não consegui validar esse bairro agora por uma falha temporária. Seu pedido continua salvo; tente novamente em alguns instantes."
  },

  atualizarUrgenciaSemMatch(categoria: string, bairro: string, urgente: boolean): string {
    const prazo = urgente ? "Entendi que você precisa com urgência." : "Entendi que pode aguardar."
    return `${prazo} A busca por um profissional de *${categoria}* em *${bairro}* já foi feita, mas ainda não encontrei alguém cadastrado nessa região. Não vou repetir a mesma busca; posso tentar outra região se você preferir.`
  },

  atualizarUrgenciaComMatch(urgente: boolean): string {
    return urgente
      ? "Entendi que você precisa com urgência. Os contatos já foram enviados; confirme diretamente com os profissionais se conseguem atender no prazo que precisa."
      : "Entendi, você pode aguardar. Os contatos já foram enviados; combine o prazo diretamente com os profissionais."
  },

  continuarPedido(categoria: string, bairro: string | null): string {
    const local = bairro ? ` em *${bairro}*` : ""
    return `Ainda estou com seu pedido de *${categoria}*${local}. Você quer tentar outra região ou procurar outro serviço?`
  },

  buscaIndisponivel(): string {
    return "Não consegui consultar os profissionais agora por uma falha temporária. Seu pedido não foi marcado como sem profissionais; tente novamente em alguns instantes."
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
