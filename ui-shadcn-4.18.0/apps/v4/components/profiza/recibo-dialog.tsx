"use client"

import * as React from "react"
import { Printer, CheckCircle } from "lucide-react"

import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"
import type { Fatura } from "@/lib/supabase/queries"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  fatura: Fatura | null
  cidade?: string
}

export function ReciboDialog({ open, onOpenChange, fatura, cidade = "Bauru - SP" }: Props) {
  if (!fatura) return null

  const handlePrint = () => {
    window.print()
  }

  const dataEmissao = fatura.pagoEm
    ? new Date(fatura.pagoEm).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Comprovante de Recibo</span>
            <span className="text-xs font-normal text-muted-foreground">Fatura #{fatura.id.slice(0, 8)}</span>
          </DialogTitle>
          <DialogDescription>
            Recibo de pagamento referente à assinatura mensal do Profiza.
          </DialogDescription>
        </DialogHeader>

        <div id="printable-recibo" className="space-y-6 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          {/* Header do Recibo */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-primary">PROFIZA</h3>
              <p className="text-xs text-muted-foreground">Plataforma de Indicação de Serviços • {cidade}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
              <CheckCircle className="h-3.5 w-3.5" />
              PAGO
            </div>
          </div>

          {/* Dados do Prestador */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">RECEBIDO DE:</p>
              <p className="font-semibold">{fatura.profissionalNome}</p>
              <p className="text-xs text-muted-foreground">{fatura.profissionalWhatsapp}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">DATA DO PAGAMENTO:</p>
              <p className="font-semibold">{dataEmissao}</p>
              <p className="text-xs text-muted-foreground">Mês Ref: {fatura.mesReferencia}</p>
            </div>
          </div>

          {/* Discriminação do Serviço */}
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>DESCRIÇÃO DO SERVIÇO</span>
              <span>VALOR</span>
            </div>
            <div className="my-2 border-t border-border/40" />
            <div className="flex justify-between text-sm">
              <span>Assinatura Mensal Fixo Prestador</span>
              <span className="font-semibold">R$ {fatura.valorPlano.toFixed(2)}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-base font-bold">TOTAL PAGO:</span>
            <span className="text-xl font-extrabold text-primary">R$ {fatura.valorPlano.toFixed(2)}</span>
          </div>

          {/* Autenticação */}
          <div className="pt-2 text-center text-[10px] text-muted-foreground">
            Comprovante gerado eletronicamente pelo Sistema Admin Profiza • {dataEmissao}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

