import { supabase } from './supabaseClient.js';

// Etapas de produção de um ateliê de alta costura sob medida, na ordem do Fluxo de Atendimento.
// "fase" é o mesmo slug da etapa da OS; ao concluir todas as tarefas de uma fase, a OS avança.
export const FASES_ATELIE = [
  ['tecido', 'Tecido, medidas e molde', ['Conferir tecidos, forro e aviamentos recebidos', 'Ver tecidos e tirar medidas com a cliente', 'Traçar o molde base e modelar o vestido', 'Fazer toile / protótipo, se necessário', 'Aprovar o molde']],
  ['corte', 'Corte', ['Risco e encaixe no tecido', 'Cortar o tecido principal', 'Cortar forro, entretela e enchimentos', 'Identificar e separar as peças']],
  ['montagem', 'Montagem', ['Alinhavar e montar para a primeira prova', 'Costurar estruturas (corpete, bojo, barbatanas)', 'Aplicar fechos e zíperes']],
  ['prova1', '1ª prova', ['Agendar a 1ª prova com a cliente', 'Realizar a 1ª prova e anotar os ajustes', 'Fotografar / gravar a prova']],
  ['ajuste1', 'Ajuste da 1ª prova', ['Executar os ajustes anotados na 1ª prova']],
  ['prova2', '2ª prova', ['Agendar a 2ª prova', 'Realizar a 2ª prova e anotar os ajustes']],
  ['ajuste2', 'Ajuste da 2ª prova', ['Executar os ajustes anotados na 2ª prova', 'Bordados, pedrarias e aplicações, se houver']],
  ['prova_final', '3ª prova (final)', ['Realizar a 3ª prova', 'Aprovação da cliente']],
  ['prova4', '4ª prova (exceção)', ['Só se precisar: agendar e realizar a 4ª prova', 'Executar os últimos ajustes']],
  ['finalizacao', 'Finalização', ['Limpar fios e conferir costuras', 'Passadoria final', 'Etiqueta, cabide e embalagem']],
  ['entrega', 'Entrega', ['Conferir o saldo pago e anexar o comprovante', 'Entregar ou despachar para a cliente', 'Registrar a entrega (foto ou vídeo)']],
  ['pos_venda', 'Pós-venda', ['Pedir o feedback da cliente']],
  ['marketing', 'Marketing', ['Registrar fotos e vídeos para divulgação (com autorização)', 'Publicar ou agendar o conteúdo']],
];
export const ROTULO_FASE = Object.fromEntries(FASES_ATELIE.map(([s, l]) => [s, l]));

export async function gerarEtapasAtelie(osId) {
  const { count, error: e0 } = await supabase.from('os_producao').select('id', { count: 'exact', head: true }).eq('ordem_servico_id', osId);
  if (e0) return { error: e0 };
  if (count > 0) return { error: null, jaExistia: true };
  let ordem = 0;
  const linhas = FASES_ATELIE.flatMap(([fase, , tarefas]) => tarefas.map(titulo => ({ ordem_servico_id: osId, fase, titulo, ordem: ordem++, responsavel: 'Ateliê' })));
  const { error } = await supabase.from('os_producao').insert(linhas);
  return { error };
}
