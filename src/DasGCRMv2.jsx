import { useState, useEffect } from "react";

// ============================================================
// MOCK DATA
// ============================================================
const MOCK_CLIENTES = [
  {
    id: "1", nome: "Fernanda Oliveira", telefone: "(11) 99999-1111",
    whatsapp: "5511999991111", email: "fernanda@email.com",
    cpf: "123.456.789-00", rg: "",
    cep: "01310-100", logradouro: "Av. Paulista", numero: "1000",
    complemento: "Apto 52", bairro: "Bela Vista", cidade: "São Paulo", estado: "SP",
    biotipo: "Ampulheta", colorimetria: "Outono", estilo_pessoal: "Clássico elegante",
    status: "ativo", fluxo: "estilista_express", origem: "instagram",
    medida_busto: 102, medida_cintura: 82, medida_quadril: 110,
    medida_ombro: 42, medida_comprimento_vestido: 140, medida_manga: 58,
    medida_comprimento_torso: 42, medida_comprimento_saia: 65,
    observacoes: "Prefere tecidos leves. Evento: Casamento filha em dezembro.",
    created_at: "2024-10-01"
  },
  {
    id: "2", nome: "Carla Mendes", telefone: "(11) 98888-2222",
    whatsapp: "5511988882222", email: "carla@email.com",
    cpf: "987.654.321-00", rg: "",
    cep: "04038-001", logradouro: "Rua Domingos de Morais", numero: "2187",
    complemento: "", bairro: "Vila Mariana", cidade: "São Paulo", estado: "SP",
    biotipo: "Triângulo invertido", colorimetria: "Inverno", estilo_pessoal: "Dramático",
    status: "ativo", fluxo: "orcamento_direto", origem: "indicacao",
    medida_busto: 96, medida_cintura: 78, medida_quadril: 106,
    medida_ombro: 40, medida_comprimento_vestido: 135, medida_manga: 56,
    medida_comprimento_torso: 40, medida_comprimento_saia: 62,
    observacoes: "Formatura em novembro. Quer vestido longo azul marinho.",
    created_at: "2024-10-15"
  },
  {
    id: "3", nome: "Patrícia Silva", telefone: "(11) 97777-3333",
    whatsapp: "5511977773333", email: "patricia@email.com",
    cpf: "", rg: "",
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
    biotipo: "Retângulo", colorimetria: "Primavera", estilo_pessoal: "Romântico",
    status: "lead", fluxo: "estilista_express", origem: "instagram",
    medida_busto: 98, medida_cintura: 90, medida_quadril: 104,
    medida_ombro: 41, medida_comprimento_vestido: 138, medida_manga: 57,
    medida_comprimento_torso: 41, medida_comprimento_saia: 63,
    observacoes: "",
    created_at: "2024-11-02"
  }
];

const MOCK_OS = [
  {
    id: "os1", numero: "OS-2024-001", cliente_id: "1", cliente_nome: "Fernanda Oliveira",
    fluxo: "estilista_express", status: "prova",
    data_evento: "2024-12-15", descricao_evento: "Casamento — Madrinha",
    pecas: [{ id: "p1", nome: "Vestido madrinha", descricao: "Vestido longo, decote em V, fenda lateral", tecido: "Zibeline", cor: "Vinho", acabamentos: "Viés dourado, forro duplo", acessorios: "Cinto pedraria" }],
    foto_croqui_url: null, imagem_ia_url: null,
    data_medidas: "2024-10-20",
    data_prova_1: "2024-11-05", anotacoes_prova_1: "Ajustar busto 1cm. Baixar barra 2cm.",
    data_prova_2: "2024-11-19", anotacoes_prova_2: "Cinto muito largo, substituir.",
    data_prova_3: "2024-12-03", anotacoes_prova_3: "",
    data_entrega_prevista: "2024-12-08",
    dossie_gerado: true, dossie_enviado_em: "2024-10-22",
    conteudo_bloqueado: true, observacoes: "", created_at: "2024-10-18"
  },
  {
    id: "os2", numero: "OS-2024-002", cliente_id: "2", cliente_nome: "Carla Mendes",
    fluxo: "orcamento_direto", status: "aprovado",
    data_evento: "2024-11-30", descricao_evento: "Formatura Direito USP",
    pecas: [{ id: "p1", nome: "Vestido de formatura", descricao: "Vestido longo azul marinho, cauda curta", tecido: "Tafetá dupla face", cor: "Azul marinho", acabamentos: "Bordado no busto", acessorios: "" }],
    foto_croqui_url: null, imagem_ia_url: null,
    data_medidas: "2024-10-28",
    data_prova_1: "2024-11-12", anotacoes_prova_1: "",
    data_prova_2: "2024-11-22", anotacoes_prova_2: "",
    data_prova_3: null, anotacoes_prova_3: "",
    data_entrega_prevista: "2024-11-23",
    dossie_gerado: false, conteudo_bloqueado: true, observacoes: "", created_at: "2024-10-25"
  }
];

const MOCK_ORCAMENTOS = [
  {
    id: "orc1", numero: "ORC-2024-001", cliente_id: "1", os_id: "os1", status: "aprovado",
    itens_material: [
      { descricao: "Zibeline vinho", quantidade: 4, unidade: "m", valor_unit: 85, valor_total: 340 },
      { descricao: "Forro acetinado", quantidade: 3.5, unidade: "m", valor_unit: 28, valor_total: 98 },
      { descricao: "Cinto pedraria", quantidade: 1, unidade: "un", valor_unit: 120, valor_total: 120 },
    ],
    horas_trabalho: 28, valor_hora: 80, valor_aviamentos: 45, valor_frete_material: 0,
    subtotal_material: 558, percentual_overhead: 30, percentual_margem: 40,
    valor_total: 2454.84, prazo_entrega_dias: 49,
    condicoes_pagamento: "50% entrada / 50% entrega", validade_dias: 7,
    enviado_em: "2024-10-22", aprovado_em: "2024-10-23"
  }
];

const MOCK_AGENDA = [
  { id: "ag1", cliente_id: "1", os_id: "os1", tipo: "prova_2", titulo: "Prova 2 — Fernanda", data_hora: "2024-11-19T14:00:00", duracao_minutos: 60, status: "agendado", cliente_nome: "Fernanda Oliveira" },
  { id: "ag2", cliente_id: "2", os_id: "os2", tipo: "prova_1", titulo: "Prova 1 — Carla", data_hora: "2024-11-12T10:00:00", duracao_minutos: 60, status: "agendado", cliente_nome: "Carla Mendes" },
  { id: "ag3", cliente_id: "1", os_id: "os1", tipo: "prova_3", titulo: "Prova 3 — Fernanda", data_hora: "2024-12-03T15:00:00", duracao_minutos: 60, status: "agendado", cliente_nome: "Fernanda Oliveira" },
  { id: "ag4", cliente_id: "3", os_id: null, tipo: "consultoria", titulo: "Consultoria — Patrícia", data_hora: "2024-11-08T11:00:00", duracao_minutos: 60, status: "agendado", cliente_nome: "Patrícia Silva" },
];

const MOCK_CONVERSAS = {
  "1": [
    { id: "m1", role: "user", content: "Oi! Vi seus trabalhos no Instagram e amei! Quero fazer um vestido para o casamento da minha filha", created_at: "2024-10-01T10:00:00" },
    { id: "m2", role: "assistant", content: "Que alegria receber sua mensagem! 🌸 Que momento especial — o casamento da sua filha! Aqui no Das G a Juliana vai criar algo único para você. Vou te enviar nosso questionário para entender melhor seu estilo e garantir que ela já chegue preparada para sua consultoria. Pode ser?", created_at: "2024-10-01T10:01:00" },
    { id: "m3", role: "user", content: "Sim claro! Estou ansiosa", created_at: "2024-10-01T10:05:00" },
    { id: "m4", role: "assistant", content: "Perfeito! Acabei de enviar o link do questionário raio-x para você. São apenas 10 perguntas e levam uns 5 minutinhos. Após o preenchimento, a Juliana já vai ter todo o contexto para criar algo que vai realçar sua beleza de forma incrível ✨", created_at: "2024-10-01T10:06:00" },
  ],
  "2": [
    { id: "m5", role: "user", content: "Boa tarde! Quero um orçamento para vestido de formatura longo azul marinho", created_at: "2024-10-15T14:30:00" },
    { id: "m6", role: "assistant", content: "Boa tarde! Que momento especial sua formatura! 🎓 Me conta um pouco mais — você já tem ideia do modelo? Pergunto porque às vezes o modelo dos sonhos precisa de pequenos ajustes para harmonizar com cada corpo 😍", created_at: "2024-10-15T14:31:00" },
  ]
};

const MOCK_PEDIDOS = [
  { id: "pv1", numero: "PV-2024-001", os_id: "os1", cliente_id: "1", cliente_nome: "Fernanda Oliveira", status: "em_andamento", valor_total: 2454.84, condicoes_pagamento: "50% entrada / 50% entrega", transmitido_bling: false, created_at: "2024-10-23", parcelas: [
    { id: "pa1", numero: 1, descricao: "Entrada 50%", valor: 1227.42, vencimento: "2024-10-23", status: "recebido", forma: "pix", recebido_em: "2024-10-23" },
    { id: "pa2", numero: 2, descricao: "Entrega 50%", valor: 1227.42, vencimento: "2024-12-08", status: "pendente", forma: "", recebido_em: null },
  ]},
  { id: "pv2", numero: "PV-2024-002", os_id: "os2", cliente_id: "2", cliente_nome: "Carla Mendes", status: "em_andamento", valor_total: 1890.00, condicoes_pagamento: "À vista", transmitido_bling: false, created_at: "2024-10-26", parcelas: [
    { id: "pa3", numero: 1, descricao: "Pagamento à vista", valor: 1890.00, vencimento: "2024-10-30", status: "pendente", forma: "", recebido_em: null },
  ]},
];

const MOCK_CONTAS_PAGAR = [
  { id: "cp1", descricao: "Zibeline vinho — Tecidos Premium", categoria: "material", os_numero: "OS-2024-001", valor: 340, vencimento: "2024-11-01", status: "pago", pago_em: "2024-10-30", forma: "pix" },
  { id: "cp2", descricao: "Forro + aviamentos OS-001", categoria: "material", os_numero: "OS-2024-001", valor: 143, vencimento: "2024-11-01", status: "pago", pago_em: "2024-10-30", forma: "pix" },
  { id: "cp3", descricao: "Tafetá azul marinho — OS-002", categoria: "material", os_numero: "OS-2024-002", valor: 280, vencimento: "2024-11-05", status: "pendente", pago_em: null, forma: "" },
  { id: "cp4", descricao: "Aluguel ateliê — Novembro", categoria: "fixo", os_numero: null, valor: 1800, vencimento: "2024-11-10", status: "pendente", pago_em: null, forma: "" },
  { id: "cp5", descricao: "Energia elétrica", categoria: "fixo", os_numero: null, valor: 320, vencimento: "2024-11-15", status: "pendente", pago_em: null, forma: "" },
];

const MOCK_QUESTIONARIOS = [
  {
    id: "q1", cliente_id: "1", cliente_nome: "Fernanda Oliveira",
    created_at: "2024-10-18T09:00:00",
    ocasioes_uso: "Casamento da filha como madrinha, eventos sociais",
    cores_preferidas: "Vinho, bordô, dourado, verde esmeralda",
    cores_evita: "Amarelo, laranja, rosa claro",
    estilos_preferidos: "Clássico elegante, glamouroso com sobriedade",
    inspiracoes: "Valentino, silhueta princess com modernidade",
    restricoes: "Sem decotes muito abertos, prefere ombro estruturado",
    orcamento_estimado: "R$ 2.000 a R$ 3.000",
    evento_especifico: "Casamento da filha — Madrinha",
    data_evento: "2024-12-15",
    observacoes_livres: "Quero me sentir poderosa e ao mesmo tempo delicada.",
    briefing_gerado: `BRIEFING PRÉ-ATENDIMENTO — Fernanda Oliveira\nData: 20/10/2024\n\nPERFIL: Busca look de madrinha com elegância clássica e toque glamouroso. Biotipo ampulheta — valorizar cintura.\n\nEVENTO: Casamento filha 15/12/2024. Papel de destaque.\n\nDIRETRIZES: Paleta vinho/bordô, ombro estruturado, referência Valentino, tecido sugerido: zibeline ou crepe de lã.\n\nATENÇÃO: Confirmar paleta com tema do casamento. Verificar se haverá mais madrinhas.`,
    briefing_gerado_em: "2024-10-18T09:05:00"
  }
];

const MOCK_DOSSIES = [
  {
    id: "d1", cliente_id: "1", os_id: "os1", cliente_nome: "Fernanda Oliveira", os_numero: "OS-2024-001",
    status: "aguardando_aprovacao", created_at: "2024-10-22T14:00:00",
    titulo: "Seu vestido exclusivo — Casamento de Anita",
    introducao: "Fernanda, foi um prazer receber você no ateliê! Com base em nossa consultoria, criamos esta proposta exclusiva pensada especialmente para realçar sua beleza.",
    biotipo: "Ampulheta", colorimetria: "Outono",
    analise_estilo: "Clássico elegante com toque glamouroso. Você tem presença marcante.",
    harmonizacao: "Para seu biotipo ampulheta, valorizamos a cintura naturalmente definida. O decote em V suave alonga o colo sem exposição excessiva.",
    nome_peca: "Vestido madrinha exclusivo",
    descricao_peca: "Vestido longo com decote em V estruturado, manga longa em renda chantilly, saia evasê com fenda lateral discreta.",
    tecido_principal: "Zibeline vinho — caimento impecável e leve brilho acetinado",
    tecido_secundario: "Renda chantilly bordô para manga",
    acabamentos: "Forro duplo em cetim, viés dourado discreto no decote",
    acessorios_sugeridos: "Cinto de pedraria dourada, brinco gota cristal, clutch dourada",
    cuidados_tecido: "Lavar a seco. Guardar em cabide acolchoado.",
    proximos_passos: "Após aprovação, enviaremos o orçamento com valores, condições e cronograma.",
    observacoes_internas: "Cliente adorou o viés dourado. Confirmar disponibilidade do tecido.",
    imagens_ia: []
  }
];

const MOCK_IMAGENS_IA = {
  "1": [
    { id: "img1", cliente_id: "1", url: null, prompt: "Vestido longo vinho zibeline, decote V, manga renda, biotipo ampulheta plus size, alta costura, hiperrealista", criado_em: "2024-10-22T15:30:00", aprovado: false, descricao: "Versão 1 — frente" },
    { id: "img2", cliente_id: "1", url: null, prompt: "Vestido longo vinho zibeline, costas com botões, cinto pedraria dourada, plus size alta costura, editorial", criado_em: "2024-10-22T15:45:00", aprovado: true, descricao: "Versão 2 — costas ✓" },
  ]
};

// ============================================================
// UTILS & CONSTANTES
// ============================================================
const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const fmtDT = d => d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_OS = { orcamento: { label: "Orçamento", c: "#C9A84C" }, aprovado: { label: "Aprovado", c: "#2D7A5F" }, producao: { label: "Produção", c: "#7B5EA7" }, prova: { label: "Provas", c: "#E07B4A" }, ajuste: { label: "Ajustes", c: "#D4543A" }, entregue: { label: "Entregue", c: "#2D7A5F" }, encerrado: { label: "Encerrado", c: "#888" }, cancelado: { label: "Cancelado", c: "#D4543A" } };
const STATUS_DOSSIE = { rascunho: { label: "Rascunho", c: "#6a5a3a" }, aguardando_aprovacao: { label: "Aguard. aprovação", c: "#C9A84C" }, aprovado: { label: "Aprovado", c: "#2D7A5F" }, enviado: { label: "Enviado", c: "#7B5EA7" } };
const BIOTIPO_OPT = ["Ampulheta", "Triângulo", "Triângulo invertido", "Retângulo", "Oval"];
const COLOR_OPT = ["Primavera", "Verão", "Outono", "Inverno"];
const FLUXO_OPT = { estilista_express: "Estilista Express", orcamento_direto: "Orçamento Direto", roupa_pronta: "Roupa Pronta" };
const FORMAS_PGTO = ["pix", "link", "cartão crédito", "cartão débito", "dinheiro", "transferência"];
const ESTADOS_BR = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

// ============================================================
// COMPONENTES BASE
// ============================================================
function Chip({ label, color }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>;
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "#1a1510", border: "1px solid #2e2618", borderRadius: 10, padding: 18, cursor: onClick ? "pointer" : "default", transition: "border-color 0.2s", ...style }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = "#C9A84C")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = "#2e2618")}>
      {children}
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder, style, small }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...style }}>
      {label && <label style={{ fontSize: 10, color: "#9a8a6a", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>}
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: "#1e1a14", border: "1px solid #3a3020", borderRadius: 6, padding: small ? "5px 10px" : "8px 12px", color: "#f0e8d0", fontSize: small ? 12 : 13, outline: "none" }} />
    </div>
  );
}

function Txt({ label, value, onChange, rows = 3, placeholder, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...style }}>
      {label && <label style={{ fontSize: 10, color: "#9a8a6a", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>}
      <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ background: "#1e1a14", border: "1px solid #3a3020", borderRadius: 6, padding: "8px 12px", color: "#f0e8d0", fontSize: 13, outline: "none", resize: "vertical" }} />
    </div>
  );
}

function Sel({ label, value, onChange, options, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...style }}>
      {label && <label style={{ fontSize: 10, color: "#9a8a6a", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>}
      <select value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ background: "#1e1a14", border: "1px solid #3a3020", borderRadius: 6, padding: "8px 12px", color: "#f0e8d0", fontSize: 13, outline: "none" }}>
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, v = "primary", style, disabled }) {
  const S = { primary: { background: "#C9A84C", color: "#1a1510", border: "none" }, ghost: { background: "transparent", color: "#C9A84C", border: "1px solid #C9A84C" }, danger: { background: "transparent", color: "#D4543A", border: "1px solid #D4543A" }, dark: { background: "#2a2218", color: "#f0e8d0", border: "1px solid #3a3020" }, green: { background: "#2D7A5F22", color: "#2D7A5F", border: "1px solid #2D7A5F44" }, purple: { background: "#7B5EA722", color: "#7B5EA7", border: "1px solid #7B5EA744" } };
  return <button onClick={onClick} disabled={disabled} style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.2s", ...S[v], ...style }}>{children}</button>;
}

function Modal({ title, children, onClose, width = 680 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#141008", border: "1px solid #3a3020", borderRadius: 12, width: "100%", maxWidth: width, maxHeight: "92vh", overflow: "auto", padding: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 20, color: "#C9A84C" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 22, background: "#1a1510", borderRadius: 8, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: active === t.id ? "#C9A84C" : "transparent", color: active === t.id ? "#1a1510" : "#9a8a6a", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>
      ))}
    </div>
  );
}

// ============================================================
// PRINT OS
// ============================================================
function printOS(os, cliente, orc) {
  const w = window.open("", "_blank");
  const pcs = os.pecas || [];
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OS ${os.numero}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Lato:wght@300;400&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Lato',sans-serif;color:#2c2c2c;padding:40px;font-size:13px}h1,h2,h3{font-family:'Cormorant Garamond',serif}.header{border-bottom:2px solid #C9A84C;padding-bottom:20px;margin-bottom:24px;display:flex;justify-content:space-between}.brand{font-family:'Cormorant Garamond',serif;font-size:26px}.brand span{color:#C9A84C}.section{margin-bottom:20px}.section h2{font-size:12px;font-weight:600;color:#C9A84C;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #f0e8d0}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 16px}.field{margin-bottom:6px}.field label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;display:block}.peca{background:#faf7f0;border-left:3px solid #C9A84C;padding:12px;margin-bottom:10px;border-radius:0 4px 4px 0}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1a1a1a;color:#C9A84C;padding:7px 10px;text-align:left}td{padding:6px 10px;border-bottom:1px solid #f0e8d0}.total-row td{font-weight:600;background:#faf7f0;color:#C9A84C}.prova-box{border:1px solid #e8e0cc;border-radius:6px;padding:10px;margin-bottom:8px}.assinatura{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.assinatura .linha{border-top:1px solid #ccc;padding-top:6px;color:#666;font-size:11px;text-align:center}</style></head><body>
  <div class="header"><div><div class="brand">Das <span>G</span></div><div style="font-size:11px;color:#888;margin-top:4px">by Juliana Pereira · Alta Costura Plus Size</div></div><div style="text-align:right"><div style="font-size:11px;color:#888">Ordem de Serviço</div><div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#C9A84C">${os.numero}</div><span style="background:${STATUS_OS[os.status]?.c}22;color:${STATUS_OS[os.status]?.c};padding:2px 10px;border-radius:20px;font-size:11px">${STATUS_OS[os.status]?.label}</span></div></div>
  <div class="section"><h2>Cliente</h2><div class="grid-2"><div class="field"><label>Nome</label>${cliente?.nome||"—"}</div><div class="field"><label>WhatsApp</label>${cliente?.telefone||"—"}</div><div class="field"><label>CPF</label>${cliente?.cpf||"—"}</div><div class="field"><label>Biotipo</label>${cliente?.biotipo||"—"} · ${cliente?.colorimetria||"—"}</div></div></div>
  <div class="section"><h2>Evento</h2><div class="grid-3"><div class="field"><label>Evento</label>${os.descricao_evento||"—"}</div><div class="field"><label>Data do evento</label>${fmtDate(os.data_evento)}</div><div class="field"><label>Entrega prevista</label>${fmtDate(os.data_entrega_prevista)}</div></div></div>
  <div class="section"><h2>Medidas (cm)</h2><div class="grid-3"><div class="field"><label>Busto</label>${cliente?.medida_busto||"—"}</div><div class="field"><label>Cintura</label>${cliente?.medida_cintura||"—"}</div><div class="field"><label>Quadril</label>${cliente?.medida_quadril||"—"}</div><div class="field"><label>Ombro</label>${cliente?.medida_ombro||"—"}</div><div class="field"><label>Compr. vestido</label>${cliente?.medida_comprimento_vestido||"—"}</div><div class="field"><label>Manga</label>${cliente?.medida_manga||"—"}</div></div></div>
  <div class="section"><h2>Peça(s)</h2>${pcs.map(p=>`<div class="peca"><h3>${p.nome}</h3><div class="grid-2"><div class="field"><label>Descrição</label>${p.descricao||"—"}</div><div class="field"><label>Tecido</label>${p.tecido||"—"} · ${p.cor||"—"}</div><div class="field"><label>Acabamentos</label>${p.acabamentos||"—"}</div>${p.acessorios?`<div class="field"><label>Acessórios</label>${p.acessorios}</div>`:""}</div></div>`).join("")}</div>
  <div class="section"><h2>Agenda de provas</h2><div class="grid-3"><div class="prova-box"><h4 style="font-size:11px;color:#888;margin-bottom:4px">Prova 1 — ${fmtDate(os.data_prova_1)}</h4><p>${os.anotacoes_prova_1||"Sem anotações"}</p></div><div class="prova-box"><h4 style="font-size:11px;color:#888;margin-bottom:4px">Prova 2 — ${fmtDate(os.data_prova_2)}</h4><p>${os.anotacoes_prova_2||"Sem anotações"}</p></div><div class="prova-box"><h4 style="font-size:11px;color:#888;margin-bottom:4px">Prova 3 — ${fmtDate(os.data_prova_3)}</h4><p>${os.anotacoes_prova_3||"Sem anotações"}</p></div></div></div>
  ${orc?`<div class="section"><h2>Orçamento ${orc.numero}</h2><table><thead><tr><th>Material</th><th>Qtd</th><th>Un</th><th>Unit.</th><th>Total</th></tr></thead><tbody>${orc.itens_material.map(i=>`<tr><td>${i.descricao}</td><td>${i.quantidade}</td><td>${i.unidade}</td><td>${fmt(i.valor_unit)}</td><td>${fmt(i.valor_total)}</td></tr>`).join("")}<tr><td colspan="4">Mão de obra (${orc.horas_trabalho}h)</td><td>${fmt(orc.horas_trabalho*orc.valor_hora)}</td></tr><tr class="total-row"><td colspan="4">VALOR TOTAL</td><td>${fmt(orc.valor_total)}</td></tr></tbody></table><div class="grid-2" style="margin-top:10px"><div class="field"><label>Condições</label>${orc.condicoes_pagamento||"—"}</div><div class="field"><label>Prazo</label>${orc.prazo_entrega_dias||"—"} dias</div></div></div>`:""}
  ${os.observacoes?`<div class="section"><h2>Observações</h2><p>${os.observacoes}</p></div>`:""}
  <div class="assinatura"><div class="linha">Assinatura da cliente — ${cliente?.nome||""}</div><div class="linha">Juliana Pereira — Das G Alta Costura</div></div>
  <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ clientes, os, agenda, pedidos, contas }) {
  const totalReceber = pedidos.flatMap(p => p.parcelas).filter(p => p.status === "pendente").reduce((s, p) => s + p.valor, 0);
  const totalPagar = contas.filter(c => c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const osAtivas = os.filter(o => !["encerrado","cancelado"].includes(o.status));
  const proximos = [...agenda].sort((a,b) => new Date(a.data_hora)-new Date(b.data_hora)).filter(a => new Date(a.data_hora) >= new Date()).slice(0,5);

  return (
    <div>
      <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 28, color: "#C9A84C", marginBottom: 4 }}>Bem-vinda, Juliana ✨</h1>
      <p style={{ color: "#4a3a1a", marginBottom: 24, fontSize: 13 }}>{new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" })}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { icon:"👗", label:"Clientes ativos", value: clientes.filter(c=>c.status==="ativo").length, color:"#7B5EA7" },
          { icon:"📋", label:"OS em aberto", value: osAtivas.length, color:"#E07B4A" },
          { icon:"💚", label:"A receber", value: fmt(totalReceber), color:"#2D7A5F" },
          { icon:"🔴", label:"A pagar", value: fmt(totalPagar), color:"#D4543A" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign:"center", padding:14 }}>
            <div style={{ fontSize:26, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:s.color, marginBottom:2 }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Card>
          <h3 style={{ fontFamily:"Cormorant Garamond, serif", color:"#C9A84C", marginBottom:14, fontSize:17 }}>Próximos compromissos</h3>
          {proximos.length === 0 ? <p style={{ color:"#6a5a3a", fontSize:13 }}>Nenhum agendamento.</p> :
            proximos.map(a => (
              <div key={a.id} style={{ borderLeft:"2px solid #C9A84C", paddingLeft:12, marginBottom:12 }}>
                <div style={{ fontSize:13, color:"#f0e8d0", fontWeight:600 }}>{a.titulo}</div>
                <div style={{ fontSize:11, color:"#6a5a3a" }}>{fmtDT(a.data_hora)}</div>
              </div>
            ))}
        </Card>
        <Card>
          <h3 style={{ fontFamily:"Cormorant Garamond, serif", color:"#C9A84C", marginBottom:14, fontSize:17 }}>OS em andamento</h3>
          {osAtivas.slice(0,5).map(o => (
            <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:13, color:"#f0e8d0" }}>{o.numero} · {o.cliente_nome}</div>
                <div style={{ fontSize:11, color:"#6a5a3a" }}>Entrega: {fmtDate(o.data_entrega_prevista)}</div>
              </div>
              <Chip label={STATUS_OS[o.status]?.label} color={STATUS_OS[o.status]?.c} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// CLIENTES
// ============================================================
function Clientes({ clientes, setClientes, setPage, setClienteAtivo }) {
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const f = k => v => setForm(p => ({...p, [k]:v}));
  const filtrados = clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca));

  function salvar() {
    setClientes(p => [{ ...form, id: Date.now().toString(), status:"lead", created_at: new Date().toISOString() }, ...p]);
    setModal(false); setForm({});
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:26, color:"#C9A84C" }}>Clientes</h1>
        <Btn onClick={() => setModal(true)}>+ Nova cliente</Btn>
      </div>
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." style={{ width:"100%", background:"#1a1510", border:"1px solid #3a3020", borderRadius:8, padding:"9px 14px", color:"#f0e8d0", fontSize:13, marginBottom:16, outline:"none" }} />
      <div style={{ display:"grid", gap:10 }}>
        {filtrados.map(c => (
          <Card key={c.id} onClick={() => { setClienteAtivo(c); setPage("cliente_detalhe"); }} style={{ display:"grid", gridTemplateColumns:"1fr auto", alignItems:"center", gap:16 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:"#C9A84C22", border:"1px solid #C9A84C44", display:"flex", alignItems:"center", justifyContent:"center", color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", fontSize:16 }}>{c.nome[0]}</div>
                <div><div style={{ fontWeight:600, color:"#f0e8d0" }}>{c.nome}</div><div style={{ fontSize:12, color:"#6a5a3a" }}>{c.telefone}</div></div>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {c.biotipo && <span style={{ fontSize:10, color:"#9a8a6a", background:"#2a2218", padding:"2px 7px", borderRadius:20 }}>{c.biotipo}</span>}
                {c.colorimetria && <span style={{ fontSize:10, color:"#9a8a6a", background:"#2a2218", padding:"2px 7px", borderRadius:20 }}>{c.colorimetria}</span>}
                <span style={{ fontSize:10, color:"#9a8a6a", background:"#2a2218", padding:"2px 7px", borderRadius:20 }}>{FLUXO_OPT[c.fluxo]||c.fluxo}</span>
              </div>
            </div>
            <Chip label={c.status} color={c.status==="ativo"?"#2D7A5F":"#C9A84C"} />
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title="Nova cliente" onClose={() => setModal(false)} width={760}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:"#C9A84C", marginBottom:10, fontFamily:"Cormorant Garamond, serif" }}>Dados pessoais</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Inp label="Nome completo *" value={form.nome} onChange={f("nome")} style={{ gridColumn:"1/-1" }} />
              <Inp label="WhatsApp *" value={form.whatsapp} onChange={f("whatsapp")} placeholder="5511999999999" />
              <Inp label="Telefone" value={form.telefone} onChange={f("telefone")} />
              <Inp label="E-mail" value={form.email} onChange={f("email")} type="email" />
              <Inp label="CPF" value={form.cpf} onChange={f("cpf")} placeholder="000.000.000-00" />
              <Inp label="RG" value={form.rg} onChange={f("rg")} />
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:"#C9A84C", marginBottom:10, fontFamily:"Cormorant Garamond, serif" }}>Endereço (para NF-e e envio)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <Inp label="CEP" value={form.cep} onChange={f("cep")} placeholder="00000-000" />
              <Inp label="Logradouro" value={form.logradouro} onChange={f("logradouro")} style={{ gridColumn:"span 2" }} />
              <Inp label="Número" value={form.numero} onChange={f("numero")} />
              <Inp label="Complemento" value={form.complemento} onChange={f("complemento")} />
              <Inp label="Bairro" value={form.bairro} onChange={f("bairro")} />
              <Inp label="Cidade" value={form.cidade} onChange={f("cidade")} />
              <Sel label="Estado" value={form.estado} onChange={f("estado")} options={ESTADOS_BR} />
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:"#C9A84C", marginBottom:10, fontFamily:"Cormorant Garamond, serif" }}>Perfil fashion</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <Sel label="Biotipo" value={form.biotipo} onChange={f("biotipo")} options={BIOTIPO_OPT} />
              <Sel label="Colorimetria" value={form.colorimetria} onChange={f("colorimetria")} options={COLOR_OPT} />
              <Sel label="Fluxo" value={form.fluxo} onChange={f("fluxo")} options={Object.entries(FLUXO_OPT).map(([v,l])=>({value:v,label:l}))} />
              <Sel label="Origem" value={form.origem} onChange={f("origem")} options={["instagram","indicacao","loja","direto"]} />
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:"#C9A84C", marginBottom:10, fontFamily:"Cormorant Garamond, serif" }}>Medidas (cm)</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(8, 1fr)", gap:10 }}>
              {[["Busto","medida_busto"],["Cintura","medida_cintura"],["Quadril","medida_quadril"],["Ombro","medida_ombro"],["Torso","medida_comprimento_torso"],["Saia","medida_comprimento_saia"],["Vestido","medida_comprimento_vestido"],["Manga","medida_manga"]].map(([l,k])=>(
                <Inp key={k} label={l} value={form[k]} onChange={f(k)} type="number" small />
              ))}
            </div>
          </div>
          <Txt label="Observações" value={form.observacoes} onChange={f("observacoes")} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <Btn v="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={!form.nome||!form.whatsapp}>Salvar cliente → Bling</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// DETALHE CLIENTE
// ============================================================
function ClienteDetalhe({ cliente, os, setPage, conversas, setClienteAtivo, setClientes }) {
  const [tab, setTab] = useState("perfil");
  const [form, setForm] = useState(cliente);
  const [editando, setEditando] = useState(false);
  const f = k => v => setForm(p => ({...p, [k]:v}));
  const minhasOS = os.filter(o => o.cliente_id === cliente.id);
  const msgs = conversas[cliente.id] || [];

  function salvar() {
    setClientes(p => p.map(c => c.id === cliente.id ? form : c));
    setClienteAtivo(form); setEditando(false);
  }

  const tabList = [
    { id:"perfil", label:"Perfil" }, { id:"endereco", label:"Endereço/NF-e" },
    { id:"medidas", label:"Medidas" }, { id:"os", label:`OS (${minhasOS.length})` },
    { id:"conversas", label:"Conversas" },
  ];

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
        <button onClick={() => setPage("clientes")} style={{ background:"none", border:"none", color:"#C9A84C", cursor:"pointer", fontSize:22 }}>←</button>
        <div style={{ width:44, height:44, borderRadius:"50%", background:"#C9A84C22", border:"1px solid #C9A84C44", display:"flex", alignItems:"center", justifyContent:"center", color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", fontSize:20 }}>{cliente.nome[0]}</div>
        <div>
          <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#C9A84C" }}>{cliente.nome}</h1>
          <div style={{ fontSize:12, color:"#6a5a3a" }}>{cliente.telefone} · {FLUXO_OPT[cliente.fluxo]}</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          {editando ? <><Btn v="ghost" onClick={() => setEditando(false)}>Cancelar</Btn><Btn onClick={salvar}>Salvar</Btn></> : <Btn v="dark" onClick={() => setEditando(true)}>Editar</Btn>}
        </div>
      </div>

      <Tabs tabs={tabList} active={tab} onChange={setTab} />

      {tab === "perfil" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {editando ? (
            <>
              <Inp label="Nome" value={form.nome} onChange={f("nome")} />
              <Inp label="WhatsApp" value={form.whatsapp} onChange={f("whatsapp")} />
              <Inp label="E-mail" value={form.email} onChange={f("email")} />
              <Inp label="CPF" value={form.cpf} onChange={f("cpf")} />
              <Sel label="Biotipo" value={form.biotipo} onChange={f("biotipo")} options={BIOTIPO_OPT} />
              <Sel label="Colorimetria" value={form.colorimetria} onChange={f("colorimetria")} options={COLOR_OPT} />
              <Inp label="Estilo pessoal" value={form.estilo_pessoal} onChange={f("estilo_pessoal")} />
              <Sel label="Status" value={form.status} onChange={f("status")} options={["lead","ativo","inativo"]} />
              <Txt label="Observações" value={form.observacoes} onChange={f("observacoes")} style={{ gridColumn:"1/-1" }} />
            </>
          ) : (
            [["WhatsApp",cliente.whatsapp],["E-mail",cliente.email],["CPF",cliente.cpf],["Biotipo",cliente.biotipo],["Colorimetria",cliente.colorimetria],["Estilo pessoal",cliente.estilo_pessoal],["Origem",cliente.origem],["Status",cliente.status]].map(([l,v]) => (
              <Card key={l} style={{ padding:12 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>{l}</div><div style={{ fontSize:13, color:"#f0e8d0" }}>{v||"—"}</div></Card>
            ))
          )}
        </div>
      )}

      {tab === "endereco" && (
        <Card>
          <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:14 }}>Endereço para NF-e e envio</h3>
          {editando ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <Inp label="CEP" value={form.cep} onChange={f("cep")} />
              <Inp label="Logradouro" value={form.logradouro} onChange={f("logradouro")} style={{ gridColumn:"span 2" }} />
              <Inp label="Número" value={form.numero} onChange={f("numero")} />
              <Inp label="Complemento" value={form.complemento} onChange={f("complemento")} />
              <Inp label="Bairro" value={form.bairro} onChange={f("bairro")} />
              <Inp label="Cidade" value={form.cidade} onChange={f("cidade")} />
              <Sel label="Estado" value={form.estado} onChange={f("estado")} options={ESTADOS_BR} />
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[["CEP",cliente.cep],["Logradouro",`${cliente.logradouro||"—"}, ${cliente.numero||""}`],["Complemento",cliente.complemento],["Bairro",cliente.bairro],["Cidade",cliente.cidade],["Estado",cliente.estado]].map(([l,v]) => (
                <div key={l}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>{l}</div><div style={{ fontSize:13, color:"#f0e8d0" }}>{v||"—"}</div></div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "medidas" && (
        <Card>
          <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:14 }}>Medidas corporais (cm)</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14 }}>
            {[["Busto","medida_busto"],["Cintura","medida_cintura"],["Quadril","medida_quadril"],["Ombro","medida_ombro"],["Torso","medida_comprimento_torso"],["Saia","medida_comprimento_saia"],["Vestido","medida_comprimento_vestido"],["Manga","medida_manga"]].map(([l,k]) => (
              editando
                ? <Inp key={k} label={l} value={form[k]} onChange={f(k)} type="number" />
                : <div key={k} style={{ textAlign:"center", padding:"10px 6px", background:"#2a2218", borderRadius:8 }}>
                    <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:24, color:"#C9A84C" }}>{cliente[k]||"—"}</div>
                    <div style={{ fontSize:10, color:"#6a5a3a", marginTop:2 }}>{l}</div>
                  </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "os" && (
        <div style={{ display:"grid", gap:10 }}>
          {minhasOS.length === 0 ? <p style={{ color:"#6a5a3a" }}>Nenhuma OS.</p> :
            minhasOS.map(o => (
              <Card key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><div style={{ fontWeight:600, color:"#f0e8d0" }}>{o.numero}</div><div style={{ fontSize:12, color:"#6a5a3a" }}>{o.descricao_evento} · Entrega: {fmtDate(o.data_entrega_prevista)}</div></div>
                <Chip label={STATUS_OS[o.status]?.label} color={STATUS_OS[o.status]?.c} />
              </Card>
            ))}
        </div>
      )}

      {tab === "conversas" && (
        <Card>
          <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:14, fontSize:17 }}>Histórico WhatsApp — Júlia</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:400, overflowY:"auto" }}>
            {msgs.length === 0 ? <p style={{ color:"#6a5a3a", fontSize:13 }}>Nenhuma conversa.</p> :
              msgs.map(m => (
                <div key={m.id} style={{ display:"flex", justifyContent: m.role==="user"?"flex-start":"flex-end" }}>
                  <div style={{ maxWidth:"75%", padding:"9px 13px", borderRadius: m.role==="user"?"0 10px 10px 10px":"10px 0 10px 10px", background: m.role==="user"?"#2a2218":"#C9A84C22", border: m.role==="assistant"?"1px solid #C9A84C44":"none" }}>
                    <div style={{ fontSize:10, color:"#6a5a3a", marginBottom:3 }}>{m.role==="user"?"Cliente":"Júlia"} · {fmtDT(m.created_at)}</div>
                    <div style={{ fontSize:13, color:"#f0e8d0", lineHeight:1.5 }}>{m.content}</div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// ORDENS DE SERVIÇO
// ============================================================
function OrdensServico({ os, setOS, clientes }) {
  const [filtro, setFiltro] = useState("todos");
  const [aberta, setAberta] = useState(null);
  const [form, setForm] = useState({});
  const [formPeca, setFormPeca] = useState({ nome:"", descricao:"", tecido:"", cor:"", acabamentos:"", acessorios:"" });
  const f = k => v => setForm(p => ({...p, [k]:v}));
  const filtrados = filtro==="todos" ? os : os.filter(o => o.status===filtro);

  function novaOS() {
    const o = { id: Date.now().toString(), numero:"OS-NOVA", cliente_id:"", fluxo:"estilista_express", status:"orcamento", pecas:[], created_at: new Date().toISOString() };
    setOS(p => [o,...p]); setAberta(o); setForm(o);
  }

  function salvar() { setOS(p => p.map(o => o.id===form.id ? form : o)); setAberta(form); }

  function addPeca() {
    const nova = {...formPeca, id: Date.now().toString()};
    setForm(p => ({...p, pecas:[...(p.pecas||[]), nova]}));
    setFormPeca({ nome:"", descricao:"", tecido:"", cor:"", acabamentos:"", acessorios:"" });
  }

  const cliente = aberta ? clientes.find(c => c.id===form.cliente_id) : null;
  const orc = aberta ? MOCK_ORCAMENTOS.find(o => o.os_id===aberta.id) : null;

  if (aberta) return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22, flexWrap:"wrap" }}>
        <button onClick={() => setAberta(null)} style={{ background:"none", border:"none", color:"#C9A84C", cursor:"pointer", fontSize:22 }}>←</button>
        <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#C9A84C" }}>{form.numero||"Nova OS"}</h1>
        <Chip label={STATUS_OS[form.status]?.label} color={STATUS_OS[form.status]?.c} />
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <Btn v="dark" onClick={() => printOS(form, cliente, orc)}>🖨 Imprimir</Btn>
          <Btn onClick={salvar}>Salvar</Btn>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
        <Card>
          <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>Dados gerais</h3>
          <div style={{ display:"grid", gap:10 }}>
            <Sel label="Cliente" value={form.cliente_id} onChange={v => setForm(p => ({...p, cliente_id:v, cliente_nome:clientes.find(c=>c.id===v)?.nome||""}))} options={clientes.map(c=>({value:c.id, label:c.nome}))} />
            <Sel label="Fluxo" value={form.fluxo} onChange={f("fluxo")} options={Object.entries(FLUXO_OPT).map(([v,l])=>({value:v,label:l}))} />
            <Sel label="Status" value={form.status} onChange={f("status")} options={Object.entries(STATUS_OS).map(([v,s])=>({value:v,label:s.label}))} />
            <Inp label="Evento" value={form.descricao_evento} onChange={f("descricao_evento")} />
            <Inp label="Data do evento" value={form.data_evento} onChange={f("data_evento")} type="date" />
          </div>
        </Card>
        <Card>
          <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>Datas</h3>
          <div style={{ display:"grid", gap:10 }}>
            <Inp label="Medidas" value={form.data_medidas} onChange={f("data_medidas")} type="date" />
            <Inp label="Prova 1" value={form.data_prova_1} onChange={f("data_prova_1")} type="date" />
            <Inp label="Prova 2" value={form.data_prova_2} onChange={f("data_prova_2")} type="date" />
            <Inp label="Prova 3" value={form.data_prova_3} onChange={f("data_prova_3")} type="date" />
            <Inp label="Entrega prevista" value={form.data_entrega_prevista} onChange={f("data_entrega_prevista")} type="date" />
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom:18 }}>
        <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>Peças</h3>
        {(form.pecas||[]).map((p,i) => (
          <div key={p.id} style={{ background:"#2a2218", borderRadius:8, padding:12, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ color:"#f0e8d0", fontWeight:600 }}>{i+1}. {p.nome}</span>
              <button onClick={() => setForm(prev => ({...prev, pecas:prev.pecas.filter(x=>x.id!==p.id)}))} style={{ background:"none", border:"none", color:"#D4543A", cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, fontSize:12, color:"#9a8a6a" }}>
              <span>Tecido: <span style={{ color:"#c8b89a" }}>{p.tecido||"—"}</span></span>
              <span>Cor: <span style={{ color:"#c8b89a" }}>{p.cor||"—"}</span></span>
              <span>Acabamentos: <span style={{ color:"#c8b89a" }}>{p.acabamentos||"—"}</span></span>
            </div>
            {p.descricao && <div style={{ fontSize:12, color:"#6a5a3a", marginTop:4 }}>{p.descricao}</div>}
          </div>
        ))}
        <div style={{ border:"1px dashed #3a3020", borderRadius:8, padding:14 }}>
          <div style={{ fontSize:12, color:"#C9A84C", marginBottom:8 }}>+ Adicionar peça</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Inp label="Nome" value={formPeca.nome} onChange={v => setFormPeca(p=>({...p,nome:v}))} placeholder="Ex: Vestido" />
            <Inp label="Tecido" value={formPeca.tecido} onChange={v => setFormPeca(p=>({...p,tecido:v}))} />
            <Inp label="Cor" value={formPeca.cor} onChange={v => setFormPeca(p=>({...p,cor:v}))} />
            <Inp label="Acabamentos" value={formPeca.acabamentos} onChange={v => setFormPeca(p=>({...p,acabamentos:v}))} />
            <Txt label="Descrição" value={formPeca.descricao} onChange={v => setFormPeca(p=>({...p,descricao:v}))} rows={2} style={{ gridColumn:"1/-1" }} />
          </div>
          <Btn style={{ marginTop:10 }} onClick={addPeca} disabled={!formPeca.nome}>Adicionar</Btn>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:18, marginBottom:18 }}>
        {[1,2,3].map(n => (
          <Card key={n}>
            <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:10 }}>Prova {n}</h3>
            <div style={{ fontSize:11, color:"#6a5a3a", marginBottom:8 }}>{fmtDate(form[`data_prova_${n}`])||"Data não definida"}</div>
            <Txt value={form[`anotacoes_prova_${n}`]} onChange={f(`anotacoes_prova_${n}`)} rows={4} placeholder={`Anotações da prova ${n}...`} />
          </Card>
        ))}
      </div>
      <Card><h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:10 }}>Observações</h3><Txt value={form.observacoes} onChange={f("observacoes")} rows={3} /></Card>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:26, color:"#C9A84C" }}>Ordens de Serviço</h1>
        <Btn onClick={novaOS}>+ Nova OS</Btn>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {[["todos","Todas"],...Object.entries(STATUS_OS).map(([v,s])=>[v,s.label])].map(([v,l]) => (
          <button key={v} onClick={() => setFiltro(v)} style={{ padding:"4px 12px", borderRadius:20, border:`1px solid ${filtro===v?"#C9A84C":"#3a3020"}`, background: filtro===v?"#C9A84C22":"transparent", color: filtro===v?"#C9A84C":"#6a5a3a", fontSize:11, cursor:"pointer" }}>{l}</button>
        ))}
      </div>
      <div style={{ display:"grid", gap:10 }}>
        {filtrados.map(o => (
          <Card key={o.id} onClick={() => { setAberta(o); setForm({...o}); }} style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto", alignItems:"center", gap:14 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#6a5a3a" }}>Nº</div>
              <div style={{ fontFamily:"Cormorant Garamond, serif", color:"#C9A84C", fontSize:15 }}>{o.numero}</div>
            </div>
            <div>
              <div style={{ fontWeight:600, color:"#f0e8d0" }}>{o.cliente_nome}</div>
              <div style={{ fontSize:12, color:"#6a5a3a" }}>{o.descricao_evento}</div>
              <div style={{ fontSize:10, color:"#4a3a1a", marginTop:2 }}>
                {o.data_prova_1&&`P1:${fmtDate(o.data_prova_1)}`}{o.data_prova_2&&` · P2:${fmtDate(o.data_prova_2)}`}{o.data_prova_3&&` · P3:${fmtDate(o.data_prova_3)}`}
              </div>
            </div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:"#6a5a3a" }}>Entrega</div><div style={{ fontSize:13, color:"#f0e8d0" }}>{fmtDate(o.data_entrega_prevista)}</div></div>
            <Chip label={STATUS_OS[o.status]?.label} color={STATUS_OS[o.status]?.c} />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ORÇAMENTOS
// ============================================================
function Orcamentos({ clientes }) {
  const [orcs, setOrcs] = useState(MOCK_ORCAMENTOS);
  const [aberto, setAberto] = useState(null);
  const [form, setForm] = useState({});
  const f = k => v => setForm(p => ({...p, [k]:v}));

  function calc(f) {
    const mat = (f.itens_material||[]).reduce((s,i)=>s+(i.valor_total||0),0);
    const mo = (f.horas_trabalho||0)*(f.valor_hora||0);
    const av = f.valor_aviamentos||0;
    const sub = mat+mo+av;
    const ov = sub*((f.percentual_overhead||0)/100);
    const comOv = sub+ov;
    const mg = comOv*((f.percentual_margem||0)/100);
    return { sub, ov, mg, total: comOv+mg };
  }

  function updItem(i,k,v) {
    setForm(p => { const it=[...p.itens_material]; it[i]={...it[i],[k]:v}; if(k==="quantidade"||k==="valor_unit") it[i].valor_total=(it[i].quantidade||0)*(it[i].valor_unit||0); return {...p,itens_material:it}; });
  }

  const c = aberto ? calc(form) : null;

  if (aberto) return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
        <button onClick={() => setAberto(null)} style={{ background:"none", border:"none", color:"#C9A84C", cursor:"pointer", fontSize:22 }}>←</button>
        <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#C9A84C" }}>{form.numero}</h1>
        <Chip label={form.status} color={form.status==="aprovado"?"#2D7A5F":"#C9A84C"} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:18 }}>
        <div>
          <Card style={{ marginBottom:16 }}>
            <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>Materiais</h3>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto", gap:6, marginBottom:8 }}>
              {["Descrição","Qtd","Un","R$/Un","Total",""].map((h,i) => <div key={i} style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase" }}>{h}</div>)}
            </div>
            {(form.itens_material||[]).map((item,i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto", gap:6, marginBottom:8 }}>
                <input value={item.descricao} onChange={e=>updItem(i,"descricao",e.target.value)} placeholder="Material..." style={{ background:"#1e1a14", border:"1px solid #3a3020", borderRadius:4, padding:"5px 8px", color:"#f0e8d0", fontSize:12, outline:"none" }} />
                <input type="number" value={item.quantidade} onChange={e=>updItem(i,"quantidade",+e.target.value)} style={{ background:"#1e1a14", border:"1px solid #3a3020", borderRadius:4, padding:"5px 8px", color:"#f0e8d0", fontSize:12, outline:"none" }} />
                <select value={item.unidade} onChange={e=>updItem(i,"unidade",e.target.value)} style={{ background:"#1e1a14", border:"1px solid #3a3020", borderRadius:4, padding:"5px 4px", color:"#f0e8d0", fontSize:12, outline:"none" }}>
                  {["m","un","kg","g"].map(u=><option key={u}>{u}</option>)}
                </select>
                <input type="number" value={item.valor_unit} onChange={e=>updItem(i,"valor_unit",+e.target.value)} style={{ background:"#1e1a14", border:"1px solid #3a3020", borderRadius:4, padding:"5px 8px", color:"#f0e8d0", fontSize:12, outline:"none" }} />
                <div style={{ padding:"5px 8px", color:"#C9A84C", fontSize:12, background:"#2a2218", borderRadius:4 }}>{fmt(item.valor_total)}</div>
                <button onClick={()=>setForm(p=>({...p,itens_material:p.itens_material.filter((_,j)=>j!==i)}))} style={{ background:"none", border:"none", color:"#D4543A", cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <Btn v="ghost" style={{ marginTop:8, fontSize:11 }} onClick={()=>setForm(p=>({...p,itens_material:[...(p.itens_material||[]),{descricao:"",quantidade:1,unidade:"m",valor_unit:0,valor_total:0}]}))}>+ Adicionar material</Btn>
          </Card>
          <Card style={{ marginBottom:16 }}>
            <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>Mão de obra e outros</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <Inp label="Horas" value={form.horas_trabalho} onChange={f("horas_trabalho")} type="number" />
              <Inp label="R$/hora" value={form.valor_hora} onChange={f("valor_hora")} type="number" />
              <Inp label="Aviamentos (R$)" value={form.valor_aviamentos} onChange={f("valor_aviamentos")} type="number" />
              <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:2 }}>
                <div style={{ background:"#2a2218", borderRadius:6, padding:"7px 10px", color:"#C9A84C", fontSize:14, fontWeight:600, width:"100%", textAlign:"center" }}>{fmt((form.horas_trabalho||0)*(form.valor_hora||0))}</div>
              </div>
            </div>
          </Card>
          <Card>
            <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>Condições</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Inp label="Prazo (dias)" value={form.prazo_entrega_dias} onChange={f("prazo_entrega_dias")} type="number" />
              <Sel label="Pagamento" value={form.condicoes_pagamento} onChange={f("condicoes_pagamento")} options={["À vista","50% entrada / 50% entrega","30/70","3x sem juros"]} />
            </div>
            <Txt label="Mensagem WhatsApp" value={form.mensagem_whatsapp} onChange={f("mensagem_whatsapp")} rows={3} style={{ marginTop:12 }} placeholder="Texto que acompanha o orçamento..." />
          </Card>
        </div>
        <div>
          <Card style={{ position:"sticky", top:20 }}>
            <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:14, textAlign:"center", fontSize:17 }}>Formação de preço</h3>
            {[["Materiais",(form.itens_material||[]).reduce((s,i)=>s+(i.valor_total||0),0)],["Mão de obra",(form.horas_trabalho||0)*(form.valor_hora||0)],["Aviamentos",form.valor_aviamentos||0]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                <span style={{ color:"#6a5a3a" }}>{l}</span><span style={{ color:"#f0e8d0" }}>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ borderTop:"1px solid #3a3020", margin:"10px 0", paddingTop:10 }}>
              {[["Overhead",form.percentual_overhead||30,"percentual_overhead",c?.ov],["Margem",form.percentual_margem||40,"percentual_margem",c?.mg]].map(([l,pct,key,val])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, alignItems:"center" }}>
                  <span style={{ color:"#6a5a3a", fontSize:12 }}>{l}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <input type="number" value={pct} onChange={e=>f(key)(+e.target.value)} style={{ width:38, background:"#1e1a14", border:"1px solid #3a3020", borderRadius:4, padding:"3px 5px", color:"#f0e8d0", fontSize:11, outline:"none" }} />
                    <span style={{ fontSize:11, color:"#C9A84C" }}>%</span>
                    <span style={{ fontSize:13, color:"#f0e8d0" }}>{fmt(val)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:"#C9A84C", borderRadius:8, padding:"12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#1a1510", opacity:0.7, marginBottom:3 }}>VALOR TOTAL</div>
              <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:26, color:"#1a1510", fontWeight:600 }}>{fmt(c?.total)}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:12 }}>
              <Btn style={{ width:"100%" }}>Salvar orçamento</Btn>
              <Btn v="ghost" style={{ width:"100%" }}>📲 Enviar WhatsApp</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:26, color:"#C9A84C" }}>Orçamentos</h1>
        <Btn>+ Novo orçamento</Btn>
      </div>
      <div style={{ display:"grid", gap:12 }}>
        {orcs.map(o => {
          const cli = clientes.find(c=>c.id===o.cliente_id);
          return (
            <Card key={o.id} onClick={() => { setAberto(o); setForm(o); }} style={{ display:"grid", gridTemplateColumns:"auto 1fr 1fr auto", alignItems:"center", gap:14 }}>
              <div><div style={{ fontSize:10, color:"#6a5a3a" }}>Nº</div><div style={{ fontFamily:"Cormorant Garamond, serif", color:"#C9A84C", fontSize:15 }}>{o.numero}</div></div>
              <div><div style={{ fontWeight:600, color:"#f0e8d0" }}>{cli?.nome||"—"}</div><div style={{ fontSize:12, color:"#6a5a3a" }}>{fmtDate(o.created_at)}</div></div>
              <div style={{ textAlign:"right" }}><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:20, color:"#C9A84C" }}>{fmt(o.valor_total)}</div><div style={{ fontSize:11, color:"#6a5a3a" }}>{o.condicoes_pagamento}</div></div>
              <Chip label={o.status} color={o.status==="aprovado"?"#2D7A5F":"#C9A84C"} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// AGENDA
// ============================================================
function Agenda({ agenda, setAgenda, clientes, os }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const f = k => v => setForm(p => ({...p,[k]:v}));
  const TIPO_AG = { consultoria:"Consultoria", medidas:"Medidas", prova_1:"Prova 1", prova_2:"Prova 2", prova_3:"Prova 3", entrega:"Entrega", reuniao:"Reunião" };

  const futuros = [...agenda].sort((a,b)=>new Date(a.data_hora)-new Date(b.data_hora)).filter(a=>new Date(a.data_hora)>=new Date());
  const datesOS = os.flatMap(o => {
    const ev = [];
    if(o.data_prova_1) ev.push({tipo:"Prova 1",data:o.data_prova_1,cliente:o.cliente_nome,os:o.numero});
    if(o.data_prova_2) ev.push({tipo:"Prova 2",data:o.data_prova_2,cliente:o.cliente_nome,os:o.numero});
    if(o.data_prova_3) ev.push({tipo:"Prova 3",data:o.data_prova_3,cliente:o.cliente_nome,os:o.numero});
    if(o.data_entrega_prevista) ev.push({tipo:"Entrega",data:o.data_entrega_prevista,cliente:o.cliente_nome,os:o.numero});
    return ev;
  }).sort((a,b)=>new Date(a.data)-new Date(b.data));

  function salvar() {
    const cli = clientes.find(c=>c.id===form.cliente_id);
    setAgenda(p => [...p, {...form, id:Date.now().toString(), cliente_nome:cli?.nome||"", status:"agendado"}]);
    setModal(false); setForm({});
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:26, color:"#C9A84C" }}>Agenda</h1>
        <Btn onClick={()=>setModal(true)}>+ Agendar</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Card>
          <h3 style={{ fontFamily:"Cormorant Garamond, serif", color:"#C9A84C", marginBottom:14, fontSize:17 }}>Próximos compromissos</h3>
          {futuros.length===0 ? <p style={{ color:"#6a5a3a", fontSize:13 }}>Nenhum.</p> :
            futuros.map(a => (
              <div key={a.id} style={{ borderLeft:`3px solid ${a.tipo==="consultoria"?"#7B5EA7":a.tipo?.includes("prova")?"#E07B4A":"#C9A84C"}`, paddingLeft:12, marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#f0e8d0" }}>{a.titulo}</div>
                <div style={{ fontSize:11, color:"#9a8a6a" }}>{fmtDT(a.data_hora)} · {a.duracao_minutos}min</div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button style={{ fontSize:10, background:"none", border:"none", color:"#C9A84C", cursor:"pointer" }}>📲 Confirmar</button>
                  <button style={{ fontSize:10, background:"none", border:"none", color:"#C9A84C", cursor:"pointer" }}>⏰ Lembrete manhã</button>
                </div>
              </div>
            ))}
        </Card>
        <Card>
          <h3 style={{ fontFamily:"Cormorant Garamond, serif", color:"#C9A84C", marginBottom:14, fontSize:17 }}>Datas das OS</h3>
          {datesOS.slice(0,10).map((e,i) => (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10, padding:"7px 10px", background:"#2a2218", borderRadius:6 }}>
              <div style={{ textAlign:"center", minWidth:36 }}>
                <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:20, color:"#C9A84C", lineHeight:1 }}>{new Date(e.data+"T12:00:00").getDate()}</div>
                <div style={{ fontSize:9, color:"#6a5a3a" }}>{new Date(e.data+"T12:00:00").toLocaleDateString("pt-BR",{month:"short"})}</div>
              </div>
              <div>
                <div style={{ fontSize:12, color:"#f0e8d0" }}>{e.tipo} · {e.cliente}</div>
                <div style={{ fontSize:10, color:"#6a5a3a" }}>{e.os}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
      {modal && (
        <Modal title="Novo agendamento" onClose={()=>setModal(false)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Sel label="Cliente" value={form.cliente_id} onChange={f("cliente_id")} options={clientes.map(c=>({value:c.id,label:c.nome}))} />
            <Sel label="Tipo" value={form.tipo} onChange={f("tipo")} options={Object.entries(TIPO_AG).map(([v,l])=>({value:v,label:l}))} />
            <Inp label="Título" value={form.titulo} onChange={f("titulo")} style={{ gridColumn:"1/-1" }} />
            <Inp label="Data e hora" value={form.data_hora} onChange={f("data_hora")} type="datetime-local" />
            <Inp label="Duração (min)" value={form.duracao_minutos} onChange={f("duracao_minutos")} type="number" />
            <Inp label="Local" value={form.local} onChange={f("local")} style={{ gridColumn:"1/-1" }} />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <Btn v="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={!form.titulo||!form.data_hora}>Agendar + Confirmar WA</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// FINANCEIRO
// ============================================================
function Financeiro({ pedidos, setPedidos, contas, setContas }) {
  const [tab, setTab] = useState("fluxo");
  const [modalBaixaRec, setModalBaixaRec] = useState(null);
  const [modalBaixaPag, setModalBaixaPag] = useState(null);
  const [modalNovaPag, setModalNovaPag] = useState(false);
  const [formBaixa, setFormBaixa] = useState({});
  const [formPag, setFormPag] = useState({});
  const fb = k => v => setFormBaixa(p=>({...p,[k]:v}));
  const fp = k => v => setFormPag(p=>({...p,[k]:v}));

  const parcelas = pedidos.flatMap(p=>p.parcelas.map(pa=>({...pa, pedido_numero:p.numero, cliente_nome:p.cliente_nome, pedido_id:p.id})));
  const pendRec = parcelas.filter(p=>p.status==="pendente");
  const recebidas = parcelas.filter(p=>p.status==="recebido");
  const pendPag = contas.filter(c=>c.status==="pendente");
  const pagas = contas.filter(c=>c.status==="pago");
  const totalRec = pendRec.reduce((s,p)=>s+p.valor,0);
  const totalRecebido = recebidas.reduce((s,p)=>s+p.valor,0);
  const totalPag = pendPag.reduce((s,c)=>s+c.valor,0);
  const totalPago = pagas.reduce((s,c)=>s+c.valor,0);

  const fluxo = [
    { mes:"Out/24", ent:1227.42, sai:483 },
    { mes:"Nov/24", ent:0, sai:2400 },
    { mes:"Dez/24", ent:3117.42, sai:0 },
  ];
  const maxV = Math.max(...fluxo.map(d=>Math.max(d.ent,d.sai)))||1;

  function darBaixa() {
    setPedidos(prev=>prev.map(ped=>({...ped,parcelas:ped.parcelas.map(pa=>pa.id===modalBaixaRec.id?{...pa,status:"recebido",forma:formBaixa.forma,recebido_em:formBaixa.data}:pa)})));
    setModalBaixaRec(null); setFormBaixa({});
  }

  function pagarConta() {
    setContas(prev=>prev.map(c=>c.id===modalBaixaPag.id?{...c,status:"pago",pago_em:formBaixa.data,forma:formBaixa.forma}:c));
    setModalBaixaPag(null); setFormBaixa({});
  }

  const tabsList = [{ id:"fluxo", label:"Fluxo de caixa" },{ id:"receber", label:"A receber" },{ id:"pagar", label:"A pagar" },{ id:"pedidos", label:"Pedidos de venda" }];

  return (
    <div>
      <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:26, color:"#C9A84C", marginBottom:22 }}>Financeiro</h1>
      <Tabs tabs={tabsList} active={tab} onChange={setTab} />

      {tab==="fluxo" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
            <Card style={{ textAlign:"center", padding:14 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Total entradas</div><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#2D7A5F" }}>{fmt(fluxo.reduce((s,d)=>s+d.ent,0))}</div></Card>
            <Card style={{ textAlign:"center", padding:14 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Total saídas</div><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#D4543A" }}>{fmt(fluxo.reduce((s,d)=>s+d.sai,0))}</div></Card>
            <Card style={{ textAlign:"center", padding:14 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Saldo período</div><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#C9A84C" }}>{fmt(fluxo.reduce((s,d)=>s+d.ent-d.sai,0))}</div></Card>
          </div>
          <Card>
            <h3 style={{ fontFamily:"Cormorant Garamond, serif", color:"#C9A84C", marginBottom:16, fontSize:17 }}>Entradas × Saídas</h3>
            <div style={{ display:"flex", gap:24, alignItems:"flex-end", height:160 }}>
              {fluxo.map(d => (
                <div key={d.mes} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:110 }}>
                    <div style={{ width:28, height:Math.max(4,(d.ent/maxV)*110), background:"#2D7A5F", borderRadius:"3px 3px 0 0" }} />
                    <div style={{ width:28, height:Math.max(4,(d.sai/maxV)*110), background:"#D4543A66", borderRadius:"3px 3px 0 0" }} />
                  </div>
                  <div style={{ fontSize:11, color:"#6a5a3a" }}>{d.mes}</div>
                  <div style={{ fontSize:10, color:"#2D7A5F" }}>{fmt(d.ent)}</div>
                  <div style={{ fontSize:10, color:"#D4543A" }}>{fmt(d.sai)}</div>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:6, paddingBottom:30 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:10, height:10, background:"#2D7A5F", borderRadius:2 }}/><span style={{ fontSize:10, color:"#6a5a3a" }}>Entradas</span></div>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:10, height:10, background:"#D4543A66", borderRadius:2 }}/><span style={{ fontSize:10, color:"#6a5a3a" }}>Saídas</span></div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab==="receber" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
            <Card style={{ textAlign:"center", padding:14 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>A receber</div><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#C9A84C" }}>{fmt(totalRec)}</div><div style={{ fontSize:11, color:"#6a5a3a" }}>{pendRec.length} parcelas</div></Card>
            <Card style={{ textAlign:"center", padding:14 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Recebido</div><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#2D7A5F" }}>{fmt(totalRecebido)}</div></Card>
            <Card style={{ textAlign:"center", padding:14 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Total</div><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#f0e8d0" }}>{fmt(totalRec+totalRecebido)}</div></Card>
          </div>
          <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12, fontSize:16 }}>Pendentes</h3>
          <div style={{ display:"grid", gap:10, marginBottom:22 }}>
            {pendRec.map(p => (
              <Card key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", alignItems:"center", gap:14 }}>
                <div><div style={{ fontWeight:600, color:"#f0e8d0" }}>{p.cliente_nome}</div><div style={{ fontSize:12, color:"#6a5a3a" }}>{p.pedido_numero} · {p.descricao} · Vence: {fmtDate(p.vencimento)}</div></div>
                <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:20, color:"#C9A84C" }}>{fmt(p.valor)}</div>
                <Btn v="green" onClick={()=>{setModalBaixaRec(p);setFormBaixa({forma:"pix",data:new Date().toISOString().split("T")[0]});}}>✓ Dar baixa</Btn>
              </Card>
            ))}
          </div>
          <h3 style={{ color:"#2D7A5F", fontFamily:"Cormorant Garamond, serif", marginBottom:12, fontSize:16 }}>Recebidos</h3>
          <div style={{ display:"grid", gap:8 }}>
            {recebidas.map(p => (
              <Card key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", alignItems:"center", gap:14, opacity:0.7 }}>
                <div><div style={{ fontSize:13, color:"#f0e8d0" }}>{p.cliente_nome} · {p.descricao}</div><div style={{ fontSize:11, color:"#6a5a3a" }}>Recebido em {fmtDate(p.recebido_em)} via {p.forma}</div></div>
                <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:18, color:"#2D7A5F" }}>{fmt(p.valor)}</div>
                <Chip label="Recebido" color="#2D7A5F" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab==="pagar" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <Card style={{ textAlign:"center", padding:14 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>A pagar</div><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#D4543A" }}>{fmt(totalPag)}</div><div style={{ fontSize:11, color:"#6a5a3a" }}>{pendPag.length} contas</div></Card>
            <Card style={{ textAlign:"center", padding:14 }}><div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>Pago</div><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#6a5a3a" }}>{fmt(totalPago)}</div></Card>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <h3 style={{ color:"#D4543A", fontFamily:"Cormorant Garamond, serif", fontSize:16 }}>A pagar</h3>
            <Btn onClick={()=>setModalNovaPag(true)}>+ Nova conta</Btn>
          </div>
          <div style={{ display:"grid", gap:10, marginBottom:20 }}>
            {pendPag.map(c => (
              <Card key={c.id} style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto", alignItems:"center", gap:12 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:c.categoria==="material"?"#E07B4A":"#7B5EA7" }} />
                <div><div style={{ fontSize:13, color:"#f0e8d0" }}>{c.descricao}</div><div style={{ fontSize:11, color:"#6a5a3a" }}>{c.categoria}{c.os_numero?` · ${c.os_numero}`:""} · Vence: {fmtDate(c.vencimento)}</div></div>
                <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:18, color:"#D4543A" }}>{fmt(c.valor)}</div>
                <Btn v="dark" onClick={()=>{setModalBaixaPag(c);setFormBaixa({forma:"pix",data:new Date().toISOString().split("T")[0]});}}>Pagar</Btn>
              </Card>
            ))}
          </div>
          <h3 style={{ color:"#6a5a3a", fontFamily:"Cormorant Garamond, serif", marginBottom:12, fontSize:16 }}>Pagas</h3>
          <div style={{ display:"grid", gap:8 }}>
            {pagas.map(c => (
              <Card key={c.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", alignItems:"center", gap:12, opacity:0.6 }}>
                <div><div style={{ fontSize:13, color:"#f0e8d0" }}>{c.descricao}</div><div style={{ fontSize:11, color:"#6a5a3a" }}>Pago em {fmtDate(c.pago_em)} via {c.forma}</div></div>
                <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:16, color:"#6a5a3a" }}>{fmt(c.valor)}</div>
                <Chip label="Pago" color="#2D7A5F" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab==="pedidos" && (
        <div style={{ display:"grid", gap:12 }}>
          {pedidos.map(p => (
            <Card key={p.id}>
              <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto", alignItems:"center", gap:14, marginBottom:12 }}>
                <div><div style={{ fontSize:10, color:"#6a5a3a" }}>Nº</div><div style={{ fontFamily:"Cormorant Garamond, serif", color:"#C9A84C", fontSize:15 }}>{p.numero}</div></div>
                <div><div style={{ fontWeight:600, color:"#f0e8d0" }}>{p.cliente_nome}</div><div style={{ fontSize:12, color:"#6a5a3a" }}>{p.condicoes_pagamento} · {fmtDate(p.created_at)}</div></div>
                <div style={{ textAlign:"right" }}><div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:20, color:"#C9A84C" }}>{fmt(p.valor_total)}</div></div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <Chip label="Em andamento" color="#C9A84C" />
                  {!p.transmitido_bling
                    ? <Btn v="dark" style={{ fontSize:10, padding:"3px 8px" }} onClick={()=>setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,transmitido_bling:true}:x))}>→ Enviar Bling</Btn>
                    : <span style={{ fontSize:10, color:"#2D7A5F" }}>✓ No Bling</span>}
                </div>
              </div>
              <div style={{ borderTop:"1px solid #2e2618", paddingTop:12 }}>
                {p.parcelas.map(pa => (
                  <div key={pa.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid #1e1a14" }}>
                    <div><div style={{ fontSize:12, color:"#f0e8d0" }}>Parcela {pa.numero} — {pa.descricao}</div><div style={{ fontSize:11, color:"#6a5a3a" }}>Vence: {fmtDate(pa.vencimento)}{pa.recebido_em?` · Recebido ${fmtDate(pa.recebido_em)} via ${pa.forma}`:""}</div></div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontFamily:"Cormorant Garamond, serif", fontSize:17, color:pa.status==="recebido"?"#2D7A5F":"#C9A84C" }}>{fmt(pa.valor)}</span>
                      <Chip label={pa.status==="recebido"?"Recebido":"Pendente"} color={pa.status==="recebido"?"#2D7A5F":"#C9A84C"} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalBaixaRec && (
        <Modal title={`Dar baixa — ${modalBaixaRec.cliente_nome}`} onClose={()=>setModalBaixaRec(null)} width={440}>
          <div style={{ padding:14, background:"#2a2218", borderRadius:8, marginBottom:16 }}>
            <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:24, color:"#C9A84C" }}>{fmt(modalBaixaRec.valor)}</div>
            <div style={{ fontSize:12, color:"#6a5a3a" }}>{modalBaixaRec.pedido_numero} · {modalBaixaRec.descricao}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Sel label="Forma de pagamento" value={formBaixa.forma} onChange={fb("forma")} options={FORMAS_PGTO} />
            <Inp label="Data do recebimento" value={formBaixa.data} onChange={fb("data")} type="date" />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:18 }}>
            <Btn v="ghost" onClick={()=>setModalBaixaRec(null)}>Cancelar</Btn>
            <Btn onClick={darBaixa}>✓ Confirmar</Btn>
          </div>
        </Modal>
      )}

      {modalBaixaPag && (
        <Modal title={`Pagar — ${modalBaixaPag.descricao}`} onClose={()=>setModalBaixaPag(null)} width={440}>
          <div style={{ padding:14, background:"#2a2218", borderRadius:8, marginBottom:16 }}>
            <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:24, color:"#D4543A" }}>{fmt(modalBaixaPag.valor)}</div>
            <div style={{ fontSize:12, color:"#6a5a3a" }}>Vence: {fmtDate(modalBaixaPag.vencimento)}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Sel label="Forma" value={formBaixa.forma} onChange={fb("forma")} options={FORMAS_PGTO} />
            <Inp label="Data" value={formBaixa.data} onChange={fb("data")} type="date" />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:18 }}>
            <Btn v="ghost" onClick={()=>setModalBaixaPag(null)}>Cancelar</Btn>
            <Btn onClick={pagarConta}>✓ Confirmar pagamento</Btn>
          </div>
        </Modal>
      )}

      {modalNovaPag && (
        <Modal title="Nova conta a pagar" onClose={()=>setModalNovaPag(false)} width={500}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Inp label="Descrição" value={formPag.descricao} onChange={fp("descricao")} style={{ gridColumn:"1/-1" }} />
            <Sel label="Categoria" value={formPag.categoria} onChange={fp("categoria")} options={["material","fixo","fornecedor","marketing","outro"]} />
            <Inp label="Valor (R$)" value={formPag.valor} onChange={fp("valor")} type="number" />
            <Inp label="Vencimento" value={formPag.vencimento} onChange={fp("vencimento")} type="date" />
            <Inp label="OS vinculada" value={formPag.os_numero} onChange={fp("os_numero")} placeholder="OS-2024-001" />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:18 }}>
            <Btn v="ghost" onClick={()=>setModalNovaPag(false)}>Cancelar</Btn>
            <Btn onClick={()=>{setContas(p=>[{...formPag,id:Date.now().toString(),status:"pendente"},...p]);setModalNovaPag(false);setFormPag({});}} disabled={!formPag.descricao||!formPag.valor}>Salvar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// BRIEFING & DOSSIÊ
// ============================================================
function BriefingDossie({ clientes }) {
  const [tab, setTab] = useState("briefings");
  const [questionarios] = useState(MOCK_QUESTIONARIOS);
  const [dossies, setDossies] = useState(MOCK_DOSSIES);
  const [imagensIA, setImagensIA] = useState(MOCK_IMAGENS_IA);
  const [qAberto, setQAberto] = useState(null);
  const [dAberto, setDAberto] = useState(null);
  const [clienteIA, setClienteIA] = useState("1");
  const [prompt, setPrompt] = useState("");
  const [descIA, setDescIA] = useState("");
  const [gerando, setGerando] = useState(false);

  const PROMPTS_BASE = ["Vestido longo, alta costura plus size, hiperrealista, editorial fashion","Silhueta elegante plus size, iluminação dramática, fundo neutro","Detalhe bordado premium, tecido seda, close-up, produto moda","Look completo com acessórios, modelo plus size, golden hour"];

  async function gerarImagem() {
    setGerando(true);
    await new Promise(r=>setTimeout(r,1800));
    const nova = { id:Date.now().toString(), cliente_id:clienteIA, url:null, prompt, descricao:descIA, criado_em:new Date().toISOString(), aprovado:false };
    setImagensIA(p=>({...p,[clienteIA]:[...(p[clienteIA]||[]),nova]}));
    setPrompt(""); setDescIA(""); setGerando(false);
  }

  function printDossie(d) {
    const w = window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Dossiê — ${d.cliente_nome}</title><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Lato:wght@300;400&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Lato',sans-serif;color:#2c2c2c;padding:40px;font-size:13px;line-height:1.7}h1,h2,h3{font-family:'Cormorant Garamond',serif}.header{border-bottom:2px solid #C9A84C;padding-bottom:20px;margin-bottom:28px;display:flex;justify-content:space-between}.brand{font-family:'Cormorant Garamond',serif;font-size:28px;letter-spacing:3px}.brand span{color:#C9A84C}.intro{font-family:'Cormorant Garamond',serif;font-size:17px;color:#C9A84C;font-style:italic;margin-bottom:28px}.section{margin-bottom:24px}.section h2{font-size:12px;color:#C9A84C;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #f0e8d0}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}.field label{font-size:10px;color:#888;text-transform:uppercase;display:block;margin-bottom:2px}.peca{background:#faf7f0;border-left:3px solid #C9A84C;padding:14px;border-radius:0 6px 6px 0}.proximos{background:#1a1a1a;color:#f0e8d0;padding:14px;border-radius:8px;margin-top:24px}.proximos h3{color:#C9A84C;margin-bottom:6px}.assinatura{margin-top:40px;text-align:center;color:#888;font-size:11px;border-top:1px solid #ddd;padding-top:14px}</style></head><body>
    <div class="header"><div><div class="brand">Das <span>G</span></div><div style="font-size:11px;color:#888;margin-top:3px">by Juliana Pereira · Alta Costura Plus Size</div></div><div style="text-align:right"><div style="font-size:11px;color:#888">Dossiê exclusivo para</div><div style="font-family:'Cormorant Garamond',serif;font-size:20px">${d.cliente_nome}</div></div></div>
    <div class="intro">${d.introducao||""}</div>
    <div class="section"><h2>Análise corporal</h2><div class="grid-2"><div class="field"><label>Biotipo</label>${d.biotipo||"—"}</div><div class="field"><label>Colorimetria</label>${d.colorimetria||"—"}</div></div><p style="margin-top:10px">${d.analise_estilo||""}</p><p style="margin-top:6px">${d.harmonizacao||""}</p></div>
    <div class="section"><h2>Sua peça exclusiva</h2><div class="peca"><h3 style="font-size:18px;margin-bottom:8px">${d.nome_peca||""}</h3><p style="margin-bottom:10px">${d.descricao_peca||""}</p><div class="grid-2"><div class="field"><label>Tecido principal</label>${d.tecido_principal||"—"}</div><div class="field"><label>Tecido secundário</label>${d.tecido_secundario||"—"}</div><div class="field"><label>Acabamentos</label>${d.acabamentos||"—"}</div><div class="field"><label>Acessórios</label>${d.acessorios_sugeridos||"—"}</div></div>${d.cuidados_tecido?`<p style="margin-top:8px;font-size:11px;color:#888">Cuidados: ${d.cuidados_tecido}</p>`:""}</div></div>
    <div class="proximos"><h3>Próximos passos</h3><p>${d.proximos_passos||""}</p></div>
    <div class="assinatura">Com carinho — Juliana Pereira · Das G Alta Costura Plus Size</div>
    <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  const tabsList = [{ id:"briefings", label:"Briefings" },{ id:"dossies", label:"Dossiês" },{ id:"ia", label:"✦ Imagens IA" }];

  if (dAberto) return (
    <div>
      <button onClick={()=>setDAberto(null)} style={{ background:"none", border:"none", color:"#C9A84C", cursor:"pointer", fontSize:22, marginBottom:16 }}>←</button>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22, flexWrap:"wrap" }}>
        <h2 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:22, color:"#C9A84C", flex:1 }}>Dossiê — {dAberto.cliente_nome}</h2>
        <Chip label={STATUS_DOSSIE[dAberto.status]?.label} color={STATUS_DOSSIE[dAberto.status]?.c} />
        <Btn v="dark" onClick={()=>printDossie(dAberto)}>🖨 Imprimir</Btn>
        {dAberto.status==="rascunho" && <Btn v="ghost" onClick={()=>{const u={...dAberto,status:"aguardando_aprovacao"};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}}>Enviar para aprovação</Btn>}
        {dAberto.status==="aguardando_aprovacao" && <Btn v="green" onClick={()=>{const u={...dAberto,status:"aprovado"};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}}>✓ Aprovar e liberar</Btn>}
        {dAberto.status==="aprovado" && <Btn onClick={()=>{const u={...dAberto,status:"enviado"};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}}>📲 Marcar como enviado</Btn>}
      </div>

      {["rascunho","aguardando_aprovacao"].includes(dAberto.status) ? (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
            <Card>
              <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>Cabeçalho</h3>
              <div style={{ display:"grid", gap:10 }}>
                <Inp label="Título" value={dAberto.titulo} onChange={v=>{const u={...dAberto,titulo:v};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}} />
                <Txt label="Introdução" value={dAberto.introducao} onChange={v=>{const u={...dAberto,introducao:v};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}} rows={4} />
              </div>
            </Card>
            <Card>
              <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>Análise corporal</h3>
              <div style={{ display:"grid", gap:10 }}>
                {[["Biotipo","biotipo"],["Colorimetria","colorimetria"],["Análise de estilo","analise_estilo"],["Harmonização","harmonizacao"]].map(([l,k])=>(
                  k==="analise_estilo"||k==="harmonizacao"
                    ? <Txt key={k} label={l} value={dAberto[k]} onChange={v=>{const u={...dAberto,[k]:v};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}} rows={2} />
                    : <Inp key={k} label={l} value={dAberto[k]} onChange={v=>{const u={...dAberto,[k]:v};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}} />
                ))}
              </div>
            </Card>
          </div>
          <Card style={{ marginBottom:18 }}>
            <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12 }}>A peça</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[["Nome da peça","nome_peca"],["Tecido principal","tecido_principal"],["Tecido secundário","tecido_secundario"],["Acabamentos","acabamentos"],["Acessórios sugeridos","acessorios_sugeridos"]].map(([l,k])=>(
                <Inp key={k} label={l} value={dAberto[k]} onChange={v=>{const u={...dAberto,[k]:v};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}} />
              ))}
              {[["Descrição da peça","descricao_peca"],["Cuidados com o tecido","cuidados_tecido"]].map(([l,k])=>(
                <Txt key={k} label={l} value={dAberto[k]} onChange={v=>{const u={...dAberto,[k]:v};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}} rows={2} style={{ gridColumn:"1/-1" }} />
              ))}
            </div>
          </Card>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
            <Card><h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:10 }}>Próximos passos</h3><Txt value={dAberto.proximos_passos} onChange={v=>{const u={...dAberto,proximos_passos:v};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}} rows={3} /></Card>
            <Card><h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:10 }}>Notas internas <span style={{ fontSize:10, color:"#4a3a1a" }}>(não aparece no dossiê)</span></h3><Txt value={dAberto.observacoes_internas} onChange={v=>{const u={...dAberto,observacoes_internas:v};setDossies(p=>p.map(x=>x.id===u.id?u:x));setDAberto(u);}} rows={3} /></Card>
          </div>
        </div>
      ) : (
        <Card>
          <div style={{ padding:"20px 0", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>{dAberto.status==="enviado"?"📲":"✅"}</div>
            <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:18, color:"#C9A84C" }}>{dAberto.status==="enviado"?"Dossiê enviado para a cliente":"Dossiê aprovado — pronto para envio"}</div>
            <div style={{ fontSize:13, color:"#6a5a3a", marginTop:8 }}>{dAberto.titulo}</div>
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontFamily:"Cormorant Garamond, serif", fontSize:26, color:"#C9A84C", marginBottom:22 }}>Briefing & Dossiê</h1>
      <Tabs tabs={tabsList} active={tab} onChange={setTab} />

      {tab==="briefings" && (
        <div style={{ display:"grid", gap:12 }}>
          {questionarios.map(q => (
            <Card key={q.id} style={{ display:"grid", gridTemplateColumns:"1fr auto", alignItems:"center", gap:16 }}>
              <div>
                <div style={{ fontWeight:600, color:"#f0e8d0", fontSize:15 }}>{q.cliente_nome}</div>
                <div style={{ fontSize:12, color:"#6a5a3a" }}>{q.evento_especifico} · {fmtDate(q.data_evento)}</div>
                <div style={{ fontSize:11, color:"#4a3a1a", marginTop:2, fontStyle:"italic" }}>"{q.observacoes_livres?.slice(0,80)}..."</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                {q.briefing_gerado && <span style={{ fontSize:10, color:"#2D7A5F", background:"#2D7A5F22", padding:"2px 8px", borderRadius:20 }}>✓ Briefing gerado</span>}
                <Btn v="ghost" style={{ fontSize:11 }} onClick={()=>setQAberto(q)}>Ver briefing</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab==="dossies" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
            <Btn onClick={()=>{const n={id:Date.now().toString(),cliente_id:clientes[0]?.id||"",cliente_nome:clientes[0]?.nome||"",status:"rascunho",created_at:new Date().toISOString(),titulo:"Dossiê exclusivo",introducao:"",biotipo:"",colorimetria:"",analise_estilo:"",harmonizacao:"",nome_peca:"",descricao_peca:"",tecido_principal:"",tecido_secundario:"",acabamentos:"",acessorios_sugeridos:"",cuidados_tecido:"",proximos_passos:"Após aprovação desta proposta, enviaremos o orçamento detalhado.",observacoes_internas:""};setDossies(p=>[n,...p]);setDAberto(n);}}>+ Novo dossiê</Btn>
          </div>
          <div style={{ display:"grid", gap:12 }}>
            {dossies.map(d => (
              <Card key={d.id} onClick={()=>setDAberto(d)} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", alignItems:"center", gap:14 }}>
                <div><div style={{ fontWeight:600, color:"#f0e8d0" }}>{d.cliente_nome}</div><div style={{ fontSize:12, color:"#6a5a3a" }}>{d.titulo}</div></div>
                <div style={{ fontSize:12, color:"#9a8a6a" }}>{d.nome_peca||"Peça não definida"}</div>
                <Chip label={STATUS_DOSSIE[d.status]?.label} color={STATUS_DOSSIE[d.status]?.c} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab==="ia" && (
        <div>
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:10, color:"#9a8a6a", textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:6 }}>Cliente</label>
            <select value={clienteIA} onChange={e=>setClienteIA(e.target.value)} style={{ background:"#1a1510", border:"1px solid #3a3020", borderRadius:6, padding:"7px 12px", color:"#f0e8d0", fontSize:13, outline:"none" }}>
              {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <Card style={{ marginBottom:20 }}>
            <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:14, fontSize:16 }}>Gerar imagem do vestido com IA</h3>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, color:"#9a8a6a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Prompts base</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {PROMPTS_BASE.map((p,i)=><button key={i} onClick={()=>setPrompt(prev=>prev?prev+", "+p:p)} style={{ fontSize:11, background:"#2a2218", border:"1px solid #3a3020", borderRadius:6, padding:"4px 10px", color:"#9a8a6a", cursor:"pointer" }}>+{p.slice(0,35)}...</button>)}
              </div>
            </div>
            <Txt label="Prompt completo" value={prompt} onChange={setPrompt} rows={3} placeholder="Descreva o vestido: tecido, cor, silhueta, biotipo..." />
            <Inp label="Descrição interna" value={descIA} onChange={setDescIA} placeholder="Ex: Versão 1 frente" style={{ marginTop:10 }} />
            <div style={{ display:"flex", gap:10, marginTop:12, alignItems:"center" }}>
              <Btn onClick={gerarImagem} disabled={!prompt||gerando}>{gerando?"⏳ Gerando...":"✦ Gerar imagem"}</Btn>
              <span style={{ fontSize:11, color:"#3a2a0a" }}>Conectar API: DALL-E / Midjourney / Stable Diffusion</span>
            </div>
          </Card>
          <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12, fontSize:16 }}>Imagens geradas</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:14 }}>
            {(imagensIA[clienteIA]||[]).map(img=>(
              <div key={img.id} style={{ background:"#1a1510", border:`1px solid ${img.aprovado?"#C9A84C":"#2e2618"}`, borderRadius:10, overflow:"hidden" }}>
                <div style={{ height:180, background:"#2a2218", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  {img.url ? <img src={img.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ textAlign:"center", padding:16 }}><div style={{ fontSize:28, marginBottom:6 }}>✦</div><div style={{ fontSize:10, color:"#4a3a1a" }}>API de imagem</div></div>}
                  {img.aprovado && <div style={{ position:"absolute", top:6, right:6, background:"#C9A84C", borderRadius:20, padding:"1px 7px", fontSize:9, color:"#1a1510", fontWeight:700 }}>✓ Aprovada</div>}
                </div>
                <div style={{ padding:10 }}>
                  <div style={{ fontSize:11, color:"#f0e8d0", marginBottom:6 }}>{img.descricao||"Sem descrição"}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <Btn v={img.aprovado?"green":"dark"} style={{ flex:1, fontSize:10, padding:"4px 6px" }} onClick={()=>setImagensIA(p=>({...p,[clienteIA]:p[clienteIA].map(x=>x.id===img.id?{...x,aprovado:!x.aprovado}:x)}))}>
                      {img.aprovado?"✓ Aprovada":"Aprovar"}
                    </Btn>
                    <Btn v="danger" style={{ fontSize:10, padding:"4px 6px" }} onClick={()=>setImagensIA(p=>({...p,[clienteIA]:p[clienteIA].filter(x=>x.id!==img.id)}))}>✕</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {qAberto && (
        <Modal title={`Briefing — ${qAberto.cliente_nome}`} onClose={()=>setQAberto(null)} width={820}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <div>
              <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12, fontSize:15 }}>Questionário raio-x</h3>
              {[["Ocasiões de uso",qAberto.ocasioes_uso],["Cores preferidas",qAberto.cores_preferidas],["Cores que evita",qAberto.cores_evita],["Estilos preferidos",qAberto.estilos_preferidos],["Restrições",qAberto.restricoes],["Orçamento estimado",qAberto.orcamento_estimado],["Evento",qAberto.evento_especifico],["Data",fmtDate(qAberto.data_evento)]].map(([l,v])=>(
                <div key={l} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, color:"#6a5a3a", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:12, color:"#c8b89a", lineHeight:1.5 }}>{v||"—"}</div>
                </div>
              ))}
              {qAberto.observacoes_livres && <div style={{ marginTop:10, padding:10, background:"#2a2218", borderRadius:6, borderLeft:"2px solid #C9A84C" }}><div style={{ fontSize:10, color:"#6a5a3a", marginBottom:3 }}>Observações livres</div><div style={{ fontSize:12, color:"#c8b89a", fontStyle:"italic" }}>"{qAberto.observacoes_livres}"</div></div>}
            </div>
            <div>
              <h3 style={{ color:"#C9A84C", fontFamily:"Cormorant Garamond, serif", marginBottom:12, fontSize:15 }}>Briefing gerado pela IA</h3>
              <div style={{ background:"#0f0c08", borderRadius:8, padding:14, border:"1px solid #2e2618" }}>
                <div style={{ fontSize:10, color:"#4a3a1a", marginBottom:8 }}>Gerado em {fmtDT(qAberto.briefing_gerado_em)}</div>
                <pre style={{ whiteSpace:"pre-wrap", fontSize:12, color:"#c8b89a", lineHeight:1.7, fontFamily:"inherit" }}>{qAberto.briefing_gerado}</pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
const NAV = [
  { id:"dashboard", label:"Dashboard", icon:"◈" },
  { id:"clientes", label:"Clientes", icon:"◉" },
  { id:"os", label:"Ordens de Serviço", icon:"◧" },
  { id:"orcamentos", label:"Orçamentos", icon:"◫" },
  { id:"financeiro", label:"Financeiro", icon:"◎" },
  { id:"agenda", label:"Agenda", icon:"◷" },
  { id:"briefing", label:"Briefing & Dossiê", icon:"✦" },
];

export default function DasGCRM() {
  const [page, setPage] = useState("dashboard");
  const [clientes, setClientes] = useState(MOCK_CLIENTES);
  const [os, setOS] = useState(MOCK_OS);
  const [agenda, setAgenda] = useState(MOCK_AGENDA);
  const [clienteAtivo, setClienteAtivo] = useState(null);
  const [pedidos, setPedidos] = useState(MOCK_PEDIDOS);
  const [contas, setContas] = useState(MOCK_CONTAS_PAGAR);

  useEffect(()=>{
    const l = document.createElement("link");
    l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Lato:wght@300;400;700&display=swap";
    l.rel = "stylesheet"; document.head.appendChild(l);
  },[]);

  function renderPage() {
    if (page==="cliente_detalhe"&&clienteAtivo) return <ClienteDetalhe cliente={clienteAtivo} os={os} setPage={setPage} conversas={MOCK_CONVERSAS} setClienteAtivo={setClienteAtivo} setClientes={setClientes} />;
    switch(page) {
      case "dashboard": return <Dashboard clientes={clientes} os={os} agenda={agenda} pedidos={pedidos} contas={contas} />;
      case "clientes": return <Clientes clientes={clientes} setClientes={setClientes} setPage={setPage} setClienteAtivo={setClienteAtivo} />;
      case "os": return <OrdensServico os={os} setOS={setOS} clientes={clientes} />;
      case "orcamentos": return <Orcamentos clientes={clientes} />;
      case "financeiro": return <Financeiro pedidos={pedidos} setPedidos={setPedidos} contas={contas} setContas={setContas} />;
      case "agenda": return <Agenda agenda={agenda} setAgenda={setAgenda} clientes={clientes} os={os} />;
      case "briefing": return <BriefingDossie clientes={clientes} />;
      default: return null;
    }
  }

  const isClienteDetalhe = page==="cliente_detalhe";

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0f0c08", fontFamily:"'Lato', sans-serif" }}>
      <div style={{ width:210, background:"#0a0804", borderRight:"1px solid #1a1510", padding:"24px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"0 18px 22px", borderBottom:"1px solid #1a1510" }}>
          <div style={{ fontFamily:"Cormorant Garamond, serif", fontSize:21, color:"#f0e8d0", letterSpacing:3 }}>Das <span style={{ color:"#C9A84C" }}>G</span></div>
          <div style={{ fontSize:9, color:"#3a2a0a", letterSpacing:"1.5px", textTransform:"uppercase", marginTop:2 }}>by Juliana Pereira</div>
        </div>
        <nav style={{ padding:"14px 0", flex:1 }}>
          {NAV.map(n=>{
            const ativo = page===n.id||(isClienteDetalhe&&n.id==="clientes");
            return (
              <button key={n.id} onClick={()=>setPage(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 18px", background:ativo?"#1a1510":"transparent", border:"none", borderLeft:`2px solid ${ativo?"#C9A84C":"transparent"}`, color:ativo?"#C9A84C":"#3a2a0a", fontSize:12, cursor:"pointer", textAlign:"left", transition:"all 0.2s" }}>
                <span style={{ fontSize:14 }}>{n.icon}</span>{n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:"14px 18px", borderTop:"1px solid #1a1510" }}>
          <div style={{ fontSize:9, color:"#2a1a04", textTransform:"uppercase", letterSpacing:"1px" }}>Das G Digital · MVP v2.0</div>
        </div>
      </div>
      <div style={{ flex:1, padding:"28px 32px", overflowY:"auto", maxHeight:"100vh" }}>
        {renderPage()}
      </div>
    </div>
  );
}
