// Resposta pela Central para Instagram e Facebook -> webhook do n8n
// ("Das G — CRM Responde Meta"). Usa o mesmo segredo do envio de WhatsApp.
// URL: VITE_N8N_META_URL, ou derivada de VITE_N8N_ENVIAR_URL (mesmo servidor n8n).

function urlMeta() {
  if (import.meta.env.VITE_N8N_META_URL) return import.meta.env.VITE_N8N_META_URL;
  const base = import.meta.env.VITE_N8N_ENVIAR_URL || '';
  return base ? base.replace(/dasg-crm-enviar\/?$/, 'dasg-crm-responder-meta') : '';
}

export function metaConfigurado() {
  return !!urlMeta();
}

// tipo: 'mensagem' (DM) ou 'comentario' (responde publicamente o comentário ref_id)
// Retorna { ok:true } ou { ok:false, erro:'texto pra mostrar' }
export async function enviarMeta({ phone, nome, mensagem, tipo = 'mensagem', ref_id = null }) {
  const url = urlMeta();
  if (!url) return { ok: false, erro: 'Resposta por Instagram/Facebook ainda não configurada (falta VITE_N8N_ENVIAR_URL na Vercel).' };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dasg-secret': import.meta.env.VITE_N8N_ENVIAR_SECRET || '' },
      body: JSON.stringify({ phone, nome: nome || '', mensagem, tipo, ref_id }),
    });
    if (!r.ok) {
      return { ok: false, erro: r.status === 500
        ? 'A Meta recusou o envio. Causas comuns: token da Página ainda não colado no n8n, passaram mais de 7 dias da última mensagem da cliente, ou o app ainda aguarda a análise da Meta.'
        : 'O n8n recusou o envio (HTTP ' + r.status + ').' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: 'Não consegui falar com o n8n: ' + e.message };
  }
}
