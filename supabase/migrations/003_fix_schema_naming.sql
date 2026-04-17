-- Migration 003: Fix schema naming conflict between auth_profiles (001) and profiles (002)
-- 001 creates: public.auth_profiles
-- 002 tries to ALTER TABLE public.profiles (wrong name) then creates a VIEW auth_profiles
-- This migration resolves the conflict cleanly.

-- Step 1: Drop the broken VIEW created by 002 (if it exists)
DROP VIEW IF EXISTS public.auth_profiles CASCADE;

-- Step 2: Rename the real table to 'profiles' (standard name used by 002 logic)
-- Only rename if auth_profiles exists and profiles does NOT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'auth_profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.auth_profiles RENAME TO profiles;
    RAISE NOTICE 'Renamed auth_profiles to profiles';
  ELSE
    RAISE NOTICE 'Table profiles already exists or auth_profiles missing — skipping rename';
  END IF;
END $$;

-- Step 3: Fix RLS policies for the renamed table
-- Drop old policies (they may reference auth_profiles name internally)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Step 4: Recreate RLS policies on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');


-- Step 5: Fix the trigger function to insert into profiles (not auth_profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, plan, ai_quota, ai_used, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'free',
    50,   -- free plan default quota
    0,
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Step 6: Recreate trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Ensure organizations table has correct plan column referenced by stripe-webhook
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Step 8: Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON public.organizations(stripe_customer_id);

COMMENT ON TABLE public.profiles IS 'User profiles — renamed from auth_profiles (migration 003 fix)';
