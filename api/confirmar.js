// api/confirmar.js — ZYNEX Módulo Confirmación WhatsApp pre-despacho (Semana 2)
// POST { pedido_id, telefono, nombre?, producto?, ciudad, carrier?, valor_cod?, org_id? , forzar? }
// Flujo: semáforo ciudad → verde=DESPACHAR | rojo/amarillo=buscar en Chatea Pro y enviar confirmación.
// Auth: header x-zynex-key (misma validación que /api/brain) o JWT de usuario ZYNEX.
import { setCors, verifyUser } from './_lib.js';

const SB_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CP_BASE = 'https://chateapro.app/api';
const CP_KEY = process.env.CHATEAPRO_API_KEY || '';

const sbh = () => ({ apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });
const cph = () => ({ Authorization: `Bearer ${CP_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' });

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

// Semáforo: busca la ciudad en city_stats (datos reales del dashboard)
async function semaforoCiudad(ciudad) {
  if (!SB_SERVICE || !ciudad) return { semaforo: 'desconocido', rate: null, best_carrier: null };
  try {
    const r = await fetch(`${SB_URL}/rest/v1/city_stats?city=ilike.${encodeURIComponent(ciudad.trim())}&select=city,rate,semaforo,best_carrier&limit=1`, { headers: sbh() });
    const row = (await r.json())[0];
    if (!row) return { semaforo: 'desconocido', rate: null, best_carrier: null };
    return { semaforo: (row.semaforo || '').toLowerCase() || 'desconocido', rate: row.rate, best_carrier: row.best_carrier };
  } catch { return { semaforo: 'desconocido', rate: null, best_carrier: null }; }
}

// Chatea Pro: buscar subscriber por teléfono (con código país)
async function findSubscriber(phone) {
  const r = await fetch(`${CP_BASE}/subscriber/get-info-by-user-id?user_id=${encodeURIComponent(phone)}`, { headers: cph() });
  if (!r.ok) return null;
  const d = await r.json();
  return d?.data || d || null;
}

async function addTag(user_ns, tag_name) {
  try {
    await fetch(`${CP_BASE}/subscriber/add-tag-by-name`, { method: 'POST', headers: cph(), body: JSON.stringify({ user_ns, tag_name }) });
  } catch { /* no bloqueante */ }
}

// Envío: texto si ventana 24h abierta, si no plantilla WA (si está configurada)
async function enviarConfirmacion(sub, { nombre, producto, ciudad }) {
  const user_ns = sub.user_ns;
  const last = sub.last_message_at ? new Date(sub.last_message_at).getTime() : 0;
  const en24h = Date.now() - last < 24 * 3600 * 1000;
  const msg = `Hola ${nombre || sub.first_name || ''} 👋 Tu pedido${producto ? ' de ' + producto : ''} está listo para despacharse a ${ciudad}. Responde *SÍ* para confirmarlo o *NO* si deseas cancelarlo. 🚚`;

  if (en24h) {
    const r = await fetch(`${CP_BASE}/subscriber/send-text`, { method: 'POST', headers: cph(), body: JSON.stringify({ user_ns, content: msg }) });
    if (r.ok) return { ok: true, canal: 'text' };
  }
  // Plantilla aprobada Meta (configurar cuando Jeferson tenga el name/namespace)
  const tplName = process.env.CHATEAPRO_TPL_NAME, tplNs = process.env.CHATEAPRO_TPL_NAMESPACE;
  if (tplName && tplNs) {
    const r = await fetch(`${CP_BASE}/subscriber/send-whatsapp-template`, {
      method: 'POST', headers: cph(),
      body: JSON.stringify({
        user_ns,
        content: {
          namespace: tplNs, name: tplName, lang: process.env.CHATEAPRO_TPL_LANG || 'es',
          params: { 'BODY_{{1}}': nombre || sub.first_name || 'cliente', 'BODY_{{2}}': producto || 'tu pedido', 'BODY_{{3}}': ciudad || '' }
        }
      })
    });
    if (r.ok) return { ok: true, canal: 'template' };
    return { ok: false, error: `template ${r.status}` };
  }
  return { ok: false, error: en24h ? 'send-text falló y no hay plantilla configurada' : 'fuera de ventana 24h y no hay plantilla configurada (CHATEAPRO_TPL_NAME/NAMESPACE)' };
}

async function guardar(row) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/zynex_confirmaciones?on_conflict=pedido_id`, {
      method: 'POST', headers: { ...sbh(), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row)
    });
    return (await r.json())[0];
  } catch { return null; }
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await verifyUser(req);
  if (!user && !(await validKey(req))) return res.status(401).json({ error: 'No autorizado: usa JWT o header x-zynex-key' });

  // GET → resumen para el panel de confirmaciones
  if (req.method === 'GET') {
    if (!SB_SERVICE) return res.status(500).json({ error: 'SERVICE_ROLE no configurada' });
    const rows = await (await fetch(`${SB_URL}/rest/v1/zynex_confirmaciones?order=created_at.desc&limit=200`, { headers: sbh() })).json();
    const c = (e) => rows.filter(x => x.estado === e).length;
    const evitadas = rows.filter(x => x.estado === 'cancelado');
    const cop = evitadas.reduce((s, x) => s + (Number(x.valor_cod) || 12000), 0); // 12k COP flete promedio si no hay valor
    return res.status(200).json({
      total: rows.length, enviados: c('enviado'), confirmados: c('confirmado'),
      cancelados: evitadas.length, sin_respuesta: c('sin_respuesta'),
      cambio_direccion: c('cambio_direccion'), errores: c('error'),
      devoluciones_evitadas: evitadas.length, cop_ahorrado: cop, items: rows.slice(0, 50)
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'GET o POST' });

  const { pedido_id, telefono, nombre, producto, ciudad, carrier, valor_cod, org_id, forzar } = req.body || {};
  if (!pedido_id || !telefono || !ciudad) return res.status(422).json({ error: 'Campos requeridos: pedido_id, telefono, ciudad' });

  const phone = String(telefono).replace(/\D/g, '');
  const sem = await semaforoCiudad(ciudad);

  // Verde y sin forzar → despacho directo, no molestamos al cliente
  if (sem.semaforo === 'verde' && !forzar) {
    await guardar({ pedido_id, telefono: phone, nombre, producto, ciudad, carrier, valor_cod, org_id, semaforo: sem.semaforo, accion: 'DESPACHAR', estado: 'confirmado' });
    return res.status(200).json({ accion: 'DESPACHAR', semaforo: sem.semaforo, tasa: sem.rate, mejor_carrier: sem.best_carrier });
  }

  if (!CP_KEY) {
    await guardar({ pedido_id, telefono: phone, nombre, producto, ciudad, carrier, valor_cod, org_id, semaforo: sem.semaforo, accion: 'CONFIRMAR_PRIMERO', estado: 'error', error: 'CHATEAPRO_API_KEY no configurada' });
    return res.status(200).json({ accion: 'CONFIRMAR_PRIMERO', semaforo: sem.semaforo, enviado: false, error: 'CHATEAPRO_API_KEY no configurada en Vercel' });
  }

  // Buscar (o crear) subscriber en Chatea Pro
  let sub = await findSubscriber(phone);
  if (!sub?.user_ns) {
    try {
      const cr = await fetch(`${CP_BASE}/subscriber/create`, { method: 'POST', headers: cph(), body: JSON.stringify({ phone, email: `${phone}@cod.zynexapp.com`, first_name: nombre || '' }) });
      if (cr.ok) sub = (await cr.json())?.data || await findSubscriber(phone);
    } catch { /* abajo se reporta */ }
  }
  if (!sub?.user_ns) {
    await guardar({ pedido_id, telefono: phone, nombre, producto, ciudad, carrier, valor_cod, org_id, semaforo: sem.semaforo, accion: 'CONFIRMAR_PRIMERO', estado: 'error', error: 'Subscriber no encontrado ni creado en Chatea Pro' });
    return res.status(200).json({ accion: 'CONFIRMAR_PRIMERO', semaforo: sem.semaforo, enviado: false, error: 'No se encontró el cliente en Chatea Pro' });
  }
  if (sub.allow_send_message === false) {
    await guardar({ pedido_id, telefono: phone, nombre, producto, ciudad, carrier, valor_cod, org_id, semaforo: sem.semaforo, accion: 'CONFIRMAR_PRIMERO', estado: 'error', user_ns: sub.user_ns, error: 'allow_send_message=false' });
    return res.status(200).json({ accion: 'CONFIRMAR_PRIMERO', semaforo: sem.semaforo, enviado: false, error: 'El cliente tiene bloqueado el envío (allow_send_message=false)' });
  }

  await addTag(sub.user_ns, 'zynex_confirmar_pendiente');
  const envio = await enviarConfirmacion(sub, { nombre, producto, ciudad });

  await guardar({
    pedido_id, telefono: phone, nombre, producto, ciudad, carrier, valor_cod, org_id,
    semaforo: sem.semaforo, accion: 'CONFIRMAR_PRIMERO',
    estado: envio.ok ? 'enviado' : 'error', canal_envio: envio.canal || null,
    user_ns: sub.user_ns, error: envio.error || null,
    enviado_at: envio.ok ? new Date().toISOString() : null
  });

  return res.status(200).json({
    accion: 'CONFIRMAR_PRIMERO', semaforo: sem.semaforo, tasa: sem.rate,
    mejor_carrier: sem.best_carrier, enviado: envio.ok, canal: envio.canal || null, error: envio.error || null
  });
}
