"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CircleDollarSign,
  LayoutGrid,
  LogOut,
  MessageSquareText,
  Settings,
  Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, href: "/profiza" },
  { label: "Profissionais", icon: Users, href: "/profiza/profissionais" },
  { label: "Leads", icon: MessageSquareText, href: "/profiza/leads" },
  { label: "Cobrança", icon: CircleDollarSign, href: "/profiza/cobranca" },
  { label: "Configuração", icon: Settings, href: "/profiza/configuracao" },
]

export function Sidebar({ retencao }: { retencao: number }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === "/profiza") return pathname === "/profiza"
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden w-72 bg-sidebar p-5 text-sidebar-foreground md:flex md:flex-col">
      {/* Logo */}
      <Link href="/profiza" className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-80">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary font-display text-xl font-bold text-sidebar-primary-foreground">
          P
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-sidebar-primary">
            Profiza
          </p>
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            Painel admin
          </h2>
        </div>
      </Link>

      {/* Navegação */}
      <nav className="space-y-1">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Card de status */}
      <Link
        href="/profiza/leads"
        className="mt-auto block rounded-2xl border border-sidebar-border bg-sidebar-accent p-4 transition-colors hover:border-sidebar-primary/50"
      >
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sidebar-primary">
          Status do mês
        </p>
        <p className="font-display text-3xl font-bold text-sidebar-foreground">
          {retencao}%
        </p>
        <p className="mt-1 text-sm text-sidebar-foreground/60">
          Taxa de conversão de leads
        </p>
      </Link>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </aside>
  )
}
