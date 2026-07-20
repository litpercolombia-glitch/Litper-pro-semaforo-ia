// api/inbox.js — BANDEJA ZYAN: motor replicable de acciones agénticas
// Patrón agent-inbox (investigación 2026): cada evento llega con acción propuesta + por qué,
// y el humano decide: aprobar | editar | ignorar. Riesgo bajo + autonomía 'auto' = se ejecuta solo.
// GET  /api/inbox            → items pendientes
// POST /api/inbox {op:'decidir', id, decision:'aprobar'|'editar'|'ignorar', final_action?}
// POST /api/inbox {op:'generar', novedades:[{guia, transportadora, novedad, ciudad, cliente?}]}
import { setCors, verifyUser } from './_lib.js';
import { runZynexAgent } from './agent.js';

const SB_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';

function sb(headersAuth) {
  const key = process.env.SUPABASE_ANON_KEY || '';
  return {
    async q(path, opts = {}) {
      const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
        ...opts,
        headers: { apikey: key, Authorization: headersAuth, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opts.headers || {}) }
      });
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.status === 204 ? null : r.json();
    }
  };
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Token inválido o ausente' });
  const auth = req.headers.authorization;
  const db = sb(auth);

  try {
    // ── LISTAR bandeja ──
    if (req.method === 'GET') {
      const items = await db.q('zynex_inbox?status=eq.pendiente&order=created_at.desc&limit=30');
      return res.status(200).json({ items });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { op } = req.body || {};

    // ── DECIDIR: aprobar | editar | ignorar ──
    if (op === 'decidir') {
      const { id, decision, final_action, lesson } = req.body;
      const map = { aprobar: 'aprobada', editar: 'editada', ignorar: 'ignorada' };
      if (!map[decision]) return res.status(400).json({ error: 'decision inválida' });
      await db.q(`zynex_inbox?id=eq.${Number(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: map[decision], final_action: final_action || null, decided_by: user.id, decided_at: new Date().toISOString() })
      });
      // MEMORIA: si el humano editó, Zyan aprende (anti learning-gap)
      if (decision === 'editar' && (final_action || lesson)) {
        await db.q('zynex_memory', {
          method: 'POST',
          body: JSON.stringify({ kind: 'correccion', lesson: lesson || `El usuario prefirió: "${(final_action || '').slice(0, 300)}"`, source_inbox_id: Number(id) })
        });
      }
      return res.status(200).json({ ok: true, status: map[decision] });
    }

    // ── GENERAR: Zyan procesa novedades y llena la bandeja con acciones propuestas ──
    if (op === 'generar') {
      const { novedades } = req.body;
      if (!Array.isArray(novedades) || !novedades.length) return res.status(400).json({ error: 'novedades[] requerido' });
      const authToken = (auth || '').replace('Bearer ', '').trim();
      const created = [];
      for (const n of novedades.slice(0, 10)) {
        const prompt = `Novedad COD a resolver. Guía: ${n.guia || 's/n'} · Transportadora: ${n.transportadora || '?'} · Ciudad: ${n.ciudad || '?'} · Novedad: "${n.novedad}"${n.cliente ? ` · Cliente: ${n.cliente}` : ''}.
Responde SOLO este JSON (sin markdown): {"titulo":"...","accion_propuesta":"texto WhatsApp o acción concreta lista para ejecutar","tipo":"whatsapp|reasignar_carrier|escalar|oficina","por_que":"1 frase citando el significado oficial de la novedad y la regla aplicada","riesgo":"bajo|medio|alto"}`;
        const out = await runZynexAgent([{ role: 'user', content: prompt }], authToken);
        let plan;
        try { plan = JSON.parse(out.text.replace(/```json|```/g, '').trim()); }
        catch { plan = { titulo: `Novedad guía ${n.guia || ''}: ${String(n.novedad).slice(0, 60)}`, accion_propuesta: out.text.slice(0, 600), tipo: 'whatsapp', por_que: 'Análisis de Zyan con herramientas', riesgo: 'medio' }; }
        const [row] = await db.q('zynex_inbox', {
          method: 'POST',
          body: JSON.stringify({
            source: 'novedad', title: plan.titulo, context: n,
            proposed_action: plan.accion_propuesta, action_type: plan.tipo || 'whatsapp',
            why: plan.por_que, risk: plan.riesgo || 'medio'
          })
        });
        created.push(row);
      }
      return res.status(200).json({ ok: true, created: created.length, items: created });
    }
    return res.status(400).json({ error: 'op inválida (decidir|generar)' });
  } catch (e) {
    console.error('[inbox.js]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
