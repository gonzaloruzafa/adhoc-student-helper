-- Drop existing policies and table
DROP POLICY IF EXISTS "Enable insert for all users" ON infogram_logs;
DROP POLICY IF EXISTS "Enable select for all users" ON infogram_logs;
DROP POLICY IF EXISTS "Enable update for all users" ON infogram_logs;
DROP TABLE IF EXISTS infogram_logs;

-- Create the table with mermaid_code instead of sketch_image_data
CREATE TABLE infogram_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  file_name TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  infogram_data TEXT NOT NULL, -- JSON completo del infograma
  mermaid_code TEXT NOT NULL    -- Código Mermaid.js generado por IA
);

-- Create indexes for performance
CREATE INDEX idx_infogram_logs_created_at ON infogram_logs(created_at DESC);
CREATE INDEX idx_infogram_logs_title ON infogram_logs(title);
CREATE INDEX idx_infogram_logs_difficulty ON infogram_logs(difficulty);

-- Enable RLS
ALTER TABLE infogram_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Enable insert for all users" ON infogram_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all users" ON infogram_logs FOR SELECT USING (true);
CREATE POLICY "Enable update for all users" ON infogram_logs FOR UPDATE USING (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL ON infogram_logs TO anon;
GRANT ALL ON infogram_logs TO authenticated;

-- Comments for documentation
COMMENT ON TABLE infogram_logs IS 'Logs de infogramas generados con IA usando Mermaid.js';
COMMENT ON COLUMN infogram_logs.mermaid_code IS 'Código Mermaid.js para renderizar el diagrama en el navegador';
