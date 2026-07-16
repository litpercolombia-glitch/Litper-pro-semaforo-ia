// api/chat.js — ZYNEX multi-turn chat
// Seguridad: sin API keys hardcodeadas; token verificado; quota descontada server-side.
import { setCors, verifyUser, consumeAIQuota, callGemini, callGroq } from './_lib.js';

export default async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Token inválido o ausente' });

  const quota = await consumeAIQuota(user.id);
  if (!quota.ok) return res.status(quota.code || 429).json({ error: quota.error });

  const { messages, model = 'gemini', system = '', systemPrompt = '' } = req.body || {};
  const sys = systemPrompt || system || '';
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages[] requerido' });
  }

  try {
    let result = '';
    if (model === 'claude') {
      const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
      if (!key) throw new Error('CLAUDE_API_KEY no configurada');
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2048, system: sys || undefined, messages: messages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!r.ok) throw new Error(`Claude ${r.status}`);
      result = (await r.json()).content?.[0]?.text || '';
    } else {
      try {
        const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        result = await callGemini(contents, sys);
      } catch (e1) { result = await callGroq(messages, sys); }
    }
    return res.status(200).json({ text: result, result, model, quota_remaining: quota.remaining });
  } catch (err) {
    console.error('[chat.js]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
