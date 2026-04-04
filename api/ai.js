// ══════════════════════════════════════════════════════════════
// LITPERPRO — Vercel Serverless Function: AI Proxy
// Moves API keys to server side for security
// Models: Claude Sonnet 4.6, Gemini 2.0 Flash, GPT-4o
// ══════════════════════════════════════════════════════════════

const LITPER_SYSTEM_PROMPT = `Eres un analista logístico senior de LitperPro. Analizas datos COD (Cash on Delivery) de carriers en LATAM.
- Responde siempre en español
- Usa datos concretos y porcentajes
- El semáforo de ciudades: verde ≥80.5%, amarillo 70-79.9%, rojo <70%
- CPA logístico = $15,000 COP / tasa_de_entrega
- Sé directo, sin rodeos, accionable
- Carriers principales: Coordinadora, Interrapidísimo, TCC, Envía`;

export default async function handler(req, res) {
  // CORS headers — restrict to same origin (Vercel serves both frontend and API)
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, prompt, context, max_tokens = 4096 } = req.body;

  if (!model || !prompt) {
    return res.status(400).json({ error: 'Missing model or prompt' });
  }

  // Validate auth token from Supabase
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
  }

  // Verify JWT against Supabase
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
  const token = authHeader.replace('Bearer ', '');
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión de nuevo.' });
    }
  } catch (e) {
    return res.status(401).json({ error: 'No se pudo verificar el token.' });
  }

  try {
    let text = '';
    let usage = null;

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
            systemInstruction: { parts: [{ text: LITPER_SYSTEM_PROMPT }] },
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
          model: 'claude-sonnet-4-6',
          max_tokens,
          thinking: { type: 'adaptive' },
          system: [
            {
              type: 'text',
              text: LITPER_SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const d = await r.json();
      if (d.error) throw new Error('Claude: ' + d.error.message);
      // Extract text from content blocks (may contain thinking + text)
      const textBlock = d.content?.find(b => b.type === 'text');
      text = textBlock?.text || 'Sin respuesta.';
      usage = d.usage ? {
        input_tokens: d.usage.input_tokens,
        output_tokens: d.usage.output_tokens,
        cache_read: d.usage.cache_read_input_tokens || 0
      } : null;

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
          messages: [
            { role: 'system', content: LITPER_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ]
        })
      });
      const d = await r.json();
      if (d.error) throw new Error('OpenAI: ' + d.error.message);
      text = d.choices?.[0]?.message?.content || 'Sin respuesta.';

    } else {
      return res.status(400).json({ error: 'Modelo no soportado: ' + model });
    }

    return res.status(200).json({ text, model, ...(usage && { usage }) });

  } catch (e) {
    console.error('AI API error:', e);
    return res.status(500).json({ error: e.message || 'Error interno del servidor' });
  }
}
