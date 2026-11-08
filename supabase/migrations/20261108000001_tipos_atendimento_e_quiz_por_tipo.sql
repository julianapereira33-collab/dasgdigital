-- 4 atendimentos (completo, consultivo, orcamento, orientacao_tecido) + qual quiz cada envio usa.
alter table public.ordens_servico drop constraint if exists ordens_servico_tipo_atendimento_check;
alter table public.ordens_servico drop constraint if exists ordens_servico_tipo_atendimento_chk;
alter table public.ordens_servico add constraint ordens_servico_tipo_atendimento_check check (tipo_atendimento in
  ('completo','consultivo','orcamento','orientacao_tecido','estilista_express','consultoria_express','teste_colorimetria','atendimento'));
alter table public.consultoria_quiz_envios add column if not exists tipo_quiz text not null default 'completo';
alter table public.consultoria_quiz_envios drop constraint if exists consultoria_quiz_envios_tipo_quiz_check;
alter table public.consultoria_quiz_envios add constraint consultoria_quiz_envios_tipo_quiz_check check (tipo_quiz in ('completo','consultivo','tecido'));

create or replace function public.quiz_obter(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.consultoria_quiz_envios;
begin
  select * into r from public.consultoria_quiz_envios where token = p_token;
  if not found then return null; end if;
  return jsonb_build_object('nome', r.nome_cliente, 'status', r.status, 'respostas', r.respostas, 'tipo_quiz', r.tipo_quiz);
end $$;
