-- ============================================================
-- Profiza: Cobrança por Lead Entregue
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp TEXT NOT NULL UNIQUE,
  nome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar tabela de leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id),
  profissional_id UUID REFERENCES public.profissionais(id),
  
  -- Dados do cliente
  nome_cliente TEXT,
  whatsapp_cliente TEXT,
  
  -- Dados extraídos pela IA
  categoria TEXT NOT NULL,
  bairro TEXT,
  urgencia TEXT DEFAULT 'normal',
  descricao TEXT,
  
  -- Canal e status
  canal TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'novo' CHECK (status IN (
    'novo', 'enviado', 'sem_resposta', 'convertido',
    'contato_enviado', 'entrega_confirmada', 'cobrado', 'cancelado', 'falhou'
  )),
  
  -- Cobrança
  valor DECIMAL(10,2) DEFAULT 10.00,
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

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_profissional ON public.leads(profissional_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_mensagem_id ON public.leads(mensagem_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Trigger updated_at para leads
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 3. Adicionar colunas na tabela profissionais
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS ativo_para_leads BOOLEAN DEFAULT true;
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS valor_lead DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS saldo_devedor DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS mercado_pago_id TEXT;

-- Renomear bairro_atuacao para bairros (se ainda não foi feito)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profissionais' AND column_name = 'bairro_atuacao'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profissionais' AND column_name = 'bairros'
  ) THEN
    ALTER TABLE public.profissionais RENAME COLUMN bairro_atuacao TO bairros;
  END IF;
END $$;

-- 4. Criar tabela de cobranças
CREATE TABLE IF NOT EXISTS public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) UNIQUE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id),
  
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

-- Índices para cobranças
CREATE INDEX IF NOT EXISTS idx_cobrancas_profissional ON public.cobrancas(profissional_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status ON public.cobrancas(status);

-- 5. Criar tabela de logs
CREATE TABLE IF NOT EXISTS public.logs_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade TEXT NOT NULL,
  entidade_id UUID,
  evento TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_entidade ON public.logs_eventos(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_logs_evento ON public.logs_eventos(evento);

-- 6. Funções para saldo devedor
CREATE OR REPLACE FUNCTION public.incrementar_saldo_devedor(
  p_profissional_id UUID,
  p_valor DECIMAL
)
RETURNS void AS $$
BEGIN
  UPDATE public.profissionais
  SET saldo_devedor = saldo_devedor + p_valor,
      updated_at = now()
  WHERE id = p_profissional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrementar_saldo_devedor(
  p_profissional_id UUID,
  p_valor DECIMAL
)
RETURNS void AS $$
BEGIN
  UPDATE public.profissionais
  SET saldo_devedor = GREATEST(0, saldo_devedor - p_valor),
      updated_at = now()
  WHERE id = p_profissional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS para novas tabelas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT WITH CHECK (true);

-- Políticas para leads
CREATE POLICY "leads_select" ON public.leads FOR SELECT USING (true);
CREATE POLICY "leads_insert" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_update" ON public.leads FOR UPDATE USING (true);

-- Políticas para cobranças
CREATE POLICY "cobrancas_select" ON public.cobrancas FOR SELECT USING (true);
CREATE POLICY "cobrancas_insert" ON public.cobrancas FOR INSERT WITH CHECK (true);
CREATE POLICY "cobrancas_update" ON public.cobrancas FOR UPDATE USING (true);

-- Políticas para logs
CREATE POLICY "logs_select" ON public.logs_eventos FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON public.logs_eventos FOR INSERT WITH CHECK (true);

-- ============================================================
-- Pronto! Execute este script no Supabase SQL Editor
-- ============================================================
