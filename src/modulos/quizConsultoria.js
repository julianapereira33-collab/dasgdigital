// Perguntas do quiz da Consultoria Express. Os ids marcados com (ficha) são copiados pra ficha
// da cliente pela função quiz_responder() no banco (só preenchem o que estiver vazio).
// Mudar texto/ordem aqui é seguro; mudar um id (ficha) exige mudar a função SQL também.

export const BUCKET_ANEXOS = 'quiz-anexos';

const QUIZ_COMPLETO = [
  {
    id: 'voce', titulo: 'Sobre você', intro: 'Para eu te conhecer melhor antes da nossa conversa.',
    perguntas: [
      { id: 'instagram', tipo: 'texto', label: 'Seu Instagram (@)', ficha: true },
      { id: 'rotina', tipo: 'longo', label: 'Como é a sua rotina? (trabalho, vida social, o que você mais faz no dia a dia)' },
    ],
  },
  {
    id: 'ocasiao', titulo: 'Detalhes do evento', intro: 'Quanto mais eu souber do evento, mais certeira fica a peça.',
    perguntas: [
      { id: 'ocasiao', tipo: 'escolha', label: 'Qual é a ocasião?', opcoes: [['casamento', 'Casamento'], ['formatura', 'Formatura'], ['aniversario', 'Aniversário'], ['evento_corporativo', 'Evento corporativo'], ['batizado_cerimonia', 'Batizado / cerimônia'], ['dia_a_dia', 'Dia a dia'], ['outro', 'Outra']] },
      { id: 'papel', tipo: 'texto', label: 'Qual será o seu papel? (noiva, madrinha, mãe da noiva, convidada, formanda...)' },
      { id: 'data_evento', tipo: 'data', label: 'Data do evento' },
      { id: 'local_evento', tipo: 'texto', label: 'Nome do local e cidade (se já souber)' },
      { id: 'tipo_local', tipo: 'escolha', label: 'Como é o local?', opcoes: [['salao', 'Salão de festas / buffet'], ['igreja', 'Igreja / cerimônia religiosa'], ['hotel_clube', 'Hotel / clube'], ['ar_livre', 'Ao ar livre (campo, chácara, praia)'], ['empresa', 'Empresa / escritório'], ['outro', 'Outro'], ['', 'Ainda não sei']] },
      { id: 'periodo', tipo: 'escolha', label: 'Em que horário será?', opcoes: [['dia', 'Durante o dia'], ['fim_tarde', 'Fim de tarde'], ['noite', 'À noite'], ['', 'Não sei']] },
      { id: 'dress_code', tipo: 'escolha', label: 'Existe traje (dress code)?', opcoes: [['livre', 'Livre'], ['esporte_fino', 'Esporte fino'], ['social', 'Social / passeio completo'], ['black_tie', 'Black tie / gala'], ['tematico', 'Tema ou cor definida pelos anfitriões'], ['', 'Não sei / não há']] },
      { id: 'paleta_evento', tipo: 'anexo', label: 'O evento tem paleta de cores? Anexe a imagem da paleta (ou do convite) e/ou escreva as cores.' },
    ],
  },
  {
    id: 'estilo', titulo: 'Seu estilo', intro: 'Não existe resposta certa — é o que combina com você.',
    perguntas: [
      { id: 'estilo', tipo: 'escolha', label: 'Qual destes estilos mais combina com você?', ficha: true, opcoes: [['classico', 'Clássico — elegante e atemporal'], ['romantico', 'Romântico — delicado, fluido, feminino'], ['dramatico', 'Dramático — marcante, impactante'], ['esportivo', 'Esportivo — prático e descontraído'], ['criativo', 'Criativo — diferente, cheio de personalidade'], ['natural', 'Natural — simples e leve'], ['', 'Não sei dizer']] },
      { id: 'referencias', tipo: 'anexo', label: 'Referências de look que você ama: anexe fotos ou prints (Pinterest, Instagram) e/ou descreva.' },
      { id: 'como_lembrada', tipo: 'longo', label: 'Como você quer ser lembrada nesse evento? (três palavras ou uma frase)' },
      { id: 'evitar', tipo: 'longo', label: 'O que você NÃO quer de jeito nenhum? (decotes, comprimentos, detalhes, cores, tecidos que incomodam ou dão alergia...)' },
    ],
  },
  {
    id: 'cores', titulo: 'Cores e tecidos', intro: 'Ajuda a gente a escolher o que valoriza você.',
    perguntas: [
      { id: 'colorimetria', tipo: 'escolha', label: 'Você já sabe a sua cartela de cores?', ficha: true, opcoes: [['primavera', 'Primavera'], ['verao', 'Verão'], ['outono', 'Outono'], ['inverno', 'Inverno'], ['', 'Ainda não sei']] },
      { id: 'foto_colorimetria', tipo: 'anexo', label: 'Para eu indicar suas cores: anexe uma foto do rosto, de dia, sem maquiagem e sem filtro (opcional).' },
      { id: 'tecidos_cores', tipo: 'longo', label: 'Quais cores e tecidos você ama usar?', ficha: true },
    ],
  },
  {
    id: 'corpo', titulo: 'Corpo e conforto', intro: 'Para a modelagem ficar perfeita e confortável em você.',
    perguntas: [
      { id: 'biotipo', tipo: 'escolha', label: 'Qual formato mais parece com o seu corpo?', ficha: true, opcoes: [['ampulheta', 'Ampulheta — busto e quadril parecidos, cintura marcada'], ['triangulo', 'Triângulo — quadril mais largo que os ombros'], ['triangulo_invertido', 'Triângulo invertido — ombros/busto mais largos que o quadril'], ['retangulo', 'Retângulo — ombros, cintura e quadril parecidos'], ['oval', 'Oval — mais volume na região da barriga'], ['', 'Não sei']] },
      { id: 'restricoes_modelagem', tipo: 'longo', label: 'O que você gosta de valorizar no seu corpo? E o que prefere não destacar ou costuma incomodar nas roupas? (braços, barriga, costas, alças, zíper...)', ficha: true },
      { id: 'calcado', tipo: 'texto', label: 'Que sapato pretende usar com a peça? (altura do salto)' },
    ],
  },
  {
    id: 'medidas', titulo: 'Medidas', intro: 'Se não souber alguma, pode deixar em branco — a gente mede juntas. Em centímetros.',
    perguntas: [
      { id: 'busto', tipo: 'numero', label: 'Busto (cm)', ficha: true },
      { id: 'cintura', tipo: 'numero', label: 'Cintura (cm)', ficha: true },
      { id: 'quadril', tipo: 'numero', label: 'Quadril (cm)', ficha: true },
      { id: 'altura', tipo: 'numero', label: 'Altura (cm)', ficha: true },
      { id: 'peso', tipo: 'numero', label: 'Peso (kg) — opcional', ficha: true },
    ],
  },
  {
    id: 'final', titulo: 'Para fechar', intro: 'Últimas informações.',
    perguntas: [
      { id: 'investimento', tipo: 'texto', label: 'Quanto você pensa em investir nessa peça? (um valor aproximado)' },
      { id: 'prazo', tipo: 'texto', label: 'Para quando precisa da peça pronta? Existe data limite para as provas?' },
      { id: 'observacoes', tipo: 'longo', label: 'Quer me contar mais alguma coisa?' },
    ],
  },
];


const QUIZ_CONSULTIVO = [
  {
    id: 'evento_c', titulo: 'Seu evento', intro: 'Para eu entender o momento da peça.',
    perguntas: [
      { id: 'ocasiao', tipo: 'escolha', label: 'Qual é o tipo do evento?', opcoes: [['casamento', 'Casamento'], ['formatura', 'Formatura'], ['aniversario', 'Aniversário'], ['evento_corporativo', 'Evento corporativo'], ['batizado_cerimonia', 'Batizado / cerimônia'], ['dia_a_dia', 'Dia a dia'], ['outro', 'Outro']] },
      { id: 'data_evento', tipo: 'data', label: 'Data do evento' },
      { id: 'local_evento', tipo: 'texto', label: 'Local do evento (nome e cidade, se já souber)' },
      { id: 'papel', tipo: 'texto', label: 'Qual será o seu papel no evento? (noiva, madrinha, mãe da noiva, convidada, formanda...)' },
      { id: 'paleta_evento', tipo: 'anexo', label: 'O evento tem paleta de cores? Anexe a imagem da paleta (ou do convite) e/ou escreva as cores.' },
    ],
  },
  {
    id: 'vestido_c', titulo: 'O seu vestido', intro: 'Conte o que você imagina — não precisa ser técnico.',
    perguntas: [
      { id: 'referencias', tipo: 'anexo', label: 'Tem alguma inspiração? Envie fotos ou prints (Pinterest, Instagram) e/ou descreva.' },
      { id: 'expectativa', tipo: 'longo', label: 'O que você espera do vestido? (ex.: cobrir o braço, marcar a cintura, ser confortável para dançar...)' },
      { id: 'como_ser_vista', tipo: 'longo', label: 'Como você deseja ser vista nesse evento?' },
      { id: 'cor_1', tipo: 'texto', label: 'Cor desejada — 1ª opção' },
      { id: 'cor_2', tipo: 'texto', label: 'Cor desejada — 2ª opção' },
      { id: 'cor_3', tipo: 'texto', label: 'Cor desejada — 3ª opção' },
      { id: 'investimento', tipo: 'texto', label: 'Quanto você pretende investir no vestido? (um valor aproximado)' },
    ],
  },
];

const QUIZ_TECIDO = [
  {
    id: 'modelo_t', titulo: 'O modelo que você quer fazer', intro: 'Com isso eu indico o tecido certo e a metragem.',
    perguntas: [
      { id: 'modelo_desejado', tipo: 'anexo', label: 'Anexe a foto do modelo desejado e/ou descreva como ele é.' },
      { id: 'cor_1', tipo: 'texto', label: 'Cor desejada — 1ª opção' },
      { id: 'cor_2', tipo: 'texto', label: 'Cor desejada — 2ª opção' },
      { id: 'cor_3', tipo: 'texto', label: 'Cor desejada — 3ª opção' },
    ],
  },
  {
    id: 'medidas_t', titulo: 'Medidas', intro: 'Para calcular a metragem. Em centímetros — se não souber, deixe em branco.',
    perguntas: [
      { id: 'busto', tipo: 'numero', label: 'Busto (cm)', ficha: true },
      { id: 'cintura', tipo: 'numero', label: 'Cintura (cm)', ficha: true },
      { id: 'quadril', tipo: 'numero', label: 'Quadril (cm)', ficha: true },
      { id: 'altura', tipo: 'numero', label: 'Altura (cm)', ficha: true },
      { id: 'observacoes', tipo: 'longo', label: 'Quer me contar mais alguma coisa?' },
    ],
  },
];

const QUIZ_ORCAMENTO = [
  {
    id: 'modelo_o', titulo: 'O modelo que você quer', intro: 'Com isso a gente monta o orçamento da sua peça.',
    perguntas: [
      { id: 'modelo_desejado', tipo: 'anexo', label: 'Anexe a foto do modelo desejado e/ou descreva como ele é.' },
      { id: 'ocasiao', tipo: 'escolha', label: 'Qual é o tipo do evento?', opcoes: [['casamento', 'Casamento'], ['formatura', 'Formatura'], ['aniversario', 'Aniversário'], ['evento_corporativo', 'Evento corporativo'], ['batizado_cerimonia', 'Batizado / cerimônia'], ['dia_a_dia', 'Dia a dia'], ['outro', 'Outro']] },
      { id: 'data_evento', tipo: 'data', label: 'Data do evento' },
      { id: 'local_evento', tipo: 'texto', label: 'Local do evento (nome e cidade, se já souber)' },
      { id: 'cor_1', tipo: 'texto', label: 'Cor desejada' },
    ],
  },
  {
    id: 'medidas_o', titulo: 'Tamanho e medidas', intro: 'Se não souber alguma, pode deixar em branco — a gente mede juntas. Em centímetros.',
    perguntas: [
      { id: 'tamanho_habitual', tipo: 'texto', label: 'Tamanho que você costuma vestir (ex.: 48)' },
      { id: 'busto', tipo: 'numero', label: 'Busto (cm)', ficha: true },
      { id: 'cintura', tipo: 'numero', label: 'Cintura (cm)', ficha: true },
      { id: 'quadril', tipo: 'numero', label: 'Quadril (cm)', ficha: true },
      { id: 'altura', tipo: 'numero', label: 'Altura (cm)', ficha: true },
    ],
  },
  {
    id: 'final_o', titulo: 'Para fechar', intro: 'Últimas informações.',
    perguntas: [
      { id: 'opcao_peca', tipo: 'escolha', label: 'Como você prefere ter a peça?', opcoes: [['exclusiva', 'Comprar a peça exclusiva'], ['aluguel', 'Primeiro aluguel'], ['', 'Ainda não sei']] },
      { id: 'investimento', tipo: 'texto', label: 'Quanto você pensa em investir? (um valor aproximado)' },
      { id: 'observacoes', tipo: 'longo', label: 'Quer me contar mais alguma coisa?' },
    ],
  },
];

// My Personal Stylist: o quiz completo + a parte de acessórios, cabelo e make
const QUIZ_MPS = [...QUIZ_COMPLETO.slice(0, -1), {
  id: 'producao', titulo: 'Acessórios, cabelo e make', intro: 'A produção completa: do sapato à maquiagem.',
  perguntas: [
    { id: 'joias_acessorios', tipo: 'longo', label: 'Joias, bolsas e acessórios que você já tem e gostaria de usar (ou que ama)' },
    { id: 'foto_acessorios', tipo: 'anexo', label: 'Anexe fotos de acessórios, sapatos ou bolsas que já tem (opcional).' },
    { id: 'cabelo_pref', tipo: 'escolha', label: 'Como imagina o cabelo?', opcoes: [['solto', 'Solto'], ['preso', 'Preso / coque'], ['semi', 'Semipreso'], ['', 'Não sei, quero uma indicação']] },
    { id: 'cabelo_obs', tipo: 'longo', label: 'Seu cabelo hoje (comprimento, cor, química) e o que não abre mão. Se quiser, descreva ou anexe referências.' },
    { id: 'make_pref', tipo: 'escolha', label: 'Maquiagem', opcoes: [['natural', 'Natural e leve'], ['marcante', 'Marcante'], ['classica', 'Clássica / elegante'], ['', 'Não sei, quero uma indicação']] },
    { id: 'make_obs', tipo: 'longo', label: 'Algum cuidado com a pele ou a maquiagem que a gente precisa saber? (sensibilidade, produtos que não usa)' },
  ],
}, QUIZ_COMPLETO[QUIZ_COMPLETO.length - 1]];

export const QUIZ_POR_TIPO = { completo: QUIZ_COMPLETO, consultivo: QUIZ_CONSULTIVO, tecido: QUIZ_TECIDO, orcamento: QUIZ_ORCAMENTO, mps: QUIZ_MPS };
export const QUIZ_SECOES = QUIZ_COMPLETO; // compatibilidade: o quiz completo
export const secoesDoQuiz = (tipo) => QUIZ_POR_TIPO[tipo] || QUIZ_COMPLETO;
// todas as seções de todos os quizzes, sem repetir pergunta (para exibir o briefing de qualquer um)
export function secoesParaBriefing() {
  const vistos = new Set();
  return [...QUIZ_MPS, ...QUIZ_CONSULTIVO, ...QUIZ_TECIDO, ...QUIZ_ORCAMENTO].map(sec => ({ ...sec, perguntas: sec.perguntas.filter(p => { if (vistos.has(p.id)) return false; vistos.add(p.id); return true; }) })).filter(sec => sec.perguntas.length);
}

// Perguntas de versões anteriores do quiz: quem já respondeu continua com essas respostas visíveis no briefing.
export const PERGUNTAS_ANTIGAS = [
  { id: 'como_se_sente', tipo: 'longo', label: 'Como você se sente quando se olha no espelho vestida para sair?' },
  { id: 'pecas_que_ama', tipo: 'longo', label: 'Peça do guarda-roupa que faz você se sentir mais bonita' },
  { id: 'cores_evitar', tipo: 'texto', label: 'Cor que não usa ou não gosta' },
  { id: 'sensibilidade', tipo: 'texto', label: 'Tecido que incomoda ou causa alergia' },
  { id: 'valorizar', tipo: 'longo', label: 'O que mais gosta no corpo e quer valorizar' },
];

export const TODAS_PERGUNTAS = secoesParaBriefing().flatMap(s => s.perguntas.map(p => ({ ...p, secao: s.titulo })));

// valor legível de uma resposta (converte o id de opção no rótulo)
export function respostaLegivel(p, valor) {
  if (valor === undefined || valor === null || valor === '') return '';
  if (p.tipo === 'anexo') {
    if (typeof valor === 'string') return valor;
    const n = (valor.arquivos || []).length;
    return [valor.texto || '', n ? `(${n} anexo${n > 1 ? 's' : ''})` : ''].filter(Boolean).join(' ');
  }
  if (p.tipo === 'escolha') return (p.opcoes.find(o => o[0] === valor) || [null, valor])[1];
  if (p.tipo === 'data') return new Date(valor + 'T12:00:00').toLocaleDateString('pt-BR');
  return String(valor);
}

export function linkDoQuiz(token) {
  return `${window.location.origin}/?quiz=${token}`;
}
