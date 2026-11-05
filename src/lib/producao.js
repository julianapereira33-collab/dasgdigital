import { supabase } from './supabaseClient.js';

// Etapas de produção de um ateliê de alta costura sob medida, na ordem do Fluxo de Atendimento.
// "fase" é o mesmo slug da etapa da OS; ao concluir todas as tarefas de uma fase, a OS avança.
export const FASES_ATELIE = [
  ['modelagem', 'Modelagem', ['Conferir medidas da cliente e do modelo aprovado', 'Traçar o molde base', 'Modelar o vestido (molde do modelo)', 'Fazer toile / protótipo, se necessário', 'Aprovar o molde']],
  ['corte', 'Corte', ['Conferir tecidos, forro e aviamentos recebidos', 'Risco e encaixe no tecido', 'Cortar o tecido principal', 'Cortar forro, entretela e enchimentos', 'Identificar e separar as peças']],
  ['costura', 'Costura e montagem', ['Alinhavar e montar para a primeira prova', 'Costurar estruturas (corpete, bojo, barbatanas)', 'Aplicar fechos e zíperes']],
  ['acabamento', 'Acabamento', ['Fazer barras e arremates', 'Bordados, pedrarias e aplicações', 'Passar a peça']],
  ['prova1', '1ª prova', ['Agendar a 1ª prova com a cliente', 'Realizar a 1ª prova e anotar os ajustes', 'Fotografar / gravar a prova']],
  ['ajustes1', 'Ajustes da 1ª prova', ['Executar os ajustes anotados na 1ª prova']],
  ['prova2', '2ª prova', ['Agendar a 2ª prova', 'Realizar a 2ª prova e anotar os ajustes', 'Executar os ajustes da 2ª prova']],
  ['prova_final', '3ª prova (final)', ['Realizar a prova final', 'Aprovação final da cliente']],
  ['finalizacao', 'Finalização', ['Limpar fios e conferir costuras', 'Passadoria final', 'Etiqueta, cabide e embalagem']],
  ['pgto_final', 'Pagamento final', ['Conferir o saldo pago e anexar o comprovante']],
  ['entrega', 'Entrega', ['Entregar ou despachar para a cliente', 'Registrar a entrega (foto ou vídeo)']],
  ['feedback', 'Pós-venda e marketing', ['Pedir o feedback da cliente', 'Registrar fotos e vídeos para divulgação (com autorização)']],
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
