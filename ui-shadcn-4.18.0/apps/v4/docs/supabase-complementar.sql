-- ============================================================
-- PROFIZA — Tabelas complementares (rodar após supabase-schema.sql)
-- ============================================================

-- Tabela de agregado rápido (cache de métricas por profissional)
create table if not exists metricas_bot (
  id                  text primary key default gen_random_uuid()::text,
  profissional_id     text not null unique references profissionais(id) on delete cascade,
  leads_enviados      int not null default 0,
  data_ultimo_lead    timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Log de eventos de lead (permite métricas por janela de tempo)
create table if not exists leads_eventos (
  id                  text primary key default gen_random_uuid()::text,
  profissional_id     text not null references profissionais(id) on delete cascade,
  origem              varchar(30) not null default 'whatsapp',
  created_at          timestamptz not null default now()
);

create index if not exists idx_leads_eventos_profissional_data
  on leads_eventos (profissional_id, created_at);

-- RLS
alter table metricas_bot enable row level security;
alter table leads_eventos enable row level security;

create policy "admin full access metricas_bot"
  on metricas_bot for all
  using (auth.role() = 'authenticated');

create policy "admin full access leads_eventos"
  on leads_eventos for all
  using (auth.role() = 'authenticated');

-- Trigger updated_at para metricas_bot
create or replace function fn_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_metricas_bot_updated_at
before update on metricas_bot
for each row execute function fn_set_updated_at();

-- Trigger que sincroniza metricas_bot a cada novo leads_evento
create or replace function fn_atualiza_metricas_bot()
returns trigger as $$
begin
  insert into metricas_bot (profissional_id, leads_enviados, data_ultimo_lead)
  values (new.profissional_id, 1, new.created_at)
  on conflict (profissional_id)
  do update set
    leads_enviados = metricas_bot.leads_enviados + 1,
    data_ultimo_lead = new.created_at,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_leads_eventos_after_insert
after insert on leads_eventos
for each row execute function fn_atualiza_metricas_bot();

-- ============================================================
-- Seed de leads para teste
-- ============================================================
insert into leads (id, nome_cliente, whatsapp_cliente, categoria, bairro, status, profissional_id) values
  ('l-1','Maria Silva','+5514998887766','Eletricista','Centro','enviado','p-101'),
  ('l-2','João Santos','+5514997776655','Encanador','Jardim Europa','enviado','p-103'),
  ('l-3','Ana Costa','+5514996665544','Diarista','Vila São José','novo','p-102'),
  ('l-4','Pedro Lima','+5514995554433','Pintor','Bela Vista','enviado','p-106'),
  ('l-5','Carla Mendes','+5514994443322','Pedreiro','Alto da Colina','sem_resposta', null),
  ('l-6','Lucas Ferreira','+5514993332211','Eletricista','Jardim das Flores','enviado','p-101'),
  ('l-7','Fernanda Oliveira','+5514992221100','Diarista','Centro','convertido','p-102'),
  ('l-8','Ricardo Souza','+5514991110099','Encanador','Vila Nery','sem_resposta',null),
  ('l-9','Juliana Martins','+5514990009988','Pintor','Parque São Paulo','enviado','p-106'),
  ('l-10','Marcos Almeida','+5514989998877','Eletricista','Bela Vista','convertido','p-107'),
  ('l-11','Patricia Rocha','+5514988887766','Limpeza','Centro','novo',null),
  ('l-12','Bruno Costa','+5514987776655','Pedreiro','Jardim Europa','sem_resposta',null)
on conflict (id) do nothing;
