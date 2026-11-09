-- Catálogo oficial (arquivo 23): novos tipos de atendimento Stylist Cerimonial e My Personal Stylist.
alter table public.ordens_servico drop constraint if exists ordens_servico_tipo_atendimento_check;
alter table public.ordens_servico add constraint ordens_servico_tipo_atendimento_check check (tipo_atendimento = any (array['completo','consultivo','orcamento','orientacao_tecido','cerimonial','my_personal_stylist','estilista_express','consultoria_express','teste_colorimetria','atendimento']));
