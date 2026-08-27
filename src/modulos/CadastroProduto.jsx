import { useState } from 'react';

// ── Helpers locais (duplicados de DasGCRMv4.jsx deliberadamente — módulo novo em
// arquivo próprio, não puxa do monólito pra não criar acoplamento cruzado) ──
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

const STATUS_PRODUTO = [
  { id: 'em_aprovacao', label: 'Aguardando aprovação', cor: '#f59e0b' },
  { id: 'aprovado', label: 'Aprovado', cor: '#22c55e' },
];

function StatusProdutoBadge({ status }) {
  const s = STATUS_PRODUTO.find(s => s.id === status) || STATUS_PRODUTO[0];
  return (
    <span style={{ background: s.cor + '22', color: s.cor, border: `1px solid ${s.cor}55`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function Campo({ label, value, onChange, type = 'text', options, readonly }) {
  const style = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, background: readonly ? '#f9fafb' : '#fff' };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {readonly ? (
        <div style={{ ...style, color: '#374151' }}>{value || '—'}</div>
      ) : options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={style}>
          <option value="">Selecionar...</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={style} />
      ) : (
        <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} style={style} />
      )}
    </div>
  );
}

function Drawer({ open, onClose, title, children, width = 560 }) {
  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width,
        background: '#fff', zIndex: 101, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#c4a45a', fontSize: 22, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>{children}</div>
      </div>
    </>
  );
}

function BtnPrimary({ children, onClick, small, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#d1d5db' : '#c4a45a', color: '#fff', border: 'none',
      borderRadius: 6, padding: small ? '6px 14px' : '10px 20px',
      fontSize: small ? 13 : 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>{children}</button>
  );
}

function BtnSecondary({ children, onClick, small, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: '#fff', color: disabled ? '#9ca3af' : '#374151', border: '1px solid #d1d5db',
      borderRadius: 6, padding: small ? '6px 14px' : '10px 20px',
      fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    }}>{children}</button>
  );
}

// ── MÓDULO: CADASTRO DE PRODUTO (Vitrine IA) ─────────────────
export default function CadastroProduto({
  produtos, produtoFotos, produtoVariantes,
  onAprovar, onRefazerFotos, onSalvarProduto,
  onSalvarVariante, onRemoverVariante,
}) {
  const [selecionado, setSelecionado] = useState(null);
  const [form, setForm] = useState(null);
  const [obsRefazer, setObsRefazer] = useState('');
  const [enviandoRefazer, setEnviandoRefazer] = useState(false);
  const [novaVariante, setNovaVariante] = useState({ tamanho: '', cor: '', quantidade_estoque: 0 });

  const abrirProduto = (p) => {
    setSelecionado(p);
    setForm({ ...p });
    setObsRefazer('');
  };

  const fotosDoProduto = (produtoId) =>
    (produtoFotos || []).filter(f => f.produto_id === produtoId).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const variantesDoProduto = (produtoId) =>
    (produtoVariantes || []).filter(v => v.produto_id === produtoId);

  const salvarCampos = async () => {
    const { id, tecido, composicao, cor, tamanhos, detalhes, preco_custo, preco_venda, ncm,
      ncm_confirmado, marca, cest, gtin, categoria_produto, descricao_curta, descricao_completa } = form;
    await onSalvarProduto(id, {
      tecido, composicao, cor, tamanhos, detalhes, preco_custo, preco_venda, ncm,
      ncm_confirmado, marca, cest, gtin, categoria_produto, descricao_curta, descricao_completa,
    });
  };

  const refazer = async () => {
    setEnviandoRefazer(true);
    await onRefazerFotos(selecionado.codigo, selecionado.phone, obsRefazer);
    setEnviandoRefazer(false);
    setObsRefazer('');
  };

  const adicionarVariante = async () => {
    if (!novaVariante.tamanho && !novaVariante.cor) return;
    await onSalvarVariante(selecionado.id, {
      tamanho: novaVariante.tamanho, cor: novaVariante.cor,
      sku: `${selecionado.codigo}-${novaVariante.tamanho}-${novaVariante.cor}`.toUpperCase().replace(/\s+/g, ''),
      quantidade_estoque: Number(novaVariante.quantidade_estoque) || 0,
    });
    setNovaVariante({ tamanho: '', cor: '', quantidade_estoque: 0 });
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Cadastro de Produto</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>Fluxo Vitrine IA — cadastro por WhatsApp com aprovação aqui</p>

      <div style={{ display: 'flex', gap: 16 }}>
        {STATUS_PRODUTO.map(s => {
          const doStatus = (produtos || []).filter(p => (p.status_geral || 'em_aprovacao') === s.id);
          return (
            <div key={s.id} style={{ flex: 1, minWidth: 260 }}>
              <div style={{ background: '#111', color: '#c4a45a', padding: '8px 12px', borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                {s.label} <span style={{ background: '#c4a45a', color: '#111', borderRadius: 10, padding: '1px 7px', marginLeft: 6 }}>{doStatus.length}</span>
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 8, minHeight: 160 }}>
                {doStatus.map(p => (
                  <div key={p.id} onClick={() => abrirProduto(p)} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8, cursor: 'pointer', borderLeft: `3px solid ${s.cor}`, display: 'flex', gap: 10 }}>
                    {p.mosaico_url && (
                      <img src={p.mosaico_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome || p.codigo || 'Sem nome'}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{p.codigo}</div>
                      <div style={{ fontSize: 12, color: '#c4a45a', fontWeight: 600 }}>{fmt(p.preco_venda)}</div>
                    </div>
                  </div>
                ))}
                {doStatus.length === 0 && <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 20 }}>Nenhum produto</div>}
              </div>
            </div>
          );
        })}
      </div>

      {selecionado && form && (
        <Drawer open={!!selecionado} onClose={() => setSelecionado(null)} title={form.nome || form.codigo}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusProdutoBadge status={form.status_geral} />
            {form.bling_produto_id ? (
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✓ Sincronizado com a Bling</span>
            ) : (
              <span title="Checagem com a Bling ainda não configurada — falta token de API" style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }}>
                Não sincronizado com a Bling
              </span>
            )}
          </div>

          {form.mosaico_url && (
            <img src={form.mosaico_url} alt="Mosaico" style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 20 }}>
            {fotosDoProduto(form.id).filter(f => !f.is_mosaico_bruto).map(f => (
              <img key={f.id} src={`https://gfmvyujaxlwizmvwmcfm.supabase.co/storage/v1/object/public/dasg-fotos/${f.storage_path}`}
                alt={f.panel_name} title={f.panel_name}
                style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', borderRadius: 6, border: f.aprovada ? '2px solid #22c55e' : '1px solid #e5e7eb' }} />
            ))}
            {fotosDoProduto(form.id).filter(f => !f.is_mosaico_bruto).length === 0 && (
              <div style={{ gridColumn: '1 / -1', color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 12 }}>
                Fotos recortadas ainda não geradas
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <BtnPrimary onClick={() => onAprovar(form.id)} disabled={form.status_geral === 'aprovado'}>
              {form.status_geral === 'aprovado' ? 'Já aprovado' : 'Aprovar'}
            </BtnPrimary>
          </div>

          <div style={{ marginBottom: 20, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
            <Campo label="Pedir pra refazer fotos (obs opcional)" value={obsRefazer} onChange={setObsRefazer} type="textarea" />
            <BtnSecondary onClick={refazer} disabled={enviandoRefazer} small>
              {enviandoRefazer ? 'Enviando...' : '🔄 Refazer fotos'}
            </BtnSecondary>
          </div>

          <Campo label="Nome" value={form.nome} readonly />
          <Campo label="Tecido" value={form.tecido} onChange={v => setForm({ ...form, tecido: v })} />
          <Campo label="Composição" value={form.composicao} onChange={v => setForm({ ...form, composicao: v })} />
          <Campo label="Cor" value={form.cor} onChange={v => setForm({ ...form, cor: v })} />
          <Campo label="Tamanhos" value={form.tamanhos} onChange={v => setForm({ ...form, tamanhos: v })} />
          <Campo label="Detalhes" value={form.detalhes} onChange={v => setForm({ ...form, detalhes: v })} type="textarea" />
          <Campo label="Preço custo" value={form.preco_custo} onChange={v => setForm({ ...form, preco_custo: v })} type="number" />
          <Campo label="Preço venda" value={form.preco_venda} onChange={v => setForm({ ...form, preco_venda: v })} type="number" />
          <Campo label="NCM" value={form.ncm} onChange={v => setForm({ ...form, ncm: v })} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: -8 }}>
            <input type="checkbox" checked={!!form.ncm_confirmado} onChange={e => setForm({ ...form, ncm_confirmado: e.target.checked })} />
            <span style={{ fontSize: 12, color: form.ncm_confirmado ? '#22c55e' : '#ef4444' }}>
              {form.ncm_confirmado ? '🟢 NCM confirmado' : '🔴 NCM sugerido pela IA, ainda não confirmado'}
            </span>
          </div>
          {form.ncm_fonte_url && (
            <a href={form.ncm_fonte_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#6b7280', display: 'block', marginTop: -10, marginBottom: 14 }}>
              Fonte consultada pela IA ↗
            </a>
          )}
          <Campo label="Marca" value={form.marca} onChange={v => setForm({ ...form, marca: v })} />
          <Campo label="CEST" value={form.cest} onChange={v => setForm({ ...form, cest: v })} />
          <Campo label="GTIN" value={form.gtin} onChange={v => setForm({ ...form, gtin: v })} />
          <Campo label="Categoria (formato Bling: pai>>filha)" value={form.categoria_produto} onChange={v => setForm({ ...form, categoria_produto: v })} />
          <Campo label="Descrição curta" value={form.descricao_curta} onChange={v => setForm({ ...form, descricao_curta: v })} />
          <Campo label="Descrição completa" value={form.descricao_completa} onChange={v => setForm({ ...form, descricao_completa: v })} type="textarea" />
          <Campo label="Criado em" value={fmtDateTime(form.criado_em)} readonly />

          <BtnPrimary onClick={salvarCampos}>Salvar alterações</BtnPrimary>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Variações (tamanho / cor / estoque)</h3>
            {variantesDoProduto(form.id).map(v => (
              <div key={v.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{v.tamanho || '—'} / {v.cor || '—'}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{v.sku}</span>
                <input type="number" defaultValue={v.quantidade_estoque}
                  onBlur={e => onSalvarVariante(form.id, { id: v.id, quantidade_estoque: Number(e.target.value) || 0 })}
                  style={{ width: 60, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
                <button onClick={() => onRemoverVariante(v.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Remover</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <input placeholder="Tamanho" value={novaVariante.tamanho} onChange={e => setNovaVariante({ ...novaVariante, tamanho: e.target.value })}
                style={{ width: 70, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
              <input placeholder="Cor" value={novaVariante.cor} onChange={e => setNovaVariante({ ...novaVariante, cor: e.target.value })}
                style={{ width: 90, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
              <input placeholder="Qtd" type="number" value={novaVariante.quantidade_estoque} onChange={e => setNovaVariante({ ...novaVariante, quantidade_estoque: e.target.value })}
                style={{ width: 60, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
              <BtnSecondary onClick={adicionarVariante} small>+ Variante</BtnSecondary>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
