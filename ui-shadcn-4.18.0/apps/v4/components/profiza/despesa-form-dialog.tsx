"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"
import { Input } from "@/registry/new-york-v4/ui/input"
import { Label } from "@/registry/new-york-v4/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/new-york-v4/ui/select"
import { Textarea } from "@/registry/new-york-v4/ui/textarea"
import type { CategoriaDespesa, Despesa } from "@/lib/supabase/queries"

const despesaSchema = z.object({
  descricao: z.string().min(2, "Descrição é obrigatória"),
  categoria: z.enum([
    "infraestrutura_software",
    "marketing_vendas",
    "impostos_taxas",
    "operacional_pessoal",
    "outros",
  ]),
  valor: z.coerce.number().positive("Valor deve ser maior que zero"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  recorrente: z.enum(["unica", "mensal", "anual"]),
  status: z.enum(["pendente", "pago"]),
  observacoes: z.string().optional(),
})

type DespesaFormData = z.infer<typeof despesaSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Despesa | null
  onSubmit: (data: DespesaFormData) => Promise<void>
}

export function DespesaFormDialog({ open, onOpenChange, initialData, onSubmit }: Props) {
  const [loading, setLoading] = React.useState(false)
  const isEditing = !!initialData

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DespesaFormData>({
    resolver: zodResolver(despesaSchema),
    defaultValues: {
      descricao: "",
      categoria: "infraestrutura_software",
      valor: 0,
      dataVencimento: new Date().toISOString().split("T")[0],
      recorrente: "mensal",
      status: "pago",
      observacoes: "",
    },
  })

  React.useEffect(() => {
    if (initialData) {
      reset({
        descricao: initialData.descricao,
        categoria: initialData.categoria,
        valor: initialData.valor,
        dataVencimento: initialData.dataVencimento,
        recorrente: initialData.recorrente,
        status: initialData.status === "cancelado" ? "pendente" : initialData.status,
        observacoes: initialData.observacoes || "",
      })
    } else {
      reset({
        descricao: "",
        categoria: "infraestrutura_software",
        valor: 0,
        dataVencimento: new Date().toISOString().split("T")[0],
        recorrente: "mensal",
        status: "pago",
        observacoes: "",
      })
    }
  }, [initialData, reset, open])

  const selectedCategoria = watch("categoria")
  const selectedRecorrente = watch("recorrente")
  const selectedStatus = watch("status")

  const handleFormSubmit = async (data: DespesaFormData) => {
    setLoading(true)
    try {
      await onSubmit(data)
      reset()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Despesa" : "Lançar Nova Despesa"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Altere os dados, valor ou vencimento do gasto cadastrado."
              : "Registre custos operacionais, ferramentas, infraestrutura ou marketing da empresa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição da Despesa *</Label>
            <Input
              id="descricao"
              placeholder="Ex.: Assinatura Z-API, OpenAI API, Hospedagem Railway"
              {...register("descricao")}
              className={errors.descricao ? "border-destructive" : ""}
            />
            {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={selectedCategoria} onValueChange={(val) => setValue("categoria", val as CategoriaDespesa)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="infraestrutura_software">Software & APIs</SelectItem>
                  <SelectItem value="marketing_vendas">Marketing & Tráfego</SelectItem>
                  <SelectItem value="impostos_taxas">Impostos & Taxas</SelectItem>
                  <SelectItem value="operacional_pessoal">Operacional / Pessoal</SelectItem>
                  <SelectItem value="outros">Outros Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("valor")}
                className={errors.valor ? "border-destructive" : ""}
              />
              {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dataVencimento">Vencimento *</Label>
              <Input id="dataVencimento" type="date" {...register("dataVencimento")} />
            </div>

            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select value={selectedRecorrente} onValueChange={(val) => setValue("recorrente", val as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(val) => setValue("status", val as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea id="observacoes" rows={2} placeholder="Notas adicionais sobre o pagamento..." {...register("observacoes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : isEditing ? (
                "Salvar Alterações"
              ) : (
                "Cadastrar Despesa"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
