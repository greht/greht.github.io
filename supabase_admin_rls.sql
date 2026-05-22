-- ============================================
-- RLS POLICIES PARA matches, teams, groups
-- ============================================

-- Habilitar RLS en tablas
ALTER TABLE IF EXISTS matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS groups ENABLE ROW LEVEL SECURITY;

-- =====================
-- MATCHES
-- =====================
DROP POLICY IF EXISTS "authenticated_select_matches" ON matches;
CREATE POLICY "authenticated_select_matches" ON matches
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admin_insert_matches" ON matches;
CREATE POLICY "admin_insert_matches" ON matches
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "admin_update_matches" ON matches;
CREATE POLICY "admin_update_matches" ON matches
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "admin_delete_matches" ON matches;
CREATE POLICY "admin_delete_matches" ON matches
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================
-- TEAMS
-- =====================
DROP POLICY IF EXISTS "authenticated_select_teams" ON teams;
CREATE POLICY "authenticated_select_teams" ON teams
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admin_all_teams" ON teams;
CREATE POLICY "admin_all_teams" ON teams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================
-- GROUPS
-- =====================
DROP POLICY IF EXISTS "authenticated_select_groups" ON groups;
CREATE POLICY "authenticated_select_groups" ON groups
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admin_all_groups" ON groups;
CREATE POLICY "admin_all_groups" ON groups
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================
-- PREDICTIONS (admin)
-- =====================
DROP POLICY IF EXISTS "admin_all_predictions" ON predictions;
CREATE POLICY "admin_all_predictions" ON predictions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================
-- PROFILES (admin update/insert para puntos)
-- =====================
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "admin_insert_profiles" ON profiles;
CREATE POLICY "admin_insert_profiles" ON profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================
-- VERIFICAR POLÍTICAS CREADAS
-- ============================================
SELECT tablename, policyname, cmd
FROM pg_policies
ORDER BY tablename, policyname;
