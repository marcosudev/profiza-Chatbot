-- ============================================================
-- PROFIZA — Schema inicial
-- Rodar no Supabase SQL Editor
-- ============================================================

-- Profissionais
create table if not exists profissionais (
  id                      text primary key default gen_random_uuid()::text,
  nome                    text not null,
  whatsapp                text not null,
  categoria               text not null,
  bairros                 text[] not null default '{}',
  status                  text not null default 'teste_gratis'
                            check (status in ('ativo','inativo','teste_gratis')),
  email                   text,
  teste_gratis_expira_em  timestamptz,
  leads_semana            int not null default 0,
  ultima_atividade        timestamptz default now(),
  created_at              timestamptz default now()
);

-- Leads
create table if not exists leads (
  id                  text primary key default gen_random_uuid()::text,
  nome_cliente        text not null,
  whatsapp_cliente    text not null,
  contato_hash        text,
  categoria           text not null,
  bairro              text not null,
  status              text not null default 'novo'
                        check (status in ('novo','enviado','sem_resposta','convertido')),
  profissional_id     text references profissionais(id) on delete set null,
  created_at          timestamptz default now()
);

-- Cobranças
create table if not exists cobrancas (
  id                  text primary key default gen_random_uuid()::text,
  profissional_id     text references profissionais(id) on delete cascade,
  valor               numeric(10,2) not null,
  vencimento          date not null,
  status              text not null default 'pendente'
                        check (status in ('pendente','pago','atrasado')),
  created_at          timestamptz default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table profissionais enable row level security;
alter table leads enable row level security;
alter table cobrancas enable row level security;

create policy "admin full access profissionais"
  on profissionais for all
  using (auth.role() = 'authenticated');

create policy "admin full access leads"
  on leads for all
  using (auth.role() = 'authenticated');

create policy "admin full access cobrancas"
  on cobrancas for all
  using (auth.role() = 'authenticated');

-- ============================================================
-- Seed — dados mock iniciais
-- ============================================================
insert into profissionais (id, nome, whatsapp, categoria, bairros, status, email, teste_gratis_expira_em, leads_semana, ultima_atividade) values
  ('p-101','Carlos Andrade','+5514999990101','Eletricista',array['Centro','Jardim Europa'],'ativo','carlos@profiza.com.br','2026-08-29T00:00:00Z',18,'2026-08-21T08:15:00Z'),
  ('p-102','Marina Costa','+5514999990102','Diarista',array['Vila São José','Bela Vista'],'teste_gratis','marina@profiza.com.br','2026-08-27T00:00:00Z',11,'2026-08-20T14:40:00Z'),
  ('p-103','Roberto Silva','+5514999990103','Encanador',array['Alto da Colina','Jardim das Flores'],'ativo','roberto@profiza.com.br','2026-09-01T00:00:00Z',24,'2026-08-21T09:45:00Z'),
  ('p-104','Patrícia Lima','+5514999990104','Limpeza',array['Parque São Paulo','Vila Nery'],'inativo','patricia@profiza.com.br','2026-08-18T00:00:00Z',3,'2026-08-12T18:20:00Z'),
  ('p-105','Jorge Mendes','+5514999990105','Pedreiro',array['Centro','Vila Nery'],'teste_gratis','jorge@profiza.com.br','2026-08-24T00:00:00Z',7,'2026-08-21T07:10:00Z'),
  ('p-106','Amanda Rocha','+5514999990106','Pintor',array['Jardim Europa','Bela Vista'],'ativo','amanda@profiza.com.br','2026-09-03T00:00:00Z',15,'2026-08-20T10:20:00Z'),
  ('p-107','Fernando Souza','+5514999990107','Eletricista',array['Alto da Colina','Centro'],'ativo','fernando@profiza.com.br','2026-09-05T00:00:00Z',12,'2026-08-21T11:30:00Z'),
  ('p-108','Luciana Martins','+5514999990108','Diarista',array['Jardim das Flores','Parque São Paulo'],'teste_gratis','luciana@profiza.com.br','2026-08-30T00:00:00Z',9,'2026-08-20T16:45:00Z'),
  ('p-109','Ricardo Oliveira','+5514999990109','Montador',array['Bela Vista','Vila São José'],'ativo','ricardo@profiza.com.br','2026-09-10T00:00:00Z',21,'2026-08-21T14:20:00Z'),
  ('p-110','Camila Santos','+5514999990110','Arquiteto',array['Centro','Jardim Europa','Alto da Colina'],'ativo','camila@profiza.com.br','2026-09-15T00:00:00Z',8,'2026-08-19T09:00:00Z'),
  ('p-111','Paulo Henrique','+5514999990111','Encanador',array['Vila Nery','Parque São Paulo'],'teste_gratis','paulo@profiza.com.br','2026-08-25T00:00:00Z',5,'2026-08-18T13:15:00Z'),
  ('p-112','Beatriz Almeida','+5514999990112','Limpeza',array['Jardim das Flores','Bela Vista'],'inativo','beatriz@profiza.com.br','2026-08-10T00:00:00Z',0,'2026-08-05T10:00:00Z')
on conflict (id) do nothing;
