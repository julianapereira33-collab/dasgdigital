import { useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { BtnPrimary, BtnSecondary, fmtDateTime } from './ui.jsx';

// Fotos, vídeos e gravações de cada etapa da OS. Ficam em os_arquivos (categoria "conteudo", com a etapa)
// e alimentam a Central de Marketing, onde todo o material de cada OS fica pronto para edição.
export const STATUS_MKT = {
  novo: { label: 'Novo', cor: '#6b7280' },
  em_edicao: { label: 'Em edição', cor: '#d97706' },
  aprovado: { label: 'Aprovado', cor: '#0284c7' },
  publicado: { label: 'Publicado', cor: '#16a34a' },
  descartado: { label: 'Descartado', cor: '#9ca3af' },
};
const limpaNome = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
export const ehVideo = (n) => /\.(mp4|mov|webm|m4v)$/i.test(n || '');
export const ehAudio = (n) => /\.(mp3|m4a|ogg|wav|opus|aac)$/i.test(n || '');
export const ehImagem = (n) => /\.(png|jpe?g|webp|gif|heic)$/i.test(n || '');

export async function carregarConteudo(filtro) {
  let q = supabase.from('os_arquivos').select('*').eq('categoria', 'conteudo').order('created_at', { ascending: false });
  if (filtro?.osId) q = q.eq('ordem_servico_id', filtro.osId);
  const { data, error } = await q;
  if (error) return { error, lista: [], urls: {} };
  const caminhos = (data || []).map(a => a.caminho);
  const urls = {};
  if (caminhos.length) {
    const { data: ass } = await supabase.storage.from('os-arquivos').createSignedUrls(caminhos, 3600);
    (ass || []).forEach(s => { if (s.signedUrl) urls[s.path] = s.signedUrl; });
  }
  return { lista: data || [], urls };
}

export async function enviarConteudo({ osId, clienteId, fase, arquivos, legenda }) {
  const erros = [];
  for (const f of arquivos) {
    const caminho = `${osId}/conteudo/${fase || 'geral'}/${Date.now()}-${limpaNome(f.name)}`;
    const up = await supabase.storage.from('os-arquivos').upload(caminho, f, { contentType: f.type || undefined, upsert: false });
    if (up.error) { erros.push('Não consegui enviar ' + f.name + ': ' + up.error.message); continue; }
    const { error } = await supabase.from('os_arquivos').insert({ ordem_servico_id: osId, cliente_id: clienteId || null, categoria: 'conteudo', fase: fase || null, caminho, nome: f.name, legenda: legenda || null, marketing_status: 'novo' });
    if (error) erros.push('Enviado, mas não registrado: ' + error.message);
  }
  return erros;
}

export async function excluirConteudo(a) {
  await supabase.storage.from('os-arquivos').remove([a.caminho]);
  return supabase.from('os_arquivos').delete().eq('id', a.id);
}

export function Midia({ a, url, altura = 120 }) {
  const box = { display: 'block', background: '#f3f4f6', borderRadius: 6, height: altura, overflow: 'hidden', textAlign: 'center', lineHeight: altura + 'px', color: '#9ca3af', fontSize: 12 };
  if (!url) return <div style={box}>{a.nome}</div>;
  if (ehVideo(a.nome)) return <div style={box}><video src={url} controls preload="metadata" playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  if (ehAudio(a.nome)) return <div style={box}><audio src={url} controls style={{ width: '100%', marginTop: altura / 2 - 18 }} /></div>;
  if (ehImagem(a.nome)) return <a href={url} target="_blank" rel="noreferrer" style={box}><img src={url} alt={a.legenda || a.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></a>;
  return <a href={url} target="_blank" rel="noreferrer" style={box}>{a.nome}</a>;
}

// Bloco de envio dentro de cada etapa da OS (funciona no celular: abre a câmera ou a galeria).
export function ConteudoEtapa({ osId, clienteId, fase, itens, urls, onMudou, onErro }) {
  const camRef = useRef(null), galRef = useRef(null);
  const [legenda, setLegenda] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function enviar(fs) {
    if (!fs.length) return;
    setEnviando(true);
    const erros = await enviarConteudo({ osId, clienteId, fase, arquivos: fs, legenda });
    if (erros.length) onErro && onErro(erros.join(' | '));
    setLegenda(''); [camRef, galRef].forEach(r => { if (r.current) r.current.value = ''; });
    setEnviando(false); onMudou && onMudou();
  }
  async function remover(a) { if (!window.confirm('Excluir este arquivo?')) return; await excluirConteudo(a); onMudou && onMudou(); }
  return (
    <div style={{ border: '1px dashed #9ca3af', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📸 Fotos e gravações desta etapa <span style={{ fontWeight: 400, color: '#6b7280' }}>· vão para a Central de Marketing</span></div>
      {itens.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {itens.map(a => (
            <div key={a.id} style={{ width: 110 }}>
              <Midia a={a} url={urls[a.caminho]} altura={80} />
              <div style={{ fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.legenda || fmtDateTime(a.created_at)}</div>
              <button onClick={() => remover(a)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: 0 }}>excluir</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={legenda} onChange={e => setLegenda(e.target.value)} placeholder="Legenda (opcional)" style={{ padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 12, flex: 1, minWidth: 140 }} />
        <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" style={{ display: 'none' }} onChange={e => enviar(Array.from(e.target.files || []))} />
        <input ref={galRef} type="file" multiple accept="image/*,video/*,audio/*" style={{ display: 'none' }} onChange={e => enviar(Array.from(e.target.files || []))} />
        <BtnPrimary small disabled={enviando} onClick={() => camRef.current && camRef.current.click()}>{enviando ? 'Enviando...' : '📷 Câmera'}</BtnPrimary>
        <BtnSecondary small disabled={enviando} onClick={() => galRef.current && galRef.current.click()}>🖼 Galeria / arquivos</BtnSecondary>
      </div>
    </div>
  );
}
