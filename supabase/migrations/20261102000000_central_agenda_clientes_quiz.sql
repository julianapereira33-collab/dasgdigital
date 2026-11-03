-- Central de Atendimento (canais, respostas automaticas, base da Julia), Agenda/Tarefas com
-- confirmacao por WhatsApp, cadastro de clientes/OS e quiz da Consultoria Express.
--
-- 100% idempotente: pode rodar mais de uma vez. Nao apaga nem altera dados existentes; so
-- adiciona colunas/tabelas/policies que faltam. O frontend (DasGCRMv4) ja le/escreve essas
-- colunas -- varias nao existiam no baseline (12/08) e so apareciam nos MOCK_.

-- ───────────────────────── leads ─────────────────────────
alter table public.leads add column if not exists instagram text;
alter table public.leads add column if not exists procura text;
alter table public.leads add column if not exists ocasiao text;
alter table public.leads add column if not exists data_evento date;
alter table public.leads add column if not exists servico_interesse text;
alter table public.leads add column if not exists observacoes text;
alter table public.leads add column if not exists cliente_id uuid references public.clientes(id);

-- ───────────────────────── clientes (ficha) ─────────────────────────
alter table public.clientes add column if not exists apelido text;
alter table public.clientes add column if not exists nascimento date;
alter table public.clientes add column if not exists instagram text;
alter table public.clientes add column if not exists origem text;
alter table public.clientes add column if not exists biotipo text;
alter table public.clientes add column if not exists colorimetria text;
alter table public.clientes add column if not exists estilo text;
alter table public.clientes add column if not exists restricoes_modelagem text;
alter table public.clientes add column if not exists preferencias_tecidos text;
alter table public.clientes add column if not exists obs text;
alter table public.clientes add column if not exists busto numeric;
alter table public.clientes add column if not exists cintura numeric;
alter table public.clientes add column if not exists quadril numeric;
alter table public.clientes add column if not exists altura numeric;
alter table public.clientes add column if not exists peso numeric;
alter table public.clientes add column if not exists ombro_joelho numeric;
alter table public.clientes add column if not exists ombro_chao numeric;
alter table public.clientes add column if not exists manga numeric;
alter table public.clientes add column if not exists cava numeric;
alter table public.clientes add column if not exists entrepernas numeric;
alter table public.clientes add column if not exists obs_medidas text;

-- ───────────────────────── ordens_servico ─────────────────────────
alter table public.ordens_servico add column if not exists numero text;
alter table public.ordens_servico add column if not exists descricao text;
alter table public.ordens_servico add column if not exists data_evento date;
alter table public.ordens_servico add column if not exists link_meet text;
alter table public.ordens_servico add column if not exists servico text;

-- ───────────────────────── agenda ─────────────────────────
alter table public.agenda add column if not exists titulo text;
alter table public.agenda add column if not exists local text;
alter table public.agenda add column if not exists link_meet text;
alter table public.agenda add column if not exists observacoes text;
alter table public.agenda add column if not exists duracao_min integer default 60;
alter table public.agenda add column if not exists ordem_servico_id uuid references public.ordens_servico(id);
alter table public.agenda add column if not exists confirmacao_enviada_em timestamptz;
alter table public.agenda add column if not exists confirmacao_mensagem text;
alter table public.agenda add column if not exists confirmado_em timestamptz;

-- ───────────────────────── tarefas ─────────────────────────
alter table public.tarefas add column if not exists descricao text;
alter table public.tarefas add column if not exists prioridade text default 'normal';
alter table public.tarefas add column if not exists cliente_id uuid references public.clientes(id);
alter table public.tarefas add column if not exists ordem_servico_id uuid references public.ordens_servico(id);
alter table public.tarefas add column if not exists concluida_em timestamptz;
alter table public.tarefas add column if not exists origem text; -- 'manual' | 'fluxo'
alter table public.tarefas add column if not exists cliente_avisada_em timestamptz;

-- ───────────────────────── briefings ─────────────────────────
alter table public.briefings add column if not exists ordem_servico_id uuid references public.ordens_servico(id);
alter table public.briefings add column if not exists consultoria_anotacoes jsonb;
alter table public.briefings add column if not exists origem text; -- 'quiz' | 'consultoria' | 'manual'
alter table public.briefings add column if not exists updated_at timestamptz default now();

-- ───────────────────────── Central: canais conectados ─────────────────────────
-- Guarda so identificadores NAO secretos (numero, @usuario, id da pagina). Tokens/chaves ficam
-- nas credenciais do n8n -- nunca nesta tabela, que o navegador consegue ler.
create table if not exists public.canais_conexao (
  canal text primary key check (canal = any (array['whatsapp','instagram','facebook','tiktok'])),
  identificador text,
  nome_exibicao text,
  status text not null default 'pendente' check (status = any (array['pendente','conectado','erro'])),
  observacoes text,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.canais_conexao enable row level security;
insert into public.canais_conexao (canal, nome_exibicao)
values ('whatsapp','WhatsApp'),('instagram','Instagram'),('facebook','Facebook'),('tiktok','TikTok')
on conflict (canal) do nothing;

-- ───────────────────────── Central: respostas automaticas ─────────────────────────
create table if not exists public.respostas_automaticas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  palavras_chave text[] not null default '{}',
  resposta text not null,
  canais text[] not null default '{whatsapp}',
  ativa boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.respostas_automaticas enable row level security;

-- ───────────────────────── Central: base de conhecimento da Julia ─────────────────────────
create table if not exists public.conhecimento_julia (
  id uuid primary key default gen_random_uuid(),
  categoria text not null default 'geral',
  titulo text not null,
  conteudo text not null,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conhecimento_julia enable row level security;

-- ───────────────────────── Consultoria Express: quiz ─────────────────────────
create table if not exists public.consultoria_quiz_envios (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  cliente_id uuid references public.clientes(id),
  ordem_servico_id uuid references public.ordens_servico(id),
  nome_cliente text,
  telefone text,
  status text not null default 'criado' check (status = any (array['criado','enviado','respondido'])),
  respostas jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  respondido_em timestamptz
);
alter table public.consultoria_quiz_envios enable row level security;

-- ───────────────────────── Policies (usuaria logada = acesso total) ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'leads','clientes','ordens_servico','agenda','tarefas','briefings','provas','servicos','prompts_ia',
    'canais_conexao','respostas_automaticas','conhecimento_julia','consultoria_quiz_envios'
  ] loop
    execute format('drop policy if exists authenticated_full_access on public.%I', t);
    execute format('create policy authenticated_full_access on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ───────────────────────── Quiz publico (sem login) via RPC ─────────────────────────
-- A cliente abre /?quiz=<token> sem conta. So estas duas funcoes sao expostas ao papel anon, e
-- ambas exigem o token (24 hex, nao adivinhavel). A tabela continua fechada pra anon.
create or replace function public.quiz_obter(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.consultoria_quiz_envios;
begin
  select * into r from public.consultoria_quiz_envios where token = p_token;
  if not found then
    return null;
  end if;
  return jsonb_build_object('nome', r.nome_cliente, 'status', r.status, 'respostas', r.respostas);
end $$;

create or replace function public.quiz_responder(p_token text, p_respostas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.consultoria_quiz_envios;
  v_briefing uuid;
begin
  select * into r from public.consultoria_quiz_envios where token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'link_invalido');
  end if;

  update public.consultoria_quiz_envios
     set respostas = coalesce(p_respostas, '{}'::jsonb), status = 'respondido', respondido_em = now()
   where id = r.id;

  -- briefing da cliente (um por OS; se nao houver OS, um por cliente)
  select id into v_briefing from public.briefings
   where cliente_id is not distinct from r.cliente_id
     and ordem_servico_id is not distinct from r.ordem_servico_id
   order by created_at desc limit 1;
  if v_briefing is null then
    insert into public.briefings (cliente_id, ordem_servico_id, raiox_respostas, origem)
    values (r.cliente_id, r.ordem_servico_id, p_respostas, 'quiz');
  else
    update public.briefings set raiox_respostas = p_respostas, origem = 'quiz', updated_at = now()
     where id = v_briefing;
  end if;

  -- ficha da cliente: so preenche o que ainda esta vazio (nunca sobrescreve o que a Juliana digitou)
  if r.cliente_id is not null then
    begin
      update public.clientes c set
        instagram = coalesce(nullif(c.instagram, ''), nullif(p_respostas->>'instagram', '')),
        biotipo = coalesce(nullif(c.biotipo, ''), nullif(p_respostas->>'biotipo', '')),
        colorimetria = coalesce(nullif(c.colorimetria, ''), nullif(p_respostas->>'colorimetria', '')),
        estilo = coalesce(nullif(c.estilo, ''), nullif(p_respostas->>'estilo', '')),
        restricoes_modelagem = coalesce(nullif(c.restricoes_modelagem, ''), nullif(p_respostas->>'restricoes_modelagem', '')),
        preferencias_tecidos = coalesce(nullif(c.preferencias_tecidos, ''), nullif(p_respostas->>'tecidos_cores', '')),
        busto = coalesce(c.busto, nullif(p_respostas->>'busto', '')::numeric),
        cintura = coalesce(c.cintura, nullif(p_respostas->>'cintura', '')::numeric),
        quadril = coalesce(c.quadril, nullif(p_respostas->>'quadril', '')::numeric),
        altura = coalesce(c.altura, nullif(p_respostas->>'altura', '')::numeric),
        peso = coalesce(c.peso, nullif(p_respostas->>'peso', '')::numeric)
      where c.id = r.cliente_id;
    exception when others then
      null; -- resposta mal formatada (ex.: medida com texto) nao pode impedir a cliente de enviar o quiz
    end;
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.quiz_obter(text) from public;
revoke all on function public.quiz_responder(text, jsonb) from public;
grant execute on function public.quiz_obter(text) to anon, authenticated;
grant execute on function public.quiz_responder(text, jsonb) to anon, authenticated;

-- Realtime pra Central/Agenda atualizarem sozinhas
do $$
declare t text;
begin
  foreach t in array array['agenda','tarefas','leads','consultoria_quiz_envios'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
