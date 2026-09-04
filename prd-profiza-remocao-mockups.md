# PRD — Profiza: Remoção de Mockups e Preparação para Produção

| Campo | Valor |
|---|---|
| **Versão** | 1.0 |
| **Data** | Análise do estado atual |
| **Status** | Pronto para implementação |
| **Escopo** | Substituição de todos os dados hardcoded/mock por dados reais do Supabase |

---

## 1. Objetivo

Este documento cataloga **cada ocorrência de dado mockado, hardcoded ou simulado** no sistema Profiza e define o plano exato de substituição por dados reais. O critério é simples: nenhum valor que deveria vir do banco pode estar fixo no código.

---

## 2. Inventário Completo de Mockups

### 2.1 `components/profiza/global-search.tsx` — CRÍTICO

**Problema:** O componente de busca global constrói seu índice de busca a partir de dados 100% hardcoded. Dois arrays estáticos no topo do arquivo:

```ts
// MOCK — 12 leads com status antigos ("roteado", "pendente", "sem_match")
// que não existem mais no banco (constraint usa "novo","enviado","sem_resposta","convertido")
const leadsData = [
  { id: "l-1", cliente: "Maria Silva", status: "roteado", ... },
  ...
]

// MOCK — professionals importados de lib/profiza-data.ts (array estático)
import { professionals } from "@/lib/profiza-data"
```

**Impacto:**
- Buscar "Carlos" retorna o Carlos do mock, não o Carlos do banco
- Status dos leads no resultado da busca são `roteado/pendente/sem_match` — valores que não existem no DB
- Cadastrar um novo profissional no banco não o torna buscável
- Deletar um profissional do banco não o remove da busca

**Correção:** Transformar `GlobalSearch` em um componente que recebe `professionals` e `leads` como props (vindos do Server Component pai), eliminando os arrays estáticos internos.

---

### 2.2 `components/profiza/notifications-dropdown.tsx` — ALTO

**Problema:** Array `mockNotifications` hardcoded com 4 notificações fixas:

```ts
const mockNotifications: Notification[] = [
  { id: "n1", type: "teste_vencendo", title: "Teste vencendo",
    description: "Marina Costa vence em 3 dias", time: "Há 2h", read: false },
  { id: "n2", type: "novo_lead", title: "Novo lead roteado",
    description: "Eletricista → Carlos Andrade", time: "Há 4h", read: false },
  { id: "n3", type: "sem_match", title: "Lead sem match",
    description: "Pedreiro em Alto da Colina", time: "Há 6h", read: true },
  { id: "n4", type: "status_alterado", title: "Status alterado",
    description: "Roberto Silva → Ativo", time: "Ontem", read: true },
]
```

**Impacto:**
- O sino sempre mostra 2 notificações não lidas, independente do estado real
- "Marina Costa vence em 3 dias" é hardcoded — pode estar errado ou desatualizado
- "Marcar como lida" só funciona em memória, reseta ao recarregar

**Correção:** Calcular notificações dinamicamente a partir dos dados reais:
- `teste_vencendo` → profissionais com `status = 'teste_gratis'` e `teste_gratis_expira_em <= now() + 7 days`
- `sem_match` → leads com `status = 'sem_resposta'` recentes (últimas 24h)
- `novo_lead` → leads com `status = 'enviado'` criados hoje

---

### 2.4 `components/profiza/professional-drawer.tsx` — MÉDIO

**Problema:** Seção "Métricas" usa `professional.leadsSemana` (campo estático da tabela `profissionais`):

```tsx
<p className="text-2xl font-bold text-foreground">{professional.leadsSemana}</p>
<p className="text-xs text-muted-foreground">Leads esta semana</p>
```

**Impacto:** O drawer mostra o valor do campo `leads_semana` do banco, que é um inteiro estático inserido no seed e nunca atualizado automaticamente. Não reflete leads reais de `metricas_bot`.

**Correção:** O drawer já recebe o objeto `Professional`. A solução mais limpa é passar `leadsTotal` como prop adicional (vindo de `metricas_bot`) quando o drawer é aberto, ou buscar via Server Action ao abrir.

---

### 2.5 `app/profiza/profissionais/profissionais-client.tsx` — MÉDIO

**Problema:** Coluna "Leads" na tabela usa `row.leadsSemana`:

```tsx
<TableCell className="font-medium text-foreground">{row.leadsSemana}</TableCell>
```

E no mobile:
```tsx
<p className="text-sm font-semibold text-foreground">{row.leadsSemana}</p>
<p className="text-[10px] text-muted-foreground">leads</p>
```

**Impacto:** Mostra o campo estático `leads_semana` do banco (seed), não os dados reais de `metricas_bot`.

**Correção:** A página `profissionais/page.tsx` já busca `getProfissionais()`. Adicionar `getMetricasMap()` em paralelo e passar o map como prop para o client.

---

### 2.6 `app/profiza/leads/leads-client.tsx` — MÉDIO

**Problema 1:** Card "Resp. médio" com valor hardcoded:

```tsx
<p className="font-display text-2xl font-bold text-foreground md:text-3xl">2.3s</p>
<p className="text-xs text-muted-foreground md:text-sm">Meta: &lt; 5s</p>
```

**Problema 2:** Trend "+18%" hardcoded no card "Total semana":

```tsx
<p className="flex items-center gap-1 text-xs text-primary md:text-sm">
  <TrendingUp className="h-3 w-3" />+18%
</p>
```

**Problema 3:** Filtro de período (hoje/semana/mês) é feito **client-side** sobre os dados já carregados — se a página tem 12 leads, filtra os 12. Não busca do banco por período.

**Problema 4:** `handleRerotear` é um toast fake sem persistência:

```ts
const handleRerotear = (lead: Lead) => {
  toast.success(`Lead de ${lead.cliente} enviado para re-roteamento`)
}
```

**Impacto:**
- "2.3s" e "+18%" são decorativos, não informativos
- Filtro "Hoje" pode retornar 0 resultados mesmo havendo leads hoje, se não foram carregados
- Re-rotear não faz nada no banco

**Correção:**
- Remover "Resp. médio" ou substituir por métrica calculável (ex: leads convertidos %)
- Remover trend hardcoded ou calcular comparando semana atual vs anterior
- Implementar `updateLeadStatus` para re-rotear (setar status de volta para `novo`)

---

### 2.7 `app/profiza/configuracao/configuracao-client.tsx` — MÉDIO

**Problema 1:** Botão "Salvar configurações" é fake:

```ts
const handleSave = () => {
  setSaving(true)
  setTimeout(() => {
    setSaving(false)
    toast.success("Configurações salvas com sucesso")
  }, 800)
}
```

**Problema 2:** Campos "Dados da operação" são decorativos — cidade, dias de teste, valor da assinatura não persistem em lugar nenhum:

```tsx
<Select defaultValue="bauru">...</Select>
<Input id="trial-days" type="number" defaultValue="14" />
<Input id="price" type="number" step="0.01" defaultValue="29.90" />
```

**Problema 3:** Switches de notificações não persistem:

```tsx
<Switch defaultChecked={defaultChecked} />
```

**Problema 4:** Integrações "WhatsApp Business API" e "Supabase" com status `connected: true` hardcoded.

**Impacto:**
- Admin muda "dias de teste" para 30, clica salvar, recarrega — volta para 14
- Switches de notificação resetam a cada reload
- Status de integração não reflete realidade

**Correção:** Criar tabela `configuracoes` no Supabase com uma única row de configuração do sistema. Campos: `trial_days`, `subscription_price`, `cidade`, `notif_teste_vencendo`, `notif_novo_lead`, `notif_sem_resposta`.

---

### 2.8 `lib/profiza-data.ts` — BAIXO (mas estrutural)

**Problema:** O arquivo ainda exporta o array `professionals` (12 itens mock) e `dashboardSummary` calculado sobre esses mocks:

```ts
export const professionals: Professional[] = [ ... 12 itens hardcoded ... ]

export const dashboardSummary = {
  ativos: professionals.filter(...).length,
  ...
}
```

**Impacto:** O `global-search.tsx` importa `professionals` daqui. Se alguém importar `dashboardSummary` por engano, pega dados falsos.

**Correção:** Remover `professionals` e `dashboardSummary` do arquivo. Manter apenas os tipos (`Professional`, `PaymentStatus`) e as listas de domínio (`bairrosDisponiveis`, `categoriasDisponiveis`).

---

### 2.9 `app/profiza/dashboard-client.tsx` — BAIXO

**Problema:** Trends dos KPI cards são hardcoded:

```tsx
{ label: "Profissionais ativos", trend: "+12%", ... },
{ label: "Leads na semana", trend: "+18%", ... },
{ label: "Em teste grátis", trend: "7 dias", ... },
{ label: "Vencendo em 7 dias", trend: "Urgente", ... },
```

**Impacto:** "+12%" e "+18%" são decorativos. Não refletem crescimento real.

**Correção:** Calcular comparando período atual vs anterior, ou substituir por valores absolutos mais informativos (ex: "vs semana passada: +3").

---

## 3. Tabela de Prioridades

| # | Arquivo | Tipo de mock | Impacto | Prioridade |
|---|---|---|---|---|
| 1 | `global-search.tsx` | Dados de busca hardcoded + status errados | Busca retorna dados falsos | **CRÍTICO** |
| 2 | `notifications-dropdown.tsx` | Array de notificações fixo | Sino sempre mostra dados falsos | **ALTO** |
| 3 | `configuracao-client.tsx` | Salvar fake + campos sem persistência | Admin não consegue configurar nada | **ALTO** |
| 4 | `profissionais-client.tsx` | `leadsSemana` estático | Coluna Leads mostra dado errado | **MÉDIO** |
| 5 | `professional-drawer.tsx` | `leadsSemana` estático | Drawer mostra dado errado | **MÉDIO** |
| 6 | `leads-client.tsx` | Tempo resposta + trend + re-rotear fake | Métricas enganosas + ação sem efeito | **MÉDIO** |
| 7 | `sidebar.tsx` | Taxa de retenção hardcoded | Número decorativo | **MÉDIO** |
| 8 | `profiza-data.ts` | Array mock ainda exportado | Risco de importação acidental | **BAIXO** |
| 9 | `dashboard-client.tsx` | Trends hardcoded | Números decorativos | **BAIXO** |

---

## 4. Plano de Implementação

### Fase 1 — Banco de dados (pré-requisito)

**4.1 — Nova tabela `configuracoes`**

```sql
create table if not exists configuracoes (
  id                    text primary key default 'singleton',
  cidade                text not null default 'Bauru - SP',
  trial_days            int not null default 30,
  subscription_price    numeric(10,2) not null default 29.90,
  notif_teste_vencendo  boolean not null default true,
  notif_novo_lead       boolean not null default false,
  notif_sem_resposta    boolean not null default true,
  updated_at            timestamptz default now()
);

-- Garante que só existe uma row
alter table configuracoes add constraint configuracoes_singleton
  check (id = 'singleton');

-- RLS
alter table configuracoes enable row level security;
create policy "admin full access configuracoes"
  on configuracoes for all
  using (auth.role() = 'authenticated');

-- Seed da row única
insert into configuracoes (id) values ('singleton') on conflict do nothing;
```

**Arquivo a criar:** `docs/supabase-configuracoes.sql`

---

### Fase 2 — Queries e Actions

**4.2 — Adicionar em `lib/supabase/queries.ts`:**

```ts
// Configurações do sistema
export interface Configuracoes {
  cidade: string
  trialDays: number
  subscriptionPrice: number
  notifTesteVencendo: boolean
  notifNovoLead: boolean
  notifSemResposta: boolean
}

export async function getConfiguracoes(): Promise<Configuracoes>
export async function updateConfiguracoes(data: Partial<Configuracoes>): Promise<void>

// Notificações calculadas (sem tabela nova — derivadas dos dados existentes)
export interface NotificacaoCalculada {
  id: string
  type: "teste_vencendo" | "novo_lead" | "sem_resposta"
  title: string
  description: string
  createdAt: string
}

export async function getNotificacoes(): Promise<NotificacaoCalculada[]>

```

**4.3 — Adicionar em `app/profiza/actions/profissionais.ts`:**

```ts
export async function actionUpdateLeadStatus(id: string, status: LeadStatus): Promise<void>
export async function actionSaveConfiguracoes(data: Partial<Configuracoes>): Promise<void>
```

---

### Fase 3 — Componentes

**4.4 — `global-search.tsx`**

- Remover `leadsData` hardcoded e `import { professionals } from "@/lib/profiza-data"`
- Adicionar props: `professionals: Professional[]` e `leads: Lead[]`
- O componente `Header` (que renderiza o GlobalSearch) precisa receber essas props
- O layout `app/profiza/layout.tsx` busca os dados e os passa para baixo

**4.5 — `notifications-dropdown.tsx`**

- Remover `mockNotifications`
- Receber `notifications: NotificacaoCalculada[]` como prop
- O `Header` recebe e passa as notificações
- O layout busca `getNotificacoes()` e passa para o Header

**4.6 — `professional-drawer.tsx`**

- Adicionar prop opcional `leadsTotal?: number`
- Quando presente, exibir no lugar de `leadsSemana`
- Quem abre o drawer (profissionais-client, dashboard-client, cobranca-client) passa `metricasMap[professional.id]`

**4.8 — `profissionais-client.tsx`**

- Adicionar prop `metricasMap: Record<string, number>`
- Substituir `row.leadsSemana` por `metricasMap[row.id] ?? 0` na coluna Leads
- Passar `metricasMap[viewingProfessional.id]` para o `ProfessionalDrawer`
- `profissionais/page.tsx` busca `getMetricasMap()` em paralelo

**4.9 — `leads-client.tsx`**

- Remover card "Resp. médio" (não há dado calculável para isso no schema atual)
- Remover trend "+18%" hardcoded — substituir por contagem absoluta do período
- Implementar `handleRerotear` chamando `actionUpdateLeadStatus(id, "novo")`

**4.10 — `configuracao-client.tsx`**

- Receber `configuracoes: Configuracoes` como prop
- `handleSave` chama `actionSaveConfiguracoes` com os valores dos campos
- Switches controlados com estado inicializado pelos valores do banco
- Remover `setTimeout` fake

**4.11 — `dashboard-client.tsx`**

- Remover trends hardcoded "+12%" e "+18%"
- Substituir por label neutro ou calcular comparando com semana anterior (requer query adicional)

**4.12 — `lib/profiza-data.ts`**

- Remover `professionals` array
- Remover `dashboardSummary` objeto
- Manter: `PaymentStatus`, `Professional`, `bairrosDisponiveis`, `categoriasDisponiveis`

---

### Fase 4 — Layout (orquestração)

**4.12 — `app/profiza/layout.tsx`**

O layout é o ponto central que busca dados compartilhados entre todas as páginas e os distribui para Sidebar, Header e GlobalSearch. Atualmente não faz nenhuma busca de dados.

```ts
// Buscar em paralelo no layout:
const [notificacoes, profissionais, leads] = await Promise.all([
  getNotificacoes(),
  getProfissionais(),   // para o GlobalSearch
  getLeads(),           // para o GlobalSearch
])
```

Passar para:
- `<Header notificacoes={notificacoes} professionals={profissionais} leads={leads} />`

---

## 5. Schema SQL necessário

Apenas **uma** nova tabela é necessária (`configuracoes`). Todas as outras correções são derivadas de dados já existentes no banco.

```sql
-- docs/supabase-configuracoes.sql

create table if not exists configuracoes (
  id                    text primary key default 'singleton',
  cidade                text not null default 'Bauru - SP',
  trial_days            int not null default 30,
  subscription_price    numeric(10,2) not null default 29.90,
  notif_teste_vencendo  boolean not null default true,
  notif_novo_lead       boolean not null default false,
  notif_sem_resposta    boolean not null default true,
  updated_at            timestamptz default now()
);

alter table configuracoes add constraint configuracoes_singleton
  check (id = 'singleton');

create trigger trg_configuracoes_updated_at
before update on configuracoes
for each row execute function fn_set_updated_at();

alter table configuracoes enable row level security;

create policy "admin full access configuracoes"
  on configuracoes for all
  using (auth.role() = 'authenticated');

insert into configuracoes (id) values ('singleton') on conflict do nothing;
```

---

## 6. Impacto por arquivo — resumo de mudanças

| Arquivo | Mudança | Tipo |
|---|---|---|
| `docs/supabase-configuracoes.sql` | Criar | Novo arquivo SQL |
| `lib/supabase/queries.ts` | Adicionar `getConfiguracoes`, `updateConfiguracoes`, `getNotificacoes` | Adição |
| `app/profiza/actions/profissionais.ts` | Adicionar `actionUpdateLeadStatus`, `actionSaveConfiguracoes` | Adição |
| `app/profiza/layout.tsx` | Buscar dados compartilhados e passar para Sidebar/Header | Modificação |
| `app/profiza/profissionais/page.tsx` | Adicionar `getMetricasMap()` em paralelo | Modificação |
| `app/profiza/configuracao/page.tsx` | Adicionar `getConfiguracoes()` | Modificação |
| `components/profiza/header.tsx` | Receber `notificacoes`, `professionals`, `leads` e passar para filhos | Modificação |
| `components/profiza/global-search.tsx` | Remover dados hardcoded, receber props | Modificação |
| `components/profiza/notifications-dropdown.tsx` | Remover mock, receber props | Modificação |
| `components/profiza/professional-drawer.tsx` | Adicionar prop `leadsTotal` | Modificação |
| `app/profiza/profissionais/profissionais-client.tsx` | Receber `metricasMap`, usar em Leads e Drawer | Modificação |
| `app/profiza/leads/leads-client.tsx` | Remover hardcoded, implementar re-rotear real | Modificação |
| `app/profiza/configuracao/configuracao-client.tsx` | Receber `configuracoes`, salvar real | Modificação |
| `app/profiza/dashboard-client.tsx` | Remover trends hardcoded | Modificação |
| `lib/profiza-data.ts` | Remover `professionals[]` e `dashboardSummary` | Remoção |

---

## 7. Ordem de execução recomendada

1. Rodar `supabase-configuracoes.sql` no Supabase SQL Editor
2. Adicionar queries em `queries.ts` (getConfiguracoes, getNotificacoes)
3. Adicionar actions em `actions/profissionais.ts`
4. Atualizar `lib/profiza-data.ts` (remover mocks)
5. Atualizar `configuracao/page.tsx` + `configuracao-client.tsx`
6. Atualizar `profissionais/page.tsx` + `profissionais-client.tsx` + `professional-drawer.tsx`
7. Atualizar `leads-client.tsx`
8. Atualizar `layout.tsx` (orquestração central)
9. Atualizar `sidebar.tsx`, `header.tsx`, `global-search.tsx`, `notifications-dropdown.tsx`
10. Atualizar `dashboard-client.tsx` (remover trends)

---

## 8. O que NÃO está no escopo deste PRD

- Paginação server-side (os dados são carregados todos de uma vez — aceitável para o volume atual de Bauru)
- Sistema de notificações com persistência de "lido/não lido" (requer tabela `notificacoes` — fase futura)
- Tempo de resposta do bot (requer instrumentação no serviço Node.js — fora do painel)
- Trends de crescimento semana a semana (requer query de comparação de períodos — pode ser adicionado depois)
- Exportação CSV (já implementada, fora do escopo de mockups)

---

*Documento gerado após análise completa de todos os arquivos do sistema Profiza em `/apps/v4`*
