import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { Card, BtnPrimary, BtnSecondary, BtnDanger, Aviso, Badge, erroDeSchema } from './ui.jsx';

// Lista de compras / pesquisa de material da OS, com até 3 cotações por item.
// A mesma lista alimenta a planilha de formação de preço do Orçamento.

export const TIPOS_MATERIAL = { tecido: 'Tecido', forro: 'Forro', aviamento: 'Aviamento', enchimento: 'Enchimento / entretela', outro: 'Outro' };
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v) => (v === '' || v == null ? null : Number(v));

// valor unitário usado no cálculo: a cotação escolhida; se não houver, a menor cotação preenchida
export function valorUnitario(m) {
  const cots = [m.cot1_valor, m.cot2_valor, m.cot3_valor];
  if (m.escolhida && cots[m.escolhida - 1] != null) return Number(cots[m.escolhida - 1]);
  const preenchidas = cots.filter(v => v != null && v !== '').map(Number);
  return preenchidas.length ? Math.min(...preenchidas) : 0;
}
export const custoMaterial = (m) => Number(m.metragem || 0) * valorUnitario(m);
export const fornecedorEscolhido = (m) => {
  const i = m.escolhida || [m.cot1_valor, m.cot2_valor, m.cot3_valor].map((v, k) => [v, k + 1]).filter(([v]) => v != null && v !== '').sort((a, b) => a[0] - b[0])[0]?.[1];
  return i ? m['cot' + i + '_fornecedor'] : null;
};

export default function MateriaisOS({ osId, onMudou }) {
  const [rows, setRows] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!osId) { setRows([]); return; }
    const { data, error } = await supabase.from('os_materiais').select('*').eq('ordem_servico_id', osId).order('created_at', { ascending: true });
    if (error) { setErro(erroDeSchema(error) ? 'Falta aplicar a migração 20261104000000 no Supabase. ' + error.message : error.message); return; }
    setRows(data || []);
  }, [osId]);
  useEffect(() => { setErro(''); carregar(); }, [carregar]);

  const mudar = (id, patch) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  async function persistir(id, patchExtra) {
    const r = { ...rows.find(x => x.id === id), ...(patchExtra || {}) };
    const { error } = await supabase.from('os_materiais').update({
      tipo: r.tipo, descricao: r.descricao, metragem: Number(r.metragem) || 0, unidade: r.unidade,
      cot1_fornecedor: r.cot1_fornecedor || null, cot1_valor: num(r.cot1_valor), cot2_fornecedor: r.cot2_fornecedor || null, cot2_valor: num(r.cot2_valor),
      cot3_fornecedor: r.cot3_fornecedor || null, cot3_valor: num(r.cot3_valor), escolhida: r.escolhida || null, observacoes: r.observacoes || null, comprado: !!r.comprado,
    }).eq('id', id);
    if (error) setErro(error.message); else onMudou && onMudou();
  }
  async function adicionar() {
    setSalvando(true);
    const { data, error } = await supabase.from('os_materiais').insert({ ordem_servico_id: osId, descricao: 'Novo material' }).select().single();
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setRows(rs => [...rs, data]); onMudou && onMudou();
  }
  async function remover(id) {
    if (!window.confirm('Remover este material?')) return;
    const { error } = await supabase.from('os_materiais').delete().eq('id', id);
    if (error) { setErro(error.message); return; }
    setRows(rs => rs.filter(r => r.id !== id)); onMudou && onMudou();
  }

  if (!osId) return <Card style={{ color: '#9ca3af', textAlign: 'center' }}>Escolha uma OS.</Card>;
  const total = rows.reduce((s, r) => s + custoMaterial(r), 0);
  const inp = { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };

  return (
    <div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Anote o que precisa comprar ou pesquisar. Use até 3 cotações por item e marque a escolhida; sem escolha, o sistema usa a mais barata. O total vai direto para a planilha de preço do orçamento.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(r => (
          <Card key={r.id} style={{ padding: 14, opacity: r.comprado ? 0.75 : 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 70px', gap: 8, marginBottom: 8 }}>
              <select value={r.tipo} onChange={e => { mudar(r.id, { tipo: e.target.value }); persistir(r.id, { tipo: e.target.value }); }} style={inp}>{Object.entries(TIPOS_MATERIAL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <input value={r.descricao || ''} onChange={e => mudar(r.id, { descricao: e.target.value })} onBlur={() => persistir(r.id)} placeholder="Descrição (ex.: crepe georgette dourado)" style={inp} />
              <input type="number" step="0.01" value={r.metragem ?? ''} onChange={e => mudar(r.id, { metragem: e.target.value })} onBlur={() => persistir(r.id)} placeholder="Qtd" style={inp} />
              <input value={r.unidade || ''} onChange={e => mudar(r.id, { unidade: e.target.value })} onBlur={() => persistir(r.id)} placeholder="m / un" style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ border: `2px solid ${r.escolhida === i ? '#22c55e' : '#e5e7eb'}`, borderRadius: 8, padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>COTAÇÃO {i}</span>
                    <label style={{ fontSize: 11, cursor: 'pointer' }}><input type="radio" checked={r.escolhida === i} onChange={() => { mudar(r.id, { escolhida: i }); persistir(r.id, { escolhida: i }); }} /> escolhida</label>
                  </div>
                  <input value={r['cot' + i + '_fornecedor'] || ''} onChange={e => mudar(r.id, { ['cot' + i + '_fornecedor']: e.target.value })} onBlur={() => persistir(r.id)} placeholder="Fornecedor" style={{ ...inp, marginBottom: 4 }} />
                  <input type="number" step="0.01" value={r['cot' + i + '_valor'] ?? ''} onChange={e => mudar(r.id, { ['cot' + i + '_valor']: e.target.value })} onBlur={() => persistir(r.id)} placeholder="Valor por unidade (R$)" style={inp} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <input value={r.observacoes || ''} onChange={e => mudar(r.id, { observacoes: e.target.value })} onBlur={() => persistir(r.id)} placeholder="Observações (cor, largura, onde achar...)" style={{ ...inp, flex: 1, minWidth: 180 }} />
              <label style={{ fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={!!r.comprado} onChange={e => { mudar(r.id, { comprado: e.target.checked }); persistir(r.id, { comprado: e.target.checked }); }} /> comprado</label>
              <Badge label={`${brl(valorUnitario(r))} × ${r.metragem || 0} = ${brl(custoMaterial(r))}`} color="#c4a45a" />
              <BtnDanger small onClick={() => remover(r.id)}>Remover</BtnDanger>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum material ainda.</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <BtnSecondary onClick={adicionar} disabled={salvando}>Adicionar material</BtnSecondary>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Total de materiais: {brl(total)}</div>
      </div>
    </div>
  );
}
