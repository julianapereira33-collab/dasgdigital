// Operações de dados compartilhadas entre os módulos (Clientes, Central, Agenda, Consultoria).
// Todas retornam { data, error } — quem chama decide como mostrar o erro.
import { supabase } from './supabaseClient.js';
import { enviarWhatsApp } from './whatsapp.js';
import { gerarEtapasAtelie } from './producao.js';
import { linkDoQuiz } from '../modulos/quizConsultoria.js';
import { tipoDaOS } from '../modulos/tiposAtendimento.js';

// Etapas do fluxo: ver lib/etapas.js (fonte única)
import { SLUGS_ETAPA, ROTULO_ETAPA } from './etapas.js';
export { SLUGS_ETAPA, ROTULO_ETAPA };

// Atividade (tarefa) criada automaticamente quando a OS ENTRA na etapa
const ATIVIDADE_POR_ETAPA = {
  atendimento: 'Atender {c}: entender ocasião, prazo e definir o tipo de atendimento',
  agendamento: 'Confirmar o horário com {c} e enviar o link de pagamento',
  consultoria: 'Fazer a consultoria com {c}',
  criacao: 'Montar briefing, dossiê, croqui e ficha técnica de {c}',
  orcamento: 'Montar e enviar o orçamento para {c}',
  aprovacao: 'Acompanhar a aprovação do orçamento de {c}',
  venda: 'Cobrar e conferir a entrada de {c}',
  os: 'Abrir a OS e conferir o pedido de {c}',
  tecido: 'Ver tecidos e medidas com {c}',
  corte: 'Conferir tecidos e cortar a peça de {c}',
  montagem: 'Montar a peça de {c} para a 1ª prova',
  prova1: 'Agendar e fazer a 1ª prova de {c}',
  ajuste1: 'Fazer os ajustes da 1ª prova de {c}',
  prova2: 'Agendar e fazer a 2ª prova de {c}',
  ajuste2: 'Fazer os ajustes da 2ª prova de {c}',
  prova_final: 'Agendar e fazer a 3ª prova (final) de {c}',
  prova4: 'Fazer a 4ª prova (exceção) de {c}',
  finalizacao: 'Finalizar, passar e embalar a peça de {c}',
  entrega: 'Entregar a peça para {c} e conferir o saldo',
  pos_venda: 'Pedir feedback pós-evento para {c}',
  marketing: 'Registrar fotos e vídeos de {c} para divulgação (com autorização)',
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
  os: 'atelie', tecido: 'atelie', corte: 'atelie', montagem: 'atelie', prova1: 'clientes', ajuste1: 'atelie', prova2: 'clientes', ajuste2: 'atelie', prova_final: 'clientes', prova4: 'clientes', finalizacao: 'atelie',
  entrega: 'clientes', pos_venda: 'clientes', marketing: 'marketing',
};

// O fluxo NÃO gera mais tarefas: a Ju acompanha, aprova, edita e reagenda pelo Fluxo de Atendimento.
export async function criarAtividadeDaEtapa() { return { data: null, error: null }; }

export async function criarOS({ cliente, listaOS, descricao, data_evento, servico, canal, etapaInicial = 'atendimento', ocasiao, data_entrega_prevista, data_tecidos_medidas, valor_total, tipo_atendimento }) {
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
  const tipoQuiz = tipoDaOS(os).tipoQuiz || 'completo';
  // reaproveita um quiz ainda não respondido da mesma OS (e do mesmo tipo) em vez de gerar vários links
  if (os?.id) {
    const { data: existente } = await supabase.from('consultoria_quiz_envios').select('*').eq('ordem_servico_id', os.id).neq('status', 'respondido').order('criado_em', { ascending: false }).limit(1);
    if (existente && existente.length && (existente[0].tipo_quiz || 'completo') === tipoQuiz) return { data: existente[0], error: null };
  }
  return supabase.from('consultoria_quiz_envios').insert({
    cliente_id: cliente?.id || null, ordem_servico_id: os?.id || null, tipo_quiz: tipoQuiz,
    nome_cliente: cliente?.nome || null, telefone: cliente?.telefone || null,
  }).select().single();
}

export function msgQuiz(nome, token) {
  const primeiro = (nome || '').split(' ')[0] || 'tudo bem';
  return `Olá, ${primeiro}! Aqui é da DAS G. Para a nossa consultoria ser bem aproveitada, preparei um questionário rápido (uns 5 minutos) sobre o seu estilo, a ocasião e suas medidas:\n\n${linkDoQuiz(token)}\n\nPode responder pelo celular mesmo. Obrigada!`;
}

export async function enviarQuizPorWhatsApp({ cliente, os }) {
  const { data: envio, error } = await criarQuizEnvio({ cliente, os });
  if (error) return { error: error.message };
  const r = await enviarWhatsApp({ telefone: cliente?.telefone, nome: cliente?.nome, mensagem: msgQuiz(cliente?.nome, envio.token) });
  if (!r.ok) return { error: r.erro, envio };
  await supabase.from('consultoria_quiz_envios').update({ status: 'enviado', enviado_em: new Date().toISOString() }).eq('id', envio.id);
  return { envio, error: null };
}
