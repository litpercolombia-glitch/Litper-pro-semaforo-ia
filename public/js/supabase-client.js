// ══════════════════════════════════════════════════════════════
// LITPERPRO — Supabase Client Module
// Shared across all pages. Load after supabase-js CDN.
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://gtsivwbnhcawvmsfujby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0c2l2d2JuaGNhd3Ztc2Z1amJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzE1OTksImV4cCI6MjA4MjA0NzU5OX0.aCLguM3d7vsX5z7PhOQs__TSORmiSmLOI7SINfzBKzg';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth Helpers ─────────────────────────────────────────────

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

async function getOrgId() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();
  return data?.org_id || null;
}

async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single();
  return data;
}

// Redirect to /login if not authenticated
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login';
    return null;
  }
  return session;
}

// Redirect to /dashboard if already authenticated (for login page)
async function redirectIfAuth() {
  const session = await getSession();
  if (session) {
    window.location.href = '/dashboard';
    return true;
  }
  return false;
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/login';
}

// ── Supabase Data Helpers ────────────────────────────────────

async function saveUpload(uploadData) {
  const orgId = await getOrgId();
  const user = await getUser();
  if (!orgId) return null;
  const { data, error } = await supabase
    .from('uploads')
    .insert({ ...uploadData, org_id: orgId, user_id: user.id })
    .select()
    .single();
  if (error) console.error('saveUpload error:', error);
  return data;
}

async function saveCityStats(uploadId, cities) {
  const orgId = await getOrgId();
  if (!orgId || !cities.length) return;
  const rows = cities.map(c => ({
    upload_id: uploadId,
    org_id: orgId,
    city: c[0],
    total: c[1],
    delivered: c[2],
    returned: c[3],
    rate: c[4],
    best_carrier: c[5] ? c[5][0] : null,
    carrier_breakdown: Object.fromEntries((c[6] || []).map(x => [x[0], { count: x[1], delivered: x[2], rate: x[3] }]))
  }));
  const { error } = await supabase.from('city_stats').insert(rows);
  if (error) console.error('saveCityStats error:', error);
}

async function saveCarrierStats(uploadId, carriers) {
  const orgId = await getOrgId();
  if (!orgId || !carriers.length) return;
  const rows = carriers.map(t => ({
    upload_id: uploadId,
    org_id: orgId,
    carrier: t.transportadora,
    total: t.total,
    delivered: t.entregados,
    returned: t.devoluciones,
    rate: t.tasa_entrega
  }));
  const { error } = await supabase.from('carrier_stats').insert(rows);
  if (error) console.error('saveCarrierStats error:', error);
}

async function saveAIAnalysis(analysisData) {
  const orgId = await getOrgId();
  const user = await getUser();
  if (!orgId) return null;
  const { data, error } = await supabase
    .from('ai_analyses')
    .insert({ ...analysisData, org_id: orgId, user_id: user.id })
    .select()
    .single();
  if (error) console.error('saveAIAnalysis error:', error);
  return data;
}

async function loadAIHistory(limit = 20) {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const { data } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

async function saveChatSession(sessionData) {
  const orgId = await getOrgId();
  const user = await getUser();
  if (!orgId) return null;
  if (sessionData.id) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ messages: sessionData.messages, msg_count: sessionData.msg_count, updated_at: new Date().toISOString() })
      .eq('id', sessionData.id)
      .select()
      .single();
    if (error) console.error('updateChatSession error:', error);
    return data;
  }
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ ...sessionData, org_id: orgId, user_id: user.id })
    .select()
    .single();
  if (error) console.error('saveChatSession error:', error);
  return data;
}

async function loadChatSessions(limit = 10) {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const { data } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data || [];
}

async function getLastUpload() {
  const orgId = await getOrgId();
  if (!orgId) return null;
  const { data } = await supabase
    .from('uploads')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function getUploadCities(uploadId) {
  const { data } = await supabase
    .from('city_stats')
    .select('*')
    .eq('upload_id', uploadId)
    .order('total', { ascending: false });
  return data || [];
}

async function getUploadCarriers(uploadId) {
  const { data } = await supabase
    .from('carrier_stats')
    .select('*')
    .eq('upload_id', uploadId)
    .order('total', { ascending: false });
  return data || [];
}

async function updateOrgPlan(plan, aiQuota) {
  const orgId = await getOrgId();
  if (!orgId) return null;
  const { data, error } = await supabase
    .from('organizations')
    .update({ plan, ai_quota: aiQuota })
    .eq('id', orgId)
    .select()
    .single();
  if (error) console.error('updateOrgPlan error:', error);
  return data;
}

async function updateProfile(updates) {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  if (error) console.error('updateProfile error:', error);
  return data;
}

async function incrementAIUsage() {
  const orgId = await getOrgId();
  if (!orgId) return;
  await supabase.rpc('increment_ai_used', { org: orgId }).catch(() => {
    // Fallback: manual increment
    supabase.from('organizations').select('ai_used').eq('id', orgId).single().then(({ data }) => {
      if (data) supabase.from('organizations').update({ ai_used: (data.ai_used || 0) + 1 }).eq('id', orgId);
    });
  });
}

async function checkAIQuota() {
  const orgId = await getOrgId();
  if (!orgId) return { allowed: false, used: 0, quota: 0 };
  const { data } = await supabase
    .from('organizations')
    .select('ai_used, ai_quota, plan')
    .eq('id', orgId)
    .single();
  if (!data) return { allowed: false, used: 0, quota: 0 };
  if (data.plan === 'enterprise') return { allowed: true, used: data.ai_used, quota: Infinity };
  return { allowed: data.ai_used < data.ai_quota, used: data.ai_used, quota: data.ai_quota };
}
