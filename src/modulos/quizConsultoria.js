// Perguntas do quiz da Consultoria Express. Os ids marcados com (ficha) são copiados pra ficha
// da cliente pela função quiz_responder() no banco (só preenchem o que estiver vazio).
// Mudar texto/ordem aqui é seguro; mudar um id (ficha) exige mudar a função SQL também.

export const BUCKET_ANEXOS = 'quiz-anexos';

export const QUIZ_SECOES = [
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
      { id: 'evitar', tipo: 'longo', label: 'O que você NÃO quer de jeito nenhum? (decotes, comprimentos, detalhes, cores, tecidos que incomodam ou dão alergia...)' },
    ],
  },
  {
    id: 'cores', titulo: 'Cores e tecidos', intro: 'Ajuda a gente a escolher o que valoriza você.',
    perguntas: [
      { id: 'colorimetria', tipo: 'escolha', label: 'Você já sabe a sua cartela de cores?', ficha: true, opcoes: [['primavera', 'Primavera'], ['verao', 'Verão'], ['outono', 'Outono'], ['inverno', 'Inverno'], ['', 'Ainda não sei']] },
      { id: 'tecidos_cores', tipo: 'longo', label: 'Quais cores e tecidos você ama usar?', ficha: true },
    ],
  },
  {
    id: 'corpo', titulo: 'Corpo e conforto', intro: 'Para a modelagem ficar perfeita e confortável em você.',
    perguntas: [
      { id: 'biotipo', tipo: 'escolha', label: 'Qual formato mais parece com o seu corpo?', ficha: true, opcoes: [['ampulheta', 'Ampulheta — busto e quadril parecidos, cintura marcada'], ['triangulo', 'Triângulo — quadril mais largo que os ombros'], ['triangulo_invertido', 'Triângulo invertido — ombros/busto mais largos que o quadril'], ['retangulo', 'Retângulo — ombros, cintura e quadril parecidos'], ['oval', 'Oval — mais volume na região da barriga'], ['', 'Não sei']] },
      { id: 'restricoes_modelagem', tipo: 'longo', label: 'O que você gosta de valorizar no seu corpo? E o que prefere disfarçar ou costuma incomodar nas roupas? (braços, barriga, costas, alças, zíper...)', ficha: true },
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

// Perguntas de versões anteriores do quiz: quem já respondeu continua com essas respostas visíveis no briefing.
export const PERGUNTAS_ANTIGAS = [
  { id: 'como_se_sente', tipo: 'longo', label: 'Como você se sente quando se olha no espelho vestida para sair?' },
  { id: 'pecas_que_ama', tipo: 'longo', label: 'Peça do guarda-roupa que faz você se sentir mais bonita' },
  { id: 'cores_evitar', tipo: 'texto', label: 'Cor que não usa ou não gosta' },
  { id: 'sensibilidade', tipo: 'texto', label: 'Tecido que incomoda ou causa alergia' },
  { id: 'valorizar', tipo: 'longo', label: 'O que mais gosta no corpo e quer valorizar' },
  { id: 'tamanho_habitual', tipo: 'texto', label: 'Tamanho que costuma vestir' },
];

export const TODAS_PERGUNTAS = QUIZ_SECOES.flatMap(s => s.perguntas.map(p => ({ ...p, secao: s.titulo })));

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
