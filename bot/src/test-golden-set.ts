process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "test_secret"
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test_key"
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test_key"
process.env.EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || "http://localhost:8080"
process.env.EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "test_instance"
process.env.EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "test_key"

import { resolverCategoria, resolverCategoriasSolicitadas } from "./knowledge/categorias"
import { resolverBairro } from "./knowledge/bairros-bauru"
import { resolverBairroAproximado } from "./knowledge/bairros-bauru"
import { extrairCoordenadas, coordenadasParaBairro } from "./geo"
import { solicitouExclusaoDados } from "./privacidade"
import { interpretarFeedback } from "./supabase"
import { mensagens } from "./messages"
import { resolverUrgenciaLocal } from "./ai"
import { adicionarTurnoConversa, normalizarSessao, type Sessao } from "./session"
import {
  deveAbrirNovoPedidoSemCategoria,
  deveAtualizarSomenteUrgencia,
  deveEvitarBuscaRepetida,
  deveIniciarNovoPedido,
  deveTratarComoRespostaPendente,
  confirmouBairroSugerido,
  ehFragmentoDePedido,
  refereBairroSugerido,
  recusouBairroSugerido,
} from "./conversation-state"

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
  { id: 17, descricao: "Bairro oficial: Santa Luzia", input: "Quero um encanador e sou do Santa Luzia", validacao: () => resolverBairro("Quero um encanador e sou do Santa Luzia")?.bairro === "Santa Luzia" },

  // ── 3.1 Urgência & conversa ──────────────────────────────────────────────────
  { id: 22, descricao: "Urgência explícita", input: "preciso para hoje, é urgente", validacao: () => resolverUrgenciaLocal("preciso para hoje, é urgente") === true },
  { id: 23, descricao: "Sem urgência explícita", input: "não é urgente, pode aguardar", validacao: () => resolverUrgenciaLocal("não é urgente, pode aguardar") === false },
  { id: 24, descricao: "Urgência não informada", input: "preciso de um pintor", validacao: () => resolverUrgenciaLocal("preciso de um pintor") === null },
  { id: 25, descricao: "Atualização de urgência não refaz busca", input: "com urgência", validacao: () => deveAtualizarSomenteUrgencia({ buscaConcluida: true, urgenciaMencionada: true, categoriaMencionada: false, bairroMencionado: false, intencao: "busca_profissional" }) && !deveAtualizarSomenteUrgencia({ buscaConcluida: true, urgenciaMencionada: true, categoriaMencionada: false, bairroMencionado: false, intencao: "mais_opcoes" }) },
  { id: 26, descricao: "Pedido novo não herda bairro anterior", input: "quero um pintor", validacao: () => deveIniciarNovoPedido({ buscaConcluida: true, aguardandoConfirmacaoServico: false, categoriaMencionada: true, intencao: "busca_profissional" }) && !deveIniciarNovoPedido({ buscaConcluida: true, aguardandoConfirmacaoServico: true, categoriaMencionada: true, intencao: "busca_profissional" }) },
  { id: 27, descricao: "Resposta vaga não repete busca", input: "preciso", validacao: () => deveEvitarBuscaRepetida({ buscaConcluida: true, aguardandoConfirmacaoServico: false, categoriaMencionada: false, bairroMencionado: false, urgenciaMencionada: null, intencao: "busca_profissional" }) },
  { id: 32, descricao: "Início de pedido não retoma pedido anterior", input: "Quero um", validacao: () => deveAbrirNovoPedidoSemCategoria({ buscaConcluida: true, categoriaMencionada: false, intencao: "busca_profissional", mensagem: "Quero um" }) && !deveAbrirNovoPedidoSemCategoria({ buscaConcluida: true, categoriaMencionada: false, intencao: "mais_opcoes", mensagem: "quero mais" }) },
  { id: 33, descricao: "Fragmento aguarda continuação do usuário", input: "Um", validacao: () => ehFragmentoDePedido("Um") && !ehFragmentoDePedido("um pedreiro") },
  { id: 34, descricao: "Confirmação simples aceita bairro sugerido", input: "Sim", validacao: () => confirmouBairroSugerido("Sim") && confirmouBairroSugerido("É esse mesmo") && !confirmouBairroSugerido("Não, outro bairro") },
  { id: 35, descricao: "Erro de digitação sugere candidato único do banco", input: "Jardim Oropa", validacao: () => resolverBairroAproximado("Jardim Oropa", [{ nome: "Jardim Europa", regiao: "Central" }])?.bairro === "Jardim Europa" && resolverBairroAproximado("Jardim Oropa", [{ nome: "Jardim Aropa", regiao: "Central" }, { nome: "Jardim Eropa", regiao: "Norte" }]) === null },
  { id: 36, descricao: "Recusa limpa sugestão incorreta", input: "não, outro bairro", validacao: () => recusouBairroSugerido("não, outro bairro") && !recusouBairroSugerido("sim, é esse") },
  { id: 37, descricao: "Correção de localização não cai em fora de escopo", input: "Desculpa, Europa", validacao: () => deveTratarComoRespostaPendente({ perguntaPendente: "bairro", categoriaMencionada: false, bairroMencionado: false, bairroCandidato: true, urgenciaMencionada: null, confirmouSugestao: false, recusouSugestao: false, refereSugestao: false, fragmentoDePedido: false }) && deveTratarComoRespostaPendente({ perguntaPendente: "bairro", categoriaMencionada: false, bairroMencionado: false, bairroCandidato: false, urgenciaMencionada: null, confirmouSugestao: false, recusouSugestao: false, refereSugestao: true, fragmentoDePedido: false }) && !deveTratarComoRespostaPendente({ perguntaPendente: null, categoriaMencionada: false, bairroMencionado: false, bairroCandidato: false, urgenciaMencionada: null, confirmouSugestao: false, recusouSugestao: false, refereSugestao: false, fragmentoDePedido: false }) },
  { id: 38, descricao: "Apelido corrige sugestão usando contexto", input: "Desculpa, Europa", validacao: () => refereBairroSugerido("Desculpa, Europa", "Jardim Europa") && !refereBairroSugerido("Desculpa, Centro", "Jardim Europa") },
  { id: 28, descricao: "Memória recente mascara dados pessoais", input: "Meu telefone é (14) 99999-0000 e meu CPF é 123.456.789-09", validacao: () => {
      const sessaoTeste = { turnosRecentes: [] } as unknown as Sessao
      adicionarTurnoConversa(sessaoTeste, "user", "Meu telefone é (14) 99999-0000 e meu CPF é 123.456.789-09")
      const texto = sessaoTeste.turnosRecentes?.[0]?.content ?? ""
      return texto.includes("[telefone]") && texto.includes("[documento]") && !texto.includes("99999-0000") && !texto.includes("123.456.789-09")
    }
  },
  { id: 29, descricao: "Sessão legada descarta localização obsoleta", input: "estado anterior ao deploy", validacao: () => {
      const sessao = normalizarSessao({ categoria: "pintor", bairro: "Vila São Paulo", urgente: true, nome: "Maria" })
      return sessao.categoria === null && sessao.bairro === null && sessao.urgente === null && sessao.nome === "Maria"
    }
  },
  { id: 30, descricao: "Match regional é explicado ao cliente", input: "pintor no Centro", validacao: () => {
      const profissional = { id: "test", nome: "Profissional Teste", whatsapp: "0000000000000", categoria: "pintor", bairros: ["Vila Falcão"], regiao: "Central", status: "trial" }
      const resposta = mensagens.profissionalEncontrado([profissional], "pintor", "Centro", null, null, 2)
      return resposta.includes("outros bairros da mesma região") && resposta.includes("O atendimento é urgente ou pode aguardar?")
    }
  },
  { id: 31, descricao: "Urgência conhecida não repete pergunta", input: "é urgente", validacao: () => {
      const profissional = { id: "test", nome: "Profissional Teste", whatsapp: "0000000000000", categoria: "pintor", bairros: ["Centro"], regiao: "Central", status: "trial" }
      const resposta = mensagens.profissionalEncontrado([profissional], "pintor", "Centro", null, true)
      return resposta.includes("Entendi que é urgente") && !resposta.includes("O atendimento é urgente ou pode aguardar?")
    }
  },

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
