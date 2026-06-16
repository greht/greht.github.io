ALTER TABLE matches ADD COLUMN IF NOT EXISTS bracket_position INTEGER;

UPDATE matches SET bracket_position = sub.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY phase_id ORDER BY match_date) as rn
    FROM matches
    WHERE phase_id IS NOT NULL
) sub
WHERE matches.id = sub.id AND matches.bracket_position IS NULL;
