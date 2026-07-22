// api/brain.js — ZYNEX BRAIN (Fase A3): punto de entrada unificado para TODAS las apps
// Autenticación por app: header 'x-zynex-key' contra ZYNEX_BRAIN_KEYS (coma-separadas en Vercel),
// o un JWT de usuario Supabase normal en Authorization.
import { setCors, verifyUser } from './_lib.js';
import { runZynexAgent } from './agent.js';

export default async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1) App autorizada por key (n8n, app escritorio, MCP, Sofía...)
  const appKey = (req.headers['x-zynex-key'] || '').toString().trim();
  const validKeys = (process.env.ZYNEX_BRAIN_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
  let authToken = null;

  // Keys creadas por usuarios en la pestaña Conexiones (tabla zynex_api_keys)
  let dbKeyOk = false;
  if (appKey && !validKeys.includes(appKey)) {
    try {
      const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
      if (svc) {
        const r = await fetch(`${url}/rest/v1/zynex_api_keys?api_key=eq.${encodeURIComponent(appKey)}&active=eq.true&select=id`, {
          headers: { apikey: svc, Authorization: `Bearer ${svc}` }
        });
        dbKeyOk = r.ok && (await r.json()).length > 0;
      }
    } catch (e) { console.warn('[brain] key lookup:', e.message); }
  }

  if (appKey && (validKeys.includes(appKey) || dbKeyOk)) {
    authToken = process.env.SUPABASE_SERVICE_ROLE_KEY; // acceso pleno del cerebro
  } else {
    // 2) Usuario humano con sesión Supabase
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: 'x-zynex-key inválida o token ausente' });
    authToken = (req.headers.authorization || '').replace('Bearer ', '').trim();
  }

  const { messages, message } = req.body || {};
  const msgs = Array.isArray(messages) && messages.length ? messages
    : message ? [{ role: 'user', content: String(message) }] : null;
  if (!msgs) return res.status(400).json({ error: 'messages[] o message requerido' });

  try {
    const out = await runZynexAgent(msgs, authToken);
    return res.status(200).json(out);
  } catch (err) {
    console.error('[brain.js]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
