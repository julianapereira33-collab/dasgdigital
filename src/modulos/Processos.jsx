import { useState } from 'react';
import { ROTULO_ETAPA } from '../lib/api.js';
import { Badge, Card, fmtDate } from './ui.jsx';

// Visão da gestão: OS abertas por processo (departamento) e por etapa.
const PROCESSOS = [
  { titulo: 'Atendimento', cor: '#0ea5e9', etapas: ['lead', 'qualificacao', 'agendado', 'consultoria'] },
  { titulo: 'Orçamento e pagamento', cor: '#f97316', etapas: ['orcamento_enviado', 'aprovado', 'entrada'] },
  { titulo: 'Criação', cor: '#8b5cf6', etapas: ['os_aberta', 'briefing', 'dossie', 'criacao'] },
  { titulo: 'Ateliê (produção)', cor: '#c4a45a', etapas: ['modelagem', 'corte', 'costura', 'acabamento'] },
  { titulo: 'Provas e ajustes', cor: '#ec4899', etapas: ['prova1', 'ajustes1', 'prova2', 'prova_final'] },
  { titulo: 'Entrega e pós-venda', cor: '#16a34a', etapas: ['finalizacao', 'pgto_final', 'entrega', 'feedback'] },
];

export default function Processos({ os, clientes, onAbrirCliente }) {
  const [aberto, setAberto] = useState(null);
  const ativas = os.filter(o => o.status_idx < 23);
  const nome = (o) => clientes.find(c => c.id === o.cliente_id)?.nome || '—';
  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>Processos</h1><p style={{ color: '#6b7280', marginTop: 4 }}>{ativas.length} OS abertas, por processo</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {PROCESSOS.map(p => {
          const lista = ativas.filter(o => p.etapas.includes(o.status));
          return (
            <Card key={p.titulo} style={{ borderTop: `4px solid ${p.cor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><h3 style={{ fontWeight: 700 }}>{p.titulo}</h3><Badge label={String(lista.length)} color={p.cor} /></div>
              {p.etapas.map(e => { const l = lista.filter(o => o.status === e); return (
                <div key={e} style={{ marginBottom: 6 }}>
                  <button onClick={() => setAberto(aberto === e ? null : e)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', fontSize: 13, color: l.length ? '#111' : '#9ca3af' }}><span>{ROTULO_ETAPA[e]}</span><strong>{l.length}</strong></button>
                  {aberto === e && l.map(o => <div key={o.id} onClick={() => onAbrirCliente && onAbrirCliente(o)} style={{ fontSize: 12, padding: '4px 8px', background: '#f9fafb', borderRadius: 4, marginTop: 2, cursor: 'pointer' }}>{o.numero} · {nome(o)}{o.data_entrega_prevista ? ' · entrega ' + fmtDate(o.data_entrega_prevista) : o.data_evento ? ' · evento ' + fmtDate(o.data_evento) : ''}</div>)}
                </div>); })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
