import OpenAI from "openai"
import { config } from "./config"

const openai = new OpenAI({ apiKey: config.openai.apiKey })

// Categorias e bairros válidos — espelham exatamente o banco
const CATEGORIAS = [
  "Eletricista",
  "Encanador",
  "Diarista",
  "Pedreiro",
  "Pintor",
  "Limpeza",
  "Montador",
  "Arquiteto",
]

const BAIRROS = [
  "Centro",
  "Jardim Europa",
  "Vila São José",
  "Alto da Colina",
  "Jardim das Flores",
  "Parque São Paulo",
  "Vila Nery",
  "Bela Vista",
]

export interface Intencao {
  categoria: string | null
  bairro: string | null
  confianca: "alta" | "media" | "baixa"
}

const SYSTEM_PROMPT = `Você é um extrator de intenção para um serviço de profissionais em Bauru/SP.

Dado o texto de um cliente, extraia:
- categoria: o tipo de serviço solicitado
- bairro: o bairro mencionado

Categorias válidas: ${CATEGORIAS.join(", ")}
Bairros válidos: ${BAIRROS.join(", ")}

Regras:
- Retorne APENAS JSON válido, sem markdown, sem explicação
- Se não encontrar categoria, retorne null
- Se não encontrar bairro, retorne null  
- Normalize variações: "eletricista", "elétrico", "luz" → "Eletricista"
- Normalize bairros: "centro", "no centro" → "Centro"
- confianca: "alta" se ambos encontrados, "media" se só categoria, "baixa" se nenhum

Formato de resposta:
{"categoria": "Eletricista", "bairro": "Centro", "confianca": "alta"}`

export async function extrairIntencao(mensagem: string): Promise<Intencao> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: mensagem },
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return { categoria: null, bairro: null, confianca: "baixa" }

    const parsed = JSON.parse(content) as Intencao

    // Valida que os valores retornados existem nas listas
    const categoriaValida = CATEGORIAS.find(
      (c) => c.toLowerCase() === parsed.categoria?.toLowerCase()
    ) ?? null

    const bairroValido = BAIRROS.find(
      (b) => b.toLowerCase() === parsed.bairro?.toLowerCase()
    ) ?? null

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
