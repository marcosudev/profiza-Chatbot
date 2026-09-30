"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Calendar,
  Eye,
  MessageSquareText,
  MoreHorizontal,
  RefreshCw,
  TrendingUp,
  User,
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
} from "@/registry/new-york-v4/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu"
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

import { actionUpdateLeadStatus } from "@/app/profiza/actions/profissionais"
import { Header } from "@/components/profiza/header"
import { Pagination } from "@/components/profiza/pagination"
import { PullToRefresh } from "@/components/profiza/pull-to-refresh"
import { useHighlight } from "@/hooks/use-highlight"
import type { Lead, LeadStatus } from "@/lib/supabase/queries"

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-[--profiza-badge-teste-bg] text-[--profiza-badge-teste-fg]" },
  enviado: { label: "Enviado", className: "bg-[--profiza-badge-ativo-bg] text-[--profiza-badge-ativo-fg]" },
  sem_resposta: { label: "Sem resposta", className: "bg-destructive text-destructive-foreground" },
  convertido: { label: "Convertido", className: "bg-ring/20 text-ring" },
}

const feedbackLabels = {
  cliente_respondeu: "Cliente respondeu",
  orcamento_enviado: "Orçamento enviado",
  servico_fechado: "Serviço fechado",
  sem_resposta: "Cliente não respondeu",
  contato_invalido: "Contato inválido",
} as const

function linkWhatsApp(telefone: string): string | null {
  const numero = telefone.replace(/\D/g, "")
  return /^\d{10,15}$/.test(numero) ? `https://wa.me/${numero}` : null
}

interface Props {
  initialLeads: Lead[]
}

export function LeadsClient({ initialLeads }: Props) {
  const highlightId = useHighlight()
  const [leads] = React.useState(initialLeads)
  const [periodo, setPeriodo] = React.useState("semana")
  const [statusFilter, setStatusFilter] = React.useState("todos")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)

  const filteredLeads = React.useMemo(() => {
    const now = new Date()
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "todos" || lead.status === statusFilter
      const leadDate = new Date(lead.data)
      let matchesPeriodo = true
      if (periodo === "hoje") {
        matchesPeriodo = leadDate.toDateString() === now.toDateString()
      } else if (periodo === "semana") {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        matchesPeriodo = leadDate >= weekAgo
      } else if (periodo === "mes") {
        const monthAgo = new Date(now)
        monthAgo.setDate(monthAgo.getDate() - 30)
        matchesPeriodo = leadDate >= monthAgo
      }
      return matchesStatus && matchesPeriodo
    })
  }, [leads, periodo, statusFilter])

  const totalPages = Math.ceil(filteredLeads.length / pageSize)
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  React.useEffect(() => { setCurrentPage(1) }, [periodo, statusFilter, pageSize])

  const handleRerotear = async (lead: Lead) => {
    try {
      await actionUpdateLeadStatus(lead.id, "novo")
      toast.success(`Lead de ${lead.cliente} re-roteado`)
    } catch {
      toast.error("Erro ao re-rotear lead")
    }
  }

  const formatDate = (dateIso: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(dateIso))

  const summary = {
    total: leads.length,
    enviados: leads.filter((l) => l.status === "enviado" || l.status === "convertido").length,
    semResposta: leads.filter((l) => l.status === "sem_resposta").length,
    convertidos: leads.filter((l) => l.status === "convertido").length,
  }

  return (
    <>
      <Header title="Leads" subtitle="Histórico de roteamentos" />

      <div className="space-y-4 p-4 md:space-y-6 lg:p-8">
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <button onClick={() => { setStatusFilter("todos"); setPeriodo("semana") }} className="text-left">
            <Card className={`border-none shadow-sm transition-shadow hover:shadow-md ${statusFilter === "todos" && periodo === "semana" ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
                <CardDescription className="text-[11px] md:text-sm">Total semana</CardDescription>
                <MessageSquareText className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <p className="font-display text-2xl font-bold text-foreground md:text-3xl">{summary.total}</p>
                <p className="flex items-center gap-1 text-xs text-primary md:text-sm">
                  <TrendingUp className="h-3 w-3" />
                  {leads.length} total
                </p>
              </CardContent>
            </Card>
          </button>

          <button onClick={() => setStatusFilter("enviado")} className="text-left">
            <Card className={`border-none shadow-sm transition-shadow hover:shadow-md ${statusFilter === "enviado" ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
                <CardDescription className="text-[11px] md:text-sm">Enviados</CardDescription>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <p className="font-display text-2xl font-bold text-foreground md:text-3xl">{summary.enviados}</p>
                <p className="text-xs text-muted-foreground md:text-sm">
                  {summary.total > 0 ? Math.round((summary.enviados / summary.total) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>
          </button>

          <button onClick={() => setStatusFilter("sem_resposta")} className="text-left">
            <Card className={`border-none shadow-sm transition-shadow hover:shadow-md ${statusFilter === "sem_resposta" ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
                <CardDescription className="text-[11px] md:text-sm">Sem resposta</CardDescription>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <p className="font-display text-2xl font-bold text-foreground md:text-3xl">{summary.semResposta}</p>
                <p className="text-xs text-destructive md:text-sm">Atenção</p>
              </CardContent>
            </Card>
          </button>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
              <CardDescription className="text-[11px] md:text-sm">Convertidos</CardDescription>
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="font-display text-2xl font-bold text-foreground md:text-3xl">{summary.convertidos}</p>
              <p className="text-xs text-muted-foreground md:text-sm">
                {summary.total > 0 ? Math.round((summary.convertidos / summary.total) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <CardTitle className="text-base md:text-lg">Histórico de leads</CardTitle>
              <CardDescription className="text-xs md:text-sm">{filteredLeads.length} leads no período</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="h-8 w-24 text-xs md:h-9 md:w-32 md:text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-24 text-xs md:h-9 md:w-32 md:text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="sem_resposta">Sem resposta</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile */}
            <div className="md:hidden">
              <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); toast.success("Leads atualizados") }}>
                <div className="space-y-2 px-4 pb-4">
                  {paginatedLeads.map((lead) => (
                    <button
                      key={lead.id}
                      data-highlight-id={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`flex w-full items-start justify-between gap-3 rounded-xl p-3 text-left transition-all ${
                        highlightId === lead.id
                          ? "bg-primary/10 ring-2 ring-primary ring-offset-1"
                          : "bg-muted/50 active:bg-muted"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{lead.cliente}</span>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusConfig[lead.status].className}`}>
                            {statusConfig[lead.status].label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{lead.categoria} • {lead.bairro}</p>
                        {lead.profissional && <p className="mt-0.5 text-[11px] text-muted-foreground">→ {lead.profissional}</p>}
                        {lead.feedbackStatus && <p className="mt-0.5 text-[11px] text-primary">{feedbackLabels[lead.feedbackStatus]}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-muted-foreground">{formatDate(lead.data)}</p>
                        {linkWhatsApp(lead.telefone) ? (
                          <a
                            href={linkWhatsApp(lead.telefone) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            WhatsApp
                          </a>
                        ) : <span className="mt-1 block text-[10px] text-muted-foreground">Contato protegido</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </PullToRefresh>
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Bairro</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      data-highlight-id={lead.id}
                      className={`transition-all ${highlightId === lead.id ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""}`}
                    >
                      <TableCell>
                        <div>
                          <button onClick={() => setSelectedLead(lead)} className="font-medium text-foreground hover:text-primary hover:underline">
                            {lead.cliente}
                          </button>
                          {linkWhatsApp(lead.telefone) ? (
                            <a href={linkWhatsApp(lead.telefone) ?? undefined} target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-primary hover:underline">
                              {lead.telefone}
                            </a>
                          ) : <span className="block text-xs text-muted-foreground">Contato protegido</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{lead.categoria}</TableCell>
                      <TableCell className="text-foreground">{lead.bairro}</TableCell>
                      <TableCell>
                        {lead.profissional ? (
                          <Link href="/profiza/profissionais" className="text-foreground hover:text-primary hover:underline">{lead.profissional}</Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.feedbackStatus ? feedbackLabels[lead.feedbackStatus] : "Aguardando"}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[lead.status].className}`}>
                          {statusConfig[lead.status].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(lead.data)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                              <Eye className="mr-2 h-4 w-4" />Ver detalhes
                            </DropdownMenuItem>
                            {linkWhatsApp(lead.telefone) && (
                              <DropdownMenuItem onClick={() => window.open(linkWhatsApp(lead.telefone) ?? "", "_blank")}>
                                <ArrowUpRight className="mr-2 h-4 w-4" />WhatsApp cliente
                              </DropdownMenuItem>
                            )}
                            {lead.status === "sem_resposta" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleRerotear(lead)}>
                                  <RefreshCw className="mr-2 h-4 w-4" />Re-rotear
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredLeads.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredLeads.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
            <DialogDescription>Informações completas do roteamento</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Cliente</p><p className="font-medium">{selectedLead.cliente}</p></div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  {linkWhatsApp(selectedLead.telefone) ? (
                    <a href={linkWhatsApp(selectedLead.telefone) ?? undefined} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                      {selectedLead.telefone}
                    </a>
                  ) : <span className="font-medium">Contato protegido</span>}
                </div>
                <div><p className="text-sm text-muted-foreground">Categoria</p><p className="font-medium">{selectedLead.categoria}</p></div>
                <div><p className="text-sm text-muted-foreground">Bairro</p><p className="font-medium">{selectedLead.bairro}</p></div>
                <div><p className="text-sm text-muted-foreground">Profissional</p><p className="font-medium">{selectedLead.profissional || "Não atribuído"}</p></div>
                <div><p className="text-sm text-muted-foreground">Feedback</p><p className="font-medium">{selectedLead.feedbackStatus ? feedbackLabels[selectedLead.feedbackStatus] : "Aguardando resposta"}</p></div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[selectedLead.status].className}`}>
                    {statusConfig[selectedLead.status].label}
                  </span>
                </div>
              </div>
              {selectedLead.mensagem && (
                <div>
                  <p className="text-sm text-muted-foreground">Mensagem do cliente</p>
                  <p className="mt-1 rounded-lg bg-muted p-3 text-sm">{selectedLead.mensagem}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {linkWhatsApp(selectedLead.telefone) ? (
                  <Button className="flex-1" onClick={() => window.open(linkWhatsApp(selectedLead.telefone) ?? "", "_blank")}>
                    <ArrowUpRight className="h-4 w-4" />WhatsApp
                  </Button>
                ) : (
                  <Button className="flex-1" disabled>
                    <ArrowUpRight className="h-4 w-4" />Contato protegido
                  </Button>
                )}
                {selectedLead.status === "sem_resposta" && (
                  <Button variant="outline" onClick={() => { handleRerotear(selectedLead); setSelectedLead(null) }}>
                    <RefreshCw className="h-4 w-4" />Re-rotear
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
