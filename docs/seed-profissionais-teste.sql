-- ============================================================
-- Profiza — Profissionais fictícios para teste do chatbot
-- Execute SOMENTE em um projeto Supabase de teste, após:
--   1. docs/migration-v2.sql
--   2. docs/seed-bairros-bauru.sql
--
-- Estes registros geram leads reais no banco e o bot tenta enviar
-- notificações aos telefones inválidos abaixo. Nunca execute em produção.
-- ============================================================

BEGIN;

DO $$
DECLARE
  bairros_ausentes TEXT;
BEGIN
  SELECT string_agg(esperado.nome, ', ')
  INTO bairros_ausentes
  FROM (VALUES ('Santa Luzia'), ('Centro')) AS esperado(nome)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.bairros bairro WHERE bairro.nome = esperado.nome
  );

  IF bairros_ausentes IS NOT NULL THEN
    RAISE EXCEPTION 'Bairro(s) ausente(s): %. Execute docs/seed-bairros-bauru.sql no mesmo projeto Supabase antes deste seed.', bairros_ausentes;
  END IF;
END;
$$;

INSERT INTO public.profissionais (
  id, nome, whatsapp, categoria, ativo, nivel_verificacao,
  assinatura_status, atende_cidade_toda
)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'MOCK TESTE - Encanador Santa Luzia 1', '0000000000101', 'encanador', true, 1, 'trial', false),
  ('00000000-0000-4000-8000-000000000102', 'MOCK TESTE - Encanador Santa Luzia 2', '0000000000102', 'encanador', true, 1, 'trial', false),
  ('00000000-0000-4000-8000-000000000201', 'MOCK TESTE - Pedreiro Centro 1', '0000000000201', 'pedreiro', true, 1, 'trial', false),
  ('00000000-0000-4000-8000-000000000202', 'MOCK TESTE - Pedreiro Centro 2', '0000000000202', 'pedreiro', true, 1, 'trial', false),
  ('00000000-0000-4000-8000-000000000301', 'MOCK TESTE - Pintor Centro', '0000000000301', 'pintor', true, 1, 'trial', false),
  ('00000000-0000-4000-8000-000000000401', 'MOCK TESTE - Eletricista Bauru', '0000000000401', 'eletricista', true, 1, 'trial', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  whatsapp = EXCLUDED.whatsapp,
  categoria = EXCLUDED.categoria,
  ativo = EXCLUDED.ativo,
  nivel_verificacao = EXCLUDED.nivel_verificacao,
  assinatura_status = EXCLUDED.assinatura_status,
  atende_cidade_toda = EXCLUDED.atende_cidade_toda;

INSERT INTO public.profissional_bairros (profissional_id, bairro_id)
SELECT mock.profissional_id::uuid, bairro.id
FROM (VALUES
  ('00000000-0000-4000-8000-000000000101', 'Santa Luzia'),
  ('00000000-0000-4000-8000-000000000102', 'Santa Luzia'),
  ('00000000-0000-4000-8000-000000000201', 'Centro'),
  ('00000000-0000-4000-8000-000000000202', 'Centro'),
  ('00000000-0000-4000-8000-000000000301', 'Centro')
) AS mock(profissional_id, bairro_nome)
JOIN public.bairros AS bairro ON bairro.nome = mock.bairro_nome
ON CONFLICT (profissional_id, bairro_id) DO NOTHING;

COMMIT;