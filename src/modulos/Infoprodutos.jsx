import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { enviarWhatsApp, whatsappConfigurado } from '../lib/whatsapp.js';
import { Badge, Card, BtnPrimary, BtnSecondary, BtnDanger, TabBar, Drawer, Campo, Aviso, erroDeSchema, fmtDate, fmtDateTime } from './ui.jsx';
import { TODAS_PERGUNTAS, respostaLegivel } from './quizConsultoria.js';

// Gestão dos infoprodutos (Raio X do Estilo, Minha Paleta): catálogo, banco de clientes, respostas,
// o que foi gerado, entregas e remarketing. Os funis (quiz + n8n) gravam aqui pela função infoproduto_registrar().
const STATUS = {
  lead: { label: 'Lead', cor: '#6b7280' },
  quiz_respondido: { label: 'Quiz respondido', cor: '#0284c7' },
  comprou: { label: 'Comprou (entregar)', cor: '#d97706' },
  entregue: { label: 'Entregue', cor: '#16a34a' },
  recusou: { label: 'Recusou', cor: '#9ca3af' },
};
const REMK = {
  nao: { label: 'Sem contato', cor: '#6b7280' },
  em_andamento: { label: 'Em remarketing', cor: '#d97706' },
  convertido: { label: 'Converteu', cor: '#16a34a' },
  descartado: { label: 'Descartado', cor: '#9ca3af' },
};
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const primeiro = (n) => (n || '').split(' ')[0] || 'tudo bem';
const dias = (d) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

function msgRemarketing(ic, produto) {
  return `Oi, ${primeiro(ic.nome)}! 💛 Aqui é da DAS G. Vi que você começou o ${produto?.nome || 'seu diagnóstico'} e queria te ajudar a concluir. O investimento é de ${brl(produto?.preco)}${produto?.checkout_url ? `. Segue o link: ${produto.checkout_url}` : '. Posso te mandar o link?'}`;
}
function msgEntrega(ic, produto) {
  return `Oi, ${primeiro(ic.nome)}! 💛 Aqui é da DAS G. Seu ${produto?.nome || 'resultado'} está pronto:\n\n${ic.resultado || '(cole aqui o resultado)'}\n\nQualquer dúvida, é só me chamar.`;
}

export default function Infoprodutos({ clientes = [], onRecarregar, onNavegar }) {
  const [aba, setAba] = useState('produtos');
  const [produtos, setProdutos] = useState([]);
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState('');
  const [pendente, setPendente] = useState(false);
  const [filtroProd, setFiltroProd] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState(null);       // registro aberto
  const [prodEdit, setProdEdit] = useState(null);
  const [envio, setEnvio] = useState(null);   // { ic, tipo: 'entrega'|'remarketing', texto }
  const [ocupado, setOcupado] = useState(false);

  const carregar = async () => {
    const [p, l] = await Promise.all([
      supabase.from('infoprodutos').select('*').order('ordem'),
      supabase.from('infoproduto_clientes').select('*').order('created_at', { ascending: false }).limit(1000),
    ]);
    if (erroDeSchema(p.error) || erroDeSchema(l.error)) { setPendente(true); return; }
    if (p.error || l.error) { setErro((p.error || l.error).message); return; }
    setPendente(false); setErro(''); setProdutos(p.data || []); setLista(l.data || []);
  };
  useEffect(() => { carregar(); }, []);

  const prodDe = (id) => produtos.find(p => p.id === id);
  const stats = useMemo(() => Object.fromEntries(produtos.map(p => {
    const mine = lista.filter(i => i.produto_id === p.id);
    const pagos = mine.filter(i => ['comprou', 'entregue'].includes(i.status));
    return [p.id, { total: mine.length, leads: mine.filter(i => ['lead', 'quiz_respondido'].includes(i.status)).length, compraram: pagos.length, entregues: mine.filter(i => i.status === 'entregue').length, aEntregar: mine.filter(i => i.status === 'comprou').length, receita: pagos.reduce((s, i) => s + Number(i.valor_pago || p.preco || 0), 0) }];
  })), [produtos, lista]);

  const filtrada = lista.filter(i => (!filtroProd || i.produto_id === filtroProd) && (!filtroStatus || i.status === filtroStatus)
    && (!busca.trim() || [i.nome, i.telefone, i.email].some(v => (v || '').toLowerCase().includes(busca.trim().toLowerCase()))));
  const aEntregar = lista.filter(i => i.status === 'comprou');
  const entregues = lista.filter(i => i.status === 'entregue');
  const remk = lista.filter(i => ['lead', 'quiz_respondido'].includes(i.status) && !['descartado', 'convertido'].includes(i.remarketing_status))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const salvar = async (id, patch) => {
    setOcupado(true);
    const { error } = await supabase.from('infoproduto_clientes').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    setOcupado(false);
    if (error) { setErro(error.message); return false; }
    await carregar(); return true;
  };

  const criarCadastro = async (ic) => {
    setOcupado(true);
    const { data, error } = await supabase.from('clientes').insert({ nome: ic.nome || 'Cliente infoproduto', telefone: ic.telefone, email: ic.email, origem: 'infoproduto: ' + (prodDe(ic.produto_id)?.nome || '') }).select().single();
    if (error) { setOcupado(false); setErro(error.message); return; }
    await supabase.from('infoproduto_clientes').update({ cliente_id: data.id }).eq('id', ic.id);
    setOcupado(false); await carregar(); onRecarregar && onRecarregar();
    setSel(s => s ? { ...s, cliente_id: data.id } : s);
  };

  const novoManual = () => setSel({ id: null, produto_id: produtos[0]?.id, nome: '', telefone: '', email: '', status: 'lead', origem: 'manual', obs: '' });
  const gravarSel = async () => {
    if (!sel.produto_id || !(sel.nome || '').trim()) { setErro('Informe produto e nome.'); return; }
    setOcupado(true);
    const dados = { produto_id: sel.produto_id, nome: sel.nome, telefone: sel.telefone, email: sel.email, origem: sel.origem, status: sel.status, valor_pago: sel.valor_pago === '' ? null : sel.valor_pago, resultado: sel.resultado, obs: sel.obs, entrega_canal: sel.entrega_canal, entrega_obs: sel.entrega_obs, remarketing_status: sel.remarketing_status || 'nao', remarketing_obs: sel.remarketing_obs };
    if (['comprou', 'entregue'].includes(sel.status) && !sel.comprado_em) dados.comprado_em = new Date().toISOString();
    if (sel.status === 'entregue' && !sel.entregue_em) dados.entregue_em = new Date().toISOString();
    const r = sel.id ? await supabase.from('infoproduto_clientes').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', sel.id) : await supabase.from('infoproduto_clientes').insert(dados);
    setOcupado(false);
    if (r.error) { setErro(r.error.message); return; }
    setErro(''); setSel(null); carregar();
  };

  const enviarMensagem = async () => {
    const { ic, tipo, texto } = envio;
    setOcupado(true);
    const r = await enviarWhatsApp({ telefone: ic.telefone, nome: ic.nome, mensagem: texto });
    if (!r.ok) { setOcupado(false); setErro(r.erro); return; }
    const agora = new Date().toISOString();
    const patch = tipo === 'entrega'
      ? { status: 'entregue', entregue_em: agora, entrega_canal: 'whatsapp' }
      : { remarketing_status: 'em_andamento', remarketing_ultimo_contato: agora };
    await salvar(ic.id, patch);
    setOcupado(false); setErro(''); setEnvio(null);
  };

  const Linha = ({ i, children }) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200, cursor: 'pointer' }} onClick={() => setSel({ ...i })}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{i.nome || 'Sem nome'} <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>{i.telefone || i.email || ''}</span></div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{prodDe(i.produto_id)?.nome} · {fmtDate(i.created_at)}{i.cliente_id ? ' · tem cadastro' : ''}</div>
      </div>
      {children}
    </div>
  );

  if (pendente) return <Aviso tipo="atencao">As tabelas de Infoprodutos ainda não existem no banco (migração 20261111000003 pendente).</Aviso>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Infoprodutos</h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Raio X do Estilo e Minha Paleta: clientes, respostas, o que foi gerado, entregas e remarketing. Os funis gravam aqui automaticamente.</p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <TabBar active={aba} onChange={setAba} tabs={[
        { id: 'produtos', label: 'Produtos' }, { id: 'clientes', label: 'Clientes', count: 0 }, { id: 'respostas', label: 'Respostas e resultado' },
        { id: 'entregas', label: 'Entregas', count: aEntregar.length }, { id: 'remarketing', label: 'Remarketing', count: remk.length },
      ]} />

      {aba === 'produtos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {produtos.map(p => { const s = stats[p.id] || {}; return (
            <Card key={p.id} style={{ borderTop: '3px solid #c4a45a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{p.nome}</div><div style={{ fontWeight: 700, color: '#c4a45a' }}>{brl(p.preco)}</div>
              </div>
              <div style={{ fontSize: 13, color: '#4b5563', margin: '8px 0' }}>{p.descricao}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}><b>Entrega:</b> {p.entrega_descricao || '—'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                {[['Leads', s.leads], ['Compraram', s.compraram], ['A entregar', s.aEntregar], ['Receita', brl(s.receita)]].map(([l, v]) => <div key={l} style={{ background: '#f9fafb', borderRadius: 8, padding: 8, textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 700 }}>{v ?? 0}</div><div style={{ fontSize: 10, color: '#6b7280' }}>{l}</div></div>)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, wordBreak: 'break-all' }}>Funil: {p.url_funil || 'não informado'}<br />Checkout: {p.checkout_url || 'não informado'}</div>
              <BtnSecondary small onClick={() => setProdEdit({ ...p })}>Editar produto</BtnSecondary>
            </Card>); })}
        </div>
      )}

      {aba === 'clientes' && (
        <Card>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <input placeholder="Buscar nome, telefone ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
            <select value={filtroProd} onChange={e => setFiltroProd(e.target.value)} style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}><option value="">Todos os produtos</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}><option value="">Todos os status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            <BtnPrimary small onClick={novoManual}>+ Cadastrar</BtnPrimary>
          </div>
          {filtrada.length === 0 && <div style={{ color: '#9ca3af', padding: 20, textAlign: 'center' }}>Nenhum registro ainda. Quando alguém responder ao quiz ou comprar, aparece aqui.</div>}
          {filtrada.map(i => <Linha key={i.id} i={i}><Badge label={STATUS[i.status]?.label} color={STATUS[i.status]?.cor} />{i.valor_pago ? <span style={{ fontSize: 12, fontWeight: 600 }}>{brl(i.valor_pago)}</span> : null}</Linha>)}
        </Card>
      )}

      {aba === 'respostas' && (
        <Card>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Clique em uma pessoa para ver o que ela respondeu e o resultado gerado.</div>
          {lista.filter(i => i.respostas || i.resultado).map(i => <Linha key={i.id} i={i}><Badge label={i.resultado ? 'Resultado gerado' : 'Só respostas'} color={i.resultado ? '#16a34a' : '#0284c7'} /></Linha>)}
          {lista.filter(i => i.respostas || i.resultado).length === 0 && <div style={{ color: '#9ca3af', padding: 20, textAlign: 'center' }}>Ainda não há respostas gravadas.</div>}
        </Card>
      )}

      {aba === 'entregas' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>A entregar ({aEntregar.length})</div>
            {aEntregar.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>Nada pendente de entrega.</div>}
            {aEntregar.map(i => <Linha key={i.id} i={i}>
              <Badge label={i.resultado ? 'Resultado pronto' : 'Sem resultado'} color={i.resultado ? '#16a34a' : '#d97706'} />
              <BtnPrimary small disabled={!i.telefone || !whatsappConfigurado()} onClick={() => setEnvio({ ic: i, tipo: 'entrega', texto: msgEntrega(i, prodDe(i.produto_id)) })}>Enviar por WhatsApp</BtnPrimary>
              <BtnSecondary small onClick={() => salvar(i.id, { status: 'entregue', entregue_em: new Date().toISOString(), entrega_canal: i.entrega_canal || 'e-mail' })}>Marcar entregue</BtnSecondary>
            </Linha>)}
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Entregues ({entregues.length})</div>
            {entregues.map(i => <Linha key={i.id} i={i}><span style={{ fontSize: 12, color: '#6b7280' }}>{fmtDateTime(i.entregue_em)} · {i.entrega_canal || '—'}</span></Linha>)}
          </Card>
        </>
      )}

      {aba === 'remarketing' && (
        <Card>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Quem fez o quiz ou deixou o contato e ainda não comprou. A mensagem é editável antes de enviar.</div>
          {remk.length === 0 && <div style={{ color: '#9ca3af', padding: 20, textAlign: 'center' }}>Ninguém para recontatar agora.</div>}
          {remk.map(i => <Linha key={i.id} i={i}>
            <Badge label={REMK[i.remarketing_status]?.label} color={REMK[i.remarketing_status]?.cor} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>{dias(i.remarketing_ultimo_contato) != null ? `último contato há ${dias(i.remarketing_ultimo_contato)} dia(s)` : `lead há ${dias(i.created_at)} dia(s)`}</span>
            <BtnPrimary small disabled={!i.telefone || !whatsappConfigurado()} onClick={() => setEnvio({ ic: i, tipo: 'remarketing', texto: msgRemarketing(i, prodDe(i.produto_id)) })}>Enviar mensagem</BtnPrimary>
            <BtnDanger small onClick={() => salvar(i.id, { remarketing_status: 'descartado' })}>Descartar</BtnDanger>
          </Linha>)}
        </Card>
      )}

      <Drawer open={!!prodEdit} onClose={() => setProdEdit(null)} title="Editar produto">
        {prodEdit && (<>
          <Campo label="Nome" value={prodEdit.nome} onChange={v => setProdEdit(p => ({ ...p, nome: v }))} />
          <Campo label="Preço (R$)" type="number" value={prodEdit.preco} onChange={v => setProdEdit(p => ({ ...p, preco: v }))} />
          <Campo label="Descrição" type="textarea" value={prodEdit.descricao} onChange={v => setProdEdit(p => ({ ...p, descricao: v }))} />
          <Campo label="O que é entregue" type="textarea" value={prodEdit.entrega_descricao} onChange={v => setProdEdit(p => ({ ...p, entrega_descricao: v }))} />
          <Campo label="Endereço do funil (quiz)" value={prodEdit.url_funil} onChange={v => setProdEdit(p => ({ ...p, url_funil: v }))} />
          <Campo label="Link de checkout (Cakto)" value={prodEdit.checkout_url} onChange={v => setProdEdit(p => ({ ...p, checkout_url: v }))} />
          <BtnPrimary disabled={ocupado} onClick={async () => { const { id, created_at, ...resto } = prodEdit; const { error } = await supabase.from('infoprodutos').update({ ...resto, preco: Number(resto.preco) || 0 }).eq('id', id); if (error) setErro(error.message); else { setProdEdit(null); carregar(); } }}>Salvar</BtnPrimary>
        </>)}
      </Drawer>

      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.id ? (sel.nome || 'Cliente do infoproduto') : 'Novo registro'} width={560}>
        {sel && (<>
          <Campo label="Produto" value={sel.produto_id} onChange={v => setSel(s => ({ ...s, produto_id: v }))} options={produtos.map(p => ({ value: p.id, label: p.nome }))} />
          <Campo label="Nome" value={sel.nome} onChange={v => setSel(s => ({ ...s, nome: v }))} />
          <Campo label="WhatsApp" value={sel.telefone} onChange={v => setSel(s => ({ ...s, telefone: v }))} />
          <Campo label="E-mail" value={sel.email} onChange={v => setSel(s => ({ ...s, email: v }))} />
          <Campo label="Status" value={sel.status} onChange={v => setSel(s => ({ ...s, status: v }))} options={Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Campo label="Valor pago (R$)" type="number" value={sel.valor_pago} onChange={v => setSel(s => ({ ...s, valor_pago: v }))} />
          <div style={{ marginBottom: 14, fontSize: 13 }}>
            {sel.cliente_id ? <>Ligada ao cadastro de clientes: <b>{clientes.find(c => c.id === sel.cliente_id)?.nome || 'cliente'}</b> <BtnSecondary small onClick={() => onNavegar && onNavegar('clientes')}>Abrir Clientes</BtnSecondary></>
              : sel.id ? <>Ainda sem cadastro de cliente. <BtnSecondary small disabled={ocupado} onClick={() => criarCadastro(sel)}>Criar cadastro de cliente</BtnSecondary></> : null}
          </div>
          {sel.respostas && <>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Respostas</div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}>
              {Object.entries(sel.respostas).map(([k, v]) => { const p = TODAS_PERGUNTAS.find(x => x.id === k); return <div key={k} style={{ marginBottom: 6 }}><b>{p?.label || k}:</b> {p ? respostaLegivel(p, v) : (typeof v === 'object' ? JSON.stringify(v) : String(v))}</div>; })}
            </div>
          </>}
          <Campo label="Resultado gerado (o que foi entregue)" type="textarea" rows={8} value={sel.resultado} onChange={v => setSel(s => ({ ...s, resultado: v }))} />
          <Campo label="Canal da entrega" value={sel.entrega_canal} onChange={v => setSel(s => ({ ...s, entrega_canal: v }))} options={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'e-mail', label: 'E-mail' }, { value: 'whatsapp + e-mail', label: 'WhatsApp + e-mail' }]} />
          <Campo label="Remarketing" value={sel.remarketing_status || 'nao'} onChange={v => setSel(s => ({ ...s, remarketing_status: v }))} options={Object.entries(REMK).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Campo label="Observações" type="textarea" value={sel.obs} onChange={v => setSel(s => ({ ...s, obs: v }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimary disabled={ocupado} onClick={gravarSel}>Salvar</BtnPrimary>
            {sel.id && <BtnDanger onClick={async () => { if (!window.confirm('Excluir este registro?')) return; await supabase.from('infoproduto_clientes').delete().eq('id', sel.id); setSel(null); carregar(); }}>Excluir</BtnDanger>}
          </div>
        </>)}
      </Drawer>

      <Drawer open={!!envio} onClose={() => setEnvio(null)} title={envio?.tipo === 'entrega' ? 'Enviar resultado por WhatsApp' : 'Mensagem de remarketing'}>
        {envio && (<>
          <div style={{ fontSize: 13, marginBottom: 10 }}>Para: <b>{envio.ic.nome}</b> · {envio.ic.telefone}</div>
          <Campo label="Mensagem" type="textarea" rows={10} value={envio.texto} onChange={v => setEnvio(e => ({ ...e, texto: v }))} />
          <BtnPrimary disabled={ocupado} onClick={enviarMensagem}>{ocupado ? 'Enviando...' : 'Enviar'}</BtnPrimary>
        </>)}
      </Drawer>
    </div>
  );
}
