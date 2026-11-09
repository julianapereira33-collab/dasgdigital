// Fonte única das etapas do fluxo da OS (mesma ordem do check constraint de ordens_servico.status).
// Cliente → atendimento → agendamento → consultoria → criação → orçamento → aprovação → venda → OS →
// tecido → corte → montagem → provas e ajustes → finalização → entrega → pós-venda → marketing.
export const ETAPAS = [
  { slug: 'cliente', label: 'Cliente cadastrada', fase: 'ATENDIMENTO', cor: '#6366f1' },
  { slug: 'atendimento', label: 'Atendimento', fase: 'ATENDIMENTO', cor: '#8b5cf6' },
  { slug: 'agendamento', label: 'Agendamento', fase: 'ATENDIMENTO', cor: '#a78bfa' },
  { slug: 'consultoria', label: 'Consultoria', fase: 'ATENDIMENTO', cor: '#f59e0b' },
  { slug: 'criacao', label: 'Criação', fase: 'CRIAÇÃO E VENDA', cor: '#0ea5e9' },
  { slug: 'orcamento', label: 'Orçamento', fase: 'CRIAÇÃO E VENDA', cor: '#f97316' },
  { slug: 'aprovacao', label: 'Aprovação', fase: 'CRIAÇÃO E VENDA', cor: '#22c55e' },
  { slug: 'venda', label: 'Venda (entrada)', fase: 'CRIAÇÃO E VENDA', cor: '#16a34a' },
  { slug: 'os', label: 'OS aberta', fase: 'OFICINA', cor: '#15803d' },
  { slug: 'tecido', label: 'Tecido e medidas', fase: 'OFICINA', cor: '#0284c7' },
  { slug: 'corte', label: 'Corte', fase: 'OFICINA', cor: '#0369a1' },
  { slug: 'montagem', label: 'Montagem', fase: 'OFICINA', cor: '#075985' },
  { slug: 'prova1', label: '1ª prova', fase: 'PROVAS', cor: '#f472b6' },
  { slug: 'ajuste1', label: 'Ajuste da 1ª prova', fase: 'PROVAS', cor: '#ec4899' },
  { slug: 'prova2', label: '2ª prova', fase: 'PROVAS', cor: '#db2777' },
  { slug: 'ajuste2', label: 'Ajuste da 2ª prova', fase: 'PROVAS', cor: '#be185d' },
  { slug: 'prova_final', label: '3ª prova (final)', fase: 'PROVAS', cor: '#9d174d' },
  { slug: 'prova4', label: '4ª prova (exceção)', fase: 'PROVAS', cor: '#831843' },
  { slug: 'finalizacao', label: 'Finalização', fase: 'ENTREGA', cor: '#d4a017' },
  { slug: 'entrega', label: 'Entrega', fase: 'ENTREGA', cor: '#8b6914' },
  { slug: 'pos_venda', label: 'Pós-venda', fase: 'PÓS', cor: '#78716c' },
  { slug: 'marketing', label: 'Marketing', fase: 'PÓS', cor: '#57534e' },
];
export const SLUGS_ETAPA = ETAPAS.map(e => e.slug);
export const ROTULO_ETAPA = Object.fromEntries(ETAPAS.map(e => [e.slug, e.label]));
export const FASES_FLUXO = [...new Set(ETAPAS.map(e => e.fase))];
export const TOTAL_ETAPAS = ETAPAS.length;
export const idxEtapa = (slug) => SLUGS_ETAPA.indexOf(slug) + 1; // 1..22
