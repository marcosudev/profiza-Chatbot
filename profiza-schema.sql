create extension if not exists "pgcrypto";

create type status_pagamento_enum as enum ('ativo', 'inativo', 'teste_gratis');

create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome varchar(120) not null,
  whatsapp varchar(20) not null unique,
  categoria varchar(60) not null,
  bairro_atuacao text[] not null default '{}',
  status_pagamento status_pagamento_enum not null default 'teste_gratis',
  email varchar(160),
  observacoes text,
  teste_gratis_expira_em timestamptz,
  ativo_desde timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profissionais_categoria on public.profissionais (categoria);
create index idx_profissionais_bairro_atuacao on public.profissionais using gin (bairro_atuacao);
create index idx_profissionais_status on public.profissionais (status_pagamento);

create table public.metricas_bot (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null unique references public.profissionais(id) on delete cascade,
  leads_enviados int not null default 0,
  data_ultimo_lead timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads_eventos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  origem varchar(30) not null default 'whatsapp',
  created_at timestamptz not null default now()
);

create index idx_leads_eventos_profissional_data on public.leads_eventos (profissional_id, created_at);

create or replace function public.fn_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profissionais_updated_at
before update on public.profissionais
for each row execute function public.fn_set_updated_at();

create trigger trg_metricas_bot_updated_at
before update on public.metricas_bot
for each row execute function public.fn_set_updated_at();

create or replace function public.fn_atualiza_metricas_bot()
returns trigger as $$
begin
  insert into public.metricas_bot (profissional_id, leads_enviados, data_ultimo_lead)
  values (new.profissional_id, 1, new.created_at)
  on conflict (profissional_id)
  do update set
    leads_enviados = public.metricas_bot.leads_enviados + 1,
    data_ultimo_lead = new.created_at,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_leads_eventos_after_insert
after insert on public.leads_eventos
for each row execute function public.fn_atualiza_metricas_bot();

alter table public.profissionais enable row level security;
alter table public.metricas_bot enable row level security;
alter table public.leads_eventos enable row level security;

create policy "admin_full_access_profissionais"
  on public.profissionais
  for all
  to authenticated
  using (true)
  with check (true);

create policy "admin_full_access_metricas"
  on public.metricas_bot
  for all
  to authenticated
  using (true)
  with check (true);

create policy "admin_full_access_leads_eventos"
  on public.leads_eventos
  for all
  to authenticated
  using (true)
  with check (true);
