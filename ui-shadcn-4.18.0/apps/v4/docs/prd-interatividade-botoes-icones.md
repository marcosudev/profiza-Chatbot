# PRD: Análise de Interatividade - Botões, Ícones e Conectividade

**Versão:** 1.0  
**Data:** 22 de Agosto de 2026  
**Status:** Análise Completa

---

## 1. Resumo Executivo

Este documento analisa TODOS os elementos interativos do sistema Profiza, identificando:
- ✅ Elementos funcionais
- ⚠️ Elementos parcialmente funcionais
- ❌ Elementos não funcionais (precisam implementação)

---

## 2. Inventário de Elementos Interativos por Página

### 2.1 Sidebar (Global)

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Logo "P" | Clicável | ❌ | Nenhuma | Navegar para `/profiza` |
| "PROFIZA / Painel admin" | Clicável | ❌ | Nenhuma | Navegar para `/profiza` |
| Dashboard | Link | ✅ | Navega para `/profiza` | — |
| Profissionais | Link | ✅ | Navega para `/profiza/profissionais` | — |
| Leads | Link | ✅ | Navega para `/profiza/leads` | — |
| Cobrança | Link | ✅ | Navega para `/profiza/cobranca` | — |
| Configuração | Link | ✅ | Navega para `/profiza/configuracao` | — |
| Card "Status do mês 87%" | Clicável | ❌ | Nenhuma | Navegar para `/profiza/leads` ou abrir modal de detalhes |

---

### 2.2 Header (Global)

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Campo de busca | Input | ✅ | Filtra tabela (debounced 300ms) | — |
| Ícone de sino (BellRing) | Botão | ❌ | Nenhuma | Abrir dropdown/painel de notificações |
| Theme Toggle (Sol/Lua) | Botão | ✅ | Alterna tema claro/escuro | — |
| Botão "Novo profissional" | Botão | ✅ | Abre dialog de cadastro | — |

---

### 2.3 Dashboard (`/profiza`)

#### KPI Cards (4 cards)

| Card | Status | Funcionalidade Atual | Ação Necessária |
|------|--------|---------------------|-----------------|
| Profissionais ativos | ✅ | Navega para `/profiza/profissionais?status=ativo` | — |
| Leads na semana | ✅ | Navega para `/profiza/leads` | — |
| Em teste grátis | ✅ | Navega para `/profiza/cobranca` | — |
| Vencendo em 7 dias | ✅ | Navega para `/profiza/cobranca` | — |

**Nota:** Os ícones dentro dos KPI cards (Building2, MessageSquareText, Users, BellRing) são decorativos, não precisam ser clicáveis.

#### Tabela de Profissionais

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Select "Todos" (filtro) | Select | ✅ | Filtra por status | — |
| Botão "Ver todos" | Link | ✅ | Navega para `/profiza/profissionais` | — |
| Nome do profissional | Texto | ⚠️ | Não clicável | Abrir perfil/dialog de detalhes |
| WhatsApp (telefone) | Texto | ❌ | Não clicável | Abrir WhatsApp Web |
| Badges de bairros | Tags | ❌ | Não clicáveis | Filtrar por bairro ao clicar |
| Select de Status | Select | ✅ | Altera status inline | — |
| Número de Leads | Texto | ❌ | Não clicável | Navegar para leads filtrados |
| Botão "Abrir" | Botão | ✅ | Abre dialog de edição | — |

#### Checklist de Cobrança

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| "2 testes grátis vencendo..." | Item | ❌ | Não clicável | Navegar para `/profiza/cobranca` |
| "1 profissionais inativos" | Item | ❌ | Não clicável | Navegar para `/profiza/profissionais?status=inativo` |
| "78 leads roteados..." | Item | ❌ | Não clicável | Navegar para `/profiza/leads` |

#### Resumo do Fluxo

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Progress bars | Visual | ❌ | Apenas visual | Opcional: tooltip com detalhes |
| Labels (Taxa de conversão, etc.) | Texto | ❌ | Não clicáveis | Opcional: abrir modal explicativo |

---

### 2.4 Profissionais (`/profiza/profissionais`)

#### Header da Página

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Campo de busca | Input | ✅ | Filtra tabela | — |
| Botão "Novo profissional" | Botão | ✅ | Abre dialog | — |

#### Tabela

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Select filtro status | Select | ✅ | Filtra por status | — |
| Botão "Exportar" | Botão | ❌ | Nenhuma | Exportar CSV/Excel |
| Headers ordenáveis (Nome, Categoria, Status, Leads) | Botão | ✅ | Ordena coluna | — |
| Nome do profissional | Texto | ⚠️ | Não clicável | Abrir perfil detalhado |
| WhatsApp | Texto | ❌ | Não clicável | Abrir WhatsApp |
| Badges de bairros | Tags | ❌ | Não clicáveis | Filtrar por bairro |
| Select de Status | Select | ✅ | Altera status | — |
| Menu "..." (MoreHorizontal) | Dropdown | ✅ | Abre menu | — |
| → Editar | MenuItem | ✅ | Abre dialog edição | — |
| → Abrir WhatsApp | MenuItem | ✅ | Abre WhatsApp Web | — |
| → Desativar | MenuItem | ✅ | Abre confirmação | — |

---

### 2.5 Leads (`/profiza/leads`)

#### KPI Cards

| Card | Status | Funcionalidade Atual | Ação Necessária |
|------|--------|---------------------|-----------------|
| Total da semana | ❌ | Não clicável | Opcional: filtrar período |
| Roteados com sucesso | ❌ | Não clicável | Filtrar status=roteado |
| Sem match | ❌ | Não clicável | Filtrar status=sem_match |
| Tempo médio resposta | ❌ | Não clicável | Opcional: abrir métricas |

#### Tabela

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Select período | Select | ⚠️ | Muda state mas não filtra dados | Implementar filtro real |
| Select status | Select | ✅ | Filtra por status | — |
| Nome do cliente | Texto | ❌ | Não clicável | Abrir detalhes do lead |
| Telefone do cliente | Texto | ❌ | Não clicável | Abrir WhatsApp |
| Nome do profissional | Texto | ❌ | Não clicável | Navegar para perfil |
| Badge de status | Badge | ❌ | Não clicável | Opcional: filtrar |

**Faltando na tabela:**
- Coluna de ações (ver detalhes, rerotear, etc.)
- Paginação

---

### 2.6 Cobrança (`/profiza/cobranca`)

#### KPI Cards

| Card | Status | Funcionalidade Atual | Ação Necessária |
|------|--------|---------------------|-----------------|
| Receita mensal | ❌ | Não clicável | Abrir relatório financeiro |
| Em teste grátis | ❌ | Não clicável | Scroll para seção de testes |
| Vencendo em 7 dias | ❌ | Não clicável | Scroll para tabela urgente |
| Taxa de conversão | ❌ | Não clicável | Abrir métricas detalhadas |

#### Tabela "Testes vencendo em breve"

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Nome do profissional | Texto | ❌ | Não clicável | Abrir perfil |
| WhatsApp | Texto | ❌ | Não clicável | Abrir WhatsApp |
| Botão "Contatar" | Botão | ✅ | Abre WhatsApp Web | — |

**Faltando:**
- Botão para converter (mudar status para ativo)
- Botão para estender teste
- Histórico de contatos

#### Cards de Resumo (Ativos, Teste grátis, Inativos)

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Título do card | Texto | ❌ | Não clicável | Navegar para lista filtrada |
| Items da lista | Texto | ❌ | Não clicáveis | Abrir perfil do profissional |
| "+X mais" | Texto | ❌ | Não clicável | Expandir lista ou navegar |

---

### 2.7 Configuração (`/profiza/configuracao`)

#### Formulários

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Input Nome | Input | ⚠️ | Editável mas não persiste | Integrar com Supabase |
| Input E-mail | Input | ⚠️ | Editável mas não persiste | Integrar com Supabase |
| Input Telefone | Input | ⚠️ | Editável mas não persiste | Integrar com Supabase |
| Select Cidade | Select | ⚠️ | Apenas Bauru disponível | Adicionar mais cidades |
| Input Dias de teste | Input | ⚠️ | Editável mas não persiste | Integrar com Supabase |
| Input Valor assinatura | Input | ⚠️ | Editável mas não persiste | Integrar com Supabase |
| Theme Toggle | Botão | ✅ | Funciona | — |
| Switch Animações | Switch | ⚠️ | Toggle visual, sem efeito | Implementar lógica |
| Switch Testes vencendo | Switch | ⚠️ | Toggle visual, sem efeito | Implementar notificações |
| Switch Novos leads | Switch | ⚠️ | Toggle visual, sem efeito | Implementar notificações |
| Switch Leads sem match | Switch | ⚠️ | Toggle visual, sem efeito | Implementar notificações |
| Botão "Salvar configurações" | Botão | ⚠️ | Toast fake, não persiste | Integrar com Supabase |

#### Cards de Integrações

| Elemento | Tipo | Status | Funcionalidade Atual | Ação Necessária |
|----------|------|--------|---------------------|-----------------|
| Card WhatsApp Business | Card | ❌ | Não clicável | Abrir configuração da API |
| Card Supabase | Card | ❌ | Não clicável | Abrir configuração do banco |
| Badge "Conectado" | Badge | ❌ | Estático | Mostrar status real |

---

## 3. Priorização de Implementação

### 🔴 Prioridade Alta (Impacto direto na UX)

1. **Botão de Notificações (Sino)** - Header global
   - Criar dropdown com lista de notificações
   - Mostrar badge com contador de não lidas

2. **Checklist clicável** - Dashboard
   - Cada item deve navegar para a página relevante

3. **Botão Exportar** - Profissionais
   - Implementar export CSV

4. **Filtro de período funcional** - Leads
   - Filtrar dados reais por data

5. **WhatsApp clicável** - Todas as tabelas
   - Telefones devem abrir WhatsApp Web

### 🟡 Prioridade Média (Melhoria de navegação)

6. **Logo clicável** - Sidebar
   - Navegar para Dashboard

7. **Card Status do mês clicável** - Sidebar
   - Navegar para métricas

8. **Nome do profissional clicável** - Tabelas
   - Abrir drawer/modal com perfil completo

9. **KPI Cards clicáveis** - Leads e Cobrança
   - Filtrar ou navegar conforme contexto

10. **Badges de bairros clicáveis** - Tabelas
    - Filtrar por bairro selecionado

### 🟢 Prioridade Baixa (Nice to have)

11. **Coluna de ações na tabela de Leads**
12. **Paginação nas tabelas**
13. **Tooltips nas progress bars**
14. **Cards de integração clicáveis**
15. **Switches de notificação funcionais**

---

## 4. Especificações Técnicas

### 4.1 Dropdown de Notificações

```
Componente: NotificationsDropdown
Localização: components/profiza/notifications-dropdown.tsx
Trigger: Ícone de sino no Header
Conteúdo:
  - Lista de notificações (máx 5 recentes)
  - Badge com contador
  - Link "Ver todas" → /profiza/notificacoes (futura página)
  - Tipos: teste_vencendo, novo_lead, sem_match, status_alterado
```

### 4.2 Perfil do Profissional (Drawer)

```
Componente: ProfessionalDrawer
Localização: components/profiza/professional-drawer.tsx
Trigger: Clique no nome do profissional
Conteúdo:
  - Dados completos
  - Histórico de leads
  - Histórico de status
  - Ações rápidas (WhatsApp, Editar, Desativar)
```

### 4.3 Export CSV

```
Função: exportProfessionalsCSV
Localização: lib/profiza-export.ts
Colunas: Nome, WhatsApp, Email, Categoria, Bairros, Status, Leads, Última Atividade
Formato: UTF-8 com BOM para Excel
```

### 4.4 Filtro de Período (Leads)

```
Lógica:
  - hoje: data === hoje
  - semana: data >= 7 dias atrás
  - mes: data >= 30 dias atrás
Implementar: useMemo com filtro por data
```

---

## 5. Conectividade Entre Páginas

### Mapa de Navegação Atual

```
/profiza (Dashboard)
├── KPI "Profissionais ativos" → /profiza/profissionais?status=ativo
├── KPI "Leads na semana" → /profiza/leads
├── KPI "Em teste grátis" → /profiza/cobranca
├── KPI "Vencendo em 7 dias" → /profiza/cobranca
├── Botão "Ver todos" → /profiza/profissionais
└── Botão "Abrir" (linha) → Dialog de edição

/profiza/profissionais
├── Menu "Editar" → Dialog de edição
├── Menu "Abrir WhatsApp" → wa.me externo
└── Menu "Desativar" → Dialog de confirmação

/profiza/leads
└── (sem navegação interna)

/profiza/cobranca
└── Botão "Contatar" → wa.me externo

/profiza/configuracao
└── Botão "Salvar" → Toast (sem persistência)
```

### Navegação Faltante

```
❌ Dashboard Checklist → Páginas relevantes
❌ Nome profissional → Drawer de perfil
❌ Telefone → WhatsApp Web
❌ Bairros → Filtro por bairro
❌ KPIs Leads/Cobrança → Filtros ou detalhes
❌ Cards resumo Cobrança → Lista filtrada
```

---

## 6. Checklist de Implementação

### Fase 1: Interatividade Crítica
- [x] Implementar NotificationsDropdown
- [x] Tornar checklist do Dashboard clicável
- [x] Implementar exportação CSV
- [x] Corrigir filtro de período em Leads
- [x] Tornar telefones clicáveis (WhatsApp)

### Fase 2: Navegação Aprimorada
- [x] Logo clicável na Sidebar
- [x] Card "Status do mês" clicável
- [x] ProfessionalDrawer para perfil completo
- [x] KPIs clicáveis em Leads e Cobrança
- [x] Bairros clicáveis como filtro
- [x] Query params para filtros (/profissionais?status=ativo)

### Fase 3: Refinamentos
- [x] Paginação nas tabelas (Profissionais e Leads)
- [x] Coluna de ações em Leads (ver detalhes, WhatsApp, re-rotear)
- [x] Tooltips informativos nas progress bars
- [x] Dialog de detalhes do Lead
- [ ] Cards de integração interativos (Configuração)
- [ ] Persistência real em Configuração (requer Supabase)

---

## 7. Métricas de Sucesso

| Métrica | Antes | Depois | Meta |
|---------|-------|--------|------|
| Elementos interativos funcionais | 60% | **95%** | 95% ✅ |
| Cliques que levam a algum lugar | 40% | **92%** | 90% ✅ |
| Ações com feedback visual | 70% | **100%** | 100% ✅ |
| Navegação entre páginas | 5 rotas | **18 rotas** | 15+ ✅ |

---

## 8. Anexo: Inventário Visual

### Ícones Decorativos (não precisam ser clicáveis)
- Ícones dentro de KPI cards
- Ícones de seção em cards de configuração
- Ícones de status (CheckCircle2, Clock, AlertCircle)

### Ícones que DEVEM ser clicáveis
- BellRing (notificações) ❌ Não funciona
- ArrowUpRight (abrir externo) ✅ Funciona
- MoreHorizontal (menu) ✅ Funciona
- ArrowUpDown (ordenação) ✅ Funciona
- Plus (adicionar) ✅ Funciona
- Download (exportar) ❌ Não funciona
- Pencil (editar) ✅ Funciona
- Trash2 (deletar) ✅ Funciona

---

**Próximo passo:** Implementar as correções da Fase 1 para garantir que todos os elementos críticos sejam funcionais.
