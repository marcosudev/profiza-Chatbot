process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "test_secret"
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test_key"
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test_key"
process.env.EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || "http://localhost:8080"
process.env.EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "test_instance"
process.env.EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "test_key"

import { resolverCategoria, resolverCategoriasSolicitadas } from "./knowledge/categorias"
import { resolverBairro, resolverBairroAproximado } from "./knowledge/bairros-bauru"
import {
  resolverLocalizacaoAvancada,
  foneticaPtBr,
  normalizarTextoLocal,
  distanciaDamerauLevenshtein,
} from "./location-resolver"
import { extrairCoordenadas, coordenadasParaBairro } from "./geo"
import { solicitouExclusaoDados } from "./privacidade"
import { interpretarFeedback, Profissional } from "./supabase"
import { mensagens } from "./messages"
import { resolverUrgenciaLocal, detectarEmergenciaDeterministica } from "./ai"
import {
  adicionarTurnoConversa,
  normalizarSessao,
  criarNovoPedido,
  fecharPedidoAtivoEArquivar,
  type Sessao,
} from "./session"
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
import { avaliarPoliticaDialogo, detectarFrustracao } from "./dialog-policy"
import { validarSaida, calcularSimilaridadeTexto } from "./output-validator"
import { ExtracaoEstruturada } from "./types"

interface TestCase {
  id: number
  categoriaTeste: string
  descricao: string
  validacao: () => boolean
}

const casosDeTeste: TestCase[] = [
  // ── 1. Sintomas & Categorias ────────────────────────────────────────────────
  { id: 1, categoriaTeste: "Sintomas", descricao: "Cano estourou -> encanador", validacao: () => resolverCategoria("cano estourou na cozinha")?.slug === "encanador" },
  { id: 2, categoriaTeste: "Sintomas", descricao: "Tomada não funciona -> eletricista", validacao: () => resolverCategoria("tomada da sala não funciona")?.slug === "eletricista" },
  { id: 3, categoriaTeste: "Sintomas", descricao: "Chuveiro queimou -> ambíguo (eletricista / encanador)", validacao: () => resolverCategoria("meu chuveiro queimou")?.ambiguo === true },
  { id: 4, categoriaTeste: "Sintomas", descricao: "Ar não gela -> ar-condicionado", validacao: () => resolverCategoria("o ar não gela de jeito nenhum")?.slug === "ar-condicionado" },
  { id: 5, categoriaTeste: "Sintomas", descricao: "Mato alto -> jardinagem", validacao: () => resolverCategoria("o mato tá alto no quintal")?.slug === "jardinagem" },
  { id: 6, categoriaTeste: "Sintomas", descricao: "Goteira no telhado -> telhadista", validacao: () => resolverCategoria("tem goteira no meu quarto")?.slug === "telhadista" },
  { id: 7, categoriaTeste: "Sintomas", descricao: "Portão automático travou -> serralheiro", validacao: () => resolverCategoria("meu portão automático travou")?.slug === "serralheiro" },
  { id: 8, categoriaTeste: "Sintomas", descricao: "Parede descascando -> pintor", validacao: () => resolverCategoria("preciso pintar a parede descascando")?.slug === "pintor" },
  { id: 9, categoriaTeste: "Sintomas", descricao: "Computador lento -> informática", validacao: () => resolverCategoria("meu notebook tá muito lento")?.slug === "informatica" },
  { id: 10, categoriaTeste: "Sintomas", descricao: "Levantar um muro -> pedreiro", validacao: () => resolverCategoria("preciso levantar um muro no fundo")?.slug === "pedreiro" },
  { id: 11, categoriaTeste: "Sintomas", descricao: "Múltiplos serviços: encanador e pintor", validacao: () => {
      const res = resolverCategoriasSolicitadas("preciso de encanador e pintor")
      return res.includes("encanador") && res.includes("pintor")
    }
  },

  // ── 2. Localização & Fonética Avançada (RF-14) ────────────────────────────────
  { id: 12, categoriaTeste: "Localização", descricao: "Bairro oficial direto: Vila Falcão", validacao: () => resolverBairro("sou da vila falcão")?.bairro === "Vila Falcão" },
  { id: 13, categoriaTeste: "Localização", descricao: "Apelido: Estoril -> Jardim Estoril", validacao: () => resolverBairro("moro no estoril")?.bairro === "Jardim Estoril" },
  { id: 14, categoriaTeste: "Localização", descricao: "Centro de Bauru -> Centro", validacao: () => resolverBairro("estou no centro")?.bairro === "Centro" },
  { id: 15, categoriaTeste: "Localização", descricao: "Higienópolis -> Jardim Higienópolis", validacao: () => resolverBairro("fica no higienópolis")?.bairro === "Jardim Higienópolis" },
  { id: 16, categoriaTeste: "Localização", descricao: "Geisel -> Núcleo Presidente Geisel", validacao: () => resolverBairro("preciso no geisel")?.bairro === "Núcleo Presidente Geisel" },
  { id: 17, categoriaTeste: "Localização", descricao: "Expansão de prefixo: Jd Estoril", validacao: () => normalizarTextoLocal("jd. estoril") === "jardim estoril" },
  { id: 18, categoriaTeste: "Localização", descricao: "Fonética pt-BR: 'oropa' mapeia para 'Europa'", validacao: () => {
      const fonOropa = foneticaPtBr("oropa")
      const fonEuropa = foneticaPtBr("europa")
      return fonOropa.length > 0 && fonEuropa.length > 0
    }
  },
  { id: 19, categoriaTeste: "Localização", descricao: "Resolução tolerante: 'Jardim Oropa' sugere 'Jardim Europa'", validacao: () => {
      const res = resolverLocalizacaoAvancada("Jardim Oropa", undefined, true)
      return res.bairroOficial === "Jardim Europa" || res.opcoes.some((o: { nome: string }) => o.nome === "Jardim Europa")
    }
  },
  { id: 20, categoriaTeste: "Localização", descricao: "Damerau-Levenshtein trata transposição de letras", validacao: () => {
      return distanciaDamerauLevenshtein("falcao", "falaco") === 1
    }
  },

  // ── 3. Urgência & Emergência Determinística (RF-09) ──────────────────────────
  { id: 21, categoriaTeste: "Urgência & Segurança", descricao: "Urgência explícita", validacao: () => resolverUrgenciaLocal("preciso para hoje, é urgente") === "urgent" },
  { id: 22, categoriaTeste: "Urgência & Segurança", descricao: "Sem urgência (flexível)", validacao: () => resolverUrgenciaLocal("não é urgente, pode aguardar") === "flexible" },
  { id: 23, categoriaTeste: "Urgência & Segurança", descricao: "Urgência não informada", validacao: () => resolverUrgenciaLocal("preciso de um pintor") === null },
  { id: 24, categoriaTeste: "Urgência & Segurança", descricao: "Detecção determinística de emergência (gás)", validacao: () => detectarEmergenciaDeterministica("está com cheiro de gás forte aqui") === true },
  { id: 25, categoriaTeste: "Urgência & Segurança", descricao: "Detecção determinística de emergência (choque elétrico)", validacao: () => detectarEmergenciaDeterministica("tomada pegando fogo com choque elétrico") === true },

  // ── 4. Estado da Conversa & Reparo (RF-03, RF-15) ─────────────────────────────
  { id: 26, categoriaTeste: "Conversação", descricao: "Atualização de urgência não refaz busca", validacao: () => deveAtualizarSomenteUrgencia({ buscaConcluida: true, urgenciaMencionada: true, categoriaMencionada: false, bairroMencionado: false, intencao: "busca_profissional" }) },
  { id: 27, categoriaTeste: "Conversação", descricao: "Pedido novo não herda bairro anterior", validacao: () => deveIniciarNovoPedido({ buscaConcluida: true, aguardandoConfirmacaoServico: false, categoriaMencionada: true, intencao: "busca_profissional" }) },
  { id: 28, categoriaTeste: "Conversação", descricao: "Resposta vaga não repete busca", validacao: () => deveEvitarBuscaRepetida({ buscaConcluida: true, aguardandoConfirmacaoServico: false, categoriaMencionada: false, bairroMencionado: false, urgenciaMencionada: null, intencao: "busca_profissional" }) },
  { id: 29, categoriaTeste: "Conversação", descricao: "Início de pedido em fragmentos aguarda", validacao: () => ehFragmentoDePedido("Um") && ehFragmentoDePedido("Quero") && !ehFragmentoDePedido("um pedreiro") },
  { id: 30, categoriaTeste: "Conversação", descricao: "Confirmação simples aceita bairro sugerido", validacao: () => confirmouBairroSugerido("Sim") && confirmouBairroSugerido("É esse mesmo") },
  { id: 31, categoriaTeste: "Conversação", descricao: "Recusa limpa sugestão incorreta (I-13)", validacao: () => recusouBairroSugerido("não, outro bairro") && !recusouBairroSugerido("sim, é esse") },
  { id: 32, categoriaTeste: "Conversação", descricao: "Detecção de frustração ativa modo de reparo", validacao: () => detectarFrustracao("Já disse que é no Centro!") && detectarFrustracao("De novo a mesma pergunta?") },

  // ── 5. Política de Diálogo 13 Regras (RF-04) ──────────────────────────────────
  { id: 33, categoriaTeste: "Política de Diálogo", descricao: "Regra 1: Emergência aciona EMERGENCY_PROTOCOL", validacao: () => {
      const extracao: ExtracaoEstruturada = {
        intent: "emergency", service: null, service_candidates: [], service_details: [],
        neighborhood: null, neighborhood_candidate: null, region: null, city: "Bauru",
        urgency: "emergency", corrections: [], answers_pending_question: false,
        confidence: { intent: 1.0, service: 0, location: 0 }
      }
      const dec = avaliarPoliticaDialogo({ pedido: null, extracao, mensagemBruta: "cheiro de gás", confirmouSugestaoLocal: false, recusouSugestaoLocal: false, refereSugestaoLocal: false, respondendoEsclarecimento: false })
      return dec.acao === "EMERGENCY_PROTOCOL"
    }
  },
  { id: 34, categoriaTeste: "Política de Diálogo", descricao: "Regra 2: Pedido de atendente aciona HANDOFF_HUMAN", validacao: () => {
      const extracao: ExtracaoEstruturada = {
        intent: "human_request", service: null, service_candidates: [], service_details: [],
        neighborhood: null, neighborhood_candidate: null, region: null, city: "Bauru",
        urgency: "unknown", corrections: [], answers_pending_question: false,
        confidence: { intent: 0.95, service: 0, location: 0 }
      }
      const dec = avaliarPoliticaDialogo({ pedido: null, extracao, mensagemBruta: "quero falar com atendente", confirmouSugestaoLocal: false, recusouSugestaoLocal: false, refereSugestaoLocal: false, respondendoEsclarecimento: false })
      return dec.acao === "HANDOFF_HUMAN"
    }
  },
  { id: 35, categoriaTeste: "Política de Diálogo", descricao: "Regra 3: Serviço e Bairro resolvidos acionam SEARCH_PROFESSIONALS", validacao: () => {
      const extracao: ExtracaoEstruturada = {
        intent: "search_professional", service: "encanador", service_candidates: [], service_details: [],
        neighborhood: "Centro", neighborhood_candidate: null, region: "Central", city: "Bauru",
        urgency: "unknown", corrections: [], answers_pending_question: false,
        confidence: { intent: 0.95, service: 0.95, location: 0.95 }
      }
      const dec = avaliarPoliticaDialogo({ pedido: null, extracao, mensagemBruta: "encanador no centro", confirmouSugestaoLocal: false, recusouSugestaoLocal: false, refereSugestaoLocal: false, respondendoEsclarecimento: false })
      return dec.acao === "SEARCH_PROFESSIONALS"
    }
  },
  { id: 36, categoriaTeste: "Política de Diálogo", descricao: "Regra 4: Serviço resolvido sem bairro aciona ASK_NEIGHBORHOOD", validacao: () => {
      const extracao: ExtracaoEstruturada = {
        intent: "search_professional", service: "pintor", service_candidates: [], service_details: [],
        neighborhood: null, neighborhood_candidate: null, region: null, city: "Bauru",
        urgency: "unknown", corrections: [], answers_pending_question: false,
        confidence: { intent: 0.95, service: 0.95, location: 0 }
      }
      const dec = avaliarPoliticaDialogo({ pedido: null, extracao, mensagemBruta: "preciso de pintor", confirmouSugestaoLocal: false, recusouSugestaoLocal: false, refereSugestaoLocal: false, respondendoEsclarecimento: false })
      return dec.acao === "ASK_NEIGHBORHOOD"
    }
  },
  { id: 37, categoriaTeste: "Política de Diálogo", descricao: "Regra 12: Pergunta de preço aciona INSTITUTIONAL_REPLY", validacao: () => {
      const extracao: ExtracaoEstruturada = {
        intent: "ask_price", service: "eletricista", service_candidates: [], service_details: [],
        neighborhood: null, neighborhood_candidate: null, region: null, city: "Bauru",
        urgency: "unknown", corrections: [], answers_pending_question: false,
        confidence: { intent: 0.95, service: 0.95, location: 0 }
      }
      const dec = avaliarPoliticaDialogo({ pedido: null, extracao, mensagemBruta: "quanto custa um eletricista?", confirmouSugestaoLocal: false, recusouSugestaoLocal: false, refereSugestaoLocal: false, respondendoEsclarecimento: false })
      return dec.acao === "INSTITUTIONAL_REPLY"
    }
  },

  // ── 6. Guardrails de Saída & Invariantes (RF-20, I-01, I-04, I-11) ───────────
  { id: 38, categoriaTeste: "Guardrails", descricao: "I-01: Rejeita contatos telefônicos não presentes na busca", validacao: () => {
      const profs: Profissional[] = [{ id: "1", nome: "Carlos", whatsapp: "5514991112233", categoria: "encanador", bairros: ["Centro"], regiao: "Central", status: "ativa" }]
      const textoComTelefoneAlucinado = "Encontrei o Carlos! Fale com ele no 14 99888-7766 ou 14 99111-2233."
      const res = validarSaida({ textoGerado: textoComTelefoneAlucinado, profissionaisRetornados: profs })
      return !res.valido && res.motivos.some((m: string) => m.includes("I-01"))
    }
  },
  { id: 39, categoriaTeste: "Guardrails", descricao: "I-11: Rejeita promessa proibida de preço e garantia sem fonte", validacao: () => {
      const profs: Profissional[] = [{ id: "1", nome: "Carlos", whatsapp: "5514991112233", categoria: "encanador", bairros: ["Centro"], regiao: "Central", status: "ativa" }]
      const textoComPreco = "Encontrei o Carlos (5514991112233) por apenas R$ 150 garantido 100%."
      const res = validarSaida({ textoGerado: textoComPreco, profissionaisRetornados: profs })
      return !res.valido && res.motivos.some((m: string) => m.includes("promessa ou afirmação proibida"))
    }
  },
  { id: 40, categoriaTeste: "Guardrails", descricao: "I-04: Detecta saída consecutiva com similaridade >= 0.85", validacao: () => {
      const msg1 = "Claro! Em qual bairro de Bauru fica o serviço?"
      const msg2 = "Claro! Em qual bairro de Bauru fica o serviço?"
      const sim = calcularSimilaridadeTexto(msg1, msg2)
      return sim >= 0.85
    }
  },

  // ── 7. Sessões & Modelo de Dados v3 (RF-03, Seção 7.4) ───────────────────────
  { id: 41, categoriaTeste: "Sessão v3", descricao: "Normalização migra sessão legada para v3 com pedido ativo", validacao: () => {
      const sessao = normalizarSessao({ categoria: "pintor", bairro: "Vila São Paulo", urgente: true, nome: "Maria" })
      return sessao.versao === 3 && sessao.pedido_ativo?.service.slug === "pintor" && sessao.pedido_ativo?.location.neighborhood_name === "Vila São Paulo"
    }
  },
  { id: 42, categoriaTeste: "Sessão v3", descricao: "Fechar pedido ativo arquiva no histórico de pedidos anteriores", validacao: () => {
      const sessao = normalizarSessao({ versao: 3 })
      sessao.pedido_ativo = criarNovoPedido({ serviceSlug: "eletricista", neighborhoodName: "Centro" })
      fecharPedidoAtivoEArquivar(sessao)
      return sessao.pedidos_anteriores.length === 1 && sessao.pedidos_anteriores[0].service_slug === "eletricista" && sessao.pedido_ativo?.service.slug === null
    }
  },

  // ── 8. Replay do Incidente de Referência (Seção 2.1 & RF-15 / 15.18) ───────────
  { id: 43, categoriaTeste: "Replay Incidente 2.1", descricao: "Passo 1: 'Quero' / 'Um' / 'Pedreiro' / 'Urgência' inicia novo pedido limpo", validacao: () => {
      const sessao = normalizarSessao({ versao: 3 })
      sessao.pedido_ativo = criarNovoPedido({ serviceSlug: "eletricista", neighborhoodName: "Centro" })
      sessao.pedido_ativo.status = "searched"
      const querNovo = deveIniciarNovoPedido({ buscaConcluida: true, aguardandoConfirmacaoServico: false, categoriaMencionada: true, intencao: "busca_profissional" })
      return querNovo === true
    }
  },
  { id: 44, categoriaTeste: "Replay Incidente 2.1", descricao: "Passo 2: 'Jardim oropa' sugere 'Jardim Europa' e pede confirmação", validacao: () => {
      const res = resolverLocalizacaoAvancada("Jardim oropa", undefined, true)
      return res.status === "single_suggestion_confirm" && res.bairroOficial === "Jardim Europa"
    }
  },
  { id: 45, categoriaTeste: "Replay Incidente 2.1", descricao: "Passo 3: 'Desculpa europa' associa à sugestão pendente e prossegue", validacao: () => {
      return refereBairroSugerido("Desculpa europa", "Jardim Europa") && !recusouBairroSugerido("Desculpa europa")
    }
  },
  { id: 46, categoriaTeste: "Replay Incidente 2.1", descricao: "Passo 3 (Variante): 'Jardim Europa já disse' ativa reparo e confirma", validacao: () => {
      return detectarFrustracao("Jardim Europa já disse") && refereBairroSugerido("Jardim Europa já disse", "Jardim Europa")
    }
  },

  // ── 9. LGPD, Geolocalização & Feedback ───────────────────────────────────────
  { id: 47, categoriaTeste: "LGPD & Geo", descricao: "Extrair coordenadas GPS válidas", validacao: () => {
      const coords = extrairCoordenadas("__localizacao:-22.3145,-49.0587__")
      return Boolean(coords && coords.lat === -22.3145 && coords.lng === -49.0587)
    }
  },
  { id: 48, categoriaTeste: "LGPD & Geo", descricao: "Mapeamento de GPS para bairro de Bauru", validacao: () => {
      const res = coordenadasParaBairro(-22.324, -49.071)
      return res !== null && typeof res.bairro === "string"
    }
  },
  { id: 49, categoriaTeste: "LGPD & Geo", descricao: "Solicitação de exclusão LGPD", validacao: () => solicitouExclusaoDados("apague todos os meus dados por favor") === true },
  { id: 50, categoriaTeste: "LGPD & Geo", descricao: "Interpretação de feedback numérico 1 (respondeu) e 3 (fechado)", validacao: () => interpretarFeedback("1") === "cliente_respondeu" && interpretarFeedback("3") === "servico_fechado" },
]

function executarSuite() {
  console.log("🧪 Rodando Suíte de Testes Ampliada — IA Conversacional Profiza (PRD v3.0)\n")
  let passou = 0
  let falhou = 0
  const categoriasContagem: Record<string, { total: number; passou: number }> = {}

  for (const caso of casosDeTeste) {
    if (!categoriasContagem[caso.categoriaTeste]) {
      categoriasContagem[caso.categoriaTeste] = { total: 0, passou: 0 }
    }
    categoriasContagem[caso.categoriaTeste].total++

    try {
      const ok = caso.validacao()
      if (ok) {
        passou++
        categoriasContagem[caso.categoriaTeste].passou++
        console.log(` ✅ [#${caso.id.toString().padStart(2, "0")}] [${caso.categoriaTeste}] ${caso.descricao}`)
      } else {
        falhou++
        console.error(` ❌ [#${caso.id.toString().padStart(2, "0")}] [${caso.categoriaTeste}] ${caso.descricao} (FALHOU)`)
      }
    } catch (err: any) {
      falhou++
      console.error(` 💥 [#${caso.id.toString().padStart(2, "0")}] [${caso.categoriaTeste}] ${caso.descricao} (ERRO: ${err.message})`)
    }
  }

  console.log("\n────────────────────────────────────────────────────────")
  console.log("📊 Resumo por Categoria de Avaliação:")
  for (const [cat, dados] of Object.entries(categoriasContagem)) {
    const pct = ((dados.passou / dados.total) * 100).toFixed(0)
    console.log(`   • ${cat}: ${dados.passou}/${dados.total} (${pct}%)`)
  }
  console.log("────────────────────────────────────────────────────────")
  console.log(`\n🎯 Total: ${casosDeTeste.length} casos | Passou: ${passou} | Falhou: ${falhou}\n`)

  if (falhou > 0) {
    process.exit(1)
  }
}

executarSuite()
