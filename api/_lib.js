// api/_lib.js — ZYNEX shared helpers (no se expone como endpoint)
const SB_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
const SB_ANON = process.env.SUPABASE_ANON_KEY || '';
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function setCors(res, origin) {
  const list = (process.env.ALLOWED_ORIGINS || 'https://litper-semaforo.vercel.app,https://litperpro.com')
    .split(',').map(o => o.trim()).filter(Boolean);
  const allowed = list.find(o => origin && origin.startsWith(o));
  if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Verifica JWT y devuelve el user (o null)
export async function verifyUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token || !SB_ANON) return null;
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SB_ANON }
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// Verifica y descuenta quota de IA SERVER-SIDE (service role).
// Devuelve {ok:true} o {ok:false, error}
export async function consumeAIQuota(userId) {
  if (!SB_SERVICE) return { ok: true, warn: 'service key no configurada — quota no aplicada' };
  const h = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' };
  try {
    // org del usuario
    const pr = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${userId}&select=org_id`, { headers: h });
    const prof = (await pr.json())[0];
    if (!prof?.org_id) return { ok: false, error: 'Perfil sin organización' };
    const or_ = await fetch(`${SB_URL}/rest/v1/organizations?id=eq.${prof.org_id}&select=ai_used,ai_quota,plan`, { headers: h });
    const org = (await or_.json())[0];
    if (!org) return { ok: false, error: 'Organización no encontrada' };
    if ((org.ai_used || 0) >= (org.ai_quota || 0)) {
      return { ok: false, error: `Límite de IA alcanzado (${org.ai_quota} este mes). Mejora tu plan en /pricing.`, code: 402 };
    }
    await fetch(`${SB_URL}/rest/v1/organizations?id=eq.${prof.org_id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ ai_used: (org.ai_used || 0) + 1 })
    });
    return { ok: true, remaining: (org.ai_quota - org.ai_used - 1) };
  } catch (e) {
    return { ok: false, error: 'Error verificando quota: ' + e.message };
  }
}

// Llamadas a modelos — SOLO con env vars, sin fallbacks hardcodeados
export async function callGemini(prompt, sys) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY no configurada');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: Array.isArray(prompt) ? prompt : [{ parts: [{ text: prompt }] }],
      systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: respuesta vacía');
  return text;
}

export async function callGroq(messages, sys) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY no configurada');
  const msgs = [];
  if (sys) msgs.push({ role: 'system', content: sys });
  (Array.isArray(messages) ? messages : [{ role: 'user', content: messages }])
    .forEach(m => msgs.push({ role: m.role, content: m.content }));
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: 2048, temperature: 0.7 }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  return (await r.json()).choices?.[0]?.message?.content || '';
}
