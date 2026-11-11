import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { ROTULO_ETAPA } from '../lib/api.js';
import { ConteudoEtapa, Midia, STATUS_MKT, carregarConteudo, excluirConteudo } from './Conteudo.jsx';
import { Badge, Card, BtnPrimary, BtnSecondary, BtnDanger, Aviso, fmtDateTime, erroDeSchema } from './ui.jsx';

// Central de Marketing: todo o material (fotos, vídeos, gravações) registrado nas etapas de cada OS,
// organizado por OS e por etapa, com o status de edição. Funciona no celular (envio pela câmera ou galeria).
const inp = { padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' };

export default function Marketing({ os, clientes }) {
  const [dados, setDados] = useState({ lista: [], urls: {} });
  const [osId, setOsId] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [edit, setEdit] = useState({});
  const [faseNova, setFaseNova] = useState('marketing');

  const carregar = useCallback(async () => {
    const r = await carregarConteudo({});
    if (r.error) { setErro(erroDeSchema(r.error) ? 'Falta aplicar a migração 20261111000008 no Supabase. ' + r.error.message : r.error.message); return; }
    setDados({ lista: r.lista, urls: r.urls });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeCli = (id) => clientes.find(c => c.id === id)?.nome || '';
  const porOS = useMemo(() => {
    const m = {};
    dados.lista.forEach(a => { (m[a.ordem_servico_id] = m[a.ordem_servico_id] || []).push(a); });
    return m;
  }, [dados.lista]);
  const osComMaterial = os.filter(o => porOS[o.id]);
  const osSel = os.find(o => o.id === osId) || null;
  const itens = (porOS[osId] || []).filter(a => filtro === 'todos' || (a.marketing_status || 'novo') === filtro);
  const fases = [...new Set(itens.map(a => a.fase || 'geral'))];

  async function atualizar(a, patch, texto) {
    const { error } = await supabase.from('os_arquivos').update(patch).eq('id', a.id);
    if (error) { setErro(error.message); return; }
    setEdit(e => { const n = { ...e }; delete n[a.id]; return n; });
    if (texto) setAviso(texto);
    await carregar();
  }
  async function excluir(a) { if (!window.confirm('Excluir este arquivo?')) return; await excluirConteudo(a); await carregar(); }
  const ed = (a, k) => (edit[a.id] || {})[k] ?? a[k] ?? '';
  const setEd = (a, patch) => setEdit(e => ({ ...e, [a.id]: { ...(e[a.id] || {}), ...patch } }));

  const total = dados.lista.length;
  const cont = (st) => dados.lista.filter(a => (a.marketing_status || 'novo') === st).length;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Central de Marketing</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>Todo o material registrado nas etapas de cada OS, pronto para edição. Dá para enviar fotos e vídeos direto do celular.</p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}{aviso && <Aviso tipo="ok">{aviso}</Aviso>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[['Total', total, '#111'], ...Object.entries(STATUS_MKT).map(([k, s]) => [s.label, cont(k), s.cor])].map(([l, v, c]) => (
          <Card key={l} style={{ borderTop: `4px solid ${c}`, padding: 12 }}><div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{l}</div></Card>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <select value={osId} onChange={e => setOsId(e.target.value)} style={{ ...inp, minWidth: 260, padding: '8px 10px' }}>
          <option value="">Escolha a OS...</option>
          {os.map(o => <option key={o.id} value={o.id}>{o.numero || 'OS'} — {nomeCli(o.cliente_id)} {porOS[o.id] ? `(${porOS[o.id].length} arquivo${porOS[o.id].length > 1 ? 's' : ''})` : '(sem material)'}</option>)}
        </select>
        {[['todos', 'Todos'], ...Object.entries(STATUS_MKT).map(([k, s]) => [k, s.label])].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filtro === k ? '#111' : '#f3f4f6', color: filtro === k ? '#fff' : '#374151' }}>{l}</button>
        ))}
      </div>

      {!osSel && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>OS com material registrado</h3>
          {osComMaterial.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>Ainda não há fotos ou vídeos. Abra uma OS e envie pelo bloco "Fotos e gravações desta etapa".</Card>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
            {osComMaterial.map(o => {
              const l = porOS[o.id]; const capa = l.find(a => /\.(png|jpe?g|webp|gif)$/i.test(a.nome));
              return (
                <Card key={o.id} onClick={() => setOsId(o.id)} style={{ cursor: 'pointer', padding: 10 }}>
                  {capa ? <Midia a={capa} url={dados.urls[capa.caminho]} altura={120} /> : <div style={{ height: 120, background: '#f3f4f6', borderRadius: 6, textAlign: 'center', lineHeight: '120px', color: '#9ca3af' }}>{l.length} arquivo(s)</div>}
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{o.numero} · {nomeCli(o.cliente_id)}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{l.length} arquivo(s) · {l.filter(a => ['aprovado', 'publicado'].includes(a.marketing_status)).length} aprovado/publicado</div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {osSel && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{osSel.numero} · {nomeCli(osSel.cliente_id)}</h2>
            <BtnSecondary small onClick={() => setOsId('')}>← Voltar</BtnSecondary>
          </div>
          <Card style={{ marginBottom: 14, background: '#fffdf7' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Enviar material para esta OS na etapa:</span>
              <select value={faseNova} onChange={e => setFaseNova(e.target.value)} style={inp}>{Object.entries(ROTULO_ETAPA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div>
            <ConteudoEtapa osId={osId} clienteId={osSel.cliente_id} fase={faseNova} itens={[]} urls={dados.urls} onMudou={carregar} onErro={setErro} />
          </Card>
          {itens.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhum arquivo neste filtro.</Card>}
          {fases.map(f => (
            <div key={f} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '2px solid #c4a45a', paddingBottom: 4, marginBottom: 10 }}>{ROTULO_ETAPA[f] || 'Geral'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                {itens.filter(a => (a.fase || 'geral') === f).map(a => {
                  const st = STATUS_MKT[a.marketing_status || 'novo'];
                  return (
                    <Card key={a.id} style={{ padding: 10 }}>
                      <Midia a={a} url={dados.urls[a.caminho]} altura={150} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}><Badge label={st.label} color={st.cor} /><span style={{ fontSize: 10, color: '#9ca3af' }}>{fmtDateTime(a.created_at)}</span></div>
                      <select value={a.marketing_status || 'novo'} onChange={e => atualizar(a, { marketing_status: e.target.value })} style={{ ...inp, width: '100%', marginTop: 6 }}>{Object.entries(STATUS_MKT).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>
                      <input value={ed(a, 'legenda')} onChange={e => setEd(a, { legenda: e.target.value })} placeholder="Legenda" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginTop: 6 }} />
                      <input value={ed(a, 'marketing_obs')} onChange={e => setEd(a, { marketing_obs: e.target.value })} placeholder="Anotação para edição" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginTop: 6 }} />
                      <label style={{ display: 'block', fontSize: 12, margin: '6px 0' }}><input type="checkbox" checked={!!a.uso_autorizado} onChange={e => atualizar(a, { uso_autorizado: e.target.checked }, 'Autorização de uso atualizada.')} /> cliente autorizou o uso</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {edit[a.id] && <BtnPrimary small onClick={() => atualizar(a, { legenda: ed(a, 'legenda') || null, marketing_obs: ed(a, 'marketing_obs') || null }, 'Salvo.')}>Salvar</BtnPrimary>}
                        {dados.urls[a.caminho] && <a href={dados.urls[a.caminho]} download={a.nome} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, color: '#374151', textDecoration: 'none' }}>Baixar</a>}
                        <BtnDanger small onClick={() => excluir(a)}>Excluir</BtnDanger>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
