import "dotenv/config"

function obrigatorio(key: string): string {
  const value = process.env[key]
  if (!value) {
    if (process.env.NODE_ENV === "test") {
      if (key === "SUPABASE_URL") return "https://mock.supabase.co"
      return `test_${key.toLowerCase()}`
    }
    throw new Error(`Variável de ambiente obrigatória não definida: ${key}`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  webhookSecret: obrigatorio("WEBHOOK_SECRET"),
  supabase: {
    url: obrigatorio("SUPABASE_URL"),
    serviceRoleKey: obrigatorio("SUPABASE_SERVICE_ROLE_KEY"),
  },
  openai: {
    apiKey: obrigatorio("OPENAI_API_KEY"),
  },
  evolution: {
    baseUrl: obrigatorio("EVOLUTION_BASE_URL"),
    instance: obrigatorio("EVOLUTION_INSTANCE"),
    apiKey: obrigatorio("EVOLUTION_API_KEY"),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    groupId: process.env.TELEGRAM_GROUP_ID ?? "",
  },
  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN ?? "",
  },
  publicUrl: process.env.PUBLIC_URL ?? "https://profiza.net",
}
