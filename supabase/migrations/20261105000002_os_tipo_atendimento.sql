-- Tipo do atendimento da OS: define se há quiz, valor e link de pagamento
alter table public.ordens_servico add column if not exists tipo_atendimento text not null default 'consultoria_express';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='ordens_servico_tipo_atendimento_chk') then
    alter table public.ordens_servico add constraint ordens_servico_tipo_atendimento_chk check (tipo_atendimento in ('estilista_express','consultoria_express','atendimento'));
  end if;
end $$;
