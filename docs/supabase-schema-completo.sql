-- ============================================================
-- Profiza: Schema Completo
-- Execute no Supabase SQL Editor
-- ============================================================

-- Extensão
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela profissionais
CREATE TABLE public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  whatsapp VARCHAR(20) NOT NULL UNIQUE,
  categoria VARCHAR(60) NOT NULL,
  bairros TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'teste_gratis' CHECK (status IN ('ativo', 'inativo', 'teste_gratis', 'suspenso')),
  email VARCHAR(160),
  observacoes TEXT,
  ativo_para_leads BOOLEAN DEFAULT true,
  valor_lead DECIMAL(10,2) DEFAULT 10.00,
  saldo_devedor DECIMAL(10,2) DEFAULT 0.00,
  mercado_pago_id TEXT,
  teste_gratis_expira_em TIMESTAMPTZ,
  ativo_desde TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profissionais_categoria ON public.profissionais(categoria);
CREATE INDEX idx_profissionais_bairros ON public.profissionais USING gin(bairros);
CREATE INDEX idx_profissionais_status ON public.profissionais(status);

-- 2. Tabela clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp TEXT NOT NULL UNIQUE,
  nome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  profissional_id UUID REFERENCES public.profissionais(id),
  nome_cliente TEXT,
  whatsapp_cliente TEXT,
  categoria TEXT NOT NULL,
  bairro TEXT,
  canal TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'novo' CHECK (status IN (
    'novo', 'enviado', 'sem_resposta', 'convertido',
    'contato_enviado', 'entrega_confirmada', 'cobrado', 'cancelado', 'falhou'
  )),
  valor DECIMAL(10,2) DEFAULT 10.00,
  cobrado BOOLEAN DEFAULT false,
  cobranca_id UUID,
  mensagem_id TEXT,
  status_entrega TEXT,
  entrega_confirmada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_profissional ON public.leads(profissional_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_mensagem_id ON public.leads(mensagem_id);

-- 4. Tabela cobrancas
CREATE TABLE public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) UNIQUE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id),
  valor DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'processando', 'pago', 'falhou', 'cancelado', 'estornado'
  )),
  provider TEXT DEFAULT 'mercado_pago',
  provider_id TEXT,
  provider_status TEXT,
  pix_qrcode TEXT,
  pix_copia_cola TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_cobrancas_profissional ON public.cobrancas(profissional_id);
CREATE INDEX idx_cobrancas_status ON public.cobrancas(status);

-- 5. Tabela metricas_bot
CREATE TABLE public.metricas_bot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL UNIQUE REFERENCES public.profissionais(id) ON DELETE CASCADE,
  leads_enviados INT NOT NULL DEFAULT 0,
  data_ultimo_lead TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabela leads_eventos
CREATE TABLE public.leads_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  origem VARCHAR(30) NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_eventos_profissional ON public.leads_eventos(profissional_id, created_at);

-- 7. Tabela logs_eventos
CREATE TABLE public.logs_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade TEXT NOT NULL,
  entidade_id UUID,
  evento TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logs_entidade ON public.logs_eventos(entidade, entidade_id);

-- 8. Tabela configuracoes
CREATE TABLE public.configuracoes (
  id TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  notificacoes_email BOOLEAN DEFAULT true,
  notificacoes_whatsapp BOOLEAN DEFAULT true,
  auto_routing BOOLEAN DEFAULT true,
  tema TEXT DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.configuracoes (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

-- 9. Função updated_at
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER trg_profissionais_updated_at BEFORE UPDATE ON public.profissionais FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_metricas_bot_updated_at BEFORE UPDATE ON public.metricas_bot FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 10. Função atualiza metricas_bot
CREATE OR REPLACE FUNCTION public.fn_atualiza_metricas_bot()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.metricas_bot (profissional_id, leads_enviados, data_ultimo_lead)
  VALUES (NEW.profissional_id, 1, NEW.created_at)
  ON CONFLICT (profissional_id)
  DO UPDATE SET
    leads_enviados = public.metricas_bot.leads_enviados + 1,
    data_ultimo_lead = NEW.created_at,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_leads_eventos_after_insert AFTER INSERT ON public.leads_eventos FOR EACH ROW EXECUTE FUNCTION public.fn_atualiza_metricas_bot();

-- 11. Funções saldo devedor
CREATE OR REPLACE FUNCTION public.incrementar_saldo_devedor(p_profissional_id UUID, p_valor DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE public.profissionais SET saldo_devedor = saldo_devedor + p_valor WHERE id = p_profissional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrementar_saldo_devedor(p_profissional_id UUID, p_valor DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE public.profissionais SET saldo_devedor = GREATEST(0, saldo_devedor - p_valor) WHERE id = p_profissional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Tabela despesas
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao VARCHAR(150) NOT NULL,
  categoria VARCHAR(60) NOT NULL CHECK (categoria IN (
    'infraestrutura_software', 'marketing_vendas', 'impostos_taxas', 'operacional_pessoal', 'outros'
  )),
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  recorrente VARCHAR(20) NOT NULL DEFAULT 'mensal' CHECK (recorrente IN ('unica', 'mensal', 'anual')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Tabela faturas
CREATE TABLE IF NOT EXISTS public.faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id TEXT NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL,
  valor_plano DECIMAL(10,2) NOT NULL DEFAULT 29.90,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  vencimento_at DATE NOT NULL,
  pago_em TIMESTAMPTZ,
  pix_copia_cola TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers updated_at
CREATE TRIGGER trg_despesas_updated_at BEFORE UPDATE ON public.despesas FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_faturas_updated_at BEFORE UPDATE ON public.faturas FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "full_access" ON public.despesas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_access" ON public.faturas FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Pronto!
-- ============================================================
