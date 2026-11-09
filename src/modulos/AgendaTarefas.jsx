import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { enviarWhatsApp, msgConfirmacaoEvento, msgAvisoTarefa, whatsappConfigurado } from '../lib/whatsapp.js';
import { criarAtividadeDaEtapa, criarCliente } from '../lib/api.js';
import { gerarMeet, meetConfigurado, alertarJuliana, alertaConfigurado } from '../lib/meet.js';
import PortaoFinanceira, { finLiberada, travarFinanceira } from './PortaoFinanceira.jsx';
import { Badge, Card, BtnPrimary, BtnSecondary, BtnDanger, TabBar, Drawer, Campo, Aviso, SeletorCliente, fmtDate, erroDeSchema } from './ui.jsx';

// dep = departamento padrão do tipo (a Juliana pode trocar ao criar o evento)
const TIPOS = {
  consultoria_express: { label: 'Atendimento (consultoria)', cor: '#c4a45a', dep: 'clientes', meet: true },
  personal_stylist: { label: 'Personal Stylist', cor: '#8b5cf6', dep: 'clientes', meet: true },
  teste_colorimetria: { label: 'Teste de colorimetria', cor: '#a855f7', dep: 'clientes', meet: true },
  orcamento: { label: 'Atendimento de orçamento', cor: '#f97316', dep: 'clientes' },
  entrega: { label: 'Entrega', cor: '#16a34a', dep: 'clientes' },
  retirada_locacao: { label: 'Retirada de locação', cor: '#15803d', dep: 'clientes' },
  devolucao_locacao: { label: 'Devolução de locação', cor: '#65a30d', dep: 'clientes' },
  venda_loja: { label: 'Venda / atendimento na loja', cor: '#d97706', dep: 'clientes' },
  reuniao: { label: 'Reunião interna', cor: '#6b7280', dep: 'adm', meet: true },
  troca_vitrine: { label: 'Trocar vitrine', cor: '#a16207', dep: 'adm' },
  postagem: { label: 'Postagem', cor: '#f43f5e', dep: 'adm' },
  checar_marketplace: { label: 'Checar vendas do marketplace', cor: '#2563eb', dep: 'adm' },
  tarefa_adm: { label: 'Outras tarefas de ADM', cor: '#78716c', dep: 'adm' },
  outro: { label: 'Outro', cor: '#0ea5e9', dep: 'adm' },
  tirar_medidas: { label: 'Tirar medidas', cor: '#0284c7', dep: 'clientes' },
  tecidos_medidas: { label: 'Ver tecidos e medidas', cor: '#0ea5e9', dep: 'clientes' },
  prova1: { label: '1ª prova', cor: '#ec4899', dep: 'clientes' },
  prova2: { label: '2ª prova', cor: '#db2777', dep: 'clientes' },
  prova_final: { label: '3ª prova (final)', cor: '#be185d', dep: 'clientes' },
  modelagem_corte: { label: 'Modelagem / corte', cor: '#0369a1', dep: 'atelie' },
  costura: { label: 'Montagem / costura', cor: '#075985', dep: 'atelie' },
  gravacao_conteudo: { label: 'Gravação de conteúdo', cor: '#e11d48', dep: 'marketing' },
  post_programado: { label: 'Postagem programada', cor: '#f43f5e', dep: 'marketing' },
  reuniao_marketing: { label: 'Reunião de marketing', cor: '#be123c', dep: 'marketing', meet: true },
  pagamento: { label: 'Pagamento / vencimento', cor: '#dc2626', dep: 'financeira' },
  recebimento: { label: 'Recebimento', cor: '#059669', dep: 'financeira' },
  reuniao_contador: { label: 'Reunião com contador', cor: '#0f766e', dep: 'financeira', meet: true },
  compra_tecido: { label: 'Compra de tecido', cor: '#7c3aed', dep: 'tissu' },
  entrega_tecido: { label: 'Entrega de tecido', cor: '#6d28d9', dep: 'tissu' },
  reuniao_fornecedor: { label: 'Reunião com fornecedor', cor: '#5b21b6', dep: 'tissu', meet: true },
};
const DEPARTAMENTOS = {
  adm: { label: 'ADM', curto: 'ADM', cor: '#c4a45a' },
  clientes: { label: 'Clientes', curto: 'Clientes', cor: '#d97706' },
  atelie: { label: 'Ateliê', curto: 'Ateliê', cor: '#0ea5e9' },
  marketing: { label: 'Marketing', curto: 'Marketing', cor: '#e11d48' },
  financeira: { label: 'Financeira 🔒', curto: 'Financeira', cor: '#0f766e' },
  tissu: { label: 'Das G Tissu (tecidos)', curto: 'Das G Tissu', cor: '#7c3aed' },
};
const depDe = (x) => DEPARTAMENTOS[x?.departamento] ? x.departamento : (TIPOS[x?.tipo]?.dep || 'adm');
const primeiroTipoDe = (d) => ({ atelie: 'modelagem_corte' })[d] || Object.keys(TIPOS).find(k => TIPOS[k].dep === d) || 'outro';
// Texto pronto por tipo (padrão do banco: agenda_modelos_msg). {nome} {tipo} {quando} {local} {meet}
function aplicarModelo(texto, { nome, tipoLabel, data, local, meet }) {
  const primeiro = (nome || '').split(' ')[0] || 'tudo bem';
  const quando = new Date(data).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return String(texto)
    .replaceAll('{nome}', primeiro).replaceAll('{tipo}', tipoLabel).replaceAll('{quando}', quando)
    .replaceAll('{local}', local ? `\nLocal: ${local}.` : '').replaceAll('{meet}', meet ? `\nLink da videochamada: ${meet}` : '');
}
const STATUS_EVENTO = {
  agendado: { label: 'Agendado', cor: '#f59e0b' },
  aguardando_confirmacao: { label: 'Aguardando confirmação', cor: '#3b82f6' },
  confirmado: { label: 'Confirmado', cor: '#22c55e' },
  realizado: { label: 'Realizado', cor: '#6b7280' },
  cancelado: { label: 'Cancelado', cor: '#ef4444' },
};
const PRIORIDADE_COR = { alta: '#ef4444', normal: '#f59e0b', baixa: '#6b7280' };
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const inicioDia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const mesmoDia = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const isoData = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const msgErro = (e) => erroDeSchema(e) ? 'O banco ainda não tem as colunas novas. Aplique a migração 20261102000000 no Supabase. (' + e.message + ')' : (e.message || String(e));

const EVENTO_VAZIO = (dataBase, dep) => ({ id: null, departamento: dep || 'adm', tipo: primeiroTipoDe(dep || 'adm'), gerarMeet: !!TIPOS[primeiroTipoDe(dep || 'adm')]?.meet, cliente_id: '', ordem_servico_id: '', data: isoData(dataBase || new Date()), hora: '10:00', duracao_min: 60, local: '', link_meet: '', observacoes: '', status: 'agendado', enviarConfirmacao: true, mensagem: '', msgEditada: false });
const TAREFA_VAZIA = { id: null, departamento: 'adm', titulo: '', descricao: '', prioridade: 'normal', prazo: '', cliente_id: '', ordem_servico_id: '', responsavel: '', avisarCliente: false, mensagem: '', msgEditada: false };

// Escolher cliente (com busca) e, pelo ícone ＋, cadastrar uma nova sem sair do compromisso.
function ClienteRapido({ clientes, value, onChange, onRecarregar, label = 'Cliente' }) {
  const [novo, setNovo] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function salvar() {
    if (!novo.nome.trim()) { setErro('Informe o nome.'); return; }
    setOcupado(true); setErro('');
    const { data, error } = await criarCliente({ nome: novo.nome.trim(), telefone: novo.telefone, email: novo.email, origem: 'agenda' });
    if (error) { setErro(error.message); setOcupado(false); return; }
    await onRecarregar?.();
    onChange(data.id); setNovo(null); setOcupado(false);
  }
  const inp = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' };
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" title="Cadastrar nova cliente" aria-label="Cadastrar nova cliente" onClick={() => setNovo(novo ? null : { nome: '', telefone: '', email: '' })}
        style={{ position: 'absolute', right: 0, top: -4, width: 28, height: 28, borderRadius: '50%', border: '1px solid #c4a45a', background: novo ? '#c4a45a' : '#fff', color: novo ? '#fff' : '#c4a45a', fontSize: 18, lineHeight: '24px', cursor: 'pointer', padding: 0, zIndex: 1 }}>＋</button>
      <SeletorCliente clientes={clientes} value={value} onChange={onChange} label={label} onCadastrar={() => setNovo({ nome: '', telefone: '', email: '' })} />
      {novo && (
        <div style={{ border: '1px solid #c4a45a', borderRadius: 8, padding: 12, marginBottom: 14, background: '#fffdf7' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Nova cliente</div>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <div style={{ display: 'grid', gap: 8 }}>
            <input autoFocus placeholder="Nome completo *" value={novo.nome} onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))} style={inp} />
            <input placeholder="WhatsApp (DDD + número)" value={novo.telefone} onChange={e => setNovo(n => ({ ...n, telefone: e.target.value }))} style={inp} />
            <input placeholder="E-mail (opcional)" value={novo.email} onChange={e => setNovo(n => ({ ...n, email: e.target.value }))} style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <BtnPrimary small onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando...' : 'Cadastrar e selecionar'}</BtnPrimary>
            <BtnSecondary small onClick={() => setNovo(null)}>Cancelar</BtnSecondary>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgendaTarefas({ agenda, tarefas, clientes, os, onRecarregar }) {
  const [aba, setAba] = useState('agenda');
  const [view, setView] = useState('semana');
  const [cursor, setCursor] = useState(inicioDia(new Date()));
  const [evento, setEvento] = useState(null);
  const [tarefa, setTarefa] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [filtroTarefa, setFiltroTarefa] = useState('pendentes');
  const [dep, setDep] = useState('todos'); // 'todos' | adm | atelie | marketing | financeira | tissu
  const [liberada, setLiberada] = useState(finLiberada());
  const [modelos, setModelos] = useState({});
  const [modelosEdit, setModelosEdit] = useState({});
  const [enviandoId, setEnviandoId] = useState(null);
  const [contas, setContas] = useState([]);
  useEffect(() => {
    supabase.from('agenda_modelos_msg').select('*').then(({ data }) => { const m = {}; (data || []).forEach(x => { m[x.tipo] = x; }); setModelos(m); });
  }, []);
  useEffect(() => {
    if (!liberada) { setContas([]); return; }
    supabase.from('financeiro_pagar').select('*').eq('status', 'pendente').then(({ data }) => setContas(data || []));
  }, [liberada]);
  const bloqueado = (d) => d === 'financeira' && !liberada;

  const cli = (id) => clientes.find(c => c.id === id);
  const contasComoEventos = useMemo(() => contas.filter(c => c.data_vencimento).map(c => ({ id: 'cp-' + c.id, tipo: 'pagamento', departamento: 'financeira', data_hora: c.data_vencimento + 'T09:00:00', status: 'agendado', titulo: `${c.descricao || 'Conta'} · R$ ${Number(c.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, conta: true })), [contas]);
  const eventos = useMemo(() => [...agenda, ...contasComoEventos].map(a => ({ ...a, dt: a.data_hora, dep: depDe(a) })).filter(a => a.dt && !bloqueado(a.dep) && (dep === 'todos' || a.dep === dep)).sort((x, y) => new Date(x.dt) - new Date(y.dt)), [agenda, contasComoEventos, dep, liberada]); // eslint-disable-line react-hooks/exhaustive-deps
  const contaDep = (d) => bloqueado(d) ? 0 : agenda.filter(a => a.data_hora && depDe(a) === d && a.status !== 'cancelado' && new Date(a.data_hora) >= inicioDia(new Date())).length;
  const doDia = (d) => eventos.filter(e => mesmoDia(e.dt, d));

  const semana = Array.from({ length: 7 }, (_, i) => { const d = new Date(cursor); d.setDate(d.getDate() - d.getDay() + i); return d; });
  const mesInicio = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gradeMes = Array.from({ length: 42 }, (_, i) => { const d = new Date(mesInicio); d.setDate(1 - mesInicio.getDay() + i); return d; });

  function mover(delta) {
    const d = new Date(cursor);
    if (view === 'dia') d.setDate(d.getDate() + delta);
    else if (view === 'semana') d.setDate(d.getDate() + 7 * delta);
    else d.setMonth(d.getMonth() + delta);
    setCursor(d);
  }
  const titulo = view === 'mes' ? cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : view === 'semana' ? `${semana[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${semana[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  // ───── Evento ─────
  function montarMensagem(e) {
    const c = cli(e.cliente_id);
    const tipoLabel = (TIPOS[e.tipo]?.label || 'atendimento').toLowerCase();
    const data = new Date(`${e.data}T${e.hora}`);
    const modelo = modelos[e.tipo];
    if (modelo && modelo.ativo !== false) return aplicarModelo(modelo.texto, { nome: c?.nome, tipoLabel, data, local: e.local, meet: e.link_meet });
    return msgConfirmacaoEvento({ nomeCliente: c?.nome, tipoLabel, data, local: e.local, linkMeet: e.link_meet });
  }
  function editarEvento(patch) {
    setEvento(prev => {
      const novo = { ...prev, ...patch };
      if (patch.tipo && TIPOS[patch.tipo]) { novo.departamento = TIPOS[patch.tipo].dep; if (!prev.id) novo.gerarMeet = !!TIPOS[patch.tipo].meet; }
      if (patch.departamento && TIPOS[novo.tipo]?.dep !== patch.departamento) { novo.tipo = primeiroTipoDe(patch.departamento); if (!prev.id) novo.gerarMeet = !!TIPOS[novo.tipo]?.meet; }
      if (!novo.msgEditada) novo.mensagem = montarMensagem(novo);
      return novo;
    });
  }
  function novoEvento(dataBase) { setErro(''); setAviso(''); const e = EVENTO_VAZIO(dataBase, dep === 'todos' || bloqueado(dep) ? null : dep); e.mensagem = montarMensagem(e); setEvento(e); }
  function abrirEvento(a) {
    setErro(''); setAviso('');
    const d = new Date(a.dt);
    setEvento({ id: a.id, gerarMeet: false, departamento: depDe(a), tipo: a.tipo || 'outro', cliente_id: a.cliente_id || '', ordem_servico_id: a.ordem_servico_id || '', data: isoData(d), hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, duracao_min: a.duracao_min || 60, local: a.local || '', link_meet: a.link_meet || '', observacoes: a.observacoes || '', status: a.status || 'agendado', enviarConfirmacao: false, mensagem: a.confirmacao_mensagem || '', msgEditada: !!a.confirmacao_mensagem, confirmacao_enviada_em: a.confirmacao_enviada_em });
  }

  // Com cliente: manda para ela. Sem cliente (agenda interna): manda para o seu WhatsApp. O ícone fica verde quando enviado.
  async function enviarConfirmacao(ev, eventoId) {
    const c = cli(ev.cliente_id);
    const r = c ? await enviarWhatsApp({ telefone: c.telefone, nome: c.nome, mensagem: ev.mensagem }) : await alertarJuliana(ev.mensagem);
    if (r.ok) {
      await supabase.from('agenda').update({ confirmacao_enviada_em: new Date().toISOString(), confirmacao_mensagem: ev.mensagem, ...(c ? { status: 'aguardando_confirmacao' } : {}) }).eq('id', eventoId);
    }
    return r;
  }
  async function enviarRapido(a) {
    if (a.conta) return;
    const d = new Date(a.dt);
    const form = { tipo: a.tipo, cliente_id: a.cliente_id || '', data: isoData(d), hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, local: a.local || '', link_meet: a.link_meet || '' };
    const mensagem = a.confirmacao_mensagem || montarMensagem(form);
    setEnviandoId(a.id); setErro(''); setAviso('');
    const r = await enviarConfirmacao({ ...form, mensagem }, a.id);
    setEnviandoId(null);
    if (!r.ok) { setErro('Não enviei: ' + r.erro); return; }
    await onRecarregar();
    setAviso(a.cliente_id ? 'Mensagem enviada para a cliente pelo WhatsApp.' : 'Lembrete enviado para o seu WhatsApp.');
  }
  async function enviarMeetAgora() {
    const c = cli(evento.cliente_id);
    if (!c) { setErro('Escolha a cliente para enviar o link.'); return; }
    if (!evento.link_meet) { setErro('Gere ou cole o link do Meet primeiro.'); return; }
    setSalvando(true); setErro(''); setAviso('');
    const primeiro = (c.nome || '').split(' ')[0];
    const r = await enviarWhatsApp({ telefone: c.telefone, nome: c.nome, mensagem: `Olá, ${primeiro}! Aqui está o link da nossa videochamada: ${evento.link_meet}` });
    if (r.ok && evento.id) await supabase.from('agenda').update({ meet_enviado_em: new Date().toISOString() }).eq('id', evento.id);
    setSalvando(false);
    if (!r.ok) { setErro(r.erro); return; }
    await onRecarregar(); setEvento(p => ({ ...p, meet_enviado_em: new Date().toISOString() })); setAviso('Link do Meet enviado para a cliente.');
  }
  async function gerarLinkMeet() {
    if (!evento.data || !evento.hora) { setErro('Informe data e hora antes de gerar o link.'); return; }
    setSalvando(true); setErro('');
    const r = await gerarMeet({ titulo: `${TIPOS[evento.tipo]?.label || 'Atendimento'}${cli(evento.cliente_id) ? ' · ' + cli(evento.cliente_id).nome : ''}`, inicio: new Date(`${evento.data}T${evento.hora}`), duracao_min: evento.duracao_min });
    setSalvando(false);
    if (!r.ok) { setErro(r.erro); return; }
    editarEvento({ link_meet: r.link }); setAviso('Link do Meet gerado. Salve o evento para guardá-lo.');
  }

  async function salvarEvento() {
    if (!evento.data || !evento.hora) { setErro('Informe data e hora.'); return; }
    setSalvando(true); setErro(''); setAviso('');
    const dataHora = new Date(`${evento.data}T${evento.hora}`).toISOString();
    const linha = {
      tipo: evento.tipo, departamento: evento.departamento || 'adm', titulo: TIPOS[evento.tipo]?.label || evento.tipo, cliente_id: evento.cliente_id || null,
      ordem_servico_id: evento.ordem_servico_id || null, data_hora: dataHora, duracao_min: Number(evento.duracao_min) || 60,
      local: evento.local || null, link_meet: evento.link_meet || null, observacoes: evento.observacoes || null, status: evento.status || 'agendado',
    };
    let avisoMeet = '';
    if (!evento.id && evento.gerarMeet && meetConfigurado() && !linha.link_meet && TIPOS[evento.tipo]?.meet) {
      const g = await gerarMeet({ titulo: `${TIPOS[evento.tipo].label}${cli(evento.cliente_id) ? ' · ' + cli(evento.cliente_id).nome : ''}`, inicio: dataHora, duracao_min: linha.duracao_min });
      if (g.ok) { linha.link_meet = g.link; evento.link_meet = g.link; if (!evento.msgEditada) evento.mensagem = montarMensagem({ ...evento, link_meet: g.link }); } else avisoMeet = ' (não consegui gerar o Meet: ' + g.erro + ')';
    }
    let id = evento.id; let error;
    if (id) ({ error } = await supabase.from('agenda').update(linha).eq('id', id));
    else { const r = await supabase.from('agenda').insert(linha).select().single(); error = r.error; id = r.data?.id; }
    if (error) { setSalvando(false); setErro(msgErro(error)); return; }

    // agendou uma consultoria? a OS vai para "Agendado" (se ainda estiver antes) e ganha a atividade da etapa
    if (!evento.id && evento.ordem_servico_id && ['consultoria_express', 'personal_stylist'].includes(evento.tipo)) {
      const o = os.find(x => x.id === evento.ordem_servico_id);
      if (o && o.status_idx < 3) {
        await supabase.from('ordens_servico').update({ status: 'agendamento' }).eq('id', o.id);
        await criarAtividadeDaEtapa({ os: o, cliente: cli(o.cliente_id), slug: 'agendamento' });
      }
    }

    let msgFinal = 'Evento salvo.' + avisoMeet;
    if (!evento.id && alertaConfigurado()) {
      const quando = new Date(dataHora).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      alertarJuliana(`📅 *Novo compromisso* (${DEPARTAMENTOS[linha.departamento]?.curto || ''})\n${linha.titulo}${cli(evento.cliente_id) ? ' · ' + cli(evento.cliente_id).nome : ''}\n${quando}${linha.local ? '\n' + linha.local : ''}${linha.link_meet ? '\nMeet: ' + linha.link_meet : ''}`);
    }
    if (evento.enviarConfirmacao && evento.cliente_id) {
      // com cliente: a confirmação sai sozinha às 8h do dia do evento (n8n varre a cada 10 min a partir das 8h)
      const { error: ep } = await supabase.from('agenda').update({ confirmacao_mensagem: evento.mensagem, confirmacao_pendente: true }).eq('id', id);
      if (ep) { setErro('Evento salvo, mas não consegui programar a confirmação: ' + msgErro(ep)); await onRecarregar(); setSalvando(false); setEvento(null); return; }
      const dia = new Date(`${evento.data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
      msgFinal = `Evento salvo. A confirmação vai para a cliente às 8h de ${dia}.` + avisoMeet;
    } else if (evento.enviarConfirmacao) {
      const r = await enviarConfirmacao(evento, id);
      if (r.ok) msgFinal = 'Evento salvo e mensagem enviada pelo WhatsApp.' + avisoMeet;
      else { setErro('Evento salvo, mas a confirmação NÃO foi enviada: ' + r.erro + ' Você pode reenviar abrindo o evento.'); await onRecarregar(); setSalvando(false); setEvento(null); return; }
    }
    await onRecarregar();
    setSalvando(false); setEvento(null); setAviso(msgFinal);
  }

  async function reenviarConfirmacao() {
    setSalvando(true); setErro(''); setAviso('');
    const r = await enviarConfirmacao(evento, evento.id);
    setSalvando(false);
    if (!r.ok) { setErro(r.erro); return; }
    await onRecarregar();
    setEvento(prev => ({ ...prev, status: 'aguardando_confirmacao', confirmacao_enviada_em: new Date().toISOString() }));
    setAviso('Confirmação enviada pelo WhatsApp.');
  }
  async function mudarStatus(status) {
    setSalvando(true);
    const { error } = await supabase.from('agenda').update({ status, ...(status === 'confirmado' ? { confirmado_em: new Date().toISOString() } : {}) }).eq('id', evento.id);
    setSalvando(false);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setEvento(prev => ({ ...prev, status })); setAviso('Status atualizado.');
  }
  async function excluirEvento() {
    if (!window.confirm('Excluir este evento da agenda?')) return;
    const { error } = await supabase.from('agenda').delete().eq('id', evento.id);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setEvento(null);
  }

  // ───── Tarefa ─────
  function montarMsgTarefa(t) {
    return msgAvisoTarefa({ nomeCliente: cli(t.cliente_id)?.nome, titulo: t.titulo || '...', prazo: t.prazo });
  }
  function editarTarefa(patch) {
    setTarefa(prev => { const n = { ...prev, ...patch }; if (!n.msgEditada) n.mensagem = montarMsgTarefa(n); return n; });
  }
  function novaTarefa() { setErro(''); setAviso(''); setTarefa({ ...TAREFA_VAZIA, departamento: dep === 'todos' || bloqueado(dep) ? 'adm' : dep }); }
  function abrirTarefa(t) {
    setErro(''); setAviso('');
    setTarefa({ id: t.id, departamento: DEPARTAMENTOS[t.departamento] ? t.departamento : 'adm', titulo: t.titulo || '', descricao: t.descricao || '', prioridade: t.prioridade || 'normal', prazo: t.prazo || '', cliente_id: t.cliente_id || '', ordem_servico_id: t.ordem_servico_id || '', responsavel: t.responsavel || '', avisarCliente: false, mensagem: '', msgEditada: false });
  }
  async function salvarTarefa() {
    if (!tarefa.titulo.trim()) { setErro('Dê um título para a tarefa.'); return; }
    setSalvando(true); setErro(''); setAviso('');
    const linha = { departamento: tarefa.departamento || 'adm', titulo: tarefa.titulo.trim(), descricao: tarefa.descricao || null, prioridade: tarefa.prioridade, prazo: tarefa.prazo || null, cliente_id: tarefa.cliente_id || null, ordem_servico_id: tarefa.ordem_servico_id || null, responsavel: tarefa.responsavel || null };
    let id = tarefa.id; let error;
    if (id) ({ error } = await supabase.from('tarefas').update(linha).eq('id', id));
    else { const r = await supabase.from('tarefas').insert({ ...linha, status: 'pendente', origem: 'manual' }).select().single(); error = r.error; id = r.data?.id; }
    if (error) { setSalvando(false); setErro(msgErro(error)); return; }
    let msgFinal = 'Tarefa salva.';
    if (tarefa.avisarCliente) {
      const c = cli(tarefa.cliente_id);
      const r = c ? await enviarWhatsApp({ telefone: c.telefone, nome: c.nome, mensagem: tarefa.mensagem }) : { ok: false, erro: 'Escolha a cliente para avisar.' };
      if (r.ok) { await supabase.from('tarefas').update({ cliente_avisada_em: new Date().toISOString() }).eq('id', id); msgFinal = 'Tarefa salva e cliente avisada pelo WhatsApp.'; }
      else { setErro('Tarefa salva, mas o aviso NÃO foi enviado: ' + r.erro); await onRecarregar(); setSalvando(false); setTarefa(null); return; }
    }
    await onRecarregar(); setSalvando(false); setTarefa(null); setAviso(msgFinal);
  }
  async function alternarTarefa(t) {
    const concluir = t.status !== 'concluida';
    const { error } = await supabase.from('tarefas').update({ status: concluir ? 'concluida' : 'pendente', concluida_em: concluir ? new Date().toISOString() : null }).eq('id', t.id);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar();
  }
  async function excluirTarefa() {
    if (!window.confirm('Excluir esta tarefa?')) return;
    const { error } = await supabase.from('tarefas').delete().eq('id', tarefa.id);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setTarefa(null);
  }

  const hoje = inicioDia(new Date());
  const depT = (t) => DEPARTAMENTOS[t.departamento] ? t.departamento : 'adm';
  const tarefasLiberadas = tarefas.filter(t => !bloqueado(depT(t)));
  const tarefasDoDia = (d) => tarefasLiberadas.filter(t => t.prazo && t.status !== 'concluida' && (dep === 'todos' || depT(t) === dep) && mesmoDia(t.prazo + 'T12:00:00', d));
  const tarefasVisiveis = tarefasLiberadas.filter(t => dep === 'todos' || depT(t) === dep).filter(t => filtroTarefa === 'todas' ? true : filtroTarefa === 'concluidas' ? t.status === 'concluida' : t.status !== 'concluida')
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
  const osDaCliente = (cid) => os.filter(o => o.cliente_id === cid);
  const iconeEnviar = (a, tam = 12) => {
    if (a.conta || a.status === 'cancelado') return null;
    const enviada = !!a.confirmacao_enviada_em;
    return (
      <button title={enviada ? 'Mensagem enviada em ' + new Date(a.confirmacao_enviada_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + ' (clique para reenviar)' : (a.cliente_id ? 'Enviar mensagem pronta para a cliente' : 'Enviar lembrete para o seu WhatsApp')}
        disabled={enviandoId === a.id} onClick={(ev) => { ev.stopPropagation(); if (!enviada || window.confirm('Já foi enviada. Reenviar?')) enviarRapido(a); }}
        style={{ border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: tam, lineHeight: 1, padding: '2px 5px', background: enviada ? '#16a34a' : '#e5e7eb', color: enviada ? '#fff' : '#4b5563' }}>{enviandoId === a.id ? '…' : '➤'}</button>
    );
  };
  const chipEvento = (a, compacto) => {
    const t = TIPOS[a.tipo] || TIPOS.outro; const c = cli(a.cliente_id);
    return (
      <div key={a.id} onClick={(ev) => { ev.stopPropagation(); if (!a.conta) abrirEvento(a); }} style={{ background: t.cor + '22', border: `1px solid ${t.cor}`, borderRadius: 4, padding: '3px 6px', marginBottom: 4, fontSize: 11, cursor: a.conta ? 'default' : 'pointer', opacity: a.status === 'cancelado' ? 0.5 : 1, textDecoration: a.status === 'cancelado' ? 'line-through' : 'none' }}>
        <div style={{ fontWeight: 700, color: t.cor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{a.conta ? '💳' : hora(a.dt)} {a.status === 'confirmado' && '✓'}{a.link_meet && ' 🎥'}</span>{iconeEnviar(a, 10)}</div>
        <div style={{ color: '#374151', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.conta ? a.titulo : compacto ? t.label : (c?.nome || t.label)}</div>
      </div>
    );
  };
  const chipTarefa = (t) => (
    <div key={'t' + t.id} onClick={(ev) => { ev.stopPropagation(); abrirTarefa(t); }} style={{ background: '#f3f4f6', border: '1px dashed #9ca3af', borderRadius: 4, padding: '2px 6px', marginBottom: 4, fontSize: 10, cursor: 'pointer', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>☑ {t.titulo}</div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Agenda e Tarefas</h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>Cinco agendas — ADM/Clientes, Ateliê, Marketing, Financeira (com senha) e Tissu. O ➤ envia a mensagem pronta e fica verde quando enviada.</p>
        </div>
        {aba === 'agenda' ? <BtnPrimary onClick={() => novoEvento(cursor)}>Novo evento</BtnPrimary> : <BtnPrimary onClick={novaTarefa}>Nova tarefa</BtnPrimary>}
      </div>
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      {erro && !evento && !tarefa && <Aviso tipo="erro">{erro}</Aviso>}
      {!whatsappConfigurado() && <Aviso tipo="atencao">O envio por WhatsApp ainda não está ligado neste ambiente (falta <b>VITE_N8N_ENVIAR_URL</b> na Vercel). Eventos e tarefas salvam normalmente; só o envio da mensagem fica indisponível.</Aviso>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['todos', 'Todas as agendas', '#111'], ...Object.entries(DEPARTAMENTOS).map(([id, d]) => [id, d.label, d.cor])].map(([id, l, cor]) => (
          <button key={id} onClick={() => setDep(id)} style={{ padding: '8px 16px', borderRadius: 8, border: `2px solid ${dep === id ? cor : '#e5e7eb'}`, background: dep === id ? cor : '#fff', color: dep === id ? '#fff' : '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {l}{id !== 'todos' && contaDep(id) > 0 && <span style={{ marginLeft: 8, background: dep === id ? 'rgba(255,255,255,.25)' : cor + '22', color: dep === id ? '#fff' : cor, borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{contaDep(id)}</span>}
          </button>
        ))}
      </div>

      {bloqueado(dep) && <PortaoFinanceira onLiberar={async () => { setLiberada(true); await onRecarregar?.(); }} />}
      {dep === 'financeira' && liberada && <div style={{ marginBottom: 10 }}><BtnSecondary small onClick={() => { travarFinanceira(); setLiberada(false); setDep('todos'); }}>🔒 Travar Financeira</BtnSecondary></div>}
      {!bloqueado(dep) && <TabBar tabs={[{ id: 'agenda', label: 'Agenda' }, { id: 'tarefas', label: 'Tarefas', count: tarefasLiberadas.filter(t => t.status !== 'concluida').length }, { id: 'mensagens', label: 'Mensagens prontas' }]} active={aba} onChange={setAba} />}

      {!bloqueado(dep) && aba === 'agenda' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {['dia', 'semana', 'mes'].map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: view === v ? '#111' : '#f3f4f6', color: view === v ? '#fff' : '#374151' }}>{v === 'mes' ? 'Mês' : v.charAt(0).toUpperCase() + v.slice(1)}</button>)}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <BtnSecondary small onClick={() => mover(-1)}>‹</BtnSecondary>
              <BtnSecondary small onClick={() => setCursor(inicioDia(new Date()))}>Hoje</BtnSecondary>
              <BtnSecondary small onClick={() => mover(1)}>›</BtnSecondary>
              <span style={{ fontWeight: 700, textTransform: 'capitalize', minWidth: 190, textAlign: 'right' }}>{titulo}</span>
            </div>
          </div>

          {view === 'semana' && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#111' }}>
                {semana.map((d, i) => <div key={i} style={{ padding: '10px 8px', textAlign: 'center', color: '#c4a45a', fontWeight: 600, fontSize: 13, borderRight: i < 6 ? '1px solid #222' : 'none' }}><div>{DIAS[i]}</div><div style={{ color: mesmoDia(d, hoje) ? '#c4a45a' : '#fff', fontSize: 16, fontWeight: 700 }}>{d.getDate()}</div></div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 300 }}>
                {semana.map((d, i) => <div key={i} onClick={() => novoEvento(d)} title="Clique para criar um evento neste dia" style={{ padding: 8, borderRight: i < 6 ? '1px solid #e5e7eb' : 'none', borderTop: '1px solid #e5e7eb', minHeight: 140, cursor: 'pointer', background: mesmoDia(d, hoje) ? '#fffbeb' : '#fff' }}>{doDia(d).map(a => chipEvento(a))}{tarefasDoDia(d).map(chipTarefa)}</div>)}
              </div>
            </div>
          )}

          {view === 'mes' && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#111' }}>
                {DIAS.map(d => <div key={d} style={{ padding: 8, textAlign: 'center', color: '#c4a45a', fontWeight: 600, fontSize: 13 }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {gradeMes.map((d, i) => (
                  <div key={i} onClick={() => novoEvento(d)} style={{ minHeight: 92, padding: 6, borderTop: '1px solid #e5e7eb', borderRight: i % 7 < 6 ? '1px solid #e5e7eb' : 'none', cursor: 'pointer', background: mesmoDia(d, hoje) ? '#fffbeb' : d.getMonth() === cursor.getMonth() ? '#fff' : '#fafafa', opacity: d.getMonth() === cursor.getMonth() ? 1 : 0.55 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{d.getDate()}</div>
                    {doDia(d).slice(0, 3).map(a => chipEvento(a, true))}
                    {tarefasDoDia(d).slice(0, 2).map(chipTarefa)}
                    {doDia(d).length > 3 && <div style={{ fontSize: 10, color: '#6b7280' }}>+{doDia(d).length - 3} mais</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'dia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {doDia(cursor).length === 0 && tarefasDoDia(cursor).length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af' }}>Nada agendado neste dia.</Card>}
              {doDia(cursor).map(a => {
                const t = TIPOS[a.tipo] || TIPOS.outro; const c = cli(a.cliente_id); const st = STATUS_EVENTO[a.status] || STATUS_EVENTO.agendado;
                return (
                  <Card key={a.id} onClick={() => abrirEvento(a)} style={{ display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ width: 4, height: 56, borderRadius: 2, background: t.cor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{hora(a.dt)} · {c?.nome || t.label}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{t.label}{a.local ? ' · ' + a.local : ''}</div>
                    </div>
                    {iconeEnviar(a, 15)}
                    <Badge label={st.label} color={st.cor} />
                  </Card>
                );
              })}
              {tarefasDoDia(cursor).map(t => <Card key={t.id} onClick={() => abrirTarefa(t)} style={{ cursor: 'pointer', padding: 12 }}>☑ <b>{t.titulo}</b> <span style={{ color: '#9ca3af', fontSize: 12 }}>· tarefa · {(DEPARTAMENTOS[depT(t)] || {}).curto}</span></Card>)}
            </div>
          )}

          <h3 style={{ margin: '28px 0 12px', fontSize: 15, color: '#374151' }}>Próximos compromissos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {eventos.filter(e => new Date(e.dt) >= hoje && e.status !== 'cancelado').slice(0, 8).map(a => {
              const t = TIPOS[a.tipo] || TIPOS.outro; const c = cli(a.cliente_id); const st = STATUS_EVENTO[a.status] || STATUS_EVENTO.agendado;
              return (
                <Card key={a.id} onClick={() => abrirEvento(a)} style={{ display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', padding: 14 }}>
                  <div style={{ width: 4, height: 40, borderRadius: 2, background: t.cor }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{c?.nome || t.label} <span style={{ fontWeight: 400, color: '#6b7280' }}>· {t.label}</span></div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(a.dt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {iconeEnviar(a, 14)}
                  <Badge label={st.label} color={st.cor} />
                </Card>
              );
            })}
            {eventos.filter(e => new Date(e.dt) >= hoje).length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum compromisso futuro. Clique em "Novo evento" ou em um dia do calendário.</div>}
          </div>
        </div>
      )}

      {!bloqueado(dep) && aba === 'tarefas' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['pendentes', 'Pendentes'], ['concluidas', 'Concluídas'], ['todas', 'Todas']].map(([id, l]) => <button key={id} onClick={() => setFiltroTarefa(id)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: filtroTarefa === id ? '#111' : '#f3f4f6', color: filtroTarefa === id ? '#fff' : '#374151' }}>{l}</button>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tarefasVisiveis.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhuma tarefa aqui. Use "Nova tarefa" — ou abra uma OS, que cria as atividades da etapa sozinha.</Card>}
            {tarefasVisiveis.map(t => {
              const c = cli(t.cliente_id); const atrasada = t.status !== 'concluida' && t.prazo && new Date(t.prazo + 'T23:59:59') < new Date();
              return (
                <Card key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, borderLeft: atrasada ? '4px solid #ef4444' : undefined }}>
                  <input type="checkbox" checked={t.status === 'concluida'} onChange={() => alternarTarefa(t)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => abrirTarefa(t)}>
                    <div style={{ fontWeight: 600, fontSize: 14, textDecoration: t.status === 'concluida' ? 'line-through' : 'none', color: t.status === 'concluida' ? '#9ca3af' : '#111' }}>{t.titulo}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{[c?.nome, (DEPARTAMENTOS[t.departamento] || DEPARTAMENTOS.adm).curto, t.origem === 'fluxo' ? 'criada pelo fluxo' : null].filter(Boolean).join(' · ')}</div>
                  </div>
                  <Badge label={t.prioridade || 'normal'} color={PRIORIDADE_COR[t.prioridade] || '#f59e0b'} />
                  <span style={{ fontSize: 12, color: atrasada ? '#ef4444' : '#9ca3af', minWidth: 74, textAlign: 'right' }}>{atrasada ? 'Atrasada ' : ''}{fmtDate(t.prazo)}</span>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!bloqueado(dep) && aba === 'mensagens' && (
        <div>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Texto pronto de cada tipo de evento. Use {'{nome}'}, {'{tipo}'}, {'{quando}'}, {'{local}'} e {'{meet}'} — o sistema troca pelos dados do evento.</p>
          {Object.entries(TIPOS).filter(([, t]) => dep === 'todos' || t.dep === dep).filter(([, t]) => !bloqueado(t.dep)).map(([k, t]) => {
            const atual = modelosEdit[k] ?? modelos[k]?.texto ?? '';
            return (
              <Card key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><strong style={{ color: t.cor }}>{t.label}</strong><Badge label={DEPARTAMENTOS[t.dep].curto} color={DEPARTAMENTOS[t.dep].cor} /></div>
                <textarea value={atual} onChange={e => setModelosEdit(m => ({ ...m, [k]: e.target.value }))} rows={4} style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontFamily: 'inherit', fontSize: 13 }} />
                {modelosEdit[k] !== undefined && modelosEdit[k] !== (modelos[k]?.texto ?? '') && <div style={{ marginTop: 6 }}><BtnPrimary small onClick={async () => {
                  const { error } = await supabase.from('agenda_modelos_msg').upsert({ tipo: k, titulo: t.label, texto: modelosEdit[k], updated_at: new Date().toISOString() });
                  if (error) { setErro(msgErro(error)); return; }
                  setModelos(m => ({ ...m, [k]: { ...(m[k] || {}), tipo: k, texto: modelosEdit[k] } })); setModelosEdit(m => { const n = { ...m }; delete n[k]; return n; }); setAviso('Mensagem de "' + t.label + '" salva.');
                }}>Salvar texto</BtnPrimary></div>}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Drawer: evento ── */}
      <Drawer open={!!evento} onClose={() => setEvento(null)} title={evento?.id ? 'Evento' : 'Novo evento'} width={520}>
        {evento && (
          <div>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
            {evento.id && <div style={{ marginBottom: 14 }}><Badge label={(STATUS_EVENTO[evento.status] || STATUS_EVENTO.agendado).label} color={(STATUS_EVENTO[evento.status] || STATUS_EVENTO.agendado).cor} />{evento.confirmacao_enviada_em && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>confirmação enviada em {new Date(evento.confirmacao_enviada_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="Tipo" value={evento.tipo} onChange={v => editarEvento({ tipo: v })} options={Object.entries(TIPOS).filter(([, t]) => t.dep === evento.departamento).map(([value, t]) => ({ value, label: t.label }))} />
              <Campo label="Agenda (departamento)" value={evento.departamento} onChange={v => editarEvento({ departamento: v })} options={Object.entries(DEPARTAMENTOS).filter(([k]) => !bloqueado(k)).map(([value, d]) => ({ value, label: d.label }))} />
            </div>
            <ClienteRapido clientes={clientes} value={evento.cliente_id} onChange={v => editarEvento({ cliente_id: v, ordem_servico_id: '' })} onRecarregar={onRecarregar} />
            {evento.cliente_id && osDaCliente(evento.cliente_id).length > 0 && <Campo label="Ordem de serviço (opcional)" value={evento.ordem_servico_id} onChange={v => editarEvento({ ordem_servico_id: v })} options={osDaCliente(evento.cliente_id).map(o => ({ value: o.id, label: `${o.numero || 'OS'} — ${o.descricao || ''}` }))} />}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Campo label="Data" type="date" value={evento.data} onChange={v => editarEvento({ data: v })} />
              <Campo label="Hora" type="time" value={evento.hora} onChange={v => editarEvento({ hora: v })} />
              <Campo label="Duração (min)" type="number" value={evento.duracao_min} onChange={v => editarEvento({ duracao_min: v })} />
            </div>
            <Campo label="Local" value={evento.local} onChange={v => editarEvento({ local: v })} placeholder="Maison Das G, Show Room, endereço..." />
            <Campo label="Link da videochamada (Google Meet)" value={evento.link_meet} onChange={v => editarEvento({ link_meet: v })} ajuda={evento.link_meet ? (evento.meet_enviado_em ? 'Link já enviado para a cliente.' : 'Se a cliente tiver telefone, o link vai sozinho 10 min antes do horário (ou use o botão para enviar agora).') : undefined} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '-6px 0 14px' }}>
              <BtnSecondary small disabled={salvando || !meetConfigurado()} onClick={gerarLinkMeet}>{evento.link_meet ? 'Gerar novo Meet' : 'Gerar link do Meet'}</BtnSecondary>
              {evento.link_meet && <BtnSecondary small onClick={() => window.open(evento.link_meet, '_blank', 'noopener')}>Abrir Meet</BtnSecondary>}
              {evento.link_meet && evento.cliente_id && <BtnSecondary small disabled={salvando} onClick={enviarMeetAgora}>{evento.meet_enviado_em ? 'Reenviar link' : 'Enviar link agora'}</BtnSecondary>}
              {!evento.id && TIPOS[evento.tipo]?.meet && !evento.link_meet && <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={!!evento.gerarMeet} onChange={e => setEvento(p => ({ ...p, gerarMeet: e.target.checked }))} /> gerar Meet ao salvar</label>}
              {!meetConfigurado() && <span style={{ fontSize: 11, color: '#9ca3af' }}>Geração de Meet ainda não ligada neste ambiente.</span>}
            </div>
            <Campo label="Observações" type="textarea" value={evento.observacoes} onChange={v => editarEvento({ observacoes: v })} />

            {!evento.id && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={evento.enviarConfirmacao} onChange={e => editarEvento({ enviarConfirmacao: e.target.checked })} /> Enviar confirmação para a cliente pelo WhatsApp (sai às 8h do dia do evento)
              </label>
            )}
            {(evento.enviarConfirmacao || evento.id) && (
              <>
                <Campo label="Mensagem para a cliente" type="textarea" rows={6} value={evento.mensagem} onChange={v => setEvento(p => ({ ...p, mensagem: v, msgEditada: true }))} ajuda={evento.cliente_id && !cli(evento.cliente_id)?.telefone ? '⚠ Esta cliente não tem telefone cadastrado.' : 'Você pode editar o texto antes de enviar.'} />
                {evento.id && <div style={{ marginBottom: 14 }}><BtnSecondary small disabled={salvando || !evento.cliente_id} onClick={reenviarConfirmacao}>{evento.confirmacao_enviada_em ? 'Reenviar confirmação' : 'Enviar confirmação'}</BtnSecondary></div>}
              </>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <BtnPrimary onClick={salvarEvento} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</BtnPrimary>
              <BtnSecondary onClick={() => setEvento(null)}>Fechar</BtnSecondary>
            </div>
            {evento.id && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 22, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                <BtnSecondary small onClick={() => mudarStatus('confirmado')}>Marcar confirmado</BtnSecondary>
                <BtnSecondary small onClick={() => mudarStatus('realizado')}>Marcar realizado</BtnSecondary>
                <BtnSecondary small onClick={() => mudarStatus('cancelado')}>Cancelar evento</BtnSecondary>
                <BtnDanger small onClick={excluirEvento}>Excluir</BtnDanger>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── Drawer: tarefa ── */}
      <Drawer open={!!tarefa} onClose={() => setTarefa(null)} title={tarefa?.id ? 'Tarefa' : 'Nova tarefa'} width={500}>
        {tarefa && (
          <div>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Campo label="Título *" value={tarefa.titulo} onChange={v => editarTarefa({ titulo: v })} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '-4px 0 10px' }}>{['Comprar tecido', 'Orçar tecido', 'Comprar aviamentos', 'Pedir orçamento ao fornecedor', 'Conferir entrega de material'].map(t => <button key={t} type="button" onClick={() => editarTarefa({ titulo: t })} style={{ border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 12, padding: '2px 10px', fontSize: 12, cursor: 'pointer' }}>{t}</button>)}</div>
            <Campo label="Departamento" value={tarefa.departamento} onChange={v => setTarefa(p => ({ ...p, departamento: v }))} options={Object.entries(DEPARTAMENTOS).map(([value, d]) => ({ value, label: d.label }))} />
            <Campo label="Detalhes" type="textarea" value={tarefa.descricao} onChange={v => setTarefa(p => ({ ...p, descricao: v }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="Prioridade" value={tarefa.prioridade} onChange={v => setTarefa(p => ({ ...p, prioridade: v }))} options={[{ value: 'alta', label: 'Alta' }, { value: 'normal', label: 'Normal' }, { value: 'baixa', label: 'Baixa' }]} />
              <Campo label="Prazo" type="date" value={tarefa.prazo} onChange={v => editarTarefa({ prazo: v })} />
            </div>
            <ClienteRapido label="Cliente (opcional)" clientes={clientes} value={tarefa.cliente_id} onChange={v => editarTarefa({ cliente_id: v, ordem_servico_id: '' })} onRecarregar={onRecarregar} />
            <Campo label="Vincular a uma OS (opcional) — ex.: compra ou orçamento de tecido" value={tarefa.ordem_servico_id} onChange={v => { const o = os.find(x => x.id === v); setTarefa(p => ({ ...p, ordem_servico_id: v, cliente_id: o ? o.cliente_id : p.cliente_id })); }} options={os.filter(o => o.status_idx < 22 || o.id === tarefa.ordem_servico_id).map(o => ({ value: o.id, label: `${o.numero || 'OS'} — ${clientes.find(c => c.id === o.cliente_id)?.nome || ''} ${o.descricao ? '· ' + o.descricao : ''}` }))} />
            <Campo label="Responsável" value={tarefa.responsavel} onChange={v => setTarefa(p => ({ ...p, responsavel: v }))} />
            {tarefa.cliente_id && (
              <>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={tarefa.avisarCliente} onChange={e => editarTarefa({ avisarCliente: e.target.checked })} /> Avisar a cliente pelo WhatsApp
                </label>
                {tarefa.avisarCliente && <Campo label="Mensagem para a cliente" type="textarea" rows={5} value={tarefa.mensagem} onChange={v => setTarefa(p => ({ ...p, mensagem: v, msgEditada: true }))} ajuda="Edite o texto à vontade antes de salvar." />}
              </>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <BtnPrimary onClick={salvarTarefa} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</BtnPrimary>
              <BtnSecondary onClick={() => setTarefa(null)}>Fechar</BtnSecondary>
              {tarefa.id && <BtnDanger onClick={excluirTarefa}>Excluir</BtnDanger>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
