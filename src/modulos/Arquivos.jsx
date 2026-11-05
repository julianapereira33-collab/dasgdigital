import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { Card, BtnPrimary, BtnSecondary, BtnDanger, Aviso, fmtDateTime, erroDeSchema } from './ui.jsx';

// Fotos, croquis, referências e comprovantes de uma OS. Os arquivos ficam no armazenamento privado
// "os-arquivos" do Supabase e a lista na tabela os_arquivos; a tela abre cada arquivo por link temporário.

export const CATEGORIAS_ARQUIVO = {
  foto_cliente: 'Foto da cliente',
  croqui: 'Croqui',
  referencia: 'Inspiração enviada pela cliente',
  tecido: 'Tecido / material',
  prova: 'Foto de prova',
  gravacao_prova: 'Gravação da prova (vídeo/áudio)',
  imagem_ia: 'Arquivo gerado por IA',
  comprovante: 'Comprovante de pagamento',
  outro: 'Outro',
};

const limpaNome = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
const ehVideo = (n) => /\.(mp4|mov|webm|m4v)$/i.test(n || '');
const ehAudio = (n) => /\.(mp3|m4a|ogg|wav|opus|aac)$/i.test(n || '');
const ehImagem = (nome) => /\.(png|jpe?g|webp|gif|heic)$/i.test(nome || '');

export default function Arquivos({ osId, clienteId, categorias, titulo, ajuda, onMudou, comPrompt }) {
  const cats = categorias && categorias.length ? categorias : Object.keys(CATEGORIAS_ARQUIVO);
  const [lista, setLista] = useState([]);
  const [urls, setUrls] = useState({});
  const [cat, setCat] = useState(cats[0]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [legenda, setLegenda] = useState('');
  const inputRef = useRef(null);

  const carregar = useCallback(async () => {
    if (!osId && !clienteId) { setLista([]); return; }
    let q = supabase.from('os_arquivos').select('*').in('categoria', cats).order('created_at', { ascending: false });
    q = osId ? q.eq('ordem_servico_id', osId) : q.eq('cliente_id', clienteId);
    const { data, error } = await q;
    if (error) { setErro(erroDeSchema(error) ? 'Falta aplicar a migração 20261104000000 no Supabase. ' + error.message : error.message); return; }
    setLista(data || []);
    const caminhos = (data || []).map(a => a.caminho);
    if (caminhos.length) {
      const { data: assinadas } = await supabase.storage.from('os-arquivos').createSignedUrls(caminhos, 3600);
      const m = {}; (assinadas || []).forEach(s => { if (s.signedUrl) m[s.path] = s.signedUrl; });
      setUrls(m);
    }
  }, [osId, clienteId, cats.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setErro(''); carregar(); }, [carregar]);

  async function enviar(arquivos) {
    if ((!osId && !clienteId) || !arquivos.length) return;
    setEnviando(true); setErro('');
    for (const f of arquivos) {
      const caminho = `${osId || 'cliente-' + clienteId}/${cat}/${Date.now()}-${limpaNome(f.name)}`;
      const up = await supabase.storage.from('os-arquivos').upload(caminho, f, { contentType: f.type || undefined, upsert: false });
      if (up.error) { setErro('Não consegui enviar ' + f.name + ': ' + up.error.message); continue; }
      const { error } = await supabase.from('os_arquivos').insert({ ordem_servico_id: osId || null, cliente_id: clienteId || null, categoria: cat, caminho, nome: f.name, legenda: legenda || null });
      if (error) { setErro('Arquivo enviado, mas não foi registrado: ' + error.message); }
    }
    setLegenda(''); if (inputRef.current) inputRef.current.value = '';
    setEnviando(false); await carregar(); onMudou && onMudou();
  }

  async function excluir(a) {
    if (!window.confirm('Excluir este arquivo?')) return;
    await supabase.storage.from('os-arquivos').remove([a.caminho]);
    const { error } = await supabase.from('os_arquivos').delete().eq('id', a.id);
    if (error) { setErro(error.message); return; }
    await carregar(); onMudou && onMudou();
  }

  if (!osId && !clienteId) return <Card style={{ color: '#9ca3af', textAlign: 'center' }}>Escolha uma OS para ver ou enviar arquivos.</Card>;

  return (
    <div>
      {titulo && <h3 style={{ fontWeight: 700, marginBottom: 6 }}>{titulo}</h3>}
      {ajuda && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{ajuda}</p>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Card style={{ marginBottom: 16, background: '#fffdf7' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {cats.length > 1 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Tipo</div>
              <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
                {cats.map(c => <option key={c} value={c}>{CATEGORIAS_ARQUIVO[c] || c}</option>)}
              </select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Legenda (opcional)</div>
            <input value={legenda} onChange={e => setLegenda(e.target.value)} placeholder="Ex.: frente, costas, detalhe da manga" style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*,audio/*,application/pdf" style={{ display: 'none' }} onChange={e => enviar(Array.from(e.target.files || []))} />
          <BtnPrimary disabled={enviando} onClick={() => inputRef.current && inputRef.current.click()}>{enviando ? 'Enviando...' : 'Enviar arquivos'}</BtnPrimary>
        </div>
      </Card>

      {lista.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum arquivo ainda.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
        {lista.map(a => (
          <Card key={a.id} style={{ padding: 10 }}>
            <a href={urls[a.caminho]} target="_blank" rel="noreferrer" onClick={e => { if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') e.preventDefault(); }} style={{ display: 'block', background: '#f3f4f6', borderRadius: 6, height: 150, overflow: 'hidden', textAlign: 'center', lineHeight: '150px', color: '#9ca3af', fontSize: 13 }}>
              {ehVideo(a.nome) && urls[a.caminho] ? <video src={urls[a.caminho]} controls preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ehAudio(a.nome) && urls[a.caminho] ? <audio src={urls[a.caminho]} controls style={{ width: '100%', marginTop: 55 }} /> : ehImagem(a.nome) && urls[a.caminho] ? <img src={urls[a.caminho]} alt={a.legenda || a.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.nome || 'Abrir arquivo')}
            </a>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>{CATEGORIAS_ARQUIVO[a.categoria] || a.categoria}</div>
            {a.legenda && <div style={{ fontSize: 12, color: '#374151' }}>{a.legenda}</div>}
            {comPrompt && a.prompt && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, maxHeight: 48, overflow: 'hidden' }}>Prompt: {a.prompt}</div>}
            <div style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 8px' }}>{fmtDateTime(a.created_at)}</div>
            <BtnDanger small onClick={() => excluir(a)}>Excluir</BtnDanger>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Útil para telas que só precisam do botão "anexar comprovante" etc.
export async function anexarArquivo({ osId, clienteId, categoria, arquivo, legenda }) {
  const caminho = `${osId}/${categoria}/${Date.now()}-${limpaNome(arquivo.name)}`;
  const up = await supabase.storage.from('os-arquivos').upload(caminho, arquivo, { contentType: arquivo.type || undefined });
  if (up.error) return { error: up.error };
  return supabase.from('os_arquivos').insert({ ordem_servico_id: osId, cliente_id: clienteId || null, categoria, caminho, nome: arquivo.name, legenda: legenda || null }).select().single();
}
