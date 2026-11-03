// Envio de WhatsApp pelo CRM -> webhook do n8n ("Das G — CRM Envia WhatsApp").
// O n8n manda pela Evolution API, grava a mensagem como out_humano em conversas_whatsapp e
// pausa a Julia nesse numero. Variaveis na Vercel: VITE_N8N_ENVIAR_URL e VITE_N8N_ENVIAR_SECRET.

export function normalizarTelefone(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('55') && d.length >= 12) return d;
  return '55' + d;
}

export function whatsappConfigurado() {
  return !!import.meta.env.VITE_N8N_ENVIAR_URL;
}

// Retorna { ok:true } ou { ok:false, erro:'texto pra mostrar' }
export async function enviarWhatsApp({ telefone, nome, mensagem }) {
  const url = import.meta.env.VITE_N8N_ENVIAR_URL;
  if (!url) return { ok: false, erro: 'Envio de WhatsApp ainda não configurado (falta VITE_N8N_ENVIAR_URL na Vercel).' };
  const phone = normalizarTelefone(telefone);
  if (!phone) return { ok: false, erro: 'Cliente sem telefone cadastrado.' };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dasg-secret': import.meta.env.VITE_N8N_ENVIAR_SECRET || '' },
      body: JSON.stringify({ phone, nome: nome || '', mensagem }),
    });
    if (!r.ok) return { ok: false, erro: 'O n8n recusou o envio (HTTP ' + r.status + ').' };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: 'Não consegui falar com o n8n: ' + e.message };
  }
}

// Mensagens-padrão (editáveis na tela antes de enviar)
export function msgConfirmacaoEvento({ nomeCliente, tipoLabel, data, local, linkMeet }) {
  const primeiro = (nomeCliente || '').split(' ')[0] || 'tudo bem';
  const quando = new Date(data).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  let m = `Olá, ${primeiro}! Aqui é do ateliê Das G. Seu horário de *${tipoLabel}* está reservado para *${quando}*.`;
  if (local) m += `\nLocal: ${local}.`;
  if (linkMeet) m += `\nLink da videochamada: ${linkMeet}`;
  m += '\n\nPode me confirmar respondendo *SIM*? Se precisar remarcar, é só avisar.';
  return m;
}

export function msgAvisoTarefa({ nomeCliente, titulo, prazo }) {
  const primeiro = (nomeCliente || '').split(' ')[0] || 'tudo bem';
  let m = `Olá, ${primeiro}! Aqui é do ateliê Das G. ${titulo}.`;
  if (prazo) m += `\nPrazo: ${new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR')}.`;
  m += '\n\nQualquer dúvida é só me chamar por aqui.';
  return m;
}
