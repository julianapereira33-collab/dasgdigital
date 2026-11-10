-- Quiz respondido -> a IA monta briefing, dossiê e croqui (rascunho). A Ju acompanha, edita ou pede alteração.
alter table public.consultoria_quiz_envios add column if not exists ia_status text;
alter table public.consultoria_quiz_envios add column if not exists ia_gerado_em timestamptz;
alter table public.dossies add column if not exists gerado_por_ia boolean not null default false;
alter table public.dossies add column if not exists ia_status text;            -- pronto | refazer | gerando | erro
alter table public.dossies add column if not exists alteracao_pedida text;
alter table public.dossies add column if not exists ia_gerado_em timestamptz;

create or replace function public.criacao_ia_pendentes()
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb := '[]'::jsonb; x record; n int := 0;
begin
  for x in
    select q.id qid, q.respostas, q.tipo_quiz, q.ia_status qia, o.id oid, o.numero, o.tipo_atendimento, o.ocasiao, o.data_evento, o.descricao,
           c.nome, c.biotipo, c.colorimetria, c.estilo, c.preferencias_tecidos, c.restricoes_modelagem, c.altura, c.busto, c.cintura, c.quadril, c.obs_medidas, c.telefone,
           d.id did, d.conteudo dconteudo, d.alteracao_pedida, d.ia_status dia
    from consultoria_quiz_envios q
    join ordens_servico o on o.id = q.ordem_servico_id
    join clientes c on c.id = o.cliente_id
    left join lateral (select * from dossies where ordem_servico_id = o.id order by created_at desc limit 1) d on true
    where q.status = 'respondido' and q.tipo_quiz in ('completo','consultivo')
      and ( (d.id is null and (q.ia_status is null or (q.ia_status = 'gerando' and q.ia_gerado_em < now() - interval '30 minutes')))
         or (d.ia_status = 'refazer') )
    order by q.respondido_em
    limit 2
  loop
    if x.dia = 'refazer' then update dossies set ia_status = 'gerando' where id = x.did;
    else update consultoria_quiz_envios set ia_status = 'gerando', ia_gerado_em = now() where id = x.qid; end if;
    r := r || jsonb_build_object('job', case when x.dia = 'refazer' then 'refazer' else 'novo' end, 'quiz_id', x.qid, 'os_id', x.oid, 'os', x.numero,
      'nome', x.nome, 'telefone', x.telefone, 'tipo_atendimento', x.tipo_atendimento, 'tipo_quiz', x.tipo_quiz,
      'ocasiao', x.ocasiao, 'data_evento', x.data_evento, 'descricao', x.descricao, 'respostas', x.respostas,
      'cliente', jsonb_build_object('biotipo', x.biotipo, 'colorimetria', x.colorimetria, 'estilo', x.estilo, 'preferencias_tecidos', x.preferencias_tecidos,
         'restricoes_modelagem', x.restricoes_modelagem, 'altura', x.altura, 'busto', x.busto, 'cintura', x.cintura, 'quadril', x.quadril, 'obs_medidas', x.obs_medidas),
      'dossie_atual', x.dconteudo, 'alteracao_pedida', x.alteracao_pedida);
  end loop;
  return r;
end $$;

create or replace function public.criacao_ia_salvar(p_os_id uuid, p_quiz_id uuid, p_conteudo jsonb, p_anotacoes jsonb, p_croqui_caminho text default null, p_croqui_prompt text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o record; c record; d record; b record; titulo_tarefa text;
begin
  select * into o from ordens_servico where id = p_os_id;
  if o.id is null then return jsonb_build_object('ok', false, 'erro', 'OS não encontrada'); end if;
  select * into c from clientes where id = o.cliente_id;
  select * into d from dossies where ordem_servico_id = p_os_id order by created_at desc limit 1;
  if d.id is null then
    insert into dossies(ordem_servico_id, titulo, conteudo, gerado_por_ia, ia_status, ia_gerado_em)
    values (p_os_id, 'Dossiê '||coalesce(o.numero,'')||' — '||c.nome, p_conteudo, true, 'pronto', now());
  else
    update dossies set conteudo = coalesce(conteudo,'{}'::jsonb) || p_conteudo, gerado_por_ia = true, ia_status = 'pronto', alteracao_pedida = null, ia_gerado_em = now(), updated_at = now() where id = d.id;
  end if;
  select * into b from briefings where ordem_servico_id = p_os_id order by created_at desc limit 1;
  if b.id is null then
    insert into briefings(cliente_id, ordem_servico_id, consultoria_anotacoes, origem)
    values (o.cliente_id, p_os_id, jsonb_build_object('anotacoes', p_anotacoes, 'gerado_por_ia', true), 'ia');
  else
    update briefings set consultoria_anotacoes = coalesce(consultoria_anotacoes,'{}'::jsonb) || jsonb_build_object('anotacoes', coalesce(consultoria_anotacoes->'anotacoes','{}'::jsonb) || p_anotacoes, 'gerado_por_ia', true), updated_at = now() where id = b.id;
  end if;
  if p_croqui_caminho is not null then
    insert into os_arquivos(ordem_servico_id, cliente_id, categoria, caminho, nome, legenda, prompt)
    values (p_os_id, o.cliente_id, 'croqui', p_croqui_caminho, 'croqui-ia.png', 'Croqui gerado pela IA (rascunho para revisar)', p_croqui_prompt);
  end if;
  if p_quiz_id is not null then update consultoria_quiz_envios set ia_status = 'pronto', ia_gerado_em = now() where id = p_quiz_id; end if;
  update tarefas set status = 'concluida' where ordem_servico_id = p_os_id and status <> 'concluida' and titulo like 'Montar briefing, dossiê, croqui e ficha técnica de%';
  titulo_tarefa := 'Revisar briefing, dossiê e croqui da IA de '||c.nome||' (editar ou pedir alteração)';
  if not exists (select 1 from tarefas where ordem_servico_id = p_os_id and titulo = titulo_tarefa) then
    insert into tarefas(titulo, status, prazo, prioridade, cliente_id, ordem_servico_id, origem, departamento)
    values (titulo_tarefa, 'pendente', current_date + 1, 'normal', o.cliente_id, p_os_id, 'fluxo', 'clientes');
  end if;
  return jsonb_build_object('ok', true, 'nome', c.nome);
end $$;

create or replace function public.criacao_ia_erro(p_os_id uuid, p_quiz_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_quiz_id is not null then update consultoria_quiz_envios set ia_status = 'erro' where id = p_quiz_id and ia_status = 'gerando'; end if;
  update dossies set ia_status = 'erro' where ordem_servico_id = p_os_id and ia_status = 'gerando';
end $$;

revoke all on function public.criacao_ia_pendentes(), public.criacao_ia_salvar(uuid,uuid,jsonb,jsonb,text,text), public.criacao_ia_erro(uuid,uuid) from public, anon, authenticated;
grant execute on function public.criacao_ia_pendentes(), public.criacao_ia_salvar(uuid,uuid,jsonb,jsonb,text,text), public.criacao_ia_erro(uuid,uuid) to service_role;
