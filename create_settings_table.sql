-- Crear tabla de configuraciones
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar configuración inicial
INSERT INTO settings (key, value) VALUES ('bracket_visible', 'false');

-- Habilitar RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer
CREATE POLICY "Public read settings" ON settings
  FOR SELECT USING (true);

-- Política: Solo admin puede escribir
CREATE POLICY "Admin write settings" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
