import { createHmac } from "node:crypto"
import { config } from "./config"

const segredoHash = process.env.CONTACT_HASH_SECRET ?? config.webhookSecret

export function hashContato(telefone: string): string {
  const numero = telefone.replace(/\D/g, "")
  return createHmac("sha256", segredoHash).update(numero).digest("hex")
}

export function hashContatoLegado(telefone: string): string {
  return Buffer.from(telefone).toString("base64")
}

export function solicitouExclusaoDados(texto: string): boolean {
  const normalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  if (/\bnao\s+(?:quero\s+)?(?:apagar|apague|excluir|exclua)\s+meus dados\b/i.test(normalizado)) return false
  return /\b(?:apagar|apague|excluir|exclua)\s+meus dados\b/i.test(normalizado)
}