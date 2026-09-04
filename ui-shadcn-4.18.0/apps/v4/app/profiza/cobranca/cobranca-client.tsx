"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react"

import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/new-york-v4/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/new-york-v4/ui/table"

import { Header } from "@/components/profiza/header"
import { ProfessionalDrawer } from "@/components/profiza/professional-drawer"
import { actionUpdateStatus } from "@/app/profiza/actions/profissionais"
import type { Professional, PaymentStatus } from "@/lib/profiza-data"
import { toast } from "sonner"

interface Props {
  initialProfessionals: Professional[]
  metricasMap: Record<string, number>
  subscriptionPrice: number
}

export function CobrancaClient({ initialProfessionals, metricasMap, subscriptionPrice }: Props) {
  const [professionals, setProfessionals] = React.useState(initialProfessionals)
  const [viewingProfessional, setViewingProfessional] = React.useState<Professional | null>(null)
  const urgentRef = React.useRef<HTMLDivElement>(null)

  const testeGratis = professionals.filter((p) => p.status === "teste_gratis")
  const ativos = professionals.filter((p) => p.status === "ativo")
  const inativos = professionals.filter((p) => p.status === "inativo")

  const vencendoEmBreve = testeGratis.filter((p) => {
    const expires = new Date(p.testeGratisExpiraEm)
    const now = new Date()
    const limit = new Date(now)
    limit.setDate(limit.getDate() + 7)
    return expires >= now && expires <= limit
  })

  const conversao = ativos.length + testeGratis.length > 0
    ? Math.round((ativos.length / (ativos.length + testeGratis.length)) * 100)
    : 0

  const formatDate = (dateIso: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateIso))

  const diasRestantes = (dateIso: string) =>
    Math.ceil((new Date(dateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const handleConverter = async (id: string) => {
    setProfessionals((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: "ativo" as PaymentStatus } : p)
    )
    try {
      await actionUpdateStatus(id, "ativo")
      toast.success("Profissional convertido para ativo!")
    } catch {
      setProfessionals(initialProfessionals)
      toast.error("Erro ao converter status")
    }
  }

  return (
    <>
      <Header title="Cobrança" subtitle="Gestão de assinaturas" />

      <div className="space-y-4 p-4 md:space-y-6 lg:p-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <Link href="/profiza/profissionais?status=ativo">
            <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
                <CardDescription className="text-[11px] md:text-sm">Receita mensal</CardDescription>
                <CircleDollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <p className="font-display text-lg font-bold text-foreground md:text-3xl">
                  R$ {(ativos.length * subscriptionPrice).toFixed(2).replace(".", ",")}
                </p>
                <p className="flex items-center gap-1 text-xs text-primary md:text-sm">
                  <TrendingUp className="h-3 w-3" />{ativos.length} ativos
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profiza/profissionais?status=teste_gratis">
            <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
                <CardDescription className="text-[11px] md:text-sm">Teste grátis</CardDescription>
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <p className="font-display text-2xl font-bold text-foreground md:text-3xl">{testeGratis.length}</p>
                <p className="text-xs text-muted-foreground md:text-sm">
                  R$ {(testeGratis.length * subscriptionPrice).toFixed(2).replace(".", ",")} potencial
                </p>
              </CardContent>
            </Card>
          </Link>

          <button onClick={() => urgentRef.current?.scrollIntoView({ behavior: "smooth" })} className="text-left">
            <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
                <CardDescription className="text-[11px] md:text-sm">Vencendo 7d</CardDescription>
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <p className="font-display text-2xl font-bold text-destructive md:text-3xl">{vencendoEmBreve.length}</p>
                <p className="text-xs text-destructive md:text-sm">Urgente</p>
              </CardContent>
            </Card>
          </button>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 md:p-6 md:pb-2">
              <CardDescription className="text-[11px] md:text-sm">Conversão</CardDescription>
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="font-display text-2xl font-bold text-foreground md:text-3xl">{conversao}%</p>
              <p className="text-xs text-muted-foreground md:text-sm">Meta: 30%</p>
            </CardContent>
          </Card>
        </div>

        {/* Testes vencendo em breve */}
        <Card ref={urgentRef} className="scroll-mt-4 border-none shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <CardTitle className="text-base md:text-lg">Testes vencendo em breve</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Profissionais para contatar e converter
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {vencendoEmBreve.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="mb-2 h-10 w-10 text-ring" />
                <p className="text-sm text-muted-foreground">Nenhum teste vencendo nos próximos 7 dias</p>
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2 px-4 md:hidden">
                  {vencendoEmBreve.map((p) => {
                    const dias = diasRestantes(p.testeGratisExpiraEm)
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                        <div className="min-w-0">
                          <button onClick={() => setViewingProfessional(p)} className="truncate text-sm font-medium text-foreground hover:text-primary">
                            {p.nome}
                          </button>
                          <p className="text-[11px] text-muted-foreground">{p.categoria} · {metricasMap[p.id] ?? 0} leads</p>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-2">
                          <span className={`text-sm font-bold ${dias <= 3 ? "text-destructive" : "text-foreground"}`}>
                            {dias}d
                          </span>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                            onClick={() => window.open(`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`, "_blank")}>
                            Contatar
                          </Button>
                          <Button size="sm" className="h-7 px-2 text-xs"
                            onClick={() => handleConverter(p.id)}>
                            Converter
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Leads recebidos</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Dias restantes</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vencendoEmBreve.map((p) => {
                        const dias = diasRestantes(p.testeGratisExpiraEm)
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div>
                                <button onClick={() => setViewingProfessional(p)} className="font-medium text-foreground hover:text-primary hover:underline">
                                  {p.nome}
                                </button>
                                <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-primary hover:underline">
                                  {p.whatsapp}
                                </a>
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground">{p.categoria}</TableCell>
                            <TableCell className="font-medium text-foreground">{metricasMap[p.id] ?? 0}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(p.testeGratisExpiraEm)}</TableCell>
                            <TableCell>
                              <span className={`font-medium ${dias <= 3 ? "text-destructive" : "text-foreground"}`}>
                                {dias} {dias === 1 ? "dia" : "dias"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline"
                                  onClick={() => window.open(`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`, "_blank")}>
                                  <Calendar className="h-3.5 w-3.5" />
                                  Contatar
                                </Button>
                                <Button size="sm" onClick={() => handleConverter(p.id)}>
                                  Converter
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Resumo por status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/profiza/profissionais?status=ativo">
            <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-2 w-2 rounded-full bg-[--profiza-badge-ativo-bg]" />
                  Ativos ({ativos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ativos.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted p-2">
                    <span className="text-sm text-foreground">{p.nome}</span>
                    <span className="text-xs text-muted-foreground">{p.leadsSemana} leads</span>
                  </div>
                ))}
                {ativos.length > 3 && <p className="text-center text-xs text-muted-foreground">+{ativos.length - 3} mais</p>}
              </CardContent>
            </Card>
          </Link>

          <Link href="/profiza/profissionais?status=teste_gratis">
            <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-2 w-2 rounded-full bg-[--profiza-badge-teste-bg]" />
                  Teste grátis ({testeGratis.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {testeGratis.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted p-2">
                    <span className="text-sm text-foreground">{p.nome}</span>
                    <span className="text-xs text-muted-foreground">{diasRestantes(p.testeGratisExpiraEm)}d restantes</span>
                  </div>
                ))}
                {testeGratis.length > 3 && <p className="text-center text-xs text-muted-foreground">+{testeGratis.length - 3} mais</p>}
              </CardContent>
            </Card>
          </Link>

          <Link href="/profiza/profissionais?status=inativo">
            <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  Inativos ({inativos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inativos.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted p-2">
                    <span className="text-sm text-foreground">{p.nome}</span>
                    <span className="text-xs text-muted-foreground">{p.categoria}</span>
                  </div>
                ))}
                {inativos.length > 3 && <p className="text-center text-xs text-muted-foreground">+{inativos.length - 3} mais</p>}
                {inativos.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhum inativo</p>}
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <ProfessionalDrawer
        professional={viewingProfessional}
        open={!!viewingProfessional}
        onOpenChange={(open) => !open && setViewingProfessional(null)}
      />
    </>
  )
}
