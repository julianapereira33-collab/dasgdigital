import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { BUCKET_ANEXOS } from './quizConsultoria.js';

const MAX_ARQUIVOS = 5;
const MAX_MB = 10;

// Reduz foto de celular (3–10 MB) para ~1600px antes de enviar; se o navegador não conseguir, envia o original.
async function reduzir(arquivo) {
  if (!arquivo.type.startsWith('image/') || arquivo.type === 'image/gif') return arquivo;
  try {
    const bmp = await createImageBitmap(arquivo);
    const esc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (esc === 1 && arquivo.size < 1.5 * 1024 * 1024) return arquivo;
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    return blob && blob.size < arquivo.size ? new File([blob], arquivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : arquivo;
  } catch { return arquivo; }
}
const limpaNome = (n) => String(n || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60);

// Campo da cliente (página pública): texto opcional + fotos/prints. Valor: { texto, arquivos: [{ caminho, nome }] }
export function CampoAnexo({ token, campo, valor, onChange, estiloCampo, cor }) {
  const v = typeof valor === 'string' ? { texto: valor, arquivos: [] } : (valor || { texto: '', arquivos: [] });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [previas, setPrevias] = useState({});
  const entrada = useRef(null);
  const arquivos = v.arquivos || [];

  async function escolher(e) {
    const lista = Array.from(e.target.files || []); e.target.value = '';
    if (!lista.length) return;
    setErro('');
    if (arquivos.length + lista.length > MAX_ARQUIVOS) { setErro(`Pode anexar até ${MAX_ARQUIVOS} arquivos aqui.`); return; }
    setEnviando(true);
    const novos = []; const pv = {};
    for (const bruto of lista) {
      const f = await reduzir(bruto);
      if (f.size > MAX_MB * 1024 * 1024) { setErro(`"${bruto.name}" é grande demais (máx. ${MAX_MB} MB).`); continue; }
      const caminho = `${token}/${campo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${limpaNome(f.name)}`;
      const { error } = await supabase.storage.from(BUCKET_ANEXOS).upload(caminho, f, { contentType: f.type || undefined, upsert: false });
      if (error) { setErro('Não consegui enviar "' + bruto.name + '". Confira o tipo (foto ou PDF) e tente de novo.'); continue; }
      novos.push({ caminho, nome: bruto.name });
      if (f.type.startsWith('image/')) pv[caminho] = URL.createObjectURL(f);
    }
    setPrevias(p => ({ ...p, ...pv }));
    setEnviando(false);
    if (novos.length) onChange({ ...v, arquivos: [...arquivos, ...novos] });
  }
  const tirar = (cam) => onChange({ ...v, arquivos: arquivos.filter(a => a.caminho !== cam) });

  return (
    <div>
      <textarea rows={3} placeholder="Escreva aqui, se quiser (opcional)" value={v.texto || ''} onChange={e => onChange({ ...v, texto: e.target.value })} style={{ ...estiloCampo, resize: 'vertical' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {arquivos.map(a => (
          <div key={a.caminho} style={{ position: 'relative', width: 78, height: 78, border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, textAlign: 'center', padding: 2, boxSizing: 'border-box' }}>
            {previas[a.caminho] ? <img src={previas[a.caminho]} alt={a.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ wordBreak: 'break-all' }}>{a.nome}</span>}
            <button type="button" aria-label="Remover anexo" onClick={() => tirar(a.caminho)} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.65)', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: '20px', padding: 0 }}>×</button>
          </div>
        ))}
        {arquivos.length < MAX_ARQUIVOS && (
          <button type="button" disabled={enviando} onClick={() => entrada.current?.click()} style={{ width: 78, height: 78, borderRadius: 8, border: `2px dashed ${cor}`, background: '#fffdf7', color: cor, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 4 }}>{enviando ? 'Enviando...' : '＋ Anexar foto'}</button>
        )}
      </div>
      <input ref={entrada} type="file" accept="image/*,application/pdf" multiple onChange={escolher} style={{ display: 'none' }} />
      {erro && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 6 }}>{erro}</div>}
    </div>
  );
}

// Visão da Juliana (logada): miniaturas clicáveis dos anexos de uma resposta.
export function AnexosVistos({ arquivos = [] }) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    let vivo = true;
    if (!arquivos.length) return undefined;
    supabase.storage.from(BUCKET_ANEXOS).createSignedUrls(arquivos.map(a => a.caminho), 3600).then(({ data }) => {
      if (!vivo || !data) return;
      setUrls(Object.fromEntries(data.map(d => [d.path, d.signedUrl])));
    });
    return () => { vivo = false; };
  }, [arquivos.map(a => a.caminho).join('|')]);
  if (!arquivos.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {arquivos.map(a => {
        const u = urls[a.caminho]; const pdf = /\.pdf$/i.test(a.caminho);
        return (
          <a key={a.caminho} href={u} target="_blank" rel="noopener noreferrer" title={a.nome} style={{ width: 84, height: 84, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontSize: 11, color: '#6b7280', textDecoration: 'none', textAlign: 'center' }}>
            {u && !pdf ? <img src={u} alt={a.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (pdf ? 'PDF' : '...')}
          </a>
        );
      })}
    </div>
  );
}
