# Setup de Supabase para Student Helper

Este proyecto usa Supabase para almacenar los infogramas generados.

## Pasos para configurar Supabase

### 1. Crear un proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Guarda las credenciales que te da Supabase

### 2. Ejecutar el schema SQL

1. En el panel de Supabase, ve a **SQL Editor**
2. Copia el contenido del archivo `supabase-schema.sql`
3. Pégalo en el editor y ejecutalo
4. Esto creará la tabla `infogram_logs` con todos los índices y políticas necesarias

### 3. Configurar las variables de entorno

Agrega estas variables a tu archivo `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**Dónde encontrar estos valores:**
- Ve a tu proyecto en Supabase
- Click en el ícono de Settings (⚙️)
- Ve a **API** en el menú lateral
- Copia:
  - **Project URL** → `VITE_SUPABASE_URL`
  - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 4. Configurar en Vercel (para producción)

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las mismas variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Estructura de la tabla

La tabla `infogram_logs` almacena:

- `id`: UUID único
- `created_at`: Timestamp de creación
- `file_name`: Nombre del PDF procesado
- `title`: Título del infograma
- `summary`: Resumen del contenido
- `difficulty`: Nivel (Básico/Intermedio/Avanzado)
- `infogram_data`: JSON completo del infograma
- `sketch_image_data`: Imagen en base64

## Uso en el código

El servicio ya está integrado en `App.tsx`. Cada vez que se genera un infograma:

1. Se procesa el PDF con Gemini
2. Se genera la imagen del sketch notes
3. **Automáticamente** se guarda en Supabase
4. Si hay un error en Supabase, solo se loguea pero no bloquea la generación

## Ver los datos almacenados

Para ver los infogramas guardados:

1. Ve a Supabase Dashboard
2. Click en **Table Editor**
3. Selecciona la tabla `infogram_logs`
4. Verás todos los infogramas generados con sus imágenes

## Nota de seguridad

Las políticas RLS están configuradas para permitir:
- ✅ INSERT público (cualquiera puede crear infogramas)
- ✅ SELECT público (cualquiera puede leer infogramas)

Esto es adecuado para una app educativa pública. Si necesitas restringir el acceso, modifica las políticas en el archivo SQL.
