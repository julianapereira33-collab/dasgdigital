import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { criarOS, enviarQuizPorWhatsApp, ROTULO_ETAPA } from '../lib/api.js';
import { linkDoQuiz } from './quizConsultoria.js';
import { BriefingQuiz } from './Consultoria.jsx';
import ChecklistAtendimento, { statusChecklist } from './ChecklistAtendimento.jsx';
import { TIPOS_ATENDIMENTO, TIPO_PADRAO, tipoDaOS, brlTipo } from './tiposAtendimento.js';
import { Badge, Card, BtnPrimary, BtnSecondary, TabBar, Campo, SeletorCliente, Aviso, fmtDateTime, erroDeSchema } from './ui.jsx';

// 2º passo do fluxo: Atendimento. Define o tipo (Personal Stylist, My Consultora, My Orçamento, My Curadoria de Tecidos, Stylist Cerimonial ou My Personal Stylist),
// dispara o link de pagamento, o quiz (quando o tipo pede), a confirmação e a videoconferência.
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261105000002 no Supabase. ' + e.message : (e.message || String(e));
const opcoesTipo = (atual) => Object.entries(TIPOS_ATENDIMENTO).filter(([k, t]) => !t.legado || k === atual).map(([value, t]) => ({ value, label: `${t.label} · ${brlTipo(t)}` }));
const STATUS_QUIZ = { criado: ['Link criado', '#6b7280'], enviado: ['Enviado, aguardando', '#f59e0b'], respondido: ['Respondido', '#16a34a'] };

export default function Atendimento({ canais = [], clientes, os, agenda, tarefas = [], quizEnvios, clienteFocoId = '', focoTick = 0, onRecarregar, onNavegar }) {
  const [aba, setAba] = useState('atendimentos');
  const [aberta, setAberta] = useState(null);
  const [filtroQuiz, setFiltroQuiz] = useState('todos');
  const [verResp, setVerResp] = useState(null);
  const [novo, setNovo] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState('');

  useEffect(() => { if (focoTick > 0 && clienteFocoId) { setAba('atendimentos'); setNovo({ cliente_id: clienteFocoId, tipo: TIPO_PADRAO, descricao: '' }); } }, [focoTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const cli = (id) => clientes.find(c => c.id === id);
  const emAtendimento = useMemo(() => os.filter(o => o.status_idx <= 8).sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0)), [os]);

  async function mudarTipo(o, tipo) {
    const { error } = await supabase.from('ordens_servico').update({ tipo_atendimento: tipo }).eq('id', o.id);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar();
  }
  async function criarAtendimento() {
    if (!novo?.cliente_id) { setErro('Escolha a cliente.'); return; }
    setOcupado('novo'); setErro('');
    const r = await criarOS({ cliente: cli(novo.cliente_id), listaOS: os, descricao: novo.descricao, tipo_atendimento: novo.tipo, etapaInicial: 'atendimento' });
    setOcupado('');
    if (r.error) { setErro(msgErro(r.error)); return; }
    await onRecarregar(); setNovo(null); setAberta(r.data.id); setAviso(`Atendimento ${r.data.numero} aberto.`);
  }
  async function enviarQuiz(o) {
    setOcupado('q' + o.id); setErro(''); setAviso('');
    const r = await enviarQuizPorWhatsApp({ cliente: cli(o.cliente_id), os: o });
    setOcupado('');
    if (r.error) { setErro(r.error); return; }
    await onRecarregar(); setAviso('Link do quiz enviado pelo WhatsApp.');
  }
  async function copiar(q) { try { await navigator.clipboard.writeText(linkDoQuiz(q.token)); setAviso('Link copiado.'); } catch { setAviso(linkDoQuiz(q.token)); } }

  const quizzes = quizEnvios.filter(q => filtroQuiz === 'todos' || (filtroQuiz === 'respondidos' ? q.status === 'respondido' : q.status !== 'respondido'));
  const precisamQuiz = os.filter(o => tipoDaOS(o).quiz && o.status_idx <= 6 && !quizEnvios.some(q => q.ordem_servico_id === o.id));
  const proximos = agenda.filter(a => (a.departamento || 'clientes') === 'clientes' && a.status !== 'cancelado' && new Date(a.data_hora) >= new Date(Date.now() - 3600000)).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora)).slice(0, 10);
  const abertas = tarefas.filter(t => (t.departamento || 'clientes') === 'clientes' && t.status !== 'concluida').slice(0, 10);

  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>Atendimento</h1><p style={{ color: '#6b7280', marginTop: 4 }}>Defina o tipo de atendimento, envie o link de pagamento e o quiz, e acompanhe as respostas</p></div>
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}{erro && <Aviso tipo="erro">{erro}</Aviso>}
      <TabBar active={aba} onChange={setAba} tabs={[{ id: 'atendimentos', label: 'Atendimentos', count: emAtendimento.length }, { id: 'quiz', label: 'Quiz (envios e respostas)', count: quizEnvios.filter(q => q.status === 'respondido').length }, { id: 'agenda', label: 'Agendamentos e tarefas' }]} />

      {aba === 'atendimentos' && (
        <div>
          <div style={{ marginBottom: 14 }}>{!novo ? <BtnPrimary onClick={() => setNovo({ cliente_id: '', tipo: TIPO_PADRAO, descricao: '' })}>+ Novo atendimento</BtnPrimary> : (
            <Card style={{ background: '#fffdf7' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SeletorCliente clientes={clientes} value={novo.cliente_id} onChange={v => setNovo(n => ({ ...n, cliente_id: v }))} onCadastrar={() => onNavegar?.('clientes')} />
                <Campo label="Tipo de atendimento" value={novo.tipo} onChange={v => setNovo(n => ({ ...n, tipo: v }))} options={opcoesTipo(novo.tipo)} />
              </div>
              <Campo label="Do que se trata (opcional)" value={novo.descricao} onChange={v => setNovo(n => ({ ...n, descricao: v }))} />
              <div style={{ display: 'flex', gap: 8 }}><BtnPrimary disabled={!!ocupado} onClick={criarAtendimento}>{ocupado === 'novo' ? 'Abrindo...' : 'Abrir atendimento'}</BtnPrimary><BtnSecondary onClick={() => setNovo(null)}>Cancelar</BtnSecondary></div>
            </Card>)}</div>
          {emAtendimento.length === 0 && <div style={{ color: '#9ca3af' }}>Nenhum atendimento em andamento.</div>}
          {emAtendimento.map(o => {
            const c = cli(o.cliente_id); const s = statusChecklist({ os: o, agenda, quizEnvios });
            return (
              <Card key={o.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div><strong>{o.numero}</strong> · {c?.nome || '—'} <span style={{ color: '#9ca3af', fontSize: 12 }}>{o.descricao}</span></div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge label={ROTULO_ETAPA[o.status] || o.status} color="#c4a45a" />
                    <Badge label={s.agendado ? 'Agendado' : 'Sem horário'} color={s.agendado ? '#16a34a' : '#9ca3af'} />
                    {s.precisaQuiz && <Badge label={s.respondeu ? 'Quiz respondido' : s.quiz ? 'Quiz enviado' : 'Quiz pendente'} color={s.respondeu ? '#16a34a' : '#f59e0b'} />}
                    <Badge label={s.pago ? 'Pago' : 'Pagamento pendente'} color={s.pago ? '#16a34a' : '#f59e0b'} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'end', marginTop: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 220 }}><Campo label="Tipo de atendimento" value={o.tipo_atendimento || 'completo'} onChange={v => v && mudarTipo(o, v)} options={opcoesTipo(o.tipo_atendimento || 'completo')} /></div>
                  <div style={{ marginBottom: 14 }}><BtnSecondary small onClick={() => setAberta(aberta === o.id ? null : o.id)}>{aberta === o.id ? 'Fechar passos' : 'Pagamento, quiz e confirmações'}</BtnSecondary></div>
                  {s.pronta && <div style={{ marginBottom: 14 }}><BtnPrimary small onClick={() => onNavegar('consultoria')}>Ir para a consultoria</BtnPrimary></div>}
                </div>
                {aberta === o.id && <ChecklistAtendimento os={o} cliente={c} agenda={agenda} quizEnvios={quizEnvios} onRecarregar={onRecarregar} onNavegar={onNavegar} />}
              </Card>);
          })}
        </div>
      )}

      {aba === 'quiz' && (
        <div>
          {precisamQuiz.length > 0 && (
            <Card style={{ marginBottom: 16, background: '#fffdf7' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Ainda sem quiz enviado</h3>
              {precisamQuiz.map(o => <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14 }}>{o.numero} · {cli(o.cliente_id)?.nome} <span style={{ color: '#9ca3af', fontSize: 12 }}>({tipoDaOS(o).label})</span></span>
                <BtnPrimary small disabled={!!ocupado || !cli(o.cliente_id)?.telefone} onClick={() => enviarQuiz(o)}>{ocupado === 'q' + o.id ? 'Enviando...' : 'Enviar quiz'}</BtnPrimary></div>)}
            </Card>)}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[['todos', 'Todos'], ['aguardando', 'Aguardando resposta'], ['respondidos', 'Respondidos']].map(([k, l]) => <button key={k} onClick={() => setFiltroQuiz(k)} style={{ border: '1px solid #d1d5db', borderRadius: 16, padding: '4px 12px', background: filtroQuiz === k ? '#111' : '#fff', color: filtroQuiz === k ? '#c4a45a' : '#374151', fontSize: 12, cursor: 'pointer' }}>{l}</button>)}
          </div>
          {quizzes.length === 0 && <div style={{ color: '#9ca3af' }}>Nenhum quiz por aqui.</div>}
          {quizzes.map(q => {
            const o = os.find(x => x.id === q.ordem_servico_id); const c = cli(q.cliente_id) || cli(o?.cliente_id); const [rot, cor] = STATUS_QUIZ[q.status] || STATUS_QUIZ.criado;
            return (
              <Card key={q.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div><strong>{c?.nome || q.nome_cliente || '—'}</strong> {o && <span style={{ color: '#6b7280', fontSize: 13 }}>· {o.numero} · {tipoDaOS(o).label}</span>}
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Criado {fmtDateTime(q.criado_em)}{q.enviado_em ? ' · enviado ' + fmtDateTime(q.enviado_em) : ' · ainda não enviado'}{q.respondido_em ? ' · respondido ' + fmtDateTime(q.respondido_em) : ''}</div></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge label={rot} color={cor} />
                    {q.status !== 'respondido' && o && <BtnSecondary small disabled={!!ocupado} onClick={() => enviarQuiz(o)}>{q.enviado_em ? 'Reenviar' : 'Enviar'} pelo WhatsApp</BtnSecondary>}
                    {q.token && <BtnSecondary small onClick={() => copiar(q)}>Copiar link</BtnSecondary>}
                    {q.status === 'respondido' && <BtnPrimary small onClick={() => setVerResp(verResp === q.id ? null : q.id)}>{verResp === q.id ? 'Fechar respostas' : 'Ver respostas'}</BtnPrimary>}
                  </div>
                </div>
                {verResp === q.id && <div style={{ marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}><BriefingQuiz respostas={q.respostas} /></div>}
              </Card>);
          })}
        </div>
      )}

      {aba === 'agenda' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Redes e canais</h3>
            {[['whatsapp', 'WhatsApp', '#25D366'], ['instagram', 'Instagram', '#E1306C'], ['facebook', 'Facebook', '#1877F2'], ['tiktok', 'TikTok', '#111']].map(([id, nome, cor]) => { const c = canais.find(x => x.canal === id) || {}; const ok = c.status === 'conectado'; return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <span><b style={{ color: cor }}>●</b> {nome}{c.identificador ? <span style={{ color: '#9ca3af' }}> · {c.identificador}</span> : null}</span>
                {ok ? <Badge label="Conectado" color="#22c55e" /> : <button onClick={() => onNavegar('central')} style={{ border: '1px solid #c4a45a', background: '#fffdf7', color: '#92400e', borderRadius: 6, padding: '2px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Conectar</button>}
              </div>); })}
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>"Conectar" abre a Central de Atendimento → aba Canais, com o passo a passo.</div></Card>
          <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Próximos agendamentos</h3>
            {proximos.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>Nada agendado.</div>}
            {proximos.map(a => <div key={a.id} style={{ fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}><strong>{fmtDateTime(a.data_hora)}</strong> · {a.titulo || cli(a.cliente_id)?.nome} <Badge label={a.status || 'agendado'} color="#6b7280" /></div>)}
            <div style={{ marginTop: 10 }}><BtnPrimary small onClick={() => onNavegar('agenda')}>Abrir Agenda e Tarefas</BtnPrimary></div></Card>
          <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Tarefas do atendimento</h3>
            {abertas.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>Nenhuma tarefa aberta.</div>}
            {abertas.map(t => <div key={t.id} style={{ fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>{t.titulo}{t.prazo ? <span style={{ color: '#9ca3af' }}> · prazo {new Date(t.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}</span> : null}</div>)}
            <div style={{ marginTop: 10 }}><BtnSecondary small onClick={() => onNavegar('agenda')}>Abrir tarefas</BtnSecondary></div></Card>
        </div>
      )}
    </div>
  );
}
