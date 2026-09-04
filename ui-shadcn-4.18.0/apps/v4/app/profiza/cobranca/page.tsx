import { getConfiguracoes, getMetricasMap, getProfissionais } from "@/lib/supabase/queries"
import { CobrancaClient } from "./cobranca-client"

export default async function CobrancaPage() {
  const [professionals, metricasMap, configuracoes] = await Promise.all([
    getProfissionais(),
    getMetricasMap(),
    getConfiguracoes(),
  ])
  return (
    <CobrancaClient
      initialProfessionals={professionals}
      metricasMap={metricasMap}
      subscriptionPrice={configuracoes.subscriptionPrice}
    />
  )
}
