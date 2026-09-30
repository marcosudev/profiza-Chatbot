import OpenAI from "openai"
import { config } from "./config"
import { bairros, resolverBairro } from "./knowledge/bairros-bauru"
import { categorias, slugsValidos, resolverCategoria } from "./knowledge/categorias"
import { promptSistema } from "./knowledge/institucional"
import type { Sessao } from "./session"

const openai = new OpenAI({ apiKey: config.openai.apiKey })

const LLM_MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini"

export interface Intencao {
  categoria: string | null
  bairro: string | null
  regiao: string | null
  intencao: "busca_profissional" | "mais_opcoes" | "feedback" | "cadastro_profissional" | "emergencia" | "fora_escopo" | "saudacao"
  confianca: number
  mensagem: string
}

function montarContextoBairros(): string {
  const porRegiao: Record<string, string[]> = {}
  for (const b of bairros) {
    if (!porRegiao[b.regiao]) porRegiao[b.regiao] = []
    porRegiao[b.regiao].push(b.nome)
  }
  return Object.entries(porRegiao)
    .map(([regiao, nomes]) => `${regiao}: ${nomes.join(", ")}`)
    .join("\n")
}

function montarContextoCategorias(): string {
  return categorias.map(c => `${c.slug} (${c.label})`).join(", ")
}

export async function extrairIntencao(
  mensagem: string,
  sessao: Sessao
): Promise<Intencao> {
  // Tenta resolver localmente antes de chamar a IA (mais rápido e barato)
  const catLocal = resolverCategoria(mensagem)
  const bairroLocal = resolverBairro(mensagem)

  const contextoSessao = sessao.categoria || sessao.bairro
    ? `\nCONTEXTO DA SESSÃO ATUAL: categoria=${sessao.categoria ?? "não definida"}, bairro=${sessao.bairro ?? "não definido"}`
    : ""

  const system = promptSistema(montarContextoBairros(), montarContextoCategorias()) + contextoSessao

  try {
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: mensagem },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return fallback(catLocal, bairroLocal)

    const parsed = JSON.parse(content) as Partial<Intencao>

    // Valida categoria contra slugs válidos
    const categoria = parsed.categoria && slugsValidos.includes(parsed.categoria)
      ? parsed.categoria
      : catLocal?.slug ?? null

    // Valida bairro contra lista oficial
    const bairroResolvido = parsed.bairro
      ? resolverBairro(parsed.bairro) ?? bairroLocal
      : bairroLocal

    return {
      categoria,
      bairro: bairroResolvido?.bairro ?? null,
      regiao: bairroResolvido?.regiao ?? parsed.regiao ?? null,
      intencao: parsed.intencao ?? "busca_profissional",
      confianca: parsed.confianca ?? 0.5,
      mensagem: parsed.mensagem ?? "",
    }
  } catch (err) {
    console.error("[ai] Erro ao extrair intenção:", err)
    return fallback(catLocal, bairroLocal)
  }
}

function fallback(
  catLocal: ReturnType<typeof resolverCategoria>,
  bairroLocal: ReturnType<typeof resolverBairro>
): Intencao {
  return {
    categoria: catLocal?.slug ?? null,
    bairro: bairroLocal?.bairro ?? null,
    regiao: bairroLocal?.regiao ?? null,
    intencao: "busca_profissional",
    confianca: 0.3,
    mensagem: "",
  }
}
