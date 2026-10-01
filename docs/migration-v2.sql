-- ============================================================
-- Profiza Bot v2.3 — Novas tabelas
-- Execute no Supabase SQL Editor
-- ============================================================

-- Sessões persistidas (substitui memória do processo)
CREATE TABLE IF NOT EXISTS public.sessoes (
  contato_hash TEXT PRIMARY KEY,
  estado JSONB NOT NULL DEFAULT '{}',
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- IDs de mensagens já processadas (deduplicação)
CREATE TABLE IF NOT EXISTS public.mensagens_processadas (
  message_id TEXT PRIMARY KEY,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Cidades (preparação para múltiplas cidades)
CREATE TABLE IF NOT EXISTS public.cidades (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  uf CHAR(2) NOT NULL DEFAULT 'SP',
  ativa BOOLEAN DEFAULT false
);

INSERT INTO public.cidades (nome, uf, ativa) VALUES ('Bauru', 'SP', true)
  ON CONFLICT DO NOTHING;

-- Regiões de Bauru
CREATE TABLE IF NOT EXISTS public.regioes (
  id SERIAL PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL,
  cidade_id INT REFERENCES public.cidades(id) DEFAULT 1
);

-- Bairros oficiais
CREATE TABLE IF NOT EXISTS public.bairros (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  apelidos TEXT[] DEFAULT '{}',
  regiao_id INT REFERENCES public.regioes(id),
  cidade_id INT REFERENCES public.cidades(id) DEFAULT 1,
  latitude NUMERIC,
  longitude NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_bairros_nome ON public.bairros(nome);
CREATE INDEX IF NOT EXISTS idx_bairros_cidade ON public.bairros(cidade_id);

-- Corrige tipo do profissional_id na tabela faturas (era TEXT, deve ser UUID)
ALTER TABLE public.faturas ALTER COLUMN profissional_id TYPE UUID USING profissional_id::UUID;

-- Relação profissional ↔ bairros (substitui o array bairros[])
CREATE TABLE IF NOT EXISTS public.profissional_bairros (
  profissional_id UUID REFERENCES public.profissionais(id) ON DELETE CASCADE,
  bairro_id INT REFERENCES public.bairros(id) ON DELETE CASCADE,
  PRIMARY KEY (profissional_id, bairro_id)
);

CREATE INDEX IF NOT EXISTS idx_profissional_bairros_bairro ON public.profissional_bairros(bairro_id);

-- Pontos de referência geográfica ("perto do shopping", "na UNESP")
CREATE TABLE IF NOT EXISTS public.referencias_geograficas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  apelidos TEXT[] DEFAULT '{}',
  bairro_id INT REFERENCES public.bairros(id),
  cidade_id INT REFERENCES public.cidades(id) DEFAULT 1
);

-- Cliques nos links rastreáveis de contato
CREATE TABLE IF NOT EXISTS public.cliques_contato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id),
  clicado_em TIMESTAMPTZ DEFAULT now()
);

-- Ocorrências / reclamações
CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID REFERENCES public.profissionais(id),
  lead_id UUID REFERENCES public.leads(id),
  relato TEXT,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'procedente', 'improcedente')),
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Interesse em cidades ainda não cobertas
CREATE TABLE IF NOT EXISTS public.interesse_cidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_hash TEXT,
  cidade_texto TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Hash keyed do contato do cliente; novos leads não armazenam o telefone em texto claro
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contato_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_contato_hash
  ON public.leads(contato_hash);

-- Novos campos na tabela profissionais
ALTER TABLE public.profissionais
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nivel_verificacao SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS assinatura_status TEXT DEFAULT 'trial'
    CHECK (assinatura_status IN ('trial','ativa','inadimplente','cancelada','suspenso')),
  ADD COLUMN IF NOT EXISTS trial_ate DATE,
  ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT,
  ADD COLUMN IF NOT EXISTS cadastrado_por TEXT,
  ADD COLUMN IF NOT EXISTS documento_conferido_em DATE,
  ADD COLUMN IF NOT EXISTS aceite_termos_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS atende_cidade_toda BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avaliacao NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS ultimo_lead_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_leads INT DEFAULT 0;

-- Limpeza automática de sessões expiradas (30 min)
CREATE OR REPLACE FUNCTION public.fn_limpar_sessoes_expiradas()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sessoes WHERE atualizado_em < now() - INTERVAL '30 minutes';
  DELETE FROM public.mensagens_processadas WHERE criado_em < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_processadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bairros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissional_bairros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referencias_geograficas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliques_contato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interesse_cidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full" ON public.sessoes;
CREATE POLICY "service_role_full" ON public.sessoes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.mensagens_processadas;
CREATE POLICY "service_role_full" ON public.mensagens_processadas FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.bairros;
CREATE POLICY "service_role_full" ON public.bairros FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.regioes;
CREATE POLICY "service_role_full" ON public.regioes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.cidades;
CREATE POLICY "service_role_full" ON public.cidades FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.profissional_bairros;
CREATE POLICY "service_role_full" ON public.profissional_bairros FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.referencias_geograficas;
CREATE POLICY "service_role_full" ON public.referencias_geograficas FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.cliques_contato;
CREATE POLICY "service_role_full" ON public.cliques_contato FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.ocorrencias;
CREATE POLICY "service_role_full" ON public.ocorrencias FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full" ON public.interesse_cidades;
CREATE POLICY "service_role_full" ON public.interesse_cidades FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Pronto! Execute este arquivo no Supabase SQL Editor.
-- ============================================================
