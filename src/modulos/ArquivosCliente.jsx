import { useState } from 'react';
import Arquivos, { CATEGORIAS_ARQUIVO } from './Arquivos.jsx';
import { ROTULO_ETAPA } from '../lib/api.js';

// Ficha da cliente: tudo que ela mandou e tudo que foi gerado — inspirações, fotos, gravações das provas, arquivos da IA, comprovantes.
export default function ArquivosCliente({ clienteId, osDaCliente = [] }) {
  const [osId, setOsId] = useState('');
  const todas = Object.keys(CATEGORIAS_ARQUIVO);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Mostrar:</span>
        <select value={osId} onChange={e => setOsId(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
          <option value="">Tudo da cliente</option>
          {osDaCliente.map(o => <option key={o.id} value={o.id}>{o.numero} — {ROTULO_ETAPA[o.status] || o.status}</option>)}
        </select>
      </div>
      <Arquivos key={osId || 'todos'} osId={osId || null} clienteId={clienteId} categorias={todas}
        ajuda="Inspirações enviadas pela cliente, fotos, gravações das provas, arquivos gerados pela IA e comprovantes. Aceita imagem, vídeo, áudio e PDF." />
    </div>
  );
}
