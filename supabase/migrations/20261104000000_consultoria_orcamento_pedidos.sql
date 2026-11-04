-- Fase 2, 4 e 5: arquivos da OS (fotos, croqui, comprovantes), materiais com 3 cotações,
-- planilha de formação de preço do orçamento, pedidos de venda e recebimentos.
-- 100% idempotente e só adiciona: não apaga nem altera dados existentes.

-- ───────────── Armazenamento de arquivos (privado) ─────────────
insert into storage.buckets (id, name, public) values ('os-arquivos', 'os-arquivos', false) on conflict (id) do nothing;
drop policy if exists os_arquivos_authenticated on storage.objects;
create policy os_arquivos_authenticated on storage.objects for all to authenticated
  using (bucket_id = 'os-arquivos') with check (bucket_id = 'os-arquivos');

create table if not exists public.os_arquivos (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid references public.ordens_servico(id) on delete cascade,
  cliente_id uuid references public.clientes(id),
  categoria text not null default 'outro',   -- foto_cliente | croqui | referencia | tecido | comprovante | imagem_ia | prova | outro
  caminho text not null,
  nome text,
  legenda text,
  prompt text,
  created_at timestamptz not null default now()
);
create index if not exists os_arquivos_os_idx on public.os_arquivos (ordem_servico_id, categoria);
create index if not exists os_arquivos_cliente_idx on public.os_arquivos (cliente_id);

-- ───────────── Materiais da OS (lista de compras/pesquisa + planilha de preço) ─────────────
create table if not exists public.os_materiais (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo text not null default 'tecido',       -- tecido | forro | aviamento | enchimento | outro
  descricao text not null,
  metragem numeric not null default 1,
  unidade text not null default 'm',
  cot1_fornecedor text, cot1_valor numeric,
  cot2_fornecedor text, cot2_valor numeric,
  cot3_fornecedor text, cot3_valor numeric,
  escolhida integer check (escolhida in (1,2,3)),   -- qual cotação foi escolhida (valor unitário)
  referencia_arquivo_id uuid references public.os_arquivos(id) on delete set null,
  observacoes text,
  comprado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists os_materiais_os_idx on public.os_materiais (ordem_servico_id);

-- ───────────── Dossiê ligado à OS ─────────────
alter table public.dossies add column if not exists ordem_servico_id uuid references public.ordens_servico(id) on delete cascade;
alter table public.dossies add column if not exists titulo text;
alter table public.dossies add column if not exists updated_at timestamptz default now();

-- ───────────── Orçamento = planilha de formação de preço ─────────────
alter table public.orcamentos add column if not exists ordem_servico_id uuid references public.ordens_servico(id) on delete cascade;
alter table public.orcamentos add column if not exists numero text;
alter table public.orcamentos add column if not exists descricao text;
alter table public.orcamentos add column if not exists valor_hora numeric default 0;
alter table public.orcamentos add column if not exists horas_molde numeric default 0;
alter table public.orcamentos add column if not exists horas_corte numeric default 0;
alter table public.orcamentos add column if not exists horas_montagem numeric default 0;
alter table public.orcamentos add column if not exists horas_provas numeric default 0;
alter table public.orcamentos add column if not exists outros_custos numeric default 0;
alter table public.orcamentos add column if not exists taxa_cartao_pct numeric default 0;
alter table public.orcamentos add column if not exists nota_pct numeric default 0;
alter table public.orcamentos add column if not exists desconto_dinheiro_pct numeric default 0;
alter table public.orcamentos add column if not exists margem_lucro_pct numeric default 30;
alter table public.orcamentos add column if not exists parcelas integer default 1;
alter table public.orcamentos add column if not exists custo_materiais numeric default 0;
alter table public.orcamentos add column if not exists custo_mao_de_obra numeric default 0;
alter table public.orcamentos add column if not exists custo_total numeric default 0;
alter table public.orcamentos add column if not exists preco_final numeric default 0;
alter table public.orcamentos add column if not exists preco_dinheiro numeric default 0;
alter table public.orcamentos add column if not exists lucro_estimado numeric default 0;
alter table public.orcamentos add column if not exists texto_whatsapp text;
alter table public.orcamentos add column if not exists validade date;
alter table public.orcamentos add column if not exists enviado_em timestamptz;
alter table public.orcamentos add column if not exists aprovado_em timestamptz;
alter table public.orcamentos add column if not exists updated_at timestamptz default now();

-- ───────────── Datas do pedido ─────────────
alter table public.ordens_servico add column if not exists data_entrega_prevista date;
alter table public.ordens_servico add column if not exists data_tecidos_medidas date;

-- ───────────── Financeiro: recebimentos com comprovante ─────────────
alter table public.financeiro_receber add column if not exists cliente_id uuid references public.clientes(id);
alter table public.financeiro_receber add column if not exists orcamento_id uuid references public.orcamentos(id) on delete set null;
alter table public.financeiro_receber add column if not exists pedido_venda_id uuid;
alter table public.financeiro_receber add column if not exists descricao text;
alter table public.financeiro_receber add column if not exists forma text;
alter table public.financeiro_receber add column if not exists parcela text;
alter table public.financeiro_receber add column if not exists pago_em timestamptz;
alter table public.financeiro_receber add column if not exists valor_pago numeric;
alter table public.financeiro_receber add column if not exists comprovante_arquivo_id uuid references public.os_arquivos(id) on delete set null;

-- ───────────── Pedidos de venda (sutiã, cinta, locação, sapatos, acessórios, flores) ─────────────
create table if not exists public.pedidos_venda (
  id uuid primary key default gen_random_uuid(),
  numero text,
  cliente_id uuid not null references public.clientes(id),
  ordem_servico_id uuid references public.ordens_servico(id) on delete set null,
  status text not null default 'aberto' check (status = any (array['aberto','pago','entregue','devolvido','cancelado'])),
  forma_pagamento text,
  desconto numeric not null default 0,
  total numeric not null default 0,
  observacoes text,
  created_at timestamptz not null default now()
);
create table if not exists public.pedidos_venda_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos_venda(id) on delete cascade,
  tipo text not null default 'outro',  -- sutia | cinta | locacao_roupa | sapato | acessorio | flores | outro
  descricao text not null,
  quantidade numeric not null default 1,
  valor_unit numeric not null default 0,
  retirada date,
  devolucao date
);
create index if not exists pedidos_venda_cliente_idx on public.pedidos_venda (cliente_id);
create index if not exists pedidos_venda_itens_pedido_idx on public.pedidos_venda_itens (pedido_id);

-- ───────────── Policies (usuária logada = acesso total) ─────────────
do $$
declare t text;
begin
  foreach t in array array['os_arquivos','os_materiais','pedidos_venda','pedidos_venda_itens','orcamentos','dossies','financeiro_receber','financeiro_pagar','fornecedores','provas','fichas_tecnicas','listas_materiais','feedback','marketing_conteudo'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists authenticated_full_access on public.%I', t);
    execute format('create policy authenticated_full_access on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
