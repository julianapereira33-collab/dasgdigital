// Google Meet e alertas no WhatsApp da Juliana, via webhooks do n8n.
// Vercel: VITE_N8N_MEET_URL, VITE_N8N_ALERTA_URL, VITE_N8N_ASSISTENTE_URL (todas usam o mesmo VITE_N8N_ENVIAR_SECRET).
const cab = () => ({ 'Content-Type': 'application/json', 'x-dasg-secret': import.meta.env.VITE_N8N_ENVIAR_SECRET || '' });

export const meetConfigurado = () => !!import.meta.env.VITE_N8N_MEET_URL;
export const alertaConfigurado = () => !!import.meta.env.VITE_N8N_ALERTA_URL;
export const assistenteConfigurado = () => !!import.meta.env.VITE_N8N_ASSISTENTE_URL;

// -> { ok:true, link } | { ok:false, erro }
export async function gerarMeet({ titulo, inicio, duracao_min = 60 }) {
  const url = import.meta.env.VITE_N8N_MEET_URL;
  if (!url) return { ok: false, erro: 'Geração de Meet ainda não ligada (falta VITE_N8N_MEET_URL na Vercel).' };
  try {
    const ini = new Date(inicio);
    const fim = new Date(ini.getTime() + (Number(duracao_min) || 60) * 60000);
    const r = await fetch(url, { method: 'POST', headers: cab(), body: JSON.stringify({ titulo, inicio: ini.toISOString(), fim: fim.toISOString() }) });
    if (!r.ok) return { ok: false, erro: 'O n8n recusou (HTTP ' + r.status + ').' };
    const d = await r.json();
    if (!d.link) return { ok: false, erro: 'O Google não devolveu o link do Meet.' };
    return { ok: true, link: d.link };
  } catch (e) { return { ok: false, erro: 'Não consegui falar com o n8n: ' + e.message }; }
}

// Manda uma mensagem para o WhatsApp da própria Juliana (alerta). Não pausa a Júlia nem grava conversa.
export async function alertarJuliana(mensagem) {
  const url = import.meta.env.VITE_N8N_ALERTA_URL;
  if (!url) return { ok: false, erro: 'Alerta no seu WhatsApp ainda não ligado (falta VITE_N8N_ALERTA_URL na Vercel).' };
  try {
    const r = await fetch(url, { method: 'POST', headers: cab(), body: JSON.stringify({ mensagem }) });
    return r.ok ? { ok: true } : { ok: false, erro: 'O n8n recusou o alerta (HTTP ' + r.status + ').' };
  } catch (e) { return { ok: false, erro: 'Não consegui falar com o n8n: ' + e.message }; }
}

export async function perguntarAssistente({ mensagem, historico = [], contexto = '' }) {
  const url = import.meta.env.VITE_N8N_ASSISTENTE_URL;
  if (!url) return { ok: false, erro: 'O assistente ainda não está ligado (falta VITE_N8N_ASSISTENTE_URL na Vercel).' };
  try {
    const r = await fetch(url, { method: 'POST', headers: cab(), body: JSON.stringify({ mensagem, historico: historico.slice(-10), contexto }) });
    if (!r.ok) return { ok: false, erro: 'O assistente não respondeu (HTTP ' + r.status + ').' };
    const d = await r.json();
    return d.resposta ? { ok: true, resposta: d.resposta } : { ok: false, erro: d.erro || 'Resposta vazia do assistente.' };
  } catch (e) { return { ok: false, erro: 'Não consegui falar com o assistente: ' + e.message }; }
}
