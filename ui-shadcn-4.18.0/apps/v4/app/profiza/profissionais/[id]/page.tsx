import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Tag,
} from "lucide-react"
import { getProfissional, getLeadsByProfissional, getMetricasProfissional } from "@/lib/supabase/queries"
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
import type { PaymentStatus } from "@/lib/profiza-data"

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-[--profiza-badge-ativo-bg] text-[--profiza-badge-ativo-fg]" },
  teste_gratis: { label: "Teste grátis", className: "bg-[--profiza-badge-teste-bg] text-[--profiza-badge-teste-fg]" },
  inativo: { label: "Inativo", className: "bg-destructive text-destructive-foreground" },
}

const leadStatusConfig = {
  novo: { label: "Novo", className: "bg-[--profiza-badge-teste-bg] text-[--profiza-badge-teste-fg]" },
  enviado: { label: "Enviado", className: "bg-[--profiza-badge-ativo-bg] text-[--profiza-badge-ativo-fg]" },
  sem_resposta: { label: "Sem resposta", className: "bg-destructive text-destructive-foreground" },
  convertido: { label: "Convertido", className: "bg-ring/20 text-ring" },
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export default async function ProfissionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [profissional, leads, metricas] = await Promise.all([
    getProfissional(id),
    getLeadsByProfissional(id),
    getMetricasProfissional(id),
  ])

  if (!profissional) notFound()

  const diasParaVencer = profissional.status === "teste_gratis"
    ? Math.ceil(
        (new Date(profissional.testeGratisExpiraEm).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="space-y-6 p-4 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 px-2">
          <Link href="/profiza/profissionais">
            <ArrowLeft className="h-4 w-4" />
            Profissionais
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">{profissional.nome}</span>
      </div>

      {/* Header do perfil */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold"
            style={{ backgroundColor: "var(--profiza-icon-bg)", color: "var(--profiza-icon-fg)" }}
          >
            {profissional.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-foreground">
                {profissional.nome}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[profissional.status].className}`}>
                {statusConfig[profissional.status].label}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {profissional.categoria} · Cadastrado em {formatDate(profissional.ultimaAtividade)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://wa.me/${profissional.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowUpRight className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/profiza/profissionais?highlight=${profissional.id}`}>
              Editar cadastro
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Coluna esquerda — dados do profissional */}
        <div className="space-y-4">
          {/* Informações de contato */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-border/50 px-5 py-3">
              <CardTitle className="text-sm font-semibold">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <a
                    href={`https://wa.me/${profissional.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {profissional.whatsapp}
                  </a>
                </div>
              </div>

              {profissional.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${profissional.email}`}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {profissional.email}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="text-sm font-medium text-foreground">{profissional.categoria}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Bairros de atuação</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {profissional.bairros.map((b) => (
                      <span
                        key={b}
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{ backgroundColor: "var(--profiza-tag-bg)", color: "var(--profiza-tag-fg)" }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {profissional.status === "teste_gratis" && diasParaVencer !== null && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teste grátis expira em</p>
                    <p className={`text-sm font-medium ${diasParaVencer <= 3 ? "text-destructive" : "text-foreground"}`}>
                      {diasParaVencer > 0
                        ? `${diasParaVencer} dia${diasParaVencer !== 1 ? "s" : ""}`
                        : "Expirado"}
                      {" "}· {formatDate(profissional.testeGratisExpiraEm)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* KPIs */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-border/50 px-5 py-3">
              <CardTitle className="text-sm font-semibold">Métricas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 p-5">
              <div>
                <p className="text-xs text-muted-foreground">Total de leads</p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
                  {metricas.leadsEnviados}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">No histórico</p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
                  {leads.length}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Último lead recebido</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {metricas.dataUltimoLead ? formatDate(metricas.dataUltimoLead) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita — histórico de leads */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b border-border/50 px-5 py-3">
            <CardTitle className="text-sm font-semibold">Histórico de leads</CardTitle>
            <CardDescription className="text-xs">
              {leads.length === 0
                ? "Nenhum lead registrado ainda"
                : `${leads.length} lead${leads.length !== 1 ? "s" : ""} recebido${leads.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "var(--profiza-icon-bg)" }}
                >
                  <MessageSquareText className="h-6 w-6" style={{ color: "var(--profiza-icon-fg)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nenhum lead ainda</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Os leads roteados para este profissional aparecerão aqui
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2 p-4 md:hidden">
                  {leads.map((lead) => (
                    <div key={lead.id} className="rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{lead.cliente}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${leadStatusConfig[lead.status]?.className ?? ""}`}>
                          {leadStatusConfig[lead.status]?.label ?? lead.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {lead.categoria} · {lead.bairro}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(lead.data)}</p>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Bairro</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id} className="border-border/40">
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-foreground">{lead.cliente}</p>
                              <a
                                href={`https://wa.me/${lead.telefone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary"
                              >
                                {lead.telefone}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground">{lead.categoria}</TableCell>
                          <TableCell className="text-sm text-foreground">{lead.bairro}</TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${leadStatusConfig[lead.status]?.className ?? ""}`}>
                              {leadStatusConfig[lead.status]?.label ?? lead.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(lead.data)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
