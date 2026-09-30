process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "test_secret"
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test_key"
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test_key"
process.env.EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || "http://localhost:8080"
process.env.EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "test_instance"
process.env.EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "test_key"

import { resolverCategoria, resolverCategoriasSolicitadas } from "./knowledge/categorias"
import { resolverBairro } from "./knowledge/bairros-bauru"
import { extrairCoordenadas, coordenadasParaBairro } from "./geo"
import { solicitouExclusaoDados } from "./privacidade"
import { interpretarFeedback } from "./supabase"

interface TestCase {
  id: number
  descricao: string
  input: string
  validacao: () => boolean
}

const casosDeTeste: TestCase[] = [
  // ── 1. Sintomas Leigos & Categorias ──────────────────────────────────────────
  { id: 1, descricao: "Cano estourou -> encanador", input: "cano estourou na cozinha", validacao: () => resolverCategoria("cano estourou na cozinha")?.slug === "encanador" },
  { id: 2, descricao: "Tomada não funciona -> eletricista", input: "tomada da sala não funciona", validacao: () => resolverCategoria("tomada da sala não funciona")?.slug === "eletricista" },
  { id: 3, descricao: "Chuveiro queimou -> ambíguo (eletricista / encanador)", input: "meu chuveiro queimou", validacao: () => resolverCategoria("meu chuveiro queimou")?.ambiguo === true },
  { id: 4, descricao: "Ar não gela -> ar-condicionado", input: "o ar não gela de jeito nenhum", validacao: () => resolverCategoria("o ar não gela de jeito nenhum")?.slug === "ar-condicionado" },
  { id: 5, descricao: "Mato alto -> jardinagem", input: "o mato tá alto no quintal", validacao: () => resolverCategoria("o mato tá alto no quintal")?.slug === "jardinagem" },
  { id: 6, descricao: "Goteira no telhado -> telhadista", input: "tem goteira no meu quarto", validacao: () => resolverCategoria("tem goteira no meu quarto")?.slug === "telhadista" },
  { id: 7, descricao: "Portão automático travou -> serralheiro", input: "meu portão automático travou", validacao: () => resolverCategoria("meu portão automático travou")?.slug === "serralheiro" },
  { id: 8, descricao: "Parede descascando -> pintor", input: "preciso pintar a parede descascando", validacao: () => resolverCategoria("preciso pintar a parede descascando")?.slug === "pintor" },
  { id: 9, descricao: "Computador lento -> informática", input: "meu notebook tá muito lento", validacao: () => resolverCategoria("meu notebook tá muito lento")?.slug === "informatica" },
  { id: 10, descricao: "Levantar um muro -> pedreiro", input: "preciso levantar um muro no fundo", validacao: () => resolverCategoria("preciso levantar um muro no fundo")?.slug === "pedreiro" },

  // ── 2. Múltiplos Serviços ────────────────────────────────────────────────────
  { id: 11, descricao: "Múltiplos serviços: encanador e pintor", input: "preciso de encanador e pintor", validacao: () => {
      const res = resolverCategoriasSolicitadas("preciso de encanador e pintor")
      return res.includes("encanador") && res.includes("pintor")
    }
  },

  // ── 3. Bairros & Apelidos ──────────────────────────────────────────────────
  { id: 12, descricao: "Bairro oficial: Vila Falcão", input: "sou da vila falcão", validacao: () => resolverBairro("sou da vila falcão")?.bairro === "Vila Falcão" },
  { id: 13, descricao: "Bairro oficial: Jardim Estoril", input: "moro no estoril", validacao: () => resolverBairro("moro no estoril")?.bairro === "Jardim Estoril" },
  { id: 14, descricao: "Bairro oficial: Centro", input: "estou no centro", validacao: () => resolverBairro("estou no centro")?.bairro === "Centro" },
  { id: 15, descricao: "Bairro oficial: Higienópolis", input: "fica no higienópolis", validacao: () => resolverBairro("fica no higienópolis")?.bairro === "Jardim Higienópolis" },
  { id: 16, descricao: "Bairro oficial: Geisel", input: "preciso no geisel", validacao: () => resolverBairro("preciso no geisel")?.bairro === "Núcleo Presidente Geisel" },

  // ── 4. Geolocalização ────────────────────────────────────────────────────────
  { id: 17, descricao: "Extrair coordenadas de texto de mapa", input: "__localizacao:-22.3145,-49.0587__", validacao: () => {
      const coords = extrairCoordenadas("__localizacao:-22.3145,-49.0587__")
      return Boolean(coords && coords.lat === -22.3145 && coords.lng === -49.0587)
    }
  },
  { id: 18, descricao: "Coordenada dentro de Bauru -> resolve bairro", input: "Centroide Centro Bauru", validacao: () => {
      const res = coordenadasParaBairro(-22.324, -49.071)
      return res !== null && typeof res.bairro === "string"
    }
  },

  // ── 5. Casos Especiais & LGPD ────────────────────────────────────────────────
  { id: 19, descricao: "LGPD: apagar meus dados", input: "quero apagar meus dados", validacao: () => solicitouExclusaoDados("quero apagar meus dados") === true },
  { id: 20, descricao: "Feedback do profissional: opção 1", input: "1", validacao: () => interpretarFeedback("1") === "cliente_respondeu" },
  { id: 21, descricao: "Feedback do profissional: opção 3", input: "3", validacao: () => interpretarFeedback("3") === "servico_fechado" },
]

function executarSuite() {
  console.log("🧪 Rodando Suíte de Testes Golden Set (Profiza Bot v2.3)\n")
  let passou = 0
  let falhou = 0

  for (const caso of casosDeTeste) {
    try {
      const ok = caso.validacao()
      if (ok) {
        passou++
        console.log(` ✅ Caso #${caso.id.toString().padStart(2, "0")}: ${caso.descricao}`)
      } else {
        falhou++
        console.error(` ❌ Caso #${caso.id.toString().padStart(2, "0")}: ${caso.descricao} (FALHOU)`)
      }
    } catch (err: any) {
      falhou++
      console.error(` 💥 Caso #${caso.id.toString().padStart(2, "0")}: ${caso.descricao} (ERRO: ${err.message})`)
    }
  }

  console.log(`\n Total: ${casosDeTeste.length} | Passou: ${passou} | Falhou: ${falhou}`)
  if (falhou > 0) {
    process.exit(1)
  }
}

executarSuite()
