import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { Card, Aviso, fmtDateTime } from './ui.jsx';
import { CATEGORIAS_ARQUIVO } from './Arquivos.jsx';

// Todas as fotos, croquis, imagens e comprovantes da cliente (de todas as OS), na ficha dela.
export default function ArquivosCliente({ clienteId }) {
  const [lista, setLista] = useState([]); const [urls, setUrls] = useState({}); const [erro, setErro] = useState('');
  useEffect(() => { (async () => {
    const { data, error } = await supabase.from('os_arquivos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false });
    if (error) { setErro(error.message); return; }
    setLista(data || []);
    if (data?.length) { const { data: a } = await supabase.storage.from('os-arquivos').createSignedUrls(data.map(x => x.caminho), 3600); const m = {}; (a || []).forEach(s => { if (s.signedUrl) m[s.path] = s.signedUrl; }); setUrls(m); }
  })(); }, [clienteId]);
  return (
    <div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Arquivos enviados nas OS desta cliente (consultoria, criação, provas, comprovantes). Para enviar, abra a OS na etapa correspondente.</p>
      {lista.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum arquivo ainda.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
        {lista.map(a => (
          <Card key={a.id} style={{ padding: 6 }}>
            <a href={urls[a.caminho]} target="_blank" rel="noreferrer" style={{ display: 'block', height: 90, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', fontSize: 11, textAlign: 'center', lineHeight: '90px', color: '#9ca3af' }}>
              {/\.(png|jpe?g|webp|gif)$/i.test(a.nome || '') && urls[a.caminho] ? <img src={urls[a.caminho]} alt={a.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'abrir'}
            </a>
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{CATEGORIAS_ARQUIVO[a.categoria] || a.categoria}</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>{fmtDateTime(a.created_at)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
