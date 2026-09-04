# PRD — Profiza: Cobrança por Lead Entregue (Obsoleto)

> **Status:** Obsoleto desde 4 de setembro de 2026. O modelo comercial vigente passou a ser uma assinatura fixa de R$ 29,90 por mês, sem cobrança por lead. Este documento permanece apenas como histórico e não deve orientar novas implementações.

## 1. Visão Geral

**Produto:** Profiza  
**Modelo:** Marketplace de serviços locais com cobrança por lead entregue  
**Nicho:** Profissionais autônomos de serviços rápidos (eletricista, pedreiro, diarista, etc.)  
**Região:** Bauru/SP  
**Stack:** Next.js + TypeScript + Supabase + Mercado Pago + WhatsApp (Z-API)

---

## 2. Modelo de Negócio

### Regra de Ouro
- **Cliente NUNCA paga**
- **Profissional paga SOMENTE quando o contato é entregue ao cliente**

### Definição de Lead Entregue
> Lead entregue = contato do profissional enviado ao cliente E confirmado pelo provedor de comunicação (Z-API), independente de o cliente contratar ou responder.

### Precificação MVP
| Item | Valor |
|------|-------|
| Lead entregue | R$ 10,00 |
| Variação por categoria | Não (MVP) |
| Cobrança duplicada | Bloqueada |
| Falha de envio | Não cobra |

---

## 3. Fluxo Principal

```
1. Cliente envia mensagem no WhatsApp
        ↓
2. Bot recebe via webhook Z-API
        ↓
3. IA extrai: categoria, bairro, urgência
        ↓
4. Sistema busca profissional (categoria + bairro + ativo)
        ↓
5. Sistema envia contato do profissional ao cliente
        ↓
6. Z-API confirma entrega (webhook de status)
        ↓
7. Sistema registra lead como "entregue"
        ↓
8. Sistema cria cobrança para o profissional
        ↓
9. Mercado Pago processa (PIX ou cartão)
```

---

## 4. Status do Lead

| Status | Descrição |
|--------|-----------|
| criado | Lead registrado no sistema |
| pesquisado | IA extraiu dados |
| matched | Profissional encontrado |
| contato_enviado | Mensagem enviada via Z-API |
| entrega_confirmada | Z-API confirmou entrega |
| cobrado | Cobrança gerada/paga |
| cancelado | Cancelado manualmente |
| falhou | Erro no envio (não cobra) |

---

## 5. Arquitetura

```
WhatsApp ←→ Z-API ←→ Bot Node.js ←→ Supabase
                          ↓
                     OpenAI/Gemini
                          ↓
                    Fila de Cobrança
                          ↓
                     Mercado Pago

Painel Next.js ←→ Supabase ←→ Auth
```

### Componentes

| Componente | Tecnologia | Função |
|------------|------------|--------|
| Bot | Node.js + Fastify | Recebe mensagens, processa, responde |
| IA | OpenAI GPT-4o-mini | Extrai categoria/bairro |
| Banco | Supabase (Postgres) | Dados + RLS + Triggers |
| Fila | Supabase Edge Functions | Processa cobranças async |
| Pagamento | Mercado Pago | PIX/Cartão |
| Painel | Next.js | Admin + Profissional |
| WhatsApp | Z-API | Envio/recebimento |

---

## 6. Modelagem de Dados

### 6.1 profissionais
```sql
CREATE TABLE profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL UNIQUE,
  email TEXT,
  categoria TEXT NOT NULL,
  bairros_atuacao TEXT[] NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  ativo_para_leads BOOLEAN DEFAULT true,
  valor_lead DECIMAL(10,2) DEFAULT 10.00,
  saldo_devedor DECIMAL(10,2) DEFAULT 0.00,
  mercado_pago_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 clientes
```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp TEXT NOT NULL UNIQUE,
  nome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.3 leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  profissional_id UUID REFERENCES profissionais(id),
  
  -- Dados extraídos pela IA
  categoria TEXT NOT NULL,
  bairro TEXT,
  urgencia TEXT DEFAULT 'normal',
  descricao TEXT,
  
  -- Canal e status
  canal TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'criado' CHECK (status IN (
    'criado', 'pesquisado', 'matched', 'contato_enviado',
    'entrega_confirmada', 'cobrado', 'cancelado', 'falhou'
  )),
  
  -- Cobrança
  valor DECIMAL(10,2),
  cobrado BOOLEAN DEFAULT false,
  cobranca_id UUID,
  
  -- Rastreamento Z-API
  mensagem_id TEXT,
  status_entrega TEXT,
  entrega_confirmada_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_lead_cobranca_unica 
  ON leads(id) WHERE cobrado = true;
```

### 6.4 cobrancas
```sql
CREATE TABLE cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) UNIQUE,
  profissional_id UUID NOT NULL REFERENCES profissionais(id),
  
  valor DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'processando', 'pago', 'falhou', 'cancelado', 'estornado'
  )),
  
  -- Mercado Pago
  provider TEXT DEFAULT 'mercado_pago',
  provider_id TEXT,
  provider_status TEXT,
  pix_qrcode TEXT,
  pix_copia_cola TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'
);

CREATE UNIQUE INDEX idx_cobranca_lead_unica ON cobrancas(lead_id);
```

### 6.5 logs_eventos
```sql
CREATE TABLE logs_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade TEXT NOT NULL,
  entidade_id UUID,
  evento TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logs_entidade ON logs_eventos(entidade, entidade_id);
CREATE INDEX idx_logs_evento ON logs_eventos(evento);
```

---

## 7. Endpoints da API

### 7.1 Webhook Z-API (Bot)
```
POST /webhook           - Recebe mensagens do WhatsApp
POST /webhook/status    - Recebe confirmação de entrega
```

### 7.2 API Profissionais
```
GET    /api/profissionais              - Lista todos
GET    /api/profissionais/:id          - Detalhe
POST   /api/profissionais              - Cadastro
PATCH  /api/profissionais/:id          - Atualiza
GET    /api/profissionais/:id/leads    - Leads do profissional
GET    /api/profissionais/:id/cobrancas - Cobranças
GET    /api/profissionais/:id/saldo    - Saldo devedor
```

### 7.3 API Leads
```
GET    /api/leads        - Lista todos
GET    /api/leads/:id    - Detalhe com histórico
PATCH  /api/leads/:id    - Atualiza status
```

### 7.4 API Cobranças
```
GET    /api/cobrancas              - Lista todas
GET    /api/cobrancas/:id          - Detalhe
POST   /api/cobrancas/:id/pagar    - Gera PIX/link pagamento
POST   /webhook/mercadopago        - Webhook de pagamento
```

---

## 8. Lógica de Cobrança

### 8.1 Fluxo
```
1. Z-API confirma entrega (webhook /webhook/status)
2. Sistema verifica:
   - Lead existe?
   - Status = "contato_enviado"?
   - Profissional ativo?
   - Já foi cobrado? (idempotência)
3. Se OK:
   - Atualiza lead.status = "entrega_confirmada"
   - Cria registro em cobrancas
   - Atualiza lead.cobrado = true
   - Incrementa profissional.saldo_devedor
4. Profissional paga via PIX
5. Webhook Mercado Pago confirma
6. Atualiza cobranca.status = "pago"
```

### 8.2 Função Idempotente
```sql
CREATE OR REPLACE FUNCTION criar_cobranca(p_lead_id UUID)
RETURNS UUID AS $$
DECLARE
  v_cobranca_id UUID;
  v_lead RECORD;
BEGIN
  SELECT * INTO v_lead FROM leads 
  WHERE id = p_lead_id FOR UPDATE;
  
  IF v_lead.cobrado THEN
    RETURN v_lead.cobranca_id;
  END IF;
  
  INSERT INTO cobrancas (lead_id, profissional_id, valor)
  VALUES (p_lead_id, v_lead.profissional_id, v_lead.valor)
  RETURNING id INTO v_cobranca_id;
  
  UPDATE leads SET 
    cobrado = true,
    cobranca_id = v_cobranca_id,
    status = 'cobrado'
  WHERE id = p_lead_id;
  
  UPDATE profissionais SET
    saldo_devedor = saldo_devedor + v_lead.valor
  WHERE id = v_lead.profissional_id;
  
  RETURN v_cobranca_id;
END;
$$ LANGUAGE plpgsql;
```

### 8.3 Regras de Não-Cobrança
- status_entrega != "delivered" ou "read"
- profissional.ativo_para_leads = false
- profissional.status != "ativo"
- lead.cobrado = true (já cobrado)
- lead.status = "falhou" ou "cancelado"

---

## 9. Integração Mercado Pago

### 9.1 Gerar PIX
```typescript
async function gerarPix(cobranca: Cobranca) {
  const response = await payment.create({
    body: {
      transaction_amount: Number(cobranca.valor),
      description: `Profiza - Lead #${cobranca.lead_id.slice(0,8)}`,
      payment_method_id: 'pix',
      payer: { email: cobranca.profissional_email },
      external_reference: cobranca.id,
      notification_url: `${BASE_URL}/webhook/mercadopago`
    }
  })
  
  return {
    qrcode: response.point_of_interaction?.transaction_data?.qr_code,
    copia_cola: response.point_of_interaction?.transaction_data?.qr_code_base64,
    provider_id: response.id
  }
}
```

### 9.2 Webhook Mercado Pago
```typescript
async function handleMercadoPagoWebhook(req: Request) {
  const { type, data } = req.body
  if (type !== 'payment') return
  
  const paymentInfo = await payment.get({ id: data.id })
  
  if (paymentInfo.status === 'approved') {
    const cobrancaId = paymentInfo.external_reference
    
    await supabase.from('cobrancas').update({
      status: 'pago',
      paid_at: new Date().toISOString()
    }).eq('id', cobrancaId)
    
    // Decrementa saldo devedor do profissional
  }
}
```

---

## 10. Webhook de Status Z-API

```typescript
async function handleStatusWebhook(req: Request) {
  const { messageId, status } = req.body
  
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('mensagem_id', messageId)
    .single()
  
  if (!lead) return { ok: true }
  
  await supabase.from('leads').update({
    status_entrega: status
  }).eq('id', lead.id)
  
  if (status === 'delivered' || status === 'read') {
    if (!lead.cobrado && lead.status === 'contato_enviado') {
      await supabase.rpc('criar_cobranca', { p_lead_id: lead.id })
    }
  }
  
  return { ok: true }
}
```

---

## 11. Painel do Profissional

### Telas
- `/profissional/dashboard` - Resumo
- `/profissional/leads` - Lista de leads
- `/profissional/cobrancas` - Cobranças e pagamentos
- `/profissional/configuracoes` - Dados e preferências

### Funcionalidades
- Ver leads recebidos
- Ver histórico de cobranças
- Ver saldo devedor
- Pagar cobranças pendentes (PIX)
- Ativar/desativar recebimento de leads

---

## 12. Logs e Auditoria

### Eventos Registrados
- lead_criado
- lead_pesquisado
- lead_matched
- contato_enviado
- entrega_confirmada
- cobranca_criada
- pagamento_confirmado
- pagamento_falhou
- lead_cancelado

---

## 13. Cronograma MVP

| Fase | Duração | Entregas |
|------|---------|----------|
| 1 | 1 semana | Bot funcionando + leads salvos |
| 2 | 1 semana | Webhook de status + cobrança automática |
| 3 | 1 semana | Integração Mercado Pago |
| 4 | 1 semana | Painel do profissional |

**Total: 4 semanas**

---

## 14. Próximos Passos

1. [ ] Criar tabelas no Supabase
2. [ ] Implementar webhook de status no bot
3. [ ] Criar função de cobrança idempotente
4. [ ] Integrar Mercado Pago
5. [ ] Criar painel do profissional
6. [ ] Testar fluxo completo
7. [ ] Deploy em produção
