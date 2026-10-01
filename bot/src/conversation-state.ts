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