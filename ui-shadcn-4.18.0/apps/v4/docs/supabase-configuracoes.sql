-- ============================================================
-- PROFIZA — Tabela de configurações do sistema
-- Rodar após supabase-complementar.sql
-- ============================================================

create table if not exists configuracoes (
  id                    text primary key default 'singleton',
  cidade                text not null default 'Bauru - SP',
  trial_days            int not null default 30,
  subscription_price    numeric(10,2) not null default 29.90,
  notif_teste_vencendo  boolean not null default true,
  notif_novo_lead       boolean not null default false,
  notif_sem_resposta    boolean not null default true,
  updated_at            timestamptz default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'configuracoes_singleton'
      and conrelid = 'configuracoes'::regclass
  ) then
    alter table configuracoes add constraint configuracoes_singleton
      check (id = 'singleton');
  end if;
end $$;

drop trigger if exists trg_configuracoes_updated_at on configuracoes;
create trigger trg_configuracoes_updated_at
before update on configuracoes
for each row execute function fn_set_updated_at();

alter table configuracoes enable row level security;

drop policy if exists "admin full access configuracoes" on configuracoes;
create policy "admin full access configuracoes"
  on configuracoes for all
  using (auth.role() = 'authenticated');

insert into configuracoes (id) values ('singleton') on conflict do nothing;

-- Atualiza a configuração existente para o valor atual do plano.
update configuracoes
set trial_days = 30,
    subscription_price = 29.90
where id = 'singleton';

update profissionais
set teste_gratis_expira_em = created_at + interval '30 days'
where status = 'teste_gratis'
  and created_at is not null;
