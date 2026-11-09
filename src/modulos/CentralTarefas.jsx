import { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import PortaoFinanceira, { finLiberada, travarFinanceira } from './PortaoFinanceira.jsx';
import { Badge, Card, BtnPrimary, BtnSecondary, BtnDanger, Aviso, fmtDate } from './ui.jsx';

export const AGENDAS = {
  adm: { label: 'ADM', cor: '#c4a45a' },
  clientes: { label: 'Clientes', cor: '#d97706' },
  atelie: { label: 'Ateliê', cor: '#0ea5e9' },
  marketing: { label: 'Marketing', cor: '#e11d48' },
  financeira: { label: 'Financeira', cor: '#0f766e', privada: true },
  tissu: { label: 'Das G Tissu (tecidos)', cor: '#7c3aed' },
};
const depDe = (t) => AGENDAS[t.departamento] ? t.departamento : 'adm';
const atrasada = (t) => t.status !== 'concluida' && t.prazo && new Date(t.prazo + 'T23:59:59') < new Date();
const PRIO = { alta: '#ef4444', normal: '#f59e0b', baixa: '#6b7280' };

// Resumo por agenda para o Dashboard e a Central de Atendimento.
export function TarefasPorAgenda({ tarefas, onAbrir }) {
  const liberada = finLiberada();
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: 15 }}>Central de Tarefas</h3>
        {onAbrir && <BtnSecondary small onClick={onAbrir}>Abrir Central de Tarefas</BtnSecondary>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {Object.entries(AGENDAS).map(([k, a]) => {
          const trancada = a.privada && !liberada;
          const pend = tarefas.filter(t => depDe(t) === k && t.status !== 'concluida').sort((x, y) => (x.prazo || '9999').localeCompare(y.prazo || '9999'));
          const atr = pend.filter(atrasada).length;
          return (
            <Card key={k} onClick={onAbrir} style={{ borderTop: `3px solid ${a.cor}`, padding: 14, cursor: onAbrir ? 'pointer' : 'default' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: a.cor }}>Tarefas {a.label}{trancada ? ' 🔒' : ''}</div>
              {trancada ? <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Abra com a senha</div> : (
                <>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{pend.length}{atr > 0 && <span style={{ fontSize: 12, color: '#ef4444', marginLeft: 8 }}>{atr} atrasada{atr > 1 ? 's' : ''}</span>}</div>
                  {pend.slice(0, 3).map(t => <div key={t.id} style={{ fontSize: 12, color: atrasada(t) ? '#dc2626' : '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {t.titulo}</div>)}
                  {pend.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af' }}>Nada pendente</div>}
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function CentralTarefas({ tarefas, clientes, onRecarregar }) {
  const [ag, setAg] = useState('adm');
  const [liberada, setLiberada] = useState(finLiberada());
  const [novo, setNovo] = useState({ titulo: '', prazo: '', prioridade: 'normal' });
  const [filtro, setFiltro] = useState('pendentes');
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const bloqueada = AGENDAS[ag].privada && !liberada;
  const visiveis = tarefas.filter(t => depDe(t) === ag).filter(t => filtro === 'todas' ? true : filtro === 'concluidas' ? t.status === 'concluida' : t.status !== 'concluida')
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
  const cliNome = (id) => clientes.find(c => c.id === id)?.nome;
  const conta = (k) => tarefas.filter(t => depDe(t) === k && t.status !== 'concluida').length;

  async function adicionar() {
    if (!novo.titulo.trim()) return;
    setOcupado(true); setErro('');
    const { error } = await supabase.from('tarefas').insert({ departamento: ag, titulo: novo.titulo.trim(), prazo: novo.prazo || null, prioridade: novo.prioridade, status: 'pendente', origem: 'manual' });
    setOcupado(false);
    if (error) { setErro(error.message); return; }
    setNovo({ titulo: '', prazo: '', prioridade: 'normal' }); await onRecarregar();
  }
  async function atualizar(id, patch) {
    const { error } = await supabase.from('tarefas').update(patch).eq('id', id);
    if (error) { setErro(error.message); return; }
    await onRecarregar();
  }
  async function excluir(t) {
    if (!window.confirm('Excluir a tarefa "' + t.titulo + '"?')) return;
    const { error } = await supabase.from('tarefas').delete().eq('id', t.id);
    if (error) { setErro(error.message); return; }
    await onRecarregar();
  }
  const inp = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Central de Tarefas</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Uma lista por agenda — tarefa ateliê, tarefa financeiro, tarefa marketing... Clique no texto para editar.</p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(AGENDAS).map(([k, a]) => (
          <button key={k} onClick={() => setAg(k)} style={{ padding: '8px 16px', borderRadius: 8, border: `2px solid ${ag === k ? a.cor : '#e5e7eb'}`, background: ag === k ? a.cor : '#fff', color: ag === k ? '#fff' : '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Tarefas {a.label}{a.privada && !liberada ? ' 🔒' : ''}{!(a.privada && !liberada) && conta(k) > 0 && <span style={{ marginLeft: 8, background: ag === k ? 'rgba(255,255,255,.25)' : a.cor + '22', color: ag === k ? '#fff' : a.cor, borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{conta(k)}</span>}
          </button>
        ))}
      </div>

      {bloqueada ? <PortaoFinanceira onLiberar={async () => { setLiberada(true); await onRecarregar?.(); }} /> : (
        <>
          {AGENDAS[ag].privada && <div style={{ marginBottom: 10 }}><BtnSecondary small onClick={() => { travarFinanceira(); setLiberada(false); setAg('adm'); }}>🔒 Travar Financeira</BtnSecondary></div>}
          <Card style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={novo.titulo} onChange={e => setNovo(n => ({ ...n, titulo: e.target.value }))} onKeyDown={e => e.key === 'Enter' && adicionar()} placeholder={`Nova tarefa de ${AGENDAS[ag].label}...`} style={{ ...inp, flex: 1, minWidth: 220 }} />
            <input type="date" value={novo.prazo} onChange={e => setNovo(n => ({ ...n, prazo: e.target.value }))} style={inp} />
            <select value={novo.prioridade} onChange={e => setNovo(n => ({ ...n, prioridade: e.target.value }))} style={inp}><option value="alta">Alta</option><option value="normal">Normal</option><option value="baixa">Baixa</option></select>
            <BtnPrimary onClick={adicionar} disabled={ocupado || !novo.titulo.trim()}>Adicionar</BtnPrimary>
          </Card>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[['pendentes', 'Pendentes'], ['concluidas', 'Concluídas'], ['todas', 'Todas']].map(([id, l]) => <button key={id} onClick={() => setFiltro(id)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: filtro === id ? '#111' : '#f3f4f6', color: filtro === id ? '#fff' : '#374151' }}>{l}</button>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visiveis.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhuma tarefa aqui.</Card>}
            {visiveis.map(t => (
              <Card key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, borderLeft: atrasada(t) ? '4px solid #ef4444' : undefined, flexWrap: 'wrap' }}>
                <input type="checkbox" checked={t.status === 'concluida'} onChange={() => atualizar(t.id, t.status === 'concluida' ? { status: 'pendente', concluida_em: null } : { status: 'concluida', concluida_em: new Date().toISOString() })} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  {editando?.id === t.id ? (
                    <input autoFocus value={editando.titulo} onChange={e => setEditando({ id: t.id, titulo: e.target.value })} onBlur={() => { if (editando.titulo.trim() && editando.titulo !== t.titulo) atualizar(t.id, { titulo: editando.titulo.trim() }); setEditando(null); }} onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditando(null); }} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
                  ) : (
                    <div onClick={() => setEditando({ id: t.id, titulo: t.titulo })} title="Clique para editar" style={{ fontWeight: 600, fontSize: 14, cursor: 'text', textDecoration: t.status === 'concluida' ? 'line-through' : 'none', color: t.status === 'concluida' ? '#9ca3af' : '#111' }}>{t.titulo}</div>
                  )}
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{[cliNome(t.cliente_id), t.origem === 'fluxo' ? 'criada pelo fluxo' : null].filter(Boolean).join(' · ')}</div>
                </div>
                <select value={t.prioridade || 'normal'} onChange={e => atualizar(t.id, { prioridade: e.target.value })} style={{ ...inp, padding: '4px 6px', color: PRIO[t.prioridade] || '#f59e0b', fontWeight: 600 }}><option value="alta">Alta</option><option value="normal">Normal</option><option value="baixa">Baixa</option></select>
                <input type="date" value={t.prazo || ''} onChange={e => atualizar(t.id, { prazo: e.target.value || null })} style={{ ...inp, padding: '4px 6px', color: atrasada(t) ? '#ef4444' : undefined }} />
                <BtnDanger small onClick={() => excluir(t)}>Excluir</BtnDanger>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
