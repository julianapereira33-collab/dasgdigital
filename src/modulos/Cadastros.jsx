import { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { Badge, Card, BtnPrimary, BtnSecondary, BtnDanger, TabBar, Aviso, erroDeSchema } from './ui.jsx';

// Cadastros de apoio: departamentos (agendas de tarefas) e colaboradores (quem executa as etapas da OS).
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);
const inp = { padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' };
const msg = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261111000007 no Supabase. ' + e.message : e.message;

export default function Cadastros({ departamentos, colaboradores, onRecarregar }) {
  const [aba, setAba] = useState('colaboradores');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [dep, setDep] = useState({ nome: '', cor: '#6b7280' });
  const [col, setCol] = useState({ nome: '', departamento: '', funcao: '', telefone: '', valor_hora: '' });
  const [edit, setEdit] = useState({}); // alterações pendentes por id

  const ok = async (p, texto) => { const { error } = await p; if (error) { setErro(msg(error)); return false; } setErro(''); setAviso(texto); await onRecarregar(); return true; };
  const patch = (id, v) => setEdit(e => ({ ...e, [id]: { ...(e[id] || {}), ...v } }));
  const val = (r, k) => (edit[r.id || r.chave] || {})[k] ?? r[k] ?? '';

  async function novoDep() {
    if (!dep.nome.trim()) return;
    let chave = slug(dep.nome); if (departamentos.some(d => d.chave === chave)) chave += '_2';
    if (await ok(supabase.from('departamentos').insert({ chave, nome: dep.nome.trim(), curto: dep.nome.trim(), cor: dep.cor, ordem: 100 + departamentos.length }), 'Departamento cadastrado. Já aparece nas Tarefas, na Agenda e na OS.')) setDep({ nome: '', cor: '#6b7280' });
  }
  async function salvarDep(d) {
    const e = edit[d.chave]; if (!e) return;
    if (await ok(supabase.from('departamentos').update({ nome: e.nome ?? d.nome, curto: e.nome ?? d.curto, cor: e.cor ?? d.cor, ativo: e.ativo ?? d.ativo }).eq('chave', d.chave), 'Departamento salvo.')) setEdit(x => { const n = { ...x }; delete n[d.chave]; return n; });
  }
  async function excluirDep(d) { if (window.confirm(`Excluir o departamento "${d.nome}"? Tarefas que já usam esse departamento passam a aparecer em ADM.`)) await ok(supabase.from('departamentos').delete().eq('chave', d.chave), 'Departamento excluído.'); }

  async function novoCol() {
    if (!col.nome.trim()) return;
    const v = Number(String(col.valor_hora).replace(',', '.')) || null;
    if (await ok(supabase.from('colaboradores').insert({ nome: col.nome.trim(), departamento: col.departamento || null, funcao: col.funcao || null, telefone: col.telefone || null, valor_hora: v }), 'Colaborador cadastrado. Já aparece como sugestão em "Quem vai executar" na OS.')) setCol({ nome: '', departamento: '', funcao: '', telefone: '', valor_hora: '' });
  }
  async function salvarCol(c) {
    const e = edit[c.id]; if (!e) return;
    const v = e.valor_hora !== undefined ? (Number(String(e.valor_hora).replace(',', '.')) || null) : c.valor_hora;
    if (await ok(supabase.from('colaboradores').update({ nome: e.nome ?? c.nome, departamento: (e.departamento ?? c.departamento) || null, funcao: e.funcao ?? c.funcao, telefone: e.telefone ?? c.telefone, valor_hora: v, ativo: e.ativo ?? c.ativo }).eq('id', c.id), 'Colaborador salvo.')) setEdit(x => { const n = { ...x }; delete n[c.id]; return n; });
  }
  async function excluirCol(c) { if (window.confirm(`Excluir ${c.nome}? Os lançamentos de tempo já feitos continuam com o nome.`)) await ok(supabase.from('colaboradores').delete().eq('id', c.id), 'Colaborador excluído.'); }

  const depOpts = departamentos.filter(d => d.ativo !== false);
  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>Cadastros</h1><p style={{ color: '#6b7280', marginTop: 4 }}>Departamentos e colaboradores usados nas tarefas, na agenda e nas etapas da OS</p></div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}{aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      <TabBar active={aba} onChange={setAba} tabs={[{ id: 'colaboradores', label: 'Colaboradores', count: colaboradores.filter(c => c.ativo !== false).length }, { id: 'departamentos', label: 'Departamentos', count: depOpts.length }]} />

      {aba === 'colaboradores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Card><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Novo colaborador</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input placeholder="Nome" value={col.nome} onChange={e => setCol(c => ({ ...c, nome: e.target.value }))} style={{ ...inp, flex: 1, minWidth: 160 }} />
              <select value={col.departamento} onChange={e => setCol(c => ({ ...c, departamento: e.target.value }))} style={inp}><option value="">Departamento...</option>{depOpts.map(d => <option key={d.chave} value={d.chave}>{d.nome}</option>)}</select>
              <input placeholder="Função (costureira, modelista...)" value={col.funcao} onChange={e => setCol(c => ({ ...c, funcao: e.target.value }))} style={inp} />
              <input placeholder="Telefone" value={col.telefone} onChange={e => setCol(c => ({ ...c, telefone: e.target.value }))} style={{ ...inp, width: 130 }} />
              <input placeholder="Valor/hora" value={col.valor_hora} onChange={e => setCol(c => ({ ...c, valor_hora: e.target.value }))} style={{ ...inp, width: 90 }} />
              <BtnPrimary onClick={novoCol} disabled={!col.nome.trim()}>Cadastrar</BtnPrimary>
            </div></Card>
          {colaboradores.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhum colaborador cadastrado.</Card>}
          {colaboradores.map(c => (
            <Card key={c.id} style={{ padding: 12, opacity: val(c, 'ativo') === false ? .55 : 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={val(c, 'nome')} onChange={e => patch(c.id, { nome: e.target.value })} style={{ ...inp, flex: 1, minWidth: 150, fontWeight: 600 }} />
                <select value={val(c, 'departamento')} onChange={e => patch(c.id, { departamento: e.target.value })} style={inp}><option value="">Sem departamento</option>{depOpts.map(d => <option key={d.chave} value={d.chave}>{d.nome}</option>)}</select>
                <input placeholder="Função" value={val(c, 'funcao')} onChange={e => patch(c.id, { funcao: e.target.value })} style={{ ...inp, width: 150 }} />
                <input placeholder="Telefone" value={val(c, 'telefone')} onChange={e => patch(c.id, { telefone: e.target.value })} style={{ ...inp, width: 125 }} />
                <input placeholder="Valor/hora" value={val(c, 'valor_hora')} onChange={e => patch(c.id, { valor_hora: e.target.value })} style={{ ...inp, width: 85 }} />
                <label style={{ fontSize: 12 }}><input type="checkbox" checked={val(c, 'ativo') !== false} onChange={e => patch(c.id, { ativo: e.target.checked })} /> ativo</label>
                {edit[c.id] && <BtnPrimary small onClick={() => salvarCol(c)}>Salvar</BtnPrimary>}
                <BtnDanger small onClick={() => excluirCol(c)}>Excluir</BtnDanger>
              </div>
            </Card>
          ))}
        </div>
      )}

      {aba === 'departamentos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Card><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Novo departamento</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Nome (ex.: Loja, Logística)" value={dep.nome} onChange={e => setDep(d => ({ ...d, nome: e.target.value }))} style={{ ...inp, flex: 1, minWidth: 200 }} />
              <input type="color" value={dep.cor} onChange={e => setDep(d => ({ ...d, cor: e.target.value }))} title="Cor" style={{ width: 40, height: 34, border: 'none', background: 'none' }} />
              <BtnPrimary onClick={novoDep} disabled={!dep.nome.trim()}>Cadastrar</BtnPrimary>
            </div></Card>
          {departamentos.map(d => (
            <Card key={d.chave} style={{ padding: 12, borderLeft: `4px solid ${val(d, 'cor') || '#999'}`, opacity: val(d, 'ativo') === false ? .55 : 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={val(d, 'nome')} onChange={e => patch(d.chave, { nome: e.target.value })} style={{ ...inp, flex: 1, minWidth: 180, fontWeight: 600 }} />
                <input type="color" value={val(d, 'cor') || '#6b7280'} onChange={e => patch(d.chave, { cor: e.target.value })} style={{ width: 40, height: 34, border: 'none', background: 'none' }} />
                <label style={{ fontSize: 12 }}><input type="checkbox" checked={val(d, 'ativo') !== false} onChange={e => patch(d.chave, { ativo: e.target.checked })} /> ativo</label>
                {d.base && <Badge label="padrão do sistema" color="#6b7280" />}
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{colaboradores.filter(c => c.departamento === d.chave).length} colaborador(es)</span>
                {edit[d.chave] && <BtnPrimary small onClick={() => salvarDep(d)}>Salvar</BtnPrimary>}
                {!d.base && <BtnDanger small onClick={() => excluirDep(d)}>Excluir</BtnDanger>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
