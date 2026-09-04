-- ============================================================
-- Profiza: Criar Tabelas Financeiras (despesas e faturas)
-- Execute este script no Supabase SQL Editor para criar as tabelas financeiras!
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id TEXT NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL,
  valor_plano DECIMAL(10,2) NOT NULL DEFAULT 49.90,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  vencimento_at DATE NOT NULL,
  pago_em TIMESTAMPTZ,
  pix_copia_cola TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- Permissões de Acesso
DROP POLICY IF EXISTS "full_access" ON public.despesas;
CREATE POLICY "full_access" ON public.despesas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "full_access" ON public.faturas;
CREATE POLICY "full_access" ON public.faturas FOR ALL USING (true) WITH CHECK (true);

SELECT 'Tabelas financeiras (despesas e faturas) criadas com sucesso no Supabase!' AS status;
