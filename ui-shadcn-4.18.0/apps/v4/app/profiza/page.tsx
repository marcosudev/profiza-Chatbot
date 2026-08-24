import { getDashboardSummary, getProfissionais } from "@/lib/supabase/queries"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
  const [professionals, summary] = await Promise.all([
    getProfissionais(),
    getDashboardSummary(),
  ])

  return <DashboardClient initialProfessionals={professionals} initialSummary={summary} />
}
