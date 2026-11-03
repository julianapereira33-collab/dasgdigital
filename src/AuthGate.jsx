import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

// Recuperação de senha do CRM:
// 1) "Esqueci minha senha" na tela de login -> envia e-mail com link (Supabase)
// 2) Ao voltar pelo link (evento PASSWORD_RECOVERY) -> tela para criar nova senha

const card = { background: '#fff', padding: 32, borderRadius: 12, width: 360, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', boxSizing: 'border-box' };
const campo = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const rotulo = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };
const botao = { width: '100%', padding: '10px 0', background: '#111', color: '#c4a45a', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const link = { background: 'none', border: 'none', color: '#6b7280', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' };
const marca = <div style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 26, letterSpacing: 2, color: '#111', marginBottom: 20 }}>DAS <span style={{ color: '#c4a45a' }}>G</span></div>;

function EsqueciSenha({ onFechar }) {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setErro(''); setAviso(''); setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setCarregando(false);
    if (error) setErro('Não foi possível enviar agora. Aguarde alguns minutos e tente de novo.');
    else setAviso('Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Confira também o spam.');
  };

  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onClick={e => e.stopPropagation()} onSubmit={enviar} style={card}>
        {marca}
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 6 }}>Recuperar senha</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Informe seu e-mail para receber o link de redefinição.</div>
        <div style={{ marginBottom: 16 }}>
          <label style={rotulo}>E-mail</label>
          <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} style={campo} />
        </div>
        {erro && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14 }}>{erro}</div>}
        {aviso && <div style={{ color: '#047857', fontSize: 13, marginBottom: 14 }}>{aviso}</div>}
        <button type="submit" disabled={carregando} style={botao}>{carregando ? 'Enviando...' : 'Enviar link de recuperação'}</button>
        <button type="button" onClick={onFechar} style={{ ...link, display: 'block', margin: '14px auto 0' }}>Voltar para o login</button>
      </form>
    </div>
  );
}

function NovaSenha({ onConcluido }) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (senha !== confirmacao) { setErro('As senhas não conferem.'); return; }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      const c = error.code || '';
      const m = (error.message || '').toLowerCase();
      if (c === 'same_password' || m.includes('different from the old')) setErro('Essa já é a sua senha atual. Volte para o login e entre com ela, ou escolha uma senha diferente.');
      else if (c === 'weak_password' || m.includes('weak') || m.includes('characters')) setErro('Senha fraca. Use pelo menos 8 caracteres, misturando letras maiúsculas, minúsculas e números.');
      else if (c === 'session_not_found' || c === 'session_expired' || m.includes('session')) setErro('O link expirou. Peça um novo link em "Esqueci minha senha".');
      else setErro('Não foi possível salvar (' + (c || error.message) + '). Peça um novo link e tente de novo.');
      return;
    }
    onConcluido();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <form onSubmit={salvar} style={card}>
        {marca}
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>Criar nova senha</div>
        <div style={{ marginBottom: 14 }}>
          <label style={rotulo}>Nova senha</label>
          <input type="password" required autoComplete="new-password" value={senha} onChange={e => setSenha(e.target.value)} style={campo} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={rotulo}>Confirmar nova senha</label>
          <input type="password" required autoComplete="new-password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} style={campo} />
        </div>
        {erro && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14 }}>{erro}</div>}
        <button type="submit" disabled={carregando} style={botao}>{carregando ? 'Salvando...' : 'Salvar nova senha'}</button>
        <button type="button" onClick={onConcluido} style={{ ...link, display: 'block', margin: '14px auto 0' }}>Pular e entrar no CRM</button>
      </form>
    </div>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [recuperando, setRecuperando] = useState(() => /type=recovery/.test(window.location.hash + window.location.search));
  const [esqueci, setEsqueci] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecuperando(true);
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (recuperando && session) {
    return <NovaSenha onConcluido={() => { setRecuperando(false); window.history.replaceState(null, '', window.location.pathname); }} />;
  }

  return (
    <>
      {children}
      {session === null && !esqueci && (
        <button type="button" onClick={() => setEsqueci(true)}
          style={{ ...link, position: 'fixed', left: '50%', top: 'calc(50% + 242px)', transform: 'translateX(-50%)', zIndex: 10 }}>
          Esqueci minha senha
        </button>
      )}
      {session === null && esqueci && <EsqueciSenha onFechar={() => setEsqueci(false)} />}
    </>
  );
}
