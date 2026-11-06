-- Agendas por departamento (ADM/Clientes, Ateliê, Marketing, Financeira, Tissu), mensagens prontas por tipo de evento,
-- senha da agenda financeira (hash no banco, verificada por função) e alertas/lembretes para o n8n.

-- 1) Departamentos: atendimento e recepção viram "adm" (ADM = Clientes)
alter table public.agenda drop constraint if exists agenda_departamento_check;
alter table public.tarefas drop constraint if exists tarefas_departamento_check;
update public.agenda set departamento = 'adm' where departamento in ('atendimento', 'recepcao');
update public.tarefas set departamento = 'adm' where departamento in ('atendimento', 'recepcao');
alter table public.agenda add constraint agenda_departamento_check check (departamento in ('adm', 'atelie', 'marketing', 'financeira', 'tissu'));
alter table public.tarefas add constraint tarefas_departamento_check check (departamento in ('adm', 'atelie', 'marketing', 'financeira', 'tissu'));
alter table public.agenda alter column departamento set default 'adm';
alter table public.tarefas alter column departamento set default 'adm';

-- 2) Colunas de controle
alter table public.agenda add column if not exists meet_enviado_em timestamptz;
alter table public.agenda add column if not exists lembrete_10min_em timestamptz;
alter table public.agenda add column if not exists alerta_juliana_em timestamptz;
alter table public.agenda add column if not exists conta_pagar_id uuid;
alter table public.tarefas add column if not exists alerta_juliana_em timestamptz;
create index if not exists agenda_data_hora_idx on public.agenda (data_hora);

-- 3) Mensagens prontas por tipo de evento (editáveis na tela)
create table if not exists public.agenda_modelos_msg (
  tipo text primary key,
  titulo text,
  texto text not null,
  ativo boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.agenda_modelos_msg enable row level security;
drop policy if exists agenda_modelos_msg_auth on public.agenda_modelos_msg;
create policy agenda_modelos_msg_auth on public.agenda_modelos_msg for all to authenticated using (true) with check (true);

-- 4) Segurança da agenda financeira + segredo dos alertas (sem policy: só as funções abaixo acessam)
create table if not exists public.agenda_seguranca (
  id int primary key default 1 check (id = 1),
  senha_hash text,
  alertas_segredo text not null default encode(gen_random_bytes(18), 'hex'),
  updated_at timestamptz not null default now()
);
alter table public.agenda_seguranca enable row level security;
insert into public.agenda_seguranca (id) values (1) on conflict (id) do nothing;

create or replace function public.agenda_financeira_status() returns boolean
language sql security definer set search_path = public as $$ select senha_hash is not null from public.agenda_seguranca where id = 1 $$;

create or replace function public.agenda_financeira_definir_senha(p_nova text, p_atual text default null) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  if p_nova is null or length(p_nova) < 4 then raise exception 'A senha precisa ter ao menos 4 caracteres'; end if;
  select senha_hash into h from public.agenda_seguranca where id = 1;
  if h is not null and (p_atual is null or crypt(p_atual, h) <> h) then return false; end if;
  update public.agenda_seguranca set senha_hash = crypt(p_nova, gen_salt('bf')), updated_at = now() where id = 1;
  return true;
end $$;

create or replace function public.agenda_financeira_verificar(p_senha text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  select senha_hash into h from public.agenda_seguranca where id = 1;
  return h is not null and p_senha is not null and crypt(p_senha, h) = h;
end $$;

-- 5) Funções para o n8n (exigem o segredo; chamadas com a chave anon)
create or replace function public.agenda_alertas_pendentes(p_segredo text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_segredo is distinct from (select alertas_segredo from public.agenda_seguranca where id = 1) then raise exception 'não autorizado'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'tipo', a.tipo, 'titulo', a.titulo, 'departamento', a.departamento, 'data_hora', a.data_hora,
      'local', a.local, 'link_meet', a.link_meet, 'cliente_nome', c.nome, 'cliente_telefone', c.telefone,
      'meet_enviado_em', a.meet_enviado_em, 'observacoes', a.observacoes) order by a.data_hora)
    from public.agenda a left join public.clientes c on c.id = a.cliente_id
    where a.data_hora between now() and now() + interval '11 minutes'
      and coalesce(a.status, '') not in ('cancelado', 'realizado') and a.lembrete_10min_em is null
  ), '[]'::jsonb);
end $$;

create or replace function public.agenda_marcar_lembrete(p_segredo text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_segredo is distinct from (select alertas_segredo from public.agenda_seguranca where id = 1) then raise exception 'não autorizado'; end if;
  update public.agenda set lembrete_10min_em = now(), alerta_juliana_em = now(), meet_enviado_em = coalesce(meet_enviado_em, case when link_meet is not null then now() end) where id = p_id;
end $$;

create or replace function public.agenda_resumo_dia(p_segredo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_segredo is distinct from (select alertas_segredo from public.agenda_seguranca where id = 1) then raise exception 'não autorizado'; end if;
  return jsonb_build_object(
    'data', hoje,
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('hora', to_char(a.data_hora at time zone 'America/Sao_Paulo', 'HH24:MI'), 'tipo', a.tipo, 'titulo', a.titulo, 'departamento', a.departamento, 'cliente', c.nome) order by a.data_hora)
      from public.agenda a left join public.clientes c on c.id = a.cliente_id
      where (a.data_hora at time zone 'America/Sao_Paulo')::date = hoje and coalesce(a.status, '') <> 'cancelado'), '[]'::jsonb),
    'tarefas', coalesce((select jsonb_agg(jsonb_build_object('titulo', t.titulo, 'departamento', t.departamento, 'prazo', t.prazo) order by t.prazo)
      from public.tarefas t where coalesce(t.status, 'pendente') not in ('concluida', 'cancelada') and t.prazo is not null and t.prazo <= hoje + 1), '[]'::jsonb),
    'contas_pagar', coalesce((select jsonb_agg(jsonb_build_object('descricao', f.descricao, 'valor', f.valor, 'vencimento', f.data_vencimento) order by f.data_vencimento)
      from public.financeiro_pagar f where coalesce(f.status, 'pendente') = 'pendente' and f.data_vencimento <= hoje + 2), '[]'::jsonb));
end $$;

revoke all on function public.agenda_alertas_pendentes(text), public.agenda_marcar_lembrete(text, uuid), public.agenda_resumo_dia(text) from public;
grant execute on function public.agenda_alertas_pendentes(text), public.agenda_marcar_lembrete(text, uuid), public.agenda_resumo_dia(text) to anon, authenticated;
revoke all on function public.agenda_financeira_status(), public.agenda_financeira_definir_senha(text, text), public.agenda_financeira_verificar(text) from public;
grant execute on function public.agenda_financeira_status(), public.agenda_financeira_definir_senha(text, text), public.agenda_financeira_verificar(text) to authenticated;

-- 6) Mensagens prontas (placeholders: {nome} {tipo} {quando} {local} {meet})
insert into public.agenda_modelos_msg (tipo, titulo, texto) values
 ('consultoria_express', 'Consultoria Express', E'Olá, {nome}! Aqui é do ateliê Das G. Sua *consultoria* está reservada para *{quando}*.{local}{meet}\n\nPode confirmar respondendo *SIM*? Se precisar remarcar, é só avisar.'),
 ('personal_stylist', 'Personal Stylist', E'Olá, {nome}! Seu horário de *personal stylist* está reservado para *{quando}*.{local}{meet}\n\nPode confirmar respondendo *SIM*?'),
 ('teste_colorimetria', 'Teste de colorimetria', E'Olá, {nome}! Seu *teste de colorimetria* está marcado para *{quando}*.{local}{meet}\n\nVenha sem maquiagem e com o cabelo preso, se possível. Confirma com *SIM*?'),
 ('orcamento', 'Atendimento de orçamento', E'Olá, {nome}! Vamos conversar sobre o seu *orçamento* em *{quando}*.{local}{meet}\n\nPode confirmar respondendo *SIM*?'),
 ('tecidos_medidas', 'Ver tecidos e medidas', E'Olá, {nome}! Vamos ver *tecidos e medidas* em *{quando}*.{local}{meet}\n\nPode confirmar respondendo *SIM*?'),
 ('prova1', '1ª prova', E'Olá, {nome}! Sua *1ª prova* está marcada para *{quando}*.{local}\n\nVenha com a roupa íntima e o calçado que pretende usar com a peça. Confirma com *SIM*?'),
 ('prova2', '2ª prova', E'Olá, {nome}! Sua *2ª prova* está marcada para *{quando}*.{local}\n\nVenha com a roupa íntima e o calçado do dia. Confirma com *SIM*?'),
 ('prova_final', '3ª prova (final)', E'Olá, {nome}! Sua *3ª prova (final)* está marcada para *{quando}*.{local}\n\nTraga o calçado e os acessórios que vai usar. Confirma com *SIM*?'),
 ('modelagem_corte', 'Modelagem / corte', E'Olá, {nome}! Estamos na fase de *modelagem e corte* da sua peça. Próximo passo: *{quando}*.{local}'),
 ('costura', 'Montagem / costura', E'Olá, {nome}! Sua peça entrou em *montagem*. Previsão da próxima etapa: *{quando}*.{local}'),
 ('entrega', 'Entrega', E'Olá, {nome}! A *entrega* da sua peça está marcada para *{quando}*.{local}\n\nConfirma com *SIM*? Lembre de conferir o saldo combinado.'),
 ('retirada_locacao', 'Retirada de locação', E'Olá, {nome}! A *retirada* da sua peça de locação é *{quando}*.{local}\n\nConfirma com *SIM*?'),
 ('devolucao_locacao', 'Devolução de locação', E'Olá, {nome}! A *devolução* da peça alugada é *{quando}*.{local}\n\nQualquer imprevisto, me avise por aqui.'),
 ('venda_loja', 'Venda / atendimento na loja', E'Olá, {nome}! Seu atendimento na loja está reservado para *{quando}*.{local}\n\nTe esperamos! Confirma com *SIM*?'),
 ('reuniao', 'Reunião interna', E'Lembrete: *{tipo}* em *{quando}*.{local}{meet}'),
 ('outro', 'Outro', E'Olá, {nome}! Temos um compromisso marcado para *{quando}*.{local}{meet}\n\nPode confirmar respondendo *SIM*?'),
 ('gravacao_conteudo', 'Gravação de conteúdo', E'Lembrete: *gravação de conteúdo* em *{quando}*.{local}'),
 ('post_programado', 'Postagem programada', E'Lembrete: *postagem programada* em *{quando}*.'),
 ('reuniao_marketing', 'Reunião de marketing', E'Lembrete: *reunião de marketing* em *{quando}*.{local}{meet}'),
 ('pagamento', 'Pagamento / vencimento', E'Lembrete: *pagamento* previsto para *{quando}*.'),
 ('recebimento', 'Recebimento', E'Lembrete: *recebimento* previsto para *{quando}*.'),
 ('reuniao_contador', 'Reunião com contador', E'Lembrete: *reunião financeira/contador* em *{quando}*.{local}{meet}'),
 ('compra_tecido', 'Compra de tecido (Tissu)', E'Lembrete Tissu: *compra de tecido* em *{quando}*.{local}'),
 ('entrega_tecido', 'Entrega de tecido (Tissu)', E'Lembrete Tissu: *entrega de tecido* em *{quando}*.{local}'),
 ('reuniao_fornecedor', 'Reunião com fornecedor (Tissu)', E'Lembrete Tissu: *reunião com fornecedor* em *{quando}*.{local}{meet}')
on conflict (tipo) do nothing;
