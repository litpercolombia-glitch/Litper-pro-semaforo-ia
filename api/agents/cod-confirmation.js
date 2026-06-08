// Agente de Confirmación COD — Litper Software
//
// QUÉ HACE: antes de despachar un pedido COD, confirma con el cliente por WhatsApp.
// Si el cliente no responde o cancela → bloquea el despacho → evita el flete tirado.
//
// ENDPOINTS:
//   POST /api/agents/cod-confirmation  {action: 'run', orders: [...], org_id}
//   POST /api/agents/cod-confirmation  {action: 'webhook', entry: [...]}  ← WhatsApp webhook
//   GET  /api/agents/cod-confirmation?action=status&org_id=&run_id=
//
// NÚMERO QUE MUEVE: cada devolución COD evitada = $15.000 COP (flete) + producto ida/vuelta.
// Con 10 devoluciones/día evitadas → $150.000 COP/día → $4.5M COP/mes.

import { AgentRun, llmCall, db } from '../lib/agent-core.js';
import { sendConfirmationText, sendConfirmationTemplate } from '../lib/whatsapp.js';

const ORIGINS = 'https://litper-semaforo.vercel.app,https://litperpro.com,http://localhost:3000';

// Máximo de horas sin respuesta antes de considerar "sin respuesta"
const NO_RESPONSE_HOURS = parseInt(process.env.COD_CONFIRM_HOURS || '4');
// Límite de pedidos por corrida (evitar sobrecarga de WhatsApp)
const BATCH_SIZE = parseInt(process.env.COD_BATCH_SIZE || '50');

function setCors(res, origin) {
  const list = (process.env.ALLOWED_ORIGINS || ORIGINS).split(',');
  const allowed = list.find(o => origin?.startsWith(o)) || list[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = req.query.action || req.body?.action;

  // WhatsApp Webhook verification (GET)
  if (req.method === 'GET' && action === 'webhook') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Token inválido' });
  }

  // WhatsApp incoming messages (POST webhook)
  if (req.method === 'POST' && action === 'webhook') {
    try {
      await processWhatsAppWebhook(req.body);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[cod-confirm webhook]', e.message);
      return res.status(200).json({ ok: true }); // WhatsApp requiere 200 siempre
    }
  }

  // GET status — sin auth porque se puede llamar desde el dashboard
  if (req.method === 'GET' && action === 'status') {
    const { org_id, run_id } = req.query;
    if (!org_id) return res.status(400).json({ error: 'org_id requerido' });
    try {
      const filter = run_id
        ? `agent_name=eq.cod-confirmation&org_id=eq.${org_id}&id=eq.${run_id}`
        : `agent_name=eq.cod-confirmation&org_id=eq.${org_id}&order=created_at.desc&limit=10`;
      const runs = await db(`agent_runs?${filter}`);
      const pending = await db(`cod_orders?org_id=eq.${org_id}&confirmation_status=eq.pending&select=count`);
      const confirmed = await db(`cod_orders?org_id=eq.${org_id}&confirmation_status=eq.confirmed&select=count`);
      const blocked = await db(`cod_orders?org_id=eq.${org_id}&dispatch_blocked=eq.true&select=count`);
      return res.status(200).json({ runs, stats: { pending, confirmed, blocked } });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST run — lanza el agente (requiere auth)
  if (req.method === 'POST' && action === 'run') {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const { org_id, orders } = req.body || {};
    if (!org_id) return res.status(400).json({ error: 'org_id requerido' });

    const run = new AgentRun('cod-confirmation', org_id, 'manual');
    try {
      await run.start({ orders_count: orders?.length ?? 0 });

      let toProcess;

      if (orders && Array.isArray(orders) && orders.length > 0) {
        // Guardar pedidos nuevos y procesar
        await upsertOrders(org_id, orders, run);
        toProcess = orders.slice(0, BATCH_SIZE);
      } else {
        // Reenviar a pedidos pendientes sin respuesta de la BD
        toProcess = await db(
          `cod_orders?org_id=eq.${org_id}&confirmation_status=eq.pending&order=created_at.asc&limit=${BATCH_SIZE}`
        );
      }

      const result = await runConfirmationBatch(run, toProcess);
      return res.status(200).json(await run.complete(result));

    } catch (e) {
      console.error('[cod-confirm run]', e.message);
      await run.fail(e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── Guardar pedidos en cod_orders ──────────────────────────────────────────
async function upsertOrders(orgId, orders, run) {
  const rows = orders.map(o => ({
    org_id: orgId,
    order_ref: o.ref || o.order_ref || o.id || String(Math.random()),
    customer_name:  o.name || o.customer_name || '',
    customer_phone: o.phone || o.customer_phone || '',
    city:           o.city || '',
    carrier:        o.carrier || '',
    product:        o.product || 'Litper',
    amount_cop:     o.amount || o.amount_cop || 0,
    confirmation_status: 'pending',
  })).filter(r => r.customer_phone);

  if (!rows.length) return;

  await db('cod_orders?on_conflict=order_ref,org_id', 'POST', rows);
  await run.log('tool_call', { tool: 'db_upsert', records: rows.length });
}

// ── Procesar lote: evaluar riesgo + enviar WhatsApp ──────────────────────────
async function runConfirmationBatch(run, orders) {
  if (!orders?.length) return { sent: 0, blocked: 0, skipped: 0 };

  let sent = 0, blocked = 0, skipped = 0;

  for (const order of orders) {
    if (!order.customer_phone) { skipped++; continue; }

    try {
      // 1. Evaluar riesgo con IA (Haiku — barato y rápido)
      const riskScore = await assessRisk(run, order);

      // 2. Si riesgo muy alto (>0.85) → bloquear directo sin preguntar
      if (riskScore > 0.85) {
        await db(`cod_orders?id=eq.${order.id}`, 'PATCH', {
          dispatch_blocked: true,
          risk_score: riskScore,
          agent_notes: `Bloqueado automáticamente: riesgo ${Math.round(riskScore * 100)}%`,
        });
        await run.log('decision', { order_id: order.id, decision: 'auto_block', risk: riskScore });
        blocked++;
        continue;
      }

      // 3. Enviar mensaje de confirmación
      const sent_ok = await sendConfirmation(run, order);
      if (sent_ok) {
        await db(`cod_orders?id=eq.${order.id}`, 'PATCH', {
          risk_score: riskScore,
          whatsapp_sent_at: new Date().toISOString(),
        });
        sent++;
      } else {
        skipped++;
      }

      // Pausa entre mensajes para respetar rate limits de WhatsApp
      await sleep(300);

    } catch (e) {
      await run.log('error', { order_id: order.id, message: e.message });
      skipped++;
    }
  }

  return { sent, blocked, skipped, total: orders.length };
}

// ── Evaluar riesgo de devolución con IA ──────────────────────────────────────
async function assessRisk(run, order) {
  // Si no hay clave de IA, usar heurística simple
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) return heuristicRisk(order);

  const prompt = `Evalúa el riesgo de devolución de este pedido COD (contra entrega) en Colombia.
Responde SOLO con un número entre 0.0 (riesgo bajo) y 1.0 (riesgo muy alto).
No expliques, solo el número.

Pedido:
- Ciudad: ${order.city || 'desconocida'}
- Carrier: ${order.carrier || 'desconocido'}
- Monto: ${order.amount_cop || 0} COP
- Producto: ${order.product || ''}
- Teléfono registrado: ${order.customer_phone ? 'sí' : 'no'}

Factores de riesgo conocidos:
- Ciudades con tasa < 70%: alto riesgo
- Montos > $200.000 COP sin confirmación previa: riesgo moderado
- Sin teléfono: bloquear`;

  try {
    const text = await llmCall(run, prompt,
      'Eres un sistema de scoring de riesgo logístico COD para LATAM. Responde solo con un decimal entre 0.0 y 1.0.'
    );
    const score = parseFloat(text.trim());
    return isNaN(score) ? heuristicRisk(order) : Math.min(1, Math.max(0, score));
  } catch {
    return heuristicRisk(order);
  }
}

// Heurística simple sin IA (fallback)
function heuristicRisk(order) {
  let risk = 0.3; // base
  if (!order.customer_phone) return 0.99;
  if ((order.amount_cop || 0) > 200000) risk += 0.2;
  if (!order.city) risk += 0.1;
  return Math.min(0.95, risk);
}

// ── Enviar mensaje de confirmación ──────────────────────────────────────────
async function sendConfirmation(run, order) {
  const params = {
    customerName: order.customer_name,
    product: order.product,
    city: order.city,
    amount: order.amount_cop,
    orderId: order.id,
  };

  try {
    // Intentar template primero (mejor experiencia), fallback a texto libre
    if (process.env.WHATSAPP_TEMPLATE_COD) {
      await sendConfirmationTemplate(order.customer_phone, params);
    } else {
      await sendConfirmationText(order.customer_phone, params);
    }
    await run.log('tool_call', { tool: 'whatsapp_send', order_id: order.id, phone_last4: order.customer_phone.slice(-4) });
    return true;
  } catch (e) {
    await run.log('error', { tool: 'whatsapp_send', order_id: order.id, message: e.message });
    return false;
  }
}

// ── Procesar respuesta entrante de WhatsApp ──────────────────────────────────
async function processWhatsAppWebhook(body) {
  const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages?.length) return;

  for (const msg of messages) {
    const phone = msg.from;
    const text  = (msg.text?.body || msg.button?.payload || '').toUpperCase().trim();

    // Buscar pedido pendiente con este teléfono
    const [order] = await db(
      `cod_orders?customer_phone=like.*${phone.slice(-10)}*&confirmation_status=eq.pending&order=created_at.desc&limit=1`
    );
    if (!order) continue;

    let newStatus = 'no_response';
    if (/^(SI|SÍ|YES|CONFIRM|OK|CONFIRMO)/.test(text) || text.includes('CONFIRM_')) {
      newStatus = 'confirmed';
    } else if (/^(NO|CANCEL|CANCELAR|CANCELO)/.test(text) || text.includes('CANCEL_')) {
      newStatus = 'rejected';
    } else if (/^(OTRO|REAGENDAR|RESCHEDULE|MAÑANA|PASADO)/.test(text) || text.includes('RESCHEDULE_')) {
      newStatus = 'reschedule';
    }

    const dispatchBlocked = newStatus === 'rejected' || newStatus === 'reschedule';

    await db(`cod_orders?id=eq.${order.id}`, 'PATCH', {
      confirmation_status: newStatus,
      customer_reply: msg.text?.body || '',
      customer_replied_at: new Date().toISOString(),
      dispatch_blocked: dispatchBlocked,
    });
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
