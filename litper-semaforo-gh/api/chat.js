// ══════════════════════════════════════════════════════════════
// LITPERPRO — Vercel Serverless Function: Chat Proxy
// Multi-turn conversation + JWT validation + rate limiting + quota
// ══════════════════════════════════════════════════════════════

// In-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 15; // slightly higher for chat
const MAX_TOKENS_CAP = 2000;

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

async function validateToken(token) {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_SERVICE_KEY) return { valid: true, userId: 'unknown' };
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_SERVICE_KEY
    }
  });
  if (!r.ok) return { valid: false };
  const user = await r.json();
  return { valid: true, userId: user.id };
}

async function checkAndIncrementQuota(userId) {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_SERVICE_KEY) return { allowed: true };

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=org_id`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const profiles = await profileRes.json();
  if (!profiles?.length) return { allowed: false, reason: 'Perfil no encontrado' };
  const orgId = profiles[0].org_id;

  const orgRes = await fetch(
    `${SUPABASE_URL}/rest/v1/organizations?id=eq.${orgId}&select=ai_used,ai_quota,plan`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const orgs = await orgRes.json();
  if (!orgs?.length) return { allowed: false, reason: 'Organización no encontrada' };
  const org = orgs[0];

  if (org.plan === 'enterprise') return { allowed: true, orgId };
  if (org.ai_used >= org.ai_quota) {
    return { allowed: false, reason: `Cuota de IA agotada (${org.ai_used}/${org.ai_quota}). Actualiza tu plan.` };
  }
  return { allowed: true, orgId, currentUsed: org.ai_used };
}

async function incrementUsage(orgId, currentUsed) {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_SERVICE_KEY || !orgId) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/organizations?id=eq.${orgId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ ai_used: (currentUsed || 0) + 1 })
    }
  );
}

export default async function handler(req, res) {
  // CORS — restrict to known origins
  const allowedOrigins = [
    'https://litpersemaforo.vercel.app',
    'https://asda3eeee.vercel.app',
    'http://localhost:3000'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth: Validate JWT ──────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const token = authHeader.replace('Bearer ', '');
  const auth = await validateToken(token);
  if (!auth.valid) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  // ── Rate Limiting ───────────────────────────────────────────
  if (!checkRateLimit(auth.userId)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
  }

  const { model, messages, system } = req.body;
  let max_tokens = Math.min(parseInt(req.body.max_tokens) || 700, MAX_TOKENS_CAP);

  if (!model || !messages) {
    return res.status(400).json({ error: 'Missing model or messages' });
  }

  // Validate messages array
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
    return res.status(400).json({ error: 'Messages debe ser un array de 1-50 mensajes' });
  }

  // ── Quota Check ─────────────────────────────────────────────
  const quota = await checkAndIncrementQuota(auth.userId);
  if (!quota.allowed) {
    return res.status(403).json({ error: quota.reason });
  }

  try {
    let text = '';

    if (model === 'gemini') {
      const GEMINI_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_KEY) return res.status(500).json({ error: 'Gemini key no configurada' });

      const contents = [];
      if (system) contents.push({ role: 'user', parts: [{ text: 'SISTEMA: ' + system }] });
      messages.forEach(m => {
        contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] });
      });

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: max_tokens, temperature: 0.7 } })
        }
      );
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      text = d.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta.';

    } else if (model === 'claude') {
      const CLAUDE_KEY = process.env.CLAUDE_API_KEY;
      if (!CLAUDE_KEY) return res.status(500).json({ error: 'Claude key no configurada' });

      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens,
          system: system || undefined,
          messages: messages.map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.content }))
        })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      text = d.content?.[0]?.text || 'Sin respuesta.';

    } else if (model === 'chatgpt') {
      const OPENAI_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_KEY) return res.status(500).json({ error: 'OpenAI key no configurada' });

      const gptMsgs = [];
      if (system) gptMsgs.push({ role: 'system', content: system });
      messages.forEach(m => {
        gptMsgs.push({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.content });
      });

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o', max_tokens, messages: gptMsgs })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      text = d.choices?.[0]?.message?.content || 'Sin respuesta.';

    } else {
      return res.status(400).json({ error: 'Modelo no soportado: ' + model });
    }

    // Increment AI usage after successful response
    await incrementUsage(quota.orgId, quota.currentUsed);

    return res.status(200).json({ text, model });

  } catch (e) {
    console.error('Chat API error:', e);
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
}
