-- Ver foreign keys de matches
SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'matches' AND tc.constraint_type = 'FOREIGN KEY';

-- Ver un match con sus equipos
SELECT m.id, m.home_team_id, m.away_team_id, t1.name as home, t2.name as away
FROM matches m
LEFT JOIN teams t1 ON m.home_team_id = t1.id
LEFT JOIN teams t2 ON m.away_team_id = t2.id
LIMIT 3;