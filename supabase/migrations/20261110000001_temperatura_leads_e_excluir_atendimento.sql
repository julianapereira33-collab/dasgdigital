alter table public.atendimento_whatsapp add column if not exists temperatura text check (temperatura in ('quente','morno','frio','declinou'));

create or replace function public.atendimento_excluir(p_os_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'erro','não autenticado'); end if;
  if exists (select 1 from fichas_tecnicas where ordem_servico_id=p_os_id)
     or exists (select 1 from listas_materiais where ordem_servico_id=p_os_id)
     or exists (select 1 from provas where ordem_servico_id=p_os_id)
     or exists (select 1 from financeiro_receber where ordem_servico_id=p_os_id) then
    return jsonb_build_object('ok',false,'erro','Este atendimento já tem ficha técnica, provas, materiais ou financeiro. Não dá para excluir; altere ou cancele.');
  end if;
  delete from tarefas where ordem_servico_id=p_os_id;
  delete from agenda where ordem_servico_id=p_os_id;
  delete from consultoria_quiz_envios where ordem_servico_id=p_os_id;
  delete from briefings where ordem_servico_id=p_os_id;
  delete from ordens_servico where id=p_os_id;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.atendimento_excluir(uuid) from public, anon;
grant execute on function public.atendimento_excluir(uuid) to authenticated, service_role;
