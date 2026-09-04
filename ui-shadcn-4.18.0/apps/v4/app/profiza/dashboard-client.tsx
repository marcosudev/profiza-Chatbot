"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  MessageSquareText,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/new-york-v4/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/new-york-v4/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/new-york-v4/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/new-york-v4/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

import { Header } from "@/components/profiza/header"
import { ProfessionalForm } from "@/components/profiza/professional-form"
import { ProfessionalEditDialog } from "@/components/profiza/professional-edit-dialog"
import { ProfessionalDrawer } from "@/components/profiza/professional-drawer"
import { KpiCarousel } from "@/components/profiza/kpi-carousel"
import { useDebounce } from "@/hooks/use-debounce"
import {
  actionCreateProfissional,
  actionUpdateStatus,
} from "@/app/profiza/actions/profissionais"
import type { ProfessionalFormData } from "@/lib/profiza-schemas"
import type { PaymentStatus, Professional } from "@/lib/profiza-data"

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  ativo: {
    label: "Ativo",
    className: "bg-[--profiza-badge-ativo-bg] text-[--profiza-badge-ativo-fg]",
  },
  teste_gratis: {
    label: "Teste grátis",
    className: "bg-[--profiza-badge-teste-bg] text-[--profiza-badge-teste-fg]",
  },
  inativo: {
    label: "Inativo",
    className: "bg-destructive text-destructive-foreground",
  },
}

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(dateIso))
}

interface Props {
  initialProfessionals: Professional[]
  initialSummary: {
    ativos: number
    testeGratis: number
    leadsSemana: number
    vencendoSeteDias: number
  }
}

export function DashboardClient({ initialProfessionals, initialSummary }: Props) {
  const [rows, setRows] = React.useState(initialProfessionals)
  const [summary, setSummary] = React.useState(initialSummary)
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("todos")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingProfessional, setEditingProfessional] = React.useState<Professional | null>(null)
  const [viewingProfessional, setViewingProfessional] = React.useState<Professional | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      const matchesQuery =
        !debouncedQuery ||
        `${row.nome} ${row.categoria} ${row.bairros.join(" ")}`
          .toLowerCase()
          .includes(debouncedQuery.toLowerCase())
      const matchesStatus =
        statusFilter === "todos" || row.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [rows, debouncedQuery, statusFilter])

  const handleStatusChange = async (id: string, nextStatus: PaymentStatus) => {
    // Optimistic update
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, status: nextStatus } : row
      )
    )
    try {
      await actionUpdateStatus(id, nextStatus)
      toast.success("Status atualizado")
    } catch {
      // Reverter em caso de erro
      setRows(initialProfessionals)
      toast.error("Erro ao atualizar status")
    }
  }

  const handleCreate = async (data: ProfessionalFormData) => {
    try {
      const novo = await actionCreateProfissional({
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email || undefined,
        categoria: data.categoria,
        bairros: data.bairros,
        status: "teste_gratis",
        testeGratisExpiraEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      setRows((current) => [novo, ...current])
      setSummary((s) => ({ ...s, testeGratis: s.testeGratis + 1 }))
      setCreateOpen(false)
      toast.success("Profissional cadastrado com sucesso")
    } catch {
      toast.error("Erro ao cadastrar profissional")
    }
  }

  const handleEdit = async (id: string, data: ProfessionalFormData) => {
    const { actionUpdateProfissional } = await import("@/app/profiza/actions/profissionais")
    try {
      const updated = await actionUpdateProfissional(id, {
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email || undefined,
        categoria: data.categoria,
        bairros: data.bairros,
      })
      setRows((current) =>
        current.map((row) => (row.id === id ? updated : row))
      )
      toast.success("Profissional atualizado com sucesso")
    } catch {
      toast.error("Erro ao atualizar profissional")
    }
  }

  const checklist = [
    {
      text: `${summary.vencendoSeteDias} testes grátis vencendo em 7 dias`,
      done: summary.vencendoSeteDias === 0,
      urgent: summary.vencendoSeteDias > 0,
      href: "/profiza/cobranca",
    },
    {
      text: `${rows.filter((r) => r.status === "inativo").length} profissionais inativos`,
      done: rows.filter((r) => r.status === "inativo").length === 0,
      href: "/profiza/profissionais?status=inativo",
    },
    {
      text: `${summary.leadsSemana} leads roteados esta semana`,
      done: true,
      href: "/profiza/leads",
    },
  ]

  return (
    <>
      <Header
        title="Dashboard Profiza"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar profissional"
        onPrimaryAction={() => setCreateOpen(true)}
        primaryActionLabel="Novo"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="hidden md:inline-flex">
                <Plus className="h-4 w-4" />
                Novo profissional
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Novo profissional</DialogTitle>
                <DialogDescription>
                  Cadastre um prestador e deixe o lead rotear em minutos.
                </DialogDescription>
              </DialogHeader>
              <ProfessionalForm
                onSubmit={handleCreate}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex h-[calc(100vh-72px)] flex-col gap-3 overflow-hidden p-4 lg:p-6">
        {/* KPI Cards */}
        <section>
          <div className="md:hidden">
            <KpiCarousel>
              {[
                { label: "Prof. ativos", value: summary.ativos, icon: Building2, trend: `${summary.ativos} com plano`, href: "/profiza/profissionais?status=ativo" },
                { label: "Leads", value: summary.leadsSemana, icon: MessageSquareText, trend: "esta semana", href: "/profiza/leads" },
                { label: "Teste grátis", value: summary.testeGratis, icon: Users, trend: "em avaliação", href: "/profiza/cobranca" },
                { label: "Vencendo", value: summary.vencendoSeteDias, icon: BellRing, trend: "em 7 dias", href: "/profiza/cobranca" },
              ].map(({ label, value, icon: Icon, trend, href }) => (
                <Link key={label} href={href}>
                  <Card className="border-none shadow-sm">
                    <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                        <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          <span className="font-medium text-primary">{trend}</span>
                        </p>
                      </div>
                      <div className="shrink-0 rounded-xl p-2" style={{ backgroundColor: "var(--profiza-icon-bg)", color: "var(--profiza-icon-fg)" }}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </KpiCarousel>
          </div>

          <div className="hidden grid-cols-4 gap-3 md:grid">
            {[
              { label: "Profissionais ativos", value: summary.ativos, icon: Building2, trend: `${summary.ativos} com plano`, description: "Prestadores com plano em dia", href: "/profiza/profissionais?status=ativo" },
              { label: "Leads na semana", value: summary.leadsSemana, icon: MessageSquareText, trend: "esta semana", description: "Roteados no período vigente", href: "/profiza/leads" },
              { label: "Em teste grátis", value: summary.testeGratis, icon: Users, trend: "em avaliação", description: "Precisam atenção na cobrança", href: "/profiza/cobranca" },
              { label: "Vencendo em 7 dias", value: summary.vencendoSeteDias, icon: BellRing, trend: "em 7 dias", description: "Lista de follow-up do admin", href: "/profiza/cobranca" },
            ].map(({ label, value, icon: Icon, trend, description, href }) => (
              <Link key={label} href={href}>
                <Card className="group border-none shadow-sm transition-all hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <TrendingUp className="h-3 w-3 text-primary" aria-hidden="true" />
                        <span className="font-medium text-primary">{trend}</span>
                        <span className="hidden xl:inline">· {description}</span>
                      </p>
                    </div>
                    <div className="shrink-0 rounded-xl p-2" style={{ backgroundColor: "var(--profiza-icon-bg)", color: "var(--profiza-icon-fg)" }}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[3fr_2fr]">
          <Card className="flex min-h-0 flex-col border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/50 px-5 py-3.5">
              <div>
                <CardTitle className="text-sm font-semibold">Profissionais</CardTitle>
                <CardDescription className="text-xs">Base ativa em Bauru</CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="teste_gratis">Teste grátis</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-7 px-3 text-xs" asChild>
                  <Link href="/profiza/profissionais">Ver todos</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
              {/* Mobile */}
              <div className="space-y-2 p-4 md:hidden">
                {filteredRows.slice(0, 4).map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setViewingProfessional(row)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-left transition-colors active:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{row.nome}</span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusConfig[row.status].className}`}>
                          {statusConfig[row.status].label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {row.categoria} • {row.bairros.slice(0, 2).join(", ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-foreground">{row.leadsSemana}</p>
                      <p className="text-[10px] text-muted-foreground">leads</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden h-full md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableHead className="h-8 pl-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Nome</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Categoria</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Bairros</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="h-8 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Leads</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Atividade</TableHead>
                      <TableHead className="h-8 pr-5 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.slice(0, 6).map((row) => (
                      <TableRow key={row.id} className="border-border/40 transition-colors">
                        <TableCell className="py-2 pl-5">
                          <button
                            onClick={() => setViewingProfessional(row)}
                            className="block text-sm font-medium text-foreground hover:text-primary"
                          >
                            {row.nome}
                          </button>
                          <a
                            href={`https://wa.me/${row.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-muted-foreground hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.whatsapp}
                          </a>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-foreground">{row.categoria}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: "var(--profiza-tag-bg)", color: "var(--profiza-tag-fg)" }}>
                              {row.bairros[0]}
                            </span>
                            {row.bairros.length > 1 && (
                              <span className="text-[10px] text-muted-foreground">+{row.bairros.length - 1}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Select
                            value={row.status}
                            onValueChange={(value) => handleStatusChange(row.id, value as PaymentStatus)}
                          >
                            <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig[row.status].className}`}>
                                {statusConfig[row.status].label}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ativo">Ativo</SelectItem>
                              <SelectItem value="teste_gratis">Teste grátis</SelectItem>
                              <SelectItem value="inativo">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2 text-center text-sm font-semibold text-foreground">{row.leadsSemana}</TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground">{formatDate(row.ultimaAtividade)}</TableCell>
                        <TableCell className="py-2 pr-5 text-right">
                          <button
                            onClick={() => setEditingProfessional(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            Abrir <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex min-h-0 flex-col gap-3">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-border/50 px-5 py-3">
                <CardTitle className="text-sm font-semibold">Checklist de cobrança</CardTitle>
                <CardDescription className="text-xs">O que revisar hoje</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {checklist.map((item, i) => (
                  <Link
                    key={item.text}
                    href={item.href}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 ${i < checklist.length - 1 ? "border-b border-border/40" : ""}`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-ring" />
                    ) : (
                      <Clock className={`h-4 w-4 shrink-0 ${item.urgent ? "text-destructive" : "text-muted-foreground"}`} />
                    )}
                    <span className={`text-sm ${item.urgent ? "font-medium text-destructive" : "text-foreground"}`}>
                      {item.text}
                    </span>
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-border/50 px-5 py-3">
                <CardTitle className="text-sm font-semibold">Resumo do fluxo</CardTitle>
                <CardDescription className="text-xs">Indicadores operacionais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {[
                  {
                    label: "Taxa de conversão",
                    value: Math.round((summary.ativos / (summary.ativos + summary.testeGratis || 1)) * 100),
                    tooltip: `${summary.ativos} ativos de ${summary.ativos + summary.testeGratis} total`,
                  },
                  { label: "Qualidade de categoria", value: 96, tooltip: "Profissionais com categoria bem definida" },
                  {
                    label: "Base ativa",
                    value: Math.round((summary.ativos / (rows.length || 1)) * 100),
                    tooltip: `${summary.ativos} ativos de ${rows.length} cadastrados`,
                  },
                ].map(({ label, value, tooltip }) => (
                  <TooltipProvider key={label} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-xs font-semibold tabular-nums text-foreground">{value}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--profiza-progress-track)" }}>
                            <div className="h-full rounded-full bg-ring transition-all duration-700" style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p>{tooltip}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <ProfessionalEditDialog
        professional={editingProfessional}
        open={!!editingProfessional}
        onOpenChange={(open) => !open && setEditingProfessional(null)}
        onSave={handleEdit}
      />

      <ProfessionalDrawer
        professional={viewingProfessional}
        open={!!viewingProfessional}
        onOpenChange={(open) => !open && setViewingProfessional(null)}
        onEdit={() => {
          if (viewingProfessional) {
            setEditingProfessional(viewingProfessional)
            setViewingProfessional(null)
          }
        }}
      />
    </>
  )
}
