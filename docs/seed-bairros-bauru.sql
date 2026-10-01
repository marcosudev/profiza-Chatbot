-- ============================================================
-- Profiza — Seed de regiões e bairros de Bauru/SP
-- Execute no Supabase SQL Editor APÓS a migration-v2.sql
-- ============================================================

-- Garante que Bauru existe
INSERT INTO public.cidades (id, nome, uf, ativa)
VALUES (1, 'Bauru', 'SP', true)
ON CONFLICT (id) DO NOTHING;

-- Regiões
INSERT INTO public.regioes (nome, cidade_id) VALUES
  ('Central',      1),
  ('Norte',        1),
  ('Sul',          1),
  ('Leste',        1),
  ('Oeste',        1),
  ('Universitária',1)
ON CONFLICT (nome) DO NOTHING;

-- Bairros — Central
INSERT INTO public.bairros (nome, apelidos, regiao_id, cidade_id, latitude, longitude)
SELECT b.nome, b.apelidos, r.id, 1, b.lat, b.lng
FROM (VALUES
  ('Centro',          ARRAY['centro','centro de bauru'],          -22.3154, -49.0608),
  ('Vila Falcão',     ARRAY['falcão','vila falcao','falcao'],      -22.3200, -49.0650),
  ('Jardim Bela Vista',ARRAY['bela vista'],                       -22.3180, -49.0580),
  ('Vila Cardia',     ARRAY['cardia'],                            -22.3220, -49.0620),
  ('Vila Aviação',    ARRAY['aviação','aviacao'],                  -22.3100, -49.0550),
  ('Jardim Panorama', ARRAY['panorama'],                          -22.3250, -49.0590)
) AS b(nome, apelidos, lat, lng)
JOIN public.regioes r ON r.nome = 'Central'
ON CONFLICT DO NOTHING;

-- Bairros — Norte
INSERT INTO public.bairros (nome, apelidos, regiao_id, cidade_id)
SELECT 'Santa Luzia', ARRAY['santa luzia','st luzia','sta luzia','vila santa luzia'], r.id, 1
FROM public.regioes r
WHERE r.nome = 'Norte'
  AND NOT EXISTS (
    SELECT 1 FROM public.bairros b
    WHERE b.nome = 'Santa Luzia' AND b.cidade_id = 1
  );

INSERT INTO public.bairros (nome, apelidos, regiao_id, cidade_id, latitude, longitude)
SELECT b.nome, b.apelidos, r.id, 1, b.lat, b.lng
FROM (VALUES
  ('Jardim Estoril',       ARRAY['estoril'],                              -22.2980, -49.0620),
  ('Parque Jaraguá',       ARRAY['jaraguá','jaragua'],                    -22.2900, -49.0580),
  ('Vila São Paulo',       ARRAY['são paulo','sao paulo'],                -22.2950, -49.0700),
  ('Jardim Redentor',      ARRAY['redentor'],                             -22.2870, -49.0640),
  ('Jardim Progresso',     ARRAY['progresso'],                            -22.2920, -49.0660),
  ('Vila Independência',   ARRAY['independência','independencia'],        -22.3010, -49.0680),
  ('Parque Santa Edwiges', ARRAY['santa edwiges','edwiges'],              -22.2860, -49.0600)
) AS b(nome, apelidos, lat, lng)
JOIN public.regioes r ON r.nome = 'Norte'
ON CONFLICT DO NOTHING;

-- Bairros — Sul
INSERT INTO public.bairros (nome, apelidos, regiao_id, cidade_id, latitude, longitude)
SELECT b.nome, b.apelidos, r.id, 1, b.lat, b.lng
FROM (VALUES
  ('Mary Dota',          ARRAY['mary dota','mary'],                  -22.3450, -49.0620),
  ('Jardim Godoy',       ARRAY['godoy'],                             -22.3500, -49.0580),
  ('Vila Guedes',        ARRAY['guedes'],                            -22.3420, -49.0650),
  ('Jardim Ferraz',      ARRAY['ferraz'],                            -22.3380, -49.0600),
  ('Parque Paulistano',  ARRAY['paulistano'],                        -22.3480, -49.0700),
  ('Jardim Petrópolis',  ARRAY['petrópolis','petropolis'],           -22.3550, -49.0640),
  ('Vila Lemos',         ARRAY['lemos'],                             -22.3400, -49.0580)
) AS b(nome, apelidos, lat, lng)
JOIN public.regioes r ON r.nome = 'Sul'
ON CONFLICT DO NOTHING;

-- Bairros — Leste
INSERT INTO public.bairros (nome, apelidos, regiao_id, cidade_id, latitude, longitude)
SELECT b.nome, b.apelidos, r.id, 1, b.lat, b.lng
FROM (VALUES
  ('Jardim Contorno', ARRAY['contorno'],          -22.3200, -49.0400),
  ('Vila Dutra',      ARRAY['dutra'],              -22.3150, -49.0350),
  ('Jardim Flórida',  ARRAY['flórida','florida'],  -22.3100, -49.0420),
  ('Parque Viaduto',  ARRAY['viaduto'],             -22.3250, -49.0380),
  ('Jardim Eldorado', ARRAY['eldorado'],            -22.3180, -49.0450),
  ('Vila Souto',      ARRAY['souto'],               -22.3220, -49.0480)
) AS b(nome, apelidos, lat, lng)
JOIN public.regioes r ON r.nome = 'Leste'
ON CONFLICT DO NOTHING;

-- Bairros — Oeste
INSERT INTO public.bairros (nome, apelidos, regiao_id, cidade_id, latitude, longitude)
SELECT b.nome, b.apelidos, r.id, 1, b.lat, b.lng
FROM (VALUES
  ('Jardim Bongiovani', ARRAY['bongiovani'],          -22.3150, -49.0800),
  ('Parque das Nações', ARRAY['nações','nacoes'],      -22.3200, -49.0850),
  ('Jardim Solange',    ARRAY['solange'],              -22.3100, -49.0780),
  ('Vila Camargo',      ARRAY['camargo'],              -22.3250, -49.0820)
) AS b(nome, apelidos, lat, lng)
JOIN public.regioes r ON r.nome = 'Oeste'
ON CONFLICT DO NOTHING;

-- Bairros — Universitária
INSERT INTO public.bairros (nome, apelidos, regiao_id, cidade_id, latitude, longitude)
SELECT b.nome, b.apelidos, r.id, 1, b.lat, b.lng
FROM (VALUES
  ('Jardim Universitário',           ARRAY['universitário','universitario','unesp','perto da unesp'], -22.3300, -49.0750),
  ('Vila Nova Cidade Universitária', ARRAY['nova cidade universitária','nova cidade'],                -22.3350, -49.0780),
  ('Vila Universitária',             ARRAY['vila universitária','vila universitaria'],                -22.3280, -49.0720)
) AS b(nome, apelidos, lat, lng)
JOIN public.regioes r ON r.nome = 'Universitária'
ON CONFLICT DO NOTHING;

-- Pontos de referência geográfica
INSERT INTO public.referencias_geograficas (nome, apelidos, bairro_id, cidade_id)
SELECT ref.nome, ref.apelidos, b.id, 1
FROM (VALUES
  ('Shopping Bauru',  ARRAY['shopping','shopping bauru'],  'Jardim Estoril'),
  ('UNESP',           ARRAY['unesp','faculdade'],          'Jardim Universitário'),
  ('Aeroporto',       ARRAY['aeroporto'],                  'Vila Aviação'),
  ('Rodoviária',      ARRAY['rodoviária','rodoviaria'],    'Centro'),
  ('Santa Casa',      ARRAY['santa casa','hospital'],      'Centro')
) AS ref(nome, apelidos, bairro_nome)
JOIN public.bairros b ON b.nome = ref.bairro_nome
ON CONFLICT DO NOTHING;

-- ============================================================
-- Pronto! Bairros e regiões de Bauru populados.
-- ============================================================
