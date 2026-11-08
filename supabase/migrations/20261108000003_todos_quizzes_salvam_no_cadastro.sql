-- Todos os quizzes (completo, consultivo, tecido, orçamento da Júlia) gravam no briefing e na ficha da cliente.
-- Respostas de tipos diferentes na mesma OS se somam (merge) em vez de sobrescrever; medidas aceitam "110 cm" / "92,5".
create or replace function public._num_ou_nulo(t text) returns numeric language sql immutable as $$
  select nullif(replace((regexp_match(coalesce(t,''), '[0-9]+(?:[.,][0-9]+)?'))[1], ',', '.'), '')::numeric $$;
revoke execute on function public._num_ou_nulo(text) from public, anon, authenticated;
-- quiz_responder e julia_salvar_orcamento: ver definição aplicada no banco (briefing com merge + _num_ou_nulo).
