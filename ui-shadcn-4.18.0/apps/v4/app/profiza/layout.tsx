import {
  getProfissionais,
  getLeads,
  getNotificacoes,
} from "@/lib/supabase/queries"
import { Sidebar } from "@/components/profiza/sidebar"
import { MobileNav } from "@/components/profiza/mobile-nav"
import { LayoutDataProvider } from "@/components/profiza/layout-data-provider"
import { AuthSessionGuard } from "@/components/profiza/auth-session-guard"

const deployVersion = process.env.NEXT_PUBLIC_DEPLOY_VERSION ?? "development"

export default async function ProfizaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profissionais, leads, notificacoes] = await Promise.all([
    getProfissionais(),
    getLeads(),
    getNotificacoes(),
  ])

  return (
    <AuthSessionGuard deployVersion={deployVersion}>
      <div className="min-h-screen-mobile bg-background text-foreground">
        <div className="flex min-h-screen-mobile">
          <Sidebar />
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
    </AuthSessionGuard>
  )
}
