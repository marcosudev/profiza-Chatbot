# PRD: Design Mobile Responsivo - Profiza Admin Panel

## 📋 Visão Geral

### Objetivo
Transformar o painel administrativo Profiza em uma experiência mobile-first excepcional, garantindo que administradores possam gerenciar profissionais, leads e cobranças de qualquer lugar, com a mesma eficiência do desktop.

### Contexto
Atualmente, o sistema foi desenvolvido com foco em desktop. A visualização mobile (375px - iPhone SE) apresenta problemas críticos de usabilidade:
- Sidebar completamente oculta sem alternativa de navegação
- Header congestionado com elementos sobrepostos
- Tabelas ilegíveis em telas pequenas
- Cards KPI empilhados sem otimização
- Ações importantes difíceis de acessar

### Público-Alvo
- Administradores Profiza em movimento
- Gestores que precisam aprovar/verificar dados rapidamente
- Equipe de suporte respondendo via mobile

---

## 🎯 Objetivos e Métricas

### Objetivos Primários
1. **100% das funcionalidades acessíveis** em dispositivos móveis
2. **Navegação intuitiva** com no máximo 2 toques para qualquer ação principal
3. **Performance otimizada** - First Contentful Paint < 1.5s em 3G
4. **Experiência nativa** - gestos, haptics, pull-to-refresh

### Métricas de Sucesso
| Métrica | Atual | Meta |
|---------|-------|------|
| Mobile Usability Score (Lighthouse) | ~60 | 95+ |
| Tempo médio para completar tarefa | N/A | < 30s |
| Taxa de erro em formulários mobile | N/A | < 5% |
| NPS mobile | N/A | > 70 |

---

## 📱 Breakpoints e Estratégia

### Breakpoints Definidos
```
xs:  0px   - 479px   → Smartphones pequenos (iPhone SE, Galaxy S)
sm:  480px - 639px   → Smartphones grandes (iPhone Pro Max, Galaxy Ultra)
md:  640px - 767px   → Tablets portrait
lg:  768px - 1023px  → Tablets landscape
xl:  1024px - 1279px → Desktop pequeno
2xl: 1280px+         → Desktop grande
```

### Estratégia Mobile-First
- Desenvolver CSS começando pelo menor breakpoint
- Progressive enhancement para telas maiores
- Touch targets mínimos de 44x44px (Apple HIG)
- Espaçamento generoso para evitar toques acidentais

---

## 🧭 Navegação Mobile

### 1. Bottom Navigation Bar (Nova)
Substituir sidebar por navegação inferior fixa em mobile.

```
┌─────────────────────────────────────┐
│                                     │
│           Conteúdo da página        │
│                                     │
├─────────────────────────────────────┤
│  🏠    👥    💬    💰    ⚙️        │
│ Home  Prof  Leads Cobr  Config     │
└─────────────────────────────────────┘
```

**Especificações:**
- Altura: 64px (safe area adicional em iPhones com notch)
- Ícones: 24px com label 10px abaixo
- Item ativo: cor primária + indicador superior
- Backdrop blur para conteúdo que passa por baixo
- Z-index: 50 (acima de tudo exceto modais)

**Componente:** `components/profiza/mobile-nav.tsx`

```tsx
// Estrutura proposta
const navItems = [
  { label: "Home", icon: LayoutGrid, href: "/profiza" },
  { label: "Prof.", icon: Users, href: "/profiza/profissionais" },
  { label: "Leads", icon: MessageSquareText, href: "/profiza/leads" },
  { label: "Cobrar", icon: CircleDollarSign, href: "/profiza/cobranca" },
  { label: "Config", icon: Settings, href: "/profiza/configuracao" },
]
```

### 2. Header Mobile Simplificado
Redesenhar header para mobile com foco em ações essenciais.

**Layout Mobile (< 640px):**
```
┌─────────────────────────────────────┐
│ ☰  Dashboard Profiza    🔔  [+]    │
│     Bauru / Operação local          │
└─────────────────────────────────────┘
```

**Mudanças:**
- Hamburger menu (☰) abre drawer com opções extras
- Título truncado com ellipsis se necessário
- Busca movida para drawer ou página dedicada
- Botão de ação principal sempre visível
- Theme toggle movido para drawer/configurações

### 3. Drawer de Ações (Novo)
Menu lateral deslizante para ações secundárias.

**Conteúdo do Drawer:**
- Campo de busca expandido
- Toggle de tema (claro/escuro)
- Filtros ativos
- Ações em lote
- Link para perfil/logout

---

## 📊 Cards KPI Mobile

### Layout Atual (Problema)
Cards empilhados verticalmente ocupando muito scroll.

### Solução: Carrossel Horizontal
```
┌─────────────────────────────────────┐
│ ← [Card 1] [Card 2] [Card 3...] →  │
│   ●  ○  ○  ○                        │
└─────────────────────────────────────┘
```

**Especificações:**
- Scroll horizontal com snap points
- Indicadores de página (dots)
- Swipe gesture nativo
- Cards com largura de 85vw (mostra preview do próximo)
- Padding horizontal de 16px

**Alternativa: Grid 2x2 Compacto**
```
┌────────────┬────────────┐
│ Prof. Ativos│ Leads     │
│     6      │    133     │
├────────────┼────────────┤
│ Teste Grátis│ Vencendo  │
│     4      │     3      │
└────────────┴────────────┘
```

**Especificações Grid:**
- 2 colunas em mobile
- Cards menores (altura ~80px)
- Apenas valor principal + label
- Trend/descrição ocultos (acessível via tap)

---

## 📋 Tabelas Mobile

### Problema Atual
Tabelas com 7 colunas são ilegíveis em 375px.

### Solução 1: Card List View
Transformar linhas em cards empilhados.

```
┌─────────────────────────────────────┐
│ Carlos Andrade              [Ativo] │
│ Eletricista • Centro, Jd Europa    │
│ 📱 +55 14 99999-0101    Leads: 18  │
│                          [Abrir →] │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Marina Costa          [Teste grátis]│
│ Diarista • Vila São José           │
│ 📱 +55 14 99999-0102    Leads: 11  │
│                          [Abrir →] │
└─────────────────────────────────────┘
```

**Especificações:**
- Card com padding 16px
- Nome em destaque (font-medium)
- Badge de status alinhado à direita
- Informações secundárias em linha única
- Ação principal sempre visível
- Swipe left para ações rápidas (editar, desativar)

### Solução 2: Tabela Horizontal Scrollável
Para usuários que preferem visualização tabular.

```
┌─────────────────────────────────────┐
│ Nome          │ Status │ Leads │ → │
├───────────────┼────────┼───────┤   │
│ Carlos And... │ Ativo  │  18   │   │
│ Marina Costa  │ Teste  │  11   │   │
└─────────────────────────────────────┘
        ← scroll horizontal →
```

**Especificações:**
- Primeira coluna (Nome) fixa/sticky
- Scroll horizontal para demais colunas
- Indicador visual de scroll disponível
- Shadow na borda para indicar conteúdo oculto

### Toggle de Visualização
Permitir usuário escolher entre Card View e Table View.

```
┌─────────────────────────────────────┐
│ Profissionais    [≡ Lista] [⊞ Card]│
└─────────────────────────────────────┘
```

---

## 📝 Formulários Mobile

### Princípios
1. **Um campo por vez** em telas muito pequenas
2. **Teclado apropriado** (tel, email, text)
3. **Labels sempre visíveis** (não apenas placeholder)
4. **Validação inline** com feedback imediato
5. **Botões de ação fixos** no bottom

### Layout de Formulário
```
┌─────────────────────────────────────┐
│ ← Novo Profissional                 │
├─────────────────────────────────────┤
│                                     │
│ Nome completo                       │
│ ┌─────────────────────────────────┐ │
│ │ João da Silva                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ WhatsApp                            │
│ ┌─────────────────────────────────┐ │
│ │ +55 14 99999-0000               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Categoria                           │
│ ┌─────────────────────────────────┐ │
│ │ Selecione...                  ▼ │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│        [Cancelar]  [Salvar]         │
└─────────────────────────────────────┘
```

### Bottom Sheet para Selects
Substituir dropdowns nativos por bottom sheets.

```
┌─────────────────────────────────────┐
│ ─────  (drag handle)                │
│                                     │
│ Selecione a categoria               │
│                                     │
│ ○ Eletricista                       │
│ ○ Encanador                         │
│ ● Diarista                          │
│ ○ Pedreiro                          │
│ ○ Pintor                            │
│                                     │
│          [Confirmar]                │
└─────────────────────────────────────┘
```

---

## 🎨 Componentes Mobile Específicos

### 1. MobileNav (Bottom Navigation)
**Arquivo:** `components/profiza/mobile-nav.tsx`

```tsx
interface MobileNavProps {
  className?: string
}

// Features:
// - Detecta safe area (env(safe-area-inset-bottom))
// - Haptic feedback no tap (se disponível)
// - Badge de notificação no ícone
// - Animação de transição suave
```

### 2. MobileHeader
**Arquivo:** `components/profiza/mobile-header.tsx`

```tsx
interface MobileHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  actions?: React.ReactNode
  onMenuOpen?: () => void
}

// Features:
// - Título com truncate
// - Botão voltar condicional
// - Área de ações compacta
// - Integração com drawer
```

### 3. MobileDrawer
**Arquivo:** `components/profiza/mobile-drawer.tsx`

```tsx
interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

// Features:
// - Slide from left
// - Backdrop com blur
// - Gesture to close (swipe left)
// - Focus trap para acessibilidade
```

### 4. SwipeableCard
**Arquivo:** `components/profiza/swipeable-card.tsx`

```tsx
interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void  // Ação destrutiva (deletar)
  onSwipeRight?: () => void // Ação positiva (editar)
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
}

// Features:
// - Swipe gestures com spring animation
// - Reveal de ações
// - Haptic feedback
// - Threshold para confirmar ação
```

### 5. BottomSheet
**Arquivo:** `components/profiza/bottom-sheet.tsx`

```tsx
interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
  snapPoints?: number[] // [0.25, 0.5, 0.9]
}

// Features:
// - Drag handle
// - Snap points
// - Backdrop dismiss
// - Keyboard aware
```

### 6. PullToRefresh
**Arquivo:** `components/profiza/pull-to-refresh.tsx`

```tsx
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

// Features:
// - Pull gesture detection
// - Loading spinner
// - Haptic feedback
// - Threshold indicator
```

---

## 📐 Especificações de Layout por Página

### Dashboard Mobile

```
┌─────────────────────────────────────┐
│ ☰  Dashboard Profiza    🔔  [+]    │
├─────────────────────────────────────┤
│                                     │
│ ← [KPI 1] [KPI 2] [KPI 3] [KPI 4] →│
│     ●  ○  ○  ○                      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Profissionais cadastrados       │ │
│ │ [Todos ▼]              Ver todos│ │
│ ├─────────────────────────────────┤ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Carlos Andrade      [Ativo] │ │ │
│ │ │ Eletricista • Centro        │ │ │
│ │ │ 📱 +55 14...    Leads: 18   │ │ │
│ │ └─────────────────────────────┘ │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Marina Costa   [Teste grátis]│ │ │
│ │ │ Diarista • Vila São José    │ │ │
│ │ │ 📱 +55 14...    Leads: 11   │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Checklist de cobrança          │ │
│ │ ⚠️ 3 testes vencendo em 7 dias │ │
│ │ ⏰ 2 profissionais inativos    │ │
│ │ ✅ 133 leads roteados          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Resumo do fluxo                 │ │
│ │ Taxa de conversão      60% ████ │ │
│ │ Qualidade categoria    96% ████ │ │
│ │ Base ativa             50% ███  │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  🏠    👥    💬    💰    ⚙️        │
└─────────────────────────────────────┘
```

### Profissionais Mobile

```
┌─────────────────────────────────────┐
│ ←  Profissionais         🔍  [+]   │
├─────────────────────────────────────┤
│ [Todos ▼] [Bairro ▼]    12 result. │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Carlos Andrade              ●●● │ │
│ │ Eletricista           [Ativo]   │ │
│ │ Centro, Jardim Europa           │ │
│ │ 📱 +55 14 99999-0101            │ │
│ │ 18 leads • Ativo há 21 dias     │ │
│ └─────────────────────────────────┘ │
│         ← swipe para ações →        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Marina Costa                ●●● │ │
│ │ Diarista        [Teste grátis]  │ │
│ │ Vila São José, Bela Vista       │ │
│ │ 📱 +55 14 99999-0102            │ │
│ │ 11 leads • Expira em 5 dias     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ... mais cards ...                  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │    ← 1 2 3 ... 12 →             │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  🏠    👥    💬    💰    ⚙️        │
└─────────────────────────────────────┘
```

### Leads Mobile

```
┌─────────────────────────────────────┐
│ ←  Leads                 🔍  📤    │
├─────────────────────────────────────┤
│ [Período ▼] [Status ▼]  133 leads  │
├─────────────────────────────────────┤
│ ┌────────────┬────────────┐        │
│ │ Total      │ Convertidos│        │
│ │   133      │    89      │        │
│ ├────────────┼────────────┤        │
│ │ Pendentes  │ Perdidos   │        │
│ │    32      │    12      │        │
│ └────────────┴────────────┘        │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Maria Silva          [Roteado]  │ │
│ │ Preciso de eletricista urgente  │ │
│ │ → Carlos Andrade                │ │
│ │ 📱 Ligar    💬 WhatsApp         │ │
│ │ há 2 horas                      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ João Santos        [Convertido] │ │
│ │ Encanador para vazamento        │ │
│ │ → Roberto Silva                 │ │
│ │ 📱 Ligar    💬 WhatsApp         │ │
│ │ há 5 horas                      │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  🏠    👥    💬    💰    ⚙️        │
└─────────────────────────────────────┘
```

---

## 🎭 Interações e Gestos

### Gestos Suportados

| Gesto | Ação | Contexto |
|-------|------|----------|
| Tap | Selecionar/Abrir | Universal |
| Long Press | Menu contextual | Cards, linhas |
| Swipe Left | Ação destrutiva | Cards de lista |
| Swipe Right | Ação positiva | Cards de lista |
| Swipe Down | Pull to refresh | Listas |
| Pinch | Zoom (futuro) | Gráficos |
| Pan | Scroll/Drag | Bottom sheets |

### Feedback Tátil (Haptics)

```tsx
// Usar API de vibração quando disponível
const haptic = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(20),
  heavy: () => navigator.vibrate?.(30),
  success: () => navigator.vibrate?.([10, 50, 10]),
  error: () => navigator.vibrate?.([30, 50, 30, 50, 30]),
}
```

### Animações

- **Transições de página:** Slide horizontal (300ms ease-out)
- **Modais/Sheets:** Slide up com spring (400ms)
- **Cards:** Scale on press (0.98, 100ms)
- **Listas:** Stagger animation no load (50ms delay entre items)

---

## ♿ Acessibilidade Mobile

### Requisitos WCAG 2.1 Mobile

1. **Touch Target Size**
   - Mínimo: 44x44px
   - Recomendado: 48x48px
   - Espaçamento entre targets: 8px mínimo

2. **Contraste**
   - Texto normal: 4.5:1
   - Texto grande: 3:1
   - Elementos interativos: 3:1

3. **Orientação**
   - Suportar portrait e landscape
   - Não bloquear rotação

4. **Zoom**
   - Permitir zoom até 200%
   - Não usar `user-scalable=no`

5. **Motion**
   - Respeitar `prefers-reduced-motion`
   - Alternativas para animações

### Screen Reader Support

```tsx
// Exemplo de markup acessível
<button
  aria-label="Abrir menu de navegação"
  aria-expanded={isOpen}
  aria-controls="mobile-nav"
>
  <MenuIcon aria-hidden="true" />
</button>
```

---

## 🔧 Implementação Técnica

### Dependências Necessárias

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.0",  // Para sheets/modals
    "framer-motion": "^10.0.0",           // Animações e gestos
    "embla-carousel-react": "^8.0.0",     // Carrossel KPIs
    "vaul": "^0.9.0"                       // Drawer component
  }
}
```

### CSS Custom Properties Mobile

```css
:root {
  /* Safe areas */
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  
  /* Mobile nav */
  --mobile-nav-height: calc(64px + var(--safe-area-bottom));
  
  /* Touch targets */
  --touch-target-min: 44px;
  
  /* Spacing mobile */
  --spacing-mobile-x: 16px;
  --spacing-mobile-y: 12px;
}

/* Viewport height fix para mobile browsers */
.min-h-screen-mobile {
  min-height: 100vh;
  min-height: 100dvh;
}
```

### Viewport Meta Tag

```html
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

---

## 📅 Roadmap de Implementação

### Fase 1: Fundação (Semana 1-2)
- [ ] Criar MobileNav component
- [ ] Adaptar layout.tsx para mobile
- [ ] Implementar MobileHeader
- [ ] Configurar CSS variables mobile
- [ ] Testar em dispositivos reais

### Fase 2: Dashboard (Semana 3)
- [ ] Carrossel de KPIs
- [ ] Card list view para profissionais
- [ ] Adaptar checklist e resumo
- [ ] Pull to refresh

### Fase 3: Páginas Secundárias (Semana 4-5)
- [ ] Profissionais mobile
- [ ] Leads mobile
- [ ] Cobrança mobile
- [ ] Configuração mobile

### Fase 4: Interações Avançadas (Semana 6)
- [x] Swipeable cards
- [x] Bottom sheets para selects
- [x] Gestos e haptics
- [x] Animações refinadas

### Fase 5: Polish e Testes (Semana 7-8)
- [x] prefers-reduced-motion respeitado
- [x] viewport-fit=cover no meta tag
- [x] aria-labels e aria-current na navegação
- [x] touch-target mínimo 44px nos nav items
- [x] aria-hidden em ícones decorativos
- [x] KPI Carousel com dots e snap points
- [x] PullToRefresh em Profissionais e Leads
- [x] Documentação final atualizada

---

## 🧪 Critérios de Aceitação

### Funcional
- [ ] Todas as 5 páginas navegáveis via bottom nav
- [ ] Formulários funcionais com validação
- [ ] Todas as ações CRUD disponíveis
- [ ] Busca e filtros funcionando
- [ ] Paginação funcionando

### Visual
- [ ] Sem overflow horizontal em nenhuma página
- [ ] Texto legível sem zoom
- [ ] Imagens/ícones nítidos em telas retina
- [ ] Tema claro/escuro funcionando

### Performance
- [ ] LCP < 2.5s em 3G
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Bundle size mobile < 200KB gzipped

### Acessibilidade
- [ ] Score Lighthouse Accessibility > 90
- [ ] Navegável apenas com teclado
- [ ] Screen reader compatível
- [ ] Contraste adequado

---

## 📎 Referências

### Design Systems Mobile
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [Shopify Polaris Mobile](https://polaris.shopify.com/foundations/mobile)

### Bibliotecas de Referência
- [Vaul](https://vaul.emilkowal.ski/) - Drawer component
- [Embla Carousel](https://www.embla-carousel.com/) - Touch carousel
- [Framer Motion](https://www.framer.com/motion/) - Gestures

### Ferramentas de Teste
- Chrome DevTools Device Mode
- Safari Responsive Design Mode
- BrowserStack para dispositivos reais
- Lighthouse CI para métricas

---

## ✅ Checklist de Componentes

### Novos Componentes a Criar
- [ ] `components/profiza/mobile-nav.tsx`
- [ ] `components/profiza/mobile-header.tsx`
- [ ] `components/profiza/mobile-drawer.tsx`
- [ ] `components/profiza/bottom-sheet.tsx`
- [ ] `components/profiza/swipeable-card.tsx`
- [ ] `components/profiza/pull-to-refresh.tsx`
- [ ] `components/profiza/kpi-carousel.tsx`
- [ ] `components/profiza/professional-card.tsx`
- [ ] `components/profiza/lead-card.tsx`
- [ ] `components/profiza/mobile-filters.tsx`

### Componentes a Adaptar
- [ ] `components/profiza/header.tsx` → responsivo
- [ ] `components/profiza/sidebar.tsx` → hidden em mobile
- [ ] `components/profiza/pagination.tsx` → compacto
- [ ] `components/profiza/professional-form.tsx` → mobile-friendly
- [ ] `app/profiza/layout.tsx` → incluir mobile nav

---

*Documento criado em: 22/08/2026*
*Última atualização: 22/08/2026*
*Versão: 1.0*
