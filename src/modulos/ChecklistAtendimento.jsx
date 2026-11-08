import { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { enviarWhatsApp, msgConfirmacaoEvento, whatsappConfigurado } from '../lib/whatsapp.js';
import { enviarQuizPorWhatsApp } from '../lib/api.js';
import { tipoDaOS } from './tiposAtendimento.js';
import { Badge, Card, BtnPrimary, BtnSecondary, Campo, Aviso, fmtDateTime, erroDeSchema } from './ui.jsx';

// Checklist do atendimento de uma OS: agendou → confirmou o horário → quiz → pagamento da consultoria → vídeo.
// Cada passo tem o botão que dispara a mensagem pelo WhatsApp e o status fica salvo na OS/agenda/quiz,
// então aparece na ficha da cliente e na Consultoria.

const TIPOS_CONSULTORIA = ['consultoria_express', 'personal_stylist'];
const primeiroNome = (n) => (n || '').split(' ')[0] || 'tudo bem';
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Passo({ ok, titulo, detalhe, children }) {
return (
  <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: '1px solid #f3f4f6' }}>
    <div style={{ width: 24, height: 24, borderRadius: 12, flexShrink: 0, background: ok ? '#22c55e' : '#e5e7eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{ok ? '✓' : ''}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{titulo}</div>
      {detalhe && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{detalhe}</div>}
      {children && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  </div>
);
}

export function statusChecklist({ os, agenda, quizEnvios }) {
  const ev = (agenda || []).filter(a => a.ordem_servico_id === os.id && TIPOS_CONSULTORIA.includes(a.tipo) && a.status !== 'cancelado')
    .sort((x, y) => new Date(y.data_hora) - new Date(x.data_hora))[0] || null;
  const quiz = (quizEnvios || []).filter(q => q.ordem_servico_id === os.id).sort((x, y) => new Date(y.criado_em) - new Date(x.criado_em))[0] || null;
  const agendado = !!ev;
  const confirmado = ev?.status === 'confirmado' || ev?.status === 'realizado';
  const precisaQuiz = tipoDaOS(os).quiz;
  const respondeu = !precisaQuiz || quiz?.status === 'respondido';
  const pago = !tipoDaOS(os).cobra || os.pagamento_status === 'pago';
  return { ev, quiz, precisaQuiz, agendado, confirmado, respondeu, pago, pronta: agendado && confirmado && respondeu && pago };
}

export default function ChecklistAtendimento({ os, cliente, agenda, quizEnvios, onRecarregar, onNavegar }) {
  const s = statusChecklist({ os, agenda, quizEnvios });
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [valor, setValor] = useState(os.consultoria_valor ?? (tipoDaOS(os).preco || ''));
  const [linkPg, setLinkPg] = useState(os.link_pagamento || '');
  const [meet, setMeet] = useState(os.link_meet || s.ev?.link_meet || '');

  const tel = cliente?.telefone;
  const semZap = !whatsappConfigurado() || !tel;
  const msgErro = (e) => erroDeSchema(e) ? 'O banco ainda não tem as colunas do checklist (migração 20261103000000). (' + e.message + ')' : (e.message || String(e));

  async function executar(chave, fn) {
    setOcupado(chave); setErro(''); setAviso('');
    try { const msg = await fn(); await onRecarregar(); if (msg) setAviso(msg); }
    catch (e) { setErro(e.message || String(e)); }
    setOcupado('');
  }
  async function enviar(mensagem) {
    const r = await enviarWhatsApp({ telefone: tel, nome: cliente?.nome, mensagem });
    if (!r.ok) throw new Error(r.erro);
  }

  const enviarConfirmacao = () => executar('conf', async () => {
    if (!s.ev) throw new Error('Agende o horário primeiro.');
    const msg = msgConfirmacaoEvento({ nomeCliente: cliente?.nome, tipoLabel: 'consultoria', data: s.ev.data_hora, local: s.ev.local, linkMeet: s.ev.link_meet || meet });
    await enviar(msg);
    const { error } = await supabase.from('agenda').update({ confirmacao_enviada_em: new Date().toISOString(), confirmacao_mensagem: msg, status: 'aguardando_confirmacao' }).eq('id', s.ev.id);
    if (error) throw new Error(msgErro(error));
    return 'Confirmação de horário enviada.';
  });
  const marcarConfirmado = () => executar('conf2', async () => {
    const { error } = await supabase.from('agenda').update({ status: 'confirmado', confirmado_em: new Date().toISOString() }).eq('id', s.ev.id);
    if (error) throw new Error(msgErro(error));
    return 'Horário marcado como confirmado.';
  });
  const enviarQuiz = () => executar('quiz', async () => {
    const r = await enviarQuizPorWhatsApp({ cliente, os });
    if (r.error) throw new Error(r.error);
    return 'Link do quiz enviado.';
  });
  const salvarPagamento = async () => {
    const { error } = await supabase.from('ordens_servico').update({ consultoria_valor: valor === '' ? null : Number(valor), link_pagamento: linkPg || null }).eq('id', os.id);
    if (error) throw new Error(msgErro(error));
  };
  const enviarPagamento = () => executar('pg', async () => {
    if (!linkPg.trim()) throw new Error('Cole o link de pagamento da consultoria.');
    await salvarPagamento();
    const v = valor !== '' ? ` (${brl(valor)})` : '';
    await enviar(`Olá, ${primeiroNome(cliente?.nome)}! Para reservar o seu horário ${tipoDaOS(os).pagamento}${v}, segue o link de pagamento:\n\n${linkPg.trim()}\n\nAssim que o pagamento for confirmado eu libero tudo por aqui. Qualquer dúvida é só chamar!`);
    const { error } = await supabase.from('ordens_servico').update({ pagamento_status: 'link_enviado', pagamento_link_enviado_em: new Date().toISOString() }).eq('id', os.id);
    if (error) throw new Error(msgErro(error));
    return 'Link de pagamento enviado.';
  });
  const marcarPago = () => executar('pago', async () => {
    await salvarPagamento();
    const { error } = await supabase.from('ordens_servico').update({ pagamento_status: 'pago', pago_em: new Date().toISOString() }).eq('id', os.id);
    if (error) throw new Error(msgErro(error));
    return 'Pagamento da consultoria marcado como recebido.';
  });
  const desfazerPago = () => executar('pago', async () => {
    const { error } = await supabase.from('ordens_servico').update({ pagamento_status: os.pagamento_link_enviado_em ? 'link_enviado' : 'pendente', pago_em: null }).eq('id', os.id);
    if (error) throw new Error(msgErro(error));
  });
  const enviarMeet = () => executar('meet', async () => {
    if (!meet.trim()) throw new Error('Cole o link da videoconferência.');
    const { error: e1 } = await supabase.from('ordens_servico').update({ link_meet: meet.trim() }).eq('id', os.id);
    if (e1) throw new Error(msgErro(e1));
    if (s.ev) await supabase.from('agenda').update({ link_meet: meet.trim() }).eq('id', s.ev.id);
    const quando = s.ev ? ` em ${new Date(s.ev.data_hora).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '';
    await enviar(`Olá, ${primeiroNome(cliente?.nome)}! Este é o link da nossa videoconferência${quando}:\n\n${meet.trim()}\n\nÉ só clicar no horário combinado. Até lá!`);
    const { error } = await supabase.from('ordens_servico').update({ meet_enviado_em: new Date().toISOString() }).eq('id', os.id);
    if (error) throw new Error(msgErro(error));
    return 'Link da videoconferência enviado.';
  });

  return (
    <Card style={{ marginTop: 10, background: '#fffdf7', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700 }}>Checklist do atendimento · {os.numero}</div>
        {s.pronta ? <Badge label="Pronta para o atendimento" color="#16a34a" /> : <Badge label="Faltam passos" color="#f59e0b" />}
      </div>
      {erro && <div style={{ marginTop: 10 }}><Aviso tipo="erro">{erro}</Aviso></div>}
      {aviso && <div style={{ marginTop: 10 }}><Aviso tipo="ok">{aviso}</Aviso></div>}
      {!tel && <div style={{ marginTop: 10 }}><Aviso tipo="atencao">Cadastre o telefone da cliente para disparar as mensagens.</Aviso></div>}
      {tel && !whatsappConfigurado() && <div style={{ marginTop: 10 }}><Aviso tipo="atencao">Envio por WhatsApp não configurado neste ambiente.</Aviso></div>}

      <Passo ok titulo="Cadastro da cliente" detalhe={cliente?.nome} />

      <Passo ok={s.agendado} titulo="Horário agendado" detalhe={s.ev ? fmtDateTime(s.ev.data_hora) : 'Ainda sem consultoria na agenda.'}>
        {!s.agendado && <BtnSecondary small onClick={() => onNavegar && onNavegar('agenda')}>Ir para a agenda</BtnSecondary>}
      </Passo>

      <Passo ok={s.confirmado} titulo="Cliente confirmou o horário" detalhe={s.ev?.confirmacao_enviada_em ? `Confirmação enviada em ${fmtDateTime(s.ev.confirmacao_enviada_em)}` : 'Confirmação ainda não enviada.'}>
        {s.agendado && !s.confirmado && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <BtnPrimary small disabled={semZap || !!ocupado} onClick={enviarConfirmacao}>{ocupado === 'conf' ? 'Enviando...' : s.ev?.confirmacao_enviada_em ? 'Reenviar confirmação' : 'Enviar confirmação'}</BtnPrimary>
            <BtnSecondary small disabled={!!ocupado} onClick={marcarConfirmado}>Ela confirmou</BtnSecondary>
          </div>
        )}
      </Passo>

      {s.precisaQuiz && <Passo ok={s.respondeu} titulo="Quiz respondido" detalhe={s.quiz ? (s.respondeu ? `Respondido em ${fmtDateTime(s.quiz.respondido_em)}` : s.quiz.status === 'enviado' ? `Enviado em ${fmtDateTime(s.quiz.enviado_em)}, aguardando resposta` : 'Link criado, ainda não enviado') : 'Quiz ainda não enviado.'}>
        {!s.respondeu && <BtnPrimary small disabled={semZap || !!ocupado} onClick={enviarQuiz}>{ocupado === 'quiz' ? 'Enviando...' : s.quiz ? 'Reenviar quiz' : 'Enviar quiz'}</BtnPrimary>}
      </Passo>}

      {tipoDaOS(os).cobra && <Passo ok={s.pago} titulo={`Pagamento ${tipoDaOS(os).pagamento}`} detalhe={s.pago ? `Recebido em ${fmtDateTime(os.pago_em)}` : os.pagamento_status === 'link_enviado' ? `Link enviado em ${fmtDateTime(os.pagamento_link_enviado_em)}, aguardando pagamento` : 'Link de pagamento ainda não enviado.'}>
        {!s.pago ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
              <Campo label="Valor (R$)" type="number" value={valor} onChange={setValor} />
              <Campo label="Link de pagamento" value={linkPg} onChange={setLinkPg} placeholder="https://pay.cakto.com.br/..." />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <BtnPrimary small disabled={semZap || !!ocupado} onClick={enviarPagamento}>{ocupado === 'pg' ? 'Enviando...' : os.pagamento_status === 'link_enviado' ? 'Reenviar link' : 'Enviar link de pagamento'}</BtnPrimary>
              <BtnSecondary small disabled={!!ocupado} onClick={marcarPago}>Marcar como pago</BtnSecondary>
            </div>
          </div>
        ) : <BtnSecondary small disabled={!!ocupado} onClick={desfazerPago}>Desfazer pagamento</BtnSecondary>}
     </Passo>}

      <Passo ok={!!os.meet_enviado_em} titulo="Link da videoconferência" detalhe={os.meet_enviado_em ? `Enviado em ${fmtDateTime(os.meet_enviado_em)}` : 'Ainda não enviado.'}>
        <Campo label="Link (Meet/Zoom)" value={meet} onChange={setMeet} placeholder="https://meet.google.com/..." />
        <BtnPrimary small disabled={semZap || !!ocupado} onClick={enviarMeet}>{ocupado === 'meet' ? 'Enviando...' : os.meet_enviado_em ? 'Reenviar link' : 'Enviar link da videoconferência'}</BtnPrimary>
      </Passo>

      {s.pronta && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
          <BtnPrimary onClick={() => onNavegar && onNavegar('consultoria')}>Abrir a consultoria</BtnPrimary>
        </div>
      )}
    </Card>
  );
}
