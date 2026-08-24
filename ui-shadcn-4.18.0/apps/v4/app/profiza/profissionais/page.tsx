import { getProfissionais, getMetricasMap } from "@/lib/supabase/queries"
import { ProfissionaisClient } from "./profissionais-client"

export default async function ProfissionaisPage() {
  const [professionals, metricasMap] = await Promise.all([
    getProfissionais(),
    getMetricasMap(),
  ])
  return <ProfissionaisClient initialProfessionals={professionals} metricasMap={metricasMap} />
}
