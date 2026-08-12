-- Baseline: captura o schema que ja existe em producao (projeto gfmvyujaxlwizmvwmcfm) no
-- momento desta migration (12/08/2026). Nao muda nada — so documenta o estado atual antes de
-- qualquer alteracao nova, pra ser o ponto de partida do controle de versao do banco.
--
-- A partir daqui: nenhum SQL e mais aplicado a mao pelo SQL Editor do painel Supabase.
-- Toda mudanca de schema vira uma migration nova neste diretorio (supabase/migrations/),
-- revisada antes de aplicar. Dono do schema e este repositorio; o n8n consome, nunca cria
-- tabela.
--
-- RLS: as tabelas abaixo estao exatamente como estao em producao hoje — a maioria com RLS
-- ligada e SEM NENHUMA POLICY (inacessivel ate a Fase 1 criar as politicas reais), e
-- atendimento_whatsapp/conversas_whatsapp com RLS AINDA DESLIGADA (risco de seguranca
-- conhecido, corrigido na Fase 1 — nao mudar aqui pra nao quebrar o WhatsApp que funciona
-- antes do login existir).

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text,
  telefone text,
  email text,
  origem text,
  biotipo text,
  estilo_pessoal text,
  dress_code text,
  intencao_imagem text,
  status text default 'lead',
  created_at timestamptz default now()
);
alter table public.leads enable row level security;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id),
  nome text not null,
  telefone text,
  email text,
  cpf text,
  endereco text,
  created_at timestamptz default now()
);
alter table public.clientes enable row level security;

create table if not exists public.tecidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cores jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table public.tecidos enable row level security;

create table if not exists public.vestidos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  colecao text check (colecao = any (array['Ceremony','Evening','Brides'])),
  categoria text check (categoria = any (array['DAS G Collection','DAS G Exclusive'])),
  tecido_ids uuid[] default '{}'::uuid[],
  preco_base numeric,
  preco_sob_consulta boolean default false,
  fotos text[] default '{}'::text[],
  tamanhos_disponiveis text[] default '{}'::text[],
  biotipos text[] default '{}'::text[],
  dress_codes text[] default '{}'::text[],
  intencoes text[] default '{}'::text[],
  estilista_responsavel text,
  descricao text,
  onde_usar text,
  faq jsonb default '[]'::jsonb,
  venda_final boolean default true,
  prazo_producao_dias integer,
  created_at timestamptz default now()
);
alter table public.vestidos enable row level security;

create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  lead_id uuid references public.leads(id),
  raiox_respostas jsonb,
  created_at timestamptz default now()
);
alter table public.briefings enable row level security;

create table if not exists public.dossies (
  id uuid primary key default gen_random_uuid(),
  briefing_id uuid references public.briefings(id),
  conteudo jsonb,
  created_at timestamptz default now()
);
alter table public.dossies enable row level security;

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  vestido_id uuid references public.vestidos(id),
  canal text,
  status text default 'lead' check (status = any (array[
    'lead','qualificacao','agendado','consultoria','orcamento_enviado','aprovado',
    'entrada','os_aberta','briefing','dossie','criacao','modelagem','corte','costura',
    'acabamento','prova1','ajustes1','prova2','prova_final','finalizacao','pgto_final',
    'entrega','feedback'
  ])),
  valor_total numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.ordens_servico enable row level security;

create table if not exists public.fichas_tecnicas (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid references public.ordens_servico(id),
  medidas jsonb,
  observacoes text,
  created_at timestamptz default now()
);
alter table public.fichas_tecnicas enable row level security;

create table if not exists public.listas_materiais (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid references public.ordens_servico(id),
  tecido_id uuid references public.tecidos(id),
  quantidade numeric,
  unidade text,
  created_at timestamptz default now()
);
alter table public.listas_materiais enable row level security;

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  valor numeric,
  status text default 'pendente',
  created_at timestamptz default now()
);
alter table public.orcamentos enable row level security;

create table if not exists public.provas (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid references public.ordens_servico(id),
  data_agendada timestamptz,
  status text default 'agendada',
  observacoes text,
  created_at timestamptz default now()
);
alter table public.provas enable row level security;

create table if not exists public.agenda (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  tipo text,
  data_hora timestamptz,
  status text default 'agendado',
  created_at timestamptz default now()
);
alter table public.agenda enable row level security;

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  responsavel text,
  status text default 'pendente',
  prazo date,
  created_at timestamptz default now()
);
alter table public.tarefas enable row level security;

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text,
  tipo text,
  created_at timestamptz default now()
);
alter table public.fornecedores enable row level security;

create table if not exists public.financeiro_receber (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid references public.ordens_servico(id),
  valor numeric,
  data_vencimento date,
  status text default 'pendente',
  created_at timestamptz default now()
);
alter table public.financeiro_receber enable row level security;

create table if not exists public.financeiro_pagar (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public.fornecedores(id),
  valor numeric,
  data_vencimento date,
  status text default 'pendente',
  descricao text,
  created_at timestamptz default now()
);
alter table public.financeiro_pagar enable row level security;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  nota integer check (nota >= 1 and nota <= 5),
  comentario text,
  aprovado_divulgacao boolean default false,
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;

create table if not exists public.marketing_conteudo (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  titulo text,
  conteudo text,
  status text default 'rascunho',
  created_at timestamptz default now()
);
alter table public.marketing_conteudo enable row level security;

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  preco_base numeric,
  categoria text,
  created_at timestamptz default now()
);
alter table public.servicos enable row level security;

create table if not exists public.prompts_ia (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  conteudo text,
  ativo boolean default true,
  created_at timestamptz default now()
);
alter table public.prompts_ia enable row level security;

create table if not exists public.atendimento_whatsapp (
  phone text primary key,
  nome text,
  julia_ativa boolean not null default true,
  last_human_message_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.atendimento_whatsapp is
  'Estado de atendimento por conversa WhatsApp: toggle manual da Julia (painel CRM) + timestamp da ultima mensagem humana (cooldown automatico).';
comment on column public.atendimento_whatsapp.julia_ativa is
  'Toggle manual: false = atendimento automatico desligado para este numero.';
comment on column public.atendimento_whatsapp.last_human_message_at is
  'Preenchido automaticamente quando a Juliana responde manualmente pelo WhatsApp (fromMe=true). Usado para cooldown automatico.';

create table if not exists public.conversas_whatsapp (
  id bigint generated always as identity primary key,
  phone text not null,
  nome text,
  canal text not null default 'whatsapp',
  direcao text not null check (direcao = any (array['in','out_julia','out_humano'])),
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.conversas_whatsapp is
  'Historico de mensagens do WhatsApp (Julia + humano + cliente) exibido no painel Central de Atendimento do CRM.';
comment on column public.conversas_whatsapp.direcao is
  'in = mensagem do cliente | out_julia = resposta da IA | out_humano = resposta manual da Juliana';
comment on column public.conversas_whatsapp.lida is
  'Aplica-se a mensagens direcao=in. Marcada true quando a conversa e aberta no painel do CRM.';
