-- Backup diário: bucket privado "backups" + função que exporta as tabelas principais em JSON (só service_role).
-- O n8n ("Das G — Backup diário do banco (JSON)") roda às 3h e grava backups/AAAA-MM-DD.json.
insert into storage.buckets (id, name, public) values ('backups', 'backups', false) on conflict (id) do nothing;
create or replace function public.backup_snapshot() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  tabelas text[] := array['clientes','leads','ordens_servico','os_producao','os_arquivos','agenda','tarefas','agenda_modelos_msg','orcamentos','pedidos_venda','financeiro_receber','financeiro_pagar','dossies','briefings','consultoria_quiz_envios','prompts_ia','respostas_automaticas','conhecimento_julia','conversas_whatsapp'];
  t text; r jsonb := jsonb_build_object('gerado_em', now());
  q jsonb;
begin
  foreach t in array tabelas loop
    if to_regclass('public.' || t) is not null then
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into q;
      r := r || jsonb_build_object(t, q);
    end if;
  end loop;
  return r;
end $$;
revoke all on function public.backup_snapshot() from public, anon, authenticated;
grant execute on function public.backup_snapshot() to service_role;
