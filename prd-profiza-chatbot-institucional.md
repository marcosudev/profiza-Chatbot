# PRD — Chatbot Profiza no Site Institucional Existente

| Campo | Valor |
|---|---|
| **Versão** | 1.1 |
| **Data** | 4 de setembro de 2026 |
| **Status** | Rascunho para validação de negócio |
| **Produto** | Chatbot Profiza |
| **Superfície** | Site institucional existente: [profiza.net](https://profiza.net) |
| **Objetivo** | Evoluir a apresentação e a captação de interessados na modalidade Chatbot Profiza dentro do site existente |

## 1. Resumo executivo

O site institucional existente, [profiza.net](https://profiza.net), deve apresentar o **Chatbot Profiza** como uma solução gerenciada de atendimento e distribuição de oportunidades pelo WhatsApp para negócios locais e profissionais de serviços. Este trabalho evolui a experiência que já existe no site; não requer criar um segundo site, novo domínio ou uma cópia da presença institucional.

O produto existente recebe mensagens de clientes pelo WhatsApp, interpreta a necessidade com IA, identifica categoria e bairro, encontra um profissional elegível e envia o contato ao cliente. O sistema registra a oportunidade no Supabase e acompanha a entrega da mensagem pela Z-API. O painel administrativo permite acompanhar profissionais, oportunidades, status e assinaturas.

O site não deve vender a ideia de um chatbot genérico que responde qualquer assunto. A proposta comprovada pelo sistema é mais específica e mais forte: **transformar pedidos espontâneos no WhatsApp em oportunidades encaminhadas para o profissional certo**.

Este PRD especifica a evolução da experiência institucional existente e da captação comercial dentro de profiza.net. O motor do bot, o painel administrativo e o banco de dados continuam sendo produtos técnicos separados.

## 2. Contexto e problema

### 2.1 Problema do cliente final

Quem precisa de um serviço local frequentemente pergunta em grupos, procura em redes sociais ou envia mensagens para vários profissionais sem saber quem atende sua região. Isso gera demora, ruído e baixa confiança.

### 2.2 Problema do profissional

O profissional autônomo depende de indicação e tem dificuldade para receber oportunidades qualificadas de forma previsível. Mesmo quando existe demanda, ele pode não ser encontrado no momento certo.

### 2.3 Problema do operador da Profiza

A operação precisa manter uma base de profissionais por categoria e bairro, distribuir oportunidades de forma rastreável e demonstrar o valor da assinatura. A experiência já publicada em profiza.net deve ser mantida como ponto de entrada e evoluída conforme as necessidades de conteúdo, conversão e operação.

## 3. Objetivos

### 3.1 Objetivo principal

Gerar interessados qualificados para a modalidade Chatbot Profiza, explicando seu funcionamento em poucos segundos e conduzindo o visitante a contratar a assinatura mensal.

### 3.2 Objetivos secundários

- Qualificar o perfil do interessado antes do contato comercial.
- Explicar o fluxo sem prometer capacidades não implementadas.
- Diferenciar a modalidade de um chatbot de FAQ ou de atendimento genérico.
- Dar à equipe comercial contexto suficiente para concluir a adesão mensal.
- Permitir medir quais páginas, CTAs e origens geram oportunidades.

### 3.3 Não objetivos

- Construir o motor de IA dentro do site institucional.
- Permitir que o visitante administre profissionais ou oportunidades.
- Oferecer um painel público para profissionais.
- Prometer integração com todos os canais de mensagens.
- Prometer agendamento, orçamento automático, pagamento ou atendimento humano 24/7 sem confirmação de escopo.

## 4. Público-alvo e personas

### Persona primária — Profissional de serviço local

Eletricista, encanador, pedreiro, diarista, pintor, montador, arquiteto ou profissional de categoria semelhante. Busca mais oportunidades na sua região, tem pouco tempo para operar ferramentas e prefere WhatsApp.

**Perguntas principais:**

- Vou receber clientes da minha área?
- O que está incluído na assinatura de R$ 29,90 por mês?
- O cliente realmente recebe meu contato?
- Como acompanho as oportunidades recebidas?
- Posso pausar ou alterar meu cadastro?

### Persona secundária — Empresa local

Pequena empresa ou operação com vários atendentes/profissionais que quer captar e distribuir pedidos sem depender de triagem manual.

**Perguntas principais:**

- A solução pode usar minhas categorias e regiões?
- A mensagem pode ser personalizada?
- Como acompanho as oportunidades e a assinatura?
- Quem configura e mantém o bot?

### Usuário indireto — Cliente final

Pessoa que procura um serviço pelo WhatsApp. Não precisa conhecer a marca antes de enviar a mensagem e deve conseguir descrever sua necessidade em linguagem natural.

## 5. Posicionamento e mensagem

### 5.1 Proposta de valor

**O Chatbot Profiza entende o que o cliente precisa e encaminha a oportunidade para um profissional que atende a categoria e a região informadas.**

### 5.2 Mensagem curta

**Mais pedidos certos chegando pelo WhatsApp.**

### 5.3 Mensagens de apoio

- A IA identifica o serviço e a região mencionados pelo cliente.
- O cliente recebe o contato de um profissional disponível na base.
- Cada oportunidade fica registrada para acompanhamento, sem cobrança individual por encaminhamento.
- A operação pode começar em uma cidade, categoria ou região e crescer com a demanda.

### 5.4 O que evitar

- “A IA garante vendas.”
- “O bot fecha o serviço sozinho.”
- “Atendimento humano substituído em qualquer situação.”
- “Profissional exclusivo para cada cliente”, salvo regra comercial explícita.
- “Pague por lead” ou qualquer cobrança variável por encaminhamento.

## 6. Fluxo do produto que o site deve explicar

```text
Cliente envia uma mensagem pelo WhatsApp
        ↓
IA interpreta categoria e bairro
        ↓
Profiza procura profissional elegível
        ↓
Cliente recebe nome, categoria, região e WhatsApp
        ↓
Lead é registrado e a entrega é acompanhada
```

### 6.1 Caso com informações completas

Mensagem: “Preciso de um eletricista no Centro.”

Resultado esperado: o bot identifica `Eletricista` e `Centro`, encontra um profissional ativo ou em teste elegível e envia os dados dele ao cliente.

### 6.2 Caso com bairro ausente

Mensagem: “Quero um pintor.”

Resultado esperado: o bot entende a categoria, pede o bairro e guarda o contexto por até 10 minutos para continuar a conversa.

### 6.3 Caso sem profissional compatível

Resultado esperado: o bot informa que ainda não encontrou um profissional para aquela combinação, registra a solicitação como sem resposta e preserva a oportunidade para análise operacional.

### 6.4 Caso com match parcial

Resultado esperado: quando não existe profissional no bairro pedido, o sistema pode oferecer um profissional da mesma categoria que atende outra região, deixando explícito que o atendimento deve ser confirmado.

## 7. Escopo da experiência no site

### 7.1 Entrada principal

Evoluir a apresentação da modalidade dentro do site institucional existente em [profiza.net](https://profiza.net). Reutilizar a navegação, a identidade visual, os componentes e os padrões técnicos já adotados pelo site. Não criar um segundo site, outro domínio/subdomínio ou uma cópia independente da experiência institucional.

A página inicial existente já apresenta o Chatbot Profiza e usa a âncora `#chatbot` para a seção do produto e `#interesse` para o formulário. Reutilizar esses pontos de entrada e os CTAs existentes; alterar ou acrescentar rotas/âncoras somente se houver uma necessidade de navegação validada, sempre dentro do mesmo site.

### 7.2 Conteúdo da experiência existente

Revisar e complementar a experiência já publicada, sem duplicar o site ou reconstruir seções que já atendam aos objetivos:

1. Hero com nome do produto, benefício principal e CTA.
2. Demonstração visual de uma conversa realista no WhatsApp.
3. Explicação do fluxo em três ou quatro passos.
4. Benefícios para o profissional ou empresa.
5. O que o bot consegue fazer hoje.
6. Casos de uso por categoria e região.
7. Assinatura mensal de R$ 29,90 e o que está incluído.
8. Perguntas frequentes.
9. Formulário de interesse e CTA final.

### 7.3 Hero

**Título sugerido:**

> Seu próximo cliente pode começar com uma mensagem no WhatsApp.

**Apoio:**

> O Chatbot Profiza entende o serviço que o cliente procura, identifica a região e encaminha a oportunidade para o profissional certo.

**CTA primário:** `Quero conhecer o Chatbot Profiza`

**CTA secundário:** `Falar com um especialista`

O hero deve mostrar o produto em uso: uma conversa de WhatsApp com uma solicitação, uma pergunta de bairro e o encaminhamento de um profissional. Não usar apenas uma ilustração abstrata de IA.

### 7.4 Demonstração da conversa

A demonstração deve ser curta, legível e baseada no comportamento real:

```text
Cliente: Preciso de um eletricista no Centro

Profiza: Encontrei um profissional para você.
         Carlos Andrade — Eletricista
         Atende: Centro e Jardim Europa
         WhatsApp: (14) 99999-0101
```

Deixar claro que os nomes, telefones e mensagens exibidos são exemplos, caso não sejam dados reais autorizados.

### 7.5 Benefícios a comunicar

- **Captação no canal do cliente:** o pedido começa no WhatsApp, sem exigir cadastro em outro aplicativo.
- **Triagem automática:** categoria e bairro são extraídos da linguagem natural.
- **Distribuição local:** o encaminhamento considera a região de atendimento cadastrada.
- **Rastreabilidade:** cada oportunidade pode ser consultada no painel operacional, sem cobrança por unidade.
- **Operação gerenciada:** a equipe Profiza mantém categorias, bairros, profissionais e mensagens.
- **Escala gradual:** começar com uma área de atuação e ampliar conforme a base cresce.

## 8. Requisitos funcionais

### RF-01 — Descoberta

O visitante deve encontrar a modalidade na navegação ou em uma área de soluções do site existente e chegar à seção do Chatbot Profiza em um clique, reutilizando os links e CTAs já publicados sempre que possível.

### RF-02 — Clareza da proposta

Em até uma tela inicial, o visitante deve entender:

- que o canal principal é WhatsApp;
- que a IA interpreta o pedido;
- que o foco é encaminhar oportunidades para profissionais;
- qual ação deve tomar para saber mais.

### RF-03 — CTA para conversa comercial

O CTA primário deve abrir WhatsApp ou formulário de interesse conforme a operação comercial escolhida. O link deve aceitar mensagem inicial pré-preenchida, por exemplo:

> Olá! Quero saber como funciona o Chatbot Profiza para minha categoria e região.

### RF-04 — Formulário de interesse

Campos mínimos:

- Nome.
- WhatsApp.
- Tipo de negócio ou categoria.
- Cidade e bairros de interesse.
- Quantidade aproximada de atendimentos ou profissionais, opcional.
- Campo livre para contexto, opcional.
- Consentimento para contato comercial e tratamento dos dados.

O formulário deve validar telefone, bloquear envio duplicado durante a requisição, exibir estado de sucesso e oferecer alternativa de contato caso falhe.

### RF-05 — Qualificação

O interessado comercial deve registrar origem, campanha, página, modalidade de interesse, categoria, cidade, bairros, timestamp e consentimento. A equipe deve receber os dados no destino operacional definido pelo negócio.

### RF-06 — FAQ

Perguntas mínimas:

- O Chatbot Profiza funciona por WhatsApp?
- Que tipos de serviço podem ser cadastrados?
- O cliente paga para usar?
- Como o profissional recebe uma oportunidade?
- Como vocês acompanham as oportunidades encaminhadas?
- Posso atuar em mais de um bairro?
- O bot substitui atendimento humano?
- O que está incluído na assinatura de R$ 29,90 por mês?

As respostas sobre preço, cidade, volume mínimo, exclusividade e SLA ficam condicionadas à decisão comercial.

### RF-07 — Rastreabilidade

Registrar eventos de visualização da página, clique no CTA, início do formulário, envio do formulário, clique no WhatsApp e erro de envio. Eventos devem incluir `utm_source`, `utm_medium`, `utm_campaign` e página de origem quando disponíveis.

### RF-08 — Responsividade e acessibilidade

A experiência no site deve funcionar em celular, tablet e desktop. CTAs devem ser fáceis de tocar, a conversa demonstrativa não pode exigir rolagem horizontal e o formulário deve ter labels, foco visível, mensagens de erro associadas e contraste adequado.

## 9. Requisitos não funcionais

| Categoria | Requisito |
|---|---|
| Performance | LCP alvo menor que 2,5 s em conexão móvel razoável |
| SEO | Título, description, canonical, Open Graph e dados estruturados de serviço |
| Segurança | Nenhuma chave do Supabase, OpenAI, Z-API ou Service Role no frontend |
| Privacidade | Consentimento explícito, política de privacidade acessível e coleta mínima |
| Confiabilidade | Falha no formulário não pode apagar os dados já digitados |
| Observabilidade | Eventos e erros de conversão identificáveis por origem |
| Conteúdo | Linguagem simples, em português do Brasil, sem promessas absolutas |
| Compatibilidade | Navegadores modernos suportados pelo site institucional |

## 10. Modelo comercial: assinatura mensal

O Chatbot Profiza será oferecido por uma assinatura fixa de **R$ 29,90 por mês**.

### Incluído na assinatura

- Cadastro do profissional na base Profiza.
- Participação no roteamento de oportunidades compatíveis com categoria e região.
- Atendimento automatizado inicial pelo WhatsApp.
- Registro das oportunidades encaminhadas no painel operacional.
- Manutenção operacional do cadastro, categorias e bairros pela equipe Profiza.

### Regras comerciais

- Não existe cobrança individual por lead ou por mensagem encaminhada.
- O valor cobrado é R$ 29,90 por mês enquanto a assinatura estiver ativa.
- O profissional pode receber várias oportunidades compatíveis sem acréscimo por unidade.
- Status de assinatura devem ser: `ativa`, `em_teste`, `atrasada`, `cancelada` ou equivalente aprovado no sistema.
- O início da cobrança, período de teste, vencimento, cancelamento e reativação devem ser definidos antes da implementação do checkout.

### Comunicação aprovada

> Tenha seu serviço encontrado por clientes da sua região por apenas R$ 29,90 por mês.

Não usar preço por lead, saldo devedor, cobrança após confirmação de entrega ou modelo híbrido na página institucional.

## 11. Dependências técnicas e integrações

### 11.1 Site institucional existente

- Evolução da página inicial/seção existente do Chatbot Profiza em profiza.net, preservando o site institucional atual.
- Reutilização dos componentes existentes de navegação, CTA, FAQ, formulário e demonstração de conversa; novos componentes somente para lacunas identificadas.
- Serviço de envio do formulário já usado pelo site ou endpoint dedicado.
- Analytics compatível com a stack existente.
- Não criar site, domínio, subdomínio ou implantação independente para esta modalidade.

### 11.2 Bot existente

O site deve tratar o bot como serviço separado. O fluxo atual depende de:

- WhatsApp via Z-API;
- Node.js + Fastify para webhooks;
- OpenAI GPT-4o-mini para extrair categoria e bairro;
- Supabase com chave de serviço no backend;
- painel Next.js para a operação.

### 11.3 Contratos que precisam ser alinhados antes da integração

- Nome correto das colunas de profissionais: há arquivos usando `bairros`/`status` e outros usando `bairro_atuacao`/`status_pagamento`.
- Status do lead: o código usa `novo`, `enviado`, `sem_resposta`, `contato_enviado`, `falhou` e `cancelado`; documentos também citam `entrega_confirmada` e `cobrado`.
- Destino do interessado comercial do site: CRM, tabela própria, e-mail, WhatsApp ou endpoint próprio.
- Responsável por responder o formulário e em quanto tempo.
- Ambiente da demonstração: dados fictícios ou dados reais anonimizados.

O site institucional não deve acessar diretamente as tabelas operacionais com `service_role`.

## 12. Conteúdo e tom de voz

### Tom

Direto, local, confiável e pragmático. Falar sobre oportunidades e operação, não sobre “mágica da IA”.

### Vocabulário preferido

- oportunidade;
- pedido do cliente;
- profissional da região;
- categoria de serviço;
- encaminhamento;
- mensagem entregue;
- operação acompanhada.

### Vocabulário a evitar

- lead garantido;
- venda garantida;
- IA que resolve tudo;
- atendimento 100% autônomo;
- resultado instantâneo;
- alcance nacional, enquanto o produto estiver limitado a Bauru.

## 13. Métricas de sucesso

### Funil principal

1. Visualizações e interações com a seção Chatbot Profiza no site existente.
2. Cliques no CTA.
3. Inícios de formulário ou abertura do WhatsApp.
4. Interessados comerciais enviados.
5. Interessados qualificados pela equipe.
6. Demonstrações ou propostas realizadas.
7. Profissionais ou empresas ativados.

### Metas iniciais para validação

As metas devem ser definidas após conhecer o tráfego atual. Como ponto de partida para os primeiros 30 dias:

| Métrica | Meta inicial |
|---|---:|
| CTA principal / sessões da página | ≥ 5% |
| Formulário concluído / início de formulário | ≥ 60% |
| Leads com categoria e cidade preenchidas | ≥ 80% |
| Leads respondidos pela equipe no prazo definido | ≥ 90% |
| Conversão lead qualificado → reunião ou proposta | A definir com vendas |

Não usar volume de mensagens do bot como métrica de sucesso da página institucional. São funis diferentes e precisam de eventos separados.

## 14. Critérios de aceite

- [ ] A modalidade Chatbot Profiza permanece acessível pela navegação e pelos pontos de entrada existentes em profiza.net.
- [ ] A implementação evolui o site institucional existente, sem criar outro site, domínio ou cópia independente.
- [ ] A primeira tela explica WhatsApp, IA, região e encaminhamento de oportunidades.
- [ ] Existe CTA primário funcional para WhatsApp ou formulário.
- [ ] A demonstração usa dados claramente identificados como exemplo quando necessário.
- [ ] A página explica o caso sem bairro, o fallback e a ausência de match sem prometer cobertura total.
- [ ] O formulário coleta apenas os dados necessários e exige consentimento.
- [ ] Sucesso, erro e envio duplicado têm estados visíveis.
- [ ] Cliques e envios são rastreados com origem de campanha.
- [ ] A página é utilizável em celular e não apresenta sobreposição ou rolagem horizontal.
- [ ] SEO básico e compartilhamento social estão configurados.
- [ ] Não há segredo de backend no bundle do navegador.
- [ ] O preço publicado é R$ 29,90 por mês e é consistente com a implementação.
- [ ] A página deixa explícito que não há cobrança por lead.
- [ ] A equipe sabe quem recebe os interessados e qual é o próximo passo após o envio.

## 15. Plano de entrega

### Fase 0 — Decisões e conteúdo

- Aprovar público prioritário: profissional individual, empresa local ou ambos.
- Aprovar regras da assinatura: teste, vencimento, pagamento, cancelamento e reativação.
- Definir cidade inicial, categorias e cobertura.
- Definir canal de atendimento comercial.
- Aprovar copy, provas e política de privacidade.

### Fase 1 — Evolução da experiência de conversão existente

- Revisar a experiência atual do Chatbot Profiza em profiza.net e identificar lacunas em relação aos requisitos aprovados.
- Evoluir as seções, CTAs e formulário existentes; acrescentar conteúdo ou componentes somente onde necessário.
- Preservar a navegação, a identidade visual e os padrões técnicos do site institucional.
- Publicar ou ajustar eventos de analytics usando os padrões existentes.

### Fase 2 — Operação comercial

- Integrar interessados ao destino escolhido.
- Definir SLA de resposta.
- Criar tags e origem no CRM ou banco.
- Criar relatório semanal de conversão da assinatura.

### Fase 3 — Prova e otimização

- Adicionar depoimentos ou resultados reais autorizados.
- Testar CTA WhatsApp versus formulário.
- Testar mensagens para profissional individual versus empresa.
- Refinar cobertura, preço e argumentos a partir das objeções comerciais.

## 16. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Visitante entender que é FAQ genérico | Leads desqualificados | Mostrar conversa real e declarar foco em encaminhamento |
| Preço ou regra da assinatura divergir do código | Perda de confiança | Validar checkout, renovação e status antes da publicação |
| Cobertura pequena de bairros | Experiência ruim para cliente final | Exibir área atendida e registrar solicitações sem match |
| IA classificar categoria incorretamente | Lead enviado para profissional inadequado | Vocabulário controlado, validação no banco e revisão operacional |
| Dados de exemplo parecerem reais | Risco de privacidade | Usar dados fictícios ou obter autorização formal |
| Formulário sem dono operacional | Interessados esquecidos | Definir responsável e SLA antes do lançamento |
| Site acessar dados privilegiados | Incidente de segurança | Usar endpoint público restrito e nunca expor Service Role |

## 17. Perguntas em aberto

1. A modalidade será vendida para profissionais individuais, empresas ou ambos?
2. O cliente final paga alguma coisa? A comunicação atual deve dizer explicitamente que não paga?
3. Qual cidade será comunicada no lançamento? O bot atual tem conteúdo e exemplo orientados a Bauru/SP.
4. O profissional recebe a oportunidade diretamente no WhatsApp, acessa um painel ou os dois?
5. O que acontece quando o profissional não responde ao cliente?
6. O interessado comercial será enviado para qual CRM, número de WhatsApp ou caixa de e-mail?
7. Existe prova social autorizada para publicar?
8. Quais categorias e bairros devem aparecer na demonstração?
9. Qual será o período de teste, se houver?
10. Qual meio de pagamento será usado para a mensalidade?
11. Quais padrões já existentes de analytics, consentimento e formulário em profiza.net devem ser reutilizados ou ajustados?

## 18. Definição de pronto

A feature estará pronta quando a experiência evoluída estiver publicada no site institucional existente profiza.net, sem criar outro site; o CTA gerar uma ação comercial real; os envios forem recebidos no destino definido; os eventos do funil forem mensuráveis; o texto refletir o comportamento atual do bot; e as decisões de preço, público e cobertura estiverem aprovadas.
