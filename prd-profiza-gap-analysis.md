# PRD — Profiza: Gap Analysis e Plano de Implementação Completo

| Campo | Valor |
|---|---|
| **Versão** | 1.0 |
| **Data** | 22 de agosto de 2026 |
| **Status** | Análise técnica para desenvolvimento |
| **Referência** | `prd-profiza-painel-admin.md` v1.1 |
| **Escopo** | Análise de lacunas entre o PRD original e a implementação atual |

---

## 1. Sumário Executivo

Este documento analisa **cada elemento, botão, página e funcionalidade** especificados no PRD original (`prd-profiza-painel-admin.md`) e compara com o estado atual da implementação em `/profiza`. O objetivo é identificar todas as lacunas e criar um plano de ação priorizado para completar o MVP.

---

## 2. Estado Atual da Implementação

### 2.1 Arquivos existentes

| Arquivo | Descrição | Status |
|---|---|---|
| `app/profiza/page.tsx` | Página principal do dashboard | ✅ Existe |
| `components/profiza/professional-dashboard.tsx` | Componente monolítico do dashboard | ✅ Existe |
| `components/profiza/theme-toggle.tsx` | Botão de alternância light/dark | ✅ Existe |
| `lib/profiza-data.ts` | Dados mock e tipos TypeScript | ✅ Existe |
| `app/globals.css` | Tokens CSS Profiza (light + dark) | ✅ Configurado |

### 2.2 Páginas que NÃO existem (requeridas pelo PRD)

| Rota | Requisito PRD | Status |
|---|---|---|
| `/profiza/login` | RF-01 — Autenticação | ❌ Não existe |
| `/profiza/recuperar-senha` | RF-01 — Recuperação de senha | ❌ Não existe |
| `/profiza/profissionais` | RF-02/RF-03 — Listagem dedicada | ❌ Não existe (embutida no dashboard) |
| `/profiza/profissionais/[id]` | RF-02 — Detalhe/edição do profissional | ❌ Não existe |
| `/profiza/leads` | Sidebar indica, mas não especificado no MVP | ❌ Não existe |
| `/profiza/cobranca` | Sidebar indica, mas não especificado no MVP | ❌ Não existe |
| `/profiza/configuracao` | Sidebar indica, mas não especificado no MVP | ❌ Não existe |

---

## 3. Análise Detalhada por Requisito Funcional

### 3.1 RF-01 — Autenticação de Administrador

| Item | PRD | Implementação Atual | Gap |
|---|---|---|---|
| Login via Supabase Auth | Obrigatório | ❌ Não implementado | **CRÍTICO** |
| Sessão persistente | Obrigatório | ❌ Não implementado | **CRÍTICO** |
| Recuperação de senha | Obrigatório | ❌ Não implementado | **CRÍTICO** |
| Redirect para `/login` se não autenticado | Obrigatório | ❌ Não implementado | **CRÍTICO** |
| Rate limiting | Nativo Supabase | N/A (depende de Supabase) | — |

**Arquivos a criar:**
- `app/profiza/login/page.tsx`
- `app/profiza/recuperar-senha/page.tsx`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `middleware.ts` (proteção de rotas)
- `components/profiza/auth-form.tsx`

---

### 3.2 RF-02 — Gestão de Cadastros (CRUD)

| Item | PRD | Implementação Atual | Gap |
|---|---|---|---|
| Formulário com React Hook Form + Zod | Obrigatório | ❌ Usa `useState` simples | **ALTO** |
| Validação `nome` (min 3 chars) | Obrigatório | ❌ Não valida | **ALTO** |
| Validação `whatsapp` (regex BR + E.164) | Obrigatório | ❌ Não valida | **ALTO** |
| `categoria` como lista fixa (enum Zod) | Obrigatório | ✅ Select com lista fixa | OK |
| `bairro_atuacao` multi-seleção (min 1) | Obrigatório | ⚠️ Funciona, mas sem validação min 1 | **MÉDIO** |
| `status_pagamento` padrão `teste_gratis` | Obrigatório | ✅ Implementado | OK |
| Erros inline por campo | Obrigatório | ❌ Não exibe erros | **ALTO** |
| Edição em Dialog (modal) | Obrigatório | ⚠️ Só tem criação, não edição | **ALTO** |
| Toast de sucesso/erro | Obrigatório | ❌ Não implementado | **MÉDIO** |
| Exclusão com confirmação | Obrigatório | ❌ Não implementado | **MÉDIO** |
| Soft delete (status = inativo) | Recomendado | ❌ Não implementado | **BAIXO** |
| Campo `email` | Opcional | ❌ Não no formulário | **BAIXO** |
| Campo `observacoes` | Opcional | ❌ Não no formulário | **BAIXO** |

**Arquivos a criar/modificar:**
- `lib/profiza-schemas.ts` — schemas Zod
- `components/profiza/professional-form.tsx` — formulário com RHF + Zod
- `components/profiza/professional-edit-dialog.tsx` — modal de edição
- `components/profiza/delete-confirmation-dialog.tsx` — confirmação de exclusão

---

### 3.3 RF-03 — Data Table Avançada

| Item | PRD | Implementação Atual | Gap |
|---|---|---|---|
| Paginação server-side | Obrigatório | ❌ Client-side (todos os dados carregados) | **ALTO** |
| Busca com debounce (~300ms) | Obrigatório | ⚠️ Busca existe, mas sem debounce | **MÉDIO** |
| Filtro por `status_pagamento` | Obrigatório | ✅ Implementado | OK |
| Ordenação por coluna | Obrigatório | ❌ Não implementado | **MÉDIO** |
| Colunas: nome, whatsapp, categoria, bairros, status, leads | Obrigatório | ✅ Implementado | OK |
| Coluna "Última atividade" | Extra | ✅ Implementado | OK |

**Arquivos a criar/modificar:**
- `hooks/use-debounce.ts`
- `components/profiza/professionals-table.tsx` — extrair tabela do dashboard
- Integração com Supabase para paginação real

---

### 3.4 RF-04 — Painel de Conversão (Dashboard)

| Card | PRD | Implementação Atual | Gap |
|---|---|---|---|
| Profissionais ativos | `count(*) where status = 'ativo'` | ✅ Implementado (mock) | Falta Supabase |
| Leads na semana | `count(*)` em `leads_eventos` | ✅ Implementado (mock) | Falta Supabase |
| Em teste grátis | `count(*) where status = 'teste_gratis'` | ✅ Implementado (mock) | Falta Supabase |
| Vencendo em 7 dias | `count(*) where teste_gratis_expira_em <= now() + 7d` | ✅ Implementado (mock) | Falta Supabase |

**Status:** Visualmente completo, mas usando dados mock. Precisa integração com Supabase.

---

### 3.5 RF-05 — Gestão de Status de Pagamento

| Item | PRD | Implementação Atual | Gap |
|---|---|---|---|
| Alteração via dropdown na linha | Obrigatório | ✅ Implementado | OK |
| Toast de confirmação | Obrigatório | ❌ Não implementado | **MÉDIO** |
| Persistência no banco | Obrigatório | ❌ Só altera estado local | **ALTO** |

---

### 3.6 RF-06 — Exportação de Dados (Fase 2)

| Item | PRD | Implementação Atual | Gap |
|---|---|---|---|
| Exportar CSV | Nice-to-have | ❌ Não implementado | **BAIXO** (fase 2) |

---

## 4. Análise da Sidebar — Botões e Navegação

### 4.1 Estado atual dos botões da sidebar

| Botão | Ícone | Rota esperada | Funciona? | Ação atual |
|---|---|---|---|---|
| Dashboard | `LayoutGrid` | `/profiza` | ⚠️ Parcial | Está ativo visualmente, mas é `<button>` sem navegação |
| Profissionais | `Users` | `/profiza/profissionais` | ❌ Não | Botão sem ação |
| Leads | `MessageSquareText` | `/profiza/leads` | ❌ Não | Botão sem ação |
| Cobrança | `CircleDollarSign` | `/profiza/cobranca` | ❌ Não | Botão sem ação |
| Configuração | `WalletCards` | `/profiza/configuracao` | ❌ Não | Botão sem ação |

**Problema:** Todos os itens da sidebar são `<button>` sem `onClick` ou `href`. Precisam ser convertidos para `<Link>` do Next.js.

---

## 5. Análise do Header — Botões e Elementos

| Elemento | Funciona? | Ação atual | Gap |
|---|---|---|---|
| Breadcrumb "Bauru / Operação local" | ✅ | Texto estático | OK |
| Título "Dashboard Profiza" | ✅ | Texto estático | OK |
| Input de busca | ⚠️ | Filtra localmente, sem debounce | **MÉDIO** |
| Botão sino (notificações) | ❌ | Sem ação | **BAIXO** (fase futura) |
| Botão tema (light/dark) | ✅ | Funciona com animação | OK |
| Botão "Novo profissional" | ✅ | Abre Dialog | OK |

---

## 6. Análise do Dialog "Novo Profissional"

| Campo | Validação PRD | Implementação Atual | Gap |
|---|---|---|---|
| Nome | Min 3 chars | ❌ Sem validação | **ALTO** |
| WhatsApp | Regex BR + E.164 transform | ❌ Sem validação | **ALTO** |
| Categoria | Lista fixa | ✅ Select funciona | OK |
| Status | Readonly "Teste grátis" | ✅ Implementado | OK |
| Bairros | Min 1 selecionado | ⚠️ Permite 0 selecionados | **MÉDIO** |
| Botão Cancelar | Fecha dialog | ✅ Funciona | OK |
| Botão Salvar | Valida + persiste | ⚠️ Salva sem validar, só local | **ALTO** |

---

## 7. Análise da Tabela de Profissionais

| Coluna | Funciona? | Interação | Gap |
|---|---|---|---|
| Nome + WhatsApp | ✅ | Exibe corretamente | OK |
| Categoria | ✅ | Exibe corretamente | OK |
| Bairros (tags) | ✅ | Exibe corretamente | OK |
| Status (dropdown) | ✅ | Altera localmente | Falta persistir |
| Leads | ✅ | Exibe corretamente | OK |
| Última atividade | ✅ | Exibe formatado | OK |
| Botão "Abrir" | ❌ | Sem ação | **ALTO** |

**Problema do botão "Abrir":** Deveria abrir o Dialog de edição ou navegar para `/profiza/profissionais/[id]`.

---

## 8. Análise dos Cards Laterais

### 8.1 Checklist de cobrança

| Item | Funciona? | Dados | Gap |
|---|---|---|---|
| Lista de itens | ✅ | Hardcoded | **MÉDIO** — deveria ser dinâmico |
| Ícones done/pending | ✅ | Funciona | OK |
| Interatividade | ❌ | Não clicável | **BAIXO** |

### 8.2 Resumo do fluxo (progress bars)

| Item | Funciona? | Dados | Gap |
|---|---|---|---|
| Taxa de conversão | ✅ | Hardcoded 38% | **MÉDIO** — deveria ser calculado |
| Qualidade de categoria | ✅ | Hardcoded 96% | **MÉDIO** — deveria ser calculado |
| Base ativa | ✅ | Hardcoded 74% | **MÉDIO** — deveria ser calculado |

---

## 9. Integração com Supabase — Gap Completo

| Componente | PRD | Status | Prioridade |
|---|---|---|---|
| Supabase Client (browser) | Obrigatório | ❌ Não existe | **CRÍTICO** |
| Supabase Server (SSR) | Obrigatório | ❌ Não existe | **CRÍTICO** |
| Auth Provider | Obrigatório | ❌ Não existe | **CRÍTICO** |
| Middleware de proteção | Obrigatório | ❌ Não existe | **CRÍTICO** |
| CRUD profissionais | Obrigatório | ❌ Só mock local | **CRÍTICO** |
| Query dashboard cards | Obrigatório | ❌ Só mock local | **ALTO** |
| Query leads_eventos | Obrigatório | ❌ Não existe | **ALTO** |

---

## 10. Tipografia — Gap Analysis

| Uso | PRD | Implementação Atual | Gap |
|---|---|---|---|
| Corpo (Manrope) | Obrigatório | ❌ Usando fonte padrão do sistema | **MÉDIO** |
| Títulos (Bricolage Grotesque) | Obrigatório | ❌ Usando fonte padrão do sistema | **MÉDIO** |
| Google Fonts import | Obrigatório | ❌ Não configurado | **MÉDIO** |
| Tailwind fontFamily config | Obrigatório | ❌ Não configurado | **MÉDIO** |

---

## 11. Plano de Implementação Priorizado

### Fase 0 — Fundação (Crítico)

| # | Tarefa | Arquivos | Estimativa |
|---|---|---|---|
| 0.1 | Configurar Supabase Client/Server | `lib/supabase/*.ts` | 2h |
| 0.2 | Criar página de login | `app/profiza/login/page.tsx` | 3h |
| 0.3 | Criar página recuperar senha | `app/profiza/recuperar-senha/page.tsx` | 2h |
| 0.4 | Middleware de proteção de rotas | `middleware.ts` | 2h |
| 0.5 | Auth Provider + contexto | `components/profiza/auth-provider.tsx` | 2h |

### Fase 1 — CRUD Completo (Alto)

| # | Tarefa | Arquivos | Estimativa |
|---|---|---|---|
| 1.1 | Schemas Zod para validação | `lib/profiza-schemas.ts` | 2h |
| 1.2 | Formulário com React Hook Form | `components/profiza/professional-form.tsx` | 4h |
| 1.3 | Dialog de edição | `components/profiza/professional-edit-dialog.tsx` | 3h |
| 1.4 | Dialog de confirmação de exclusão | `components/profiza/delete-confirmation-dialog.tsx` | 1h |
| 1.5 | Integração CRUD com Supabase | `lib/profiza-actions.ts` (Server Actions) | 4h |
| 1.6 | Toast de feedback | Integrar `sonner` existente | 1h |

### Fase 2 — Data Table Avançada (Alto)

| # | Tarefa | Arquivos | Estimativa |
|---|---|---|---|
| 2.1 | Hook useDebounce | `hooks/use-debounce.ts` | 0.5h |
| 2.2 | Paginação server-side | `components/profiza/professionals-table.tsx` | 4h |
| 2.3 | Ordenação por coluna | Mesmo arquivo | 2h |
| 2.4 | Botão "Abrir" funcional | Mesmo arquivo | 1h |

### Fase 3 — Navegação e Páginas (Médio)

| # | Tarefa | Arquivos | Estimativa |
|---|---|---|---|
| 3.1 | Converter sidebar para Links | `components/profiza/sidebar.tsx` | 1h |
| 3.2 | Layout compartilhado Profiza | `app/profiza/layout.tsx` | 2h |
| 3.3 | Página /profiza/profissionais | `app/profiza/profissionais/page.tsx` | 2h |
| 3.4 | Página /profiza/profissionais/[id] | `app/profiza/profissionais/[id]/page.tsx` | 3h |

### Fase 4 — Tipografia e Polish (Médio)

| # | Tarefa | Arquivos | Estimativa |
|---|---|---|---|
| 4.1 | Importar Google Fonts | `app/layout.tsx` ou `app/profiza/layout.tsx` | 1h |
| 4.2 | Configurar Tailwind fontFamily | `tailwind.config.js` ou CSS | 1h |
| 4.3 | Aplicar font-display nos títulos | Componentes diversos | 1h |

### Fase 5 — Dados Dinâmicos (Médio)

| # | Tarefa | Arquivos | Estimativa |
|---|---|---|---|
| 5.1 | Cards do dashboard com Supabase | `components/profiza/dashboard-cards.tsx` | 3h |
| 5.2 | Checklist dinâmico | `components/profiza/checklist.tsx` | 2h |
| 5.3 | Progress bars calculadas | `components/profiza/flow-summary.tsx` | 2h |

### Fase 6 — Nice-to-have (Baixo)

| # | Tarefa | Arquivos | Estimativa |
|---|---|---|---|
| 6.1 | Exportação CSV | `lib/export-csv.ts` | 2h |
| 6.2 | Notificações (sino funcional) | Fase futura | — |
| 6.3 | Páginas Leads/Cobrança/Config | Fase futura | — |

---

## 12. Estrutura de Arquivos Proposta

```
app/profiza/
├── layout.tsx                    # Layout com sidebar + auth check
├── page.tsx                      # Dashboard (já existe)
├── login/
│   └── page.tsx                  # Tela de login
├── recuperar-senha/
│   └── page.tsx                  # Recuperação de senha
├── profissionais/
│   ├── page.tsx                  # Listagem dedicada
│   └── [id]/
│       └── page.tsx              # Detalhe/edição

components/profiza/
├── auth-form.tsx                 # Formulário de login
├── auth-provider.tsx             # Contexto de autenticação
├── dashboard-cards.tsx           # Cards KPI extraídos
├── delete-confirmation-dialog.tsx
├── flow-summary.tsx              # Progress bars
├── checklist.tsx                 # Checklist dinâmico
├── professional-dashboard.tsx    # (já existe, será refatorado)
├── professional-form.tsx         # Formulário RHF + Zod
├── professional-edit-dialog.tsx  # Modal de edição
├── professionals-table.tsx       # Tabela extraída
├── sidebar.tsx                   # Sidebar extraída
├── theme-toggle.tsx              # (já existe)

lib/
├── profiza-data.ts               # (já existe — tipos e mock)
├── profiza-schemas.ts            # Schemas Zod
├── profiza-actions.ts            # Server Actions para CRUD
├── supabase/
│   ├── client.ts                 # Browser client
│   ├── server.ts                 # Server client
│   └── middleware.ts             # Helper para middleware

hooks/
├── use-debounce.ts
```

---

## 13. Variáveis de Ambiente Necessárias

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Apenas server-side
```

---

## 14. Critérios de Aceite Atualizados

### Fase 0 (Fundação)
- [ ] Login funcional com e-mail/senha via Supabase Auth
- [ ] Recuperação de senha funcional
- [ ] Rotas `/profiza/*` protegidas — redirect para `/profiza/login` se não autenticado
- [ ] Logout funcional

### Fase 1 (CRUD)
- [ ] Formulário valida todos os campos conforme PRD (nome min 3, whatsapp E.164, bairros min 1)
- [ ] Erros de validação exibidos inline
- [ ] Criação persiste no Supabase
- [ ] Edição via Dialog funcional
- [ ] Exclusão com confirmação (soft delete)
- [ ] Toast de feedback em todas as ações

### Fase 2 (Data Table)
- [ ] Paginação server-side (10 itens por página)
- [ ] Busca com debounce 300ms
- [ ] Ordenação por nome, categoria, status
- [ ] Botão "Abrir" abre modal de edição

### Fase 3 (Navegação)
- [ ] Sidebar com Links funcionais
- [ ] Página `/profiza/profissionais` dedicada
- [ ] URL reflete o estado (filtros, página)

### Fase 4 (Tipografia)
- [ ] Manrope carregada e aplicada ao corpo
- [ ] Bricolage Grotesque carregada e aplicada aos títulos/KPIs

### Fase 5 (Dados Dinâmicos)
- [ ] Cards do dashboard refletem dados reais do Supabase
- [ ] Checklist calculado dinamicamente
- [ ] Progress bars calculadas

---

## 15. Riscos Identificados

| Risco | Impacto | Mitigação |
|---|---|---|
| Supabase não configurado | Bloqueante | Priorizar Fase 0 |
| Refatoração grande do dashboard monolítico | Médio | Extrair componentes incrementalmente |
| Tipografia pode conflitar com fontes do shadcn-ui docs | Baixo | Isolar em `/profiza` layout |

---

## 16. Próximos Passos Imediatos

1. **Criar projeto Supabase** e obter credenciais
2. **Executar script SQL** do Anexo A do PRD original
3. **Implementar Fase 0** (autenticação)
4. **Testar fluxo completo** login → dashboard → logout
5. **Prosseguir para Fase 1** (CRUD com validação)

---

*Documento gerado em 22/08/2026 — Gap Analysis completo do Painel Profiza*
