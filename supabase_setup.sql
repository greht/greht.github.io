-- ============================================
-- VERIFICAR ESTRUCTURA DE TABLAS
-- ============================================

-- Verificar tabla profiles
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Verificar tabla user_consents
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_consents'
ORDER BY ordinal_position;

-- Verificar tabla consent_types
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'consent_types'
ORDER BY ordinal_position;

-- ============================================
-- HABILITAR RLS Y CREAR POLÍTICAS
-- ============================================

-- Habilitar RLS en profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: usuario puede insertar su propio perfil
CREATE POLICY "users_can_insert_own_profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: usuario puede leer su propio perfil
CREATE POLICY "users_read_own_profile" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política: usuario puede actualizar su propio perfil
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Habilitar RLS en user_consents
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Política: usuario puede insertar sus propios consentimientos
CREATE POLICY "users_can_insert_consents" ON user_consents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: usuario puede leer sus propios consentimientos
CREATE POLICY "users_read_own_consents" ON user_consents
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- VERIFICAR POLÍTICAS CREADAS
-- ============================================

SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'user_consents')
ORDER BY tablename;