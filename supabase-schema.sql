-- Tabla para almacenar los infogramas generados
CREATE TABLE IF NOT EXISTS infogram_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  file_name TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  infogram_data TEXT NOT NULL, -- JSON completo del infograma
  sketch_image_data TEXT -- Base64 de la imagen generada
);

-- Índices para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_infogram_logs_created_at ON infogram_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_infogram_logs_title ON infogram_logs(title);
CREATE INDEX IF NOT EXISTS idx_infogram_logs_difficulty ON infogram_logs(difficulty);

-- Habilitar RLS (Row Level Security)
ALTER TABLE infogram_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERT a todos (anon y authenticated)
CREATE POLICY "Allow public insert" ON infogram_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Política para permitir SELECT a todos
CREATE POLICY "Allow public select" ON infogram_logs
  FOR SELECT
  TO public
  USING (true);

-- Comentarios para documentación
COMMENT ON TABLE infogram_logs IS 'Registro de infogramas educativos generados por la aplicación Student Helper';
COMMENT ON COLUMN infogram_logs.file_name IS 'Nombre del archivo PDF procesado';
COMMENT ON COLUMN infogram_logs.title IS 'Título del infograma generado';
COMMENT ON COLUMN infogram_logs.summary IS 'Resumen breve del contenido';
COMMENT ON COLUMN infogram_logs.difficulty IS 'Nivel de dificultad: Básico, Intermedio o Avanzado';
COMMENT ON COLUMN infogram_logs.infogram_data IS 'Datos completos del infograma en formato JSON';
COMMENT ON COLUMN infogram_logs.sketch_image_data IS 'Imagen del sketch notes en formato base64';
