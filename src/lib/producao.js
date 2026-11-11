import { supabase } from './supabaseClient.js';

// Etapas de produção de um ateliê de alta costura sob medida, na ordem do Fluxo de Atendimento.
// "fase" é o mesmo slug da etapa da OS; ao concluir todas as tarefas de uma fase, a OS avança.
export const FASES_OS = [
  ['cliente', 'Cliente cadastrada', ['Cadastrar a cliente e confirmar o telefone']],
  ['atendimento', 'Atendimento', ['Primeiro atendimento pelo WhatsApp', 'Identificar o serviço certo para a cliente']],
  ['agendamento', 'Agendamento', ['Agendar o atendimento ou a consultoria']],
  ['consultoria', 'Consultoria', ['Aplicar o questionário e realizar a consultoria', 'Registrar briefing, medidas e anotações']],
  ['criacao', 'Criação', ['Criar croqui, dossiê e ficha técnica', 'Aprovar o modelo com a cliente']],
  ['orcamento', 'Orçamento', ['Montar o orçamento', 'Enviar o orçamento à cliente']],
  ['aprovacao', 'Aprovação', ['Aprovação do orçamento pela cliente']],
  ['venda', 'Venda (entrada)', ['Receber a entrada e lançar no financeiro']],
  ['os', 'OS aberta', ['Abrir a OS e conferir os dados']],

  ['tecido', 'Tecido, medidas e molde', ['Conferir tecidos, forro e aviamentos recebidos', 'Ver tecidos e tirar medidas com a cliente', 'Traçar o molde base e modelar o vestido', 'Fazer toile / protótipo, se necessário', 'Aprovar o molde']],
  ['corte', 'Corte', ['Risco e encaixe no tecido', 'Cortar o tecido principal', 'Cortar forro, entretela e enchimentos', 'Identificar e separar as peças']],
  ['montagem', 'Montagem', ['Alinhavar e montar para a primeira prova', 'Costurar estruturas (corpete, bojo, barbatanas)', 'Aplicar fechos e zíperes']],
  ['prova1', '1ª prova', ['Agendar a 1ª prova com a cliente', 'Realizar a 1ª prova e anotar os ajustes', 'Fotografar / gravar a prova']],
  ['ajuste1', 'Ajuste da 1ª prova', ['Executar os ajustes anotados na 1ª prova', 'Registrar o que foi feito']],
  ['prova2', '2ª prova', ['Agendar a 2ª prova', 'Realizar a 2ª prova e anotar os ajustes']],
  ['ajuste2', 'Ajuste da 2ª prova', ['Executar os ajustes anotados na 2ª prova', 'Registrar o que foi feito', 'Bordados, pedrarias e aplicações, se houver']],
  ['prova_final', '3ª prova (final)', ['Realizar a 3ª prova', 'Aprovação da cliente']],
  ['prova4', '4ª prova (exceção)', ['Só se precisar: agendar e realizar a 4ª prova', 'Executar os últimos ajustes e registrar o que foi feito']],
  ['finalizacao', 'Finalização', ['Limpar fios e conferir costuras', 'Passadoria final', 'Etiqueta, cabide e embalagem']],
  ['entrega', 'Entrega', ['Conferir o saldo pago e anexar o comprovante', 'Entregar ou despachar para a cliente', 'Registrar a entrega (foto ou vídeo)']],
  ['pos_venda', 'Pós-venda', ['Pedir o feedback da cliente']],
  ['marketing', 'Marketing', ['Registrar fotos e vídeos para divulgação (com autorização)', 'Publicar ou agendar o conteúdo']],
];
export const FASES_ATELIE = FASES_OS;
// Grupos exibidos na OS (cada grupo reúne etapas do fluxo).
export const GRUPOS_OS = [
  ['Atendimento', ['cliente', 'atendimento', 'agendamento']],
  ['Consultoria e criação', ['consultoria', 'criacao']],
  ['Comercial (orçamento e venda)', ['orcamento', 'aprovacao', 'venda']],
  ['Ateliê (produção)', ['os', 'tecido', 'corte', 'montagem']],
  ['Provas e ajustes', ['prova1', 'ajuste1', 'prova2', 'ajuste2', 'prova_final', 'prova4']],
  ['Finalização e entrega', ['finalizacao', 'entrega']],
  ['Pós-venda e marketing', ['pos_venda', 'marketing']],
];
export const ROTULO_FASE = Object.fromEntries(FASES_OS.map(([s, l]) => [s, l]));

// Cria as tarefas padrão. Se a OS já tem tarefas, só completa as etapas que faltam.
export async function gerarEtapasAtelie(osId) {
  const { data: ex, error: e0 } = await supabase.from('os_producao').select('fase,ordem').eq('ordem_servico_id', osId);
  if (e0) return { error: e0 };
  const tem = new Set((ex || []).map(r => r.fase));
  const base = FASES_OS.length * 100;
  const linhas = [];
  FASES_OS.forEach(([fase, , tarefas], i) => { if (!tem.has(fase)) tarefas.forEach((titulo, j) => linhas.push({ ordem_servico_id: osId, fase, titulo, ordem: i * 100 + j })); });
  if (!linhas.length) return { error: null, jaExistia: true };
  const { error } = await supabase.from('os_producao').insert(linhas);
  return { error };
}
