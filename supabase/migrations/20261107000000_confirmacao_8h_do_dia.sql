-- Confirmação de agendamento: enviada à cliente às 8h do dia do evento (n8n varre a cada 10 min entre 8h e 20h).
alter table public.agenda add column if not exists confirmacao_pendente boolean not null default false;

create or replace function public.agenda_confirmacoes_do_dia(p_segredo text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_segredo is distinct from (select alertas_segredo from public.agenda_seguranca where id = 1) then raise exception 'não autorizado'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'mensagem', a.confirmacao_mensagem, 'cliente_nome', c.nome, 'cliente_telefone', c.telefone, 'data_hora', a.data_hora) order by a.data_hora)
    from public.agenda a join public.clientes c on c.id = a.cliente_id
    where a.confirmacao_pendente and a.confirmacao_enviada_em is null
      and coalesce(a.confirmacao_mensagem, '') <> '' and coalesce(c.telefone, '') <> ''
      and coalesce(a.status, '') not in ('cancelado', 'realizado')
      and (a.data_hora at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date
      and extract(hour from (now() at time zone 'America/Sao_Paulo')) >= 8
      and a.data_hora > now()
  ), '[]'::jsonb);
end $$;

create or replace function public.agenda_marcar_confirmacao(p_segredo text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_segredo is distinct from (select alertas_segredo from public.agenda_seguranca where id = 1) then raise exception 'não autorizado'; end if;
  update public.agenda set confirmacao_enviada_em = now(), confirmacao_pendente = false,
    status = case when coalesce(status, 'agendado') = 'agendado' then 'aguardando_confirmacao' else status end where id = p_id;
end $$;

revoke execute on function public.agenda_confirmacoes_do_dia(text), public.agenda_marcar_confirmacao(text, uuid) from public;
grant execute on function public.agenda_confirmacoes_do_dia(text), public.agenda_marcar_confirmacao(text, uuid) to anon, authenticated;
