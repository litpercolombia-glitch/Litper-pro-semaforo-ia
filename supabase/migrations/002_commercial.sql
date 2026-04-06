-- ══════════════════════════════════════════════════════════════
-- LITPERPRO — COMMERCIAL LAUNCH MIGRATION v2.0
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ══════════════════════════════════════════════════════════════

-- ── ADD ONBOARDING FIELDS TO PROFILES ────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- ── ADD STRIPE FIELDS TO ORGANIZATIONS ───────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active','inactive','past_due','canceled','trialing')),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- ── CREATE auth_profiles VIEW (app uses this name) ───────────
-- The app code references 'auth_profiles' but the table is 'profiles'
CREATE OR REPLACE VIEW public.auth_profiles AS
  SELECT * FROM public.profiles;

-- Allow inserts/updates through the view
CREATE OR REPLACE RULE auth_profiles_insert AS ON INSERT TO public.auth_profiles
  DO INSTEAD INSERT INTO public.profiles VALUES (NEW.*);

CREATE OR REPLACE RULE auth_profiles_update AS ON UPDATE TO public.auth_profiles
  DO INSTEAD UPDATE public.profiles SET
    org_id = NEW.org_id,
    email = NEW.email,
    full_name = NEW.full_name,
    role = NEW.role,
    onboarding_completed = NEW.onboarding_completed,
    store_name = NEW.store_name,
    phone = NEW.phone,
    avatar_url = NEW.avatar_url
  WHERE id = OLD.id;

-- ── RLS for auth_profiles view ───────────────────────────────
-- Views inherit RLS from base table, so profiles RLS covers this

-- ── INCREMENT AI USED RPC (if not exists) ────────────────────
CREATE OR REPLACE FUNCTION public.increment_ai_used(org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.organizations
  SET ai_used = COALESCE(ai_used, 0) + 1
  WHERE id = org;
END;
$$;

-- ── UPDATE on_new_user TRIGGER to set trial ──────────────────
CREATE OR REPLACE FUNCTION public.on_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.organizations (name, slug, plan, ai_quota, subscription_status, trial_ends_at)
  VALUES (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    lower(replace(split_part(new.email,'@',1),' ','-')) || '-' || substr(new.id::text,1,6),
    'starter',
    10,
    'trialing',
    now() + interval '14 days'
  ) RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, org_id, email, full_name, role, onboarding_completed)
  VALUES (
    new.id,
    new_org_id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'admin',
    false
  );
  RETURN new;
END;
$$;
