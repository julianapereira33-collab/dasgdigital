// Serviços DAS G Stylist / Couture da Ju Pereira. "quiz" diz qual questionário a cliente recebe (null = sem quiz).
// "cobra" = tem pagamento antes do atendimento. Os tipos antigos continuam válidos para OS já criadas.
export const TIPOS_ATENDIMENTO = {
  completo: {
    label: 'Estilista com Ju Pereira', preco: 397, cobra: true, quiz: 'completo', pagamento: 'da Estilista com Ju Pereira',
    duracao: 'Online (apoio de IA + 30 min com a Ju) ou presencial',
    inclui: ['Questionário aprofundado + videochamada de 30 min com a Ju', 'Análise de biotipo, estilo, colorimetria e dress code', 'Criação do vestido com técnicas de harmonização', 'Croqui, dossiê e ficha técnica do vestido', 'Orçamento para confecção', 'Fechando o vestido: benefício My Personal Stylist completo, sem cobrança adicional'],
  },
  consultivo: {
    label: 'Curadoria Consultiva', preco: 147, cobra: true, quiz: 'consultivo', pagamento: 'da Curadoria Consultiva',
    inclui: ['Questionário objetivo do evento e do vestido', 'Interpretação das referências e orientação de modelo', '1 croqui e 1 proposta', 'Orçamento para confecção'],
  },
  orcamento: {
    label: 'Orçamento Couture (gratuito)', preco: 0, cobra: false, quiz: 'orcamento', pagamento: 'do orçamento',
    inclui: ['Para quem já tem foto, desenho ou referência do vestido', 'Avaliação de viabilidade e orçamento'],
  },
  orientacao_tecido: {
    label: 'My Curadoria de Tecidos', preco: 47, cobra: true, quiz: 'tecido', pagamento: 'da My Curadoria de Tecidos',
    inclui: ['Orientação de tecido, caimento e estrutura (na Das G Tissu)', 'Estimativa de metragem', 'Croqui simplificado e harmonização'],
  },
  cerimonial: {
    label: 'Stylist Cerimonial', preco: 497, cobra: true, quiz: null, pagamento: 'do Stylist Cerimonial',
    duracao: '2 horas, do salão até a entrada do evento',
    inclui: ['Acompanhamento no dia do evento, enquanto ela se arruma e se veste', 'Leva a cliente até a entrada (não permanece no evento)'],
  },
  my_personal_stylist: {
    label: 'My Personal Stylist (pacote VIP)', preco: 947, cobra: true, quiz: 'mps', pagamento: 'do My Personal Stylist',
    inclui: ['Raio X do Estilo + Minha Paleta + Estilista com Ju Pereira', 'Curadoria de acessórios, cabelo e make'],
  },
  // tipos antigos (OS já existentes): seguem funcionando, não aparecem para novas OS
  consultoria_express: { label: 'Consultoria Express (antigo)', legado: true, preco: 297, cobra: true, quiz: 'completo', pagamento: 'da consultoria' },
  estilista_express: { label: 'Estilista Express (antigo)', legado: true, preco: 297, cobra: true, quiz: 'completo', pagamento: 'da estilista express' },
  teste_colorimetria: { label: 'Teste de colorimetria', legado: true, preco: 0, cobra: true, quiz: null, pagamento: 'do teste de colorimetria' },
  atendimento: { label: 'Atendimento (antigo, sem quiz)', legado: true, preco: 0, cobra: true, quiz: null, pagamento: 'do atendimento' },
};
export const TIPO_PADRAO = 'completo';
export const tipoDaOS = (os) => {
  const t = TIPOS_ATENDIMENTO[os?.tipo_atendimento] || TIPOS_ATENDIMENTO.completo;
  return { ...t, quiz: !!t.quiz, tipoQuiz: t.quiz };
};
export const brlTipo = (t) => t.preco ? Number(t.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'sem cobrança';
