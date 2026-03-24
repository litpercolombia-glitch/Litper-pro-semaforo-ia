-- ══════════════════════════════════════════════════════════════
-- LITPERPRO — Migración 002: RLS Granular por Rol
-- Reemplaza políticas simples "own org" con control por rol:
--   viewer: solo SELECT
--   editor: SELECT + INSERT + UPDATE
--   admin:  SELECT + INSERT + UPDATE + DELETE
-- ══════════════════════════════════════════════════════════════

-- Helper function to get current user's role in their org
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── UPLOADS ─────────────────────────────────────────────────

-- Drop existing simple policies if they exist
DROP POLICY IF EXISTS "Users can view own org uploads" ON uploads;
DROP POLICY IF EXISTS "Users can insert own org uploads" ON uploads;
DROP POLICY IF EXISTS "Users can update own org uploads" ON uploads;
DROP POLICY IF EXISTS "Users can delete own org uploads" ON uploads;
DROP POLICY IF EXISTS "own_org" ON uploads;

-- New role-based policies
CREATE POLICY "uploads_select" ON uploads FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "uploads_insert" ON uploads FOR INSERT
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() IN ('admin', 'editor'));

CREATE POLICY "uploads_update" ON uploads FOR UPDATE
  USING (org_id = get_user_org_id() AND get_user_role() IN ('admin', 'editor'));

CREATE POLICY "uploads_delete" ON uploads FOR DELETE
  USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ── CITY_STATS ──────────────────────────────────────────────

DROP POLICY IF EXISTS "own_org" ON city_stats;
DROP POLICY IF EXISTS "Users can view own org city_stats" ON city_stats;
DROP POLICY IF EXISTS "Users can insert own org city_stats" ON city_stats;
DROP POLICY IF EXISTS "Users can delete own org city_stats" ON city_stats;

CREATE POLICY "city_stats_select" ON city_stats FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "city_stats_insert" ON city_stats FOR INSERT
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() IN ('admin', 'editor'));

CREATE POLICY "city_stats_delete" ON city_stats FOR DELETE
  USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ── CARRIER_STATS ───────────────────────────────────────────

DROP POLICY IF EXISTS "own_org" ON carrier_stats;
DROP POLICY IF EXISTS "Users can view own org carrier_stats" ON carrier_stats;
DROP POLICY IF EXISTS "Users can insert own org carrier_stats" ON carrier_stats;
DROP POLICY IF EXISTS "Users can delete own org carrier_stats" ON carrier_stats;

CREATE POLICY "carrier_stats_select" ON carrier_stats FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "carrier_stats_insert" ON carrier_stats FOR INSERT
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() IN ('admin', 'editor'));

CREATE POLICY "carrier_stats_delete" ON carrier_stats FOR DELETE
  USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ── AI_ANALYSES ─────────────────────────────────────────────

DROP POLICY IF EXISTS "own_org" ON ai_analyses;
DROP POLICY IF EXISTS "Users can view own org ai_analyses" ON ai_analyses;
DROP POLICY IF EXISTS "Users can insert own org ai_analyses" ON ai_analyses;
DROP POLICY IF EXISTS "Users can delete own org ai_analyses" ON ai_analyses;

CREATE POLICY "ai_analyses_select" ON ai_analyses FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "ai_analyses_insert" ON ai_analyses FOR INSERT
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() IN ('admin', 'editor'));

CREATE POLICY "ai_analyses_delete" ON ai_analyses FOR DELETE
  USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ── CHAT_SESSIONS ───────────────────────────────────────────

DROP POLICY IF EXISTS "own_org" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view own org chat_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert own org chat_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own org chat_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own org chat_sessions" ON chat_sessions;

CREATE POLICY "chat_sessions_select" ON chat_sessions FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "chat_sessions_insert" ON chat_sessions FOR INSERT
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() IN ('admin', 'editor'));

CREATE POLICY "chat_sessions_update" ON chat_sessions FOR UPDATE
  USING (org_id = get_user_org_id() AND get_user_role() IN ('admin', 'editor'));

CREATE POLICY "chat_sessions_delete" ON chat_sessions FOR DELETE
  USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ── PROFILES (users can update their own profile) ───────────

DROP POLICY IF EXISTS "own_profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ── ORGANIZATIONS (only admins can update) ──────────────────

DROP POLICY IF EXISTS "own_org" ON organizations;
DROP POLICY IF EXISTS "Users can view own org" ON organizations;
DROP POLICY IF EXISTS "Users can update own org" ON organizations;

CREATE POLICY "organizations_select" ON organizations FOR SELECT
  USING (id = get_user_org_id());

CREATE POLICY "organizations_update" ON organizations FOR UPDATE
  USING (id = get_user_org_id() AND get_user_role() = 'admin');
