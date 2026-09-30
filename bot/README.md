# Profiza Bot

Serviço Node.js que recebe mensagens do WhatsApp via Z-API, extrai a intenção do cliente com OpenAI e roteia o lead para o profissional correto no Supabase.

> Atualização de teste para validar o fluxo de alterações pelo GitHub Desktop.

## Arquitetura

```
Cliente (WhatsApp)
       ↓
    Z-API
       ↓ POST /webhook
  Profiza Bot (Node.js + Fastify)
       ↓
  OpenAI GPT-4o-mini → extrai {categoria, bairro}
       ↓
  Supabase → busca profissional ativo
       ↓
  Z-API → envia resposta ao cliente
       ↓
  Supabase → salva lead + evento
```

---

## Pré-requisitos

- Node.js 20+
- Conta na [Z-API](https://app.z-api.io)
- Chave da [OpenAI](https://platform.openai.com)
- Projeto Supabase com as tabelas do Profiza

---

## 1. Configurar a Z-API

### 1.1 Criar instância

1. Acesse [app.z-api.io](https://app.z-api.io)
2. Clique em **"Nova instância"**
3. Escolha o plano (tem trial gratuito)
4. Anote os valores:
   - **Instance ID** — ex: `3A123BCDEF456`
   - **Token** — ex: `ABCDEF123456token`
   - **Client Token** — na aba "Security"

### 1.2 Conectar o WhatsApp

1. Na instância criada, clique em **"QR Code"**
2. Abra o WhatsApp no celular
3. Vá em **Configurações → Aparelhos conectados → Conectar aparelho**
4. Escaneie o QR Code
5. Aguarde o status mudar para **"Conectado"**

> Use um número dedicado para o bot — não o seu número pessoal.

### 1.3 Configurar o Webhook

1. Na instância, vá em **"Webhooks"**
2. Em **"On Message Received"**, coloque a URL do seu servidor:
   ```
   https://SEU_DOMINIO.com/webhook
   ```
3. Em **"Headers"**, adicione:
   ```
   x-webhook-secret: profiza-webhook-secret-2024
   ```
   (o mesmo valor que você vai colocar no `.env`)

> Para desenvolvimento local, use [ngrok](https://ngrok.com):
> ```bash
> ngrok http 3001
> # Copie a URL https://xxxx.ngrok.io e use como webhook
> ```

---

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role

OPENAI_API_KEY=sk-...

ZAPI_INSTANCE_ID=3A123BCDEF456
ZAPI_TOKEN=ABCDEF123456token
ZAPI_CLIENT_TOKEN=SEU_CLIENT_TOKEN

PORT=3001
WEBHOOK_SECRET=profiza-webhook-secret-2024
CONTACT_HASH_SECRET=gere-um-segredo-aleatorio-e-mantenha-estavel
```

`CONTACT_HASH_SECRET` protege os identificadores de contato armazenados e deve permanecer igual entre deploys. Se omitido, o bot usa `WEBHOOK_SECRET`.

> **IMPORTANTE:** Use a `service_role` key do Supabase (não a `anon`).
> Ela bypassa o RLS e permite que o bot leia e escreva sem autenticação.
> Nunca exponha essa chave no frontend.

---

## 3. Instalar e rodar

```bash
# Instalar dependências
npm install

# Desenvolvimento (hot reload)
npm run dev

# Produção
npm run build
npm start
```

---

## 4. Testar localmente

### Health check
```bash
curl http://localhost:3001/
# {"status":"ok","zapi":"conectado","timestamp":"..."}
```

### Simular webhook da Z-API
```bash
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: profiza-webhook-secret-2024" \
  -d '{
    "instanceId": "test",
    "messageId": "msg-001",
    "phone": "5514999990000",
    "fromMe": false,
    "isGroup": false,
    "type": "ReceivedCallback",
    "senderName": "Cliente Teste",
    "chatName": "Cliente Teste",
    "broadcast": false,
    "momment": 1234567890,
    "status": "RECEIVED",
    "text": {
      "message": "preciso de um eletricista no centro"
    }
  }'
```

Você deve ver no terminal:
```
[bot] Mensagem de 5514999990000: "preciso de um eletricista no centro"
[bot] Intenção: { categoria: 'Eletricista', bairro: 'Centro', confianca: 'alta' }
[bot] Lead roteado → Carlos Andrade
[zapi] Mensagem enviada para 5514999990000 — id: ...
```

---

## 5. Deploy em produção

### Railway (recomendado)

1. Crie conta em [railway.app](https://railway.app)
2. Novo projeto → **"Deploy from GitHub repo"**
3. Selecione a pasta `bot/` ou configure o root directory
4. Adicione as variáveis de ambiente no painel
5. Railway detecta o `package.json` e faz deploy automático
6. Copie a URL gerada e configure no webhook da Z-API

### Render

1. Crie conta em [render.com](https://render.com)
2. Novo **Web Service** → conecte o repositório
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Adicione as variáveis de ambiente

---

## 6. Fluxo de mensagens

| Mensagem do cliente | Resposta do bot |
|---|---|
| "preciso de eletricista no centro" | Envia contato do profissional |
| "quero um pintor" (sem bairro) | Pergunta o bairro |
| "preciso de pedreiro em Vila Industrial" | Sem match — registra solicitação |
| "oi tudo bem" | Explica o que o bot faz |

---

## 7. Estrutura do projeto

```
bot/
├── src/
│   ├── server.ts     # Servidor Fastify + webhook
│   ├── bot.ts        # Orquestrador principal
│   ├── ai.ts         # Extração de intenção (OpenAI)
│   ├── supabase.ts   # Queries no banco
│   ├── zapi.ts       # Envio de mensagens (Z-API)
│   ├── messages.ts   # Templates de resposta
│   └── config.ts     # Variáveis de ambiente
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 8. Custos estimados

| Serviço | Custo |
|---|---|
| Z-API | ~R$ 80/mês |
| OpenAI GPT-4o-mini | ~R$ 5/mês (500 msgs/dia) |
| Railway/Render | ~R$ 25/mês |
| **Total** | **~R$ 110/mês** |
