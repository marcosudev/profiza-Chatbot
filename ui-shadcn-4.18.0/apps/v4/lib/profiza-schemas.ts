import { z } from "zod"

// Regex para telefone brasileiro
const phoneRegex = /^(\+55)?(\d{2})(\d{8,9})$/

// Normaliza para formato E.164
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length >= 12) {
    return `+${digits}`
  }
  if (digits.length >= 10) {
    return `+55${digits}`
  }
  return value
}

export const professionalSchema = z.object({
  nome: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(120, "Nome deve ter no máximo 120 caracteres"),
  whatsapp: z
    .string()
    .min(1, "WhatsApp é obrigatório")
    .transform(normalizePhone)
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "")
        return digits.length >= 12 && digits.length <= 13
      },
      { message: "WhatsApp inválido. Use formato: (14) 99999-9999" }
    ),
  email: z
    .string()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  categoria: z.string().min(1, "Selecione uma categoria"),
  bairros: z
    .array(z.string())
    .min(1, "Selecione pelo menos 1 bairro de atuação"),
  observacoes: z.string().optional(),
})

export type ProfessionalFormData = z.infer<typeof professionalSchema>

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
