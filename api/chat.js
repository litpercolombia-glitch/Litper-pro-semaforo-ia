// api/chat.js — LitperPro multi-turn chat proxy
// Fixed: rate limiting, removed hardcoded fallback, proper error handling

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://litperpro.com,https://www.litperpro.com').split(',');

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).set(headers).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).set(headers).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).set(headers).json({ error: 'Token requerido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).set(headers).json({ error: 'Configuración del servidor incompleta' });
  }

  // Verify JWT
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
  });

  if (!userRes.ok) {
    return res.status(401).set(headers).json({ error: 'Token inválido o expirado' });
  }

  const userData = await userRes.json();
  const userId = userData.id;

  // --- Rate limiting: check ai_quota ---
  const quotaRes = await fetch(
    `${SUPABASE_URL}/rest/v1/auth_profiles?user_id=eq.${userId}&select=ai_quota,ai_used`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!quotaRes.ok) {
    return res.status(500).set(headers).json({ error: 'Error verificando cuota' });
  }

  const quotaData = await quotaRes.json();
  const profile = quotaData[0];

  if (!profile) {
    return res.status(403).set(headers).json({ error: 'Perfil no encontrado' });
  }

  const { ai_quota, ai_used } = profile;
  if (ai_used >= ai_quota) {
    return res.status(429).set(headers).json({
      error: 'Cuota de IA agotada',
      quota: ai_quota,
      used: ai_used,
      message: 'Has alcanzado tu límite de consultas IA. Actualiza tu plan para continuar.',
    });
  }

  // --- Parse body ---
  // messages: [{role: 'user'|'assistant', content: string}]
  const { messages, model = 'gemini', systemPrompt = '' } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).set(headers).json({ error: 'messages[] requerido' });
  }

  let result = '';

  try {
    if (model === 'gemini') {
      const GEMINI_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY no configurada');

      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      );
      if (!geminiRes.ok) throw new Error(`Gemini error: ${geminiRes.status}`);
      const geminiData = await geminiRes.json();
      result = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    } else if (model === 'claude') {
      const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
      if (!CLAUDE_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');

      const claudeMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: systemPrompt || undefined,
          messages: claudeMessages,
        }),
      });
      if (!claudeRes.ok) throw new Error(`Claude error: ${claudeRes.status}`);
      const claudeData = await claudeRes.json();
      result = claudeData.content?.[0]?.text || '';

    } else if (model === 'chatgpt') {
      const OPENAI_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY no configurada');

      const gptMessages = [];
      if (systemPrompt) gptMessages.push({ role: 'system', content: systemPrompt });
      messages.forEach(m => gptMessages.push({ role: m.role, content: m.content }));

      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({ model: 'gpt-4o', messages: gptMessages, max_tokens: 2048, temperature: 0.7 }),
      });
      if (!gptRes.ok) throw new Error(`GPT error: ${gptRes.status}`);
      const gptData = await gptRes.json();
      result = gptData.choices?.[0]?.message?.content || '';

    } else {
      return res.status(400).set(headers).json({ error: 'Modelo no válido. Usa: gemini, claude, chatgpt' });
    }

    // Increment ai_used
    await fetch(
      `${SUPABASE_URL}/rest/v1/auth_profiles?user_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ ai_used: ai_used + 1 }),
      }
    );

    return res.status(200).set(headers).json({
      result,
      model,
      quota_remaining: ai_quota - ai_used - 1,
    });

  } catch (err) {
    console.error('[chat.js] Error:', err.message);
    return res.status(500).set(headers).json({ error: 'Error procesando chat', detail: err.message });
  }
}
