// LitperOps Agent — agente de operaciones COD con streaming SSE
//
// DIFERENCIAL vs Treble.ai / Whaticket:
//   Ellos: flujos IF-THEN, sin razonamiento
//   Nosotros: IA que razona sobre tus datos reales y EJECUTA acciones
//
// HERRAMIENTAS del agente:
//   get_delivery_stats   → semáforo por ciudad/carrier
//   get_logistics_kpis   → tasa entrega, CPA, devoluciones, ahorro proyectado
//   get_cod_orders       → pedidos pendientes/bloqueados/confirmados
//   send_whatsapp        → mensaje real al cliente
//   block_order          → bloquea despacho de pedido de riesgo
//   run_cod_confirmation → dispara agente masivo de confirmación
//   get_meta_ads_summary → resumen de campañas activas (si hay key)

const SB_URL  = 'https://gtsivwbnhcawvmsfujby.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0c2l2d2JuaGNhd3Ztc2Z1amJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzE1OTksImV4cCI6MjA4MjA0NzU5OX0.aCLguM3d7vsX5z7PhOQs__TSORmiSmLOI7SINfzBKzg';
const SB_SVC  = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLAUDE  = () => process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
const ORIGINS = 'https://litper-semaforo.vercel.app,https://litperpro.com,http://localhost:3000';

// ── SYSTEM PROMPT — el "ADN" del agente ──────────────────────────────────────
function buildSystem(orgId, orgName) {
  return `Eres LitperOps, el agente de operaciones de ${orgName || 'Litper Group'} (Colombia).
Eres conciso, directo y orientado a RESULTADOS con NÚMEROS. Cuando el equipo te pide algo, actúas.

REGLAS DE NEGOCIO:
- NUNCA uses "waterproof" o "impermeable" para protectores de colchón
- Semáforo: verde >= 80.5% entrega · amarillo >= 70% · rojo < 70%
- CPA logístico = $15.000 COP / tasa_entrega
- Meta tasa objetivo: 85% (actual ronda 80.5%)
- Carriers Colombia: Coordinadora, Interrapidísimo, TCC, Envía
- Carriers Chile: Chilexpress, Starken
- Moneda: COP (pesos colombianos)

CUANDO TE PREGUNTEN:
- "cómo estamos" → usa get_logistics_kpis, luego get_delivery_stats con semaforo=rojo
- "pedidos en riesgo" → usa get_cod_orders status=pending + status=blocked
- "manda WhatsApp" → usa send_whatsapp, muestra el mensaje antes de enviarlo
- "ejecuta confirmación" → usa run_cod_confirmation
- cualquier pregunta de datos → CONSULTA PRIMERO, no inventes cifras

FORMAT: responde en español, bullet points cuando haya listas, negrita para números clave.
Org ID del usuario (interno, no lo menciones): ${orgId}`;
}

// ── DEFINICIÓN DE HERRAMIENTAS ────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_delivery_stats',
    description: 'Consulta tasas de entrega por ciudad y/o carrier. Muestra semáforo verde/amarillo/rojo. Úsalo para cualquier pregunta sobre entregabilidad, ciudades problemáticas o rendimiento de carriers.',
    input_schema: {
      type: 'object',
      properties: {
        city:     { type: 'string', description: 'Ciudad específica (opcional, parcial OK)' },
        carrier:  { type: 'string', description: 'Carrier: Coordinadora, TCC, Envía, Interrapidísimo' },
        semaforo: { type: 'string', enum: ['verde','amarillo','rojo'], description: 'Filtrar por color' },
        limit:    { type: 'number', description: 'Máximo resultados (default 15)' }
      }
    }
  },
  {
    name: 'get_logistics_kpis',
    description: 'KPIs ejecutivos de logística: tasa global, CPA actual, devoluciones, impacto en margen. Úsalo para resúmenes o cuando el usuario quiera saber "cómo vamos".',
    input_schema: {
      type: 'object',
      properties: {
        scenario_rate: { type: 'number', description: 'Simular CPA con tasa hipotética (ej: 0.85 para 85%)' }
      }
    }
  },
  {
    name: 'get_cod_orders',
    description: 'Lista pedidos COD por estado: pendientes de confirmación, confirmados, bloqueados o rechazados.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending','confirmed','blocked','rejected','reschedule','all'], description: 'Estado (default: pending)' },
        city:   { type: 'string' },
        limit:  { type: 'number', description: 'Default 10' }
      }
    }
  },
  {
    name: 'send_whatsapp',
    description: 'Envía un mensaje de WhatsApp real a un cliente. Úsalo SOLO cuando el usuario lo pida explícitamente. Confirma el teléfono y el texto antes.',
    input_schema: {
      type: 'object',
      properties: {
        phone:   { type: 'string', description: 'Teléfono colombiano (10 dígitos, sin +57)' },
        message: { type: 'string', description: 'Texto del mensaje' }
      },
      required: ['phone','message']
    }
  },
  {
    name: 'block_order',
    description: 'Bloquea el despacho de un pedido COD de alto riesgo. Requiere order_id y razón.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string' },
        reason:   { type: 'string', description: 'Motivo del bloqueo' }
      },
      required: ['order_id','reason']
    }
  },
  {
    name: 'run_cod_confirmation',
    description: 'Dispara el agente de confirmación COD: envía WhatsApp a pedidos pendientes, evalúa riesgo y bloquea los peligrosos.',
    input_schema: {
      type: 'object',
      properties: {
        batch_size: { type: 'number', description: 'Pedidos a procesar (default 50, max 200)' }
      }
    }
  }
];

// ── CORS ──────────────────────────────────────────────────────────────────────
function setCors(res, origin) {
  const list = (process.env.ALLOWED_ORIGINS || ORIGINS).split(',');
  const allowed = list.find(o => origin?.startsWith(o)) || list[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── HANDLER PRINCIPAL ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  // Verificar usuario y obtener org
  let orgId, orgName;
  try {
    const u = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SB_ANON }
    });
    if (!u.ok) return res.status(401).json({ error: 'Token inválido' });
    const user = await u.json();

    const [profile] = await db(`auth_profiles?id=eq.${user.id}&select=org_id,organizations(name)`);
    orgId = profile?.org_id;
    orgName = profile?.organizations?.name;
    if (!orgId) return res.status(403).json({ error: 'Sin organización' });
  } catch (e) {
    return res.status(401).json({ error: 'Error de autenticación' });
  }

  const { messages } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'messages[] requerido' });

  // SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (res.flush) res.flush();
  };

  try {
    await runAgentLoop(send, messages, orgId, orgName);
  } catch (e) {
    console.error('[agent-ops]', e.message);
    send({ type: 'error', message: e.message });
  } finally {
    send({ type: 'done' });
    res.end();
  }
}

// ── LOOP AGÉNTICO ─────────────────────────────────────────────────────────────
async function runAgentLoop(send, messages, orgId, orgName, depth = 0) {
  if (depth > 6) {
    send({ type: 'text', text: '\n_[Límite de pasos alcanzado]_' });
    return;
  }

  const key = CLAUDE();
  if (!key) throw new Error('CLAUDE_API_KEY no configurada en variables de entorno');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: buildSystem(orgId, orgName),
      tools: TOOLS,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`Claude API ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const toolCalls = [];

  for (const block of (data.content || [])) {
    if (block.type === 'text' && block.text) {
      send({ type: 'text', text: block.text });
    } else if (block.type === 'tool_use') {
      toolCalls.push(block);
      send({ type: 'tool_start', id: block.id, name: block.name, input: block.input });
    }
  }

  if (!toolCalls.length) return; // end_turn sin herramientas

  // Ejecutar herramientas
  const toolResults = [];
  for (const tc of toolCalls) {
    try {
      const result = await executeTool(tc.name, tc.input, orgId);
      toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify(result) });
      send({ type: 'tool_result', id: tc.id, name: tc.name, result });
    } catch (e) {
      const errResult = { error: e.message };
      toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify(errResult), is_error: true });
      send({ type: 'tool_error', id: tc.id, name: tc.name, error: e.message });
    }
  }

  // Continuar con los resultados
  await runAgentLoop(send, [
    ...messages,
    { role: 'assistant', content: data.content },
    { role: 'user',      content: toolResults },
  ], orgId, orgName, depth + 1);
}

// ── EJECUTORES DE HERRAMIENTAS ────────────────────────────────────────────────
async function executeTool(name, input, orgId) {
  switch (name) {
    case 'get_delivery_stats':     return toolDeliveryStats(input, orgId);
    case 'get_logistics_kpis':     return toolLogisticsKpis(input, orgId);
    case 'get_cod_orders':         return toolCodOrders(input, orgId);
    case 'send_whatsapp':          return toolSendWhatsapp(input);
    case 'block_order':            return toolBlockOrder(input, orgId);
    case 'run_cod_confirmation':   return toolRunCodConfirmation(input, orgId);
    default: throw new Error(`Herramienta no reconocida: ${name}`);
  }
}

async function toolDeliveryStats({ city, carrier, semaforo, limit = 15 }, orgId) {
  const lim = Math.min(Number(limit) || 15, 50);

  if (carrier) {
    let q = `carrier_stats?org_id=eq.${orgId}&order=rate.asc&limit=${lim}`;
    if (carrier !== 'all') q += `&carrier=ilike.*${encodeURIComponent(carrier)}*`;
    const rows = await db(q);
    return { type: 'carrier_stats', rows, count: rows.length };
  }

  let q = `city_stats?org_id=eq.${orgId}&order=rate.asc&limit=${lim}`;
  if (city)     q += `&city=ilike.*${encodeURIComponent(city)}*`;
  if (semaforo) q += `&semaforo=eq.${semaforo}`;
  const rows = await db(q);
  return { type: 'city_stats', rows, count: rows.length };
}

async function toolLogisticsKpis({ scenario_rate }, orgId) {
  const [upload] = await db(`uploads?org_id=eq.${orgId}&order=created_at.desc&limit=1`);
  if (!upload) return { error: 'No hay datos cargados todavía. Sube un Excel en el Dashboard.' };

  const rate = (upload.delivery_rate || 0) / 100;
  const cpa  = rate > 0 ? 15000 / rate : null;

  const result = {
    delivery_rate_pct: upload.delivery_rate,
    semaforo: rate >= 0.805 ? 'verde' : rate >= 0.70 ? 'amarillo' : 'rojo',
    total_orders: upload.total_orders,
    delivered:    upload.delivered,
    returned:     upload.returned,
    cpa_actual:   cpa ? Math.round(cpa) : null,
    cpa_objetivo: Math.round(15000 / 0.85),
    gap_vs_objetivo_pct: upload.delivery_rate ? +(0.85 - rate).toFixed(4) : null,
    period_start: upload.period_start,
    period_end:   upload.period_end,
  };

  if (scenario_rate) {
    const simCpa = 15000 / scenario_rate;
    result.scenario = {
      rate_pct: +(scenario_rate * 100).toFixed(1),
      cpa_simulado: Math.round(simCpa),
      ahorro_por_pedido_cop: cpa ? Math.round(cpa - simCpa) : null,
      semaforo: scenario_rate >= 0.805 ? 'verde' : scenario_rate >= 0.70 ? 'amarillo' : 'rojo',
    };
  }

  // Ciudades en rojo para alertar
  const redCities = await db(`city_stats?org_id=eq.${orgId}&semaforo=eq.rojo&order=rate.asc&limit=5`);
  result.top_ciudades_rojo = redCities.map(c => ({ city: c.city, rate: c.rate }));

  return result;
}

async function toolCodOrders({ status = 'pending', city, limit = 10 }, orgId) {
  const lim = Math.min(Number(limit) || 10, 50);
  let q = `cod_orders?org_id=eq.${orgId}&order=created_at.desc&limit=${lim}`;
  if (status !== 'all') q += `&confirmation_status=eq.${status}`;
  if (city) q += `&city=ilike.*${encodeURIComponent(city)}*`;
  const orders = await db(q);
  return { orders, count: orders.length, status_queried: status };
}

async function toolSendWhatsapp({ phone, message }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return { sent: false, reason: 'WhatsApp no configurado (falta WHATSAPP_TOKEN o WHATSAPP_PHONE_ID en Vercel env vars)' };
  }

  const digits = String(phone).replace(/\D/g,'');
  const to = digits.length === 10 ? `57${digits}` : digits;

  const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message, preview_url: false },
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${data?.error?.message || JSON.stringify(data).slice(0,100)}`);
  return { sent: true, to, message_id: data.messages?.[0]?.id, preview: message.slice(0, 80) };
}

async function toolBlockOrder({ order_id, reason }, orgId) {
  if (!SB_SVC()) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
  await dbSvc(`cod_orders?id=eq.${order_id}&org_id=eq.${orgId}`, 'PATCH', {
    dispatch_blocked: true,
    confirmation_status: 'blocked',
    agent_notes: reason,
    updated_at: new Date().toISOString(),
  });
  return { blocked: true, order_id, reason };
}

async function toolRunCodConfirmation({ batch_size = 50 }, orgId) {
  const lim = Math.min(Number(batch_size) || 50, 200);
  const pending = await db(`cod_orders?org_id=eq.${orgId}&confirmation_status=eq.pending&limit=${lim}`);
  // El agente de confirmación completo está en /api/agents/cod-confirmation.js
  // Aquí reportamos cuántos hay listos para procesar
  return {
    queued: pending.length,
    message: pending.length > 0
      ? `${pending.length} pedidos listos. Para enviar WhatsApp a todos, ejecuta el Agente COD desde el panel de Agentes o llama POST /api/agents/cod-confirmation con action=run.`
      : 'No hay pedidos pendientes de confirmación.',
  };
}

// ── DB HELPERS ────────────────────────────────────────────────────────────────
async function db(path, method = 'GET', body) {
  // Anon key para lecturas (respeta RLS), service key para escrituras
  const key = method === 'GET' ? SB_ANON : (SB_SVC() || SB_ANON);
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': method !== 'GET' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`DB ${r.status}: ${t.slice(0, 200)}`);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json')) return r.json();
  return null;
}

async function dbSvc(path, method, body) {
  const key = SB_SVC();
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY requerida para escrituras');
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`DB ${r.status}: ${t.slice(0, 200)}`);
  }
  return true;
}
