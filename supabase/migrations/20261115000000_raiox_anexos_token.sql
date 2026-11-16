-- Permite que o questionário do Raio X (infoproduto_clientes.quiz_token) envie anexos ao bucket quiz-anexos.
create or replace function public.quiz_token_valido(p_token text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.consultoria_quiz_envios where token = p_token and status <> 'respondido')
      or exists (select 1 from public.infoproduto_clientes where quiz_token = p_token and status not in ('quiz_respondido','entregue'))
$$;
