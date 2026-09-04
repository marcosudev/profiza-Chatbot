"use client"

import * as React from "react"
import {
  Bell,
  Bot,
  Building2,
  Globe,
  Key,
  MessageSquare,
  Save,
  Sparkles,
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
import { Textarea } from "@/registry/new-york-v4/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/new-york-v4/ui/select"
import { Switch } from "@/registry/new-york-v4/ui/switch"

import { Header } from "@/components/profiza/header"
import { actionSaveConfiguracoes } from "@/app/profiza/actions/profissionais"
import type { Configuracoes } from "@/lib/supabase/queries"

interface Props {
  adminEmail: string
  configuracoes: Configuracoes
}

export function ConfiguracaoClient({ adminEmail, configuracoes }: Props) {
  const [saving, setSaving] = React.useState(false)
  const [cidade, setCidade] = React.useState(configuracoes.cidade || "Bauru - SP")
  const [trialDays, setTrialDays] = React.useState(String(configuracoes.trialDays))
  const [price, setPrice] = React.useState(String(configuracoes.subscriptionPrice))
  const [notifTeste, setNotifTeste] = React.useState(configuracoes.notifTesteVencendo)
  const [notifLead, setNotifLead] = React.useState(configuracoes.notifNovoLead)
  const [notifSemResposta, setNotifSemResposta] = React.useState(configuracoes.notifSemResposta)
  const [maxProfissionais, setMaxProfissionais] = React.useState(String(configuracoes.maxProfissionaisLead || 1))
  const [promptAi, setPromptAi] = React.useState(configuracoes.promptSistemaAi || "")
  const [msgEncontrado, setMsgEncontrado] = React.useState(configuracoes.msgProfissionalEncontrado || "")
  const [msgSemMatch, setMsgSemMatch] = React.useState(configuracoes.msgSemMatch || "")
  const [msgPedirBairro, setMsgPedirBairro] = React.useState(configuracoes.msgPedirBairro || "")

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
        maxProfissionaisLead: Number(maxProfissionais),
        promptSistemaAi: promptAi,
        msgProfissionalEncontrado: msgEncontrado,
        msgSemMatch: msgSemMatch,
        msgPedirBairro: msgPedirBairro,
      })
      toast.success("Configurações salvas com sucesso")
    } catch {
      toast.error("Erro ao salvar configurações")
    } finally {
      setSaving(false)
    }
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

          {/* Personalização da IA e Mensagens do Bot */}
          <Card className="border-none shadow-sm lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Personalização da IA & Mensagens do Bot</CardTitle>
                  <CardDescription>
                    Configure como o ChatGPT entende as mensagens, o limite de indicações por lead e o formato das respostas no WhatsApp.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-profs">Limite de profissionais por lead</Label>
                  <Select value={maxProfissionais} onValueChange={setMaxProfissionais}>
                    <SelectTrigger id="max-profs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 profissional (Indicação Direta)</SelectItem>
                      <SelectItem value="2">2 profissionais</SelectItem>
                      <SelectItem value="3">3 profissionais</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Quantos prestadores enviar para o cliente a cada solicitação</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="prompt-ai">Tom de voz e instruções do ChatGPT (System Prompt)</Label>
                  <Textarea
                    id="prompt-ai"
                    rows={3}
                    value={promptAi}
                    onChange={(e) => setPromptAi(e.target.value)}
                    placeholder="Instruções para o modelo GPT-4o-mini..."
                  />
                  <p className="text-xs text-muted-foreground">Orientação de postura, regras e contexto de localização do assistente</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="msg-encontrado">Modelo de mensagem: Profissional Encontrado (Escopo do envio)</Label>
                  <Textarea
                    id="msg-encontrado"
                    rows={4}
                    value={msgEncontrado}
                    onChange={(e) => setMsgEncontrado(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Variáveis disponíveis: <code>{"{nome}"}</code>, <code>{"{categoria}"}</code>, <code>{"{bairros}"}</code>, <code>{"{whatsapp}"}</code></p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg-pedir-bairro">Mensagem: Pedir Bairro ao Cliente</Label>
                  <Textarea
                    id="msg-pedir-bairro"
                    rows={3}
                    value={msgPedirBairro}
                    onChange={(e) => setMsgPedirBairro(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Variável disponível: <code>{"{categoria}"}</code></p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg-sem-match">Mensagem: Sem Profissional Disponível</Label>
                  <Textarea
                    id="msg-sem-match"
                    rows={3}
                    value={msgSemMatch}
                    onChange={(e) => setMsgSemMatch(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Variáveis disponíveis: <code>{"{categoria}"}</code>, <code>{"{local}"}</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
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
