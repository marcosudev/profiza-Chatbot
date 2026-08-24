import {
  getProfissionais,
  getLeads,
  getNotificacoes,
  getRetencaoLeads,
} from "@/lib/supabase/queries"
import { Sidebar } from "@/components/profiza/sidebar"
import { MobileNav } from "@/components/profiza/mobile-nav"
import { LayoutDataProvider } from "@/components/profiza/layout-data-provider"

export default async function ProfizaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profissionais, leads, notificacoes, retencao] = await Promise.all([
    getProfissionais(),
    getLeads(),
    getNotificacoes(),
    getRetencaoLeads(),
  ])

  return (
    <div className="min-h-screen-mobile bg-background text-foreground">
      <div className="flex min-h-screen-mobile">
        <Sidebar retencao={retencao} />
        <main className="flex-1 pb-mobile-nav md:pb-0">
          <LayoutDataProvider
            profissionais={profissionais}
            leads={leads}
            notificacoes={notificacoes}
          >
            {children}
          </LayoutDataProvider>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
