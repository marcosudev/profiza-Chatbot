"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CircleDollarSign,
  LayoutGrid,
  MessageSquareText,
  Settings,
  Users,
  Wallet,
} from "lucide-react"

const navItems = [
  { label: "Home", icon: LayoutGrid, href: "/profiza" },
  { label: "Prof.", icon: Users, href: "/profiza/profissionais" },
  { label: "Leads", icon: MessageSquareText, href: "/profiza/leads" },
  { label: "Finanças", icon: Wallet, href: "/profiza/financas" },
  { label: "Config", icon: Settings, href: "/profiza/configuracao" },
]

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/profiza") return pathname === "/profiza"
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden safe-area-bottom"
      aria-label="Navegação principal"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors touch-target ${
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
              )}
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
