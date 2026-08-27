-- Catch-up: documenta as 3 tabelas do fluxo Vitrine IA (produtos, produto_fotos,
-- variantes_sessao) que ja existem em producao (criadas via SQL Editor entre 14-16/08/2026,
-- nunca versionadas neste repo) + cria produto_variantes (nova) + politicas RLS pra todas.
--
-- Contexto: RLS ja estava ligada em produtos/produto_fotos/variantes_sessao mas SEM NENHUMA
-- POLICY -- so o n8n (chave service_role, ignora RLS) conseguia ler/escrever. O CRM (chave
-- anon/authenticated) nao enxergava nada. Esta migration fecha esse gap seguindo o mesmo
-- padrao ja usado e validado em leads/clientes/ordens_servico (Fase 1): policy unica
-- "authenticated_full_access", for all to authenticated using (true) -- single-user hoje,
-- sem diferenciacao de papel.

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  sessao_id text,
  codigo text unique,
  nome text,
  tecido text,
  composicao text,
  cor text,
  tamanhos text,
  detalhes text,
  preco_custo numeric,
  preco_venda numeric,
  ncm text,
  descricao_completa text,
  mosaico_url text,
  video_url text,
  status_fotos text default 'aguardando',
  status_video text default 'pendente',
  status_geral text default 'em_aprovacao',
  obs_refazer text,
  criado_em timestamptz default now(),
  phone text,
  unidade text default 'UN',
  origem smallint,
  situacao text default 'Ativo',
  marca text,
  cest text,
  gtin text,
  peso_liquido numeric,
  peso_bruto numeric,
  categoria_produto text,
  descricao_curta text,
  informacoes_adicionais text,
  bling_produto_id text,
  bling_sincronizado_em timestamptz,
  ncm_fonte_url text,
  ncm_confirmado boolean not null default false
);
alter table public.produtos enable row level security;
comment on table public.produtos is
  'Cadastro de produtos via WhatsApp (workflow Das G — Cadastro v3 GPT Image). Substitui n8n Data Table uHM88qli1pHTB36l, morta com a descontinuacao do n8n Cloud.';
comment on column public.produtos.mosaico_url is
  'URL publica do mosaico bruto 1536x1024 gerado pelo gpt-image-1 (grade 5x2/10 paineis). Os recortes individuais 9:16 ficam em produto_fotos.';
comment on column public.produtos.origem is
  'Codigo origem ICMS Bling (0-8)';
comment on column public.produtos.categoria_produto is
  'Formato Bling: "categoria pai>>categoria filha"';
comment on column public.produtos.bling_produto_id is
  'ID do produto na Bling apos sincronizacao, mesmo padrao de vestidos.bling_produto_id';
comment on column public.produtos.ncm_fonte_url is
  'URL da pagina que a IA consultou (busca real via OpenAI web_search_preview) pra sugerir o NCM. Nunca inventado -- sempre com fonte, mas precisa confirmacao humana antes de ir pra Bling.';
comment on column public.produtos.ncm_confirmado is
  'false = NCM sugerido pela IA, ainda nao confirmado por humano (semaforo vermelho no painel). true = confirmado, pode sincronizar com Bling.';

create table if not exists public.produto_fotos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id),
  storage_path text not null,
  panel_name text,
  ordem smallint,
  is_mosaico_bruto boolean not null default false,
  aprovada boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.produto_fotos enable row level security;
comment on table public.produto_fotos is
  'Fotos individuais recortadas (9:16) do mosaico gerado pelo gpt-image-1, ligadas ao produto. is_mosaico_bruto marca a imagem 1536x1024 original (referencia/auditoria, nunca sobe pra Bling). aprovada=true controla o que entra em midia.imagens.externas na sincronizacao com a Bling.';

create table if not exists public.variantes_sessao (
  phone text primary key,
  foto_principal text,
  fotos_variantes text default '[]',
  texto_raw text,
  status text default 'coletando',
  updated_at timestamptz default now()
);
alter table public.variantes_sessao enable row level security;
comment on table public.variantes_sessao is
  'Sessão de coleta de fotos/variantes por telefone antes do comando "processar" (workflow Das G — Cadastro v3 GPT Image). Substitui a tabela homônima no projeto Supabase antigo adgmmtlgygjwbmcmhvbu, morto.';

-- Nova: variantes de tamanho/cor com estoque simples, formato ja compativel com o que a Bling
-- espera por variacao (sku proprio, preco proprio opcional) pra nao precisar remodelar quando a
-- sincronizacao com a Bling entrar em producao.
create table if not exists public.produto_variantes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  tamanho text,
  cor text,
  sku text unique,
  quantidade_estoque integer not null default 0,
  preco_venda numeric,
  bling_variacao_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.produto_variantes enable row level security;
comment on table public.produto_variantes is
  'Variantes de tamanho/cor de um produto, com estoque simples (quantidade, sem livro-razao por enquanto). sku e preco_venda seguem o formato esperado pela Bling por variacao, pra sincronizacao futura nao exigir remodelagem. bling_variacao_id fica nulo ate a integracao real acontecer.';
comment on column public.produto_variantes.sku is
  'Formato sugerido: {produtos.codigo}-{tamanho}-{cor}, unico.';
comment on column public.produto_variantes.preco_venda is
  'Override do preco do produto pai quando a variante custa diferente. Nulo = usa produtos.preco_venda.';

drop policy if exists authenticated_full_access on public.produtos;
create policy authenticated_full_access on public.produtos
  for all to authenticated using (true);
drop policy if exists authenticated_full_access on public.produto_fotos;
create policy authenticated_full_access on public.produto_fotos
  for all to authenticated using (true);
drop policy if exists authenticated_full_access on public.variantes_sessao;
create policy authenticated_full_access on public.variantes_sessao
  for all to authenticated using (true);
drop policy if exists authenticated_full_access on public.produto_variantes;
create policy authenticated_full_access on public.produto_variantes
  for all to authenticated using (true);
