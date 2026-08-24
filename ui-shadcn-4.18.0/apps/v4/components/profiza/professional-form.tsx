"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/registry/new-york-v4/ui/button"
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

import {
  professionalSchema,
  type ProfessionalFormData,
} from "@/lib/profiza-schemas"
import {
  bairrosDisponiveis,
  categoriasDisponiveis,
  type Professional,
} from "@/lib/profiza-data"

interface ProfessionalFormProps {
  professional?: Professional
  onSubmit: (data: ProfessionalFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function ProfessionalForm({
  professional,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProfessionalFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      nome: professional?.nome ?? "",
      whatsapp: professional?.whatsapp ?? "",
      email: professional?.email ?? "",
      categoria: professional?.categoria ?? "",
      bairros: professional?.bairros ?? [],
      observacoes: "",
    },
  })

  const selectedBairros = watch("bairros")
  const selectedCategoria = watch("categoria")

  const toggleBairro = (bairro: string) => {
    const current = selectedBairros || []
    const updated = current.includes(bairro)
      ? current.filter((b) => b !== bairro)
      : [...current, bairro]
    setValue("bairros", updated, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="nome">
          Nome <span className="text-destructive">*</span>
        </Label>
        <Input
          id="nome"
          placeholder="Ex.: João Pereira"
          {...register("nome")}
          className={errors.nome ? "border-destructive" : ""}
        />
        {errors.nome && (
          <p className="text-sm text-destructive">{errors.nome.message}</p>
        )}
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label htmlFor="whatsapp">
          WhatsApp <span className="text-destructive">*</span>
        </Label>
        <Input
          id="whatsapp"
          placeholder="(14) 99999-9999"
          {...register("whatsapp")}
          className={errors.whatsapp ? "border-destructive" : ""}
        />
        {errors.whatsapp && (
          <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@exemplo.com"
          {...register("email")}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Categoria + Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Categoria <span className="text-destructive">*</span>
          </Label>
          <Select
            value={selectedCategoria}
            onValueChange={(value) =>
              setValue("categoria", value, { shouldValidate: true })
            }
          >
            <SelectTrigger
              className={errors.categoria ? "border-destructive" : ""}
            >
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categoriasDisponiveis.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoria && (
            <p className="text-sm text-destructive">
              {errors.categoria.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
            {professional ? (
              professional.status === "ativo"
                ? "Ativo"
                : professional.status === "teste_gratis"
                  ? "Teste grátis"
                  : "Inativo"
            ) : (
              "Teste grátis"
            )}
          </div>
        </div>
      </div>

      {/* Bairros */}
      <div className="space-y-2">
        <Label>
          Bairros de atuação <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {bairrosDisponiveis.map((bairro) => {
            const active = selectedBairros?.includes(bairro)
            return (
              <button
                key={bairro}
                type="button"
                onClick={() => toggleBairro(bairro)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-ring bg-secondary text-secondary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {bairro}
              </button>
            )
          })}
        </div>
        {errors.bairros && (
          <p className="text-sm text-destructive">{errors.bairros.message}</p>
        )}
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações internas</Label>
        <Textarea
          id="observacoes"
          placeholder="Notas sobre o profissional..."
          rows={3}
          {...register("observacoes")}
        />
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Salvando..."
            : professional
              ? "Salvar alterações"
              : "Cadastrar profissional"}
        </Button>
      </div>
    </form>
  )
}
