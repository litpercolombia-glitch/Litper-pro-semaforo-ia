// WhatsApp Cloud API helper — Meta Business API
// Requiere: WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en env vars de Vercel

const WA_API = 'https://graph.facebook.com/v19.0';

// Envía mensaje de texto libre (para conversaciones activas)
export async function sendText(to, text) {
  return waPost(`/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'text',
    text: { body: text, preview_url: false },
  });
}

// Envía template con botones de respuesta rápida (confirmación COD)
// El template debe estar aprobado en Meta Business Manager
export async function sendConfirmationTemplate(to, params) {
  const { customerName, product, city, amount, orderId } = params;
  const templateName = process.env.WHATSAPP_TEMPLATE_COD || 'litper_cod_confirmation';

  return waPost(`/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customerName || 'Cliente' },
            { type: 'text', text: product || 'tu pedido' },
            { type: 'text', text: city || '' },
            { type: 'text', text: formatCOP(amount) },
          ],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '0',
          parameters: [{ type: 'payload', payload: `CONFIRM_${orderId}` }],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '1',
          parameters: [{ type: 'payload', payload: `RESCHEDULE_${orderId}` }],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '2',
          parameters: [{ type: 'payload', payload: `CANCEL_${orderId}` }],
        },
      ],
    },
  });
}

// Mensaje de texto simple como fallback si no hay template aprobado
export async function sendConfirmationText(to, params) {
  const { customerName, product, city, amount, orderId } = params;
  const msg = `Hola ${customerName || 'Cliente'} 👋

Tu pedido *${product || 'Litper'}* está listo para enviarse a *${city}* por valor de *${formatCOP(amount)}* (pago contra entrega).

¿Confirmamos el envío?
✅ Responde *SI* para confirmar
📅 Responde *OTRO DIA* si necesitas reagendar
❌ Responde *NO* para cancelar

ID pedido: ${orderId}`;

  return sendText(to, msg);
}

function normalizePhone(phone) {
  if (!phone) throw new Error('Teléfono requerido');
  const digits = phone.replace(/\D/g, '');
  // Si tiene 10 dígitos (Colombia), agregar indicativo
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

function formatCOP(amount) {
  if (!amount) return '';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

async function waPost(path, body) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error('WHATSAPP_TOKEN no configurado');

  const r = await fetch(`${WA_API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(`WhatsApp API ${r.status}: ${data?.error?.message || JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}
