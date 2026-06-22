ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_number INTEGER;

UPDATE matches SET match_number = sub.calculated_number
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            ORDER BY 
                CASE 
                    WHEN phase_id IS NULL THEN 0
                    ELSE COALESCE((SELECT display_order FROM phases WHERE id = matches.phase_id), 999)
                END,
                match_date
        ) as calculated_number
    FROM matches
) sub
WHERE matches.id = sub.id;
