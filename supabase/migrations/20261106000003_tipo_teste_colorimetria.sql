alter table public.ordens_servico drop constraint if exists ordens_servico_tipo_atendimento_check;
alter table public.ordens_servico add constraint ordens_servico_tipo_atendimento_check check (tipo_atendimento in ('estilista_express','consultoria_express','teste_colorimetria','atendimento'));
