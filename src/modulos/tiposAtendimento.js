// Os 4 atendimentos da Ju Pereira. "quiz" diz qual questionário a cliente recebe (null = sem quiz).
// "cobra" = tem pagamento antes do atendimento. Os tipos antigos continuam válidos para OS já criadas.
export const TIPOS_ATENDIMENTO = {
  completo: {
    label: 'Completo', preco: 397, cobra: true, quiz: 'completo', pagamento: 'do atendimento completo',
    duracao: '1 hora, presencial ou online',
    inclui: ['Quiz completo para o dossiê', 'Análise de biotipo, estilo, colorimetria e dress code', 'Criação com técnicas de harmonização', 'Dossiê e ficha técnica do vestido', 'Orçamento'],
  },
  consultivo: {
    label: 'Consultivo', preco: 97, cobra: true, quiz: 'consultivo', pagamento: 'do atendimento consultivo',
    inclui: ['Quiz com informações-base do evento e do vestido', 'Criação do croqui', 'Orçamento'],
  },
  orcamento: {
    label: 'Orçamento (sem cobrança)', preco: 0, cobra: false, quiz: 'orcamento', pagamento: 'do orçamento',
    inclui: ['Para quem já tem o modelo e quer que o ateliê faça', 'Orçamento'],
  },
  orientacao_tecido: {
    label: 'Orientação de tecido', preco: 47.9, cobra: true, quiz: 'tecido', pagamento: 'da orientação de tecido',
    inclui: ['Tecido e metragem para o modelo desejado', 'Croqui', 'Orientação de harmonização', 'Atendimento na loja de tecidos'],
  },
  // tipos antigos (OS já existentes): seguem funcionando, não aparecem para novas OS
  consultoria_express: { label: 'Consultoria Express (antigo)', legado: true, preco: 297, cobra: true, quiz: 'completo', pagamento: 'da consultoria' },
  estilista_express: { label: 'Estilista Express (antigo)', legado: true, preco: 297, cobra: true, quiz: 'completo', pagamento: 'da estilista express' },
  teste_colorimetria: { label: 'Teste de colorimetria', legado: true, preco: 0, cobra: true, quiz: null, pagamento: 'do teste de colorimetria' },
  atendimento: { label: 'Atendimento (antigo, sem quiz)', legado: true, preco: 0, cobra: true, quiz: null, pagamento: 'do atendimento' },
};
export const TIPO_PADRAO = 'completo';
export const tipoDaOS = (os) => {
  const t = TIPOS_ATENDIMENTO[os?.tipo_atendimento] || TIPOS_ATENDIMENTO.consultoria_express;
  return { ...t, quiz: !!t.quiz, tipoQuiz: t.quiz };
};
export const brlTipo = (t) => t.preco ? Number(t.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'sem cobrança';
