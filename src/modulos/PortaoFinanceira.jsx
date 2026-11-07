import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { Card, BtnPrimary, Aviso } from './ui.jsx';

// A agenda/tarefas da Financeira só abrem com senha. A senha fica criptografada no banco e é conferida por função (RPC).
const CHAVE = 'dasg_fin_ok';
// O banco é quem libera de verdade (2 horas). Aqui guardamos só o prazo para a tela saber quando voltar a travar.
export const finLiberada = () => { try { return Number(sessionStorage.getItem(CHAVE)) > Date.now(); } catch { return false; } };
export const travarFinanceira = () => { try { sessionStorage.removeItem(CHAVE); } catch { /* sem storage */ } supabase.rpc('agenda_financeira_travar').then(() => {}, () => {}); };

export default function PortaoFinanceira({ onLiberar }) {
  const [carregando, setCarregando] = useState(true);
  const [temSenha, setTemSenha] = useState(null);
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    supabase.rpc('agenda_financeira_status').then(({ data, error }) => { if (error) setErro(error.message); setTemSenha(!!data); setCarregando(false); });
  }, []);
  if (carregando) return <Card>Verificando...</Card>;
  const liberar = () => { try { sessionStorage.setItem(CHAVE, String(Date.now() + 115 * 60000)); } catch { /* sem storage */ } onLiberar?.(); };
  async function enviar() {
    setErro(''); setOcupado(true);
    if (!temSenha) {
      if (senha.length < 4) { setErro('Use ao menos 4 caracteres.'); setOcupado(false); return; }
      if (senha !== confirma) { setErro('As senhas não conferem.'); setOcupado(false); return; }
      const { data, error } = await supabase.rpc('agenda_financeira_definir_senha', { p_nova: senha, p_atual: null });
      setOcupado(false);
      if (error || !data) { setErro(error?.message || 'Não consegui criar a senha.'); return; }
      liberar();
    } else {
      const { data, error } = await supabase.rpc('agenda_financeira_verificar', { p_senha: senha });
      setOcupado(false);
      if (error) { setErro(error.message); return; }
      if (!data) { setErro('Senha incorreta.'); return; }
      liberar();
    }
  }
  const st = { width: '100%', maxWidth: 320, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 15, boxSizing: 'border-box', marginBottom: 10 };
  return (
    <Card style={{ maxWidth: 420, margin: '20px 0' }}>
      <h3 style={{ marginBottom: 6 }}>🔒 Agenda Financeira</h3>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>{temSenha ? 'Digite a senha para ver compromissos, tarefas e contas a pagar.' : 'Ainda não existe senha. Crie uma agora — ela protege a agenda e as tarefas financeiras.'}</p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <input type="password" autoFocus value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()} placeholder={temSenha ? 'Senha' : 'Nova senha'} style={st} />
      {!temSenha && <input type="password" value={confirma} onChange={e => setConfirma(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()} placeholder="Repita a senha" style={st} />}
      <div><BtnPrimary onClick={enviar} disabled={ocupado}>{ocupado ? 'Conferindo...' : temSenha ? 'Abrir' : 'Criar senha e abrir'}</BtnPrimary></div>
    </Card>
  );
}
