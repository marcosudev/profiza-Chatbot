import "dotenv/config"

function require(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Variável de ambiente obrigatória não definida: ${key}`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  webhookSecret: require("WEBHOOK_SECRET"),
  supabase: {
    url: require("SUPABASE_URL"),
    serviceRoleKey: require("SUPABASE_SERVICE_ROLE_KEY"),
  },
  openai: {
    apiKey: require("OPENAI_API_KEY"),
  },
  zapi: {
    instanceId: require("ZAPI_INSTANCE_ID"),
    token: require("ZAPI_TOKEN"),
    clientToken: require("ZAPI_CLIENT_TOKEN"),
    baseUrl() {
      return `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`
    },
  },
}
