export type PaymentStatus = "ativo" | "inativo" | "teste_gratis"

export interface Professional {
  id: string
  nome: string
  whatsapp: string
  categoria: string
  bairros: string[]
  status: PaymentStatus
  email?: string
  testeGratisExpiraEm: string
  leadsSemana: number
  ultimaAtividade: string
}

export const bairrosDisponiveis = [
  "Centro",
  "Jardim Europa",
  "Vila São José",
  "Alto da Colina",
  "Jardim das Flores",
  "Parque São Paulo",
  "Vila Nery",
  "Bela Vista",
]

export const categoriasDisponiveis = [
  "Eletricista",
  "Encanador",
  "Diarista",
  "Pedreiro",
  "Pintor",
  "Limpeza",
  "Montador",
  "Arquiteto",
]
