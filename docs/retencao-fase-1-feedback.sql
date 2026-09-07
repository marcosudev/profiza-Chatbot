-- Profiza: feedback do profissional sobre oportunidades
-- Execute depois do schema principal no Supabase SQL Editor.

alter table public.leads
  add column if not exists feedback_status text,
  add column if not exists feedback_observacao text,
  add column if not exists feedback_at timestamptz;

alter table public.leads
  drop constraint if exists leads_feedback_status_check;

alter table public.leads
  add constraint leads_feedback_status_check check (feedback_status is null or feedback_status in (
    'cliente_respondeu',
    'orcamento_enviado',
    'servico_fechado',
    'sem_resposta',
    'contato_invalido'
  ));

create index if not exists idx_leads_feedback_pendente
  on public.leads (profissional_id, created_at)
  where feedback_status is null and profissional_id is not null;

create table if not exists public.relatorios_semanais_profissionais (
  id uuid primary key default gen_random_uuid(),
  -- O schema ativo do painel usa TEXT para profissionais.id.
  profissional_id text not null references public.profissionais(id) on delete cascade,
  semana_inicio date not null,
  enviado_em timestamptz not null default now(),
  unique (profissional_id, semana_inicio)
);

alter table public.relatorios_semanais_profissionais enable row level security;

drop policy if exists "admin_full_access_relatorios_semanais"
  on public.relatorios_semanais_profissionais;

create policy "admin_full_access_relatorios_semanais"
  on public.relatorios_semanais_profissionais
  for all
  to authenticated
  using (true)
  with check (true);