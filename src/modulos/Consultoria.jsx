import { TOTAL_ETAPAS } from '../lib/etapas.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { enviarQuizPorWhatsApp, criarQuizEnvio, criarAtividadeDaEtapa, ROTULO_ETAPA } from '../lib/api.js';
import { QUIZ_SECOES, secoesParaBriefing, PERGUNTAS_ANTIGAS, respostaLegivel, linkDoQuiz } from './quizConsultoria.js';
import { AnexosVistos } from './AnexosQuiz.jsx';
import { gerarMeet, meetConfigurado } from '../lib/meet.js';
import { Badge, Card, BtnPrimary, BtnSecondary, TabBar, Campo, Aviso, fmtDate, fmtDateTime, erroDeSchema } from './ui.jsx';
import Arquivos from './Arquivos.jsx';
import MateriaisOS from './MateriaisOS.jsx';

const ANOTACOES_VAZIAS = { estilo: '', referencias: '', tecidos_cores: '', silhueta: '', detalhes: '', restricoes: '', orcamento_disc: '', proximos_passos: '' };
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261102000000 no Supabase. ' + e.message : (e.message || String(e));
const rascunhoKey = (osId) => 'dasg_consultoria_' + osId;

// Respostas do quiz agrupadas por seção (usado na aba Acompanhamento e na sessão ao vivo)
export function BriefingQuiz({ respostas, compacto }) {
  const secoes = secoesParaBriefing().map(s => ({ ...s, itens: s.perguntas.map(p => ({ p, v: respostaLegivel(p, respostas?.[p.id]), arq: p.tipo === 'anexo' && typeof respostas?.[p.id] === 'object' ? (respostas[p.id].arquivos || []) : [] })).filter(x => x.v || x.arq.length) })).filter(s => s.itens.length);
  const antigas = PERGUNTAS_ANTIGAS.map(p => ({ p, v: respostaLegivel(p, respostas?.[p.id]), arq: [] })).filter(x => x.v);
  if (antigas.length) secoes.push({ id: 'antigas', titulo: 'Outras respostas', itens: antigas });
  if (!secoes.length) return <div style={{ color: '#9ca3af', fontSize: 13 }}>Sem respostas ainda.</div>;
  return (
    <div>
      {secoes.map(s => (
        <div key={s.id} style={{ marginBottom: compacto ? 10 : 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c4a45a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{s.titulo}</div>
          {s.itens.map(({ p, v, arq }) => (
            <div key={p.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.label.replace(/\s*\(.*?\)\s*$/, '')}</div>
              {(typeof respostas?.[p.id] === 'object' ? (respostas[p.id].texto || '') : v) && <div style={{ fontSize: 13, color: '#111', whiteSpace: 'pre-wrap' }}>{typeof respostas?.[p.id] === 'object' ? respostas[p.id].texto : v}</div>}
              <AnexosVistos arquivos={arq} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Consultoria({ clientes, os, quizEnvios, agenda = [], onRecarregar, onNavegar }) {
  const [aba, setAba] = useState('acompanhamento');
  const [sub, setSub] = useState('anotacoes');
  const [osSel, setOsSel] = useState(null);
  const [verBriefing, setVerBriefing] = useState(null); // quiz selecionado na aba acompanhamento
  const [mostrarQ, setMostrarQ] = useState(false);
  const [notas, setNotas] = useState('');
  const [anotacoes, setAnotacoes] = useState(ANOTACOES_VAZIAS);
  const [timer, setTimer] = useState(0);
  const [rodando, setRodando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const timerRef = useRef(null);

  // ao abrir a aba, busca de novo: a cliente pode ter respondido o quiz enquanto você estava em outra tela
  useEffect(() => { onRecarregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rodando) timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [rodando]);

  const osAtivas = useMemo(() => os.filter(o => o.status_idx < TOTAL_ETAPAS), [os]);
  const cli = osSel ? clientes.find(c => c.id === osSel.cliente_id) : null;
  const quizDaOS = (o) => quizEnvios.filter(q => q.ordem_servico_id === o.id || (!q.ordem_servico_id && q.cliente_id === o.cliente_id)).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))[0];
  const quizSel = osSel ? quizDaOS(osSel) : null;

  // carrega anotações salvas (banco) ou rascunho (navegador) ao trocar de OS
  useEffect(() => {
    setSub('anotacoes'); setNotas(''); setAnotacoes(ANOTACOES_VAZIAS); setTimer(0); setRodando(false); setAviso(''); setErro('');
    if (!osSel) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase.from('briefings').select('consultoria_anotacoes').eq('ordem_servico_id', osSel.id).order('created_at', { ascending: false }).limit(1);
      let salvo = data?.[0]?.consultoria_anotacoes;
      try { const r = JSON.parse(localStorage.getItem(rascunhoKey(osSel.id)) || 'null'); if (r) salvo = r; } catch { /* sem storage */ }
      if (vivo && salvo) { setAnotacoes({ ...ANOTACOES_VAZIAS, ...(salvo.anotacoes || {}) }); setNotas(salvo.notas || ''); }
    })();
    return () => { vivo = false; };
  }, [osSel?.id]);

  useEffect(() => {
    if (!osSel) return;
    try { localStorage.setItem(rascunhoKey(osSel.id), JSON.stringify({ anotacoes, notas })); } catch { /* ignora */ }
  }, [anotacoes, notas, osSel?.id]);

  async function enviarQuiz(o) {
    const c = clientes.find(x => x.id === o.cliente_id);
    setOcupado(true); setErro(''); setAviso('');
    const r = await enviarQuizPorWhatsApp({ cliente: c, os: o });
    setOcupado(false); await onRecarregar();
    if (r.error) { setErro(r.error + (r.envio ? ` O link já foi criado — use "Copiar link".` : '')); return; }
    setAviso(`Quiz enviado para ${c?.nome} pelo WhatsApp.`);
  }
  async function copiarLink(o) {
    const c = clientes.find(x => x.id === o.cliente_id);
    setErro(''); setAviso('');
    const { data: envio, error } = await criarQuizEnvio({ cliente: c, os: o });
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar();
    try { await navigator.clipboard.writeText(linkDoQuiz(envio.token)); setAviso('Link copiado. Cole no WhatsApp, Instagram ou e-mail.'); }
    catch { setAviso('Link do quiz: ' + linkDoQuiz(envio.token)); }
  }

  // Abre o Meet da consulta: usa o link do agendamento desta cliente/OS; se não tiver, gera um novo e guarda na agenda.
  async function abrirMeet() {
    if (!osSel) return;
    const doEvento = agenda.filter(a => a.link_meet && (a.ordem_servico_id === osSel.id || a.cliente_id === osSel.cliente_id) && a.status !== 'cancelado')
      .sort((a, b) => Math.abs(new Date(a.data_hora) - Date.now()) - Math.abs(new Date(b.data_hora) - Date.now()))[0];
    if (doEvento) { window.open(doEvento.link_meet, '_blank', 'noopener'); return; }
    if (!meetConfigurado()) { setErro('Esta consulta não tem link do Meet e a geração automática ainda não está ligada. Crie o evento na Agenda com o link.'); return; }
    const aba = window.open('about:blank', '_blank');
    setErro('');
    const r = await gerarMeet({ titulo: 'Consultoria · ' + (cli?.nome || ''), inicio: new Date(), duracao_min: 60 });
    if (!r.ok) { aba?.close(); setErro(r.erro); return; }
    await supabase.from('agenda').insert({ cliente_id: osSel.cliente_id, ordem_servico_id: osSel.id, tipo: osSel.tipo_atendimento || 'completo', titulo: 'Atendimento', departamento: 'clientes', data_hora: new Date().toISOString(), duracao_min: 60, link_meet: r.link, status: 'agendado' });
    await onRecarregar();
    if (aba) aba.location.href = r.link; else window.open(r.link, '_blank', 'noopener');
  }

  async function finalizar() {
    if (!osSel) return;
    setOcupado(true); setErro(''); setAviso('');
    const payload = { anotacoes, notas, duracao_seg: timer, finalizada_em: new Date().toISOString() };
    const { data: existente } = await supabase.from('briefings').select('id').eq('ordem_servico_id', osSel.id).order('created_at', { ascending: false }).limit(1);
    const { error } = existente?.[0]
      ? await supabase.from('briefings').update({ consultoria_anotacoes: payload, updated_at: new Date().toISOString() }).eq('id', existente[0].id)
      : await supabase.from('briefings').insert({ cliente_id: osSel.cliente_id, ordem_servico_id: osSel.id, consultoria_anotacoes: payload, origem: 'consultoria' });
    if (error) { setOcupado(false); setErro(msgErro(error)); return; }
    if (osSel.status_idx < 4) {
      await supabase.from('ordens_servico').update({ status: 'consultoria' }).eq('id', osSel.id);
      await criarAtividadeDaEtapa({ os: osSel, cliente: cli, slug: 'consultoria' });
    }
    // ficha da cliente: restrições/tecidos anotados na sessão entram nos campos vazios
    if (cli) {
      const upd = {};
      if (anotacoes.restricoes && !cli.restricoes_modelagem) upd.restricoes_modelagem = anotacoes.restricoes;
      if (anotacoes.tecidos_cores && !cli.preferencias_tecidos) upd.preferencias_tecidos = anotacoes.tecidos_cores;
      if (Object.keys(upd).length) await supabase.from('clientes').update(upd).eq('id', cli.id);
    }
    try { localStorage.removeItem(rascunhoKey(osSel.id)); } catch { /* ignora */ }
    await onRecarregar();
    setOcupado(false); setRodando(false);
    setAviso('Consultoria finalizada: anotações salvas no briefing e a OS avançou para "Consultoria realizada".');
  }

  const fmtTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const rotuloQuiz = (q) => !q ? ['Não enviado', '#9ca3af'] : q.status === 'respondido' ? ['Respondido', '#22c55e'] : q.status === 'enviado' ? ['Enviado — aguardando', '#f59e0b'] : ['Link criado', '#6366f1'];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Consultoria</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Quiz da cliente, briefing e sessão ao vivo</p>
      </div>
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <TabBar active={aba} onChange={setAba} tabs={[{ id: 'acompanhamento', label: 'Acompanhamento' }, { id: 'sessao', label: 'Sessão ao vivo' }]} />

      {aba === 'acompanhamento' && (
        <div style={{ display: 'grid', gridTemplateColumns: verBriefing ? 'minmax(0,1fr) 380px' : '1fr', gap: 20, alignItems: 'start' }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#111' }}>{['Cliente', 'OS / etapa', 'Quiz', 'Ações'].map(h => <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#c4a45a', fontWeight: 600, fontSize: 13 }}>{h}</th>)}</tr></thead>
              <tbody>
                {osAtivas.map((o, i) => {
                  const c = clientes.find(x => x.id === o.cliente_id); const q = quizDaOS(o); const [rot, cor] = rotuloQuiz(q);
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{c?.nome || '—'}<div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>{c?.telefone}</div></td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>{o.numero || 'OS'}<div style={{ fontSize: 12, color: '#6b7280' }}>{ROTULO_ETAPA[o.status] || o.status}{o.data_evento ? ' · evento ' + fmtDate(o.data_evento) : ''}</div></td>
                      <td style={{ padding: '12px 14px' }}><Badge label={rot} color={cor} />{q?.respondido_em && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{fmtDateTime(q.respondido_em)}</div>}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {q?.status === 'respondido' && <BtnSecondary small onClick={() => setVerBriefing({ q, c, o })}>Ver briefing</BtnSecondary>}
                          {q?.status !== 'respondido' && <BtnSecondary small disabled={ocupado || !c?.telefone} onClick={() => enviarQuiz(o)}>{q ? 'Reenviar' : 'Enviar quiz'}</BtnSecondary>}
                          {q?.status !== 'respondido' && <BtnSecondary small onClick={() => copiarLink(o)}>Copiar link</BtnSecondary>}
                          <BtnPrimary small onClick={() => { setOsSel(o); setAba('sessao'); }}>Abrir sessão</BtnPrimary>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {osAtivas.length === 0 && <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Nenhuma OS ativa. Cadastre uma cliente com OS (aba Clientes) ou converta um lead (Central de Atendimento).</td></tr>}
              </tbody>
            </table>
          </div>
          {verBriefing && (
            <Card style={{ position: 'sticky', top: 16, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div><b>{verBriefing.c?.nome}</b><div style={{ fontSize: 12, color: '#9ca3af' }}>Briefing do quiz · {fmtDateTime(verBriefing.q.respondido_em)}</div></div>
                <button onClick={() => setVerBriefing(null)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>
              <BriefingQuiz respostas={verBriefing.q.respostas} />
            </Card>
          )}
        </div>
      )}

      {aba === 'sessao' && (
        <div>
          <div style={{ background: '#111', padding: '12px 20px', borderRadius: 10, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={osSel?.id || ''} onChange={e => setOsSel(os.find(o => o.id === e.target.value) || null)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600 }}>
              <option value="">Selecionar OS...</option>
              {osAtivas.map(o => <option key={o.id} value={o.id}>{o.numero || 'OS'} — {clientes.find(c => c.id === o.cliente_id)?.nome}</option>)}
            </select>
            {osSel?.link_meet && <a href={osSel.link_meet} target="_blank" rel="noreferrer" style={{ background: '#1a73e8', color: '#fff', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Abrir Meet</a>}
            {cli?.telefone && <a href={`https://wa.me/55${cli.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#fff', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>WhatsApp</a>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: '#c4a45a', fontWeight: 700, fontSize: 18, fontFamily: 'monospace' }}>{fmtTimer(timer)}</span>
              <button onClick={() => setRodando(r => !r)} disabled={!osSel} style={{ padding: '6px 14px', background: rodando ? '#ef4444' : '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>{rodando ? 'Pausar' : 'Iniciar'}</button>
              <BtnSecondary small disabled={!osSel} onClick={abrirMeet}>🎥 Abrir Meet</BtnSecondary>
              <BtnPrimary small disabled={!osSel || ocupado} onClick={finalizar}>{ocupado ? 'Salvando...' : 'Finalizar consultoria'}</BtnPrimary>
            </div>
          </div>

          {!osSel ? <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Escolha uma OS acima (ou use "Abrir sessão" na aba Acompanhamento).</Card> : (
            <>
            <TabBar active={sub} onChange={setSub} tabs={[{ id: 'anotacoes', label: 'Anotações ao vivo' }, { id: 'fotos', label: 'Fotos e croqui' }, { id: 'materiais', label: 'Materiais e compras' }, { id: 'briefing', label: 'Briefing completo' }]} />
            {sub === 'fotos' && <Arquivos osId={osSel.id} clienteId={osSel.cliente_id} categorias={['foto_cliente', 'croqui', 'referencia', 'tecido']} titulo="Fotos da cliente, croqui e referências" ajuda="Suba a foto da cliente, o croqui desenhado na consultoria e as referências. Tudo fica ligado a esta OS e à ficha da cliente." />}
            {sub === 'materiais' && <MateriaisOS osId={osSel.id} />}
            {sub === 'briefing' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
                <Card>
                  <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Respostas do quiz</h3>
                  {quizSel?.status === 'respondido' ? <BriefingQuiz respostas={quizSel.respostas} /> : <div style={{ color: '#9ca3af', fontSize: 13 }}>A cliente ainda não respondeu o quiz.</div>}
                </Card>
                <Card>
                  <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Anotações da consultoria</h3>
                  {[['estilo', 'Estilo identificado'], ['referencias', 'Referências'], ['tecidos_cores', 'Tecidos e cores'], ['silhueta', 'Silhueta ideal'], ['detalhes', 'Detalhes desejados'], ['restricoes', 'Restrições'], ['orcamento_disc', 'Orçamento discutido'], ['proximos_passos', 'Próximos passos']].map(([k, l]) => anotacoes[k] ? (
                    <div key={k} style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{anotacoes[k]}</div></div>
                  ) : null)}
                  {notas && <div style={{ marginTop: 8 }}><div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>Notas livres</div><div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{notas}</div></div>}
                  {!Object.values(anotacoes).some(Boolean) && !notas && <div style={{ color: '#9ca3af', fontSize: 13 }}>Sem anotações ainda. Use a aba "Anotações ao vivo".</div>}
                </Card>
              </div>
            )}
            {sub === 'anotacoes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
              <div>
                <Card style={{ marginBottom: 14 }}>
                  <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{cli?.nome || '—'}</div>
                    {cli?.apelido && <div style={{ fontSize: 13, color: '#6b7280' }}>"{cli.apelido}"</div>}
                    <div style={{ marginTop: 6 }}><Badge label={'Quiz: ' + rotuloQuiz(quizSel)[0]} color={rotuloQuiz(quizSel)[1]} /></div>
                  </div>
                  {cli && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {[['Biotipo', cli.biotipo], ['Colorimetria', cli.colorimetria], ['Estilo', cli.estilo], ['Busto', cli.busto && cli.busto + ' cm'], ['Cintura', cli.cintura && cli.cintura + ' cm'], ['Quadril', cli.quadril && cli.quadril + ' cm']].map(([k, v]) => (
                        <div key={k} style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}>
                          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>{k}</div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {quizSel?.status === 'respondido' ? (
                    <div style={{ background: '#fef9f0', borderRadius: 6, padding: 10, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: '#c4a45a', marginBottom: 4 }}>Resumo do briefing</div>
                      {[['estilo', 'Estilo'], ['ocasiao', 'Ocasião'], ['data_evento', 'Data'], ['tecidos_cores', 'Cores/tecidos'], ['evitar', 'Evitar'], ['investimento', 'Investimento']].map(([id, l]) => {
                        const p = QUIZ_SECOES.flatMap(s => s.perguntas).find(x => x.id === id); const v = respostaLegivel(p, quizSel.respostas?.[id]);
                        return v ? <div key={id} style={{ marginBottom: 3 }}><b>{l}:</b> {v}</div> : null;
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <BtnSecondary small disabled={ocupado || !cli?.telefone} onClick={() => enviarQuiz(osSel)}>{quizSel ? 'Reenviar quiz' : 'Enviar quiz'}</BtnSecondary>
                      <BtnSecondary small onClick={() => copiarLink(osSel)}>Copiar link</BtnSecondary>
                    </div>
                  )}
                </Card>
                <Card>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Notas livres</div>
                  <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observações durante a sessão..." rows={6} style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Rascunho guardado neste navegador até finalizar.</div>
                </Card>
              </div>
              <Card>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Anotações ao vivo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['estilo', 'Estilo identificado na sessão', 'textarea'], ['referencias', 'Referências discutidas', 'textarea'], ['tecidos_cores', 'Tecidos e cores aprovados', 'textarea'], ['silhueta', 'Silhueta ideal', 'textarea'], ['detalhes', 'Detalhes desejados', 'textarea'], ['restricoes', 'Restrições identificadas', 'textarea'], ['orcamento_disc', 'Orçamento estimado discutido', 'text'], ['proximos_passos', 'Próximos passos', 'textarea']].map(([k, l, t]) => (
                    <Campo key={k} label={l} type={t} value={anotacoes[k]} onChange={v => setAnotacoes(p => ({ ...p, [k]: v }))} />
                  ))}
                </div>
              </Card>
            </div>
            )}
            </>
          )}

          {mostrarQ && (
            <div style={{ position: 'fixed', bottom: 80, right: 20, width: 420, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 50, padding: 16, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Briefing completo da cliente</div>
              {quizSel?.status === 'respondido' ? <BriefingQuiz respostas={quizSel.respostas} compacto /> : <div style={{ color: '#9ca3af', fontSize: 13 }}>A cliente ainda não respondeu o quiz.</div>}
            </div>
          )}
          {osSel && <button onClick={() => setMostrarQ(m => !m)} title="Briefing completo" style={{ position: 'fixed', bottom: 24, right: 24, width: 48, height: 48, borderRadius: '50%', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Q</button>}
        </div>
      )}
    </div>
  );
}
