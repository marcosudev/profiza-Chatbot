import { createClient } from "@/lib/supabase/server"
import { getConfiguracoes } from "@/lib/supabase/queries"
import { ConfiguracaoClient } from "./configuracao-client"

export default async function ConfiguracaoPage() {
  const supabase = await createClient()
  const [{ data: { user } }, configuracoes] = await Promise.all([
    supabase.auth.getUser(),
    getConfiguracoes(),
  ])

  return <ConfiguracaoClient adminEmail={user?.email ?? ""} configuracoes={configuracoes} />
}
