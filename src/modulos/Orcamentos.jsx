import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { criarAtividadeDaEtapa, ROTULO_ETAPA } from '../lib/api.js';
import { enviarWhatsApp } from '../lib/whatsapp.js';
import MateriaisOS, { custoMaterial } from './MateriaisOS.jsx';
import Arquivos from './Arquivos.jsx';
import { Badge, Card, BtnPrimary, BtnSecondary, TabBar, Campo, Aviso, fmtDate, erroDeSchema } from './ui.jsx';

// Orçamento = planilha de formação de preço. Materiais (com 3 cotações) + horas + taxas + margem.
// Aprovado → gera as parcelas no Financeiro e avança a OS. Comprovantes ficam anexados à OS.

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n = (v) => Number(v) || 0;
const msgErro = (e) => erroDeSchema(e) ? 'Falta aplicar a migração 20261104000000 no Supabase. ' + e.message : (e.message || String(e));
const VAZIO = { valor_hora: 60, horas_molde: 0, horas_corte: 0, horas_montagem: 0, horas_provas: 0, outros_custos: 0, taxa_cartao_pct: 5, nota_pct: 0, desconto_dinheiro_pct: 5, margem_lucro_pct: 30, parcelas: 1, descricao: '', validade: '' };

export function calcular(o, custoMateriais) {
  const horas = n(o.horas_molde) + n(o.horas_corte) + n(o.horas_montagem) + n(o.horas_provas);
  const maoDeObra = horas * n(o.valor_hora);
  const custoTotal = custoMateriais + maoDeObra + n(o.outros_custos);
  const base = custoTotal * (1 + n(o.margem_lucro_pct) / 100);
  const taxas = (n(o.taxa_cartao_pct) + n(o.nota_pct)) / 100;
  const precoFinal = taxas < 1 ? base / (1 - taxas) : base;
  const precoDinheiro = precoFinal * (1 - n(o.desconto_dinheiro_pct) / 100);
  const lucro = precoFinal * (1 - taxas) - custoTotal;
  return { horas, maoDeObra, custoTotal, precoFinal, precoDinheiro, lucro };
}

function textoWhats(o, cli, osSel, c) {
  const nome = (cli?.nome || '').split(' ')[0];
  const par = n(o.parcelas) > 1 ? `ou em até ${o.parcelas}x de ${brl(c.precoFinal / n(o.parcelas))} no cartão` : 'no cartão';
  return `Olá, ${nome}! 💛 Segue o orçamento do seu look${osSel?.data_evento ? ' para ' + fmtDate(osSel.data_evento) : ''}:\n\n` +
    (o.descricao ? `${o.descricao}\n\n` : '') +
    `💰 Valor: ${brl(c.precoFinal)} ${par}\n💵 À vista no Pix/dinheiro: ${brl(c.precoDinheiro)}\n` +
    (o.validade ? `\nOrçamento válido até ${fmtDate(o.validade)}.\n` : '') +
    `\nPara aprovar, é só me responder aqui. Assim que confirmar, já reservamos seus tecidos e agendamos as medidas. ✨`;
}

export default function Orcamentos({ os, clientes, onRecarregar }) {
  const [osId, setOsId] = useState('');
  const [lista, setLista] = useState([]);
  const [orc, setOrc] = useState(null);
  const [materiais, setMateriais] = useState([]);
  const [aba, setAba] = useState('planilha');
  const [parcelasFin, setParcelasFin] = useState([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const ativas = useMemo(() => os.filter(o => o.status_idx < 23), [os]);
  const osSel = os.find(o => o.id === osId) || null;
  const cli = osSel ? clientes.find(c => c.id === osSel.cliente_id) : null;

  const carregarMateriais = useCallback(async () => {
    if (!osId) { setMateriais([]); return; }
    const { data } = await supabase.from('os_materiais').select('*').eq('ordem_servico_id', osId);
    setMateriais(data || []);
  }, [osId]);
  const carregarLista = useCallback(async () => {
    if (!osId) { setLista([]); return; }
    const { data, error } = await supabase.from('orcamentos').select('*').eq('ordem_servico_id', osId).order('created_at', { ascending: false });
    if (error) { setErro(msgErro(error)); return; }
    setLista(data || []);
  }, [osId]);
  const carregarFin = useCallback(async () => {
    if (!osId) { setParcelasFin([]); return; }
    const { data } = await supabase.from('financeiro_receber').select('*').eq('ordem_servico_id', osId).order('data_vencimento', { ascending: true });
    setParcelasFin(data || []);
  }, [osId]);

  useEffect(() => { setOrc(null); setErro(''); setAviso(''); setAba('planilha'); carregarMateriais(); carregarLista(); carregarFin(); }, [osId]); // eslint-disable-line react-hooks/exhaustive-deps

  const custoMateriais = materiais.reduce((s, m) => s + custoMaterial(m), 0);
  const calc = orc ? calcular(orc, custoMateriais) : null;
  const set = (k, v) => setOrc(o => ({ ...o, [k]: v }));
  const aprovado = !!orc?.aprovado_em;

  function novo() {
    setOrc({ ...VAZIO, id: null, ordem_servico_id: osId, cliente_id: osSel.cliente_id, status: 'rascunho', numero: `${osSel.numero || 'OS'}-${lista.length + 1}` });
    setAviso(''); setErro('');
  }

  async function salvar() {
    setOcupado(true); setErro(''); setAviso('');
    const c = calcular(orc, custoMateriais);
    const linha = {
      ordem_servico_id: osId, cliente_id: osSel.cliente_id, numero: orc.numero, descricao: orc.descricao || null,
      valor_hora: n(orc.valor_hora), horas_molde: n(orc.horas_molde), horas_corte: n(orc.horas_corte), horas_montagem: n(orc.horas_montagem), horas_provas: n(orc.horas_provas),
      outros_custos: n(orc.outros_custos), taxa_cartao_pct: n(orc.taxa_cartao_pct), nota_pct: n(orc.nota_pct), desconto_dinheiro_pct: n(orc.desconto_dinheiro_pct),
      margem_lucro_pct: n(orc.margem_lucro_pct), parcelas: Math.max(1, n(orc.parcelas)),
      custo_materiais: custoMateriais, custo_mao_de_obra: c.maoDeObra, custo_total: c.custoTotal, preco_final: c.precoFinal, preco_dinheiro: c.precoDinheiro, lucro_estimado: c.lucro,
      valor: c.precoFinal, texto_whatsapp: orc.texto_whatsapp || null, validade: orc.validade || null, status: orc.status || 'rascunho', updated_at: new Date().toISOString(),
    };
    const { data, error } = orc.id ? await supabase.from('orcamentos').update(linha).eq('id', orc.id).select().single() : await supabase.from('orcamentos').insert(linha).select().single();
    setOcupado(false);
    if (error) { setErro(msgErro(error)); return null; }
    setOrc(data); setAviso('Orçamento salvo.'); await carregarLista();
    return data;
  }

  function gerarTexto() { set('texto_whatsapp', textoWhats(orc, cli, osSel, calc)); }

  async function enviar() {
    const salvo = await salvar(); if (!salvo) return;
    const texto = orc.texto_whatsapp || textoWhats(orc, cli, osSel, calc);
    setOcupado(true);
    const r = await enviarWhatsApp({ telefone: cli?.telefone || cli?.whatsapp, nome: cli?.nome, mensagem: texto });
    if (!r.ok) { setOcupado(false); setErro(r.erro); return; }
    await supabase.from('orcamentos').update({ enviado_em: new Date().toISOString(), status: 'enviado', texto_whatsapp: texto }).eq('id', salvo.id);
    if (osSel.status_idx < 5) { await supabase.from('ordens_servico').update({ status: 'orcamento_enviado' }).eq('id', osId); await criarAtividadeDaEtapa({ os: osSel, cliente: cli, slug: 'orcamento_enviado' }); await onRecarregar(); }
    setOcupado(false); setAviso('Orçamento enviado pelo WhatsApp.'); setOrc(o => ({ ...o, enviado_em: new Date().toISOString(), status: 'enviado' })); carregarLista();
  }

  async function aprovar() {
    const salvo = await salvar(); if (!salvo) return;
    if (!window.confirm(`Aprovar o orçamento de ${brl(salvo.preco_final)} e gerar o financeiro?`)) return;
    setOcupado(true);
    const total = n(salvo.preco_final), np = Math.max(1, n(salvo.parcelas));
    const entrada = Math.round(total * 50) / 100; // 50% de entrada, saldo no final
    const hoje = new Date();
    const venc = (dias) => new Date(hoje.getTime() + dias * 86400000).toISOString().slice(0, 10);
    const dataEvt = osSel.data_evento || venc(30);
    const linhas = [{ descricao: 'Entrada (50%)', parcela: '1/2', valor: entrada, data_vencimento: venc(0) }, { descricao: 'Saldo (50%) — pagar antes da entrega', parcela: '2/2', valor: Math.round((total - entrada) * 100) / 100, data_vencimento: dataEvt }]
      .map(l => ({ ...l, ordem_servico_id: osId, cliente_id: osSel.cliente_id, orcamento_id: salvo.id, status: 'pendente' }));
    const { error } = await supabase.from('financeiro_receber').insert(linhas);
    if (error) { setOcupado(false); setErro(msgErro(error)); return; }
    await supabase.from('orcamentos').update({ aprovado_em: new Date().toISOString(), status: 'aprovado' }).eq('id', salvo.id);
    await supabase.from('ordens_servico').update({ status: 'aprovado', valor_total: total }).eq('id', osId);
    await criarAtividadeDaEtapa({ os: osSel, cliente: cli, slug: 'aprovado' });
    await onRecarregar(); await carregarFin(); await carregarLista();
    setOrc(o => ({ ...o, aprovado_em: new Date().toISOString(), status: 'aprovado' }));
    setOcupado(false); setAba('financeiro'); setAviso('Orçamento aprovado. Entrada e saldo foram lançados no financeiro; anexe os comprovantes quando a cliente pagar.');
  }

  async function marcarPago(p) {
    const { error } = await supabase.from('financeiro_receber').update({ status: 'pago', pago_em: new Date().toISOString(), valor_pago: p.valor }).eq('id', p.id);
    if (error) { setErro(msgErro(error)); return; }
    carregarFin();
    if (/^1\//.test(p.parcela || '') && osSel.status_idx < 7) { await supabase.from('ordens_servico').update({ status: 'entrada' }).eq('id', osId); await onRecarregar(); }
  }

  const inp = { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };
  const linhaNum = (k, l, suf) => (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
      <input type="number" step="0.01" disabled={aprovado} value={orc[k] ?? ''} onChange={e => set(k, e.target.value)} style={inp} />{suf}
    </label>
  );
  const resumo = (l, v, forte) => <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontWeight: forte ? 700 : 400, fontSize: forte ? 16 : 14 }}><span>{l}</span><span>{v}</span></div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Orçamentos</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Planilha de formação de preço, texto para WhatsApp, aprovação e recebimentos</p>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={osId} onChange={e => setOsId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, minWidth: 280 }}>
          <option value="">Escolha a OS...</option>
          {ativas.map(o => <option key={o.id} value={o.id}>{o.numero || 'OS'} — {clientes.find(c => c.id === o.cliente_id)?.nome} ({ROTULO_ETAPA[o.status] || o.status})</option>)}
        </select>
        {osSel && <BtnSecondary small onClick={novo}>Novo orçamento</BtnSecondary>}
        {lista.map(q => <button key={q.id} onClick={() => { setOrc(q); setAviso(''); setErro(''); }} style={{ border: '1px solid #d1d5db', borderRadius: 16, padding: '4px 12px', background: orc?.id === q.id ? '#111' : '#fff', color: orc?.id === q.id ? '#c4a45a' : '#374151', fontSize: 12, cursor: 'pointer' }}>{q.numero || 'Orç.'} · {brl(q.preco_final || q.valor)} {q.aprovado_em ? '✔' : ''}</button>)}
      </div>
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!osSel ? <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Escolha uma OS.</Card> : (
        <>
          <TabBar active={aba} onChange={setAba} tabs={[{ id: 'planilha', label: 'Planilha de preço' }, { id: 'materiais', label: 'Materiais e cotações' }, { id: 'whatsapp', label: 'Texto e envio' }, { id: 'financeiro', label: 'Recebimentos e comprovantes' }]} />
          {aba === 'materiais' && <MateriaisOS osId={osId} onMudou={carregarMateriais} />}
          {aba === 'financeiro' && (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 10 }}>Recebimentos desta OS</h3>
                {parcelasFin.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>Nada lançado ainda. As parcelas são criadas quando o orçamento é aprovado.</div>}
                {parcelasFin.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6', gap: 10, flexWrap: 'wrap' }}>
                    <div><div style={{ fontWeight: 600, fontSize: 14 }}>{p.descricao || 'Parcela'}</div><div style={{ fontSize: 12, color: '#6b7280' }}>vence {fmtDate(p.data_vencimento)}{p.pago_em ? ' · pago em ' + fmtDate(p.pago_em) : ''}</div></div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><strong>{brl(p.valor)}</strong><Badge label={p.status === 'pago' ? 'Pago' : 'Pendente'} color={p.status === 'pago' ? '#16a34a' : '#f59e0b'} />{p.status !== 'pago' && <BtnSecondary small onClick={() => marcarPago(p)}>Marcar pago</BtnSecondary>}</div>
                  </div>
                ))}
              </Card>
              <Arquivos osId={osId} clienteId={osSel.cliente_id} categorias={['comprovante']} titulo="Comprovantes de pagamento" ajuda="Envie a foto ou PDF do comprovante; ele fica salvo na OS e na ficha da cliente." />
            </div>
          )}
          {(aba === 'planilha' || aba === 'whatsapp') && !orc && <Card style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>Clique em "Novo orçamento" ou escolha um existente.</Card>}
          {aba === 'planilha' && orc && calc && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>
              <Card>
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Mão de obra e taxas</h3>
                <Campo label="Descrição da peça (vai no texto da cliente)" type="textarea" rows={2} readonly={aprovado} value={orc.descricao} onChange={v => set('descricao', v)} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {linhaNum('valor_hora', 'Valor da hora (R$)')}{linhaNum('horas_molde', 'Horas molde')}{linhaNum('horas_corte', 'Horas corte')}
                  {linhaNum('horas_montagem', 'Horas montagem')}{linhaNum('horas_provas', 'Horas provas')}{linhaNum('outros_custos', 'Outros custos (R$)')}
                  {linhaNum('margem_lucro_pct', 'Margem de lucro %')}{linhaNum('taxa_cartao_pct', 'Taxa do cartão %')}{linhaNum('nota_pct', 'Nota fiscal %')}
                  {linhaNum('desconto_dinheiro_pct', 'Desconto à vista %')}{linhaNum('parcelas', 'Parcelas no cartão')}
                  <label><div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 }}>Validade</div><input type="date" disabled={aprovado} value={orc.validade || ''} onChange={e => set('validade', e.target.value)} style={inp} /></label>
                </div>
              </Card>
              <Card>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Formação do preço</h3>
                {resumo('Materiais (cotação escolhida)', brl(custoMateriais))}
                {resumo(`Mão de obra (${calc.horas} h)`, brl(calc.maoDeObra))}
                {resumo('Outros custos', brl(n(orc.outros_custos)))}
                {resumo('Custo total', brl(calc.custoTotal), true)}
                {resumo('Lucro estimado', brl(calc.lucro))}
                {resumo('Preço no cartão / Pix', brl(calc.precoFinal), true)}
                {resumo(`À vista com ${n(orc.desconto_dinheiro_pct)}% de desconto`, brl(calc.precoDinheiro), true)}
                {n(orc.parcelas) > 1 && resumo(`${orc.parcelas}x de`, brl(calc.precoFinal / n(orc.parcelas)))}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <BtnPrimary disabled={ocupado || aprovado} onClick={salvar}>{ocupado ? 'Salvando...' : 'Salvar'}</BtnPrimary>
                  {aprovado && <Badge label={'Aprovado em ' + fmtDate(orc.aprovado_em)} color="#16a34a" />}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Materiais vêm da aba "Materiais e cotações".</div>
              </Card>
            </div>
          )}
          {aba === 'whatsapp' && orc && calc && (
            <Card>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Texto do orçamento para a cliente</h3>
              <Campo label="Mensagem" type="textarea" rows={10} value={orc.texto_whatsapp || ''} onChange={v => set('texto_whatsapp', v)} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <BtnSecondary onClick={gerarTexto}>Gerar texto com os valores</BtnSecondary>
                <BtnPrimary disabled={ocupado || !orc.texto_whatsapp} onClick={enviar}>Enviar pelo WhatsApp</BtnPrimary>
                {!aprovado && <BtnSecondary disabled={ocupado} onClick={aprovar}>Cliente aprovou → gerar financeiro</BtnSecondary>}
              </div>
              {orc.enviado_em && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Enviado em {fmtDate(orc.enviado_em)}</div>}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
