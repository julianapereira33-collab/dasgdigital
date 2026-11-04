-- Agendas separadas por departamento (atendimento de clientes, ateliê/oficina, recepção)
-- e checklist de atendimento da OS (pagamento da consultoria, videoconferência, disparos).
-- 100% idempotente e só adiciona colunas: não apaga nem altera dados existentes.

alter table public.agenda add column if not exists departamento text not null default 'atendimento';
alter table public.tarefas add column if not exists departamento text not null default 'atendimento';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_departamento_check') then
    alter table public.agenda add constraint agenda_departamento_check
      check (departamento = any (array['atendimento','atelie','recepcao']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tarefas_departamento_check') then
    alter table public.tarefas add constraint tarefas_departamento_check
      check (departamento = any (array['atendimento','atelie','recepcao']));
  end if;
end $$;

-- Checklist de atendimento (consultoria) na OS
alter table public.ordens_servico add column if not exists consultoria_valor numeric;
alter table public.ordens_servico add column if not exists link_pagamento text;
alter table public.ordens_servico add column if not exists pagamento_status text not null default 'pendente';
alter table public.ordens_servico add column if not exists pagamento_link_enviado_em timestamptz;
alter table public.ordens_servico add column if not exists pago_em timestamptz;
alter table public.ordens_servico add column if not exists meet_enviado_em timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ordens_servico_pagamento_status_check') then
    alter table public.ordens_servico add constraint ordens_servico_pagamento_status_check
      check (pagamento_status = any (array['pendente','link_enviado','pago']));
  end if;
end $$;

create index if not exists agenda_departamento_data_idx on public.agenda (departamento, data_hora);
create index if not exists tarefas_departamento_idx on public.tarefas (departamento, status);
