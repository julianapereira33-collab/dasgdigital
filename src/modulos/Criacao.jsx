import { TOTAL_ETAPAS } from '../lib/etapas.js';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { criarAtividadeDaEtapa, ROTULO_ETAPA } from '../lib/api.js';
import { QUIZ_SECOES, respostaLegivel } from './quizConsultoria.js';
import { BriefingQuiz } from './Consultoria.jsx';
import { TODAS_MEDIDAS } from './medidas.js';
import Arquivos from './Arquivos.jsx';
import MateriaisOS from './MateriaisOS.jsx';
import { Badge, Card, BtnPrimary, BtnSecondary, TabBar, Campo, Aviso, erroDeSchema } from './ui.jsx';

// Criação: briefing completo → dossiê → imagens do vestido → ficha técnica, tudo ligado à OS e à ficha da cliente.

export const SECOES_DOSSIE = [
  ['conceito', 'Conceito / ideia central', 'textarea'],
  ['ocasiao', 'Ocasião e público', 'textarea'],
  ['paleta', 'Paleta de cores', 'textarea'],
  ['silhueta', 'Silhueta e modelagem', 'textarea'],
  ['tecidos', 'Tecidos e materiais', 'textarea'],
  ['detalhes', 'Detalhes e acabamentos', 'textarea'],
  ['referencias', 'Referências', 'textarea'],
  ['producao', 'Observações para a produção', 'textarea'],
];
const MEDIDAS = TODAS_MEDIDAS;
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261104000000 no Supabase. ' + e.message : (e.message || String(e));

function respostaDoQuiz(quiz, id) {
  const p = QUIZ_SECOES.flatMap(s => s.perguntas).find(x => x.id === id);
  return p && quiz?.respostas?.[id] ? respostaLegivel(p, quiz.respostas[id]) : '';
}

export default function Criacao({ os, clientes, quizEnvios, onRecarregar, onNavegar }) {
  const [osId, setOsId] = useState('');
  const [aba, setAba] = useState('briefing');
  const [briefing, setBriefing] = useState(null);
  const [dossie, setDossie] = useState(null);
  const [ficha, setFicha] = useState({ medidas: {}, observacoes: '' });
  const [fichaId, setFichaId] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const ativas = useMemo(() => os.filter(o => o.status_idx < TOTAL_ETAPAS), [os]);
  const osSel = os.find(o => o.id === osId) || null;
  const cli = osSel ? clientes.find(c => c.id === osSel.cliente_id) : null;
  const quiz = osSel ? quizEnvios.filter(q => q.ordem_servico_id === osSel.id && q.status === 'respondido').sort((a, b) => new Date(b.respondido_em) - new Date(a.respondido_em))[0] : null;
  const notas = briefing?.consultoria_anotacoes?.anotacoes || {};

  useEffect(() => {
    setBriefing(null); setDossie(null); setFichaId(null); setFicha({ medidas: {}, observacoes: '' }); setErro(''); setAviso('');
    if (!osSel) return;
    let vivo = true;
    (async () => {
      const [b, d, f] = await Promise.all([
        supabase.from('briefings').select('*').eq('ordem_servico_id', osSel.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('dossies').select('*').eq('ordem_servico_id', osSel.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('fichas_tecnicas').select('*').eq('ordem_servico_id', osSel.id).order('created_at', { ascending: false }).limit(1),
      ]);
      if (!vivo) return;
      const e = b.error || d.error || f.error; if (e) { setErro(msgErro(e)); return; }
      setBriefing(b.data?.[0] || null);
      setDossie(d.data?.[0] || { id: null, conteudo: {} });
      if (f.data?.[0]) { setFichaId(f.data[0].id); setFicha({ medidas: f.data[0].medidas || {}, observacoes: f.data[0].observacoes || '' }); }
      else if (cli) { setFicha({ medidas: Object.fromEntries(MEDIDAS.map(([k]) => [k, cli[k] ?? ''])), observacoes: cli.obs_medidas || '' }); }
    })();
    return () => { vivo = false; };
  }, [osId]); // eslint-disable-line react-hooks/exhaustive-deps

  const conteudo = dossie?.conteudo || {};
  const setCampo = (k, v) => setDossie(d => ({ ...d, conteudo: { ...(d?.conteudo || {}), [k]: v } }));

  function preencherDoBriefing() {
    const sugestoes = {
      conceito: [respostaDoQuiz(quiz, 'estilo'), notas.estilo].filter(Boolean).join('\n'),
      ocasiao: [respostaDoQuiz(quiz, 'ocasiao'), osSel?.data_evento ? 'Evento: ' + new Date(osSel.data_evento + 'T12:00:00').toLocaleDateString('pt-BR') : ''].filter(Boolean).join('\n'),
      paleta: [respostaDoQuiz(quiz, 'tecidos_cores'), cli?.colorimetria ? 'Colorimetria: ' + cli.colorimetria : '', notas.tecidos_cores].filter(Boolean).join('\n'),
      silhueta: [notas.silhueta, cli?.biotipo ? 'Biotipo: ' + cli.biotipo : '', cli?.restricoes_modelagem].filter(Boolean).join('\n'),
      tecidos: [cli?.preferencias_tecidos, notas.tecidos_cores].filter(Boolean).join('\n'),
      detalhes: notas.detalhes || '',
      referencias: notas.referencias || '',
      producao: [notas.restricoes, notas.proximos_passos].filter(Boolean).join('\n'),
    };
    setDossie(d => {
      const novo = { ...(d?.conteudo || {}) };
      Object.entries(sugestoes).forEach(([k, v]) => { if (v && !novo[k]) novo[k] = v; });
      return { ...d, conteudo: novo };
    });
    setAviso('Campos vazios preenchidos com o quiz, a ficha e as anotações. Revise e salve.');
  }

  async function salvarDossie(avancar) {
    setOcupado(true); setErro(''); setAviso('');
    const linha = { ordem_servico_id: osSel.id, briefing_id: briefing?.id || null, titulo: `Dossiê ${osSel.numero || ''} — ${cli?.nome || ''}`.trim(), conteudo, updated_at: new Date().toISOString() };
    const { data, error } = dossie?.id ? await supabase.from('dossies').update(linha).eq('id', dossie.id).select().single() : await supabase.from('dossies').insert(linha).select().single();
    if (error) { setOcupado(false); setErro(msgErro(error)); return; }
    setDossie(data);
    if (avancar && osSel.status_idx < 5) {
      await supabase.from('ordens_servico').update({ status: 'criacao' }).eq('id', osSel.id);
      await criarAtividadeDaEtapa({ os: osSel, cliente: cli, slug: 'criacao' });
      await onRecarregar();
      setAviso('Dossiê salvo e a OS avançou para "Criação".');
    } else setAviso('Dossiê salvo.');
    setOcupado(false);
  }

  async function salvarFicha() {
    setOcupado(true); setErro(''); setAviso('');
    const linha = { ordem_servico_id: osSel.id, medidas: ficha.medidas, observacoes: ficha.observacoes || null };
    const { data, error } = fichaId ? await supabase.from('fichas_tecnicas').update(linha).eq('id', fichaId).select().single() : await supabase.from('fichas_tecnicas').insert(linha).select().single();
    setOcupado(false);
    if (error) { setErro(msgErro(error)); return; }
    setFichaId(data.id); setAviso('Ficha técnica salva.');
  }

  const prompt = useMemo(() => {
    const partes = [conteudo.silhueta, conteudo.tecidos, conteudo.paleta, conteudo.detalhes, conteudo.ocasiao].filter(Boolean).map(t => t.replace(/\s*\n\s*/g, '; '));
    return conteudo.imagem_prompt || (partes.length ? `Vestido de festa feminino plus size. ${partes.join('. ')}. Fotografia de moda, corpo inteiro, fundo neutro de estúdio, iluminação suave, alta qualidade.` : '');
  }, [conteudo]);
  async function copiarPrompt() {
    try { await navigator.clipboard.writeText(prompt); setAviso('Prompt copiado.'); } catch { setAviso('Copie o texto do campo manualmente.'); }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Criação</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Briefing completo, dossiê, imagens do vestido e ficha técnica</p>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={osId} onChange={e => { setOsId(e.target.value); setAba('briefing'); }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, minWidth: 280 }}>
          <option value="">Escolha a OS...</option>
          {ativas.map(o => <option key={o.id} value={o.id}>{o.numero || 'OS'} — {clientes.find(c => c.id === o.cliente_id)?.nome} ({ROTULO_ETAPA[o.status] || o.status})</option>)}
        </select>
        {osSel && <Badge label={ROTULO_ETAPA[osSel.status] || osSel.status} color="#c4a45a" />}
      </div>
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!osSel ? <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Escolha uma OS para ver o briefing e criar o dossiê.</Card> : (
        <>
          <TabBar active={aba} onChange={setAba} tabs={[{ id: 'briefing', label: 'Briefing' }, { id: 'dossie', label: 'Dossiê' }, { id: 'imagens', label: 'Imagens do vestido' }, { id: 'materiais', label: 'Materiais' }, { id: 'ficha', label: 'Ficha técnica' }]} />

          {aba === 'briefing' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
              <Card>
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Quiz da cliente</h3>
                {quiz ? <BriefingQuiz respostas={quiz.respostas} /> : <div style={{ color: '#9ca3af', fontSize: 13 }}>Quiz ainda não respondido. {onNavegar && <button onClick={() => onNavegar('consultoria')} style={{ border: 'none', background: 'none', color: '#c4a45a', textDecoration: 'underline', cursor: 'pointer' }}>Ir para a Consultoria</button>}</div>}
              </Card>
              <div>
                <Card style={{ marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Anotações da consultoria</h3>
                  {Object.values(notas).some(Boolean) ? [['estilo', 'Estilo'], ['referencias', 'Referências'], ['tecidos_cores', 'Tecidos e cores'], ['silhueta', 'Silhueta'], ['detalhes', 'Detalhes'], ['restricoes', 'Restrições'], ['orcamento_disc', 'Orçamento discutido'], ['proximos_passos', 'Próximos passos']].map(([k, l]) => notas[k] ? <div key={k} style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{notas[k]}</div></div> : null) : <div style={{ color: '#9ca3af', fontSize: 13 }}>Sem anotações. Elas entram quando a consultoria é finalizada.</div>}
                </Card>
                <Card>
                  <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Ficha da cliente</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['Biotipo', cli?.biotipo], ['Colorimetria', cli?.colorimetria], ['Estilo', cli?.estilo], ['Busto', cli?.busto], ['Cintura', cli?.cintura], ['Quadril', cli?.quadril], ['Altura', cli?.altura]].map(([k, v]) => <div key={k} style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>{k}</div><div style={{ fontWeight: 600, fontSize: 13 }}>{v || '—'}</div></div>)}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {aba === 'dossie' && dossie && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontWeight: 700 }}>Dossiê do vestido</h3>
                <BtnSecondary small onClick={preencherDoBriefing}>Preencher com o briefing</BtnSecondary>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {SECOES_DOSSIE.map(([k, l, t]) => <Campo key={k} label={l} type={t} rows={4} value={conteudo[k]} onChange={v => setCampo(k, v)} />)}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <BtnPrimary disabled={ocupado} onClick={() => salvarDossie(false)}>{ocupado ? 'Salvando...' : 'Salvar dossiê'}</BtnPrimary>
                {osSel.status_idx < 5 && <BtnSecondary disabled={ocupado} onClick={() => salvarDossie(true)}>Salvar e avançar a OS para Criação</BtnSecondary>}
              </div>
            </Card>
          )}

          {aba === 'imagens' && dossie && (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Texto para gerar a imagem do vestido</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Montado a partir do dossiê. Edite, copie e gere a imagem na ferramenta de IA que você usa; depois envie o resultado abaixo para ficar salvo nesta OS e na ficha da cliente.</p>
                <Campo label="Prompt" type="textarea" rows={5} value={prompt} onChange={v => setCampo('imagem_prompt', v)} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <BtnSecondary small onClick={copiarPrompt} disabled={!prompt}>Copiar prompt</BtnSecondary>
                  <BtnSecondary small disabled={ocupado} onClick={() => salvarDossie(false)}>Salvar prompt</BtnSecondary>
                </div>
                <div style={{ marginTop: 10 }}><Aviso tipo="info">A geração automática dentro do CRM ainda depende de um fluxo no n8n com a chave de imagem da OpenAI. Por enquanto o fluxo é manual, como descrito acima.</Aviso></div>
              </Card>
              <Arquivos osId={osSel.id} clienteId={osSel.cliente_id} categorias={['imagem_ia', 'croqui', 'referencia']} titulo="Imagens e croquis" />
            </div>
          )}

          {aba === 'materiais' && <MateriaisOS osId={osSel.id} />}

          {aba === 'ficha' && (
            <Card>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Ficha técnica (medidas para a produção)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {MEDIDAS.map(([k, l]) => <Campo key={k} label={l + ' (cm)'} type="number" value={ficha.medidas[k]} onChange={v => setFicha(f => ({ ...f, medidas: { ...f.medidas, [k]: v } }))} />)}
              </div>
              <Campo label="Observações" type="textarea" value={ficha.observacoes} onChange={v => setFicha(f => ({ ...f, observacoes: v }))} />
              <BtnPrimary disabled={ocupado} onClick={salvarFicha}>{ocupado ? 'Salvando...' : 'Salvar ficha técnica'}</BtnPrimary>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
