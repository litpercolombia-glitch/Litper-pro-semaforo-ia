// ══════════════════════════════════════════════════════════════
// LITPERPRO — Vercel Serverless Function: AI Proxy
// Server-side API keys + JWT validation + rate limiting + quota
// ══════════════════════════════════════════════════════════════

// In-memory rate limiter (resets on cold start, sufficient for abuse prevention)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per user
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
  if (!SUPABASE_SERVICE_KEY) {
    // Fallback: accept token if service key not configured (dev mode)
    return { valid: true, userId: 'unknown' };
  }
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
  if (!SUPABASE_SERVICE_KEY) return { allowed: true }; // dev mode

  // Get user's org
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=org_id`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const profiles = await profileRes.json();
  if (!profiles?.length) return { allowed: false, reason: 'Perfil no encontrado' };
  const orgId = profiles[0].org_id;

  // Get org quota
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
    return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
  }
  const token = authHeader.replace('Bearer ', '');
  const auth = await validateToken(token);
  if (!auth.valid) {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión de nuevo.' });
  }

  // ── Rate Limiting ───────────────────────────────────────────
  if (!checkRateLimit(auth.userId)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
  }

  const { model, prompt, context } = req.body;
  let max_tokens = Math.min(parseInt(req.body.max_tokens) || 1200, MAX_TOKENS_CAP);

  if (!model || !prompt) {
    return res.status(400).json({ error: 'Missing model or prompt' });
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
      if (!GEMINI_KEY) return res.status(500).json({ error: 'Gemini API key no configurada en el servidor' });

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: max_tokens }
          })
        }
      );
      const d = await r.json();
      if (d.error) throw new Error('Gemini: ' + d.error.message);
      text = d.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta.';

    } else if (model === 'claude') {
      const CLAUDE_KEY = process.env.CLAUDE_API_KEY;
      if (!CLAUDE_KEY) return res.status(500).json({ error: 'Claude API key no configurada en el servidor' });

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
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const d = await r.json();
      if (d.error) throw new Error('Claude: ' + d.error.message);
      text = d.content?.[0]?.text || 'Sin respuesta.';

    } else if (model === 'chatgpt') {
      const OPENAI_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_KEY) return res.status(500).json({ error: 'OpenAI API key no configurada en el servidor' });

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const d = await r.json();
      if (d.error) throw new Error('OpenAI: ' + d.error.message);
      text = d.choices?.[0]?.message?.content || 'Sin respuesta.';

    } else {
      return res.status(400).json({ error: 'Modelo no soportado: ' + model });
    }

    // Increment AI usage after successful response
    await incrementUsage(quota.orgId, quota.currentUsed);

    return res.status(200).json({ text, model });

  } catch (e) {
    console.error('AI API error:', e);
    return res.status(500).json({ error: e.message || 'Error interno del servidor' });
  }
}
