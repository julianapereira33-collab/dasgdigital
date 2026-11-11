-- Gestão de infoprodutos (Raio X do Estilo, Minha Paleta): catálogo, banco de clientes, respostas, resultado gerado, entrega e remarketing.
create table if not exists public.infoprodutos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  preco numeric not null default 0,
  descricao text,
  entrega_descricao text,
  url_funil text,
  checkout_url text,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.infoproduto_clientes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.infoprodutos(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  nome text, telefone text, email text, origem text,
  status text not null default 'lead' check (status in ('lead','quiz_respondido','comprou','entregue','recusou')),
  respostas jsonb, resultado text, resultado_json jsonb,
  valor_pago numeric, cakto_id text, comprado_em timestamptz,
  entregue_em timestamptz, entrega_canal text, entrega_obs text,
  remarketing_status text not null default 'nao' check (remarketing_status in ('nao','em_andamento','convertido','descartado')),
  remarketing_ultimo_contato timestamptz, remarketing_obs text,
  obs text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists infoproduto_clientes_produto_idx on public.infoproduto_clientes(produto_id, status);
create index if not exists infoproduto_clientes_tel_idx on public.infoproduto_clientes(telefone);
alter table public.infoprodutos enable row level security;
alter table public.infoproduto_clientes enable row level security;
create policy authenticated_full_access on public.infoprodutos for all to authenticated using (true) with check (true);
create policy authenticated_full_access on public.infoproduto_clientes for all to authenticated using (true) with check (true);

insert into public.infoprodutos(slug, nome, preco, descricao, entrega_descricao, ordem) values
 ('raio_x', 'Raio X do Estilo', 97, 'Análise de estilo pessoal por questionário: preferências, identidade visual e direções de estilo. Digital, sem atendimento humano.', 'Dossiê de estilo gerado por IA, enviado por e-mail e WhatsApp.', 1),
 ('minha_paleta', 'Minha Paleta', 147, 'Análise digital indicativa das cores pessoais a partir da foto e das respostas. Orientação, não equivale a teste presencial.', 'Relatório de cores gerado por IA (leitura da foto + quiz), enviado por e-mail e WhatsApp.', 2)
on conflict (slug) do nothing;

-- Registro vindo do n8n/funis (service_role): cria ou atualiza a cliente do infoproduto e liga ao cadastro de clientes pelo telefone.
create or replace function public.infoproduto_registrar(p_produto text, p_nome text, p_telefone text, p_email text default null, p_status text default 'lead',
  p_respostas jsonb default null, p_resultado text default null, p_valor numeric default null, p_cakto_id text default null, p_origem text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare pr record; d text; cid uuid; ic record; ordem_status text[] := array['lead','quiz_respondido','comprou','entregue'];
begin
  select * into pr from infoprodutos where slug = p_produto;
  if pr.id is null then return jsonb_build_object('ok', false, 'erro', 'produto desconhecido'); end if;
  d := right(regexp_replace(coalesce(p_telefone,''), '\D', '', 'g'), 11);
  if length(d) >= 10 then select id into cid from clientes where right(regexp_replace(coalesce(telefone,''), '\D', '', 'g'), 11) = d limit 1; end if;
  if cid is null and coalesce(p_email,'') <> '' then select id into cid from clientes where lower(email) = lower(p_email) limit 1; end if;
  if cid is null and p_status in ('comprou','entregue') and coalesce(p_nome,'') <> '' then
    insert into clientes(nome, telefone, email, origem) values (p_nome, p_telefone, p_email, 'infoproduto: '||pr.nome) returning id into cid;
  end if;
  select * into ic from infoproduto_clientes where produto_id = pr.id
    and ((length(d) >= 10 and right(regexp_replace(coalesce(telefone,''), '\D', '', 'g'), 11) = d) or (coalesce(p_email,'') <> '' and lower(email) = lower(p_email)))
    order by created_at desc limit 1;
  if ic.id is null then
    insert into infoproduto_clientes(produto_id, cliente_id, nome, telefone, email, origem, status, respostas, resultado, valor_pago, cakto_id, comprado_em, entregue_em)
    values (pr.id, cid, p_nome, p_telefone, p_email, p_origem, coalesce(p_status,'lead'), p_respostas, p_resultado, p_valor, p_cakto_id,
      case when p_status in ('comprou','entregue') then now() end, case when p_status = 'entregue' then now() end);
  else
    update infoproduto_clientes set
      cliente_id = coalesce(cliente_id, cid), nome = coalesce(nome, p_nome), email = coalesce(email, p_email),
      respostas = coalesce(p_respostas, respostas), resultado = coalesce(p_resultado, resultado),
      valor_pago = coalesce(p_valor, valor_pago), cakto_id = coalesce(p_cakto_id, cakto_id),
      status = case when array_position(ordem_status, coalesce(p_status, status)) > array_position(ordem_status, status) or status = 'recusou' then coalesce(p_status, status) else status end,
      comprado_em = case when p_status in ('comprou','entregue') then coalesce(comprado_em, now()) else comprado_em end,
      entregue_em = case when p_status = 'entregue' then coalesce(entregue_em, now()) else entregue_em end,
      remarketing_status = case when p_status in ('comprou','entregue') and remarketing_status = 'em_andamento' then 'convertido' else remarketing_status end,
      updated_at = now()
    where id = ic.id;
  end if;
  return jsonb_build_object('ok', true, 'cliente_id', cid);
end $$;
revoke all on function public.infoproduto_registrar(text,text,text,text,text,jsonb,text,numeric,text,text) from public, anon, authenticated;
grant execute on function public.infoproduto_registrar(text,text,text,text,text,jsonb,text,numeric,text,text) to service_role;
