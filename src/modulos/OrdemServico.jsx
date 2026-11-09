import { TOTAL_ETAPAS } from '../lib/etapas.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { criarAtividadeDaEtapa, ROTULO_ETAPA, SLUGS_ETAPA } from '../lib/api.js';
import { FASES_ATELIE, ROTULO_FASE, gerarEtapasAtelie } from '../lib/producao.js';
import Arquivos from './Arquivos.jsx';
import { Badge, Card, BtnPrimary, BtnSecondary, TabBar, Aviso, fmtDate, erroDeSchema } from './ui.jsx';

// Ordem de Serviço: acompanha toda a confecção, do pedido à entrega, com as etapas de um ateliê.
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261105000001 no Supabase. ' + e.message : (e.message || String(e));
const COR = { pendente: '#9ca3af', andamento: '#f59e0b', concluida: '#16a34a' };

export default function OrdemServico({ os, clientes, osFocoId, onRecarregar, onNavegar }) {
  const [osId, setOsId] = useState(osFocoId || '');
  const [aba, setAba] = useState('producao');
  const [tarefas, setTarefas] = useState([]);
  const [resumo, setResumo] = useState({ materiais: [], orc: null, provas: [], fin: [], arquivos: 0 });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [novaTarefa, setNovaTarefa] = useState({});

  useEffect(() => { if (osFocoId) setOsId(osFocoId); }, [osFocoId]);
  const osSel = os.find(o => o.id === osId) || null;
  const cli = osSel ? clientes.find(c => c.id === osSel.cliente_id) : null;
  const ativas = useMemo(() => [...os].sort((a, b) => (a.status_idx >= TOTAL_ETAPAS) - (b.status_idx >= TOTAL_ETAPAS)), [os]);

  const carregar = useCallback(async () => {
    if (!osId) { setTarefas([]); return; }
    const [t, m, o, p, f, a] = await Promise.all([
      supabase.from('os_producao').select('*').eq('ordem_servico_id', osId).order('ordem'),
      supabase.from('os_materiais').select('comprado').eq('ordem_servico_id', osId),
      supabase.from('orcamentos').select('*').eq('ordem_servico_id', osId).order('created_at', { ascending: false }),
      supabase.from('provas').select('tipo,status,aprovado').eq('ordem_servico_id', osId),
      supabase.from('financeiro_receber').select('valor,status').eq('ordem_servico_id', osId),
      supabase.from('os_arquivos').select('id', { count: 'exact', head: true }).eq('ordem_servico_id', osId),
    ]);
    const e = t.error; if (e) { setErro(msgErro(e)); return; }
    setTarefas(t.data || []);
    setResumo({ materiais: m.data || [], orc: (o.data || []).find(x => x.aprovado_em) || (o.data || [])[0] || null, provas: p.data || [], fin: f.data || [], arquivos: a.count || 0 });
  }, [osId]);
  useEffect(() => { setErro(''); setAviso(''); carregar(); }, [carregar]);

  async function gerar() {
    const r = await gerarEtapasAtelie(osId);
    if (r.error) { setErro(msgErro(r.error)); return; }
    carregar();
  }
  const mudar = (id, patch) => setTarefas(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  async function salvar(id, patch) {
    const { error } = await supabase.from('os_producao').update(patch).eq('id', id);
    if (error) setErro(msgErro(error));
  }
  async function marcar(t, status) {
    const patch = { status, concluida_em: status === 'concluida' ? new Date().toISOString() : null };
    mudar(t.id, patch); await salvar(t.id, patch);
    // se a fase inteira foi concluída, a OS avança para a etapa seguinte do Fluxo
    const daFase = tarefas.map(x => x.id === t.id ? { ...x, status } : x).filter(x => x.fase === t.fase);
    if (status === 'concluida' && daFase.every(x => x.status === 'concluida')) {
      const idx = SLUGS_ETAPA.indexOf(t.fase), atual = SLUGS_ETAPA.indexOf(osSel.status);
      const prox = SLUGS_ETAPA[idx + 1];
      if (idx >= 0 && prox && atual <= idx) {
        await supabase.from('ordens_servico').update({ status: prox }).eq('id', osId);
        await criarAtividadeDaEtapa({ os: osSel, cliente: cli, slug: prox });
        await onRecarregar();
        setAviso(`Fase "${ROTULO_FASE[t.fase]}" concluída. A OS avançou para "${ROTULO_ETAPA[prox]}".`);
      }
    }
  }
  async function mudarEtapa(slug) {
    if (!slug || slug === osSel.status) return;
    const { error } = await supabase.from('ordens_servico').update({ status: slug }).eq('id', osId);
    if (error) { setErro(msgErro(error)); return; }
    await criarAtividadeDaEtapa({ os: osSel, cliente: cli, slug });
    await onRecarregar();
    setAviso(`Etapa alterada para "${ROTULO_ETAPA[slug]}". O Fluxo de Atendimento já mostra a mudança.`);
  }
  async function adicionar(fase) {
    const titulo = (novaTarefa[fase] || '').trim(); if (!titulo) return;
    const ordem = Math.max(0, ...tarefas.filter(t => t.fase === fase).map(t => t.ordem)) + 0.5;
    const { data, error } = await supabase.from('os_producao').insert({ ordem_servico_id: osId, fase, titulo, ordem, responsavel: 'Oficina' }).select().single();
    if (error) { setErro(msgErro(error)); return; }
    setTarefas(ts => [...ts, data].sort((a, b) => a.ordem - b.ordem)); setNovaTarefa(n => ({ ...n, [fase]: '' }));
  }
  async function remover(id) { await supabase.from('os_producao').delete().eq('id', id); setTarefas(ts => ts.filter(t => t.id !== id)); }

  const feitas = tarefas.filter(t => t.status === 'concluida').length;
  const pct = tarefas.length ? Math.round(feitas / tarefas.length * 100) : 0;
  const pago = resumo.fin.filter(f => f.status === 'pago').reduce((s, f) => s + Number(f.valor || 0), 0);
  const aReceber = resumo.fin.filter(f => f.status !== 'pago').reduce((s, f) => s + Number(f.valor || 0), 0);
  const inp = { padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 12 };
  const link = (rot, pagina) => <button onClick={() => onNavegar(pagina)} style={{ border: 'none', background: 'none', color: '#c4a45a', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>{rot}</button>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>Ordem de Serviço</h1><p style={{ color: '#6b7280', marginTop: 4 }}>Acompanhamento completo da confecção: medidas, modelagem, corte, costura, provas, ajustes e entrega</p></div>
      <select value={osId} onChange={e => { setOsId(e.target.value); setAba('producao'); }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, minWidth: 300, marginBottom: 16 }}>
        <option value="">Escolha a OS...</option>
        {ativas.map(o => <option key={o.id} value={o.id}>{o.numero || 'OS'} — {clientes.find(c => c.id === o.cliente_id)?.nome} ({ROTULO_ETAPA[o.status] || o.status})</option>)}
      </select>
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}{erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!osSel ? <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Escolha uma OS, ou abra uma pela ficha da cliente.</Card> : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{osSel.numero} · {cli?.nome}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{osSel.descricao || osSel.servico || '—'}{osSel.ocasiao ? ' · ' + osSel.ocasiao : ''}</div>
              </div>
              <label style={{ fontSize: 11, color: '#6b7280' }}>Etapa do fluxo<br />
                <select value={osSel.status} onChange={e => mudarEtapa(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #c4a45a', fontSize: 13, fontWeight: 600, minWidth: 220 }}>
                  {SLUGS_ETAPA.map((sl, i) => <option key={sl} value={sl}>{i + 1}. {ROTULO_ETAPA[sl]}</option>)}
                </select></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
              {[['Evento', fmtDate(osSel.data_evento)], ['Tecidos e medidas', fmtDate(osSel.data_tecidos_medidas)], ['Entrega prevista', fmtDate(osSel.data_entrega_prevista)], ['Valor', brl(osSel.valor_total)], ['Recebido', brl(pago)], ['A receber', brl(aReceber)]].map(([k, v]) => <div key={k} style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>{k}</div><div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div></div>)}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}><span>Produção</span><span>{feitas}/{tarefas.length} tarefas · {pct}%</span></div>
              <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: '#c4a45a' }} /></div>
            </div>
          </Card>
          <TabBar active={aba} onChange={setAba} tabs={[{ id: 'producao', label: 'Etapas da oficina' }, { id: 'resumo', label: 'Resumo do pedido' }, { id: 'arquivos', label: 'Arquivos da OS' }]} />

          {aba === 'producao' && (
            <div>
              {tarefas.length === 0 && <Card style={{ textAlign: 'center', padding: 30 }}><p style={{ color: '#6b7280', marginBottom: 12 }}>Esta OS ainda não tem as etapas de produção.</p><BtnPrimary onClick={gerar}>Gerar etapas padrão do ateliê</BtnPrimary></Card>}
              {FASES_ATELIE.map(([fase, rotulo]) => {
                const ts = tarefas.filter(t => t.fase === fase); if (!ts.length) return null;
                const ok = ts.every(t => t.status === 'concluida');
                const atual = osSel.status === fase;
                return (
                  <Card key={fase} style={{ marginBottom: 12, borderLeft: `4px solid ${ok ? '#16a34a' : atual ? '#c4a45a' : '#e5e7eb'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><h3 style={{ fontWeight: 700, fontSize: 15 }}>{rotulo}</h3>{ok ? <Badge label="Concluída" color="#16a34a" /> : atual ? <Badge label="Etapa atual" color="#c4a45a" /> : null}</div>
                    {ts.map(t => (
                      <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 110px 130px 28px', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <input type="checkbox" checked={t.status === 'concluida'} onChange={e => marcar(t, e.target.checked ? 'concluida' : 'pendente')} />
                        <div><div style={{ fontSize: 13, textDecoration: t.status === 'concluida' ? 'line-through' : 'none', color: t.status === 'concluida' ? '#9ca3af' : '#111' }}>{t.titulo}</div>
                          <input placeholder="Anotações" value={t.notas || ''} onChange={e => mudar(t.id, { notas: e.target.value })} onBlur={() => salvar(t.id, { notas: t.notas || null })} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginTop: 3 }} /></div>
                        <input placeholder="Quem" value={t.responsavel || ''} onChange={e => mudar(t.id, { responsavel: e.target.value })} onBlur={() => salvar(t.id, { responsavel: t.responsavel || null })} style={inp} />
                        <input type="date" value={t.prazo || ''} onChange={e => { mudar(t.id, { prazo: e.target.value }); salvar(t.id, { prazo: e.target.value || null }); }} style={inp} />
                        <button title="Em andamento" onClick={() => marcar(t, t.status === 'andamento' ? 'pendente' : 'andamento')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: COR[t.status] }}>●</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <input placeholder="Nova tarefa nesta etapa..." value={novaTarefa[fase] || ''} onChange={e => setNovaTarefa(n => ({ ...n, [fase]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && adicionar(fase)} style={{ ...inp, flex: 1 }} />
                      <BtnSecondary small onClick={() => adicionar(fase)}>Adicionar</BtnSecondary>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {aba === 'resumo' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Atendimento e criação</h3>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  <div>Quiz, briefing e anotações: {link('abrir Consultoria', 'consultoria')}</div>
                  <div>Dossiê, imagens e ficha técnica: {link('abrir Criação', 'criacao')}</div>
                  <div>Materiais: {resumo.materiais.length} itens · {resumo.materiais.filter(m => m.comprado).length} comprados {link('(Orçamentos)', 'orcamentos')}</div>
                </div></Card>
              <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Orçamento e pagamento</h3>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  <div>Orçamento: {resumo.orc ? `${resumo.orc.numero || ''} · ${brl(resumo.orc.preco_final || resumo.orc.valor)} · ${resumo.orc.aprovado_em ? 'aprovado' : resumo.orc.status || 'rascunho'}` : 'ainda não feito'} {link('abrir', 'orcamentos')}</div>
                  <div>Recebido {brl(pago)} · a receber {brl(aReceber)}</div>
                </div></Card>
              <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Provas e entrega</h3>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  {['prova1', 'prova2', 'prova_final'].map((t, i) => { const p = resumo.provas.find(x => x.tipo === t); return <div key={t}>{i + 1}ª prova: {p ? `${p.status}${p.aprovado ? ' · ' + p.aprovado : ''}` : 'não agendada'}</div>; })}
                  <div>Entrega prevista: {fmtDate(osSel.data_entrega_prevista)} {link('(editar em Provas)', 'provas')}</div>
                </div></Card>
              <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Cliente</h3>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  <div>{cli?.nome} · {cli?.telefone || 'sem telefone'}</div>
                  <div>{resumo.arquivos} arquivo(s) nesta OS</div>
                  <div>{link('Ficha da cliente', 'clientes')}</div>
                </div></Card>
            </div>
          )}

          {aba === 'arquivos' && <Arquivos osId={osId} clienteId={osSel.cliente_id} categorias={Object.keys({ referencia: 1, foto_cliente: 1, croqui: 1, tecido: 1, prova: 1, gravacao_prova: 1, imagem_ia: 1, comprovante: 1, outro: 1 })} titulo="Arquivos desta OS" ajuda="Inspirações, fotos, croquis, gravações das provas, arquivos gerados por IA e comprovantes." />}
        </>
      )}
    </div>
  );
}
