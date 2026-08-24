-- ============================================================
-- PROFIZA — Tabela de configurações do sistema
-- Rodar após supabase-complementar.sql
-- ============================================================

create table if not exists configuracoes (
  id                    text primary key default 'singleton',
  cidade                text not null default 'Bauru - SP',
  trial_days            int not null default 14,
  subscription_price    numeric(10,2) not null default 49.90,
  notif_teste_vencendo  boolean not null default true,
  notif_novo_lead       boolean not null default false,
  notif_sem_resposta    boolean not null default true,
  updated_at            timestamptz default now()
);

alter table configuracoes add constraint configuracoes_singleton
  check (id = 'singleton');

create trigger trg_configuracoes_updated_at
before update on configuracoes
for each row execute function fn_set_updated_at();

alter table configuracoes enable row level security;

create policy "admin full access configuracoes"
  on configuracoes for all
  using (auth.role() = 'authenticated');

insert into configuracoes (id) values ('singleton') on conflict do nothing;
