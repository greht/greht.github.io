-- Verificar si los partidos de Eliminatoria de 32 tienen match_number asignado
SELECT match_number, bracket_position, home_slot, away_slot, stage
FROM matches 
WHERE league_id = '1ebd76d7-5839-4c80-a41a-554de1bb22f5'
ORDER BY stage, bracket_position;

-- Si los partidos no tienen match_number, asignarlos automáticamente
-- Eliminatoria de 32: partidos 73-88 (16 partidos)
UPDATE matches 
SET match_number = 72 + bracket_position
WHERE stage = 'Eliminatoria de 32'
AND league_id = '1ebd76d7-5839-4c80-a41a-554de1bb22f5'
AND match_number IS NULL;

-- Octavos de final: partidos 89-96 (8 partidos)
UPDATE matches 
SET match_number = 88 + bracket_position
WHERE stage = 'Octavos de final'
AND league_id = '1ebd76d7-5839-4c80-a41a-554de1bb22f5'
AND match_number IS NULL;

-- Cuartos de final: partidos 97-100 (4 partidos)
UPDATE matches 
SET match_number = 96 + bracket_position
WHERE stage = 'Cuartos de final'
AND league_id = '1ebd76d7-5839-4c80-a41a-554de1bb22f5'
AND match_number IS NULL;

-- Semifinal: partidos 101-102 (2 partidos)
UPDATE matches 
SET match_number = 100 + bracket_position
WHERE stage = 'Semifinal'
AND league_id = '1ebd76d7-5839-4c80-a41a-554de1bb22f5'
AND match_number IS NULL;

-- Eliminatoria por el 3er lugar: partido 103 (1 partido)
UPDATE matches 
SET match_number = 103
WHERE stage = 'Eliminatoria por el 3er lugar'
AND league_id = '1ebd76d7-5839-4c80-a41a-554de1bb22f5'
AND match_number IS NULL;

-- Final: partido 104 (1 partido)
UPDATE matches 
SET match_number = 104
WHERE stage = 'Final'
AND league_id = '1ebd76d7-5839-4c80-a41a-554de1bb22f5'
AND match_number IS NULL;
