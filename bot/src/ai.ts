import OpenAI from "openai"
import { config } from "./config"
import { buscarCategoriasEBairrosAtivos } from "./supabase"

const openai = new OpenAI({ apiKey: config.openai.apiKey })

export interface Intencao {
  categoria: string | null
  bairro: string | null
  confianca: "alta" | "media" | "baixa"
}

export async function extrairIntencao(mensagem: string): Promise<Intencao> {
  try {
    const { categorias, bairros } = await buscarCategoriasEBairrosAtivos()

    const systemPrompt = `Você é um extrator de intenção para um serviço de profissionais em Bauru/SP.

Dado o texto de um cliente (que pode conter múltiplas mensagens juntas), extraia:
- categoria: o tipo de serviço solicitado. Se o usuário relatar um problema (ex: "chuveiro queimou", "tomada não funciona", "vazamento"), deduza qual o profissional adequado.
- bairro: o bairro mencionado

Categorias válidas: ${categorias.join(", ")}
Bairros válidos: ${bairros.join(", ")}

Regras:
- Retorne APENAS JSON válido, sem markdown, sem explicação
- Se não encontrar categoria e não conseguir deduzir do problema relatado, retorne null
- Se o usuário pedir "mais opções", "mais contatos" ou repetir uma busca recente, tente manter a categoria deduzida anteriormente ou retorne null para usar o contexto.
- Se não encontrar bairro, retorne null  
- Normalize variações: "luz" → "Eletricista", "vazamento" -> "Encanador", "faxina" -> "Limpeza/Diarista"
- Normalize bairros: "centro", "no centro" → "Centro"
- confianca: "alta" se ambos encontrados, "media" se só categoria, "baixa" se nenhum

Formato de resposta:
{"categoria": "Eletricista", "bairro": "Centro", "confianca": "alta"}`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: mensagem },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return { categoria: null, bairro: null, confianca: "baixa" }

    const parsed = JSON.parse(content) as Intencao

    // Valida que os valores retornados existem nas listas dinâmicas
    const categoriaValida = categorias.find(
      (c) => c.toLowerCase() === parsed.categoria?.toLowerCase()
    ) ?? parsed.categoria ?? null

    const bairroValido = bairros.find(
      (b) => b.toLowerCase() === parsed.bairro?.toLowerCase()
    ) ?? parsed.bairro ?? null

    return {
      categoria: categoriaValida,
      bairro: bairroValido,
      confianca: categoriaValida && bairroValido ? "alta" : categoriaValida ? "media" : "baixa",
    }
  } catch (err) {
    console.error("[ai] Erro ao extrair intenção:", err)
    return { categoria: null, bairro: null, confianca: "baixa" }
  }
}
