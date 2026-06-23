-- =====================================================================
-- Migración: Estado de equipos (eliminado / clasificado)
-- =====================================================================
-- Agrega columnas a la tabla `teams` para que el admin pueda marcar
-- manualmente si un equipo está eliminado o ya clasificado, y expone
-- una función helper que detecta equipos eliminados matemáticamente.
-- =====================================================================

-- 1. Columnas nuevas en `teams`
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS is_eliminated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_qualified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eliminated_at timestamptz,
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- 2. Comentarios
COMMENT ON COLUMN teams.is_eliminated IS 'Marca manual: el equipo ya no puede avanzar (aparece opaco en la tabla de grupos).';
COMMENT ON COLUMN teams.is_qualified IS 'Marca manual: el equipo ya está clasificado a la siguiente fase.';
COMMENT ON COLUMN teams.eliminated_at IS 'Fecha en que se marcó como eliminado.';
COMMENT ON COLUMN teams.qualified_at IS 'Fecha en que se marcó como clasificado.';
COMMENT ON COLUMN teams.updated_by IS 'Usuario admin que realizó la última modificación.';

-- 3. Función helper: ¿el equipo aún puede clasificar matemáticamente?
-- Asume formato FIFA estándar: grupos de 4, top 2 clasifican (p_advance = 2).
-- Devuelve TRUE si todavía tiene chance, FALSE si está matemáticamente fuera.
CREATE OR REPLACE FUNCTION can_team_still_qualify(
  p_team_id uuid,
  p_group_id uuid,
  p_advance int DEFAULT 2
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_played int;
  v_points int;
  v_max_remaining_matches int;
  v_best_possible_points int;
  v_second_place_floor int;
BEGIN
  -- 1) Estadísticas del equipo objetivo
  SELECT
    COUNT(*) FILTER (WHERE (home_team_id = p_team_id OR away_team_id = p_team_id) AND status = 'finished'),
    COALESCE(SUM(
      CASE
        WHEN home_team_id = p_team_id AND home_score > away_score THEN 3
        WHEN away_team_id = p_team_id AND away_score > home_score THEN 3
        WHEN home_score = away_score THEN 1
        ELSE 0
      END
    ), 0)
  INTO v_played, v_points
  FROM matches
  WHERE (home_team_id = p_team_id OR away_team_id = p_team_id)
    AND group_id = p_group_id;

  -- Si ya jugó todos los partidos del grupo (3) y no está en el top N, está fuera
  IF v_played >= 3 THEN
    -- Ver ranking actual
    WITH team_points AS (
      SELECT
        t.id,
        COALESCE(SUM(
          CASE
            WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 3
            WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 3
            WHEN m.home_score = m.away_score THEN 1
            ELSE 0
          END
        ), 0) AS pts
      FROM teams t
      LEFT JOIN matches m
        ON (m.home_team_id = t.id OR m.away_team_id = t.id)
        AND m.group_id = p_group_id
        AND m.status = 'finished'
      WHERE t.group_id = p_group_id
      GROUP BY t.id
    ),
    ranked AS (
      SELECT id, pts, ROW_NUMBER() OVER (ORDER BY pts DESC) AS pos
      FROM team_points
    )
    SELECT pos INTO v_second_place_floor
    FROM ranked WHERE id = p_team_id;

    RETURN COALESCE(v_second_place_floor, 99) <= p_advance;
  END IF;

  -- 2) Mejor caso posible del equipo objetivo
  v_max_remaining_matches := 3 - v_played;
  v_best_possible_points := v_points + (v_max_remaining_matches * 3);

  -- 3) Peor caso del equipo en puesto N (p_advance): asume que el resto gana todos
  --    y obtiene el mínimo de puntos posible para ese puesto
  WITH other_teams AS (
    SELECT t.id,
      COALESCE(SUM(
        CASE
          WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 3
          WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 3
          WHEN m.home_score = m.away_score THEN 1
          ELSE 0
        END
      ), 0) AS pts,
      COUNT(*) FILTER (WHERE (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.status = 'finished') AS played
    FROM teams t
    LEFT JOIN matches m
      ON (m.home_team_id = t.id OR m.away_team_id = t.id)
      AND m.group_id = p_group_id
      AND m.status = 'finished'
    WHERE t.group_id = p_group_id
      AND t.id != p_team_id
    GROUP BY t.id
  ),
  projection AS (
    -- Cada equipo rival mantiene sus puntos actuales (escenario conservador)
    -- Si el peor de ellos ya supera mi mejor caso, estoy eliminado
    SELECT pts FROM other_teams ORDER BY pts DESC OFFSET (p_advance - 1) LIMIT 1
  )
  SELECT COALESCE(MIN(pts), 0) INTO v_second_place_floor FROM projection;

  RETURN v_best_possible_points >= v_second_place_floor;
END;
$$;

-- 4. RLS: si la tabla teams ya tiene policies, aseguramos que el admin
--    pueda actualizar las nuevas columnas. (Ajustar según policies existentes)
-- DROP POLICY IF EXISTS "Admins can update team status" ON teams;
-- CREATE POLICY "Admins can update team status"
--   ON teams FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = 'c1015121-586e-4e53-9061-a3545e3e43d9')
--   WITH CHECK (auth.uid() = 'c1015121-586e-4e53-9061-a3545e3e43d9');

COMMENT ON FUNCTION can_team_still_qualify IS
  'Devuelve TRUE si el equipo todavía puede clasificar (top N del grupo). FALSE si está matemáticamente eliminado.';
