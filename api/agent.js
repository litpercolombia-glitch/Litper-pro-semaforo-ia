// api/agent.js — ZYNEX Agent: agente autónomo con herramientas (estilo Claude)
// Loop de tool-use con Claude API. Herramientas: condiciones de transportadora,
// recomendación por ciudad, traducción de novedades, borrador de WhatsApp.
import { setCors, verifyUser, consumeAIQuota } from './_lib.js';
import { CARRIERS_CO, CARRIERS_PA, NOVEDADES, kbSummary } from './_kb.js';

const SB_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';

const TOOLS = [
  {
    name: 'get_carrier_conditions',
    description: 'Devuelve las condiciones operativas de una transportadora (recaudo máximo, métodos de pago del mensajero, peso, intentos de entrega, política de devoluciones, restricciones).',
    input_schema: { type: 'object', properties: { carrier: { type: 'string', description: 'Nombre: INTERRAPIDISIMO, ENVIA, COORDINADORA, TCC, DOMINA, VELOCES, JAMV-DRIVE, WIILOG, 99MINUTOS, SERVIENTREGA, FLETEX, DE ROCHA, o de Panamá' } }, required: ['carrier'] }
  },
  {
    name: 'recommend_carrier',
    description: 'Recomienda la mejor transportadora para una ciudad usando el semáforo ZYNEX (score = 0.7×volumen + 0.3×tasa de entrega) sobre los datos históricos del usuario en Supabase.',
    input_schema: { type: 'object', properties: { city: { type: 'string' }, cod_value: { type: 'number', description: 'Valor a recaudar en COP (para validar tope de recaudo)' }, payment_method: { type: 'string', description: 'efectivo | nequi | tarjeta | pse' } }, required: ['city'] }
  },
  {
    name: 'translate_novedad',
    description: 'Explica qué significa una novedad/estatus de una guía y qué acción tomar según el manual operativo ZYNEX.',
    input_schema: { type: 'object', properties: { novedad: { type: 'string' }, carrier: { type: 'string' } }, required: ['novedad'] }
  },
  {
    name: 'find_office',
    description: 'Busca oficinas/puntos de reclamo de las transportadoras en una ciudad (dirección exacta), para ofrecer retiro en oficina al cliente.',
    input_schema: { type: 'object', properties: { city: { type: 'string' }, carrier: { type: 'string' } }, required: ['city'] }
  },
  {
    name: 'check_cod_coverage',
    description: 'Verifica qué transportadoras tienen cobertura en una ciudad y si aceptan contraentrega (COD) o solo pago anticipado. Fuente: matriz oficial Dropi cargada en ZYNEX.',
    input_schema: { type: 'object', properties: { city: { type: 'string' }, only_cod: { type: 'boolean', description: 'true = solo transportadoras con contraentrega' } }, required: ['city'] }
  },
  {
    name: 'draft_whatsapp',
    description: 'Redacta un mensaje de WhatsApp para el cliente final según la situación de la guía (ausente, sin dinero, en oficina, etc). Tono colombiano cercano.',
    input_schema: { type: 'object', properties: { situacion: { type: 'string' }, nombre_cliente: { type: 'string' }, ciudad: { type: 'string' } }, required: ['situacion'] }
  },
];

function findCarrier(name) {
  const k = (name || '').toUpperCase().replace(/[ÍÌ]/g, 'I').trim();
  const all = { ...CARRIERS_CO, ...CARRIERS_PA };
  return all[k] || all[Object.keys(all).find(c => c.includes(k) || k.includes(c))] || null;
}

async function runTool(name, input, authToken) {
  if (name === 'get_carrier_conditions') {
    const c = findCarrier(input.carrier);
    return c ? JSON.stringify(c) : `Transportadora "${input.carrier}" no encontrada. Disponibles: ${Object.keys({ ...CARRIERS_CO, ...CARRIERS_PA }).join(', ')}`;
  }
  if (name === 'translate_novedad') {
    // 1) Diccionario oficial por transportadora (184 estatus reales cargados en Supabase)
    try {
      const q = encodeURIComponent(`%${(input.novedad || '').trim()}%`);
      const cf = input.carrier ? `&carrier=ilike.*${encodeURIComponent(input.carrier)}*` : '';
      const r = await fetch(`${SB_URL}/rest/v1/zynex_novedades?or=(estatus_dropi.ilike.${q},estatus_carrier.ilike.${q},significado.ilike.${q})${cf}&select=carrier,estatus_dropi,estatus_carrier,significado,accion&limit=8`, {
        headers: { apikey: process.env.SUPABASE_ANON_KEY || '', Authorization: `Bearer ${authToken}` }
      });
      const rows = r.ok ? await r.json() : [];
      if (rows.length) return JSON.stringify({ fuente: 'diccionario oficial', resultados: rows });
    } catch (e) { /* fallback a KB local */ }
    const k = Object.keys(NOVEDADES).find(n => (input.novedad || '').toUpperCase().includes(n) || n.includes((input.novedad || '').toUpperCase()));
    const base = k ? { novedad: k, ...NOVEDADES[k] } : { nota: 'Novedad no catalogada en KB v1; interpretar con criterio general COD' };
    const c = input.carrier ? findCarrier(input.carrier) : null;
    if (c) base.contexto_transportadora = { intentos_max: c.intentos_entrega, cambio_direccion: c.cambio_direccion_misma_ciudad, reclamo_oficina: c.reclamo_oficina, dias_reclamo: c.dias_reclamo_oficina };
    return JSON.stringify(base);
  }
  if (name === 'check_cod_coverage') {
    try {
      const codFilter = input.only_cod === false ? '' : '&cod=eq.true';
      const r = await fetch(`${SB_URL}/rest/v1/zynex_carrier_coverage?city=ilike.*${encodeURIComponent(input.city)}*${codFilter}&select=carrier,city,department,cod&limit=60`, {
        headers: { apikey: process.env.SUPABASE_ANON_KEY || '', Authorization: `Bearer ${authToken}` }
      });
      const rows = r.ok ? await r.json() : [];
      if (!rows.length) return JSON.stringify({ resultado: `Sin cobertura registrada para "${input.city}". Verificar nombre exacto de la ciudad o considerar pago anticipado/oficina cercana.` });
      return JSON.stringify({ ciudad: input.city, cobertura: rows });
    } catch (e) { return JSON.stringify({ error: e.message }); }
  }
  if (name === 'recommend_carrier') {
    // Consulta city_stats del usuario (RLS aplica con su token)
    try {
      const r = await fetch(`${SB_URL}/rest/v1/city_stats?ciudad=ilike.*${encodeURIComponent(input.city)}*&select=*&limit=20`, {
        headers: { apikey: process.env.SUPABASE_ANON_KEY || '', Authorization: `Bearer ${authToken}` }
      });
      const rows = r.ok ? await r.json() : [];
      // filtrar por tope de recaudo y método de pago
      const validation = {};
      if (input.cod_value) {
        validation.tope_recaudo = Object.entries(CARRIERS_CO)
          .filter(([, c]) => c.max_recaudo < input.cod_value)
          .map(([n]) => `${n} NO puede recaudar $${input.cod_value.toLocaleString('es-CO')}`);
      }
      if (input.payment_method && input.payment_method !== 'efectivo') {
        validation.metodo_pago = Object.entries(CARRIERS_CO)
          .filter(([, c]) => {
            const p = c.pagos || {};
            if (input.payment_method === 'nequi') return !p.nequi_daviplata;
            if (input.payment_method === 'tarjeta') return !p.tarjeta_credito && !p.tarjeta_debito;
            if (input.payment_method === 'pse') return !p.pse_wompi;
            return false;
          }).map(([n]) => `${n} NO acepta ${input.payment_method}`);
      }
      return JSON.stringify({ datos_historicos: rows, validaciones: validation, formula: 'score = 0.7×(pedidos/max_ciudad) + 0.3×tasa_entrega; ciudad <60% entrega = ROJA (no despachar)' });
    } catch (e) {
      return JSON.stringify({ error: e.message, kb: kbSummary() });
    }
  }
  if (name === 'draft_whatsapp') {
    return 'GENERAR_DIRECTO'; // el modelo redacta con su propio criterio + system prompt
  }
  return 'Herramienta desconocida';
}

const SYSTEM = `Eres ZYNEX Agent, el copiloto logístico COD experto en LATAM (Colombia, Ecuador, Chile, Panamá, Guatemala, México — países Dropi).
Conoces las condiciones reales de cada transportadora, el semáforo de ciudades y el manual de novedades.
Reglas:
- Responde en español directo y accionable. Nada de relleno.
- Usa las herramientas siempre que la pregunta involucre transportadoras, ciudades, novedades o valores COD.
- Si una ciudad está en rojo (<60% entrega), recomienda NO despachar y dilo claramente.
- Valida SIEMPRE tope de recaudo y método de pago antes de recomendar transportadora.
- Mensajes WhatsApp: tono colombiano cercano, cortos, sin sonar a robot.
Resumen KB:\n${kbSummary()}`;


// Fase A1: skills dinámicas desde el registro zynex_skills
async function loadSkills() {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    const r = await fetch(`${SB_URL}/rest/v1/zynex_skills?active=eq.true&select=slug,name,system_prompt`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!r.ok) return '';
    const rows = await r.json();
    return rows.map(x => `\n[${x.name}] ${x.system_prompt}`).join('');
  } catch { return ''; }
}

// Fase A2: memoria — persistir conversación en chat_sessions (fire and forget)
async function saveMemory(userId, messages, reply) {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!key) return;
    await fetch(`${SB_URL}/rest/v1/chat_sessions`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: userId, model: 'zynex-agent', title: (messages[0]?.content || 'chat').slice(0, 80),
        messages: [...messages, { role: 'assistant', content: reply }], msg_count: messages.length + 1 })
    });
  } catch {}
}

// Núcleo reutilizable del agente (lo usa /api/agent y /api/brain)
export async function runZynexAgent(messages, authToken) {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY no configurada');
  const skills = await loadSkills();
  const convo = messages.map(m => ({ role: m.role, content: m.content }));
  const toolCalls = [];
  for (let turn = 0; turn < 6; turn++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 3000, system: SYSTEM + '\n\nSKILLS ACTIVAS:' + skills, tools: TOOLS, messages: convo }),
    });
    if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    if (d.stop_reason === 'tool_use') {
      convo.push({ role: 'assistant', content: d.content });
      const results = [];
      for (const block of d.content.filter(b => b.type === 'tool_use')) {
        const out = await runTool(block.name, block.input, authToken);
        toolCalls.push({ tool: block.name, input: block.input });
        results.push({ type: 'tool_result', tool_use_id: block.id, content: out });
      }
      convo.push({ role: 'user', content: results });
      continue;
    }
    const text = d.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    return { text, tools_used: toolCalls };
  }
  return { text: 'El agente alcanzó el límite de pasos. Reformula la pregunta.', tools_used: toolCalls };
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Token inválido o ausente' });
  const quota = await consumeAIQuota(user.id);
  if (!quota.ok) return res.status(quota.code || 429).json({ error: quota.error });

  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' });

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages[] requerido' });

  const authToken = (req.headers.authorization || '').replace('Bearer ', '').trim();
  try {
    const out = await runZynexAgent(messages, authToken);
    saveMemory(user.id, messages, out.text); // no bloquea la respuesta
    return res.status(200).json({ ...out, quota_remaining: quota.remaining });
  } catch (err) {
    console.error('[agent.js]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
