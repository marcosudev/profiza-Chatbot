-- ============================================================
-- Profiza: Script de Limpeza Total e Reset para Produção
-- Execute no Supabase SQL Editor para apagar todos os dados de testes/mockups
-- e deixar a base 100% pronta para entrada de profissionais e clientes reais.
-- ============================================================

-- Limpa todas as tabelas operacionais em ordem de dependência
TRUNCATE TABLE public.cobrancas CASCADE;
TRUNCATE TABLE public.leads_eventos CASCADE;
TRUNCATE TABLE public.logs_eventos CASCADE;
TRUNCATE TABLE public.metricas_bot CASCADE;
TRUNCATE TABLE public.leads CASCADE;
TRUNCATE TABLE public.clientes CASCADE;
TRUNCATE TABLE public.profissionais CASCADE;

-- Garante que o registro singleton de configurações padrão existe
DELETE FROM public.configuracoes;
INSERT INTO public.configuracoes (id, notificacoes_email, notificacoes_whatsapp, auto_routing, tema)
VALUES ('singleton', true, true, true, 'system')
ON CONFLICT (id) DO NOTHING;

-- Mensagem de confirmação (retornada na aba Results do Supabase)
SELECT 'Banco de dados Profiza zerado com sucesso. Pronto para produção!' AS status;
