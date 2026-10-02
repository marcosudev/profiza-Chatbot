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
  { nome: "Santa Luzia", apelidos: ["santa luzia", "st luzia", "sta luzia", "vila santa luzia", "vla santa luzia", "sou do santa luzia"], regiao: "Norte" },
  { nome: "Pousada da Esperança", apelidos: ["pousada", "pousada da esperanca", "pousada da esperança"], regiao: "Norte" },
  { nome: "Jardim Vânia Maria", apelidos: ["vania maria", "jardim vania maria"], regiao: "Norte" },
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
  { nome: "Jardim Europa", apelidos: ["europa", "jd europa", "jardim europa"], regiao: "Sul" },
  { nome: "Parque Jardim Europa", apelidos: ["parque europa", "pq europa", "pq jardim europa", "parque jardim europa"], regiao: "Sul" },

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
  { nome: "Jardim Higienópolis", apelidos: ["higienópolis", "higienopolis"], regiao: "Central" },
  { nome: "Núcleo Presidente Geisel", apelidos: ["geisel", "núcleo geisel", "nucleo geisel"], regiao: "Leste" },
  { nome: "Jardim América", apelidos: ["américa", "america"], regiao: "Central" },
]

export const referencias: Record<string, string> = {
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

function distanciaEdicao(primeira: string, segunda: string): number {
  let linhaAnterior = Array.from({ length: segunda.length + 1 }, (_, indice) => indice)

  for (let indicePrimeira = 1; indicePrimeira <= primeira.length; indicePrimeira++) {
    const linhaAtual = [indicePrimeira]
    for (let indiceSegunda = 1; indiceSegunda <= segunda.length; indiceSegunda++) {
      const custo = primeira[indicePrimeira - 1] === segunda[indiceSegunda - 1] ? 0 : 1
      linhaAtual[indiceSegunda] = Math.min(
        linhaAtual[indiceSegunda - 1] + 1,
        linhaAnterior[indiceSegunda] + 1,
        linhaAnterior[indiceSegunda - 1] + custo
      )
    }
    linhaAnterior = linhaAtual
  }

  return linhaAnterior[segunda.length]
}

export function resolverBairroAproximado(
  texto: string,
  candidatos: Array<{ nome: string; regiao: string | null }>
): { bairro: string; regiao: string | null } | null {
  const consulta = normalizar(texto)
  if (!consulta) return null

  let menorDistancia = Infinity
  const melhores = new Map<string, string | null>()
  for (const candidato of candidatos) {
    const nome = normalizar(candidato.nome)
    if (Math.abs(nome.length - consulta.length) > 2) continue
    const distancia = distanciaEdicao(consulta, nome)
    if (distancia > 2) continue
    if (distancia < menorDistancia) {
      menorDistancia = distancia
      melhores.clear()
    }
    if (distancia === menorDistancia) melhores.set(candidato.nome, candidato.regiao)
  }

  if (melhores.size !== 1) return null
  const [bairro, regiao] = [...melhores.entries()][0]
  return { bairro, regiao }
}

function resolverBairroComErro(norm: string): { bairro: string; regiao: string } | null {
  const palavras = norm.split(" ").filter(Boolean)
  const candidatos = bairros.flatMap(b =>
    [...new Set([b.nome, ...b.apelidos].map(normalizar))]
      .map(frase => ({ bairro: b, palavras: frase.split(" ") }))
  )
  let menorPontuacao = Infinity
  const melhoresBairros = new Set<string>()

  for (const candidato of candidatos) {
    const tamanho = candidato.palavras.length
    for (let inicio = 0; inicio <= palavras.length - tamanho; inicio++) {
      let pontuacao = 0
      let valido = true

      for (let indice = 0; indice < tamanho; indice++) {
        const palavra = candidato.palavras[indice]
        const erro = distanciaEdicao(palavras[inicio + indice], palavra)
        const limite = palavra.length >= 9 ? 2 : palavra.length >= 5 ? 1 : 0
        if (erro > limite) {
          valido = false
          break
        }
        pontuacao += erro
      }

      if (!valido || pontuacao === 0 || pontuacao > 2) continue
      if (pontuacao < menorPontuacao) {
        menorPontuacao = pontuacao
        melhoresBairros.clear()
      }
      if (pontuacao === menorPontuacao) melhoresBairros.add(candidato.bairro.nome)
    }
  }

  if (melhoresBairros.size !== 1) return null
  const nome = [...melhoresBairros][0]
  const bairro = bairros.find(candidato => candidato.nome === nome)
  return bairro ? { bairro: bairro.nome, regiao: bairro.regiao } : null
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

  return resolverBairroComErro(norm)
}

export function bairrosDaRegiao(regiao: string): string[] {
  return bairros.filter(b => b.regiao === regiao).map(b => b.nome)
}
