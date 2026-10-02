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
    prioridadeMatch: 1 | 2 | null = 1,
    incluirNotaInstitucional: boolean = true
  ): string {
    const header = prioridadeMatch === 2
      ? `Não encontrei profissionais de *${categoria}* cadastrados diretamente no bairro *${bairro}*, mas estes atendem a sua região:\n`
      : `Ótima notícia! Encontrei opções de profissionais para você 🎉\n`

    const lista = profs.map(prof => {
      const bairros = prof.bairros.length > 0 ? prof.bairros.join(", ") : "atende a região"
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

    const nota = incluirNotaInstitucional
      ? `\n\n_A Profiza indica profissionais cadastrados; o serviço é combinado diretamente com eles._`
      : ""

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

    return `${header}\n${lista}${nota}${observacaoUrgencia}\n\n${fechamento}`
  },

  // Profissional encontrado mas em cobertura municipal (fallback)
  profissionalFallback(
    profs: Profissional[],
    categoria: string,
    bairroSolicitado: string,
    proximoServico?: string | null,
    urgente?: boolean | null,
    incluirNotaInstitucional: boolean = true
  ): string {
    const header = `Não encontrei profissionais de *${categoria}* apenas no bairro *${bairroSolicitado}*, mas estes profissionais atendem a cidade toda:\n`

    const lista = profs.map(prof => {
      const bairros = prof.bairros.length > 0 ? prof.bairros.join(", ") : "atende a cidade toda"
      const item = [
        `👷 *${prof.nome}*`,
        `📍 Cobertura: ${bairros}`,
        `📱 ${prof.whatsapp}`,
      ]
      if (prof.linkContato) {
        item.push(`👉 *Falar no WhatsApp:* ${prof.linkContato}`)
      }
      return item.join("\n")
    }).join("\n\n")

    const nota = incluirNotaInstitucional
      ? `\n\n_A Profiza indica profissionais cadastrados; o serviço é combinado diretamente com eles._`
      : ""

    const observacaoUrgencia = urgente === true
      ? "\n\nEntendi que é urgente. Confirme diretamente com o profissional se ele consegue atender no prazo que você precisa."
      : urgente === false
        ? "\n\nAnotei que pode aguardar. Combine o prazo diretamente com o profissional."
        : ""

    const fechamento = proximoServico
      ? `Posso buscar também profissionais de *${proximoServico}*? Se houver um prazo importante, me conte também.`
      : urgente === null
        ? "O atendimento é urgente ou pode aguardar? Se precisar de mais opções, é só pedir!"
        : "Se precisar de mais contatos, é só pedir!"

    return `${header}\n${lista}${nota}${observacaoUrgencia}\n\n${fechamento}`
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

  // Ausência de resultado em conformidade com o Invariante I-11 (sem promessa de aviso futuro sem opt-in)
  semMatch(categoria: string, bairro: string | null, templateCustomizado?: string, proximoServico?: string | null): string {
    const local = bairro ? ` em *${bairro}*` : ""
    let resposta: string
    if (templateCustomizado) {
      resposta = templateCustomizado
        .replace(/\{categoria\}/g, categoria)
        .replace(/\{local\}/g, local)
    } else {
      resposta = [
        `No momento não encontrei profissionais disponíveis de *${categoria}*${local} na nossa base.`,
        ``,
        `Registrei a sua procura para priorizarmos o cadastro de novos profissionais nessa área.`,
        `Se você quiser tentar outro bairro ou buscar outro serviço, estou à disposição!`,
      ].join("\n")
    }
    return proximoServico ? `${resposta}\n\nPosso buscar também profissionais de *${proximoServico}*?` : resposta
  },

  naoEntendeu(): string {
    return [
      `Olá! Sou o assistente da *Profiza*.`,
      ``,
      `Me diga o serviço que precisa e o bairro em Bauru que eu encontro o profissional ideal para você! 🔧👷`,
    ].join("\n")
  },

  pedirServico(): string {
    return "Claro, qual serviço você precisa resolver? Pode me explicar do seu jeito."
  },

  categoriaAmbigua(opcoes: string[]): string {
    return `Para eu te indicar o profissional certo: qual serviço você precisa: ${opcoes.join(" ou ")}?`
  },

  confirmarOrdem(opcoes: string[]): string {
    const ordem = opcoes.length > 2
      ? `${opcoes.slice(0, -1).join(", ")} e ${opcoes.at(-1)}`
      : opcoes.join(" e ")
    return `Anotei: ${ordem}. Vou começar por *${opcoes[0]}* e depois buscar os demais. Posso seguir nessa ordem?`
  },

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
    return `Você quis dizer *${bairroOficial}*? Se for, pode responder “sim”; se for outro bairro, me diga o nome ou um ponto de referência próximo.`
  },

  desambiguarBairros(opcoes: Array<{ nome: string; regiao: string }>): string {
    const lista = opcoes.map((o, idx) => `${idx + 1}. *${o.nome}* (${o.regiao})`).join("\n")
    return `Encontrei mais de um bairro parecido. Qual deles é o seu?\n\n${lista}\n\nPode responder com o número ou o nome.`
  },

  bairroNaoEncontrado(candidato: string): string {
    return `Não achei exatamente o nome *${candidato}*. Pode me dizer um ponto de referência próximo, uma avenida conhecida ou a região (Norte, Sul, Centro, etc.)?`
  },

  bairroAindaNaoConfirmado(candidato: string): string {
    return `Ainda não consegui confirmar a localização exata de *${candidato}*. Vou pedir ajuda para a nossa equipe entrar em contato e localizar a região certa.`
  },

  naoConseguiValidarBairro(): string {
    return "Tive uma instabilidade temporária ao consultar os bairros. Seu pedido continua salvo; tente novamente em alguns instantes."
  },

  atualizarUrgenciaSemMatch(categoria: string, bairro: string, urgente: boolean): string {
    const prazo = urgente ? "Entendi que você precisa com urgência." : "Entendi que pode aguardar."
    return `${prazo} A busca por um profissional de *${categoria}* em *${bairro}* já foi feita, mas não encontramos profissionais nessa região. Posso tentar buscar em outra região se você preferir.`
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
    return "Não consegui consultar os profissionais agora por uma instabilidade temporária no sistema. Por favor, tente novamente em alguns instantes."
  },

  erroInterno(): string {
    return "Desculpe, tive um problema técnico. Tente novamente em alguns instantes. 🙏"
  },

  emergencia(): string {
    return [
      "⚠️ Isso parece uma emergência!",
      "",
      "Afaste-se do local de risco e acione imediatamente:",
      "🚒 Bombeiros: 193",
      "🚑 SAMU: 192",
      "",
      "Assim que estiver em segurança, me avise por aqui para indicar um profissional para o reparo! 🔧",
    ].join("\n")
  },

  cadastroProfissional(): string {
    return [
      "Quer se cadastrar como profissional na Profiza? 👷",
      "",
      "Acesse: profiza.net/cadastro",
      "",
      "Cadastre seus dados e categorias de atendimento para receber pedidos diretamente no seu WhatsApp!",
    ].join("\n")
  },

  comoFunciona(): string {
    return [
      "A *Profiza* conecta você diretamente a profissionais de serviços verificados em Bauru/SP.",
      "",
      "1. Você me diz o serviço e o bairro.",
      "2. Eu indico profissionais cadastrados que atendem sua região.",
      "3. O orçamento e o pagamento são combinados diretamente entre você e o profissional, sem taxas para o cliente.",
      "",
      "Me diga: qual serviço você precisa hoje? 🔧",
    ].join("\n")
  },

  perguntaPreco(): string {
    return [
      "A Profiza não define preços fixos para os serviços. Os valores variam conforme o trabalho e são combinados diretamente com o profissional indicado.",
      "",
      "Quer que eu indique os profissionais disponíveis para você solicitar um orçamento sem compromisso?",
    ].join("\n")
  },

  qualOMelhor(): string {
    return [
      "Nossas indicações priorizam profissionais verificados mais próximos do seu bairro e região, distribuindo as oportunidades de forma justa.",
      "",
      "Qual serviço e bairro você gostaria de consultar?",
    ].join("\n")
  },

  foraEscopo(): string {
    return "Sou especializado em indicar profissionais de serviços (eletricista, encanador, pintor, etc.) em Bauru/SP. Me conta qual reparo ou serviço você precisa! 🔧👷"
  },

  reclamacaoRegistrada(): string {
    return [
      "Registrei sua reclamação e nossa equipe vai analisar com prioridade. 🙏",
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
      "Se tiver algum serviço para realizar em Bauru, é só me avisar! 😊",
    ].join("\n")
  },

  reparoFrustracao(bairroResolvido?: string | null): string {
    if (bairroResolvido) {
      return `Desculpe a confusão! Já anotei que é no *${bairroResolvido}*. Buscando os profissionais agora...`
    }
    return `Peço desculpas pela repetição! Vamos direto ao ponto: me informe apenas o que precisa e eu busco para você.`
  },
}
