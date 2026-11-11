// Página pública do quiz da Consultoria Express (abre em /?quiz=<token>, sem login).
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import { secoesDoQuiz } from './modulos/quizConsultoria.js';
import { CampoAnexo } from './modulos/AnexosQuiz.jsx';

const dourado = '#c4a45a';
const TITULO_POR_TIPO = { completo: 'Estilista com Ju Pereira · Questionário', consultivo: 'Curadoria Consultiva · Questionário', orcamento: 'Orçamento Couture', mps: 'My Personal Stylist · Questionário', tecido: 'My Curadoria de Tecidos' };
const chaveRascunho = (t) => 'dasg_quiz_' + t;

export default function QuizPublico({ token }) {
  const [estado, setEstado] = useState('carregando'); // carregando | invalido | pronto | enviado | erro
  const [nome, setNome] = useState('');
  const [tipoQuiz, setTipoQuiz] = useState('completo');
  const [resp, setResp] = useState({});
  const [passo, setPasso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [msgErro, setMsgErro] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.rpc('quiz_obter', { p_token: token });
      if (!vivo) return;
      if (error) { setEstado('erro'); setMsgErro(error.message); return; }
      if (!data) { setEstado('invalido'); return; }
      setNome(data.nome || ''); setTipoQuiz(data.tipo_quiz || 'completo');
      if (data.status === 'respondido') { setEstado('enviado'); return; }
      let rascunho = {};
      try { rascunho = JSON.parse(localStorage.getItem(chaveRascunho(token)) || '{}'); } catch { /* sem storage: segue em branco */ }
      setResp({ ...(data.respostas || {}), ...rascunho });
      setEstado('pronto');
    })();
    return () => { vivo = false; };
  }, [token]);

  function mudar(id, v) {
    setResp(prev => {
      const novo = { ...prev, [id]: v };
      try { localStorage.setItem(chaveRascunho(token), JSON.stringify(novo)); } catch { /* ignora */ }
      return novo;
    });
  }

  async function enviar() {
    setEnviando(true); setMsgErro('');
    const { data, error } = await supabase.rpc('quiz_responder', { p_token: token, p_respostas: resp });
    setEnviando(false);
    if (error || !data?.ok) { setMsgErro(error?.message || 'Não consegui enviar agora. Tente de novo em instantes.'); return; }
    try { localStorage.removeItem(chaveRascunho(token)); } catch { /* ignora */ }
    setEstado('enviado');
  }

  const casca = (children) => (
    <div style={{ minHeight: '100vh', background: '#faf7f2', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <div style={{ background: '#111', padding: '18px 20px', textAlign: 'center' }}>
        <div style={{ color: dourado, fontSize: 13, letterSpacing: 3, fontWeight: 700 }}>DAS G</div>
        <div style={{ color: '#fff', fontSize: 15, marginTop: 2 }}>{TITULO_POR_TIPO[tipoQuiz] || 'DAS G · Atendimento'}</div>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 18px 60px' }}>{children}</div>
    </div>
  );

  if (estado === 'carregando') return casca(<p style={{ textAlign: 'center', color: '#9ca3af' }}>Carregando...</p>);
  if (estado === 'invalido') return casca(<p style={{ textAlign: 'center' }}>Este link não é válido ou expirou. Peça um novo link para a Juliana pelo WhatsApp.</p>);
  if (estado === 'erro') return casca(<p style={{ textAlign: 'center', color: '#b91c1c' }}>Não consegui abrir o questionário: {msgErro}</p>);
  if (estado === 'enviado') return casca(
    <div style={{ textAlign: 'center', paddingTop: 40 }}>
      <div style={{ fontSize: 44 }}>✨</div>
      <h2 style={{ margin: '12px 0 8px' }}>Obrigada{nome ? ', ' + nome.split(' ')[0] : ''}!</h2>
      <p style={{ color: '#4b5563' }}>Suas respostas chegaram. A Juliana vai usá-las para preparar a nossa conversa e criar uma peça com a sua cara.</p>
    </div>
  );

  const QUIZ_SECOES = secoesDoQuiz(tipoQuiz);
  const secao = QUIZ_SECOES[passo];
  const ultimo = passo === QUIZ_SECOES.length - 1;
  const campoBase = { width: '100%', padding: '11px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 16, boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' };

  return casca(
    <>
      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, marginBottom: 6 }}>
        <div style={{ height: 6, width: `${((passo + 1) / QUIZ_SECOES.length) * 100}%`, background: dourado, borderRadius: 3, transition: 'width .3s' }} />
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 18 }}>Etapa {passo + 1} de {QUIZ_SECOES.length}</div>
      {passo === 0 && nome && <p style={{ margin: '0 0 14px', fontSize: 17 }}>Olá, <b>{nome.split(' ')[0]}</b>! Responda no seu tempo — leva poucos minutos.</p>}
      <h2 style={{ margin: '0 0 4px' }}>{secao.titulo}</h2>
      <p style={{ color: '#6b7280', margin: '0 0 18px', fontSize: 14 }}>{secao.intro}</p>

      {secao.perguntas.map(p => (
        <div key={p.id} style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{p.label}</label>
          {p.tipo === 'texto' && <input value={resp[p.id] || ''} onChange={e => mudar(p.id, e.target.value)} style={campoBase} />}
          {p.tipo === 'numero' && <input type="number" inputMode="decimal" value={resp[p.id] || ''} onChange={e => mudar(p.id, e.target.value)} style={campoBase} />}
          {p.tipo === 'data' && <input type="date" value={resp[p.id] || ''} onChange={e => mudar(p.id, e.target.value)} style={campoBase} />}
          {p.tipo === 'anexo' && <CampoAnexo token={token} campo={p.id} valor={resp[p.id]} onChange={v => mudar(p.id, v)} estiloCampo={campoBase} cor={dourado} />}
          {p.tipo === 'longo' && <textarea rows={4} value={resp[p.id] || ''} onChange={e => mudar(p.id, e.target.value)} style={{ ...campoBase, resize: 'vertical' }} />}
          {p.tipo === 'escolha' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.opcoes.map(([v, l]) => {
                const marcado = (resp[p.id] ?? null) === v && (v !== '' || p.id in resp);
                return (
                  <button key={l} type="button" onClick={() => mudar(p.id, v)} style={{ textAlign: 'left', padding: '11px 12px', borderRadius: 8, fontSize: 15, cursor: 'pointer', border: marcado ? `2px solid ${dourado}` : '1px solid #d1d5db', background: marcado ? '#fef9f0' : '#fff' }}>{l}</button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {msgErro && <p style={{ color: '#b91c1c', fontSize: 14 }}>{msgErro}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {passo > 0 && <button type="button" onClick={() => { setPasso(passo - 1); window.scrollTo(0, 0); }} style={{ flex: 1, padding: 13, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Voltar</button>}
        {!ultimo && <button type="button" onClick={() => { setPasso(passo + 1); window.scrollTo(0, 0); }} style={{ flex: 2, padding: 13, borderRadius: 8, border: 'none', background: '#111', color: dourado, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Continuar</button>}
        {ultimo && <button type="button" disabled={enviando} onClick={enviar} style={{ flex: 2, padding: 13, borderRadius: 8, border: 'none', background: dourado, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{enviando ? 'Enviando...' : 'Enviar respostas'}</button>}
      </div>
    </>
  );
}
