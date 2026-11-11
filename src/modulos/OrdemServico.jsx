import { TOTAL_ETAPAS } from '../lib/etapas.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { criarAtividadeDaEtapa, ROTULO_ETAPA, SLUGS_ETAPA } from '../lib/api.js';
import { FASES_OS, GRUPOS_OS, ROTULO_FASE, gerarEtapasAtelie } from '../lib/producao.js';
import { AGENDAS } from './CentralTarefas.jsx';
import Arquivos from './Arquivos.jsx';
import Orcamentos from './Orcamentos.jsx';
import Provas from './Provas.jsx';
import Criacao from './Criacao.jsx';
import Consultoria from './Consultoria.jsx';
import { TIPOS_ATENDIMENTO } from './tiposAtendimento.js';
import { Badge, Card, BtnPrimary, BtnSecondary, TabBar, Aviso, Drawer, fmtDate, fmtDateTime, erroDeSchema } from './ui.jsx';

// Ordem de Serviço: acompanha toda a confecção, do pedido à entrega, com as etapas de um ateliê.
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261105000001 no Supabase. ' + e.message : (e.message || String(e));
const COR = { pendente: '#9ca3af', andamento: '#f59e0b', concluida: '#16a34a' };

export default function OrdemServico({ os, clientes, osFocoId, quizEnvios = [], agenda = [], onRecarregar, onNavegar }) {
  const [osId, setOsId] = useState(osFocoId || '');
  const [aba, setAba] = useState('producao');
  const [tarefas, setTarefas] = useState([]);
  const [resumo, setResumo] = useState({ materiais: [], orc: null, orcs: [], provas: [], fin: [], arquivos: 0, arqs: [], pedidos: [] });
  const [atend, setAtend] = useState({ por: '', em: '' });
  const [painel, setPainel] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [novaTarefa, setNovaTarefa] = useState({});
  const [sujos, setSujos] = useState(() => new Set());
  const [salvando, setSalvando] = useState(false);
  const [novaParcela, setNovaParcela] = useState({ descricao: '', valor: '', data_vencimento: '', forma: '' });

  useEffect(() => { if (osFocoId) setOsId(osFocoId); }, [osFocoId]);
  const osSel = os.find(o => o.id === osId) || null;
  const cli = osSel ? clientes.find(c => c.id === osSel.cliente_id) : null;
  const ativas = useMemo(() => [...os].sort((a, b) => (a.status_idx >= TOTAL_ETAPAS) - (b.status_idx >= TOTAL_ETAPAS)), [os]);

  const carregar = useCallback(async () => {
    if (!osId) { setTarefas([]); return; }
    const [t, m, o, p, f, a, pv] = await Promise.all([
      supabase.from('os_producao').select('*').eq('ordem_servico_id', osId).order('ordem'),
      supabase.from('os_materiais').select('comprado,descricao,escolhida').eq('ordem_servico_id', osId),
      supabase.from('orcamentos').select('*').eq('ordem_servico_id', osId).order('created_at', { ascending: false }),
      supabase.from('provas').select('*').eq('ordem_servico_id', osId),
      supabase.from('financeiro_receber').select('*').order('data_vencimento').eq('ordem_servico_id', osId),
      supabase.from('os_arquivos').select('id,categoria').eq('ordem_servico_id', osId),
      supabase.from('pedidos_venda').select('numero,total,status,entrega_em').eq('ordem_servico_id', osId),
    ]);
    const e = t.error; if (e) { setErro(msgErro(e)); return; }
    setTarefas((t.data || []).map(r => r.responsavel === 'Ateliê' ? { ...r, responsavel: null } : r)); setSujos(new Set());
    setResumo({ materiais: m.data || [], orc: (o.data || []).find(x => x.aprovado_em) || (o.data || [])[0] || null, provas: p.data || [], fin: f.data || [], arquivos: (a.data || []).length, arqs: a.data || [], orcs: o.data || [], pedidos: pv.data || [] });
  }, [osId]);
  useEffect(() => { setErro(''); setAviso(''); carregar(); }, [carregar]);
  useEffect(() => { setAtend({ por: osSel?.atendido_por || '', em: osSel?.atendido_em || '' }); }, [osId, osSel?.atendido_por, osSel?.atendido_em]); // eslint-disable-line react-hooks/exhaustive-deps
  const mudarAtend = (patch) => { setAtend(a => ({ ...a, ...patch })); setSujos(s => new Set(s).add('__os')); };
  const paraInput = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

  async function gerar() {
    const r = await gerarEtapasAtelie(osId);
    if (r.error) { setErro(msgErro(r.error)); return; }
    carregar();
  }
  const mudar = (id, patch) => { setTarefas(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t)); setSujos(s => new Set(s).add(id)); };
  const marcar = (t, status) => mudar(t.id, { status, concluida_em: status === 'concluida' ? new Date().toISOString() : null });

  // grava as linhas alteradas e mantém a Central de Tarefas / Agenda em sincronia
  async function salvarTudo() {
    setSalvando(true); setErro(''); setAviso('');
    try {
      const alteradas = tarefas.filter(t => sujos.has(t.id));
      if (sujos.has('__os')) {
        const { error } = await supabase.from('ordens_servico').update({ atendido_por: atend.por || null, atendido_em: atend.em || null }).eq('id', osId);
        if (error) throw error;
      }
      for (const t of alteradas) {
        const { error } = await supabase.from('os_producao').update({ titulo: t.titulo, notas: t.notas || null, responsavel: t.responsavel || null, departamento: t.departamento || null, prazo: t.prazo || null, status: t.status, concluida_em: t.concluida_em || null }).eq('id', t.id);
        if (error) throw error;
        const { data: ex } = await supabase.from('tarefas').select('id').eq('os_producao_id', t.id).maybeSingle();
        if (t.departamento) {
          const linha = { titulo: `${osSel.numero || 'OS'} · ${cli?.nome || ''} — ${t.titulo}`, descricao: t.notas || null, responsavel: t.responsavel || null, departamento: t.departamento, prazo: t.prazo || null, status: t.status === 'concluida' ? 'concluida' : 'pendente', concluida_em: t.status === 'concluida' ? (t.concluida_em || new Date().toISOString()) : null, cliente_id: osSel.cliente_id, ordem_servico_id: osId, os_producao_id: t.id };
          const r = ex ? await supabase.from('tarefas').update(linha).eq('id', ex.id) : await supabase.from('tarefas').insert({ ...linha, origem: 'os', prioridade: 'normal' });
          if (r.error) throw r.error;
        } else if (ex) {
          const { error: e2 } = await supabase.from('tarefas').delete().eq('id', ex.id); if (e2) throw e2;
        }
      }
      // fase inteira concluída → a OS avança para a etapa seguinte do Fluxo
      let msg = `${sujos.size} alteração(ões) salva(s). Tarefas com departamento já aparecem na Central de Tarefas e na Agenda.`;
      const concluidas = FASES_OS.map(([f]) => f).filter(f => { const ts = tarefas.filter(x => x.fase === f); return ts.length && ts.every(x => x.status === 'concluida') && alteradas.some(x => x.fase === f); });
      if (concluidas.length) {
        const atual = SLUGS_ETAPA.indexOf(osSel.status);
        const idx = Math.max(...concluidas.map(f => SLUGS_ETAPA.indexOf(f)));
        const prox = SLUGS_ETAPA[idx + 1];
        if (prox && atual <= idx) {
          await supabase.from('ordens_servico').update({ status: prox }).eq('id', osId);
          await criarAtividadeDaEtapa({ os: osSel, cliente: cli, slug: prox });
          msg += ` A OS avançou para "${ROTULO_ETAPA[prox]}".`;
        }
      }
      setSujos(new Set()); await onRecarregar(); setAviso(msg);
    } catch (e) { setErro(msgErro(e)); }
    setSalvando(false);
  }
  async function descartar() { setSujos(new Set()); await carregar(); }
  async function mudarEtapa(slug) {
    if (!slug || slug === osSel.status) return;
    const { error } = await supabase.from('ordens_servico').update({ status: slug }).eq('id', osId);
    if (error) { setErro(msgErro(error)); return; }
    await criarAtividadeDaEtapa({ os: osSel, cliente: cli, slug });
    await onRecarregar();
    setAviso(`Etapa alterada para "${ROTULO_ETAPA[slug]}". O Fluxo de Atendimento já mostra a mudança.`);
  }
  async function adicionar(fase) {
    const titulo = (novaTarefa[fase] || '').trim(); if (!titulo) return;
    const ordem = Math.max(FASES_OS.findIndex(f => f[0] === fase) * 100, ...tarefas.filter(t => t.fase === fase).map(t => t.ordem)) + 0.5;
    const { data, error } = await supabase.from('os_producao').insert({ ordem_servico_id: osId, fase, titulo, ordem }).select().single();
    if (error) { setErro(msgErro(error)); return; }
    setTarefas(ts => [...ts, data].sort((a, b) => a.ordem - b.ordem)); setNovaTarefa(n => ({ ...n, [fase]: '' }));
  }
  async function remover(id) { await supabase.from('os_producao').delete().eq('id', id); setTarefas(ts => ts.filter(t => t.id !== id)); await onRecarregar(); }

  // financeiro da OS: parcelas em contas a receber
  async function lancarParcela() {
    const v = Number(String(novaParcela.valor).replace(',', '.')); if (!v || v <= 0) { setErro('Informe o valor da parcela.'); return; }
    const { error } = await supabase.from('financeiro_receber').insert({ cliente_id: osSel.cliente_id, ordem_servico_id: osId, descricao: novaParcela.descricao || `Parcela da ${osSel.numero || 'OS'}`, valor: v, data_vencimento: novaParcela.data_vencimento || null, forma: novaParcela.forma || null, status: 'pendente' });
    if (error) { setErro(msgErro(error)); return; }
    setNovaParcela({ descricao: '', valor: '', data_vencimento: '', forma: '' }); await carregar(); await onRecarregar(); setAviso('Parcela lançada no Financeiro (contas a receber).');
  }
  async function receberParcela(p) {
    const { error } = await supabase.from('financeiro_receber').update({ status: 'pago', pago_em: new Date().toISOString(), valor_pago: p.valor }).eq('id', p.id);
    if (error) { setErro(msgErro(error)); return; }
    await carregar(); await onRecarregar(); setAviso('Pagamento registrado no Financeiro.');
  }

  const feitas = tarefas.filter(t => t.status === 'concluida').length;
  const pct = tarefas.length ? Math.round(feitas / tarefas.length * 100) : 0;
  const pago = resumo.fin.filter(f => f.status === 'pago').reduce((s, f) => s + Number(f.valor || 0), 0);
  const aReceber = resumo.fin.filter(f => f.status !== 'pago').reduce((s, f) => s + Number(f.valor || 0), 0);
  const inp = { padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 12 };

  // ficha de cada etapa: o que já aconteceu, vindo dos outros módulos
  const orcP = resumo.orc;
  const quizOS = quizEnvios.filter(q => q.ordem_servico_id === osId || (!q.ordem_servico_id && q.cliente_id === osSel?.cliente_id)).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))[0];
  const eventos = agenda.filter(a => a.ordem_servico_id === osId).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  const nProva = (t) => resumo.provas.find(x => x.tipo === t);
  const arq = (cats) => resumo.arqs.filter(a => cats.includes(a.categoria)).length;
  const provaTxt = (t) => { const p = nProva(t); return p ? `${fmtDateTime(p.data_agendada)} · ${p.status || 'pendente'}${p.aprovado ? ' · ' + ({ sim: 'aprovada', parcial: 'aprovada c/ ajustes', nao: 'refazer' }[p.aprovado] || p.aprovado) : ''}` : 'não agendada'; };
  const ajusteTxt = (t) => nProva(t)?.ajustes || 'sem ajustes anotados';
  const parcelas = resumo.fin;
  const pagas = parcelas.filter(f => f.status === 'pago').length;
  const dados = {
    cliente: [['Cadastrada em', fmtDateTime(cli?.created_at)], ['Origem', cli?.origem || '—'], ['Telefone', cli?.telefone || '—']],
    atendimento: [['Serviço', (TIPOS_ATENDIMENTO[osSel?.tipo_atendimento] || {}).label || osSel?.servico || '—'], ['Canal', osSel?.canal || '—'], ['OS aberta em', fmtDateTime(osSel?.created_at)]],
    agendamento: eventos.length ? eventos.slice(0, 3).map(e => [e.titulo || e.tipo, `${fmtDateTime(e.data_hora)} · ${e.status || ''}${e.confirmado_em ? ' · confirmado' : ''}`]) : [['Agenda', 'nada agendado para esta OS']],
    consultoria: [['Questionário', quizOS ? `${quizOS.status}${quizOS.respondido_em ? ' · respondido em ' + fmtDateTime(quizOS.respondido_em) : quizOS.enviado_em ? ' · enviado em ' + fmtDateTime(quizOS.enviado_em) : ''}` : 'não enviado'], ['Pagamento', osSel?.pagamento_status || '—'], ['Valor da consultoria', brl(osSel?.consultoria_valor)], ['Meet', osSel?.link_meet ? 'link criado' : '—']],
    criacao: [['Dossiê / imagens IA', quizOS?.ia_status ? `${quizOS.ia_status}${quizOS.ia_gerado_em ? ' · ' + fmtDateTime(quizOS.ia_gerado_em) : ''}` : '—'], ['Croquis e imagens', arq(['croqui', 'imagem_ia']) + ' arquivo(s)'], ['Referências', arq(['referencia']) + ' arquivo(s)']],
    orcamento: orcP ? [['Orçamento', orcP.numero || '—'], ['Preço final', brl(orcP.preco_final || orcP.valor)], ['À vista', brl(orcP.preco_dinheiro)], ['Parcelas', orcP.parcelas ? orcP.parcelas + 'x' : '—'], ['Custo total', brl(orcP.custo_total)], ['Lucro estimado', brl(orcP.lucro_estimado)], ['Validade', fmtDate(orcP.validade)], ['Enviado', orcP.enviado_em ? fmtDateTime(orcP.enviado_em) : 'ainda não']] : [['Orçamento', 'ainda não feito']],
    aprovacao: [['Situação', orcP?.aprovado_em ? 'aprovado em ' + fmtDateTime(orcP.aprovado_em) : 'aguardando aprovação'], ['Valor aprovado', brl(orcP?.preco_final || orcP?.valor)]],
    venda: [['Pedido de venda', resumo.pedidos[0] ? `${resumo.pedidos[0].numero} · ${brl(resumo.pedidos[0].total)} · ${resumo.pedidos[0].status}` : 'ainda não gerado'], ['Parcelas pagas', `${pagas}/${parcelas.length}`], ['Recebido', brl(pago)], ['A receber', brl(aReceber)]],
    os: [['Número', osSel?.numero || '—'], ['Ocasião', osSel?.ocasiao || '—'], ['Evento', fmtDate(osSel?.data_evento)], ['Valor da OS', brl(osSel?.valor_total)]],
    tecido: [['Tecidos e medidas', fmtDate(osSel?.data_tecidos_medidas)], ['Materiais', `${resumo.materiais.length} item(ns) · ${resumo.materiais.filter(m => m.comprado).length} comprado(s)`], ['Medidas', cli?.busto || cli?.cintura ? 'registradas na ficha' : 'pendentes']],
    corte: [['Materiais comprados', `${resumo.materiais.filter(m => m.comprado).length}/${resumo.materiais.length}`]],
    montagem: [['Entrega prevista', fmtDate(osSel?.data_entrega_prevista)]],
    prova1: [['1ª prova', provaTxt('prova1')]], ajuste1: [['Ajustes da 1ª prova', ajusteTxt('prova1')]],
    prova2: [['2ª prova', provaTxt('prova2')]], ajuste2: [['Ajustes da 2ª prova', ajusteTxt('prova2')]],
    prova_final: [['3ª prova', provaTxt('prova_final')]], prova4: [['4ª prova', provaTxt('prova4')]],
    finalizacao: [['Entrega prevista', fmtDate(osSel?.data_entrega_prevista)]],
    entrega: [['Entrega prevista', fmtDate(osSel?.data_entrega_prevista)], ['Saldo a receber', brl(aReceber)], ['Registro da entrega', arq(['prova', 'gravacao_prova']) + ' arquivo(s)']],
    pos_venda: [['Comprovantes e arquivos', resumo.arquivos + ' arquivo(s) na OS']],
    marketing: [['Fotos e vídeos', arq(['prova', 'gravacao_prova', 'foto_cliente']) + ' arquivo(s)']],
  };
  const abrirEm = { consultoria: 'Consultoria', criacao: 'Criação', orcamento: 'Orçamento', aprovacao: 'Orçamento', venda: 'Financeiro do orçamento', tecido: 'Medidas e provas', prova1: 'Provas', ajuste1: 'Provas', prova2: 'Provas', ajuste2: 'Provas', prova_final: 'Provas', prova4: 'Provas', finalizacao: 'Entrega', entrega: 'Entrega' };
  const fecharPainel = async () => { setPainel(null); await carregar(); await onRecarregar(); };
  const fichaEtapa = (fase) => (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '4px 16px' }}>
        {(dados[fase] || []).map(([k, v]) => <div key={k} style={{ fontSize: 12 }}><span style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: 10 }}>{k}</span><div style={{ fontWeight: 600, color: '#111' }}>{String(v)}</div></div>)}
      </div>
      {(fase === 'cliente' || fase === 'atendimento') && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'end' }}>
          <label style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>Quem atendeu<br /><input value={atend.por} onChange={e => mudarAtend({ por: e.target.value })} placeholder="Nome ou Júlia (IA)" style={{ ...inp, width: 180, textTransform: 'none' }} /></label>
          <label style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>Data e hora do atendimento<br /><input type="datetime-local" value={paraInput(atend.em)} onChange={e => mudarAtend({ em: e.target.value ? new Date(e.target.value).toISOString() : '' })} style={inp} /></label>
          {fase === 'cliente' && <BtnSecondary small onClick={() => onNavegar('clientes')}>Abrir ficha da cliente</BtnSecondary>}
        </div>
      )}
      {abrirEm[fase] && <div style={{ marginTop: 8 }}><BtnSecondary small onClick={() => setPainel(fase)}>Abrir e editar aqui: {abrirEm[fase]}</BtnSecondary></div>}
    </div>
  );
  const embutido = () => {
    const f = painel;
    if (['orcamento', 'aprovacao', 'venda'].includes(f)) return <Orcamentos os={os} clientes={clientes} onRecarregar={onRecarregar} osFixoId={osId} abaInicial={f === 'venda' ? 'financeiro' : 'planilha'} />;
    if (f === 'consultoria') return <Consultoria clientes={clientes} os={os} quizEnvios={quizEnvios} agenda={agenda} onRecarregar={onRecarregar} onNavegar={onNavegar} osFixoId={osId} />;
    if (f === 'criacao') return <Criacao os={os} clientes={clientes} quizEnvios={quizEnvios} onRecarregar={onRecarregar} onNavegar={onNavegar} osFixoId={osId} />;
    return <Provas os={os} clientes={clientes} onRecarregar={onRecarregar} osFixoId={osId} />;
  };
  const link = (rot, pagina) => <button onClick={() => onNavegar(pagina)} style={{ border: 'none', background: 'none', color: '#c4a45a', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>{rot}</button>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>Ordem de Serviço</h1><p style={{ color: '#6b7280', marginTop: 4 }}>Acompanhamento completo da confecção: medidas, modelagem, corte, costura, provas, ajustes e entrega</p></div>
      <select value={osId} onChange={e => { setOsId(e.target.value); setAba('producao'); }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, minWidth: 300, marginBottom: 16 }}>
        <option value="">Escolha a OS...</option>
        {ativas.map(o => <option key={o.id} value={o.id}>{o.numero || 'OS'} — {clientes.find(c => c.id === o.cliente_id)?.nome} ({ROTULO_ETAPA[o.status] || o.status})</option>)}
      </select>
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}{erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!osSel ? <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Escolha uma OS, ou abra uma pela ficha da cliente.</Card> : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{osSel.numero} · {cli?.nome}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{osSel.descricao || osSel.servico || '—'}{osSel.ocasiao ? ' · ' + osSel.ocasiao : ''}</div>
              </div>
              <label style={{ fontSize: 11, color: '#6b7280' }}>Etapa do fluxo<br />
                <select value={osSel.status} onChange={e => mudarEtapa(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #c4a45a', fontSize: 13, fontWeight: 600, minWidth: 220 }}>
                  {SLUGS_ETAPA.map((sl, i) => <option key={sl} value={sl}>{i + 1}. {ROTULO_ETAPA[sl]}</option>)}
                </select></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
              {[['Evento', fmtDate(osSel.data_evento)], ['Tecidos e medidas', fmtDate(osSel.data_tecidos_medidas)], ['Entrega prevista', fmtDate(osSel.data_entrega_prevista)], ['Valor', brl(osSel.valor_total)], ['Recebido', brl(pago)], ['A receber', brl(aReceber)]].map(([k, v]) => <div key={k} style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>{k}</div><div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div></div>)}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}><span>Produção</span><span>{feitas}/{tarefas.length} tarefas · {pct}%</span></div>
              <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: '#c4a45a' }} /></div>
            </div>
          </Card>
          <TabBar active={aba} onChange={setAba} tabs={[{ id: 'producao', label: 'Todas as etapas' }, { id: 'financeiro', label: 'Financeiro da OS' }, { id: 'resumo', label: 'Resumo do pedido' }, { id: 'arquivos', label: 'Arquivos da OS' }]} />

          {aba === 'producao' && (
            <div>
              <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: sujos.size ? '#fffbeb' : '#f9fafb', border: `1px solid ${sujos.size ? '#f59e0b' : '#e5e7eb'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                <div style={{ flex: 1, fontSize: 13, color: '#374151', minWidth: 220 }}>{sujos.size ? <b>{sujos.size} alteração(ões) ainda não salva(s)</b> : 'Nada pendente de salvar.'} Escolha o departamento de cada etapa para ela aparecer nas Tarefas.</div>
                {sujos.size > 0 && <BtnSecondary small onClick={descartar}>Descartar</BtnSecondary>}
                <BtnPrimary small onClick={salvarTudo} disabled={!sujos.size || salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</BtnPrimary>
              </div>
              {FASES_OS.some(([f]) => !tarefas.some(t => t.fase === f)) && <div style={{ marginBottom: 12 }}><BtnSecondary small onClick={gerar}>Completar etapas padrão que faltam</BtnSecondary></div>}
              {GRUPOS_OS.map(([grupo, fases]) => {
                const doGrupo = tarefas.filter(t => fases.includes(t.fase));
                const feitasG = doGrupo.filter(t => t.status === 'concluida').length;
                return (
                  <div key={grupo} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #c4a45a', paddingBottom: 4, marginBottom: 10 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 800 }}>{grupo}</h2><span style={{ fontSize: 12, color: '#6b7280' }}>{feitasG}/{doGrupo.length} concluídas</span>
                    </div>
                    {fases.map(fase => {
                      const ts = tarefas.filter(t => t.fase === fase);
                      const ok = ts.length > 0 && ts.every(t => t.status === 'concluida');
                      const atual = osSel.status === fase;
                      return (
                        <Card key={fase} style={{ marginBottom: 10, borderLeft: `4px solid ${ok ? '#16a34a' : atual ? '#c4a45a' : '#e5e7eb'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><h3 style={{ fontWeight: 700, fontSize: 14 }}>{ROTULO_FASE[fase]}</h3>{ok ? <Badge label="Concluída" color="#16a34a" /> : atual ? <Badge label="Etapa atual" color="#c4a45a" /> : null}</div>
                          {fichaEtapa(fase)}
                          {ts.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Sem tarefas nesta etapa.</div>}
                          {ts.map(t => (
                            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(160px,1fr) 130px 130px 130px 24px 24px', gap: 8, alignItems: 'start', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                              <input type="checkbox" checked={t.status === 'concluida'} onChange={e => marcar(t, e.target.checked ? 'concluida' : 'pendente')} style={{ marginTop: 6 }} />
                              <div><input value={t.titulo} onChange={e => mudar(t.id, { titulo: e.target.value })} style={{ ...inp, width: '100%', boxSizing: 'border-box', fontSize: 13, textDecoration: t.status === 'concluida' ? 'line-through' : 'none' }} />
                                <input placeholder="Anotações" value={t.notas || ''} onChange={e => mudar(t.id, { notas: e.target.value })} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginTop: 3 }} /></div>
                              <select value={t.departamento || ''} onChange={e => mudar(t.id, { departamento: e.target.value || null })} title="Departamento responsável pela execução" style={inp}>
                                <option value="">Departamento...</option>
                                {Object.entries(AGENDAS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
                              </select>
                              <input placeholder="Quem vai executar" value={t.responsavel || ''} onChange={e => mudar(t.id, { responsavel: e.target.value })} style={inp} />
                              <input type="date" value={t.prazo || ''} onChange={e => mudar(t.id, { prazo: e.target.value })} style={inp} />
                              <button title="Em andamento" onClick={() => marcar(t, t.status === 'andamento' ? 'pendente' : 'andamento')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: COR[t.status] }}>●</button>
                              <button title="Remover tarefa" onClick={() => { if (window.confirm('Remover esta tarefa da OS?')) remover(t.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14 }}>✕</button>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <input placeholder="Nova tarefa nesta etapa..." value={novaTarefa[fase] || ''} onChange={e => setNovaTarefa(n => ({ ...n, [fase]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && adicionar(fase)} style={{ ...inp, flex: 1 }} />
                            <BtnSecondary small onClick={() => adicionar(fase)}>Adicionar</BtnSecondary>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {aba === 'financeiro' && (
            <div>
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
                  {[['Valor da OS', brl(osSel.valor_total)], ['Lançado', brl(resumo.fin.reduce((s, f) => s + Number(f.valor || 0), 0))], ['Recebido', brl(pago)], ['A receber', brl(aReceber)]].map(([k, v]) => <div key={k} style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}><div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' }}>{k}</div><div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div></div>)}
                </div>
                {resumo.fin.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>Nenhuma parcela lançada nesta OS.</div>}
                {resumo.fin.map(p => (
                  <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>{p.descricao || 'Parcela'}{p.forma ? ' · ' + p.forma : ''}</div>
                    <div>{brl(p.valor)}</div><div style={{ color: '#6b7280' }}>vence {fmtDate(p.data_vencimento)}</div>
                    {p.status === 'pago' ? <Badge label="Pago" color="#16a34a" /> : <BtnSecondary small onClick={() => receberParcela(p)}>Marcar como recebido</BtnSecondary>}
                  </div>
                ))}
              </Card>
              <Card>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Lançar parcela (vai para o Financeiro e a Agenda)</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input placeholder="Descrição (ex.: Entrada)" value={novaParcela.descricao} onChange={e => setNovaParcela(n => ({ ...n, descricao: e.target.value }))} style={{ ...inp, flex: 1, minWidth: 180 }} />
                  <input placeholder="Valor" value={novaParcela.valor} onChange={e => setNovaParcela(n => ({ ...n, valor: e.target.value }))} style={{ ...inp, width: 100 }} />
                  <input type="date" value={novaParcela.data_vencimento} onChange={e => setNovaParcela(n => ({ ...n, data_vencimento: e.target.value }))} style={inp} />
                  <input placeholder="Forma (Pix, cartão...)" value={novaParcela.forma} onChange={e => setNovaParcela(n => ({ ...n, forma: e.target.value }))} style={{ ...inp, width: 140 }} />
                  <BtnPrimary small onClick={lancarParcela}>Lançar</BtnPrimary>
                </div>
              </Card>
            </div>
          )}

          {aba === 'resumo' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Atendimento e criação</h3>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  <div>Quiz, briefing e anotações: {link('abrir Consultoria', 'consultoria')}</div>
                  <div>Dossiê, imagens e ficha técnica: {link('abrir Criação', 'criacao')}</div>
                  <div>Materiais: {resumo.materiais.length} itens · {resumo.materiais.filter(m => m.comprado).length} comprados {link('(Orçamentos)', 'orcamentos')}</div>
                </div></Card>
              <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Orçamento e pagamento</h3>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  <div>Orçamento: {resumo.orc ? `${resumo.orc.numero || ''} · ${brl(resumo.orc.preco_final || resumo.orc.valor)} · ${resumo.orc.aprovado_em ? 'aprovado' : resumo.orc.status || 'rascunho'}` : 'ainda não feito'} {link('abrir', 'orcamentos')}</div>
                  <div>Recebido {brl(pago)} · a receber {brl(aReceber)}</div>
                </div></Card>
              <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Provas e entrega</h3>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  {['prova1', 'prova2', 'prova_final'].map((t, i) => { const p = resumo.provas.find(x => x.tipo === t); return <div key={t}>{i + 1}ª prova: {p ? `${p.status}${p.aprovado ? ' · ' + p.aprovado : ''}` : 'não agendada'}</div>; })}
                  <div>Entrega prevista: {fmtDate(osSel.data_entrega_prevista)} {link('(editar em Provas)', 'provas')}</div>
                </div></Card>
              <Card><h3 style={{ fontWeight: 700, marginBottom: 8 }}>Cliente</h3>
                <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                  <div>{cli?.nome} · {cli?.telefone || 'sem telefone'}</div>
                  <div>{resumo.arquivos} arquivo(s) nesta OS</div>
                  <div>{link('Ficha da cliente', 'clientes')}</div>
                </div></Card>
            </div>
          )}

          {aba === 'arquivos' && <Arquivos osId={osId} clienteId={osSel.cliente_id} categorias={Object.keys({ referencia: 1, foto_cliente: 1, croqui: 1, tecido: 1, prova: 1, gravacao_prova: 1, imagem_ia: 1, comprovante: 1, outro: 1 })} titulo="Arquivos desta OS" ajuda="Inspirações, fotos, croquis, gravações das provas, arquivos gerados por IA e comprovantes." />}
        </>
      )}
      <Drawer open={!!painel} onClose={fecharPainel} title={`${ROTULO_FASE[painel] || ''} · ${osSel?.numero || ''} ${cli?.nome || ''}`} width={1000}>{painel ? embutido() : null}</Drawer>
    </div>
  );
}
