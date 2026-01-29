-- Migration: Add admin features (roles, access control, maintenance mode, audit log)
-- Created: 2026-01-27

-- 1. Add admin fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'active' CHECK (access_mode IN ('active', 'ai_blocked', 'full_blocked')),
ADD COLUMN IF NOT EXISTS block_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
  );
$$;

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_access_mode ON profiles(access_mode);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 2. Create app_settings table (single row for global settings)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT,
  maintenance_allow_admin_bypass BOOLEAN NOT NULL DEFAULT true,
  maintenance_eta TIMESTAMPTZ,
  ai_provider_deepseek_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_provider_openrouter_enabled BOOLEAN NOT NULL DEFAULT true,
  generation_rate_limit_per_day INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
DO $$
DECLARE
  id_type text;
BEGIN
  SELECT c.data_type
  INTO id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'app_settings'
    AND c.column_name = 'id';

  IF id_type = 'integer' THEN
    EXECUTE 'INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING';
  ELSE
    EXECUTE 'INSERT INTO public.app_settings (id) VALUES (''00000000-0000-0000-0000-000000000001''::uuid) ON CONFLICT (id) DO NOTHING';
  END IF;
END $$;

-- 3. Create admin_invites table (for invite admin flow)
CREATE TABLE IF NOT EXISTS admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE admin_invites
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON admin_invites(email);
CREATE INDEX IF NOT EXISTS idx_admin_invites_expires ON admin_invites(expires_at);

-- 4. Create admin_audit_log table (track all admin actions)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., 'user.full_block', 'user.ai_block', 'maintenance.on', 'admin.invite'
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payload JSONB, -- Additional data about the action
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

-- 5. Fix critical RLS security issue: trips should NOT be visible to all authenticated users
-- Remove the dangerous policy that allows all authenticated users to see all trips
DROP POLICY IF EXISTS authenticated_view_all ON trips;

DROP POLICY IF EXISTS trips_admin_select ON trips;
CREATE POLICY trips_admin_select ON trips
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS trips_admin_update_any ON trips;
CREATE POLICY trips_admin_update_any ON trips
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Update RLS policies for profiles to allow admins to see all profiles

DROP POLICY IF EXISTS profiles_admin_select ON profiles;
CREATE POLICY profiles_admin_select ON profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS profiles_admin_update_any ON profiles;
CREATE POLICY profiles_admin_update_any ON profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. RLS for app_settings (read-only for all authenticated, write for admins only)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_read_all ON app_settings;
CREATE POLICY app_settings_read_all ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS app_settings_admin_update ON app_settings;
CREATE POLICY app_settings_admin_update ON app_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. RLS for admin_invites (admins only)
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_invites_admin_all ON admin_invites;
CREATE POLICY admin_invites_admin_all ON admin_invites
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. RLS for admin_audit_log (admins only)
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_audit_log_admin_all ON admin_audit_log;
CREATE POLICY admin_audit_log_admin_all ON admin_audit_log
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 10. Function to auto-upgrade user to admin when they accept invite
CREATE OR REPLACE FUNCTION handle_admin_invite_accept()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user logs in and their email matches an admin_invite, upgrade them
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM admin_invites 
    WHERE email = NEW.email 
    AND accepted_at IS NULL 
    AND expires_at > NOW()
  ) THEN
    UPDATE profiles 
    SET role = 'admin'
    WHERE id = NEW.id;
    
    UPDATE admin_invites
    SET accepted_at = NOW()
    WHERE email = NEW.email AND accepted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: when a profile is created (after user signup), check for admin invite
DROP TRIGGER IF EXISTS trigger_admin_invite_accept ON profiles;
CREATE TRIGGER trigger_admin_invite_accept
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_admin_invite_accept();

DROP TRIGGER IF EXISTS trigger_admin_invite_accept_email_update ON profiles;
CREATE TRIGGER trigger_admin_invite_accept_email_update
  AFTER UPDATE OF email ON profiles
  FOR EACH ROW
  WHEN (NEW.email IS DISTINCT FROM OLD.email)
  EXECUTE FUNCTION handle_admin_invite_accept();

-- 11. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for app_settings updated_at
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_invites TO authenticated;
GRANT SELECT, INSERT ON admin_audit_log TO authenticated;

COMMENT ON TABLE app_settings IS 'Global application settings (maintenance mode, feature flags)';
COMMENT ON TABLE admin_invites IS 'Pending admin invitations';
COMMENT ON TABLE admin_audit_log IS 'Audit log of all admin actions';
COMMENT ON COLUMN profiles.role IS 'User role: user, admin, or super_admin';
COMMENT ON COLUMN profiles.access_mode IS 'Access control: active, ai_blocked, or full_blocked';
