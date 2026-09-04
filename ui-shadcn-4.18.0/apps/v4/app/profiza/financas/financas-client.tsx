"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownRight,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Send,
  TrendingUp,
  Trash2,
  Wallet,
  AlertCircle,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/new-york-v4/ui/tabs"

import { Header } from "@/components/profiza/header"
import { DespesaFormDialog } from "@/components/profiza/despesa-form-dialog"
import { ReciboDialog } from "@/components/profiza/recibo-dialog"
import {
  actionCreateDespesa,
  actionUpdateDespesa,
  actionUpdateDespesaStatus,
  actionDeleteDespesa,
  actionUpdateFaturaStatus,
} from "@/app/profiza/actions/profissionais"
import type { Despesa, Fatura } from "@/lib/supabase/queries"

interface FinancasSummary {
  mrrPrevisto: number
  receitaEfetiva: number
  despesasTotais: number
  lucroLiquido: number
  margemLucro: number
  ativosCount: number
  valorPlano: number
}

interface Props {
  summary: FinancasSummary
  despesas: Despesa[]
  faturas: Fatura[]
}

const CATEGORIA_LABELS: Record<string, string> = {
  infraestrutura_software: "Software & APIs",
  marketing_vendas: "Marketing & Tráfego",
  impostos_taxas: "Impostos & Taxas",
  operacional_pessoal: "Operacional / Pessoal",
  outros: "Outros Gastos",
}

export function FinancasClient({ summary, despesas, faturas }: Props) {
  const router = useRouter()
  const [despesaModalOpen, setDespesaModalOpen] = React.useState(false)
  const [editingDespesa, setEditingDespesa] = React.useState<Despesa | null>(null)
  const [reciboModalOpen, setReciboModalOpen] = React.useState(false)
  const [selectedFatura, setSelectedFatura] = React.useState<Fatura | null>(null)

  const handleOpenNewDespesa = () => {
    setEditingDespesa(null)
    setDespesaModalOpen(true)
  }

  const handleOpenEditDespesa = (despesa: Despesa) => {
    setEditingDespesa(despesa)
    setDespesaModalOpen(true)
  }

  const handleSaveDespesaSubmit = async (data: any) => {
    try {
      if (editingDespesa) {
        const res = await actionUpdateDespesa(editingDespesa.id, data)
        if (res && !res.success) {
          toast.error(`Erro ao atualizar despesa: ${res.error}`)
          return
        }
        toast.success("Despesa atualizada com sucesso!")
      } else {
        const res = await actionCreateDespesa(data)
        if (res && !res.success) {
          toast.error(`Erro ao lançar despesa: ${res.error}`)
          return
        }
        toast.success("Despesa lançada com sucesso!")
      }
      setEditingDespesa(null)
      router.refresh()
    } catch {
      toast.error("Erro ao salvar despesa.")
    }
  }

  const handleToggleDespesaStatus = async (id: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "pago" ? "pendente" : "pago"
      await actionUpdateDespesaStatus(id, nextStatus)
      toast.success(`Despesa marcada como ${nextStatus}`)
      router.refresh()
    } catch {
      toast.error("Erro ao atualizar despesa")
    }
  }

  const handleDeleteDespesaClick = async (id: string) => {
    if (confirm("Deseja realmente apagar esta despesa?")) {
      try {
        await actionDeleteDespesa(id)
        toast.success("Despesa excluída")
        router.refresh()
      } catch {
        toast.error("Erro ao excluir despesa")
      }
    }
  }

  const handleToggleFaturaStatus = async (id: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "pago" ? "pendente" : "pago"
      await actionUpdateFaturaStatus(id, nextStatus)
      toast.success(`Fatura marcada como ${nextStatus}`)
      router.refresh()
    } catch {
      toast.error("Erro ao atualizar fatura")
    }
  }

  const handleSendWhatsAppPix = (fatura: Fatura) => {
    const text = encodeURIComponent(
      `Olá, *${fatura.profissionalNome}*! 👋\n\nSua fatura de assinatura mensal do *Profiza* (mês ref: ${fatura.mesReferencia}) no valor de *R$ ${fatura.valorPlano.toFixed(2)}* já está disponível.\n\nQualquer dúvida estamos à disposição!`
    )
    window.open(`https://wa.me/${fatura.profissionalWhatsapp.replace(/\D/g, "")}?text=${text}`, "_blank")
  }

  const handleViewRecibo = (fatura: Fatura) => {
    setSelectedFatura(fatura)
    setReciboModalOpen(true)
  }

  return (
    <>
      <Header title="Finanças & Fluxo de Caixa" subtitle="Gestão de receitas de assinatura, despesas operacionais e DRE da empresa" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Barra de Ações do Topo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Painel Financeiro Profiza</h2>
            <p className="text-sm text-muted-foreground">Modelo de Negócio: Assinatura Mensal Fixa (R$ {summary.valorPlano.toFixed(2)}/prestador)</p>
          </div>
          <Button onClick={handleOpenNewDespesa}>
            <Plus className="mr-2 h-4 w-4" />
            Lançar despesa
          </Button>
        </div>

        {/* 4 Cards KPI */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR Previsto (Assinaturas)</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {summary.mrrPrevisto.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{summary.ativosCount} prestadores ativos em dia</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita em Caixa (Entradas)</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">R$ {summary.receitaEfetiva.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Faturas pagas no período</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Operacionais (Saídas)</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">R$ {summary.despesasTotais.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{despesas.length} custos cadastrados</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.lucroLiquido >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                R$ {summary.lucroLiquido.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Margem de Lucro: <span className="font-semibold text-foreground">{summary.margemLucro}%</span></p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Principais */}
        <Tabs defaultValue="dre" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dre">DRE & Destaques</TabsTrigger>
            <TabsTrigger value="faturas">Faturas dos Prestadores ({faturas.length})</TabsTrigger>
            <TabsTrigger value="despesas">Despesas Operacionais ({despesas.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: DRE & Visão Geral */}
          <TabsContent value="dre" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* DRE Simplificada */}
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Demonstrativo do Resultado (DRE)
                  </CardTitle>
                  <CardDescription>Resumo financeiro de entradas e saídas operacionais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm py-1 border-b border-border/50">
                    <span className="font-medium">(+) Receita Bruta de Assinaturas Mensais</span>
                    <span className="font-semibold text-emerald-500">R$ {summary.mrrPrevisto.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-border/50">
                    <span className="font-medium">(=) Receita Operacional Efetiva</span>
                    <span className="font-semibold text-emerald-500">R$ {summary.receitaEfetiva.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-border/50">
                    <span className="font-medium text-destructive">(-) Despesas com Infraestrutura & APIs</span>
                    <span className="font-semibold text-destructive">
                      - R$ {despesas.filter((d) => d.categoria === "infraestrutura_software").reduce((a, b) => a + b.valor, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-border/50">
                    <span className="font-medium text-destructive">(-) Despesas com Marketing & Aquisição</span>
                    <span className="font-semibold text-destructive">
                      - R$ {despesas.filter((d) => d.categoria === "marketing_vendas").reduce((a, b) => a + b.valor, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-border/50">
                    <span className="font-medium text-destructive">(-) Outros Gastos Operacionais</span>
                    <span className="font-semibold text-destructive">
                      - R$ {despesas.filter((d) => !["infraestrutura_software", "marketing_vendas"].includes(d.categoria)).reduce((a, b) => a + b.valor, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2">
                    <span>(=) LUCRO LÍQUIDO DO MÊS</span>
                    <span className={summary.lucroLiquido >= 0 ? "text-emerald-500" : "text-destructive"}>
                      R$ {summary.lucroLiquido.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Indicadores de SaaS */}
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Indicadores de Desempenho
                  </CardTitle>
                  <CardDescription>Métricas de eficiência da operação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">ARPU (Ticket Médio por Prestador)</p>
                      <p className="text-lg font-bold">R$ {summary.valorPlano.toFixed(2)}/mês</p>
                    </div>
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-full">Plano Fixo</span>
                  </div>

                  <div className="rounded-lg border border-border p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Base Ativa Contratante</p>
                      <p className="text-lg font-bold">{summary.ativosCount} profissionais</p>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full font-medium">Ativos</span>
                  </div>

                  <div className="rounded-lg border border-border p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Custo Fixo Mensal (Burn Rate)</p>
                      <p className="text-lg font-bold text-destructive">R$ {summary.despesasTotais.toFixed(2)}</p>
                    </div>
                    <span className="text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-full font-medium">Saídas</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: Faturas de Prestadores */}
          <TabsContent value="faturas">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Faturas Mensais de Prestadores</CardTitle>
                <CardDescription>Cobrança fixa mensal por plano de cada profissional cadastrado</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {faturas.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nenhuma fatura registrada no sistema ainda. As faturas são geradas para a base de profissionais ativos.
                  </div>
                ) : (
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50">
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Prestador</th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Mês Ref.</th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Valor Fixo</th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Vencimento</th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
                          <th className="h-10 px-4 text-right font-medium text-muted-foreground">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {faturas.map((fatura) => (
                          <tr key={fatura.id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 font-medium">
                              <div>{fatura.profissionalNome}</div>
                              <div className="text-xs text-muted-foreground">{fatura.profissionalWhatsapp}</div>
                            </td>
                            <td className="p-4 text-muted-foreground">{fatura.mesReferencia}</td>
                            <td className="p-4 font-bold text-foreground">R$ {fatura.valorPlano.toFixed(2)}</td>
                            <td className="p-4 text-muted-foreground">{fatura.vencimentoAt}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                fatura.status === "pago"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : fatura.status === "atrasado"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}>
                                {fatura.status === "pago" ? "Pago" : fatura.status === "atrasado" ? "Atrasado" : "Pendente"}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1">
                              <Button variant="outline" size="sm" onClick={() => handleToggleFaturaStatus(fatura.id, fatura.status)}>
                                {fatura.status === "pago" ? "Marcar Pendente" : "Dar Baixa"}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleSendWhatsAppPix(fatura)} title="Enviar Cobrança WhatsApp">
                                <Send className="h-4 w-4 text-emerald-500" />
                              </Button>
                              {fatura.status === "pago" && (
                                <Button variant="ghost" size="icon" onClick={() => handleViewRecibo(fatura)} title="Ver Recibo Digital">
                                  <Receipt className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Controle de Despesas */}
          <TabsContent value="despesas">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Despesas & Custos Operacionais</CardTitle>
                  <CardDescription>Gastos com ferramentas, infraestrutura, marketing e pessoal</CardDescription>
                </div>
                <Button size="sm" onClick={handleOpenNewDespesa}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Despesa
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {despesas.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nenhuma despesa lançada no sistema. Clique em "+ Nova Despesa" para cadastrar os gastos da empresa.
                  </div>
                ) : (
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50">
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Descrição</th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Categoria</th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Valor</th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Vencimento</th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
                          <th className="h-10 px-4 text-right font-medium text-muted-foreground">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {despesas.map((despesa) => (
                          <tr key={despesa.id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 font-medium">
                              <div>{despesa.descricao}</div>
                              {despesa.observacoes && <div className="text-xs text-muted-foreground">{despesa.observacoes}</div>}
                            </td>
                            <td className="p-4 text-xs font-medium text-muted-foreground">
                              {CATEGORIA_LABELS[despesa.categoria] ?? despesa.categoria}
                            </td>
                            <td className="p-4 font-bold text-destructive">R$ {despesa.valor.toFixed(2)}</td>
                            <td className="p-4 text-muted-foreground">{despesa.dataVencimento}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                despesa.status === "pago"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}>
                                {despesa.status === "pago" ? "Pago" : "Pendente"}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1">
                              <Button variant="outline" size="sm" onClick={() => handleToggleDespesaStatus(despesa.id, despesa.status)}>
                                {despesa.status === "pago" ? "Pendente" : "Marcar Pago"}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditDespesa(despesa)} title="Editar Despesa">
                                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteDespesaClick(despesa.id)} className="text-destructive hover:bg-destructive/10" title="Excluir Despesa">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DespesaFormDialog open={despesaModalOpen} onOpenChange={setDespesaModalOpen} initialData={editingDespesa} onSubmit={handleSaveDespesaSubmit} />
      <ReciboDialog open={reciboModalOpen} onOpenChange={setReciboModalOpen} fatura={selectedFatura} />
    </>
  )
}
