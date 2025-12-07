<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Adhoc Student Helper

Herramienta para generar infogramas educativos a partir de PDFs usando IA.

## 🎯 ¿Qué hace?

Sube un PDF (apuntes, papers, libros) y la IA genera un infograma visual y didáctico para ayudarte a entender el tema de manera clara y organizada.

## 🔒 Seguridad

Este proyecto implementa **protección de API keys** mediante Vercel Serverless Functions.

### ⚠️ IMPORTANTE

- ❌ **NUNCA** uses `VITE_GEMINI_API_KEY` en el frontend
- ✅ La API key de Gemini debe estar **SOLO en variables de entorno de Vercel**
- ✅ El frontend llama a `/api/generate-infogram` (tu servidor)
- ✅ Tu servidor llama a Gemini con la API key protegida

## 🚀 Configuración en Vercel

1. Ve a tu proyecto en Vercel → Settings → Environment Variables
2. Agrega la variable:
   ```
   GEMINI_API_KEY=tu_api_key_de_gemini
   ```
3. Asegúrate de que esté configurada para **Production**, **Preview** y **Development**
4. Redeploy tu aplicación

## 💻 Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz con:
   ```bash
   GEMINI_API_KEY=tu_api_key_de_gemini
   ```
   **NUNCA** comitees este archivo (ya está en `.gitignore`).

3. Run the app:
   ```bash
   npm run dev
   ```

## 🛡️ Protecciones Implementadas

- ✅ Rate limiting por IP (5 requests/minuto)
- ✅ Validación de tamaño de archivo (max 10MB)
- ✅ Logs de seguridad y monitoreo
- ✅ Validación de origen (CORS)
- ✅ API key protegida en el servidor (nunca expuesta al cliente)
