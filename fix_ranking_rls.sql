-- ============================================
-- FIX: Permitir lectura de predicciones para ranking
-- ============================================
-- Los usuarios autenticados necesitan leer todas las predicciones
-- para calcular aciertos exactos y goles acertados del ranking.

CREATE POLICY "authenticated_read_all_predictions" ON predictions
    FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- FIX: Permitir lectura de perfiles para ranking
-- ============================================
-- Los usuarios autenticados necesitan leer todos los perfiles
-- para mostrar la tabla de posiciones.

CREATE POLICY "authenticated_read_all_profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- VERIFICAR POLÍTICAS
-- ============================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('predictions', 'profiles')
ORDER BY tablename, policyname;
