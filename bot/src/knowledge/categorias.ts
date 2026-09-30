export interface Categoria {
  slug: string
  label: string
  sinonimos: string[]
  ambiguo?: string[] // outras categorias possíveis para o mesmo sintoma
}

export const categorias: Categoria[] = [
  {
    slug: "eletricista",
    label: "Eletricista",
    sinonimos: [
      "elétrica", "eletrica", "tomada", "chuveiro", "disjuntor", "curto",
      "fio", "instalação elétrica", "luz", "lâmpada", "quadro de luz",
      "choque", "energia", "fiação", "interruptor", "campainha",
    ],
  },
  {
    slug: "encanador",
    label: "Encanador",
    sinonimos: [
      "cano", "vazamento", "encanamento", "torneira", "vaso sanitário",
      "entupido", "entupimento", "caixa d'água", "caixa dagua",
      "registro", "sifão", "esgoto", "fossa", "chuveiro",
    ],
    ambiguo: ["eletricista"],
  },
  {
    slug: "pedreiro",
    label: "Pedreiro",
    sinonimos: [
      "obra", "muro", "parede", "reboco", "construção", "construcao",
      "reforma", "calçada", "calcada", "piso", "azulejo", "cerâmica",
      "ceramica", "contrapiso", "laje", "fundação",
    ],
  },
  {
    slug: "pintor",
    label: "Pintor",
    sinonimos: [
      "pintura", "tinta", "pintar", "parede descascando", "verniz",
      "massa corrida", "textura", "pintura externa", "pintura interna",
    ],
  },
  {
    slug: "mecanico",
    label: "Mecânico",
    sinonimos: [
      "carro", "moto", "veículo", "veiculo", "motor", "freio", "pneu",
      "bateria", "revisão", "revisao", "mecânica", "mecanica",
      "suspensão", "suspensao", "câmbio", "cambio",
    ],
  },
  {
    slug: "borracheiro",
    label: "Borracheiro",
    sinonimos: [
      "pneu furado", "borracha", "câmara de ar", "camara de ar",
      "conserto de pneu", "pneu",
    ],
  },
  {
    slug: "ar-condicionado",
    label: "Ar-condicionado",
    sinonimos: [
      "ar condicionado", "ar-condicionado", "ar não gela", "ar nao gela",
      "split", "instalação de ar", "limpeza de ar", "manutenção de ar",
      "manutencao de ar", "climatizador",
    ],
  },
  {
    slug: "informatica",
    label: "Informática",
    sinonimos: [
      "computador", "notebook", "pc", "lento", "vírus", "virus",
      "formatação", "formatacao", "impressora", "internet", "rede",
      "wifi", "wi-fi", "tela quebrada", "hd", "ssd",
    ],
  },
  {
    slug: "serralheiro",
    label: "Serralheiro",
    sinonimos: [
      "portão", "portao", "grade", "ferro", "solda", "soldagem",
      "fechadura", "porta de ferro", "janela de ferro", "automação de portão",
      "automatizacao de portao", "motor de portão",
    ],
  },
  {
    slug: "jardinagem",
    label: "Jardinagem",
    sinonimos: [
      "jardim", "grama", "mato", "mato alto", "poda", "árvore", "arvore",
      "cortar grama", "jardineiro", "paisagismo", "planta",
    ],
  },
  {
    slug: "montador-moveis",
    label: "Montador de Móveis",
    sinonimos: [
      "móvel", "movel", "montar", "montagem", "armário", "armario",
      "guarda-roupa", "guarda roupa", "cama", "estante", "rack",
      "mesa", "cadeira", "ikea",
    ],
  },
  {
    slug: "diarista",
    label: "Diarista / Faxineira",
    sinonimos: [
      "faxina", "limpeza", "diarista", "faxineira", "limpar casa",
      "limpeza residencial", "limpeza comercial",
    ],
  },
]

export const slugsValidos = categorias.map(c => c.slug)

export function resolverCategoria(texto: string): { slug: string; label: string; ambiguo: boolean } | null {
  const norm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  for (const cat of categorias) {
    for (const sin of cat.sinonimos) {
      const sinNorm = sin.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      if (norm.includes(sinNorm)) {
        return { slug: cat.slug, label: cat.label, ambiguo: (cat.ambiguo?.length ?? 0) > 0 }
      }
    }
    const labelNorm = cat.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (norm.includes(labelNorm)) {
      return { slug: cat.slug, label: cat.label, ambiguo: false }
    }
  }

  return null
}

export function listarCategorias(): string {
  return categorias.map(c => `• ${c.label}`).join("\n")
}
