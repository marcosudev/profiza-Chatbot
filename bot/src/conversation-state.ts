interface UrgencyFollowupInput {
  buscaConcluida: boolean
  urgenciaMencionada: boolean | null
  categoriaMencionada: boolean
  bairroMencionado: boolean
  intencao: string
}

interface NovoPedidoInput {
  buscaConcluida: boolean
  aguardandoConfirmacaoServico: boolean
  categoriaMencionada: boolean
  intencao: string
}

interface BuscaRepetidaInput {
  buscaConcluida: boolean
  aguardandoConfirmacaoServico: boolean
  categoriaMencionada: boolean
  bairroMencionado: boolean
  urgenciaMencionada: boolean | null
  intencao: string
}

interface NovoPedidoIncompletoInput {
  buscaConcluida: boolean
  categoriaMencionada: boolean
  intencao: string
  mensagem: string
}

interface RespostaPendenteInput {
  perguntaPendente: string | null | undefined
  categoriaMencionada: boolean
  bairroMencionado: boolean
  bairroCandidato: boolean
  urgenciaMencionada: boolean | null
  confirmouSugestao: boolean
  recusouSugestao: boolean
  refereSugestao: boolean
  fragmentoDePedido: boolean
}

export function deveAtualizarSomenteUrgencia(input: UrgencyFollowupInput): boolean {
  return input.buscaConcluida
    && input.urgenciaMencionada !== null
    && !input.categoriaMencionada
    && !input.bairroMencionado
    && input.intencao !== "mais_opcoes"
}

export function deveIniciarNovoPedido(input: NovoPedidoInput): boolean {
  return input.buscaConcluida
    && !input.aguardandoConfirmacaoServico
    && input.categoriaMencionada
    && input.intencao !== "mais_opcoes"
}

export function deveEvitarBuscaRepetida(input: BuscaRepetidaInput): boolean {
  return input.buscaConcluida
    && !input.aguardandoConfirmacaoServico
    && !input.categoriaMencionada
    && !input.bairroMencionado
    && input.urgenciaMencionada === null
    && input.intencao !== "mais_opcoes"
}

export function deveAbrirNovoPedidoSemCategoria(input: NovoPedidoIncompletoInput): boolean {
  if (!input.buscaConcluida || input.categoriaMencionada || input.intencao === "mais_opcoes") {
    return false
  }

  const mensagem = input.mensagem
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()

  return /^(oi )?(quero|preciso|necessito|procuro|busco)( (de|do|da|um|uma|uns|umas|servico))*$/.test(mensagem)
}

export function ehFragmentoDePedido(mensagem: string): boolean {
  const texto = mensagem
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()

  return /^(quero|preciso|necessito|um|uma|uns|umas|de|do|da|o|a|por favor)$/.test(texto)
}

export function confirmouBairroSugerido(mensagem: string): boolean {
  const texto = mensagem
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()

  return /^(sim|isso|exatamente|correto|esse mesmo|e esse|e esse mesmo)$/.test(texto)
}

export function recusouBairroSugerido(mensagem: string): boolean {
  const texto = mensagem
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return /^(nao|nao esse|nao e esse|nao e esse bairro|nao outro bairro|outro bairro|bairro errado)$/.test(texto)
}

export function refereBairroSugerido(mensagem: string, bairroSugerido: string): boolean {
  const normalizarPalavras = (valor: string) => valor
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const palavrasGenericas = new Set(["bairro", "jardim", "vila", "parque", "nucleo", "conjunto", "residencial"])
  const palavrasSugeridas = normalizarPalavras(bairroSugerido)
    .split(" ")
    .filter(palavra => palavra.length >= 4 && !palavrasGenericas.has(palavra))
  const palavrasMensagem = new Set(normalizarPalavras(mensagem).split(" "))

  return palavrasSugeridas.some(palavra => palavrasMensagem.has(palavra))
}

export function deveTratarComoRespostaPendente(input: RespostaPendenteInput): boolean {
  return Boolean(input.perguntaPendente) && (
    input.categoriaMencionada ||
    input.bairroMencionado ||
    input.bairroCandidato ||
    input.urgenciaMencionada !== null ||
    input.confirmouSugestao ||
    input.recusouSugestao ||
    input.refereSugestao ||
    input.fragmentoDePedido
  )
}