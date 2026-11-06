// Primitivos visuais compartilhados pelos módulos novos (Central, Agenda, Clientes, Consultoria).
// Mesma aparência do DasGCRMv4.jsx; cópia deliberada pra não acoplar com o monólito.
import { useEffect, useState } from 'react';

export const fmtDate = (d) => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—';
export const fmtDateTime = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function Badge({ label, color = '#6366f1' }) {
  return <span style={{ background: color + '22', color, border: `1px solid ${color}55`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>;
}

export function Card({ children, style = {}, onClick }) {
  return <div onClick={onClick} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, ...style }}>{children}</div>;
}

export function BtnPrimary({ children, onClick, small, disabled, type = 'button' }) {
  return <button type={type} onClick={onClick} disabled={disabled} style={{ background: disabled ? '#d1d5db' : '#c4a45a', color: '#fff', border: 'none', borderRadius: 6, padding: small ? '6px 14px' : '10px 20px', fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer' }}>{children}</button>;
}

export function BtnSecondary({ children, onClick, small, disabled }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, padding: small ? '6px 14px' : '10px 20px', fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer' }}>{children}</button>;
}

export function BtnDanger({ children, onClick, small }) {
  return <button type="button" onClick={onClick} style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, padding: small ? '6px 14px' : '10px 20px', fontSize: small ? 13 : 14, fontWeight: 600, cursor: 'pointer' }}>{children}</button>;
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #e5e7eb', marginBottom: 20, flexWrap: 'wrap' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ padding: '10px 18px', border: 'none', background: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: active === t.id ? '#c4a45a' : '#6b7280', borderBottom: active === t.id ? '3px solid #c4a45a' : '3px solid transparent', marginBottom: -2 }}>
          {t.label}{t.count > 0 && <span style={{ marginLeft: 6, background: '#c4a45a', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Drawer({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />}
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width, maxWidth: '100vw', background: '#fff', zIndex: 101, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#c4a45a', fontSize: 22, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{open ? children : null}</div>
      </div>
    </>
  );
}

export function Campo({ label, value, onChange, type = 'text', options, readonly, placeholder, rows = 3, ajuda }) {
  const style = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, background: readonly ? '#f9fafb' : '#fff', boxSizing: 'border-box', fontFamily: 'inherit' };
  const v = value ?? '';
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {readonly ? <div style={{ ...style, color: '#374151', whiteSpace: 'pre-wrap' }}>{v || '—'}</div>
        : options ? (
          <select value={v} onChange={e => onChange(e.target.value)} style={style}>
            <option value="">Selecionar...</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : type === 'textarea' ? <textarea value={v} placeholder={placeholder} onChange={e => onChange(e.target.value)} rows={rows} style={{ ...style, resize: 'vertical' }} />
          : <input type={type} value={v} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={style} />}
      {ajuda && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{ajuda}</div>}
    </div>
  );
}

export function Aviso({ tipo = 'info', children }) {
  const c = { info: ['#eff6ff', '#1d4ed8'], erro: ['#fef2f2', '#b91c1c'], ok: ['#f0fdf4', '#15803d'], atencao: ['#fffbeb', '#b45309'] }[tipo];
  return <div style={{ background: c[0], color: c[1], border: `1px solid ${c[1]}33`, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{children}</div>;
}

// Detecta "tabela/coluna não existe" (migração ainda não aplicada) pra mostrar aviso claro em vez de tela quebrada
export function erroDeSchema(error) {
  if (!error) return false;
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code) || /does not exist|schema cache/i.test(error.message || '');
}

// Busca de cliente por nome/telefone + lista filtrada. Usado em Atendimento, Pedidos de Venda etc.
export function SeletorCliente({ clientes, value, onChange, label = 'Cliente', onCadastrar }) {
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const digitos = t.replace(/\D/g, '');
  const achadas = clientes.filter(c => !t || (c.nome || '').toLowerCase().includes(t) || (digitos && (c.telefone || '').replace(/\D/g, '').includes(digitos)) || (c.email || '').toLowerCase().includes(t));
  const lista = value && !achadas.some(c => c.id === value) ? [clientes.find(c => c.id === value), ...achadas].filter(Boolean) : achadas;
  const st = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cadastro por nome, telefone ou e-mail..." style={{ ...st, marginBottom: 6 }} />
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={st}>
        <option value="">{achadas.length ? `Selecionar (${achadas.length} encontrada${achadas.length > 1 ? 's' : ''})...` : 'Nenhum cadastro encontrado'}</option>
        {lista.map(c => <option key={c.id} value={c.id}>{c.nome}{c.telefone ? ' · ' + c.telefone : ''}</option>)}
      </select>
      {onCadastrar && achadas.length === 0 && <div style={{ fontSize: 12, marginTop: 6 }}>Não achou? <button type="button" onClick={onCadastrar} style={{ border: 'none', background: 'none', color: '#c4a45a', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Cadastrar nova cliente</button></div>}
    </div>
  );
}
