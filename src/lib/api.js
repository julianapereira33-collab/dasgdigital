// Operações de dados compartilhadas entre os módulos (Clientes, Central, Agenda, Consultoria).
// Todas retornam { data, error } — quem chama decide como mostrar o erro.
import { supabase } from './supabaseClient.js';
import { enviarWhatsApp } from './whatsapp.js';
import { gerarEtapasAtelie } from './producao.js';
import { linkDoQuiz } from '../modulos/quizConsultoria.js';

// mesma ordem de STATUS_OS / check constraint de ordens_servico.status
export const SLUGS_ETAPA = [
  'lead', 'qualificacao', 'agendado', 'consultoria', 'orcamento_enviado', 'aprovado',
  'entrada', 'os_aberta', 'briefing', 'dossie', 'criacao', 'modelagem', 'corte', 'costura',
  'acabamento', 'prova1', 'ajustes1', 'prova2', 'prova_final', 'finalizacao', 'pgto_final',
  'entrega', 'feedback',
];
export const ROTULO_ETAPA = {
  lead: 'Lead', qualificacao: 'Qualificação', agendado: 'Agendado', consultoria: 'Consultoria realizada',
  orcamento_enviado: 'Orçamento enviado', aprovado: 'Aprovado', entrada: 'Entrada recebida', os_aberta: 'OS aberta',
  briefing: 'Briefing', dossie: 'Dossiê', criacao: 'Criação', modelagem: 'Modelagem', corte: 'Corte', costura: 'Costura',
  acabamento: 'Acabamento', prova1: 'Prova 1', ajustes1: 'Ajustes 1', prova2: 'Prova 2', prova_final: 'Prova final',
  finalizacao: 'Finalização', pgto_final: 'Pgto final', entrega: 'Entrega', feedback: 'Feedback pós-evento',
};

// Atividade (tarefa) criada automaticamente quando a OS ENTRA na etapa
const ATIVIDADE_POR_ETAPA = {
  qualificacao: 'Qualificar {c}: entender ocasião, prazo e orçamento',
  agendado: 'Confirmar o horário da consultoria com {c}',
  consultoria: 'Montar e enviar o orçamento para {c}',
  orcamento_enviado: 'Acompanhar a resposta do orçamento de {c}',
  aprovado: 'Combinar e cobrar a entrada de {c}',
  entrada: 'Conferir o recebimento da entrada de {c}',
  os_aberta: 'Preencher o briefing de {c}',
  briefing: 'Gerar o dossiê de {c}',
  dossie: 'Apresentar e aprovar o dossiê com {c}',
  criacao: 'Criar croqui e ficha técnica de {c}',
  modelagem: 'Fazer a modelagem da peça de {c}',
  corte: 'Conferir tecidos e cortar a peça de {c}',
  costura: 'Costurar a peça de {c}',
  acabamento: 'Acabamento da peça de {c}',
  prova1: 'Agendar e fazer a Prova 1 de {c}',
  ajustes1: 'Fazer os ajustes da Prova 1 de {c}',
  prova2: 'Agendar e fazer a Prova 2 de {c}',
  prova_final: 'Agendar e fazer a Prova final de {c}',
  finalizacao: 'Finalizar e passar a peça de {c}',
  pgto_final: 'Cobrar o pagamento final de {c}',
  entrega: 'Entregar a peça para {c}',
  feedback: 'Pedir feedback pós-evento para {c}',
};

const limpar = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null));
const emDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export function proximoNumeroOS(listaOS) {
  const ano = new Date().getFullYear();
  const nums = (listaOS || []).map(o => String(o.numero || '')).filter(n => n.startsWith(`OS-${ano}-`)).map(n => parseInt(n.split('-')[2], 10)).filter(n => !isNaN(n));
  return `OS-${ano}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

export async function criarCliente(campos) {
  return supabase.from('clientes').insert(limpar(campos)).select().single();
}

// Departamento (agenda) responsável por cada etapa do fluxo
const DEP_POR_ETAPA = {
  modelagem: 'atelie', corte: 'atelie', costura: 'atelie', acabamento: 'atelie', prova1: 'atelie', ajustes1: 'atelie', prova2: 'atelie', prova_final: 'atelie',
  finalizacao: 'recepcao', pgto_final: 'recepcao', entrega: 'recepcao', feedback: 'recepcao',
};

export async function criarAtividadeDaEtapa({ os, cliente, slug }) {
  const modelo = ATIVIDADE_POR_ETAPA[slug];
  if (!modelo || !os?.id) return { data: null, error: null };
  const titulo = modelo.replace('{c}', cliente?.nome || 'cliente');
  const { data: jaTem } = await supabase.from('tarefas').select('id').eq('ordem_servico_id', os.id).eq('titulo', titulo).limit(1);
  if (jaTem && jaTem.length) return { data: null, error: null };
  return supabase.from('tarefas').insert({
    titulo, status: 'pendente', prazo: emDias(2), prioridade: 'normal',
    cliente_id: cliente?.id || null, ordem_servico_id: os.id, origem: 'fluxo', departamento: DEP_POR_ETAPA[slug] || 'atendimento',
  }).select().single();
}

export async function criarOS({ cliente, listaOS, descricao, data_evento, servico, canal, etapaInicial = 'qualificacao', ocasiao, data_entrega_prevista, data_tecidos_medidas, valor_total, tipo_atendimento }) {
  const { data, error } = await supabase.from('ordens_servico').insert(limpar({
    cliente_id: cliente.id, numero: proximoNumeroOS(listaOS), descricao, data_evento, servico, tipo: 'encomenda', tipo_atendimento, ocasiao,
    data_entrega_prevista, data_tecidos_medidas, valor_total: valor_total ? Number(valor_total) : undefined,
    canal: canal || 'crm', status: etapaInicial,
  })).select().single();
  if (error) return { data: null, error };
  await gerarEtapasAtelie(data.id); // melhor esforço: não bloqueia se a tabela ainda não existir
  await criarAtividadeDaEtapa({ os: data, cliente, slug: etapaInicial });
  return { data, error: null };
}

// Lead -> cliente (+ OS). Marca o lead como convertido.
export async function converterLead({ lead, listaOS, abrirOS = true }) {
  const { data: cliente, error } = await criarCliente({
    lead_id: lead.id, nome: lead.nome || 'Sem nome', telefone: lead.telefone, email: lead.email,
    instagram: lead.instagram, origem: lead.origem,
  });
  if (error) return { error };
  await supabase.from('leads').update({ status: 'convertido', cliente_id: cliente.id }).eq('id', lead.id);
  let os = null;
  if (abrirOS) {
    const r = await criarOS({ cliente, listaOS, descricao: lead.procura || lead.servico_interesse, data_evento: lead.data_evento, servico: lead.servico_interesse, canal: lead.origem });
    if (r.error) return { cliente, error: r.error };
    os = r.data;
  }
  return { cliente, os, error: null };
}

export async function criarQuizEnvio({ cliente, os }) {
  // reaproveita um quiz ainda não respondido da mesma OS em vez de gerar vários links
  if (os?.id) {
    const { data: existente } = await supabase.from('consultoria_quiz_envios').select('*').eq('ordem_servico_id', os.id).neq('status', 'respondido').order('criado_em', { ascending: false }).limit(1);
    if (existente && existente.length) return { data: existente[0], error: null };
  }
  return supabase.from('consultoria_quiz_envios').insert({
    cliente_id: cliente?.id || null, ordem_servico_id: os?.id || null,
    nome_cliente: cliente?.nome || null, telefone: cliente?.telefone || null,
  }).select().single();
}

export function msgQuiz(nome, token) {
  const primeiro = (nome || '').split(' ')[0] || 'tudo bem';
  return `Olá, ${primeiro}! Aqui é do ateliê Das G. Para a nossa consultoria ser bem aproveitada, preparei um questionário rápido (uns 5 minutos) sobre o seu estilo, a ocasião e suas medidas:\n\n${linkDoQuiz(token)}\n\nPode responder pelo celular mesmo. Obrigada!`;
}

export async function enviarQuizPorWhatsApp({ cliente, os }) {
  const { data: envio, error } = await criarQuizEnvio({ cliente, os });
  if (error) return { error: error.message };
  const r = await enviarWhatsApp({ telefone: cliente?.telefone, nome: cliente?.nome, mensagem: msgQuiz(cliente?.nome, envio.token) });
  if (!r.ok) return { error: r.erro, envio };
  await supabase.from('consultoria_quiz_envios').update({ status: 'enviado', enviado_em: new Date().toISOString() }).eq('id', envio.id);
  return { envio, error: null };
}
