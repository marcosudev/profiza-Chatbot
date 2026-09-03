"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowUpRight,
  ArrowUpDown,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
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

import { Header } from "@/components/profiza/header"
import { Pagination } from "@/components/profiza/pagination"
import { ProfessionalForm } from "@/components/profiza/professional-form"
import { ProfessionalEditDialog } from "@/components/profiza/professional-edit-dialog"
import { ProfessionalDrawer } from "@/components/profiza/professional-drawer"
import { DeleteConfirmationDialog } from "@/components/profiza/delete-confirmation-dialog"
import { SwipeableCard } from "@/components/profiza/swipeable-card"
import { PullToRefresh } from "@/components/profiza/pull-to-refresh"
import { useDebounce } from "@/hooks/use-debounce"
import { useHighlight } from "@/hooks/use-highlight"
import { exportProfessionalsCSV } from "@/lib/profiza-export"
import {
  actionCreateProfissional,
  actionUpdateProfissional,
  actionUpdateStatus,
  actionDeleteProfissional,
} from "@/app/profiza/actions/profissionais"
import type { ProfessionalFormData } from "@/lib/profiza-schemas"
import type { PaymentStatus, Professional } from "@/lib/profiza-data"

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-[--profiza-badge-ativo-bg] text-[--profiza-badge-ativo-fg]" },
  teste_gratis: { label: "Teste grátis", className: "bg-[--profiza-badge-teste-bg] text-[--profiza-badge-teste-fg]" },
  inativo: { label: "Inativo", className: "bg-destructive text-destructive-foreground" },
}

type SortField = "nome" | "categoria" | "status" | "leadsSemana"
type SortOrder = "asc" | "desc"

interface Props {
  initialProfessionals: Professional[]
  metricasMap: Record<string, number>
}

export function ProfissionaisClient({ initialProfessionals, metricasMap }: Props) {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || "todos"

  const [rows, setRows] = React.useState(initialProfessionals)
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState(initialStatus)
  const [sortField, setSortField] = React.useState<SortField>("nome")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingProfessional, setEditingProfessional] = React.useState<Professional | null>(null)
  const [viewingProfessional, setViewingProfessional] = React.useState<Professional | null>(null)
  const [deletingProfessional, setDeletingProfessional] = React.useState<Professional | null>(null)
  const [bairroFilter, setBairroFilter] = React.useState<string | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  React.useEffect(() => {
    const status = searchParams.get("status")
    if (status) setStatusFilter(status)
  }, [searchParams])

  const highlightId = useHighlight()
  const debouncedQuery = useDebounce(query, 300)

  const filteredAndSortedRows = React.useMemo(() => {
    let result = rows.filter((row) => {
      const matchesQuery =
        !debouncedQuery ||
        `${row.nome} ${row.categoria} ${row.bairros.join(" ")} ${row.whatsapp}`
          .toLowerCase()
          .includes(debouncedQuery.toLowerCase())
      const matchesStatus = statusFilter === "todos" || row.status === statusFilter
      const matchesBairro = !bairroFilter || row.bairros.includes(bairroFilter)
      return matchesQuery && matchesStatus && matchesBairro
    })

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "nome": comparison = a.nome.localeCompare(b.nome); break
        case "categoria": comparison = a.categoria.localeCompare(b.categoria); break
        case "status": comparison = a.status.localeCompare(b.status); break
        case "leadsSemana": comparison = a.leadsSemana - b.leadsSemana; break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [rows, debouncedQuery, statusFilter, bairroFilter, sortField, sortOrder])

  const allBairros = React.useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.bairros.forEach((b) => set.add(b)))
    return Array.from(set).sort()
  }, [rows])

  React.useEffect(() => { setCurrentPage(1) }, [statusFilter, bairroFilter, debouncedQuery])

  const totalPages = Math.ceil(filteredAndSortedRows.length / pageSize)
  const paginatedRows = filteredAndSortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortOrder("asc") }
  }

  const handleStatusChange = async (id: string, nextStatus: PaymentStatus) => {
    setRows((current) =>
      current.map((row) => row.id === id ? { ...row, status: nextStatus } : row)
    )
    try {
      await actionUpdateStatus(id, nextStatus)
      toast.success("Status atualizado")
    } catch {
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
        testeGratisExpiraEm: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      setRows((current) => [novo, ...current])
      setCreateOpen(false)
      toast.success("Profissional cadastrado com sucesso")
    } catch {
      toast.error("Erro ao cadastrar profissional")
    }
  }

  const handleEdit = async (id: string, data: ProfessionalFormData) => {
    try {
      const updated = await actionUpdateProfissional(id, {
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email || undefined,
        categoria: data.categoria,
        bairros: data.bairros,
      })
      setRows((current) => current.map((row) => row.id === id ? updated : row))
      toast.success("Profissional atualizado com sucesso")
    } catch {
      toast.error("Erro ao atualizar profissional")
    }
  }

  const handleDelete = async () => {
    if (!deletingProfessional) return
    const id = deletingProfessional.id
    setRows((current) =>
      current.map((row) => row.id === id ? { ...row, status: "inativo" as PaymentStatus } : row)
    )
    setDeletingProfessional(null)
    try {
      await actionUpdateStatus(id, "inativo")
      toast.success("Profissional desativado com sucesso")
    } catch {
      setRows(initialProfessionals)
      toast.error("Erro ao desativar profissional")
    }
  }

  const formatDate = (dateIso: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateIso))

  return (
    <>
      <Header
        title="Profissionais"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por nome, categoria, bairro..."
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
                <DialogDescription>Cadastre um prestador e deixe o lead rotear em minutos.</DialogDescription>
              </DialogHeader>
              <ProfessionalForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-4 lg:p-8">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <CardTitle className="text-base md:text-lg">Base de profissionais</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {filteredAndSortedRows.length} profissionais encontrados
                {bairroFilter && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Bairro: {bairroFilter}
                    <button onClick={() => setBairroFilter(null)} className="ml-1 rounded-full p-0.5 hover:bg-primary/20">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32 text-xs md:h-9 md:w-40 md:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="teste_gratis">Teste grátis</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs md:h-9 md:text-sm"
                onClick={() => {
                  exportProfessionalsCSV(filteredAndSortedRows)
                  toast.success(`${filteredAndSortedRows.length} profissionais exportados`)
                }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9 md:text-sm"
                onClick={async () => {
                  if (confirm("ATENÇÃO: Deseja apagar TODOS os profissionais e dados de teste do banco para colocar a base em produção?")) {
                    try {
                      const { actionClearAllData } = await import("@/app/profiza/actions/profissionais")
                      await actionClearAllData()
                      setRows([])
                      toast.success("Banco de dados zerado com sucesso!")
                    } catch {
                      toast.error("Erro ao zerar dados.")
                    }
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Zerar dados</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile */}
            <div className="md:hidden">
              <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); toast.success("Lista atualizada") }}>
                <div className="space-y-2 px-4 pb-4">
                  {paginatedRows.map((row) => (
                    <SwipeableCard
                      key={row.id}
                      onSwipeLeft={row.status !== "inativo" ? () => setDeletingProfessional(row) : undefined}
                      onSwipeRight={() => setEditingProfessional(row)}
                      leftAction={row.status !== "inativo" ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                          <Trash2 className="h-4 w-4" /> Desativar
                        </span>
                      ) : undefined}
                      rightAction={
                        <span className="flex items-center gap-1 text-xs font-medium text-primary">
                          <Pencil className="h-4 w-4" /> Editar
                        </span>
                      }
                    >
                      <div
                        data-highlight-id={row.id}
                        className={`flex w-full items-start justify-between gap-3 rounded-xl p-3 text-left transition-all ${
                          highlightId === row.id
                            ? "bg-primary/10 ring-2 ring-primary ring-offset-1"
                            : "bg-muted/50 active:bg-muted"
                        }`}
                      >
                        <button
                          onClick={() => setViewingProfessional(row)}
                          className="min-w-0 flex-1 text-left"
                          aria-label={`Ver detalhes de ${row.nome}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">{row.nome}</span>
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusConfig[row.status].className}`}>
                              {statusConfig[row.status].label}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {row.categoria} • {row.bairros.slice(0, 2).join(", ")}
                          </p>
                          <a
                            href={`https://wa.me/${row.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 block text-[11px] text-muted-foreground hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.whatsapp}
                          </a>
                        </button>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-foreground">{metricasMap[row.id] ?? 0}</p>
                          <p className="text-[10px] text-muted-foreground">leads</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="mt-1 h-7 w-7 p-0" onClick={(e) => e.stopPropagation()} aria-label="Mais ações">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingProfessional(row)}>
                                <Pencil className="mr-2 h-4 w-4" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {row.status === "inativo" ? (
                                <DropdownMenuItem onClick={() => handleStatusChange(row.id, "ativo")} className="text-primary focus:text-primary">
                                  <RotateCcw className="mr-2 h-4 w-4" />Reativar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setDeletingProfessional(row)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />Desativar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </SwipeableCard>
                  ))}
                </div>
              </PullToRefresh>
            </div>

            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><button onClick={() => handleSort("nome")} className="flex items-center gap-1 hover:text-foreground">Nome <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                    <TableHead><button onClick={() => handleSort("categoria")} className="flex items-center gap-1 hover:text-foreground">Categoria <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                    <TableHead>Bairros</TableHead>
                    <TableHead><button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-foreground">Status <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                    <TableHead><button onClick={() => handleSort("leadsSemana")} className="flex items-center gap-1 hover:text-foreground">Leads <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                    <TableHead>Última atividade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-highlight-id={row.id}
                      className={`transition-all ${highlightId === row.id ? "bg-primary/10 ring-2 ring-inset ring-primary" : "border-border/40"}`}
                    >
                      <TableCell>
                        <div>
                          <button onClick={() => setViewingProfessional(row)} className="font-medium text-foreground hover:text-primary hover:underline">
                            {row.nome}
                          </button>
                          <a href={`https://wa.me/${row.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {row.whatsapp}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{row.categoria}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.bairros.slice(0, 2).map((bairro) => (
                            <button
                              key={`${row.id}-${bairro}`}
                              onClick={() => setBairroFilter(bairroFilter === bairro ? null : bairro)}
                              className={`rounded-full px-2 py-0.5 text-[11px] transition-colors hover:opacity-80 ${bairroFilter === bairro ? "ring-2 ring-primary ring-offset-1" : ""}`}
                              style={{ backgroundColor: "var(--profiza-tag-bg)", color: "var(--profiza-tag-fg)" }}
                            >
                              {bairro}
                            </button>
                          ))}
                          {row.bairros.length > 2 && <span className="text-xs text-muted-foreground">+{row.bairros.length - 2}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={row.status} onValueChange={(value) => handleStatusChange(row.id, value as PaymentStatus)}>
                          <SelectTrigger className="w-[130px] border-0 bg-transparent p-0 shadow-none">
                            <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[row.status].className}`}>
                              {statusConfig[row.status].label}
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="teste_gratis">Teste grátis</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{metricasMap[row.id] ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(row.ultimaAtividade)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingProfessional(row)}>
                              <Pencil className="mr-2 h-4 w-4" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/profiza/profissionais/${row.id}`}>
                                <ArrowUpRight className="mr-2 h-4 w-4" />Ver perfil
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`https://wa.me/${row.whatsapp.replace(/\D/g, "")}`, "_blank")}>
                              <ArrowUpRight className="mr-2 h-4 w-4" />Abrir WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {row.status === "inativo" ? (
                              <DropdownMenuItem onClick={() => handleStatusChange(row.id, "ativo")} className="text-primary focus:text-primary">
                                <RotateCcw className="mr-2 h-4 w-4" />Reativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setDeletingProfessional(row)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />Desativar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredAndSortedRows.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredAndSortedRows.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </CardContent>
        </Card>
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
        leadsTotal={viewingProfessional ? (metricasMap[viewingProfessional.id] ?? 0) : undefined}
        onEdit={() => {
          if (viewingProfessional) {
            setEditingProfessional(viewingProfessional)
            setViewingProfessional(null)
          }
        }}
      />

      <DeleteConfirmationDialog
        open={!!deletingProfessional}
        onOpenChange={(open) => !open && setDeletingProfessional(null)}
        onConfirm={handleDelete}
        itemName={deletingProfessional?.nome}
      />
    </>
  )
}
