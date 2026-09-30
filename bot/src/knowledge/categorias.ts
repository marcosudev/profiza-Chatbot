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

export function resolverCategoria(texto: string): { slug: string; label: string; ambiguo: boolean; alternativas: string[] } | null {
  const norm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const correspondencias = categorias.map(cat => {
    const termos = [cat.label, ...cat.sinonimos]
      .map(termo => termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
      .filter(termo => norm.includes(termo))
    return { cat, termos, pontuacao: termos.reduce((total, termo) => total + termo.length, 0) }
  }).filter(correspondencia => correspondencia.termos.length > 0)

  if (correspondencias.length === 0) return null

  const maiorPontuacao = Math.max(...correspondencias.map(correspondencia => correspondencia.pontuacao))
  const melhores = correspondencias.filter(correspondencia => correspondencia.pontuacao === maiorPontuacao)
  const principal = melhores[0].cat
  const alternativas = melhores.map(correspondencia => correspondencia.cat.slug)

  return {
    slug: principal.slug,
    label: principal.label,
    ambiguo: alternativas.length > 1,
    alternativas,
  }
}

export function resolverCategoriaPendente(texto: string, alternativas: string[]): string | null {
  const norm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const selecionada = categorias.find(cat => {
    if (!alternativas.includes(cat.slug)) return false
    const label = cat.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const slug = cat.slug.replace(/-/g, " ")
    return norm.includes(label) || norm.includes(slug)
  })
  return selecionada?.slug ?? null
}

export function resolverCategoriasSolicitadas(texto: string): string[] {
  const norm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  if (!/\b(e|tambem|depois|alem de)\b/.test(norm)) return []

  const correspondencias = categorias.map(cat => {
    const posicoes = [cat.label, ...cat.sinonimos]
      .map(termo => termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
      .map(termo => norm.indexOf(termo))
      .filter(posicao => posicao >= 0)
    return { slug: cat.slug, posicao: Math.min(...posicoes) }
  })
    .filter(correspondencia => Number.isFinite(correspondencia.posicao))
    .sort((a, b) => a.posicao - b.posicao)

  const slugs = correspondencias.map(correspondencia => correspondencia.slug)
  return slugs.length > 1 ? slugs : []
}

export function listarCategorias(): string {
  return categorias.map(c => `• ${c.label}`).join("\n")
}
