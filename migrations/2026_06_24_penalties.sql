-- Migración: agregar soporte para penales en partidos eliminatorios
-- Fecha: 2026-06-24
-- Descripción: cuando un partido eliminatorio queda empatado, debe poderse
--              registrar el resultado de la tanda de penales y forzar un ganador.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_penalties int,
  ADD COLUMN IF NOT EXISTS away_penalties int,
  ADD COLUMN IF NOT EXISTS went_to_penalties boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS winner_team_id uuid REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS idx_matches_winner_team_id ON matches(winner_team_id);

COMMENT ON COLUMN matches.home_penalties IS 'Penales convertidos por el equipo local (solo si went_to_penalties = true).';
COMMENT ON COLUMN matches.away_penalties IS 'Penales convertidos por el equipo visitante (solo si went_to_penalties = true).';
COMMENT ON COLUMN matches.went_to_penalties IS 'True si el partido se decidió por tanda de penales.';
COMMENT ON COLUMN matches.winner_team_id IS 'Ganador oficial del partido. En eliminatorias se utiliza para avanzar al siguiente partido cuando hubo empate.';

-- Restricción: si un partido finalizado fue a penales, debe existir winner_team_id
-- y los penales no pueden ser iguales.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_penalties_winner'
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT chk_penalties_winner
      CHECK (
        went_to_penalties = false
        OR (
          went_to_penalties = true
          AND winner_team_id IS NOT NULL
          AND home_penalties IS NOT NULL
          AND away_penalties IS NOT NULL
          AND home_penalties <> away_penalties
        )
      );
  END IF;
END
$$;
