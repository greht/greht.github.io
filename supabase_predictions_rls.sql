-- ============================================
-- HABILITAR RLS Y CREAR POLÍTICAS PARA predictions
-- ============================================

-- Habilitar RLS (si no está habilitado)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Política: usuario puede insertar sus propias predicciones
CREATE POLICY "users_insert_own_predictions" ON predictions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: usuario puede actualizar sus propias predicciones
CREATE POLICY "users_update_own_predictions" ON predictions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Política: usuario puede leer sus propias predicciones
CREATE POLICY "users_read_own_predictions" ON predictions
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
WHERE tablename = 'predictions'
ORDER BY policyname;
