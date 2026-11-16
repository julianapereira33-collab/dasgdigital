// Quiz do Raio X do Estilo (rascunho para revisão). Perguntas com ficha:true alimentam a ficha da cliente.
// Para ativar no CRM (src/modulos/quizConsultoria.js):
//   1) import { QUIZ_RAIOX } from './quizRaioX.js';
//   2) QUIZ_POR_TIPO = { ..., raiox: QUIZ_RAIOX }
//   3) incluir QUIZ_RAIOX em secoesParaBriefing() e no TITULO_POR_TIPO do QuizPublico.jsx ("Raio X do Estilo · Questionário")
const REGIOES = [['amo', 'Amo'], ['neutro', 'Neutro'], ['incomoda', 'Me incomoda'], ['nao_destacar', 'Prefiro não destacar']];
const regiao = (id, label) => ({ id: 'regiao_' + id, tipo: 'escolha', label, opcoes: REGIOES });

export const QUIZ_RAIOX = [
  { id: 'rx_voce', titulo: 'Você', intro: 'Para eu te conhecer antes de olhar para o seu estilo.',
    perguntas: [
      { id: 'tres_palavras', tipo: 'texto', label: 'Como você se descreve em três palavras?' },
      { id: 'rotina', tipo: 'longo', label: 'Como é a sua rotina? (trabalho, vida social, o que você mais faz no dia a dia)' },
      { id: 'ocupacao', tipo: 'texto', label: 'Sua profissão ou ocupação' },
      { id: 'instagram', tipo: 'texto', label: 'Seu Instagram (@)', ficha: true },
    ] },
  { id: 'rx_estilo', titulo: 'Seu estilo', intro: 'Não existe resposta certa: é o que combina com você.',
    perguntas: [
      { id: 'estilo', tipo: 'escolha', label: 'Qual destes estilos mais combina com você?', ficha: true, opcoes: [['classico', 'Clássico — elegante e atemporal'], ['romantico', 'Romântico — delicado, fluido, feminino'], ['dramatico', 'Dramático — marcante, impactante'], ['natural', 'Natural — simples e leve'], ['criativo', 'Criativo — diferente, cheio de personalidade'], ['esportivo', 'Esportivo — prático e descontraído'], ['moderno', 'Sofisticado moderno — linhas limpas, atual'], ['', 'Não sei dizer']] },
      { id: 'par_estrutura', tipo: 'escolha', label: 'Você prefere roupas...', opcoes: [['estruturado', 'Mais estruturadas, com forma definida'], ['fluido', 'Mais fluidas, que se movem com o corpo'], ['', 'Depende do dia']] },
      { id: 'par_presenca', tipo: 'escolha', label: 'Você prefere...', opcoes: [['discreto', 'Um look discreto e elegante'], ['marcante', 'Um look marcante, que chama atenção'], ['', 'Depende da ocasião']] },
      { id: 'par_tempo', tipo: 'escolha', label: 'Você se identifica mais com...', opcoes: [['classico', 'Peças clássicas, que nunca saem de moda'], ['moderno', 'Peças modernas e atuais'], ['', 'Um pouco dos dois']] },
      { id: 'par_detalhe', tipo: 'escolha', label: 'Você prefere...', opcoes: [['minimalista', 'Poucos detalhes, corte limpo'], ['detalhado', 'Detalhes, texturas e bordados'], ['', 'Depende da peça']] },
      { id: 'referencias', tipo: 'anexo', label: 'Looks que você ama: anexe fotos ou prints (Pinterest, Instagram) e/ou descreva.' },
      { id: 'pecas_que_ama', tipo: 'anexo', label: 'Anexe fotos de peças suas que você ama usar (opcional).' },
    ] },
  { id: 'rx_imagem', titulo: 'Como você quer ser vista', intro: 'A roupa conta quem você é. Conte para mim como você quer ser lembrada.',
    perguntas: [
      { id: 'como_lembrada', tipo: 'longo', label: 'Como você quer ser lembrada quando entra num lugar? (três palavras ou uma frase)' },
      { id: 'como_se_sente', tipo: 'longo', label: 'Quando você se olha no espelho vestida para sair, o que você sente?' },
      { id: 'dia_mais_bonita', tipo: 'longo', label: 'Qual foi um dia em que você se sentiu muito bonita? O que estava vestindo?' },
    ] },
  { id: 'rx_corpo', titulo: 'Seu corpo', intro: 'Aqui a gente fala de valorizar, nunca de esconder. Responda com sinceridade, só eu e a equipe vamos ler.',
    perguntas: [
      { id: 'biotipo', tipo: 'escolha', label: 'Qual formato mais parece com o seu corpo?', ficha: true, opcoes: [['ampulheta', 'Ampulheta — busto e quadril parecidos, cintura marcada'], ['triangulo', 'Triângulo — quadril mais largo que os ombros'], ['triangulo_invertido', 'Triângulo invertido — ombros/busto mais largos que o quadril'], ['retangulo', 'Retângulo — ombros, cintura e quadril parecidos'], ['oval', 'Oval — mais volume na região da barriga'], ['', 'Não sei']] },
      { id: 'pontos_fortes', tipo: 'longo', label: 'O que você mais gosta no seu corpo e quer valorizar?' },
      regiao('bracos', 'Braços'), regiao('busto', 'Busto'), regiao('costas', 'Costas'), regiao('barriga', 'Barriga'),
      regiao('cintura', 'Cintura'), regiao('quadril', 'Quadril'), regiao('coxas', 'Coxas'), regiao('panturrilhas', 'Panturrilhas'), regiao('colo_pescoco', 'Pescoço e colo'),
      { id: 'dor_roupa', tipo: 'longo', label: 'O que mais te incomoda na hora de se vestir? (manga apertada, blusa que sobe, alça que machuca, não achar o seu tamanho...)' },
      { id: 'peca_nunca_usou', tipo: 'longo', label: 'Qual peça você comprou e nunca usou? Por quê?' },
      { id: 'restricoes_modelagem', tipo: 'longo', label: 'Existe algo que a modelagem precisa respeitar? (cirurgia, cicatriz, sensibilidade, dor com algum tecido). Opcional, e não aparece escrito no seu dossiê.', ficha: true },
    ] },
  { id: 'rx_medidas', titulo: 'Medidas', intro: 'Em centímetros. Se não souber alguma, pode deixar em branco.',
    perguntas: [
      { id: 'tamanho_habitual', tipo: 'texto', label: 'Tamanho que você costuma vestir (ex.: 48)' },
      { id: 'busto', tipo: 'numero', label: 'Busto (cm)', ficha: true },
      { id: 'cintura', tipo: 'numero', label: 'Cintura (cm)', ficha: true },
      { id: 'quadril', tipo: 'numero', label: 'Quadril (cm)', ficha: true },
      { id: 'altura', tipo: 'numero', label: 'Altura (cm)', ficha: true },
      { id: 'peso', tipo: 'numero', label: 'Peso (kg) — opcional', ficha: true },
      { id: 'ajuste_pronta', tipo: 'longo', label: 'Onde você costuma precisar ajustar a roupa pronta?' },
    ] },
  { id: 'rx_fotos', titulo: 'Suas fotos', intro: 'As fotos ajudam a leitura das proporções e das cores. Só a equipe vê, e elas não são usadas em nenhuma divulgação.',
    perguntas: [
      { id: 'foto_frente', tipo: 'anexo', label: 'Corpo inteiro, de frente, em pé, com roupa justa ou de academia, em luz natural.' },
      { id: 'foto_lado', tipo: 'anexo', label: 'Corpo inteiro, de lado.' },
      { id: 'foto_costas', tipo: 'anexo', label: 'Corpo inteiro, de costas.' },
      { id: 'foto_colorimetria', tipo: 'anexo', label: 'Rosto, de dia, sem maquiagem e sem filtro (para indicar suas cores).' },
    ] },
  { id: 'rx_cores', titulo: 'Cores e tecidos', intro: 'Para escolher o que valoriza você.',
    perguntas: [
      { id: 'colorimetria', tipo: 'escolha', label: 'Você já sabe a sua cartela de cores?', ficha: true, opcoes: [['primavera', 'Primavera'], ['verao', 'Verão'], ['outono', 'Outono'], ['inverno', 'Inverno'], ['', 'Ainda não sei']] },
      { id: 'tecidos_cores', tipo: 'longo', label: 'Quais cores e tecidos você ama usar?', ficha: true },
      { id: 'cores_evitar', tipo: 'texto', label: 'Alguma cor que você não usa ou não gosta?' },
      { id: 'sensibilidade', tipo: 'texto', label: 'Algum tecido que incomoda ou causa alergia?' },
    ] },
  { id: 'rx_ocasioes', titulo: 'Ocasiões e guarda-roupa', intro: 'Para o dossiê servir na sua vida real.',
    perguntas: [
      { id: 'onde_se_veste', tipo: 'longo', label: 'Onde você mais precisa se vestir bem? (trabalho, festas, casamentos, formaturas, igreja, viagens, dia a dia...)' },
      { id: 'evento_proximo', tipo: 'texto', label: 'Tem algum evento próximo? Qual e quando?' },
      { id: 'falta_guarda_roupa', tipo: 'longo', label: 'O que falta no seu guarda-roupa hoje?' },
    ] },
  { id: 'rx_final', titulo: 'Para fechar', intro: 'Últimas informações.',
    perguntas: [
      { id: 'investimento', tipo: 'escolha', label: 'Quanto você costuma investir em uma peça especial?', opcoes: [['ate_500', 'Até R$ 500'], ['500_1500', 'De R$ 500 a R$ 1.500'], ['1500_3000', 'De R$ 1.500 a R$ 3.000'], ['acima_3000', 'Acima de R$ 3.000'], ['', 'Prefiro conversar sobre isso']] },
      { id: 'observacoes', tipo: 'longo', label: 'Quer me contar mais alguma coisa?' },
      { id: 'consentimento_lgpd', tipo: 'escolha', label: 'Autorizo a DAS G a usar minhas respostas e fotos exclusivamente para produzir o meu dossiê, sem divulgação.', opcoes: [['sim', 'Sim, autorizo'], ['', 'Não autorizo']] },
    ] },
];
