export interface Bairro {
  nome: string
  apelidos: string[]
  regiao: string
}

export const bairros: Bairro[] = [
  // Central
  { nome: "Centro", apelidos: ["centro", "centro de bauru"], regiao: "Central" },
  { nome: "Vila Falcão", apelidos: ["falcão", "vila falcao"], regiao: "Central" },
  { nome: "Jardim Bela Vista", apelidos: ["bela vista"], regiao: "Central" },
  { nome: "Vila Cardia", apelidos: ["cardia"], regiao: "Central" },
  { nome: "Vila Aviação", apelidos: ["aviação", "aviacao"], regiao: "Central" },
  { nome: "Jardim Panorama", apelidos: ["panorama"], regiao: "Central" },

  // Norte
  { nome: "Jardim Estoril", apelidos: ["estoril"], regiao: "Norte" },
  { nome: "Parque Jaraguá", apelidos: ["jaraguá", "jaragua"], regiao: "Norte" },
  { nome: "Vila São Paulo", apelidos: ["são paulo", "sao paulo"], regiao: "Norte" },
  { nome: "Jardim Redentor", apelidos: ["redentor"], regiao: "Norte" },
  { nome: "Jardim Progresso", apelidos: ["progresso"], regiao: "Norte" },
  { nome: "Vila Independência", apelidos: ["independência", "independencia"], regiao: "Norte" },
  { nome: "Parque Santa Edwiges", apelidos: ["santa edwiges", "edwiges"], regiao: "Norte" },

  // Sul
  { nome: "Mary Dota", apelidos: ["mary dota", "mary"], regiao: "Sul" },
  { nome: "Jardim Godoy", apelidos: ["godoy"], regiao: "Sul" },
  { nome: "Vila Guedes", apelidos: ["guedes"], regiao: "Sul" },
  { nome: "Jardim Ferraz", apelidos: ["ferraz"], regiao: "Sul" },
  { nome: "Parque Paulistano", apelidos: ["paulistano"], regiao: "Sul" },
  { nome: "Jardim Petrópolis", apelidos: ["petrópolis", "petropolis"], regiao: "Sul" },
  { nome: "Vila Lemos", apelidos: ["lemos"], regiao: "Sul" },

  // Leste
  { nome: "Jardim Contorno", apelidos: ["contorno"], regiao: "Leste" },
  { nome: "Vila Dutra", apelidos: ["dutra"], regiao: "Leste" },
  { nome: "Jardim Flórida", apelidos: ["flórida", "florida"], regiao: "Leste" },
  { nome: "Parque Viaduto", apelidos: ["viaduto"], regiao: "Leste" },
  { nome: "Jardim Eldorado", apelidos: ["eldorado"], regiao: "Leste" },
  { nome: "Vila Souto", apelidos: ["souto"], regiao: "Leste" },

  // Oeste
  { nome: "Jardim Bongiovani", apelidos: ["bongiovani"], regiao: "Oeste" },
  { nome: "Parque das Nações", apelidos: ["nações", "nacoes"], regiao: "Oeste" },
  { nome: "Jardim Solange", apelidos: ["solange"], regiao: "Oeste" },
  { nome: "Vila Camargo", apelidos: ["camargo"], regiao: "Oeste" },

  // Universitária
  { nome: "Jardim Universitário", apelidos: ["universitário", "universitario", "unesp", "perto da unesp"], regiao: "Universitária" },
  { nome: "Vila Nova Cidade Universitária", apelidos: ["nova cidade universitária", "nova cidade"], regiao: "Universitária" },
  { nome: "Vila Universitária", apelidos: ["vila universitária"], regiao: "Universitária" },
]

export const referencias: Record<string, string> = {
  "shopping": "Jardim Estoril",
  "shopping bauru": "Jardim Estoril",
  "unesp": "Jardim Universitário",
  "faculdade": "Jardim Universitário",
  "aeroporto": "Vila Aviação",
  "rodoviária": "Centro",
  "rodoviaria": "Centro",
  "hospital": "Centro",
  "santa casa": "Centro",
}

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
}

export function resolverBairro(texto: string): { bairro: string; regiao: string } | null {
  const norm = normalizar(texto)

  for (const [ref, bairroNome] of Object.entries(referencias)) {
    if (norm.includes(normalizar(ref))) {
      const b = bairros.find(b => b.nome === bairroNome)
      if (b) return { bairro: b.nome, regiao: b.regiao }
    }
  }

  for (const b of bairros) {
    if (normalizar(b.nome) === norm) return { bairro: b.nome, regiao: b.regiao }
    for (const apelido of b.apelidos) {
      if (norm.includes(normalizar(apelido))) return { bairro: b.nome, regiao: b.regiao }
    }
  }

  return null
}

export function bairrosDaRegiao(regiao: string): string[] {
  return bairros.filter(b => b.regiao === regiao).map(b => b.nome)
}
