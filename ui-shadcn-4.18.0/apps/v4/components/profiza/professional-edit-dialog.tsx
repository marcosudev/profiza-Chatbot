"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"

import { ProfessionalForm } from "@/components/profiza/professional-form"
import type { ProfessionalFormData } from "@/lib/profiza-schemas"
import type { Professional } from "@/lib/profiza-data"

interface ProfessionalEditDialogProps {
  professional: Professional | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, data: ProfessionalFormData) => void
}

export function ProfessionalEditDialog({
  professional,
  open,
  onOpenChange,
  onSave,
}: ProfessionalEditDialogProps) {
  if (!professional) return null

  const handleSubmit = (data: ProfessionalFormData) => {
    onSave(professional.id, data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar profissional</DialogTitle>
          <DialogDescription>
            Atualize os dados de {professional.nome}
          </DialogDescription>
        </DialogHeader>
        <ProfessionalForm
          professional={professional}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
