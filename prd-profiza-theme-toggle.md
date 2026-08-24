# PRD — Profiza: Alternância de Tema Light / Dark no Painel Admin

| Campo | Valor |
|---|---|
| **Versão** | 1.0 |
| **Data** | 22 de agosto de 2026 |
| **Status** | Aprovado para implementação |
| **Feature** | Botão de alternância de tema (light mode / dark mode) no painel administrativo |
| **Escopo** | `localhost:4000/profiza` — painel admin Profiza |

---

## 1. Problema

O painel administrativo da Profiza opera em modo escuro fixo (dark mode), sem possibilidade de alternância. Gerentes que trabalham em ambientes com muita luz natural ou que preferem interfaces claras não têm como adaptar a interface à sua condição de uso. A ausência de controle de tema reduz o conforto operacional e a acessibilidade da ferramenta.

## 2. Objetivo

Permitir que o gerente/administrador alterne entre **light mode** e **dark mode** diretamente no painel, com a preferência persistida entre sessões via `localStorage`.

## 3. Solução

Adicionar um botão de toggle (ícone Sun ↔ Moon) no header do painel, ao lado do sino de notificações. O botão usa o `ThemeProvider` já existente no projeto (`next-themes`, `attribute="class"`), que aplica/remove a classe `.dark` no `<html>` — mecanismo já suportado pelo sistema de tokens CSS da Profiza (`globals.css`).

### 3.1 Comportamento

| Estado | Ícone exibido | Ação ao clicar | Resultado |
|---|---|---|---|
| Light mode ativo | `Sun` | Ativa dark mode | Classe `.dark` adicionada ao `<html>` |
| Dark mode ativo | `Moon` | Ativa light mode | Classe `.dark` removida do `<html>` |
| Carregando (SSR) | Nenhum (skeleton) | — | Evita flash de conteúdo incorreto (FOUC) |

### 3.2 Persistência

- A preferência é salva automaticamente em `localStorage` pelo `next-themes` (`key: "theme"`).
- Na próxima visita, o tema é restaurado antes do primeiro render (script inline no `<head>` já presente no `layout.tsx`).
- Valor padrão: `"system"` — respeita a preferência do sistema operacional do usuário.

### 3.3 Posicionamento

```
[Header]
  [Breadcrumb + Título]          [Busca] [🔔] [☀️/🌙] [+ Novo profissional]
```

O toggle fica entre o sino (`BellRing`) e o botão primário "Novo profissional", seguindo a convenção de controles utilitários no canto direito do header.

## 4. Arquitetura técnica

### 4.1 Novo arquivo

**`apps/v4/components/profiza/theme-toggle.tsx`**

- Client Component (`"use client"`)
- Usa `useTheme()` do `next-themes` para ler `resolvedTheme` e chamar `setTheme()`
- Renderiza `null` enquanto `mounted === false` para evitar FOUC/hydration mismatch
- Ícone `Sun` no dark mode (indica ação: "ir para claro"), `Moon` no light mode (indica ação: "ir para escuro") — padrão de UX amplamente adotado

### 4.2 Integração

**`apps/v4/components/profiza/professional-dashboard.tsx`**

- Importar `ThemeToggle` e inserir no header entre `<BellRing>` e `<Dialog>`
- Nenhuma outra alteração necessária — o sistema de tokens CSS já está configurado para responder à classe `.dark`

### 4.3 Dependências

| Dependência | Status | Observação |
|---|---|---|
| `next-themes` | ✅ Já instalada (`0.4.6`) | Nenhuma instalação necessária |
| `ThemeProvider` | ✅ Já configurado no `layout.tsx` | `attribute="class"`, `defaultTheme="system"` |
| Tokens CSS `.dark` | ✅ Já definidos no `globals.css` | Paleta Profiza completa para ambos os modos |
| Ícones `Sun` / `Moon` | ✅ Disponíveis no `lucide-react@0.474.0` | Nenhuma instalação necessária |

## 5. Critérios de aceite

- [ ] Botão visível no header do painel em todas as resoluções ≥ 768px
- [ ] Clique alterna corretamente entre light e dark mode
- [ ] Preferência persiste após reload da página
- [ ] Sem flash de tema incorreto no carregamento (FOUC)
- [ ] Ícone correto exibido para cada estado (Sun no dark, Moon no light)
- [ ] Sidebar permanece sempre escura independentemente do tema selecionado
- [ ] Todos os tokens `--profiza-*` e semânticos respondem corretamente à alternância

## 6. Fora do escopo

- Opção "System" explícita na UI (o padrão já é `system` via `next-themes`)
- Animação de transição entre temas (desabilitada via `disableTransitionOnChange` para evitar flash)
- Tema por usuário salvo no banco de dados (preferência local é suficiente para o MVP)

## 7. Arquivos modificados

| Arquivo | Tipo de mudança |
|---|---|
| `components/profiza/theme-toggle.tsx` | **Criado** — novo componente |
| `components/profiza/professional-dashboard.tsx` | **Editado** — import + inserção no header |
