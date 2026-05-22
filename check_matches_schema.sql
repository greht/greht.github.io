-- Ver estructura actual de la tabla matches
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'matches'
ORDER BY ordinal_position;

-- Ver constraints (CHECK, FK, etc)
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_def
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'matches';

-- Ver si hay columnas que faltan
SELECT column_name FROM information_schema.columns
WHERE table_name = 'matches'
  AND column_name IN ('home_score', 'away_score', 'status', 'match_date', 'home_team_id', 'away_team_id', 'group_id');
