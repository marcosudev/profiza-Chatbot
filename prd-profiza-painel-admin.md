# PRD — Profiza: Painel Administrativo e Motor de Roteamento de Leads via WhatsApp

| Campo | Valor |
|---|---|
| **Versão** | 1.1 |
| **Data** | 21 de agosto de 2026 |
| **Status** | Rascunho para validação com stakeholders |
| **Produto** | Painel administrativo + camada de dados que sustenta o bot de roteamento de leads via WhatsApp |

**Changelog:** v1.1 — renomeação do produto para Profiza; seção 11 (Design System) expandida com tipografia (Manrope + Bricolage Grotesque), paleta de cores completa e mapeamento para tokens shadcn/ui.

---

## Premissas assumidas

O briefing original trouxe majoritariamente requisitos técnicos (modelagem de dados, requisitos funcionais, design system). Para transformar isso em um PRD completo, assumi as premissas de negócio abaixo. Elas devem ser validadas antes do início do desenvolvimento — estão sinalizadas ao longo do documento sempre que impactam uma decisão de escopo ou arquitetura.

1. **Nome do produto:** Profiza (definido).
2. **O que o produto faz:** é um diretório inteligente de prestadores de serviço de Bauru/SP. Um cliente final manda mensagem no WhatsApp, uma IA extrai a intenção (categoria de serviço + bairro), e o lead é roteado automaticamente para o profissional cadastrado mais aderente.
3. **Escopo deste PRD:** cobre o **painel administrativo** (back-office) e a **camada de dados** (Supabase) que sustentam a operação — não o fluxo conversacional do bot em si, tratado aqui como um serviço externo (Node.js) que consome a mesma base via Service Key.
4. **Modelo de negócio:** assinatura mensal paga pelo profissional cadastrado, com período de teste grátis inicial.
5. **Cobrança no MVP:** manual (Pix/transferência), com o administrador atualizando `status_pagamento` no painel. Integração com gateway de pagamento fica para uma fase futura.
6. **Escala inicial:** uma cidade (Bauru), operação enxuta, 1 a 3 administradores usando o painel.

---

## Sumário

1. [Sumário Executivo](#1-sumário-executivo)
2. [Contexto e Problema de Negócio](#2-contexto-e-problema-de-negócio)
3. [Objetivos e Métricas de Sucesso](#3-objetivos-e-métricas-de-sucesso)
4. [Personas](#4-personas)
5. [Escopo do Produto](#5-escopo-do-produto)
6. [Arquitetura da Solução](#6-arquitetura-da-solução)
7. [Modelagem de Dados](#7-modelagem-de-dados)
8. [Segurança e Row Level Security](#8-segurança-e-row-level-security-rls)
9. [Requisitos Funcionais](#9-requisitos-funcionais)
10. [Requisitos Não Funcionais](#10-requisitos-não-funcionais)
11. [Design System (shadcn/ui)](#11-design-system-e-componentização-shadcnui)
12. [Fluxos de Usuário](#12-fluxos-de-usuário-principais)
13. [Stack Tecnológica](#13-stack-tecnológica)
14. [Roadmap de Entregas](#14-roadmap-de-entregas)
15. [Riscos e Mitigações](#15-riscos-e-mitigações)
16. [Métricas Pós-Lançamento](#16-métricas-de-acompanhamento-pós-lançamento)
17. [Critérios de Aceite / DoD](#17-critérios-de-aceite--definition-of-done)
18. [Glossário](#18-glossário)
19. [Anexo A — Script SQL Completo](#19-anexo-a--script-sql-completo)

---

## 1. Sumário Executivo

O Profiza conecta clientes que buscam serviços locais (eletricista, encanador, diarista, etc.) a profissionais cadastrados na plataforma, usando o WhatsApp como canal — o app que o brasileiro já usa por padrão. Uma IA interpreta a mensagem do cliente, extrai categoria de serviço e bairro desejado, e roteia o contato automaticamente para o profissional mais adequado dentro da base cadastrada.

Este documento especifica o **painel administrativo**: a ferramenta interna que sustenta toda a operação comercial. É nele que a equipe cadastra profissionais, mantém a base limpa o suficiente para a IA rotear corretamente, acompanha quantos leads cada profissional recebeu (a prova concreta de valor na hora de cobrar a mensalidade) e gerencia o ciclo de vida da assinatura — do teste grátis à inadimplência. Sem esse painel, a operação não escala além de planilhas manuais, e o negócio não tem como justificar cobrança de forma objetiva.

## 2. Contexto e Problema de Negócio

### 2.1 O problema do profissional autônomo

A maioria dos prestadores de serviço em Bauru é autônoma ou tem microempresa, sem orçamento nem tempo para marketing digital. Dependem majoritariamente de indicação boca a boca, o que limita o volume e a previsibilidade de novos clientes. Estar visível para quem busca ativamente por um serviço próximo é uma dor recorrente e mal resolvida por esse público.

### 2.2 O problema do cliente final

Quando alguém precisa de um serviço com urgência (um vazamento, um problema elétrico), a alternativa mais comum hoje é perguntar em grupos de bairro no WhatsApp ou pesquisar no Google — processos lentos, sem garantia de resposta rápida e sem filtro de confiabilidade ou proximidade.

### 2.3 A oportunidade

Um bot que recebe a mensagem do cliente diretamente no WhatsApp, entende a necessidade via IA e responde com o contato do profissional certo elimina a fricção dos dois lados: o cliente resolve em minutos, o profissional recebe um lead qualificado sem esforço de prospecção.

### 2.4 Modelo de negócio

A monetização é uma assinatura mensal cobrada do profissional cadastrado, com um período de teste grátis para reduzir a barreira de entrada. A cobrança recorrente só é sustentável se for possível **provar valor de forma objetiva** — daí a importância central da tabela `metricas_bot`: ela é o argumento comercial na hora de renovar ou converter um teste grátis em plano pago.

## 3. Objetivos e Métricas de Sucesso

| Objetivo de negócio | Métrica | Meta inicial (90 dias) |
|---|---|---|
| Validar a proposta de valor para profissionais | Taxa de conversão teste grátis → pago | ≥ 30% |
| Manter a base de dados operante e limpa | % de cadastros sem erro de categoria/bairro | ≥ 95% |
| Reduzir esforço operacional do administrador | Tempo médio para cadastrar um profissional | ≤ 2 minutos |
| Provar valor do serviço na cobrança | Leads roteados por profissional ativo / semana | Rastreável para 100% da base ativa |
| Reter assinantes | Churn mensal | ≤ 10% |

**North Star Metric:** volume de leads roteados por profissional ativo por semana — é o número que justifica a régua de cobrança e o que melhor representa o valor entregue à ponta paga do negócio (o profissional).

## 4. Personas

| Persona | Quem é | O que precisa do painel |
|---|---|---|
| **Administrador Operacional** (usuário primário deste PRD) | Dono ou operador comercial do negócio, provavelmente 1–3 pessoas | Cadastrar/editar profissionais rapidamente, localizar inadimplentes, mostrar dados de leads para justificar cobrança |
| **Profissional Cadastrado** (usuário indireto) | Prestador de serviço local (eletricista, diarista etc.) | Recebe leads pelo WhatsApp; não acessa o painel diretamente nesta fase |
| **Cliente Final** (usuário indireto) | Morador de Bauru buscando um serviço | Interage apenas com o bot via WhatsApp; nunca toca o painel |

> O painel administrativo é, na prática, uma ferramenta de uso interno e restrito — velocidade de operação para o administrador é o critério de design mais importante (ver seção 11).

## 5. Escopo do Produto

### 5.1 Dentro do escopo (MVP)

- Autenticação de administrador via Supabase Auth.
- CRUD completo de profissionais, com validação de formulário.
- Data table com paginação server-side, busca e filtros.
- Painel de conversão com métricas agregadas.
- Modelagem de dados e RLS no Supabase.

### 5.2 Fora do escopo (fases futuras)

- Motor conversacional do bot e extração de intenção por IA (tratado como serviço externo consumidor da mesma base).
- Gateway de pagamento automatizado (Pix/Stripe/assinatura recorrente).
- App ou portal de autoatendimento para o profissional.
- Expansão multi-cidade (o modelo atual assume Bauru como único mercado; ver nota na seção 7.5).
- Notificações automáticas de vencimento de teste grátis (recomendado como quick win de fase 2 — seção 14).

## 6. Arquitetura da Solução

A solução é composta por três camadas independentes, todas girando em torno do Supabase como fonte única de verdade:

```
[Cliente Final]
      │  mensagem no WhatsApp
      ▼
[WhatsApp Business API]
      │
      ▼
[Serviço Node.js do Bot] ── extrai intenção via IA (categoria + bairro)
      │                     │
      │                     ▼
      │              consulta `profissionais` (Service Role Key, bypassa RLS)
      │                     │
      │◄────────────────────┘  retorna profissional mais aderente
      │
      ▼
   registra evento em `leads_eventos` / atualiza `metricas_bot`
      │
      ▼
[Supabase PostgreSQL + RLS]
      ▲
      │  autenticado via Supabase Auth (token de admin)
      │
[Painel Admin — Next.js + shadcn/ui]
      ▲
      │
[Administrador]
```

**Pontos-chave:**
- O **frontend** (painel admin) nunca acessa o banco com privilégios elevados — usa sempre um token de usuário autenticado, sujeito a RLS.
- O **serviço Node.js do bot** roda em ambiente de servidor e usa a **Service Key**, que ignora RLS por padrão — por isso precisa ser tratada como segredo de infraestrutura (variável de ambiente, nunca exposta ao cliente).
- O Supabase é o único ponto de integração entre bot e painel: nenhuma comunicação direta entre os dois serviços é necessária.

## 7. Modelagem de Dados

A modelagem segue o princípio de ser enxuta e fortemente tipada, priorizando queries rápidas após a extração de intenção — o gargalo de performance mais sensível do sistema, já que o bot precisa responder ao cliente em segundos.

### 7.1 Tabela `profissionais`

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `uuid` | Sim (PK, `default gen_random_uuid()`) | Identificador único |
| `nome` | `varchar(120)` | Sim | Nome do profissional |
| `whatsapp` | `varchar(20)` | Sim (único) | Número no formato E.164 (ex.: `+5514999999999`) |
| `categoria` | `varchar(60)` | Sim (indexado) | Categoria de serviço |
| `bairro_atuacao` | `text[]` | Sim (GIN, indexado) | Bairros onde o profissional atende |
| `status_pagamento` | `enum` (`ativo`, `inativo`, `teste_gratis`) | Sim | Situação de cobrança |
| `email` | `varchar(160)` | Não | Contato secundário (recomendado, fora do escopo original) |
| `observacoes` | `text` | Não | Notas internas do administrador (recomendado) |
| `teste_gratis_expira_em` | `timestamptz` | Não | Data-limite do teste grátis (recomendado — ver 7.3) |
| `ativo_desde` | `timestamptz` | Não | Data de início do plano pago (recomendado) |
| `created_at` / `updated_at` | `timestamptz` | Sim | Auditoria básica |

> **Nota de design — categoria como vocabulário controlado.** Um campo `varchar` livre é frágil: "Eletricista", "eletricista" e "Eletricistas" viram três categorias diferentes para os filtros e para a IA. Recomendo manter o tipo `varchar` no banco (simples, sem custo de join), mas restringir a entrada a uma lista fixa de categorias no formulário (enum no Zod) e, opcionalmente, um `check constraint` no banco como segunda camada de proteção contra dados sujos.

> **Nota de design — `whatsapp` normalizado.** Para casar com o formato exigido pela WhatsApp Business API e evitar duplicidade (`(14) 99999-9999` vs `+5514999999999` sendo tratados como registros diferentes), o número deve ser normalizado para E.164 **antes** do insert — normalização feita no `transform` do schema Zod, não confiada à digitação do usuário.

### 7.2 Tabela `metricas_bot`

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `uuid` | Sim (PK) | Identificador único |
| `profissional_id` | `uuid` | Sim (FK → `profissionais.id`, único) | Relação 1:1 com o profissional |
| `leads_enviados` | `int` | Sim (`default 0`) | Contador acumulado (lifetime) de leads roteados |
| `data_ultimo_lead` | `timestamptz` | Não | Timestamp do último lead roteado |
| `created_at` / `updated_at` | `timestamptz` | Sim | Auditoria básica |

### 7.3 Lacuna identificada: métricas por janela de tempo

O requisito de **Painel de Conversão** pede "leads roteados na semana atual" (seção 9, RF-04), mas `metricas_bot` como especificado guarda apenas um contador acumulado. Um contador cumulativo não permite calcular volume por semana sem um evento com carimbo de data por lead.

**Recomendação:** adicionar uma tabela de log de eventos, mantendo `metricas_bot` como uma tabela de *cache agregado* (leitura rápida para os cards do dashboard), atualizada automaticamente via trigger a cada novo evento:

```sql
create table public.leads_eventos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  origem varchar(30) not null default 'whatsapp',
  created_at timestamptz not null default now()
);
```

Isso resolve o card de leads da semana atual (`count(*) where created_at >= date_trunc('week', now())`) sem sacrificar a velocidade de leitura do dashboard, que continua batendo direto em `metricas_bot`. O script completo com o trigger de sincronização está no [Anexo A](#19-anexo-a--script-sql-completo).

### 7.4 Índices

| Índice | Tipo | Motivo |
|---|---|---|
| `profissionais.categoria` | btree | Filtro mais comum da data table |
| `profissionais.bairro_atuacao` | GIN | Necessário para busca em array (`@>`, `&&`) |
| `profissionais.status_pagamento` | btree | Filtro "prestadores inativos" (RF-03) |
| `profissionais.whatsapp` | único (implícito) | Evita duplicidade de cadastro |
| `leads_eventos (profissional_id, created_at)` | btree composto | Consultas de janela de tempo por profissional |

Um índice composto `(categoria, status_pagamento)` é uma otimização válida, mas prematura para o volume esperado no MVP (uma cidade, algumas centenas de registros) — vale reavaliar se a base crescer para múltiplas cidades.

### 7.5 Nota sobre expansão futura

Se o modelo expandir para outras cidades, `profissionais` precisará de uma coluna `cidade` (indexada junto com `categoria` e `bairro_atuacao`). Não incluída no MVP porque o escopo atual é Bauru, mas vale desenhar o schema já prevendo essa coluna para evitar uma migração dolorosa depois.

## 8. Segurança e Row Level Security (RLS)

O princípio é simples: **o banco fica bloqueado por padrão para qualquer acesso público**, e só é acessível por dois caminhos:

1. **Frontend (painel admin):** usuário autenticado via Supabase Auth, sujeito a RLS.
2. **Servidor Node.js (bot):** Service Role Key, que ignora RLS — uso restrito a ambiente de servidor, nunca exposta ao cliente.

```sql
alter table public.profissionais enable row level security;
alter table public.metricas_bot enable row level security;
alter table public.leads_eventos enable row level security;

-- Sem nenhuma policy para o papel `anon`, o acesso público fica
-- automaticamente bloqueado — esse é o comportamento padrão do Postgres/RLS.

create policy "admin_full_access_profissionais"
  on public.profissionais
  for all
  to authenticated
  using (true)
  with check (true);
```

> **Ponto de atenção:** a policy acima libera acesso total para **qualquer** usuário autenticado. Isso é adequado enquanto só existem contas de administrador no sistema. Se, no futuro, outros tipos de usuário autenticado forem criados (ex.: o próprio profissional logando para ver os próprios leads), a policy precisa evoluir para checar uma claim de admin (`auth.jwt() ->> 'role' = 'admin'`) em vez de liberar geral para `authenticated`.

O conjunto completo de policies está no [Anexo A](#19-anexo-a--script-sql-completo).

## 9. Requisitos Funcionais

### RF-01 — Autenticação de Administrador

**Como** administrador, **quero** fazer login com e-mail e senha, **para** acessar o painel com segurança e manter a sessão ativa entre visitas.

- Login via Supabase Auth (e-mail/senha).
- Sessão persistente (não exigir novo login a cada acesso).
- Fluxo de recuperação de senha.
- Redirecionamento automático para `/login` em caso de sessão expirada ou token inválido.
- Rate limiting básico contra tentativas de força bruta (nativo do Supabase Auth).

### RF-02 — Gestão de Cadastros (CRUD)

**Como** administrador, **quero** cadastrar, editar e desativar profissionais com validação em tempo real, **para** manter a base limpa o suficiente para a IA rotear leads corretamente.

- Formulário com **React Hook Form** + validação **Zod**, cobrindo:
  - `nome`: obrigatório, mínimo 3 caracteres.
  - `whatsapp`: obrigatório, validado por regex de telefone BR e normalizado para E.164 no `transform`.
  - `categoria`: obrigatório, selecionado de lista fixa (não texto livre).
  - `bairro_atuacao`: obrigatório, multi-seleção (mínimo 1 bairro).
  - `status_pagamento`: obrigatório, padrão `teste_gratis` no cadastro novo.
- Erros de validação exibidos inline, por campo, sem submissão até resolução.
- Edição feita em **Dialog** (modal), sem sair da listagem — preserva o contexto de filtros/paginação já aplicados.
- Feedback de sucesso/erro via **Toast** assíncrono, sem bloquear a interface.
- Exclusão sempre com confirmação (evitar exclusão acidental); recomenda-se soft delete (`status_pagamento = inativo`) em vez de exclusão física, preservando o histórico em `metricas_bot`.

### RF-03 — Data Table Avançada

**Como** administrador, **quero** listar, buscar e filtrar profissionais rapidamente, **para** localizar um cadastro específico ou os inadimplentes sem precisar rolar manualmente uma lista longa.

- Paginação **server-side** (não carregar toda a base no cliente).
- Busca instantânea com **debounce** (~300ms) por nome, categoria ou bairro.
- Filtros rápidos por `status_pagamento` (com destaque para "inativo").
- Ordenação por coluna (nome, categoria, status, data de cadastro).
- Colunas visíveis: nome, whatsapp, categoria, bairros, status (como Badge), leads da semana.

### RF-04 — Painel de Conversão

**Como** administrador, **quero** ver métricas agregadas ao entrar no sistema, **para** avaliar a saúde da base e ter argumento de vendas na hora de cobrar a mensalidade.

Cards mínimos do dashboard:

| Card | Cálculo |
|---|---|
| Profissionais ativos | `count(*) where status_pagamento = 'ativo'` |
| Leads roteados na semana atual | `count(*)` em `leads_eventos` na semana corrente (ver seção 7.3) |
| Em teste grátis | `count(*) where status_pagamento = 'teste_gratis'` |
| Testes vencendo em 7 dias | `count(*) where teste_gratis_expira_em <= now() + interval '7 days'` |

O último card é o gatilho operacional mais importante do painel: é a lista que o administrador usa todo dia para saber quem contatar antes que o teste grátis expire.

### RF-05 — Gestão de Status de Pagamento

**Como** administrador, **quero** alterar o status de um profissional diretamente na listagem, **para** refletir uma cobrança paga ou uma inadimplência sem precisar abrir o formulário completo de edição.

- Alteração de status via ação rápida na linha da tabela (dropdown ou toggle), não apenas dentro do modal de edição completo.
- Toast de confirmação a cada alteração.

### RF-06 — Exportação de Dados *(nice-to-have, fase 2)*

Exportar a listagem filtrada (CSV) para uso em cobrança externa ou análise ad-hoc.

## 10. Requisitos Não Funcionais

| Categoria | Requisito | Métrica alvo |
|---|---|---|
| **Performance** | Consultas da data table devem responder rápido mesmo com filtros combinados | p95 < 300ms |
| **Segurança** | Nenhuma chave privilegiada exposta no bundle do frontend | 0 ocorrências (verificação em CI) |
| **Segurança** | RLS habilitado em 100% das tabelas com dado de negócio | 100% cobertura |
| **Privacidade (LGPD)** | Números de WhatsApp são dado pessoal; tratamento deve seguir a LGPD (finalidade declarada, acesso restrito, direito de exclusão a pedido) | Política de retenção documentada |
| **Disponibilidade** | Painel disponível durante horário comercial, tolerando indisponibilidade pontual do Supabase | Uptime alvo 99,5% |
| **Usabilidade** | Cadastro completo de um profissional em poucos cliques | ≤ 2 minutos por cadastro |
| **Auditoria** | Alterações de `status_pagamento` devem ser rastreáveis | `updated_at` obrigatório em toda tabela mutável |
| **Responsividade** | Painel é ferramenta interna, desktop-first, mas funcional em tablet | Layout quebra graciosamente a partir de 768px |

## 11. Design System e Componentização (shadcn/ui)

O direcionamento visual da Profiza é orgânico-corporativo: paleta em tons de verde com um accent lima vibrante, par tipográfico Manrope + Bricolage Grotesque, e **bordas com radius leve** (`--radius: 0.375rem`). Cor é usada com intenção — marca, estados (Badges) e hierarquia — não como decoração.

### 11.1 Tipografia

| Uso | Família | Pesos | Observação |
|---|---|---|---|
| Corpo / UI geral | Manrope | 400, 500, 600, 700, 800 | Labels, tabela, botões, corpo de texto — fonte variável, leve em telas densas como a Data Table |
| Títulos / Display | Bricolage Grotesque | 500–800 (óptico 10–48, largura 75–100) | Headings (h1–h3), números de KPI do dashboard e logotipo — fonte variável com eixo óptico (`opsz`); ajustar conforme o tamanho real do texto |

Ambas via Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@10..48,500..800&display=swap"
  rel="stylesheet">
```

```js
// tailwind.config.js
fontFamily: {
  sans: ['Manrope', 'sans-serif'],                 // corpo / UI
  display: ['Bricolage Grotesque', 'sans-serif'],  // títulos
}
```

> **Regra prática:** `font-display` só em headings e métricas de destaque (o número grande nos cards do dashboard, por exemplo). Todo o resto — inputs, tabela, botões, badges — usa `font-sans` (Manrope). Misturar as duas fora desse padrão quebra a hierarquia visual pretendida.

### 11.2 Paleta de Cores

**Verde (cor principal)**

| Token | Hex | Uso |
|---|---|---|
| Verde escuro profundo | `#18372f` | Títulos, textos principais |
| Verde escuro médio | `#1d4037` | Botões primários, headers |
| Verde floresta | `#183d33` | Seção profissionais, `btn-dark` |
| Verde médio | `#315b48` | Links hover, destaques |
| Verde folha | `#4f7d1e` | Ícones, badges |
| Verde lima | `#65a30d` | Accents, barras de progresso |
| Verde claro | `#82aa2e` | Nav underline |

**Amarelo-Lima (accent)**

| Token | Hex | Uso |
|---|---|---|
| Lima vibrante | `#d8f34f` | Accent admin, logo (letra) |
| Lima suave | `#c9eb3c` | CTA section, seleção de texto |
| Lima pastel | `#edf4dc` | Backgrounds de ícones |
| Lima muito claro | `#f0f4eb` | Backgrounds sutis |

**Neutros**

| Token | Hex | Uso |
|---|---|---|
| Fundo geral | `#f8f9f6` | Background do site |
| Fundo painel | `#f4f6f2` | Background do painel |
| Texto secundário | `#607068` | Subtítulos, descrições |
| Texto terciário | `#9baa9e` | Placeholders, labels |
| Texto muted | `#c0ccc4` | Timestamps, info extra |

**Admin (sidebar escura)**

| Token | Hex | Uso |
|---|---|---|
| Sidebar bg | `#0a1510` | Fundo da sidebar admin |
| Sidebar hover | `#0f1f18` | Item ativo/hover |

> **Nota de design:** a sidebar do admin é um tema escuro **fixo**, independente de um eventual modo claro/escuro do restante do produto. Tratar como um terceiro conjunto de tokens (`--sidebar-*`), não como o "dark mode" padrão do shadcn — evita acoplar a paleta da sidebar a uma futura implementação de dark mode geral do painel.

### 11.3 Mapeamento para tokens shadcn/ui

```css
:root {
  --radius: 0.375rem;

  /* Superfícies */
  --background: #f8f9f6;        /* Fundo geral do site */
  --foreground: #18372f;        /* Verde escuro profundo */

  --card: #ffffff;
  --card-foreground: #18372f;

  --popover: #ffffff;
  --popover-foreground: #18372f;

  /* Marca */
  --primary: #1d4037;           /* Verde escuro médio */
  --primary-foreground: #f8f9f6;

  --secondary: #edf4dc;         /* Lima pastel */
  --secondary-foreground: #18372f;

  --accent: #d8f34f;            /* Lima vibrante */
  --accent-foreground: #18372f;

  --muted: #f4f6f2;             /* Fundo do painel */
  --muted-foreground: #607068;  /* Texto secundário */

  --border: #c0ccc4;
  --input: #c0ccc4;
  --ring: #65a30d;              /* Verde lima */

  /* Semântico — ver nota sobre gap de cor destrutiva abaixo */
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
}

/* Sidebar do admin — tema fixo escuro (não é "dark mode") */
:root {
  --sidebar-background: #0a1510;
  --sidebar-foreground: #f8f9f6;
  --sidebar-primary: #d8f34f;          /* item ativo / logo */
  --sidebar-primary-foreground: #0a1510;
  --sidebar-accent: #0f1f18;           /* hover */
  --sidebar-accent-foreground: #f8f9f6;
  --sidebar-border: #1d4037;
  --sidebar-ring: #65a30d;
}
```

> **Gap identificado — falta uma cor semântica de erro/negativo na paleta enviada.** Todos os tons fornecidos são verdes, limas ou neutros; não há vermelho, nem qualquer cor associada a "erro" por convenção. Isso afeta três pontos concretos do painel: o Badge de `inativo`, os Toasts de erro e os estados de validação de formulário. Reaproveitar tons de verde para sinalizar erro contraria a expectativa do usuário — verde como "positivo" é uma convenção forte demais para quebrar. Duas saídas:
> - **Recomendada:** introduzir uma cor `--destructive` fora da paleta de marca (ex.: `#dc2626`), usada só para estados negativos — mantém a identidade visual intacta no resto da UI.
> - **Alternativa:** usar tons neutros (`#c0ccc4` de fundo + `#607068` no texto) no Badge de `inativo`, tratando-o como "desligado" em vez de "erro" — resolve o badge, mas não os Toasts de erro/validação, que continuam sem cor adequada.
>
> Este documento assume a opção recomendada nas seções seguintes; validar com quem definiu a paleta antes da implementação.

### 11.4 Componentização

| Tela / Elemento | Componentes shadcn/ui |
|---|---|
| Listagem principal | `DataTable`, `Input` (busca com debounce), `Select` (filtros), `Badge` |
| Cadastro/edição | `Dialog`, `Form` (integrado a React Hook Form + Zod), `Input`, `Select`, `MultiSelect` (bairros) |
| Feedback assíncrono | `Toast` (sucesso, erro, confirmação de ação) |
| Dashboard | `Card` para os KPIs (número em `font-display`), `Skeleton` durante carregamento |
| Navegação admin | `Sidebar` em tema escuro fixo (tokens `--sidebar-*`), underline em Verde claro `#82aa2e` no item ativo |
| Status do plano | `Badge` dinâmico — mapeamento de cor abaixo |

**Mapeamento de Badge por status:**

| `status_pagamento` | Fundo | Texto | Racional |
|---|---|---|---|
| `ativo` | Verde lima `#65a30d` | `#f8f9f6` | Cor de marca — reforça "positivo" sem depender de um verde genérico |
| `teste_gratis` | Lima suave `#c9eb3c` | Verde escuro profundo `#18372f` | Usa o accent da marca para sinalizar "atenção/pendente" |
| `inativo` | `--destructive` `#dc2626` | `#ffffff` | Ver gap de cor semântica em 11.3 |

### 11.5 Estados vazios e de carregamento

Estados vazios (nenhum profissional cadastrado, busca sem resultado) e estados de carregamento (`Skeleton`) devem ser tratados explicitamente — usando Lima pastel (`#edf4dc`) e Lima muito claro (`#f0f4eb`) como background de ícones/ilustrações de estado vazio. Nunca deixar a tela "em branco" sem explicação.

## 12. Fluxos de Usuário Principais

**Login do administrador**
1. Acessa `/login` → informa e-mail/senha → Supabase Auth valida → sessão persistida → redireciona ao dashboard.

**Cadastro de novo profissional**
1. Clica em "Novo profissional" → `Dialog` abre com formulário vazio → preenche campos → validação Zod em tempo real → submissão → `status_pagamento` padrão `teste_gratis` e `teste_gratis_expira_em` calculado automaticamente (ex.: `now() + 30 dias`) → Toast de sucesso → tabela atualizada sem reload.

**Conversão de teste grátis para pago**
1. Card "Testes vencendo em 7 dias" no dashboard sinaliza o profissional → administrador contata via WhatsApp → recebe pagamento → altera `status_pagamento` para `ativo` diretamente na linha da tabela (RF-05) → `ativo_desde` preenchido → Toast de confirmação.

**Identificação e desativação de inadimplente**
1. Administrador filtra a data table por `status_pagamento = ativo`, ordenado por `data_ultimo_lead` → cruza com pagamento não recebido → altera status para `inativo` → profissional para de receber leads (o bot passa a ignorá-lo nas consultas, já que a query de roteamento filtra por `status_pagamento = ativo`).

## 13. Stack Tecnológica

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | SSR/SSG, ecossistema maduro, boa integração com Supabase |
| UI | shadcn/ui + Tailwind CSS | Componentes acessíveis, altamente customizáveis, sem overhead de biblioteca fechada |
| Formulários | React Hook Form + Zod | Validação declarativa, tipada, com baixo custo de re-render |
| Banco/Auth | Supabase (PostgreSQL + Auth + RLS) | Postgres gerenciado com auth e segurança em nível de linha nativos |
| Backend do bot | Node.js (serviço externo) | Consome Supabase via Service Key, integra WhatsApp Business API e IA de extração de intenção |
| Hospedagem frontend | Vercel (sugestão) | Integração nativa com Next.js |

## 14. Roadmap de Entregas

| Fase | Entregas | Critério de saída |
|---|---|---|
| **Fase 0 — Fundação** | Schema Supabase, RLS, autenticação | Tabelas criadas, policies testadas, login funcional |
| **Fase 1 — MVP** | CRUD de profissionais + Data Table completa | Administrador consegue operar 100% da base sem SQL manual |
| **Fase 2 — Conversão** | Painel de conversão (dashboard), gestão rápida de status | Cards refletindo dados reais; fluxo de identificação de vencimento em uso |
| **Fase 3 — Refinamento** | Exportação CSV, notificação automática de vencimento de teste, auditoria de alterações | Reduz esforço manual do administrador no dia a dia |
| **Fase 4 — Futuro** | Gateway de pagamento automatizado, expansão multi-cidade | Fora do escopo deste PRD |

## 15. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Dados sujos (categoria/bairro inconsistentes) quebram a precisão do roteamento por IA | Alto | Vocabulário controlado no formulário (Zod enum) + validação em duas camadas |
| Service Key do bot vazar (exposta por engano no frontend) | Crítico | Nunca importar a Service Key em código client-side; checagem em CI/lint |
| `metricas_bot` como contador único não sustenta métricas por período | Médio | Tabela `leads_eventos` + trigger de sincronização (seção 7.3) |
| Administrador esquece de desativar inadimplente, bot continua roteando leads de graça | Médio | Card de "testes vencendo" + filtro rápido de ativos sem pagamento recente |
| Crescimento para múltiplas cidades exige migração de schema | Baixo (não é MVP) | Prever coluna `cidade` no design, mesmo que não implementada agora |

## 16. Métricas de Acompanhamento Pós-Lançamento

- Taxa de conversão teste grátis → pago (semanal).
- Tempo médio de cadastro de um novo profissional (indicador de usabilidade do formulário).
- Volume de leads roteados por profissional ativo (indicador central de valor entregue).
- Taxa de erro de validação no formulário (indicador de qualidade de UX do cadastro).

## 17. Critérios de Aceite / Definition of Done

- [ ] RLS habilitado e testado em todas as tabelas com dado sensível.
- [ ] Nenhuma chave de serviço (Service Key) presente no bundle do frontend.
- [ ] CRUD completo de profissionais funcional, com validação Zod cobrindo todos os campos obrigatórios.
- [ ] Data table com paginação server-side validada com volume simulado (ex.: 1.000+ registros).
- [ ] Dashboard exibindo os quatro cards mínimos com dados reais do banco.
- [ ] Badges de status refletindo corretamente os três estados possíveis.
- [ ] Fluxo de login, logout e recuperação de senha testado ponta a ponta.

## 18. Glossário

| Termo | Definição |
|---|---|
| **RLS** | Row Level Security — controle de acesso a nível de linha no PostgreSQL |
| **Service Key** | Chave do Supabase com privilégios elevados, usada apenas em ambiente de servidor |
| **Lead** | Contato de um cliente final roteado a um profissional pelo bot |
| **E.164** | Padrão internacional de formatação de número de telefone (ex.: `+5514999999999`) |
| **Debounce** | Técnica que atrasa a execução de uma busca até o usuário parar de digitar |

---

## 19. Anexo A — Script SQL Completo

```sql
-- Extensão necessária para gen_random_uuid()
create extension if not exists "pgcrypto";

-- Enum de status de pagamento
create type status_pagamento_enum as enum ('ativo', 'inativo', 'teste_gratis');

-- Tabela principal de profissionais
create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome varchar(120) not null,
  whatsapp varchar(20) not null unique,
  categoria varchar(60) not null,
  bairro_atuacao text[] not null default '{}',
  status_pagamento status_pagamento_enum not null default 'teste_gratis',
  email varchar(160),
  observacoes text,
  teste_gratis_expira_em timestamptz,
  ativo_desde timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profissionais_categoria on public.profissionais (categoria);
create index idx_profissionais_bairro_atuacao on public.profissionais using gin (bairro_atuacao);
create index idx_profissionais_status on public.profissionais (status_pagamento);

-- Tabela de agregado rápido (cache de métricas)
create table public.metricas_bot (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null unique references public.profissionais(id) on delete cascade,
  leads_enviados int not null default 0,
  data_ultimo_lead timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Log de eventos (permite métricas por janela de tempo, ex.: "semana atual")
create table public.leads_eventos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  origem varchar(30) not null default 'whatsapp',
  created_at timestamptz not null default now()
);

create index idx_leads_eventos_profissional_data on public.leads_eventos (profissional_id, created_at);

-- Trigger genérico de updated_at
create or replace function public.fn_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profissionais_updated_at
before update on public.profissionais
for each row execute function public.fn_set_updated_at();

create trigger trg_metricas_bot_updated_at
before update on public.metricas_bot
for each row execute function public.fn_set_updated_at();

-- Trigger que sincroniza metricas_bot a cada novo evento de lead
create or replace function public.fn_atualiza_metricas_bot()
returns trigger as $$
begin
  insert into public.metricas_bot (profissional_id, leads_enviados, data_ultimo_lead)
  values (new.profissional_id, 1, new.created_at)
  on conflict (profissional_id)
  do update set
    leads_enviados = public.metricas_bot.leads_enviados + 1,
    data_ultimo_lead = new.created_at,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_leads_eventos_after_insert
after insert on public.leads_eventos
for each row execute function public.fn_atualiza_metricas_bot();

-- Row Level Security
alter table public.profissionais enable row level security;
alter table public.metricas_bot enable row level security;
alter table public.leads_eventos enable row level security;

-- Sem policy para `anon` = acesso público bloqueado por padrão.

create policy "admin_full_access_profissionais"
  on public.profissionais
  for all
  to authenticated
  using (true)
  with check (true);

create policy "admin_full_access_metricas"
  on public.metricas_bot
  for all
  to authenticated
  using (true)
  with check (true);

create policy "admin_full_access_leads_eventos"
  on public.leads_eventos
  for all
  to authenticated
  using (true)
  with check (true);

-- O serviço Node.js do bot usa a Service Role Key, que ignora RLS por
-- padrão — garante que o bot sempre consiga inserir leads e consultar
-- profissionais mesmo sem estar autenticado como admin no painel.
```
