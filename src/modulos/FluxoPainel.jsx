import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { ETAPAS, TOTAL_ETAPAS } from '../lib/etapas.js';
import { Badge, Card, BtnSecondary, fmtDate } from './ui.jsx';

// Fluxo de Atendimento = painel de acompanhamento (somente leitura). A etapa se altera na Ordem de Serviço.
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const DIA = 86400000;
const diasAte = (d) => { if (!d) return null; const x = new Date(String(d).length <= 10 ? d + 'T12:00:00' : d); return Math.round((x - new Date()) / DIA); };
const dataCurta = (d) => d ? fmtDate(d) : '—';
const PROVAS = ['prova1', 'prova2', 'prova_final', 'prova4'];

export function calcularAlertas({ o, provas, agenda, fin, materiais, quiz, tarefas = [] }) {
  const alertas = []; // { nivel: 'alto' | 'medio', texto, tipo }
  const parado = Math.floor((Date.now() - new Date(o.ultima_atualizacao || o.updated_at || Date.now())) / DIA);
  if (parado >= 14) alertas.push({ nivel: 'alto', tipo: 'parada', texto: `Muito tempo parada: ${parado} dias sem andamento` });
  else if (parado >= 7) alertas.push({ nivel: 'medio', tipo: 'parada', texto: `Parada há ${parado} dias` });

  const datasProva = [
    ...provas.filter(p => p.status !== 'realizada' && p.status !== 'concluida' && p.data_agendada).map(p => p.data_agendada),
    ...agenda.filter(a => PROVAS.includes(a.tipo) && a.status !== 'cancelado' && a.status !== 'realizado').map(a => a.data_hora),
  ].map(d => ({ d, n: diasAte(d) })).filter(x => x.n !== null && x.n >= -1).sort((a, b) => a.n - b.n);
  const prova = datasProva[0] || null;
  if (prova) {
    if (prova.n <= 2) alertas.push({ nivel: 'alto', tipo: 'prova', texto: prova.n < 0 ? 'Prova era ontem — confirmar' : prova.n === 0 ? 'Prova HOJE' : `Prova em ${prova.n} dia${prova.n > 1 ? 's' : ''}` });
    else if (prova.n <= 7) alertas.push({ nivel: 'medio', tipo: 'prova', texto: `Prova em ${prova.n} dias` });
  }
  const ent = diasAte(o.data_entrega_prevista);
  if (ent !== null) {
    if (ent < 0) alertas.push({ nivel: 'alto', tipo: 'entrega', texto: `Entrega atrasada há ${-ent} dia${ent < -1 ? 's' : ''}` });
    else if (ent <= 3) alertas.push({ nivel: 'alto', tipo: 'entrega', texto: ent === 0 ? 'Entrega HOJE' : `Entrega em ${ent} dia${ent > 1 ? 's' : ''}` });
    else if (ent <= 7) alertas.push({ nivel: 'medio', tipo: 'entrega', texto: `Entrega em ${ent} dias` });
  }
  const ev = diasAte(o.data_evento);
  if (ev !== null && ev >= 0 && ev <= 10 && o.status_idx < 17) alertas.push({ nivel: ev <= 5 ? 'alto' : 'medio', tipo: 'entrega', texto: `Evento da cliente em ${ev} dia${ev !== 1 ? 's' : ''} e a peça ainda não está na finalização` });

  const aReceber = fin.filter(f => f.status !== 'pago');
  const vencidas = aReceber.filter(f => f.data_vencimento && diasAte(f.data_vencimento) < 0);
  if (vencidas.length) alertas.push({ nivel: 'alto', tipo: 'receber', texto: `${vencidas.length} parcela${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''} (${brl(vencidas.reduce((s, f) => s + Number(f.valor || 0), 0))})` });
  const faltam = materiais.filter(m => !m.comprado);
  if (faltam.length && o.status_idx >= 9 && o.status_idx < 17) alertas.push({ nivel: 'medio', tipo: 'aviamento', texto: `Faltam ${faltam.length} item${faltam.length > 1 ? 'ns' : ''} de material/aviamento` });
  if (quiz && quiz.status !== 'respondido' && !quiz.respondido_em && quiz.enviado_em && (Date.now() - new Date(quiz.enviado_em)) > 2 * DIA) alertas.push({ nivel: 'medio', tipo: 'quiz', texto: 'Quiz enviado há mais de 2 dias sem resposta' });
  const abertas = tarefas.filter(t => t.status !== 'concluida');
  const atrasadas = abertas.filter(t => t.prazo && diasAte(t.prazo) < 0);
  if (atrasadas.length) alertas.push({ nivel: 'alto', tipo: 'tarefa', texto: `${atrasadas.length} tarefa${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}: ${atrasadas.slice(0, 2).map(t => t.titulo).join(', ')}` });
  return { alertas, parado, prova, ent };
}

const FILTROS = [
  ['todas', 'Todas'], ['alerta', 'Com alerta'], ['parada', 'Paradas'], ['prova', 'Provas próximas'], ['entrega', 'Entregas próximas'], ['receber', 'Falta receber'], ['aviamento', 'Falta aviamento'], ['quiz', 'Quiz pendente'],
];

export default function FluxoPainel({ os, clientes, provas = [], agenda = [], quizEnvios = [], tarefas = [], onAbrirOS }) {
  const [fin, setFin] = useState([]);
  const [mat, setMat] = useState([]);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [verEncerradas, setVerEncerradas] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [f, m] = await Promise.all([
        supabase.from('financeiro_receber').select('ordem_servico_id,valor,status,data_vencimento'),
        supabase.from('os_materiais').select('ordem_servico_id,comprado'),
      ]);
      if (!vivo) return;
      if (f.error || m.error) setErro((f.error || m.error).message);
      setFin(f.data || []); setMat(m.data || []);
    })();
    return () => { vivo = false; };
  }, [os.length]);

  const linhas = useMemo(() => os
    .filter(o => verEncerradas || o.status_idx < TOTAL_ETAPAS)
    .map(o => {
      const cli = clientes.find(c => c.id === o.cliente_id);
      const f = fin.filter(x => x.ordem_servico_id === o.id);
      const materiais = mat.filter(x => x.ordem_servico_id === o.id);
      const quiz = quizEnvios.filter(q => q.ordem_servico_id === o.id).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))[0] || null;
      const tarefasOS = tarefas.filter(t => t.ordem_servico_id === o.id);
      const c = calcularAlertas({ o, provas: provas.filter(p => p.os_id === o.id), agenda: agenda.filter(a => a.ordem_servico_id === o.id), fin: f, materiais, quiz, tarefas: tarefasOS });
      const pago = f.filter(x => x.status === 'pago').reduce((s, x) => s + Number(x.valor || 0), 0);
      const aReceber = f.filter(x => x.status !== 'pago').reduce((s, x) => s + Number(x.valor || 0), 0);
      const total = Number(o.valor_total || 0);
      return { o, cli, ...c, pago, aReceber, total, temFin: f.length > 0, faltaMat: materiais.filter(x => !x.comprado).length, matTotal: materiais.length, quiz, tarefasOS, peso: c.alertas.reduce((s, a) => s + (a.nivel === 'alto' ? 10 : 3), 0) };
    })
    .sort((a, b) => b.peso - a.peso || b.parado - a.parado), [os, clientes, fin, mat, provas, agenda, quizEnvios, tarefas, verEncerradas]);

  const passa = (l) => ({
    todas: true, alerta: l.alertas.length > 0,
    parada: l.alertas.some(a => a.tipo === 'parada'), prova: l.alertas.some(a => a.tipo === 'prova'), entrega: l.alertas.some(a => a.tipo === 'entrega'),
    receber: l.aReceber > 0 || (!l.temFin && l.total > 0), aviamento: l.faltaMat > 0, quiz: !l.quiz || l.quiz.status !== 'respondido',
  })[filtro];
  const vis = linhas.filter(passa);
  const contar = (k) => linhas.filter(l => ({ todas: true, alerta: l.alertas.length > 0, parada: l.alertas.some(a => a.tipo === 'parada'), prova: l.alertas.some(a => a.tipo === 'prova'), entrega: l.alertas.some(a => a.tipo === 'entrega'), receber: l.aReceber > 0 || (!l.temFin && l.total > 0), aviamento: l.faltaMat > 0, quiz: !l.quiz || l.quiz.status !== 'respondido' })[k]).length;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Fluxo de Atendimento</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>Painel de acompanhamento: onde cada OS está, o que já foi pago, o que falta receber, o quiz e os aviamentos. Para mudar a etapa, abra a OS.</p>
      {erro && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 12 }}>Alguns dados não carregaram: {erro}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTROS.map(([k, rot]) => <button key={k} onClick={() => setFiltro(k)} style={{ padding: '6px 12px', borderRadius: 16, border: '1px solid ' + (filtro === k ? '#c4a45a' : '#e5e7eb'), background: filtro === k ? '#c4a45a' : '#fff', color: filtro === k ? '#fff' : '#374151', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{rot} <span style={{ opacity: .8 }}>({contar(k)})</span></button>)}
        <label style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center', marginLeft: 8 }}><input type="checkbox" checked={verEncerradas} onChange={e => setVerEncerradas(e.target.checked)} /> incluir encerradas</label>
      </div>

      {vis.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Nenhuma OS neste filtro.</Card>}
      {vis.map(({ o, cli, alertas, parado, prova, ent, pago, aReceber, total, temFin, faltaMat, matTotal, quiz, tarefasOS }) => {
        const etapa = ETAPAS[o.status_idx - 1];
        const borda = alertas.some(a => a.nivel === 'alto') ? '#ef4444' : alertas.length ? '#f59e0b' : '#16a34a';
        return (
          <Card key={o.id} style={{ marginBottom: 12, borderLeft: `4px solid ${borda}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{o.numero || 'OS'} · {cli?.nome || 'Cliente'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{o.descricao || o.servico || '—'}{o.ocasiao ? ' · ' + o.ocasiao : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge label={etapa ? `${o.status_idx}/${TOTAL_ETAPAS} · ${etapa.label}` : '—'} color={etapa?.cor || '#6b7280'} />
                <BtnSecondary small onClick={() => onAbrirOS && onAbrirOS(o.id)}>Abrir OS</BtnSecondary>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 2, margin: '12px 0 4px' }} aria-label="Etapas do fluxo">
              {ETAPAS.map((e, i) => <div key={e.slug} title={`${i + 1}. ${e.label}`} style={{ flex: 1, height: i + 1 === o.status_idx ? 12 : 8, alignSelf: 'center', borderRadius: 2, background: i + 1 < o.status_idx ? '#c4a45a' : i + 1 === o.status_idx ? e.cor || '#111' : '#e5e7eb', outline: i + 1 === o.status_idx ? '2px solid #111' : 'none' }} />)}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>{etapa ? `Agora: ${etapa.label}` : ''}{ETAPAS[o.status_idx] ? ` → próxima: ${ETAPAS[o.status_idx].label}` : ''} · atualizada {dataCurta(o.ultima_atualizacao)} ({parado} dia{parado !== 1 ? 's' : ''})</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 8, fontSize: 12 }}>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase' }}>Pagamento</div>
                {!temFin && total === 0 ? <b style={{ color: '#9ca3af' }}>sem valor definido</b> : !temFin ? <b style={{ color: '#d97706' }}>não lançado ({brl(total)})</b> : aReceber > 0 ? <b style={{ color: '#d97706' }}>pago {brl(pago)} · falta {brl(aReceber)}</b> : <b style={{ color: '#16a34a' }}>quitado {brl(pago)}</b>}</div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase' }}>Quiz</div>
                {!quiz ? <b style={{ color: '#9ca3af' }}>não enviado</b> : quiz.status === 'respondido' || quiz.respondido_em ? <b style={{ color: '#16a34a' }}>respondido {dataCurta(quiz.respondido_em)}</b> : <b style={{ color: '#d97706' }}>enviado, aguardando</b>}</div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase' }}>Aviamentos / materiais</div>
                {matTotal === 0 ? <b style={{ color: '#9ca3af' }}>não listados</b> : faltaMat > 0 ? <b style={{ color: '#d97706' }}>faltam {faltaMat} de {matTotal}</b> : <b style={{ color: '#16a34a' }}>tudo comprado</b>}</div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase' }}>Próxima prova</div><b>{prova ? dataCurta(prova.d) : '—'}</b></div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase' }}>Entrega prevista</div><b>{dataCurta(o.data_entrega_prevista)}</b></div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase' }}>Evento da cliente</div><b>{dataCurta(o.data_evento)}</b></div>
            </div>

            {tarefasOS.filter(t => t.status !== 'concluida').length > 0 && <div style={{ marginTop: 10, fontSize: 12, color: '#374151' }}><b>Tarefas ligadas a esta OS:</b> {tarefasOS.filter(t => t.status !== 'concluida').map(t => <span key={t.id} style={{ display: 'inline-block', background: '#f3f4f6', borderRadius: 10, padding: '2px 8px', margin: '2px 4px 2px 0' }}>{t.titulo}{t.prazo ? ' · ' + fmtDate(t.prazo) : ''}</span>)}</div>}
            {alertas.length > 0 && <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {alertas.map((a, i) => <div key={i} style={{ fontSize: 13, color: a.nivel === 'alto' ? '#b91c1c' : '#b45309', fontWeight: 600 }}>{a.nivel === 'alto' ? '🔴' : '🟠'} {a.texto}</div>)}
            </div>}
          </Card>
        );
      })}
    </div>
  );
}
