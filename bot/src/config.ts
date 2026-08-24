import "dotenv/config"

function obrigatorio(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Variável de ambiente obrigatória não definida: ${key}`)
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
  zapi: {
    instanceId: obrigatorio("ZAPI_INSTANCE_ID"),
    token: obrigatorio("ZAPI_TOKEN"),
    clientToken: obrigatorio("ZAPI_CLIENT_TOKEN"),
    baseUrl() {
      return `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`
    },
  },
}
