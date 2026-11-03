import { useState } from 'react';
import { Badge, Card, BtnPrimary, BtnSecondary, TabBar, Drawer, Campo, Aviso, fmtDate, erroDeSchema } from './ui.jsx';
import { criarCliente, criarOS, enviarQuizPorWhatsApp, ROTULO_ETAPA, SLUGS_ETAPA } from '../lib/api.js';
import { linkDoQuiz } from './quizConsultoria.js';

const OPCOES_ORIGEM = [['instagram', 'Instagram'], ['indicacao', 'Indicação'], ['loja_fisica', 'Loja física'], ['google', 'Google'], ['whatsapp', 'WhatsApp'], ['outro', 'Outro']].map(([value, label]) => ({ value, label }));
const ETAPAS_INICIAIS = SLUGS_ETAPA.slice(0, 8).map(s => ({ value: s, label: ROTULO_ETAPA[s] }));
const FORM_VAZIO = { nome: '', telefone: '', email: '', instagram: '', origem: '', obs: '' };
const OS_VAZIA = { descricao: '', data_evento: '', servico: '', etapaInicial: 'qualificacao' };

function msgErro(error) {
  if (!error) return '';
  if (erroDeSchema(error)) return 'O banco ainda não tem as colunas novas. Aplique a migração 20261102000000 no Supabase e tente de novo. (' + error.message + ')';
  return error.message || String(error);
}

export default function Clientes({ clientes, os, quizEnvios = [], onRecarregar, onSalvar, onIrFluxo }) {
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [aba, setAba] = useState('dados');

  const [novoAberto, setNovoAberto] = useState(false);
  const [novo, setNovo] = useState(FORM_VAZIO);
  const [abrirOSJunto, setAbrirOSJunto] = useState(true);
  const [novaOS, setNovaOS] = useState(OS_VAZIA);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [mostrarFormOS, setMostrarFormOS] = useState(false);
  const [osForm, setOsForm] = useState(OS_VAZIA);

  const filtrados = clientes.filter(c => (c.nome || '').toLowerCase().includes(busca.toLowerCase()) || (c.telefone || '').includes(busca));

  const abrirFicha = (c) => { setSel(c); setForm({ ...c }); setEditando(false); setAba('dados'); setErro(''); setAviso(''); setMostrarFormOS(false); };
  const fecharFicha = () => { setSel(null); setErro(''); setAviso(''); };

  async function salvarNovo() {
    if (!novo.nome.trim()) { setErro('Informe o nome da cliente.'); return; }
    setSalvando(true); setErro('');
    const { data: cliente, error } = await criarCliente({ ...novo, nome: novo.nome.trim() });
    if (error) { setSalvando(false); setErro(msgErro(error)); return; }
    let osCriada = null;
    if (abrirOSJunto) {
      const r = await criarOS({ cliente, listaOS: os, ...novaOS });
      if (r.error) {
        setSalvando(false);
        await onRecarregar();
        setErro('Cliente cadastrada, mas não consegui abrir a OS: ' + msgErro(r.error));
        return;
      }
      osCriada = r.data;
    }
    await onRecarregar();
    setSalvando(false);
    setNovoAberto(false); setNovo(FORM_VAZIO); setNovaOS(OS_VAZIA);
    if (osCriada && onIrFluxo) onIrFluxo();
  }

  async function abrirOSDaCliente() {
    setSalvando(true); setErro('');
    const r = await criarOS({ cliente: sel, listaOS: os, ...osForm });
    setSalvando(false);
    if (r.error) { setErro(msgErro(r.error)); return; }
    await onRecarregar();
    setMostrarFormOS(false); setOsForm(OS_VAZIA);
    setAviso(`OS ${r.data.numero} aberta na etapa "${ROTULO_ETAPA[r.data.status]}". Ela já aparece no Fluxo de Atendimento.`);
  }

  async function enviarQuiz(osDoQuiz) {
    setSalvando(true); setErro(''); setAviso('');
    const r = await enviarQuizPorWhatsApp({ cliente: sel, os: osDoQuiz });
    setSalvando(false);
    await onRecarregar();
    if (r.error) { setErro(r.error + (r.envio ? ` O link já foi criado: ${linkDoQuiz(r.envio.token)}` : '')); return; }
    setAviso('Quiz enviado pelo WhatsApp. As respostas vão aparecer aqui e na Consultoria Express.');
  }

  const osDaCliente = sel ? os.filter(o => o.cliente_id === sel.id) : [];
  const quizzesDaCliente = sel ? quizEnvios.filter(q => q.cliente_id === sel.id) : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Clientes</h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>{clientes.length} clientes cadastradas</p>
        </div>
        <BtnPrimary onClick={() => { setNovo(FORM_VAZIO); setNovaOS(OS_VAZIA); setAbrirOSJunto(true); setErro(''); setNovoAberto(true); }}>Nova cliente</BtnPrimary>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..." style={{ width: '100%', maxWidth: 400, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#111' }}>
              {['Nome', 'Telefone', 'Biotipo', 'Colorimetria', 'OS ativas', 'Ações'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#c4a45a', fontWeight: 600, fontSize: 13 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c, i) => {
              const ativas = os.filter(o => o.cliente_id === c.id && o.status_idx < 23);
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.nome}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#6b7280' }}>{c.telefone || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{c.biotipo || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{c.colorimetria || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{ativas.length > 0 ? <Badge label={`${ativas.length} OS`} color="#c4a45a" /> : <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>}</td>
                  <td style={{ padding: '12px 16px' }}><button onClick={() => abrirFicha(c)} style={{ padding: '5px 14px', background: '#111', color: '#c4a45a', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver ficha</button></td>
                </tr>
              );
            })}
            {filtrados.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>{clientes.length === 0 ? 'Nenhuma cliente cadastrada ainda. Use "Nova cliente" para começar.' : 'Nenhuma cliente encontrada.'}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ── Nova cliente ── */}
      <Drawer open={novoAberto} onClose={() => setNovoAberto(false)} title="Nova cliente" width={520}>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Campo label="Nome completo *" value={novo.nome} onChange={v => setNovo(p => ({ ...p, nome: v }))} />
        <Campo label="Telefone (WhatsApp)" value={novo.telefone} onChange={v => setNovo(p => ({ ...p, telefone: v }))} placeholder="(14) 99999-9999" ajuda="Usado para confirmar agenda e enviar o quiz pelo WhatsApp." />
        <Campo label="E-mail" value={novo.email} onChange={v => setNovo(p => ({ ...p, email: v }))} type="email" />
        <Campo label="Instagram" value={novo.instagram} onChange={v => setNovo(p => ({ ...p, instagram: v }))} placeholder="@usuario" />
        <Campo label="Como chegou até nós" value={novo.origem} onChange={v => setNovo(p => ({ ...p, origem: v }))} options={OPCOES_ORIGEM} />
        <Campo label="Observações" value={novo.obs} onChange={v => setNovo(p => ({ ...p, obs: v }))} type="textarea" />

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 14px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={abrirOSJunto} onChange={e => setAbrirOSJunto(e.target.checked)} /> Abrir ordem de serviço agora
        </label>
        {abrirOSJunto && (
          <Card style={{ background: '#fef9f0', marginBottom: 16 }}>
            <Campo label="O que ela procura" value={novaOS.descricao} onChange={v => setNovaOS(p => ({ ...p, descricao: v }))} placeholder="Ex.: vestido de madrinha, azul petróleo" />
            <Campo label="Data do evento" value={novaOS.data_evento} onChange={v => setNovaOS(p => ({ ...p, data_evento: v }))} type="date" />
            <Campo label="Etapa inicial no fluxo" value={novaOS.etapaInicial} onChange={v => setNovaOS(p => ({ ...p, etapaInicial: v }))} options={ETAPAS_INICIAIS} ajuda="A OS entra no Fluxo de Atendimento nesta etapa e já cria a tarefa correspondente." />
          </Card>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <BtnPrimary onClick={salvarNovo} disabled={salvando}>{salvando ? 'Salvando...' : abrirOSJunto ? 'Cadastrar e abrir OS' : 'Cadastrar cliente'}</BtnPrimary>
          <BtnSecondary onClick={() => setNovoAberto(false)}>Cancelar</BtnSecondary>
        </div>
      </Drawer>

      {/* ── Ficha ── */}
      <Drawer open={!!sel} onClose={fecharFicha} title={sel?.nome || ''} width={580}>
        {sel && (
          <div>
            <TabBar tabs={[{ id: 'dados', label: 'Dados' }, { id: 'medidas', label: 'Medidas' }, { id: 'fotos', label: 'Fotos' }, { id: 'historico', label: 'OS e quiz' }]} active={aba} onChange={setAba} />
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
            {(aba === 'dados' || aba === 'medidas') && (
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {editando ? (
                  <>
                    <BtnSecondary small onClick={() => { setForm({ ...sel }); setEditando(false); }}>Cancelar</BtnSecondary>
                    <BtnPrimary small onClick={async () => { setErro(''); const e = await onSalvar(form); if (e) { setErro(msgErro(e)); return; } setSel(prev => ({ ...prev, ...form })); setEditando(false); }}>Salvar</BtnPrimary>
                  </>
                ) : <BtnSecondary small onClick={() => setEditando(true)}>Editar</BtnSecondary>}
              </div>
            )}

            {aba === 'dados' && (() => {
              const f = (k) => editando ? form[k] : sel[k];
              const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));
              const ro = !editando;
              return (
                <div>
                  <Campo label="Nome completo" value={f('nome')} onChange={set('nome')} readonly={ro} />
                  <Campo label="Apelido / Como chamar" value={f('apelido')} onChange={set('apelido')} readonly={ro} />
                  <Campo label="CPF / CNPJ" value={f('cpf')} onChange={set('cpf')} readonly={ro} />
                  <Campo label="Data de nascimento" value={ro ? fmtDate(sel.nascimento) : form.nascimento} onChange={set('nascimento')} readonly={ro} type="date" />
                  <Campo label="Telefone (WhatsApp)" value={f('telefone')} onChange={set('telefone')} readonly={ro} />
                  <Campo label="E-mail" value={f('email')} onChange={set('email')} readonly={ro} />
                  <Campo label="Instagram" value={f('instagram')} onChange={set('instagram')} readonly={ro} />
                  <Campo label="Como chegou até nós" value={f('origem')} onChange={set('origem')} readonly={ro} />
                  <Campo label="Biotipo" value={f('biotipo')} onChange={set('biotipo')} readonly={ro} options={[['ampulheta', 'Ampulheta'], ['triangulo', 'Triângulo'], ['triangulo_invertido', 'Triângulo invertido'], ['retangulo', 'Retângulo'], ['oval', 'Oval']].map(([value, label]) => ({ value, label }))} />
                  <Campo label="Colorimetria" value={f('colorimetria')} onChange={set('colorimetria')} readonly={ro} options={[['primavera', 'Primavera'], ['verao', 'Verão'], ['outono', 'Outono'], ['inverno', 'Inverno']].map(([value, label]) => ({ value, label }))} />
                  <Campo label="Estilo predominante" value={f('estilo')} onChange={set('estilo')} readonly={ro} options={[['classico', 'Clássico'], ['romantico', 'Romântico'], ['dramatico', 'Dramático'], ['esportivo', 'Esportivo'], ['criativo', 'Criativo'], ['natural', 'Natural']].map(([value, label]) => ({ value, label }))} />
                  <Campo label="Restrições de modelagem" value={f('restricoes_modelagem')} onChange={set('restricoes_modelagem')} readonly={ro} type="textarea" />
                  <Campo label="Preferências de tecidos" value={f('preferencias_tecidos')} onChange={set('preferencias_tecidos')} readonly={ro} type="textarea" />
                  <Campo label="Observações gerais" value={f('obs')} onChange={set('obs')} readonly={ro} type="textarea" />
                </div>
              );
            })()}

            {aba === 'medidas' && (
              <div>
                {[['busto', 'Busto (cm)'], ['cintura', 'Cintura (cm)'], ['quadril', 'Quadril (cm)'], ['altura', 'Altura (cm)'], ['peso', 'Peso (kg)'], ['ombro_joelho', 'Ombro ao joelho (cm)'], ['ombro_chao', 'Ombro ao chão (cm)'], ['manga', 'Manga (cm)'], ['cava', 'Cava (cm)'], ['entrepernas', 'Entrepernas (cm)']].map(([k, l]) => (
                  <Campo key={k} label={l} value={editando ? form[k] : sel[k]} onChange={v => setForm(p => ({ ...p, [k]: v }))} readonly={!editando} type="number" />
                ))}
                <Campo label="Observações de medidas" value={editando ? form.obs_medidas : sel.obs_medidas} onChange={v => setForm(p => ({ ...p, obs_medidas: v }))} readonly={!editando} type="textarea" />
              </div>
            )}

            {aba === 'fotos' && <Aviso tipo="info">O envio de fotos da cliente ainda não está ligado ao armazenamento. Por enquanto, guarde as fotos que ela mandar pelo WhatsApp.</Aviso>}

            {aba === 'historico' && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  <BtnPrimary small onClick={() => { setMostrarFormOS(v => !v); setOsForm(OS_VAZIA); }}>{mostrarFormOS ? 'Fechar' : 'Abrir nova OS'}</BtnPrimary>
                  <BtnSecondary small disabled={salvando || !sel.telefone} onClick={() => enviarQuiz(osDaCliente.find(o => o.status_idx < 23) || null)}>{salvando ? 'Enviando...' : 'Enviar quiz da consultoria'}</BtnSecondary>
                </div>
                {!sel.telefone && <Aviso tipo="atencao">Cadastre o telefone para enviar o quiz pelo WhatsApp.</Aviso>}

                {mostrarFormOS && (
                  <Card style={{ background: '#fef9f0', marginBottom: 16 }}>
                    <Campo label="O que ela procura" value={osForm.descricao} onChange={v => setOsForm(p => ({ ...p, descricao: v }))} />
                    <Campo label="Data do evento" value={osForm.data_evento} onChange={v => setOsForm(p => ({ ...p, data_evento: v }))} type="date" />
                    <Campo label="Etapa inicial no fluxo" value={osForm.etapaInicial} onChange={v => setOsForm(p => ({ ...p, etapaInicial: v }))} options={ETAPAS_INICIAIS} />
                    <BtnPrimary small onClick={abrirOSDaCliente} disabled={salvando}>{salvando ? 'Abrindo...' : 'Abrir OS'}</BtnPrimary>
                  </Card>
                )}

                <h4 style={{ margin: '8px 0 10px', fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>Ordens de serviço</h4>
                {osDaCliente.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 12 }}>Nenhuma OS ainda.</div>}
                {osDaCliente.map(o => (
                  <Card key={o.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>{o.numero || 'OS sem número'}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{o.descricao || '—'}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Badge label={ROTULO_ETAPA[o.status] || o.status} color="#c4a45a" />
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>Evento: {fmtDate(o.data_evento)}</span>
                    </div>
                  </Card>
                ))}

                <h4 style={{ margin: '18px 0 10px', fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>Quiz da consultoria</h4>
                {quizzesDaCliente.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum quiz enviado.</div>}
                {quizzesDaCliente.map(q => (
                  <Card key={q.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Badge label={q.status === 'respondido' ? 'Respondido' : q.status === 'enviado' ? 'Enviado' : 'Link criado'} color={q.status === 'respondido' ? '#22c55e' : '#f59e0b'} />
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmtDate(q.respondido_em || q.enviado_em || q.criado_em)}</span>
                    </div>
                    {q.status === 'respondido' && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>As respostas foram para a ficha (campos vazios) e estão na aba Consultoria Express.</div>}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
