import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { ROTULO_ETAPA } from '../lib/api.js';
import { SECOES_DOSSIE } from './Criacao.jsx';
import { QUIZ_SECOES, respostaLegivel } from './quizConsultoria.js';
import Arquivos from './Arquivos.jsx';
import { Badge, Card, BtnSecondary, fmtDate } from './ui.jsx';

// Dossiê de cada OS da cliente (somente leitura; edição fica em Criação).
export function DossiesDaCliente({ osDaCliente = [], onNavegar, onAbrirOS }) {
  const [dossies, setDossies] = useState([]);
  const [erro, setErro] = useState('');
  const ids = osDaCliente.map(o => o.id).join(',');
  useEffect(() => {
    if (!osDaCliente.length) { setDossies([]); return; }
    supabase.from('dossies').select('*').in('ordem_servico_id', osDaCliente.map(o => o.id)).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (error) setErro(error.message); else setDossies(data || []); });
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!osDaCliente.length) return <div style={{ color: '#9ca3af', fontSize: 14 }}>Sem OS, então ainda não há dossiê.</div>;
  return (
    <div>
      {erro && <div style={{ color: '#b91c1c', fontSize: 13 }}>{erro}</div>}
      {osDaCliente.map(o => {
        const d = dossies.find(x => x.ordem_servico_id === o.id);
        const c = d?.conteudo || {};
        const preenchidas = SECOES_DOSSIE.filter(([k]) => c[k]);
        return (
          <Card key={o.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{o.numero}</strong><Badge label={ROTULO_ETAPA[o.status] || o.status} color="#c4a45a" />
              {onNavegar && <BtnSecondary small onClick={() => onNavegar('criacao')}>{preenchidas.length ? 'Editar em Criação' : 'Fazer dossiê em Criação'}</BtnSecondary>}
            </div>
            {preenchidas.length === 0 ? <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>Dossiê ainda não preenchido.</div>
              : <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {preenchidas.map(([k, l]) => <div key={k}><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{c[k]}</div></div>)}
              </div>}
          </Card>
        );
      })}
    </div>
  );
}

// Resultado do teste de colorimetria: cartela na ficha, resposta do quiz e arquivos do teste (foto/PDF).
export function ColorimetriaDaCliente({ cliente, quizEnvios = [] }) {
  const pergunta = QUIZ_SECOES.flatMap(s => s.perguntas).find(p => p.id === 'colorimetria');
  const respondidos = quizEnvios.filter(q => q.cliente_id === cliente.id && q.status === 'respondido' && q.respostas?.colorimetria !== undefined);
  const doQuiz = respondidos[0]?.respostas?.colorimetria;
  return (
    <Card>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: 14 }}>
        <div><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Cartela na ficha</div>{cliente.colorimetria ? <Badge label={cliente.colorimetria} color="#8b5cf6" /> : <span style={{ color: '#9ca3af' }}>não definida (edite em Dados)</span>}</div>
        <div><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Resposta no quiz</div>{doQuiz ? <span>{respostaLegivel(pergunta, doQuiz)}</span> : <span style={{ color: '#9ca3af' }}>{respondidos.length ? 'não sabe' : 'sem quiz respondido'}</span>}</div>
      </div>
      <Arquivos clienteId={cliente.id} categorias={['colorimetria']} titulo="Resultado do teste de colorimetria" ajuda="Anexe aqui a foto, o PDF ou o laudo do teste de colorimetria desta cliente." />
    </Card>
  );
}
