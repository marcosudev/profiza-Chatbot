"use client"

import * as React from "react"
import { ArrowUpRight, Mail, MapPin, Pencil, Phone, X } from "lucide-react"

import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/registry/new-york-v4/ui/sheet"

import type { Professional, PaymentStatus } from "@/lib/profiza-data"

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

interface ProfessionalDrawerProps {
  professional: Professional | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
  leadsTotal?: number
}

export function ProfessionalDrawer({
  professional,
  open,
  onOpenChange,
  onEdit,
  leadsTotal,
}: ProfessionalDrawerProps) {
  if (!professional) return null

  const formatDate = (dateIso: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateIso))

  const diasRestantes = () => {
    if (professional.status !== "teste_gratis") return null
    const expires = new Date(professional.testeGratisExpiraEm)
    const now = new Date()
    return Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const dias = diasRestantes()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{professional.nome}</SheetTitle>
              <p className="text-sm text-muted-foreground">{professional.categoria}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[professional.status].className}`}>
              {statusConfig[professional.status].label}
            </span>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contato */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Contato</h3>
            <div className="space-y-2">
              <a
                href={`https://wa.me/${professional.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg bg-muted p-3 transition-colors hover:bg-muted/80"
              >
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{professional.whatsapp}</span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </a>
              {professional.email && (
                <a
                  href={`mailto:${professional.email}`}
                  className="flex items-center gap-3 rounded-lg bg-muted p-3 transition-colors hover:bg-muted/80"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{professional.email}</span>
                  <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </section>

          {/* Bairros */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Áreas de atuação</h3>
            <div className="flex flex-wrap gap-2">
              {professional.bairros.map((bairro) => (
                <span
                  key={bairro}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
                  style={{
                    backgroundColor: "var(--profiza-tag-bg)",
                    color: "var(--profiza-tag-fg)",
                  }}
                >
                  <MapPin className="h-3 w-3" />
                  {bairro}
                </span>
              ))}
            </div>
          </section>

          {/* Métricas */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Métricas</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-2xl font-bold text-foreground">
                  {leadsTotal ?? professional.leadsSemana}
                </p>
                <p className="text-xs text-muted-foreground">
                  {leadsTotal !== undefined ? "Total de leads" : "Leads esta semana"}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-2xl font-bold text-foreground">
                  {formatDate(professional.ultimaAtividade).split(" de ")[0]}
                </p>
                <p className="text-xs text-muted-foreground">Última atividade</p>
              </div>
            </div>
          </section>

          {/* Teste grátis info */}
          {professional.status === "teste_gratis" && dias !== null && (
            <section className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Período de teste</p>
                  <p className="text-sm text-muted-foreground">
                    Expira em {formatDate(professional.testeGratisExpiraEm)}
                  </p>
                </div>
                <span className={`text-2xl font-bold ${dias <= 3 ? "text-destructive" : "text-foreground"}`}>
                  {dias}d
                </span>
              </div>
            </section>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1"
              onClick={() => {
                window.open(`https://wa.me/${professional.whatsapp.replace(/\D/g, "")}`, "_blank")
              }}
            >
              <Phone className="h-4 w-4" />
              WhatsApp
            </Button>
            {onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
