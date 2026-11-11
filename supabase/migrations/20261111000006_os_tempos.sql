create table if not exists os_tempos (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
  fase text not null,
  responsavel text,
  inicio timestamptz not null,
  fim timestamptz not null,
  minutos integer generated always as (greatest(0, (extract(epoch from (fim - inicio)) / 60)::integer)) stored,
  notas text,
  created_at timestamptz default now()
);
create index if not exists os_tempos_os_idx on os_tempos(ordem_servico_id, fase);
alter table os_tempos enable row level security;
drop policy if exists authenticated_full_access on os_tempos;
create policy authenticated_full_access on os_tempos for all to authenticated using (true) with check (true);
