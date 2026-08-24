-- ============================================================
-- Seed de leads_eventos
-- Simula histórico de leads enviados via bot para cada profissional.
-- O trigger fn_atualiza_metricas_bot popula metricas_bot automaticamente.
-- ============================================================

insert into leads_eventos (profissional_id, origem, created_at) values
  -- p-101 Carlos Eletricista (5 leads)
  ('p-101', 'whatsapp', now() - interval '1 day'),
  ('p-101', 'whatsapp', now() - interval '3 days'),
  ('p-101', 'whatsapp', now() - interval '8 days'),
  ('p-101', 'whatsapp', now() - interval '15 days'),
  ('p-101', 'whatsapp', now() - interval '22 days'),

  -- p-102 Ana Diarista (3 leads)
  ('p-102', 'whatsapp', now() - interval '2 days'),
  ('p-102', 'whatsapp', now() - interval '9 days'),
  ('p-102', 'whatsapp', now() - interval '18 days'),

  -- p-103 Roberto Encanador (4 leads)
  ('p-103', 'whatsapp', now() - interval '1 day'),
  ('p-103', 'whatsapp', now() - interval '5 days'),
  ('p-103', 'whatsapp', now() - interval '12 days'),
  ('p-103', 'whatsapp', now() - interval '20 days'),

  -- p-104 Fernanda Pintora (2 leads)
  ('p-104', 'whatsapp', now() - interval '4 days'),
  ('p-104', 'whatsapp', now() - interval '14 days'),

  -- p-105 Marcos Pedreiro (6 leads)
  ('p-105', 'whatsapp', now() - interval '1 day'),
  ('p-105', 'whatsapp', now() - interval '2 days'),
  ('p-105', 'whatsapp', now() - interval '6 days'),
  ('p-105', 'whatsapp', now() - interval '10 days'),
  ('p-105', 'whatsapp', now() - interval '17 days'),
  ('p-105', 'whatsapp', now() - interval '25 days'),

  -- p-106 Juliana Pintora (4 leads)
  ('p-106', 'whatsapp', now() - interval '3 days'),
  ('p-106', 'whatsapp', now() - interval '7 days'),
  ('p-106', 'whatsapp', now() - interval '13 days'),
  ('p-106', 'whatsapp', now() - interval '21 days'),

  -- p-107 Diego Eletricista (3 leads)
  ('p-107', 'whatsapp', now() - interval '2 days'),
  ('p-107', 'whatsapp', now() - interval '11 days'),
  ('p-107', 'whatsapp', now() - interval '19 days'),

  -- p-108 Patrícia Limpeza (2 leads)
  ('p-108', 'whatsapp', now() - interval '5 days'),
  ('p-108', 'whatsapp', now() - interval '16 days'),

  -- p-109 Rafael Pedreiro (1 lead)
  ('p-109', 'whatsapp', now() - interval '6 days'),

  -- p-110 Camila Diarista (3 leads)
  ('p-110', 'whatsapp', now() - interval '1 day'),
  ('p-110', 'whatsapp', now() - interval '8 days'),
  ('p-110', 'whatsapp', now() - interval '23 days'),

  -- p-111 Thiago Encanador (2 leads)
  ('p-111', 'whatsapp', now() - interval '4 days'),
  ('p-111', 'whatsapp', now() - interval '24 days'),

  -- p-112 Beatriz Limpeza (1 lead)
  ('p-112', 'whatsapp', now() - interval '7 days');
