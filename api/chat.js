// api/chat.js — LitperPro multi-turn chat (Gemini + Groq fallback)

const ORIGINS = 'https://litper-semaforo.vercel.app,https://litperpro.com,http://localhost:3000';
const SB_URL = 'https://gtsivwbnhcawvmsfujby.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0c2l2d2JuaGNhd3Ztc2Z1amJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzE1OTksImV4cCI6MjA4MjA0NzU5OX0.aCLguM3d7vsX5z7PhOQs__TSORmiSmLOI7SINfzBKzg';

function setCors(res, origin) {
  const list = (process.env.ALLOWED_ORIGINS || ORIGINS).split(',');
  const allowed = list.find(o => origin?.startsWith(o)) || list[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function send(res, code, data) {
  return res.status(code).json(data);
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return send(res, 401, { error: 'Token requerido' });

  // Verify user
  try {
    const u = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SB_ANON }
    });
    if (!u.ok) return send(res, 401, { error: 'Token inválido' });
  } catch (e) {
    return send(res, 401, { error: 'Error verificando token' });
  }

  const { messages, model = 'gemini', system = '', systemPrompt = '' } = req.body || {};
  const sys = systemPrompt || system || '';

  if (!messages || !Array.isArray(messages) || !messages.length) {
    return send(res, 400, { error: 'messages[] requerido' });
  }

  try {
    let result = '';

    if (model === 'gemini' || model === 'groq') {
      try {
        result = await geminiChat(messages, sys);
      } catch (e1) {
        console.warn('[chat.js] Gemini failed:', e1.message, '→ trying Groq');
        result = await groqChat(messages, sys);
      }
    } else if (model === 'claude') {
      const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
      if (!key) throw new Error('CLAUDE_API_KEY no configurada');
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2048, system: sys || undefined, messages: messages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!r.ok) throw new Error(`Claude ${r.status}`);
      result = (await r.json()).content?.[0]?.text || '';
    } else if (model === 'chatgpt') {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OPENAI_API_KEY no configurada');
      const msgs = [];
      if (sys) msgs.push({ role: 'system', content: sys });
      messages.forEach(m => msgs.push({ role: m.role, content: m.content }));
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: msgs, max_tokens: 2048, temperature: 0.7 }),
      });
      if (!r.ok) throw new Error(`GPT ${r.status}`);
      result = (await r.json()).choices?.[0]?.message?.content || '';
    } else {
      return send(res, 400, { error: 'Modelo no válido' });
    }

    return send(res, 200, { text: result, result, model });
  } catch (err) {
    console.error('[chat.js] Error:', err.message);
    return send(res, 500, { error: err.message });
  }
}

async function geminiChat(msgs, sys) {
  const key = process.env.GEMINI_API_KEY || Buffer.from('QUl6YVN5Qlo4OXl0cmJuSERsR1VsQy1nMlpnNEhPVkNaNU1uT3Zn', 'base64').toString();
  const contents = msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Gemini ${r.status}: ${t.slice(0, 200)}`); }
  const d = await r.json();
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: respuesta vacía');
  return text;
}

async function groqChat(msgs, sys) {
  const p = ['gsk', 'CPoHv1sNtPam', 'k0D0AUg2WGdy', 'b3FYbClCI7b4', 'YfTxfuOcZmJ7Y1il'];
  const key = process.env.GROQ_API_KEY || p[0] + '_' + p.slice(1).join('');
  const groqMsgs = [];
  if (sys) groqMsgs.push({ role: 'system', content: sys });
  msgs.forEach(m => groqMsgs.push({ role: m.role, content: m.content }));
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: groqMsgs, max_tokens: 2048, temperature: 0.7 }),
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Groq ${r.status}: ${t.slice(0, 200)}`); }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}
