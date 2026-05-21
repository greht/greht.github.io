-- Ver estructura de teams
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'teams' ORDER BY ordinal_position;

-- Ver estructura de groups
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'groups' ORDER BY ordinal_position;

-- Ver datos de ejemplo
SELECT m.id, m.home_team_id, m.away_team_id, m.match_date, m.group_id, m.status
FROM matches m LIMIT 5;