// api/confirmar-respuesta.js — procesa la respuesta del cliente (SÍ/NO/cambio/sin respuesta)
// POST { telefono | pedido_id, respuesta }  — respuesta: texto libre del cliente o "si"|"no"|"cambio"|"timeout"
// Llamado desde n8n / webhook de Chatea Pro. Auth: x-zynex-key o JWT.
import { setCors, verifyUser } from './_lib.js';

const SB_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CP_BASE = 'https://chateapro.app/api';
const CP_KEY = process.env.CHATEAPRO_API_KEY || '';
const sbh = () => ({ apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });

async function validKey(req) {
  const key = req.headers['x-zynex-key'];
  if (!key) return false;
  const envKeys = (process.env.ZYNEX_BRAIN_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (envKeys.includes(key)) return true;
  if (!SB_SERVICE) return false;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/zynex_api_keys?api_key=eq.${encodeURIComponent(key)}&active=eq.true&select=id`, { headers: sbh() });
    return (await r.json()).length > 0;
  } catch { return false; }
}

function clasificar(txt) {
  const t = (txt || '').toLowerCase().trim();
  if (t === 'timeout' || t === 'sin_respuesta') return 'sin_respuesta';
  if (/\b(si|sí|sii|confirmo|confirmar|dale|claro|listo|ok|okay|correcto|de una)\b/.test(t)) return 'confirmado';
  if (/\b(no|cancela|cancelar|cancelo|ya no|no quiero|no gracias)\b/.test(t)) return 'cancelado';
  if (/(direcci[oó]n|cambiar|cambio|otra ciudad|me mud[eé]|barrio)/.test(t)) return 'cambio_direccion';
  return 'cambio_direccion'; // ambigua → que lo revise un humano en la Bandeja
}

async function tag(user_ns, tag_name) {
  if (!CP_KEY || !user_ns) return;
  try {
    await fetch(`${CP_BASE}/subscriber/add-tag-by-name`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CP_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ns, tag_name })
    });
  } catch { /* no bloqueante */ }
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await verifyUser(req);
  if (!user && !(await validKey(req))) return res.status(401).json({ error: 'No autorizado' });
  if (!SB_SERVICE) return res.status(500).json({ error: 'SERVICE_ROLE no configurada' });

  const { telefono, pedido_id, respuesta } = req.body || {};
  if ((!telefono && !pedido_id) || respuesta === undefined) {
    return res.status(422).json({ error: 'Requeridos: (telefono o pedido_id) + respuesta' });
  }

  // Buscar la confirmación pendiente más reciente
  const filtro = pedido_id
    ? `pedido_id=eq.${encodeURIComponent(pedido_id)}`
    : `telefono=eq.${String(telefono).replace(/\D/g, '')}&estado=in.(enviado,pendiente)`;
  const r = await fetch(`${SB_URL}/rest/v1/zynex_confirmaciones?${filtro}&order=created_at.desc&limit=1`, { headers: sbh() });
  const conf = (await r.json())[0];
  if (!conf) return res.status(404).json({ error: 'No hay confirmación pendiente para ese teléfono/pedido' });

  const estado = clasificar(respuesta);
  await fetch(`${SB_URL}/rest/v1/zynex_confirmaciones?id=eq.${conf.id}`, {
    method: 'PATCH', headers: sbh(),
    body: JSON.stringify({ estado, respuesta_raw: String(respuesta).slice(0, 500), respondido_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  });

  // Tags en Chatea Pro según resultado
  const tagMap = { confirmado: 'zynex_confirmado', cancelado: 'zynex_cancelado', cambio_direccion: 'zynex_revisar', sin_respuesta: 'zynex_sin_respuesta' };
  await tag(conf.user_ns, tagMap[estado]);

  // Cambio de dirección o sin respuesta → Bandeja para decisión humana
  if (estado === 'cambio_direccion' || estado === 'sin_respuesta') {
    await fetch(`${SB_URL}/rest/v1/zynex_inbox`, {
      method: 'POST', headers: sbh(),
      body: JSON.stringify({
        source: 'confirmacion',
        title: `${estado === 'sin_respuesta' ? 'Sin respuesta 24h' : 'Cliente pide cambio'} — pedido ${conf.pedido_id} (${conf.ciudad})`,
        context: { pedido_id: conf.pedido_id, telefono: conf.telefono, ciudad: conf.ciudad, producto: conf.producto, respuesta: String(respuesta).slice(0, 300), semaforo: conf.semaforo },
        proposed_action: estado === 'sin_respuesta'
          ? 'Reintentar confirmación por otro canal o retener despacho 24h más'
          : `Contactar al cliente al ${conf.telefono} para validar la nueva dirección antes de despachar`,
        action_type: 'whatsapp', why: 'Confirmación pre-despacho sin resolver — riesgo de devolución', risk: 'alto'
      })
    });
  }

  const accion = estado === 'confirmado' ? 'DESPACHAR' : estado === 'cancelado' ? 'NO_DESPACHAR' : 'REVISAR_BANDEJA';
  return res.status(200).json({ estado, accion, pedido_id: conf.pedido_id, devolucion_evitada: estado === 'cancelado' });
}
