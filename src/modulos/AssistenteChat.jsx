import { useEffect, useRef, useState } from 'react';
import { perguntarAssistente, assistenteConfigurado } from '../lib/meet.js';

// Chat de ajuda (ChatGPT via n8n) disponível em qualquer tela do sistema.
export default function AssistenteChat({ contexto = '' }) {
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState([{ de: 'ia', texto: 'Oi, Ju! Posso ajudar com o sistema, textos para clientes, ideias de criação, cálculo de preço e o que mais precisar. É só perguntar.' }]);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const fim = useRef(null);
  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, aberto]);

  async function enviar() {
    const t = texto.trim(); if (!t || ocupado) return;
    setTexto(''); setMsgs(m => [...m, { de: 'eu', texto: t }]); setOcupado(true);
    const r = await perguntarAssistente({ mensagem: t, historico: msgs.map(m => ({ role: m.de === 'eu' ? 'user' : 'assistant', content: m.texto })), contexto });
    setOcupado(false);
    setMsgs(m => [...m, r.ok ? { de: 'ia', texto: r.resposta } : { de: 'erro', texto: r.erro }]);
  }
  return (
    <>
      <button onClick={() => setAberto(a => !a)} title="Chat de ajuda" style={{ position: 'fixed', right: 20, bottom: 20, width: 54, height: 54, borderRadius: 27, border: 'none', background: '#111', color: '#c4a45a', fontSize: 24, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.3)', zIndex: 900 }}>{aberto ? '×' : '💬'}</button>
      {aberto && (
        <div style={{ position: 'fixed', right: 20, bottom: 86, width: 360, maxWidth: 'calc(100vw - 40px)', height: 480, maxHeight: 'calc(100vh - 120px)', background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column', zIndex: 900, overflow: 'hidden' }}>
          <div style={{ background: '#111', color: '#c4a45a', padding: '12px 16px', fontWeight: 700 }}>Chat de ajuda {!assistenteConfigurado() && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>· ainda não ligado</span>}</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: '#f9fafb' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.de === 'eu' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.de === 'eu' ? '#111' : m.de === 'erro' ? '#fef2f2' : '#fff', color: m.de === 'eu' ? '#fff' : m.de === 'erro' ? '#b91c1c' : '#111', border: m.de === 'eu' ? 'none' : '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.texto}</div>
            ))}
            {ocupado && <div style={{ alignSelf: 'flex-start', color: '#9ca3af', fontSize: 13 }}>Pensando...</div>}
            <div ref={fim} />
          </div>
          <div style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid #e5e7eb' }}>
            <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()} placeholder="Pergunte alguma coisa..." style={{ flex: 1, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
            <button onClick={enviar} disabled={ocupado} style={{ background: '#c4a45a', border: 'none', borderRadius: 6, padding: '0 14px', fontWeight: 700, cursor: 'pointer' }}>Enviar</button>
          </div>
        </div>
      )}
    </>
  );
}
