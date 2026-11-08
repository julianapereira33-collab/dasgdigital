-- A Júlia faz as perguntas do orçamento na conversa e grava as respostas na ficha da cliente (aparecem como o quiz "orcamento").
alter table public.consultoria_quiz_envios drop constraint if exists consultoria_quiz_envios_tipo_quiz_check;
alter table public.consultoria_quiz_envios add constraint consultoria_quiz_envios_tipo_quiz_check check (tipo_quiz in ('completo','consultivo','tecido','orcamento'));

create or replace function public.julia_salvar_orcamento(p_telefone text, p_nome text, p_dados jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_dig text; v_chave text; v_cli uuid; v_os uuid; v_quiz uuid; v_limpo jsonb;
begin
  v_dig := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  if length(v_dig) < 8 then return jsonb_build_object('ok', false, 'erro', 'telefone invalido'); end if;
  v_chave := right(v_dig, 8);
  select jsonb_object_agg(k, v) into v_limpo from jsonb_each(coalesce(p_dados, '{}'::jsonb)) as t(k, v)
    where v is not null and v <> '""'::jsonb and v <> 'null'::jsonb;
  v_limpo := coalesce(v_limpo, '{}'::jsonb);

  select id into v_cli from public.clientes where right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 8) = v_chave order by created_at desc limit 1;
  if v_cli is null then
    insert into public.clientes (nome, telefone, origem) values (coalesce(nullif(p_nome, ''), 'Cliente WhatsApp'), v_dig, 'whatsapp_julia') returning id into v_cli;
  end if;

  select id into v_os from public.ordens_servico where cliente_id = v_cli
    and status in ('atendimento','agendamento','consultoria','criacao','orcamento','aprovacao') order by created_at desc limit 1;

  select id into v_quiz from public.consultoria_quiz_envios where cliente_id = v_cli and tipo_quiz = 'orcamento'
    and ordem_servico_id is not distinct from v_os and criado_em > now() - interval '14 days' order by criado_em desc limit 1;
  if v_quiz is null then
    insert into public.consultoria_quiz_envios (cliente_id, ordem_servico_id, nome_cliente, telefone, status, respostas, respondido_em, tipo_quiz)
    values (v_cli, v_os, coalesce(nullif(p_nome, ''), (select nome from public.clientes where id = v_cli)), v_dig, 'respondido', v_limpo, now(), 'orcamento');
  else
    update public.consultoria_quiz_envios set respostas = respostas || v_limpo, status = 'respondido', respondido_em = now() where id = v_quiz;
  end if;

  begin
    update public.clientes c set
      busto = coalesce(c.busto, nullif(v_limpo->>'busto', '')::numeric), cintura = coalesce(c.cintura, nullif(v_limpo->>'cintura', '')::numeric),
      quadril = coalesce(c.quadril, nullif(v_limpo->>'quadril', '')::numeric), altura = coalesce(c.altura, nullif(v_limpo->>'altura', '')::numeric)
    where c.id = v_cli;
  exception when others then null; end;

  return jsonb_build_object('ok', true, 'cliente_id', v_cli, 'ordem_servico_id', v_os);
end $$;
revoke execute on function public.julia_salvar_orcamento(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.julia_salvar_orcamento(text, text, jsonb) to service_role;
