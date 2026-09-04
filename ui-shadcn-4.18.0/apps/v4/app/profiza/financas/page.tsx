import { getFinancasSummary, getDespesas, getFaturas } from "@/lib/supabase/queries"
import { FinancasClient } from "./financas-client"

export const dynamic = "force-dynamic"

export default async function FinancasPage() {
  const [summary, despesas, faturas] = await Promise.all([
    getFinancasSummary(),
    getDespesas(),
    getFaturas(),
  ])

  return <FinancasClient summary={summary} despesas={despesas} faturas={faturas} />
}

