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
  "Montador de Móveis",
  "Arquiteto",
  "Borracheiro",
  "Mecânico",
  "Jardineiro",
  "Marceneiro",
  "Técnico de Ar-condicionado",
  "Técnico de Informática",
  "Serralheiro",
  "Gesseiro",
  "Chaveiro",
  "Vidraceiro",
  "Desentupidor",
  "Frete e Mudança",
  "Tapeceiro",
  "Calheiro",
  "Bombeiro Hidráulico"
]
