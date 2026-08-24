import { getProfissionais, getMetricasMap } from "@/lib/supabase/queries"
import { CobrancaClient } from "./cobranca-client"

export default async function CobrancaPage() {
  const [professionals, metricasMap] = await Promise.all([
    getProfissionais(),
    getMetricasMap(),
  ])
  return <CobrancaClient initialProfessionals={professionals} metricasMap={metricasMap} />
}
