"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Input } from "@/registry/new-york-v4/ui/input"
import { Label } from "@/registry/new-york-v4/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Email ou senha incorretos. Tente novamente.")
      setLoading(false)
      return
    }

    router.push("/profiza")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Painel esquerdo — branding */}
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{ backgroundColor: "var(--profiza-sidebar-bg, #0f1a0f)" }}
      >
        {/* Gradiente decorativo */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 110%, color-mix(in srgb, var(--primary) 18%, transparent), transparent)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            P
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Profiza</span>
        </div>

        {/* Citação central */}
        <div className="relative z-10 space-y-6">
          <blockquote className="space-y-3">
            <p className="text-2xl font-medium leading-relaxed text-white/90">
              "Conectamos quem precisa de um serviço com quem faz o melhor trabalho."
            </p>
            <footer className="text-sm text-white/50">Painel administrativo · Bauru, SP</footer>
          </blockquote>

          {/* Stats decorativos */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: "Profissionais", value: "12+" },
              { label: "Leads/semana", value: "133" },
              { label: "Taxa de match", value: "75%" },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>
                  {value}
                </p>
                <p className="text-xs text-white/40">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} Profiza · Todos os direitos reservados
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Logo mobile */}
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            P
          </div>
          <span className="text-base font-semibold">Profiza</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Cabeçalho */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais para acessar o painel
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@profiza.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <Link
                  href="/recuperar-senha"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full text-sm font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no painel"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Acesso restrito a administradores autorizados
          </p>
        </div>
      </div>
    </div>
  )
}
