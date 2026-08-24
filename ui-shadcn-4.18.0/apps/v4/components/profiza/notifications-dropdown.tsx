"use client"

import * as React from "react"
import { AlertTriangle, BellRing, CheckCircle2, Clock, MessageSquare } from "lucide-react"

import { Button } from "@/registry/new-york-v4/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu"

import { useLayoutData } from "@/components/profiza/layout-data-provider"
import type { NotificacaoTipo } from "@/lib/supabase/queries"

const iconMap: Record<NotificacaoTipo, React.ElementType> = {
  teste_vencendo: Clock,
  novo_lead: MessageSquare,
  sem_resposta: AlertTriangle,
}

const colorMap: Record<NotificacaoTipo, string> = {
  teste_vencendo: "text-amber-500",
  novo_lead: "text-primary",
  sem_resposta: "text-destructive",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / (1000 * 60 * 60))
  if (h < 1) return "Agora"
  if (h < 24) return `Há ${h}h`
  const d = Math.floor(h / 24)
  return `Há ${d} dia${d !== 1 ? "s" : ""}`
}

export function NotificationsDropdown() {
  const { notificacoes } = useLayoutData()
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set())

  const unreadCount = notificacoes.filter((n) => !readIds.has(n.id)).length

  const markAsRead = (id: string) =>
    setReadIds((prev) => new Set([...prev, id]))

  const markAllAsRead = () =>
    setReadIds(new Set(notificacoes.map((n) => n.id)))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-xl border border-border p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <BellRing className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-normal text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notificacoes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Tudo em dia</p>
          </div>
        ) : (
          notificacoes.slice(0, 6).map((n) => {
            const Icon = iconMap[n.type]
            const isRead = readIds.has(n.id)
            return (
              <DropdownMenuItem
                key={n.id}
                className="flex cursor-pointer gap-3 p-3"
                onClick={() => markAsRead(n.id)}
              >
                <div className={`mt-0.5 ${colorMap[n.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm ${!isRead ? "font-medium" : ""}`}>
                      {n.title}
                    </p>
                    {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.description}</p>
                  <p className="text-xs text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
                </div>
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
