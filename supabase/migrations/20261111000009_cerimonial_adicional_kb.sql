update conhecimento_julia set conteudo = replace(conteudo,
 '→ STYLIST CERIMONIAL (R$ 497, 2 horas, do salão até a entrada; sem questionário, só pagamento e confirmação do horário).',
 '→ STYLIST CERIMONIAL (R$ 497, 2 horas, do salão até a entrada; sem questionário, só pagamento e confirmação do horário). É um serviço ADICIONAL, vendido depois dos demais e oferecido nas provas finais pela equipe: se a cliente perguntar, explique e acione a equipe; não use como primeira oferta nem como porta de entrada.')
 where conteudo like '%STYLIST CERIMONIAL (R$ 497, 2 horas%';
update conhecimento_julia set conteudo = replace(conteudo,
 '7) STYLIST CERIMONIAL — R$ 497 — acompanhamento',
 '7) STYLIST CERIMONIAL — R$ 497 — serviço adicional, vendido depois dos demais e oferecido nas provas finais; sem questionário. Acompanhamento')
 where conteudo like '%7) STYLIST CERIMONIAL — R$ 497 — acompanhamento%';
