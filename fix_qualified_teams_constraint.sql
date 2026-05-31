-- Add unique constraint for qualified_teams if not exists
ALTER TABLE qualified_teams DROP CONSTRAINT IF EXISTS qualified_teams_league_stage_slot_key;
ALTER TABLE qualified_teams ADD CONSTRAINT qualified_teams_league_stage_slot_key UNIQUE (league_id, stage, slot_code);