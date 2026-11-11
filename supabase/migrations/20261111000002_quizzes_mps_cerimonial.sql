-- Quiz próprio do My Personal Stylist ('mps'); Cerimonial não tem quiz.
alter table public.consultoria_quiz_envios drop constraint consultoria_quiz_envios_tipo_quiz_check;
alter table public.consultoria_quiz_envios add constraint consultoria_quiz_envios_tipo_quiz_check check (tipo_quiz = any (array['completo','consultivo','tecido','orcamento','mps','cerimonial']));
-- _fluxo_cfg: cerimonial -> sem quiz; my_personal_stylist -> quiz 'mps' e R$ 947 (ver migration anterior para os demais nomes)
-- criacao_ia_pendentes: filtro passa a incluir 'mps'
