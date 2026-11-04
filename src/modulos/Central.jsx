import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { enviarWhatsApp, whatsappConfigurado } from '../lib/whatsapp.js';
import { converterLead } from '../lib/api.js';
import { Badge, Card, BtnPrimary, BtnSecondary, BtnDanger, TabBar, Drawer, Campo, Aviso, fmtDate, erroDeSchema } from './ui.jsx';

const digitos = (t) => String(t || '').replace(/\D/g, '');
const mesmoTel = (a, b) => { const x = digitos(a), y = digitos(b); return x.length >= 8 && y.length >= 8 && x.slice(-9) === y.slice(-9); };
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261102000000 no Supabase (tabela/coluna ainda não existe). ' + e.message : (e.message || String(e));
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const CANAIS = [
  { id: 'whatsapp', nome: 'WhatsApp', cor: '#25D366', icone: '💬' },
  { id: 'instagram', nome: 'Instagram', cor: '#E1306C', icone: '📷' },
  { id: 'facebook', nome: 'Facebook', cor: '#1877F2', icone: '👍' },
  { id: 'tiktok', nome: 'TikTok', cor: '#111111', icone: '🎵' },
];
const iconeCanal = (id) => (CANAIS.find(c => c.id === (id || 'whatsapp')) || CANAIS[0]);
const STATUS_CONVERSA = { lead_novo: ['Lead novo', '#f59e0b'], cliente: ['Cliente', '#16a34a'], lead: ['Lead', '#6366f1'] };
const STATUS_LEAD = { novo: ['Novo', '#f59e0b'], qualificando: ['Qualificando', '#6366f1'], convertido: ['Convertido', '#22c55e'], perdido: ['Perdido', '#6b7280'] };
const CATEGORIAS_BASE = [
  ['servicos_precos', 'Serviços e preços'], ['horarios_endereco', 'Horários e endereço'], ['pagamento', 'Formas de pagamento'],
  ['prazos_politicas', 'Prazos e políticas'], ['faq', 'Perguntas frequentes'], ['tom_de_voz', 'Tom de voz'], ['passar_para_juliana', 'Quando chamar a Juliana'], ['geral', 'Geral'],
];
const COMO_CONECTAR = {
  whatsapp: 'O envio e o recebimento passam pelo n8n (workflows da Júlia e "CRM Envia WhatsApp"). Para trocar de número, reconecte a instância (QR code) no provedor de WhatsApp configurado no n8n. O status abaixo é calculado pelas mensagens que chegaram nos últimos 7 dias.',
  instagram: 'Precisa de: conta Instagram profissional ligada a uma Página do Facebook; um app no Meta for Developers com as permissões de mensagens (instagram_manage_messages e pages_messaging) em modo ao vivo; e o token da Página guardado nas credenciais do n8n. Com isso criamos o fluxo que grava as DMs aqui (canal = instagram). Preencha o @ abaixo e marque como conectado quando o fluxo estiver rodando.',
  facebook: 'Mesmo app Meta do Instagram: permissão pages_messaging na Página, token da Página nas credenciais do n8n e webhook de mensagens apontando para o n8n. Informe o nome/ID da Página abaixo.',
  tiktok: 'O TikTok só libera mensagens por API para contas Business aprovadas e depende da disponibilidade no seu país — confirme no TikTok for Business antes. Alternativa que funciona hoje: usar formulário de captação de leads do TikTok Ads enviando para um webhook do n8n, que cria o lead aqui.',
};

export default function Central({ conversas, leads, agenda, tarefas, clientes, os, quizEnvios = [], servicos, respostas, conhecimento, canais, promptPrincipal, bancoPendente, onRecarregar, onNavegar }) {
  const [aba, setAba] = useState('painel');
  const [canalSel, setCanalSel] = useState('whatsapp');
  const [convSel, setConvSel] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [mensagens, setMensagens] = useState([]);
  const [juliaAtiva, setJuliaAtiva] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [mostrarAtalhos, setMostrarAtalhos] = useState(false);
  const fimRef = useRef(null);

  const [formLead, setFormLead] = useState(null);
  const [respEdit, setRespEdit] = useState(null);
  const [baseEdit, setBaseEdit] = useState(null);
  const [instrucoes, setInstrucoes] = useState(promptPrincipal?.conteudo || '');
  const [previa, setPrevia] = useState(false);
  const [canalForm, setCanalForm] = useState({});
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { setInstrucoes(promptPrincipal?.conteudo || ''); }, [promptPrincipal?.conteudo]);

  const statusDe = (c) => {
    if (clientes.some(x => mesmoTel(x.telefone, c.telefone))) return 'cliente';
    if (leads.some(l => mesmoTel(l.telefone, c.telefone) && l.status !== 'perdido')) return 'lead';
    return 'lead_novo';
  };
  const conversasCanal = useMemo(() => conversas.filter(c => (c.canal || 'whatsapp') === canalSel), [conversas, canalSel]);
  const convsFiltradas = conversasCanal.filter(c => {
    const s = statusDe(c);
    if (filtro === 'leads') return s !== 'cliente';
    if (filtro === 'clientes') return s === 'cliente';
    if (filtro === 'sem_resposta') return c.nao_lidas > 0;
    return true;
  });
  const naoLidasTotal = conversas.filter(c => c.nao_lidas > 0).length;

  // ───── conversa aberta ─────
  useEffect(() => {
    if (!convSel?.telefone) { setMensagens([]); return; }
    let vivo = true;
    async function carregar() {
      const { data: msgs } = await supabase.from('conversas_whatsapp').select('*').eq('phone', convSel.telefone).order('created_at', { ascending: true });
      if (vivo) setMensagens(msgs || []);
      await supabase.from('conversas_whatsapp').update({ lida: true }).eq('phone', convSel.telefone).eq('direcao', 'in').eq('lida', false);
      const { data: st } = await supabase.from('atendimento_whatsapp').select('julia_ativa').eq('phone', convSel.telefone).maybeSingle();
      if (vivo) setJuliaAtiva(st ? st.julia_ativa !== false : true);
    }
    carregar();
    const canal = supabase.channel(`central_conv_${convSel.telefone}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversas_whatsapp', filter: `phone=eq.${convSel.telefone}` }, carregar).subscribe();
    return () => { vivo = false; supabase.removeChannel(canal); };
  }, [convSel?.telefone]);
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [mensagens.length, convSel?.telefone]);

  async function alternarJulia() {
    const novo = !juliaAtiva; setJuliaAtiva(novo);
    await supabase.from('atendimento_whatsapp').upsert({ phone: convSel.telefone, nome: convSel.nome, julia_ativa: novo }, { onConflict: 'phone' });
  }
  async function enviarMensagem() {
    const msg = texto.trim();
    if (!msg || !convSel?.telefone || enviando) return;
    setEnviando(true); setErro('');
    const r = await enviarWhatsApp({ telefone: convSel.telefone, nome: convSel.nome, mensagem: msg });
    setEnviando(false);
    if (!r.ok) { setErro(r.erro + ' A mensagem continua no campo.'); return; }
    setTexto(''); setJuliaAtiva(false);
  }

  // ───── leads ─────
  async function salvarLead() {
    if (!formLead.nome?.trim()) { setErro('Informe o nome.'); return; }
    setOcupado(true); setErro('');
    const { id, ...campos } = formLead;
    const limpo = Object.fromEntries(Object.entries({ ...campos, nome: campos.nome.trim(), data_evento: campos.data_evento || null }).filter(([, v]) => v !== '' && v !== undefined));
    const { error } = id ? await supabase.from('leads').update(limpo).eq('id', id) : await supabase.from('leads').insert({ status: 'novo', ...limpo });
    setOcupado(false);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setFormLead(null); setAviso('Lead salvo.');
  }
  async function mudarStatusLead(l, status) {
    const { error } = await supabase.from('leads').update({ status }).eq('id', l.id);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar();
  }
  async function virarCliente(l) {
    if (!window.confirm(`Cadastrar ${l.nome} como cliente e abrir uma OS no fluxo de atendimento?`)) return;
    setOcupado(true); setErro(''); setAviso('');
    const r = await converterLead({ lead: l, listaOS: os, abrirOS: true });
    setOcupado(false);
    await onRecarregar();
    if (r.error) { setErro(msgErro(r.error)); return; }
    setAviso(`${l.nome} agora é cliente e a OS ${r.os?.numero || ''} entrou no Fluxo de Atendimento.`);
    onNavegar?.('fluxo');
  }
  function leadDaConversa(c) {
    setFormLead({ nome: c.nome && c.nome !== c.telefone ? c.nome : '', telefone: c.telefone, origem: c.canal || 'whatsapp', instagram: '', procura: '', ocasiao: '', data_evento: '', servico_interesse: '' });
  }

  // ───── respostas automáticas ─────
  async function salvarResposta() {
    if (!respEdit.titulo?.trim() || !respEdit.resposta?.trim()) { setErro('Preencha título e resposta.'); return; }
    setOcupado(true); setErro('');
    const linha = { titulo: respEdit.titulo.trim(), resposta: respEdit.resposta, palavras_chave: String(respEdit.palavras || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean), canais: respEdit.canais?.length ? respEdit.canais : ['whatsapp'], ativa: respEdit.ativa !== false, ordem: Number(respEdit.ordem) || 0, updated_at: new Date().toISOString() };
    const { error } = respEdit.id ? await supabase.from('respostas_automaticas').update(linha).eq('id', respEdit.id) : await supabase.from('respostas_automaticas').insert(linha);
    setOcupado(false);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setRespEdit(null);
  }
  async function excluirResposta() {
    if (!window.confirm('Excluir esta resposta?')) return;
    const { error } = await supabase.from('respostas_automaticas').delete().eq('id', respEdit.id);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setRespEdit(null);
  }

  // ───── base da Júlia ─────
  async function salvarBase() {
    if (!baseEdit.titulo?.trim() || !baseEdit.conteudo?.trim()) { setErro('Preencha título e conteúdo.'); return; }
    setOcupado(true); setErro('');
    const linha = { categoria: baseEdit.categoria || 'geral', titulo: baseEdit.titulo.trim(), conteudo: baseEdit.conteudo, ativo: baseEdit.ativo !== false, updated_at: new Date().toISOString() };
    const { error } = baseEdit.id ? await supabase.from('conhecimento_julia').update(linha).eq('id', baseEdit.id) : await supabase.from('conhecimento_julia').insert(linha);
    setOcupado(false);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setBaseEdit(null);
  }
  async function excluirBase() {
    if (!window.confirm('Excluir esta informação da base?')) return;
    const { error } = await supabase.from('conhecimento_julia').delete().eq('id', baseEdit.id);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setBaseEdit(null);
  }
  async function salvarInstrucoes() {
    setOcupado(true); setErro(''); setAviso('');
    const { error } = promptPrincipal?.id
      ? await supabase.from('prompts_ia').update({ conteudo: instrucoes }).eq('id', promptPrincipal.id)
      : await supabase.from('prompts_ia').insert({ nome: 'julia_instrucoes_principais', conteudo: instrucoes, ativo: true });
    setOcupado(false);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setAviso('Instruções da Júlia salvas.');
  }
  const textoBase = useMemo(() => {
    const ativos = conhecimento.filter(k => k.ativo !== false);
    const blocos = CATEGORIAS_BASE.map(([id, nome]) => {
      const itens = ativos.filter(k => (k.categoria || 'geral') === id);
      return itens.length ? `## ${nome}\n` + itens.map(k => `### ${k.titulo}\n${k.conteudo}`).join('\n\n') : '';
    }).filter(Boolean);
    return [instrucoes ? `# Instruções principais\n${instrucoes}` : '', ...blocos].filter(Boolean).join('\n\n');
  }, [conhecimento, instrucoes]);

  // ───── canais ─────
  const canalDoBanco = (id) => canais.find(c => c.canal === id) || { canal: id };
  const ultimaMsgWhats = conversas.filter(c => (c.canal || 'whatsapp') === 'whatsapp').map(c => c.ultima_em).filter(Boolean).sort().pop();
  const whatsRecente = ultimaMsgWhats && Date.now() - new Date(ultimaMsgWhats).getTime() < 7 * 86400000;
  async function salvarCanal(id) {
    const f = { ...canalDoBanco(id), ...(canalForm[id] || {}) };
    setOcupado(true); setErro(''); setAviso('');
    const { error } = await supabase.from('canais_conexao').upsert({ canal: id, identificador: f.identificador || null, nome_exibicao: f.nome_exibicao || null, status: f.status || 'pendente', observacoes: f.observacoes || null, updated_at: new Date().toISOString() }, { onConflict: 'canal' });
    setOcupado(false);
    if (error) { setErro(msgErro(error)); return; }
    await onRecarregar(); setCanalForm(p => ({ ...p, [id]: undefined })); setAviso('Canal salvo.');
  }

  // ───── painel ─────
  const hoje = new Date();
  const eventosHoje = agenda.filter(a => a.data_hora && new Date(a.data_hora).toDateString() === hoje.toDateString() && a.status !== 'cancelado').sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  const pendentes = tarefas.filter(t => t.status !== 'concluida');
  const atrasadas = pendentes.filter(t => t.prazo && new Date(t.prazo + 'T23:59:59') < hoje);
  const leadsNovos = leads.filter(l => (l.status || 'novo') === 'novo');
  const aguardandoConfirmacao = agenda.filter(a => a.status === 'aguardando_confirmacao');
  const quizAguardando = quizEnvios.filter(q => q.status === 'enviado');
  const nomeCli = (id) => clientes.find(c => c.id === id)?.nome;
  const atalhosCard = (n, label, cor, onClick) => (
    <Card onClick={onClick} style={{ borderLeft: `4px solid ${cor}`, cursor: onClick ? 'pointer' : 'default', padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: cor }}>{n}</div>
      <div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div>
    </Card>
  );
  const lista = (itens, vazio) => itens.length ? itens : <div style={{ color: '#9ca3af', fontSize: 13 }}>{vazio}</div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Central de Atendimento</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Conversas, leads, agenda e tudo que a Júlia precisa saber</p>
      </div>
      {bancoPendente && <Aviso tipo="atencao"><b>Falta uma etapa no banco:</b> aplique o arquivo <code>supabase/migrations/20261102000000_central_agenda_clientes_quiz.sql</code> no Supabase para liberar canais, respostas automáticas, base da Júlia, tarefas e o quiz. Enquanto isso essas telas ficam vazias.</Aviso>}
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro} <button onClick={() => setErro('')} style={{ marginLeft: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}>fechar</button></Aviso>}

      <TabBar active={aba} onChange={setAba} tabs={[
        { id: 'painel', label: 'Painel' }, { id: 'conversas', label: 'Conversas', count: naoLidasTotal }, { id: 'leads', label: 'Leads', count: leadsNovos.length },
        { id: 'canais', label: 'Canais' }, { id: 'respostas', label: 'Respostas automáticas' }, { id: 'base', label: 'Base da Júlia' },
      ]} />

      {/* ═════ PAINEL ═════ */}
      {aba === 'painel' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
            {atalhosCard(naoLidasTotal, 'Conversas aguardando você', '#f59e0b', () => { setAba('conversas'); setFiltro('sem_resposta'); })}
            {atalhosCard(leadsNovos.length, 'Leads novos', '#6366f1', () => setAba('leads'))}
            {atalhosCard(eventosHoje.length, 'Compromissos hoje', '#c4a45a', () => onNavegar?.('agenda'))}
            {atalhosCard(aguardandoConfirmacao.length, 'Aguardando confirmação', '#3b82f6', () => onNavegar?.('agenda'))}
            {atalhosCard(pendentes.length, `Tarefas pendentes${atrasadas.length ? ` (${atrasadas.length} atrasadas)` : ''}`, atrasadas.length ? '#ef4444' : '#16a34a', () => onNavegar?.('agenda'))}
            {atalhosCard(quizAguardando.length, 'Quiz enviado sem resposta', '#8b5cf6', () => onNavegar?.('consultoria'))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Card>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Conversas aguardando você</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lista(conversas.filter(c => c.nao_lidas > 0).slice(0, 6).map(c => (
                  <div key={c.id} onClick={() => { setCanalSel(c.canal || 'whatsapp'); setAba('conversas'); setConvSel(c); }} style={{ cursor: 'pointer', padding: '8px 10px', background: '#fef9f0', borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· {c.tempo}</span></div>
                    <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ultima_msg}</div>
                  </div>
                )), 'Tudo respondido.')}
              </div>
            </Card>
            <Card>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Agenda de hoje</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lista(eventosHoje.map(a => (
                  <div key={a.id} style={{ padding: '8px 10px', background: '#f9fafb', borderRadius: 6, fontSize: 13 }}>
                    <b>{hora(a.data_hora)}</b> · {nomeCli(a.cliente_id) || a.titulo || a.tipo} <Badge label={a.status === 'confirmado' ? 'Confirmado' : a.status === 'aguardando_confirmacao' ? 'Aguardando' : 'Agendado'} color={a.status === 'confirmado' ? '#22c55e' : '#f59e0b'} />
                  </div>
                )), 'Nada agendado para hoje.')}
              </div>
            </Card>
            <Card>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Tarefas para cuidar</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lista([...atrasadas, ...pendentes.filter(t => !atrasadas.includes(t))].slice(0, 6).map(t => (
                  <div key={t.id} style={{ padding: '8px 10px', background: atrasadas.includes(t) ? '#fef2f2' : '#f9fafb', borderRadius: 6, fontSize: 13 }}>
                    {t.titulo} <span style={{ color: atrasadas.includes(t) ? '#dc2626' : '#9ca3af' }}>· {fmtDate(t.prazo)}</span>
                  </div>
                )), 'Nenhuma tarefa pendente.')}
              </div>
            </Card>
            <Card>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Leads novos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lista(leadsNovos.slice(0, 6).map(l => (
                  <div key={l.id} style={{ padding: '8px 10px', background: '#f9fafb', borderRadius: 6, fontSize: 13 }}>
                    <b>{l.nome}</b> <span style={{ color: '#9ca3af' }}>· {l.ocasiao || l.procura || l.origem || 'sem detalhes'}</span>
                  </div>
                )), 'Nenhum lead novo.')}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ═════ CONVERSAS ═════ */}
      {aba === 'conversas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {CANAIS.map(c => {
                const n = conversas.filter(x => (x.canal || 'whatsapp') === c.id).length;
                return <button key={c.id} onClick={() => { setCanalSel(c.id); setConvSel(null); }} style={{ flex: '1 1 70px', padding: '7px 4px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', background: canalSel === c.id ? c.cor : '#f3f4f6', color: canalSel === c.id ? '#fff' : '#374151' }}>{c.icone} {c.nome}{n > 0 ? ` (${n})` : ''}</button>;
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[['todos', 'Todos'], ['leads', 'Leads'], ['clientes', 'Clientes'], ['sem_resposta', 'Sem resposta']].map(([f, l]) => (
                <button key={f} onClick={() => setFiltro(f)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filtro === f ? '#111' : '#f3f4f6', color: filtro === f ? '#fff' : '#374151', border: 'none' }}>{l}</button>
              ))}
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff', maxHeight: '65vh', overflowY: 'auto' }}>
              {convsFiltradas.map((c, i) => {
                const [rot, cor] = STATUS_CONVERSA[statusDe(c)];
                return (
                  <div key={c.id} onClick={() => { setConvSel(c); setErro(''); setTexto(''); }} style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: i < convsFiltradas.length - 1 ? '1px solid #f3f4f6' : 'none', background: convSel?.id === c.id ? '#fef9f0' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}><span title={iconeCanal(c.canal).nome} style={{ marginRight: 6 }}>{iconeCanal(c.canal).icone}</span>{c.nome}</span>
                      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{c.tempo}</span>
                        {c.nao_lidas > 0 && <span style={{ background: '#c4a45a', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{c.nao_lidas}</span>}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ultima_msg}</div>
                    <Badge label={rot} color={cor} />
                  </div>
                );
              })}
              {convsFiltradas.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  {canalSel === 'whatsapp' ? 'Nenhuma conversa neste filtro.' : <>Nenhuma conversa de {CANAIS.find(c => c.id === canalSel).nome} ainda. <br /><button onClick={() => setAba('canais')} style={{ marginTop: 8, border: 'none', background: 'none', color: '#c4a45a', textDecoration: 'underline', cursor: 'pointer' }}>Ver como conectar</button></>}
                </div>
              )}
            </div>
          </div>

          <div>
            {!convSel ? (
              <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Selecione uma conversa para ler, responder ou cadastrar a pessoa como lead/cliente.</Card>
            ) : (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}><span title={iconeCanal(convSel.canal).nome} style={{ marginRight: 8 }}>{iconeCanal(convSel.canal).icone}</span>{convSel.nome}</h3>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{convSel.telefone}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={alternarJulia} title="Liga/desliga o atendimento automático da Júlia nesta conversa" style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: juliaAtiva ? '#dcfce7' : '#fee2e2', color: juliaAtiva ? '#16a34a' : '#dc2626' }}>{juliaAtiva ? '🟢 Júlia ativa' : '🔴 Júlia pausada'}</button>
                    {(convSel.canal || 'whatsapp') === 'whatsapp' && <a href={`https://wa.me/${digitos(convSel.telefone)}`} target="_blank" rel="noreferrer"><BtnSecondary small>Abrir no WhatsApp</BtnSecondary></a>}
                    {statusDe(convSel) === 'lead_novo' && <BtnSecondary small onClick={() => leadDaConversa(convSel)}>Cadastrar lead</BtnSecondary>}
                    {statusDe(convSel) === 'lead' && <BtnPrimary small disabled={ocupado} onClick={() => virarCliente(leads.find(l => mesmoTel(l.telefone, convSel.telefone)))}>Virar cliente + abrir OS</BtnPrimary>}
                    {statusDe(convSel) === 'cliente' && <BtnSecondary small onClick={() => onNavegar?.('agenda')}>Agendar</BtnSecondary>}
                  </div>
                </div>

                <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14, minHeight: 220, maxHeight: '45vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mensagens.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>Sem mensagens registradas para este contato.</div>}
                  {mensagens.map(m => (
                    <div key={m.id} style={{ alignSelf: m.direcao === 'in' ? 'flex-start' : 'flex-end', background: m.direcao === 'in' ? '#fff' : (m.direcao === 'out_humano' ? '#fef3c7' : '#dcfce7'), border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', maxWidth: '80%', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {m.direcao !== 'in' && <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 2 }}>{m.direcao === 'out_humano' ? 'Você' : 'Júlia (IA)'}</div>}
                      {m.mensagem}
                      <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'right', marginTop: 2 }}>{hora(m.created_at)}</div>
                    </div>
                  ))}
                  <div ref={fimRef} />
                </div>

                {(convSel.canal || 'whatsapp') === 'whatsapp' ? (
                  <>
                    {!whatsappConfigurado() && <Aviso tipo="atencao">Envio ainda não configurado: falta <b>VITE_N8N_ENVIAR_URL</b> (e <b>VITE_N8N_ENVIAR_SECRET</b>) na Vercel. Veja o passo a passo no fim da conversa com o Claude.</Aviso>}
                    {mostrarAtalhos && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 10, maxHeight: 220, overflowY: 'auto', background: '#fff' }}>
                        {respostas.filter(r => r.ativa !== false).map(r => <div key={r.id} onClick={() => { setTexto(r.resposta); setMostrarAtalhos(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}><b>{r.titulo}</b><div style={{ color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.resposta}</div></div>)}
                        {servicos.map(s => <div key={s.id} onClick={() => { setTexto(`*${s.nome}*\n${s.descricao}\n\nInclui:\n${s.inclui.map(i => '• ' + i).join('\n')}\n\nInvestimento: ${s.faixa_preco}`); setMostrarAtalhos(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}><b>Serviço: {s.nome}</b><div style={{ color: '#6b7280' }}>{s.faixa_preco}</div></div>)}
                        {respostas.length === 0 && servicos.length === 0 && <div style={{ padding: 12, color: '#9ca3af', fontSize: 13 }}>Nenhuma resposta cadastrada ainda (aba Respostas automáticas).</div>}
                      </div>
                    )}
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <BtnSecondary small onClick={() => setMostrarAtalhos(v => !v)}>Respostas</BtnSecondary>
                      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} disabled={enviando}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
                        placeholder="Digite a resposta (Enter envia, Shift+Enter quebra linha). A Júlia pausa ao enviar."
                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
                      <BtnPrimary small onClick={enviarMensagem} disabled={enviando || !texto.trim()}>{enviando ? 'Enviando...' : 'Enviar'}</BtnPrimary>
                    </div>
                  </>
                ) : <Aviso tipo="info">A resposta direta por {CANAIS.find(c => c.id === (convSel.canal || 'whatsapp')).nome} será ligada junto com a conexão do canal (aba Canais).</Aviso>}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ═════ LEADS ═════ */}
      {aba === 'leads' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_LEAD).map(([k, [l, c]]) => <Badge key={k} label={`${l}: ${leads.filter(x => (x.status || 'novo') === k).length}`} color={c} />)}
            </div>
            <BtnPrimary small onClick={() => setFormLead({ nome: '', telefone: '', instagram: '', procura: '', ocasiao: '', data_evento: '', origem: '', servico_interesse: '' })}>Novo lead</BtnPrimary>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {leads.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhum lead cadastrado.</Card>}
            {leads.map(l => {
              const [rot, cor] = STATUS_LEAD[l.status || 'novo'] || [l.status, '#6b7280'];
              return (
                <Card key={l.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{l.nome} <Badge label={rot} color={cor} /></div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{[l.telefone, l.instagram, l.ocasiao, l.data_evento && fmtDate(l.data_evento), l.origem].filter(Boolean).join(' · ') || 'sem detalhes'}</div>
                      {(l.procura || l.servico_interesse) && <div style={{ fontSize: 13, marginTop: 4 }}>{l.procura || l.servico_interesse}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={l.status || 'novo'} onChange={e => mudarStatusLead(l, e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}>
                        {Object.entries(STATUS_LEAD).map(([k, [lb]]) => <option key={k} value={k}>{lb}</option>)}
                      </select>
                      <BtnSecondary small onClick={() => setFormLead({ ...l, data_evento: l.data_evento || '' })}>Editar</BtnSecondary>
                      {l.status !== 'convertido' && <BtnPrimary small disabled={ocupado} onClick={() => virarCliente(l)}>Virar cliente + OS</BtnPrimary>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════ CANAIS ═════ */}
      {aba === 'canais' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
          {CANAIS.map(c => {
            const banco = canalDoBanco(c.id); const f = { ...banco, ...(canalForm[c.id] || {}) };
            const statusReal = c.id === 'whatsapp' ? (whatsRecente ? 'conectado' : 'pendente') : (banco.status || 'pendente');
            const set = (k, v) => setCanalForm(p => ({ ...p, [c.id]: { ...(p[c.id] || {}), [k]: v } }));
            return (
              <Card key={c.id} style={{ borderTop: `4px solid ${c.cor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 17 }}>{c.nome}</h3>
                  <Badge label={statusReal === 'conectado' ? (c.id === 'whatsapp' ? 'Recebendo mensagens' : 'Conectado') : statusReal === 'erro' ? 'Com erro' : (c.id === 'whatsapp' ? 'Sem mensagens há 7 dias' : 'Não conectado')} color={statusReal === 'conectado' ? '#22c55e' : statusReal === 'erro' ? '#ef4444' : '#f59e0b'} />
                </div>
                <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, marginBottom: 14 }}>{COMO_CONECTAR[c.id]}</p>
                <Campo label={c.id === 'whatsapp' ? 'Número conectado' : c.id === 'facebook' ? 'Nome / ID da Página' : 'Usuário (@)'} value={f.identificador} onChange={v => set('identificador', v)} />
                <Campo label="Nome de exibição" value={f.nome_exibicao} onChange={v => set('nome_exibicao', v)} />
                {c.id !== 'whatsapp' && <Campo label="Status (marque depois de configurar no n8n)" value={f.status || 'pendente'} onChange={v => set('status', v)} options={[{ value: 'pendente', label: 'Pendente' }, { value: 'conectado', label: 'Conectado' }, { value: 'erro', label: 'Com erro' }]} />}
                <Campo label="Anotações" type="textarea" rows={2} value={f.observacoes} onChange={v => set('observacoes', v)} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>Tokens e senhas ficam nas credenciais do n8n — nunca aqui.</div>
                <BtnPrimary small disabled={ocupado || !canalForm[c.id]} onClick={() => salvarCanal(c.id)}>Salvar</BtnPrimary>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═════ RESPOSTAS AUTOMÁTICAS ═════ */}
      {aba === 'respostas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
            <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 640 }}>Textos prontos para as perguntas mais comuns. Aparecem como atalho no botão <b>Respostas</b> das conversas. Para a Júlia usar sozinha, o fluxo dela no n8n precisa ler esta lista (as palavras-chave ajudam a escolher a resposta certa).</p>
            <BtnPrimary small onClick={() => { setErro(''); setRespEdit({ titulo: '', palavras: '', resposta: '', canais: ['whatsapp'], ativa: true, ordem: respostas.length + 1 }); }}>Nova resposta</BtnPrimary>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {respostas.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhuma resposta cadastrada.</Card>}
            {respostas.map(r => (
              <Card key={r.id} onClick={() => { setErro(''); setRespEdit({ ...r, palavras: (r.palavras_chave || []).join(', ') }); }} style={{ cursor: 'pointer', padding: 16, opacity: r.ativa === false ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <b>{r.titulo}</b>
                  <span style={{ display: 'flex', gap: 6 }}>{(r.canais || []).map(c => <Badge key={c} label={c} color="#6b7280" />)}{r.ativa === false && <Badge label="inativa" color="#ef4444" />}</span>
                </div>
                {(r.palavras_chave || []).length > 0 && <div style={{ fontSize: 12, color: '#c4a45a', marginTop: 4 }}>Palavras-chave: {r.palavras_chave.join(', ')}</div>}
                <div style={{ fontSize: 13, color: '#4b5563', marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.resposta}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ═════ BASE DA JÚLIA ═════ */}
      {aba === 'base' && (
        <div>
          <Card style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Instruções principais da Júlia</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Quem ela é, como fala, o que nunca deve fazer e quando deve chamar você.</p>
            <textarea value={instrucoes} onChange={e => setInstrucoes(e.target.value)} rows={7} placeholder="Ex.: Você é a Júlia, secretária do ateliê Das G. Fale de forma acolhedora e objetiva..." style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ marginTop: 10 }}><BtnPrimary small disabled={ocupado} onClick={salvarInstrucoes}>Salvar instruções</BtnPrimary></div>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 16 }}>O que a Júlia precisa saber</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <BtnSecondary small onClick={() => setPrevia(true)}>Ver texto final</BtnSecondary>
              <BtnPrimary small onClick={() => { setErro(''); setBaseEdit({ categoria: 'servicos_precos', titulo: '', conteudo: '', ativo: true }); }}>Adicionar informação</BtnPrimary>
            </div>
          </div>
          {conhecimento.length === 0 && <Card style={{ textAlign: 'center', color: '#9ca3af' }}>Nada cadastrado ainda. Comece por serviços e preços, horário/endereço, formas de pagamento e prazos.</Card>}
          {CATEGORIAS_BASE.map(([id, nome]) => {
            const itens = conhecimento.filter(k => (k.categoria || 'geral') === id);
            if (!itens.length) return null;
            return (
              <div key={id} style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', marginBottom: 8 }}>{nome}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {itens.map(k => (
                    <Card key={k.id} onClick={() => { setErro(''); setBaseEdit({ ...k }); }} style={{ cursor: 'pointer', padding: 14, opacity: k.ativo === false ? 0.55 : 1 }}>
                      <b style={{ fontSize: 14 }}>{k.titulo}</b>{k.ativo === false && <span style={{ marginLeft: 8 }}><Badge label="desativada" color="#ef4444" /></span>}
                      <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4, whiteSpace: 'pre-wrap' }}>{k.conteudo}</div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── drawers ── */}
      <Drawer open={!!formLead} onClose={() => setFormLead(null)} title={formLead?.id ? 'Editar lead' : 'Novo lead'} width={500}>
        {formLead && (
          <div>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Campo label="Nome completo *" value={formLead.nome} onChange={v => setFormLead(p => ({ ...p, nome: v }))} />
            <Campo label="Telefone (WhatsApp)" value={formLead.telefone} onChange={v => setFormLead(p => ({ ...p, telefone: v }))} />
            <Campo label="Instagram / rede social" value={formLead.instagram} onChange={v => setFormLead(p => ({ ...p, instagram: v }))} />
            <Campo label="O que procura" value={formLead.procura} onChange={v => setFormLead(p => ({ ...p, procura: v }))} />
            <Campo label="Ocasião" value={formLead.ocasiao} onChange={v => setFormLead(p => ({ ...p, ocasiao: v }))} options={['casamento', 'formatura', 'aniversario', 'evento_corporativo', 'dia_a_dia', 'outro'].map(v => ({ value: v, label: v.replace('_', ' ') }))} />
            <Campo label="Data do evento" type="date" value={formLead.data_evento} onChange={v => setFormLead(p => ({ ...p, data_evento: v }))} />
            <Campo label="Como chegou" value={formLead.origem} onChange={v => setFormLead(p => ({ ...p, origem: v }))} options={['whatsapp', 'instagram', 'facebook', 'tiktok', 'indicacao', 'loja_fisica', 'google', 'outro'].map(v => ({ value: v, label: v.replace('_', ' ') }))} />
            <Campo label="Serviço de interesse" value={formLead.servico_interesse} onChange={v => setFormLead(p => ({ ...p, servico_interesse: v }))} options={servicos.map(s => ({ value: s.slug, label: s.nome }))} />
            <div style={{ display: 'flex', gap: 10 }}><BtnPrimary onClick={salvarLead} disabled={ocupado}>{ocupado ? 'Salvando...' : 'Salvar'}</BtnPrimary><BtnSecondary onClick={() => setFormLead(null)}>Cancelar</BtnSecondary></div>
          </div>
        )}
      </Drawer>

      <Drawer open={!!respEdit} onClose={() => setRespEdit(null)} title={respEdit?.id ? 'Editar resposta' : 'Nova resposta'} width={500}>
        {respEdit && (
          <div>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Campo label="Título *" value={respEdit.titulo} onChange={v => setRespEdit(p => ({ ...p, titulo: v }))} placeholder="Ex.: Quanto custa a consultoria?" />
            <Campo label="Palavras-chave (separe por vírgula)" value={respEdit.palavras} onChange={v => setRespEdit(p => ({ ...p, palavras: v }))} placeholder="preço, valor, quanto custa" />
            <Campo label="Resposta *" type="textarea" rows={8} value={respEdit.resposta} onChange={v => setRespEdit(p => ({ ...p, resposta: v }))} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Vale para</div>
              {CANAIS.map(c => <label key={c.id} style={{ marginRight: 14, fontSize: 14 }}><input type="checkbox" checked={(respEdit.canais || []).includes(c.id)} onChange={e => setRespEdit(p => ({ ...p, canais: e.target.checked ? [...(p.canais || []), c.id] : (p.canais || []).filter(x => x !== c.id) }))} /> {c.nome}</label>)}
            </div>
            <label style={{ display: 'block', marginBottom: 16, fontSize: 14 }}><input type="checkbox" checked={respEdit.ativa !== false} onChange={e => setRespEdit(p => ({ ...p, ativa: e.target.checked }))} /> Ativa</label>
            <div style={{ display: 'flex', gap: 10 }}><BtnPrimary onClick={salvarResposta} disabled={ocupado}>Salvar</BtnPrimary><BtnSecondary onClick={() => setRespEdit(null)}>Cancelar</BtnSecondary>{respEdit.id && <BtnDanger onClick={excluirResposta}>Excluir</BtnDanger>}</div>
          </div>
        )}
      </Drawer>

      <Drawer open={!!baseEdit} onClose={() => setBaseEdit(null)} title={baseEdit?.id ? 'Editar informação' : 'Nova informação'} width={520}>
        {baseEdit && (
          <div>
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Campo label="Categoria" value={baseEdit.categoria} onChange={v => setBaseEdit(p => ({ ...p, categoria: v }))} options={CATEGORIAS_BASE.map(([value, label]) => ({ value, label }))} />
            <Campo label="Título *" value={baseEdit.titulo} onChange={v => setBaseEdit(p => ({ ...p, titulo: v }))} placeholder="Ex.: Consultoria Express" />
            <Campo label="Conteúdo *" type="textarea" rows={10} value={baseEdit.conteudo} onChange={v => setBaseEdit(p => ({ ...p, conteudo: v }))} />
            <label style={{ display: 'block', marginBottom: 16, fontSize: 14 }}><input type="checkbox" checked={baseEdit.ativo !== false} onChange={e => setBaseEdit(p => ({ ...p, ativo: e.target.checked }))} /> Ativa (a Júlia pode usar)</label>
            <div style={{ display: 'flex', gap: 10 }}><BtnPrimary onClick={salvarBase} disabled={ocupado}>Salvar</BtnPrimary><BtnSecondary onClick={() => setBaseEdit(null)}>Cancelar</BtnSecondary>{baseEdit.id && <BtnDanger onClick={excluirBase}>Excluir</BtnDanger>}</div>
          </div>
        )}
      </Drawer>

      <Drawer open={previa} onClose={() => setPrevia(false)} title="Texto final que a Júlia recebe" width={620}>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Junção das instruções e das informações ativas, organizada por categoria.</p>
        <textarea readOnly value={textoBase || '(vazio)'} rows={26} style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }} />
        <div style={{ marginTop: 10 }}><BtnSecondary small onClick={() => navigator.clipboard?.writeText(textoBase)}>Copiar</BtnSecondary></div>
      </Drawer>
    </div>
  );
}
