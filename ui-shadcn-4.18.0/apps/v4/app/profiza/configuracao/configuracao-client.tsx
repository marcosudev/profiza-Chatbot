"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Building2,
  Globe,
  Key,
  Loader2,
  Lock,
  Palette,
  Save,
  Trash2,
  User,
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
import { Input } from "@/registry/new-york-v4/ui/input"
import { Label } from "@/registry/new-york-v4/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/new-york-v4/ui/select"
import { Switch } from "@/registry/new-york-v4/ui/switch"

import { Header } from "@/components/profiza/header"
import { ThemeToggle } from "@/components/profiza/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { actionSaveConfiguracoes } from "@/app/profiza/actions/profissionais"
import type { Configuracoes } from "@/lib/supabase/queries"

interface Props {
  adminEmail: string
  configuracoes: Configuracoes
}

export function ConfiguracaoClient({ adminEmail, configuracoes }: Props) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [changingPassword, setChangingPassword] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [cidade, setCidade] = React.useState(configuracoes.cidade || "Bauru - SP")
  const [trialDays, setTrialDays] = React.useState(String(configuracoes.trialDays))
  const [price, setPrice] = React.useState(String(configuracoes.subscriptionPrice))
  const [notifTeste, setNotifTeste] = React.useState(configuracoes.notifTesteVencendo)
  const [notifLead, setNotifLead] = React.useState(configuracoes.notifNovoLead)
  const [notifSemResposta, setNotifSemResposta] = React.useState(configuracoes.notifSemResposta)

  const handleSave = async () => {
    setSaving(true)
    try {
      await actionSaveConfiguracoes({
        cidade,
        trialDays: Number(trialDays),
        subscriptionPrice: Number(price),
        notifTesteVencendo: notifTeste,
        notifNovoLead: notifLead,
        notifSemResposta: notifSemResposta,
      })
      toast.success("Configurações salvas com sucesso")
    } catch {
      toast.error("Erro ao salvar configurações")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres")
      return
    }
    setChangingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPassword(false)
    if (error) {
      toast.error("Erro ao alterar senha")
      return
    }
    setNewPassword("")
    setConfirmPassword("")
    toast.success("Senha alterada com sucesso")
    router.refresh()
  }

  return (
    <>
      <Header title="Configuração" subtitle="Preferências do sistema" />

      <div className="space-y-4 p-4 md:space-y-6 lg:p-8">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Perfil */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Perfil do administrador</CardTitle>
                  <CardDescription>Seus dados de acesso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">E-mail</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  readOnly
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Email vinculado à conta Supabase Auth
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alterar senha */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Alterar senha</CardTitle>
                  <CardDescription>Redefina sua senha de acesso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={changingPassword}>
                  {changingPassword ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Alterando...</>
                  ) : (
                    "Alterar senha"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Empresa */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Dados da operação</CardTitle>
                  <CardDescription>Informações do negócio</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cidade de operação</Label>
                <Select value={cidade} onValueChange={setCidade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bauru - SP">Bauru - SP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial-days">Dias de teste grátis</Label>
                <Input id="trial-days" type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Valor da assinatura (R$)</Label>
                <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Aparência */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Aparência</CardTitle>
                  <CardDescription>Personalize a interface</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Tema</p>
                  <p className="text-sm text-muted-foreground">Alterne entre claro e escuro</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Animações</p>
                  <p className="text-sm text-muted-foreground">Transições suaves na interface</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Notificações</CardTitle>
                  <CardDescription>Alertas e lembretes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Testes vencendo", desc: "Alerta 7 dias antes do vencimento", checked: notifTeste, onChange: setNotifTeste },
                { label: "Novos leads", desc: "Notificar a cada lead roteado", checked: notifLead, onChange: setNotifLead },
                { label: "Leads sem resposta", desc: "Alerta quando não há resposta", checked: notifSemResposta, onChange: setNotifSemResposta },
              ].map(({ label, desc, checked, onChange }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={checked} onCheckedChange={onChange} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Integrações */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Integrações</CardTitle>
                  <CardDescription>Conexões com serviços externos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "WhatsApp Business API", desc: "Roteamento de leads", color: "#25D366", connected: true },
                  { name: "Supabase", desc: "Banco de dados", color: "var(--primary)", connected: true },
                ].map(({ name, desc, color, connected }) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18` }}>
                        <Globe className="h-4 w-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${connected ? "bg-[--profiza-badge-ativo-bg] text-[--profiza-badge-ativo-fg]" : "bg-destructive/10 text-destructive"}`}>
                      {connected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reset de Banco / Limpeza de Mockups */}
          <Card className="border border-destructive/30 bg-destructive/5 shadow-sm lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <div>
                    <CardTitle className="text-destructive">Zerar Banco de Dados (Reset para Produção)</CardTitle>
                    <CardDescription>
                      Remove permanentemente todos os profissionais fictícios, leads e registros de teste da base.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (confirm("ATENÇÃO: Deseja realmente apagar TODOS os profissionais e dados fictícios do banco para colocar em produção?")) {
                      setSaving(true)
                      try {
                        const { actionClearAllData } = await import("@/app/profiza/actions/profissionais")
                        await actionClearAllData()
                        toast.success("Banco de dados zerado com sucesso! Pronto para produção.")
                        router.refresh()
                      } catch {
                        toast.error("Erro ao zerar o banco de dados.")
                      } finally {
                        setSaving(false)
                      }
                    }
                  }}
                  disabled={saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Zerar dados de teste
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar configurações</>}
          </Button>
        </div>
      </div>
    </>
  )
}
