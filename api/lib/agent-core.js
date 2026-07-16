// Litper AgentCore — runtime mínimo para agentes serverless
// Patrón: cada agente es una función que recibe contexto, usa herramientas y persiste estado

const SB_URL  = 'https://gtsivwbnhcawvmsfujby.supabase.co';
const SB_KEY  = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Supabase helper (service role — acceso full, bypasa RLS) ──────────────────
async function db(path, method = 'GET', body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY(),
      'Authorization': `Bearer ${SB_KEY()}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`DB ${method} ${path}: ${r.status} ${t.slice(0,200)}`);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json')) return r.json();
  return null;
}

// ── AgentRun: contexto de una ejecución ──────────────────────────────────────
export class AgentRun {
  constructor(agentName, orgId, triggeredBy = 'manual') {
    this.id        = crypto.randomUUID();
    this.agentName = agentName;
    this.orgId     = orgId;
    this.triggeredBy = triggeredBy;
    this.startedAt = Date.now();
    this.tokens    = 0;
  }

  async start(input = {}) {
    await db('agent_runs', 'POST', {
      id: this.id, org_id: this.orgId, agent_name: this.agentName,
      status: 'running', input, triggered_by: this.triggeredBy,
    });
    await this.log('start', { input });
    return this;
  }

  async log(eventType, payload = {}) {
    await db('agent_events', 'POST', {
      org_id: this.orgId, agent_name: this.agentName,
      run_id: this.id, event_type: eventType, payload,
    });
  }

  async complete(output = {}) {
    const duration = Date.now() - this.startedAt;
    await db(`agent_runs?id=eq.${this.id}`, 'PATCH', {
      status: 'completed', output, tokens_used: this.tokens,
      duration_ms: duration, completed_at: new Date().toISOString(),
    });
    await this.log('complete', { output, duration_ms: duration });
    return output;
  }

  async fail(error) {
    const duration = Date.now() - this.startedAt;
    await db(`agent_runs?id=eq.${this.id}`, 'PATCH', {
      status: 'failed', output: { error: error.message },
      duration_ms: duration, completed_at: new Date().toISOString(),
    });
    await this.log('error', { message: error.message });
  }

  async pendingHuman(reason) {
    await db(`agent_runs?id=eq.${this.id}`, 'PATCH', { status: 'pending_human' });
    await this.log('decision', { requires_human: true, reason });
  }
}

// ── LLM call con tracking de tokens ─────────────────────────────────────────
export async function llmCall(run, prompt, systemPrompt) {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!key) throw new Error('CLAUDE_API_KEY no configurada');

  await run.log('tool_call', { tool: 'llm', model: 'claude-haiku-4-5-20251001' });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', // Haiku: barato para decisiones del agente
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!r.ok) throw new Error(`LLM ${r.status}`);
  const data = await r.json();
  run.tokens += (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return data.content?.[0]?.text || '';
}

export { db };
