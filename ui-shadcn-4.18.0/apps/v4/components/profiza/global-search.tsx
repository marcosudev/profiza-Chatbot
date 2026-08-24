"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  Building2,
  FileText,
  MessageSquareText,
  Search,
  User,
  X,
  Zap,
} from "lucide-react"

import { Input } from "@/registry/new-york-v4/ui/input"
import { useLayoutData } from "@/components/profiza/layout-data-provider"
import type { Professional, PaymentStatus } from "@/lib/profiza-data"
import type { Lead, LeadStatus } from "@/lib/supabase/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultKind = "professional" | "lead" | "page" | "category" | "bairro"

interface SearchResult {
  id: string
  kind: ResultKind
  title: string
  subtitle: string
  href: string
  badge?: string
  badgeClass?: string
}

// ─── Static pages ─────────────────────────────────────────────────────────────

const pages = [
  { id: "pg-1", title: "Dashboard", subtitle: "Visão geral do sistema", href: "/profiza" },
  { id: "pg-2", title: "Profissionais", subtitle: "Gerenciar base de profissionais", href: "/profiza/profissionais" },
  { id: "pg-3", title: "Leads", subtitle: "Histórico de roteamentos", href: "/profiza/leads" },
  { id: "pg-4", title: "Cobrança", subtitle: "Gestão de assinaturas e testes", href: "/profiza/cobranca" },
  { id: "pg-5", title: "Configuração", subtitle: "Ajustes do sistema", href: "/profiza/configuracao" },
  { id: "pg-6", title: "Profissionais ativos", subtitle: "Filtrar por status ativo", href: "/profiza/profissionais?status=ativo" },
  { id: "pg-7", title: "Profissionais em teste grátis", subtitle: "Filtrar por teste grátis", href: "/profiza/profissionais?status=teste_gratis" },
  { id: "pg-8", title: "Profissionais inativos", subtitle: "Filtrar por status inativo", href: "/profiza/profissionais?status=inativo" },
]

// ─── Badge config ──────────────────────────────────────────────────────────────

const statusBadge: Record<PaymentStatus | LeadStatus, { label: string; cls: string }> = {
  ativo: { label: "Ativo", cls: "bg-[--profiza-badge-ativo-bg] text-[--profiza-badge-ativo-fg]" },
  teste_gratis: { label: "Teste grátis", cls: "bg-[--profiza-badge-teste-bg] text-[--profiza-badge-teste-fg]" },
  inativo: { label: "Inativo", cls: "bg-destructive/15 text-destructive" },
  novo: { label: "Novo", cls: "bg-[--profiza-badge-teste-bg] text-[--profiza-badge-teste-fg]" },
  enviado: { label: "Enviado", cls: "bg-[--profiza-badge-ativo-bg] text-[--profiza-badge-ativo-fg]" },
  sem_resposta: { label: "Sem resposta", cls: "bg-destructive/15 text-destructive" },
  convertido: { label: "Convertido", cls: "bg-ring/20 text-ring" },
}

// ─── Index builder ─────────────────────────────────────────────────────────────

function buildIndex(professionals: Professional[], leads: Lead[]): SearchResult[] {
  const results: SearchResult[] = []

  for (const p of professionals) {
    results.push({
      id: p.id,
      kind: "professional",
      title: p.nome,
      subtitle: `${p.categoria} · ${p.bairros.join(", ")} · ${p.whatsapp}`,
      href: `/profiza/profissionais?highlight=${p.id}`,
      badge: statusBadge[p.status]?.label,
      badgeClass: statusBadge[p.status]?.cls,
    })
  }

  for (const l of leads) {
    results.push({
      id: l.id,
      kind: "lead",
      title: l.cliente,
      subtitle: `${l.categoria} · ${l.bairro}${l.profissional ? ` · ${l.profissional}` : ""} · ${l.telefone}`,
      href: `/profiza/leads?highlight=${l.id}`,
      badge: statusBadge[l.status]?.label,
      badgeClass: statusBadge[l.status]?.cls,
    })
  }

  for (const pg of pages) {
    results.push({ id: pg.id, kind: "page", title: pg.title, subtitle: pg.subtitle, href: pg.href })
  }

  const cats = [...new Set(professionals.map((p) => p.categoria))]
  for (const cat of cats) {
    results.push({
      id: `cat-${cat}`,
      kind: "category",
      title: cat,
      subtitle: `Ver todos os profissionais de ${cat}`,
      href: `/profiza/profissionais?categoria=${encodeURIComponent(cat)}`,
    })
  }

  const bairros = [...new Set(professionals.flatMap((p) => p.bairros))]
  for (const b of bairros) {
    results.push({
      id: `bairro-${b}`,
      kind: "bairro",
      title: b,
      subtitle: `Ver profissionais no bairro ${b}`,
      href: `/profiza/profissionais?bairro=${encodeURIComponent(b)}`,
    })
  }

  return results
}

function search(index: SearchResult[], query: string): SearchResult[] {
  if (!query.trim()) return []
  const tokens = query.toLowerCase().trim().split(/\s+/)
  return index
    .filter((r) => {
      const hay = `${r.title} ${r.subtitle} ${r.kind}`.toLowerCase()
      return tokens.every((t) => hay.includes(t))
    })
    .slice(0, 12)
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: ResultKind }) {
  const cls = "h-4 w-4 shrink-0"
  switch (kind) {
    case "professional": return <User className={cls} />
    case "lead": return <MessageSquareText className={cls} />
    case "page": return <FileText className={cls} />
    case "category": return <Building2 className={cls} />
    case "bairro": return <Zap className={cls} />
  }
}

const kindLabel: Record<ResultKind, string> = {
  professional: "Profissional",
  lead: "Lead",
  page: "Página",
  category: "Categoria",
  bairro: "Bairro",
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
  placeholder?: string
}

export function GlobalSearch({ open, onClose, placeholder = "Buscar em todo o sistema..." }: GlobalSearchProps) {
  const router = useRouter()
  const { profissionais, leads } = useLayoutData()
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const index = React.useMemo(() => buildIndex(profissionais, leads), [profissionais, leads])
  const results = React.useMemo(() => search(index, query), [index, query])

  React.useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  React.useEffect(() => { setActiveIndex(0) }, [results.length])

  const navigate = (href: string) => { router.push(href); onClose() }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    if (e.key === "Enter" && results[activeIndex]) navigate(results[activeIndex].href)
  }

  if (!open) return null

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const g = kindLabel[r.kind]
    if (!acc[g]) acc[g] = []
    acc[g].push(r)
    return acc
  }, {})

  let flatIndex = 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />
      <div
        className="relative mx-4 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-10 flex-1 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
            />
            {query && (
              <button onClick={() => setQuery("")} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">
              Esc
            </button>
          </div>

          {query.trim() === "" ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Digite para buscar profissionais, leads, páginas, categorias ou bairros
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">Use ↑↓ para navegar · Enter para abrir · Esc para fechar</p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum resultado para <span className="font-medium text-foreground">"{query}"</span>
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {group}
                  </p>
                  {items.map((r) => {
                    const idx = flatIndex++
                    const isActive = idx === activeIndex
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(r.href)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? "bg-muted" : "hover:bg-muted/50"}`}
                      >
                        <span className={`shrink-0 rounded-lg p-1.5 ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <KindIcon kind={r.kind} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                        </span>
                        {r.badge && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.badgeClass}`}>
                            {r.badge}
                          </span>
                        )}
                        <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isActive ? "text-muted-foreground opacity-100" : "opacity-0"}`} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="flex items-center gap-4 border-t border-border px-4 py-2">
              <span className="text-[11px] text-muted-foreground"><kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> navegar</span>
              <span className="text-[11px] text-muted-foreground"><kbd className="rounded border border-border bg-muted px-1">↵</kbd> abrir</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{results.length} resultado{results.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
