import { useCallback, useEffect, useMemo, useState } from 'react';
import { TOTAL_ETAPAS } from '../lib/etapas.js';
import { supabase } from '../lib/supabaseClient.js';
import { ROTULO_ETAPA } from '../lib/api.js';
import Arquivos from './Arquivos.jsx';
import { Badge, Card, BtnPrimary, BtnSecondary, Campo, Aviso, fmtDateTime, erroDeSchema } from './ui.jsx';

// Datas do pedido (tecidos/medidas e entrega) + 1ª, 2ª e 3ª (final) provas com anotações de ajuste.
const TIPOS = [['prova1', '1ª prova'], ['prova2', '2ª prova'], ['prova_final', '3ª prova (final)']];
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração. ' + e.message : (e.message || String(e));
const paraInput = (d) => d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

export default function Provas({ os, clientes, onRecarregar }) {
  const [osId, setOsId] = useState('');
  const [provas, setProvas] = useState([]);
  const [datas, setDatas] = useState({ data_tecidos_medidas: '', data_entrega_prevista: '' });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const ativas = useMemo(() => os.filter(o => o.status_idx < TOTAL_ETAPAS), [os]);
  const osSel = os.find(o => o.id === osId) || null;
  const cli = osSel ? clientes.find(c => c.id === osSel.cliente_id) : null;

  const carregar = useCallback(async () => {
    if (!osId) { setProvas([]); return; }
    const { data, error } = await supabase.from('provas').select('*').eq('ordem_servico_id', osId);
    if (error) { setErro(msgErro(error)); return; }
    setProvas(data || []);
  }, [osId]);
  useEffect(() => { setErro(''); setAviso(''); carregar(); if (osSel) setDatas({ data_tecidos_medidas: osSel.data_tecidos_medidas || '', data_entrega_prevista: osSel.data_entrega_prevista || '' }); }, [osId]); // eslint-disable-line react-hooks/exhaustive-deps

  const daProva = (t) => provas.find(p => p.tipo === t);
  const mudar = (t, patch) => setProvas(ps => daProva(t) ? ps.map(p => p.tipo === t ? { ...p, ...patch } : p) : [...ps, { tipo: t, ordem_servico_id: osId, status: 'pendente', ...patch }]);

  async function salvarDatas() {
    const { error } = await supabase.from('ordens_servico').update({ data_tecidos_medidas: datas.data_tecidos_medidas || null, data_entrega_prevista: datas.data_entrega_prevista || null }).eq('id', osId);
    if (error) { setErro(msgErro(error)); return; }
    setAviso('Datas salvas.'); onRecarregar && onRecarregar();
  }
  async function salvarProva(t) {
    const p = daProva(t);
    const linha = { ordem_servico_id: osId, tipo: t, data_agendada: p.data_agendada ? new Date(p.data_agendada).toISOString() : null, status: p.status || 'pendente', ajustes: p.ajustes || null, notas_costureira: p.notas_costureira || null, aprovado: p.aprovado || null, data_proxima_prova: p.data_proxima_prova || null };
    const { data, error } = p.id ? await supabase.from('provas').update(linha).eq('id', p.id).select().single() : await supabase.from('provas').insert(linha).select().single();
    if (error) { setErro(msgErro(error)); return; }
    setProvas(ps => ps.map(x => x.tipo === t ? data : x)); setAviso('Prova salva.');
    if (p.data_agendada && !p.id) {
      await supabase.from('agenda').insert({ cliente_id: osSel.cliente_id, ordem_servico_id: osId, tipo: t, titulo: `${TIPOS.find(x => x[0] === t)[1]} — ${cli?.nome || ''}`, data_hora: linha.data_agendada, departamento: 'atelie' });
      onRecarregar && onRecarregar();
    }
  }

  const inp = { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>Provas e Entrega</h1><p style={{ color: '#6b7280', marginTop: 4 }}>Medidas, 1ª/2ª/3ª provas, ajustes e data de entrega</p></div>
      <select value={osId} onChange={e => setOsId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, minWidth: 280, marginBottom: 16 }}>
        <option value="">Escolha a OS...</option>
        {ativas.map(o => <option key={o.id} value={o.id}>{o.numero || 'OS'} — {clientes.find(c => c.id === o.cliente_id)?.nome} ({ROTULO_ETAPA[o.status] || o.status})</option>)}
      </select>
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}{erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!osSel ? <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Escolha uma OS.</Card> : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 10 }}>Datas do pedido</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <label><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 }}>Ver tecidos e medidas</div><input type="date" value={datas.data_tecidos_medidas || ''} onChange={e => setDatas(d => ({ ...d, data_tecidos_medidas: e.target.value }))} style={inp} /></label>
              <label><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 }}>Entrega prevista {osSel.data_evento ? '(evento: ' + new Date(osSel.data_evento + 'T12:00:00').toLocaleDateString('pt-BR') + ')' : ''}</div><input type="date" value={datas.data_entrega_prevista || ''} onChange={e => setDatas(d => ({ ...d, data_entrega_prevista: e.target.value }))} style={inp} /></label>
              <BtnPrimary onClick={salvarDatas}>Salvar datas</BtnPrimary>
            </div>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TIPOS.map(([t, l]) => { const p = daProva(t) || {}; return (
              <Card key={t}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><h3 style={{ fontWeight: 700 }}>{l}</h3>{p.id && <Badge label={p.status || 'pendente'} color={p.status === 'realizada' ? '#22c55e' : p.status === 'agendada' ? '#f59e0b' : '#6b7280'} />}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                  <label style={{ gridColumn: 'span 2' }}><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 }}>Data e hora</div><input type="datetime-local" value={paraInput(p.data_agendada)} onChange={e => mudar(t, { data_agendada: e.target.value, status: p.status === 'realizada' ? 'realizada' : 'agendada' })} style={inp} /></label>
                  <label><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 }}>Situação</div><select value={p.status || 'pendente'} onChange={e => mudar(t, { status: e.target.value })} style={inp}><option value="pendente">Pendente</option><option value="agendada">Agendada</option><option value="realizada">Realizada</option></select></label>
                  <label><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 }}>Resultado</div><select value={p.aprovado || ''} onChange={e => mudar(t, { aprovado: e.target.value })} style={inp}><option value="">—</option><option value="sim">Aprovado</option><option value="parcial">Aprovado c/ ajustes</option><option value="nao">Refazer</option></select></label>
                </div>
                <Campo label="Ajustes a fazer" type="textarea" rows={3} value={p.ajustes || ''} onChange={v => mudar(t, { ajustes: v })} />
                <Campo label="Anotações da costureira / ateliê" type="textarea" rows={2} value={p.notas_costureira || ''} onChange={v => mudar(t, { notas_costureira: v })} />
                <BtnSecondary small onClick={() => salvarProva(t)}>Salvar {l}</BtnSecondary>
              </Card>); })}
          </div>
          <div style={{ marginTop: 20 }}><Arquivos osId={osId} clienteId={osSel.cliente_id} categorias={['prova']} titulo="Fotos das provas e material de marketing" ajuda="Fotos de cada prova e do look pronto. Ficam na OS e na ficha da cliente." /></div>
        </>
      )}
    </div>
  );
}
