import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { Badge, Card, BtnPrimary, BtnSecondary, BtnDanger, Aviso, fmtDate, erroDeSchema } from './ui.jsx';

// Pedidos de venda da loja: sutiã, cinta, locação de roupa/sapato/acessório, flores. Sempre ligados à ficha da cliente.
export const TIPOS_ITEM = { peca_pronta: 'Peça pronta', sutia: 'Sutiã', cinta: 'Cinta', locacao_roupa: 'Locação de roupa', sapato: 'Sapato', acessorio: 'Acessório', flores: 'Flores', outro: 'Outro' };
const STATUS = { aberto: '#f59e0b', pago: '#16a34a', entregue: '#0ea5e9', devolvido: '#6b7280', cancelado: '#ef4444' };
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261104000000. ' + e.message : (e.message || String(e));
const totalItens = (its) => its.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unit || 0), 0);

// clienteId fixo = usado dentro da ficha da cliente; sem clienteId = tela geral
export default function PedidosVenda({ clientes, os, clienteId, produtos = [], abrirTick = 0, onRecarregar }) {
  const [pedidos, setPedidos] = useState([]);
  const [itens, setItens] = useState({});
  const [novo, setNovo] = useState(null);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const carregar = useCallback(async () => {
    let q = supabase.from('pedidos_venda').select('*').order('created_at', { ascending: false });
    if (clienteId) q = q.eq('cliente_id', clienteId);
    const { data, error } = await q;
    if (error) { setErro(msgErro(error)); return; }
    setPedidos(data || []);
    const ids = (data || []).map(p => p.id);
    if (ids.length) {
      const { data: its } = await supabase.from('pedidos_venda_itens').select('*').in('pedido_id', ids);
      const m = {}; (its || []).forEach(i => { (m[i.pedido_id] = m[i.pedido_id] || []).push(i); }); setItens(m);
    } else setItens({});
  }, [clienteId]);
  useEffect(() => { carregar(); }, [carregar]);

  const ITEM_VAZIO = { tipo: 'peca_pronta', modalidade: 'venda', produto_id: '', descricao: '', quantidade: 1, valor_unit: '', retirada: '', devolucao: '' };
  const abrir = () => setNovo({ cliente_id: clienteId || '', ordem_servico_id: '', forma_pagamento: '', entrega_em: '', desconto: 0, observacoes: '', itens: [{ ...ITEM_VAZIO }] });
  useEffect(() => { if (abrirTick > 0) abrir(); }, [abrirTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const escolherProduto = (i, id) => {
    const pr = produtos.find(x => x.id === id);
    if (!pr) { setItem(i, { produto_id: '' }); return; }
    setNovo(n => ({ ...n, itens: n.itens.map((x, k) => k !== i ? x : { ...x, produto_id: id, descricao: [pr.codigo, pr.nome].filter(Boolean).join(' — '), valor_unit: x.modalidade === 'locacao' ? (pr.preco_locacao ?? pr.preco_venda ?? '') : (pr.preco_venda ?? ''), tipo: x.tipo === 'peca_pronta' ? 'peca_pronta' : x.tipo }) }));
  };
  const setItem = (i, patch) => setNovo(n => ({ ...n, itens: n.itens.map((x, k) => k === i ? { ...x, ...patch } : x) }));

  async function salvar() {
    setErro('');
    if (!novo.cliente_id) { setErro('Escolha a cliente.'); return; }
    const validos = novo.itens.filter(i => i.descricao.trim());
    if (!validos.length) { setErro('Inclua ao menos um item com descrição.'); return; }
    const total = Math.max(0, totalItens(validos) - Number(novo.desconto || 0));
    const numero = 'PV-' + String(pedidos.length + 1).padStart(4, '0');
    const { data, error } = await supabase.from('pedidos_venda').insert({ numero, cliente_id: novo.cliente_id, ordem_servico_id: novo.ordem_servico_id || null, forma_pagamento: novo.forma_pagamento || null, entrega_em: novo.entrega_em || null, desconto: Number(novo.desconto || 0), total, observacoes: novo.observacoes || null }).select().single();
    if (error) { setErro(msgErro(error)); return; }
    const { error: e2 } = await supabase.from('pedidos_venda_itens').insert(validos.map(i => ({ pedido_id: data.id, tipo: i.tipo, modalidade: i.modalidade || 'venda', produto_id: i.produto_id || null, descricao: i.descricao, quantidade: Number(i.quantidade) || 1, valor_unit: Number(i.valor_unit) || 0, retirada: i.retirada || null, devolucao: i.devolucao || null })));
    if (e2) { setErro(msgErro(e2)); return; }
    setNovo(null); carregar(); onRecarregar && onRecarregar();
  }
  async function status(p, s) {
    const { error } = await supabase.from('pedidos_venda').update({ status: s }).eq('id', p.id);
    if (error) { setErro(msgErro(error)); return; }
    if (s === 'pago' && p.total > 0) await supabase.from('financeiro_receber').insert({ cliente_id: p.cliente_id, ordem_servico_id: p.ordem_servico_id, pedido_venda_id: p.id, descricao: 'Pedido de venda ' + p.numero, valor: p.total, status: 'pago', pago_em: new Date().toISOString(), valor_pago: p.total, data_vencimento: new Date().toISOString().slice(0, 10), forma: p.forma_pagamento });
    carregar();
  }
  async function remover(p) { if (!window.confirm('Excluir o pedido ' + p.numero + '?')) return; await supabase.from('pedidos_venda').delete().eq('id', p.id); carregar(); }

  const inp = { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
  const lista = pedidos.filter(p => filtro === 'todos' || p.status === filtro);
  const osDaCliente = (id) => os.filter(o => o.cliente_id === id);

  return (
    <div>
      {!clienteId && <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>Pedidos de Venda</h1><p style={{ color: '#6b7280', marginTop: 4 }}>Sutiã, cinta, locação de roupa, sapatos, acessórios e flores — tudo ligado à ficha da cliente</p></div>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <BtnPrimary onClick={abrir}>Novo pedido</BtnPrimary>
        {['todos', ...Object.keys(STATUS)].map(s => <button key={s} onClick={() => setFiltro(s)} style={{ border: '1px solid #d1d5db', borderRadius: 16, padding: '4px 12px', background: filtro === s ? '#111' : '#fff', color: filtro === s ? '#c4a45a' : '#374151', fontSize: 12, cursor: 'pointer' }}>{s}</button>)}
      </div>
      {novo && (
        <Card style={{ marginBottom: 16, background: '#fffdf7' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 10 }}>Novo pedido de venda</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            {!clienteId && <select value={novo.cliente_id} onChange={e => setNovo(n => ({ ...n, cliente_id: e.target.value, ordem_servico_id: '' }))} style={inp}><option value="">Cliente...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>}
            <select value={novo.ordem_servico_id} onChange={e => setNovo(n => ({ ...n, ordem_servico_id: e.target.value }))} style={inp}><option value="">Sem OS vinculada</option>{osDaCliente(novo.cliente_id).map(o => <option key={o.id} value={o.id}>{o.numero}</option>)}</select>
            <input placeholder="Forma de pagamento" value={novo.forma_pagamento} onChange={e => setNovo(n => ({ ...n, forma_pagamento: e.target.value }))} style={inp} />
            <label style={{ fontSize: 11, color: '#6b7280' }}>Entrega / retirada em<input type="date" value={novo.entrega_em} onChange={e => setNovo(n => ({ ...n, entrega_em: e.target.value }))} style={inp} /></label>
            <input placeholder="Observações" value={novo.observacoes} onChange={e => setNovo(n => ({ ...n, observacoes: e.target.value }))} style={{ ...inp, gridColumn: 'span 2', alignSelf: 'end' }} />
          </div>
          {novo.itens.map((it, i) => {
            const loc = it.modalidade === 'locacao';
            const doTipo = produtos.filter(pr => loc ? pr.modalidade !== 'venda' : pr.modalidade !== 'locacao');
            return (
              <div key={i} style={{ border: '1px solid #f3f4f6', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 130px 1fr 30px', gap: 6, marginBottom: 6 }}>
                  <select value={it.modalidade} onChange={e => setItem(i, { modalidade: e.target.value, produto_id: '' })} style={inp}><option value="venda">Venda</option><option value="locacao">Locação</option></select>
                  <select value={it.tipo} onChange={e => setItem(i, { tipo: e.target.value })} style={inp}>{Object.entries(TIPOS_ITEM).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <select value={it.produto_id} onChange={e => escolherProduto(i, e.target.value)} style={inp}><option value="">Produto do cadastro (opcional)...</option>{doTipo.map(pr => <option key={pr.id} value={pr.id}>{[pr.codigo, pr.nome].filter(Boolean).join(' — ')}</option>)}</select>
                  <button onClick={() => setNovo(n => ({ ...n, itens: n.itens.filter((_, k) => k !== i) }))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 140px 140px', gap: 6 }}>
                  <input placeholder="Descrição (modelo, tamanho, cor)" value={it.descricao} onChange={e => setItem(i, { descricao: e.target.value })} style={inp} />
                  <input type="number" title="Quantidade" value={it.quantidade} onChange={e => setItem(i, { quantidade: e.target.value })} style={inp} />
                  <input type="number" step="0.01" placeholder={loc ? 'R$ locação' : 'R$ unit.'} value={it.valor_unit} onChange={e => setItem(i, { valor_unit: e.target.value })} style={inp} />
                  <input type="date" title="Retirada" disabled={!loc} value={it.retirada} onChange={e => setItem(i, { retirada: e.target.value })} style={inp} />
                  <input type="date" title="Devolução" disabled={!loc} value={it.devolucao} onChange={e => setItem(i, { devolucao: e.target.value })} style={inp} />
                </div>
              </div>);
          })}
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>Datas de retirada e devolução valem para itens de locação.</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <BtnSecondary small onClick={() => setNovo(n => ({ ...n, itens: [...n.itens, { ...ITEM_VAZIO }] }))}>+ Item</BtnSecondary>
            <input type="number" placeholder="Desconto R$" value={novo.desconto} onChange={e => setNovo(n => ({ ...n, desconto: e.target.value }))} style={{ ...inp, width: 120 }} />
            <strong style={{ marginLeft: 'auto' }}>Total: {brl(Math.max(0, totalItens(novo.itens) - Number(novo.desconto || 0)))}</strong>
            <BtnPrimary onClick={salvar}>Salvar pedido</BtnPrimary><BtnSecondary onClick={() => setNovo(null)}>Cancelar</BtnSecondary>
          </div>
        </Card>
      )}
      {lista.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum pedido.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lista.map(p => (
          <Card key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <div><strong>{p.numero}</strong>{p.orcamento_id ? <> <Badge label="do orçamento" color="#8b5cf6" /></> : null}{!clienteId && <> · {clientes.find(c => c.id === p.cliente_id)?.nome}</>} <span style={{ color: '#9ca3af', fontSize: 12 }}>{fmtDate(p.created_at)}</span></div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><strong>{brl(p.total)}</strong><Badge label={p.status} color={STATUS[p.status]} /></div>
            </div>
            {(itens[p.id] || []).map(i => <div key={i.id} style={{ fontSize: 13, color: '#374151' }}>• {i.modalidade === 'locacao' ? '[Locação] ' : ''}{TIPOS_ITEM[i.tipo] || i.tipo}: {i.descricao} × {i.quantidade} — {brl(i.valor_unit)}{i.retirada ? ` · retira ${fmtDate(i.retirada)}` : ''}{i.devolucao ? ` · devolve ${fmtDate(i.devolucao)}` : ''}</div>)}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {p.status === 'aberto' && <BtnSecondary small onClick={() => status(p, 'pago')}>Marcar pago</BtnSecondary>}
              {(p.status === 'aberto' || p.status === 'pago') && <BtnSecondary small onClick={() => status(p, 'entregue')}>Entregue / retirado</BtnSecondary>}
              {p.status === 'entregue' && (itens[p.id] || []).some(i => i.devolucao) && <BtnSecondary small onClick={() => status(p, 'devolvido')}>Devolvido</BtnSecondary>}
              {p.status !== 'cancelado' && <BtnSecondary small onClick={() => status(p, 'cancelado')}>Cancelar</BtnSecondary>}
              <BtnDanger small onClick={() => remover(p)}>Excluir</BtnDanger>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
