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
  Wallet,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { clearAdminSession } from "@/components/profiza/auth-session-guard"

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, href: "/profiza" },
  { label: "Profissionais", icon: Users, href: "/profiza/profissionais" },
  { label: "Leads", icon: MessageSquareText, href: "/profiza/leads" },
  { label: "Cobrança", icon: CircleDollarSign, href: "/profiza/cobranca" },
  { label: "Finanças", icon: Wallet, href: "/profiza/financas" },
  { label: "Configuração", icon: Settings, href: "/profiza/configuracao" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearAdminSession()
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#65A30D] font-display text-xl font-bold text-white shadow-sm">
          P
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight leading-none">
            <span className="text-white">Prof</span>
            <span className="text-[#65A30D]">iza</span>
          </h1>
          <h2 className="text-[11px] font-semibold text-white/50 mt-0.5">
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
