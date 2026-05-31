-- Tournament Engine Tables

-- qualified_teams: stores manually assigned slots (A1, B2, BEST3_1, etc.)
CREATE TABLE IF NOT EXISTS qualified_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    league_id UUID NOT NULL,
    stage VARCHAR(100) NOT NULL,
    slot_code VARCHAR(50) NOT NULL,
    team_id UUID REFERENCES teams(id),
    UNIQUE(league_id, stage, slot_code)
);

-- knockout_templates: defines bracket structure dynamically
CREATE TABLE IF NOT EXISTS knockout_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    league_id UUID NOT NULL,
    stage VARCHAR(100) NOT NULL,
    match_order INTEGER NOT NULL,
    home_slot VARCHAR(50) NOT NULL,
    away_slot VARCHAR(50) NOT NULL,
    UNIQUE(league_id, stage, match_order)
);

-- Add home_slot/away_slot to matches if not exists
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_slot VARCHAR(50);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_slot VARCHAR(50);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qualified_teams_lookup ON qualified_teams(league_id, stage, slot_code);
CREATE INDEX IF NOT EXISTS idx_knockout_templates_lookup ON knockout_templates(league_id, stage);
CREATE INDEX IF NOT EXISTS idx_matches_knockout ON matches(league_id, stage);

-- RLS Policies
ALTER TABLE qualified_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_templates ENABLE ROW LEVEL SECURITY;

-- Admin can manage qualified_teams
CREATE POLICY "Admins can manage qualified_teams" ON qualified_teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admin can manage knockout_templates
CREATE POLICY "Admins can manage knockout_templates" ON knockout_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Public read access for both tables
CREATE POLICY "Public read qualified_teams" ON qualified_teams FOR SELECT USING (true);
CREATE POLICY "Public read knockout_templates" ON knockout_templates FOR SELECT USING (true);