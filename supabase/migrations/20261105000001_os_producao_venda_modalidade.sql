-- Etapas de produção do ateliê por OS, modalidade venda/locação nos produtos e itens, orçamento -> pedido de venda
create table if not exists public.os_producao (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  fase text not null,
  ordem integer not null default 0,
  titulo text not null,
  responsavel text,
  status text not null default 'pendente' check (status in ('pendente','andamento','concluida')),
  prazo date,
  concluida_em timestamptz,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists os_producao_os_idx on public.os_producao (ordem_servico_id, ordem);
alter table public.os_producao enable row level security;
drop policy if exists authenticated_full_access on public.os_producao;
create policy authenticated_full_access on public.os_producao for all to authenticated using (true) with check (true);

alter table public.pedidos_venda_itens add column if not exists modalidade text not null default 'venda';
alter table public.pedidos_venda_itens add column if not exists produto_id uuid references public.produtos(id) on delete set null;
alter table public.pedidos_venda add column if not exists orcamento_id uuid references public.orcamentos(id) on delete set null;
alter table public.pedidos_venda add column if not exists entrega_em date;
alter table public.produtos add column if not exists modalidade text not null default 'venda';
alter table public.produtos add column if not exists preco_locacao numeric;
