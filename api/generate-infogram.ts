import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

// Rate limiting: almacena timestamps de requests por IP
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 5; // 5 PDFs por minuto

interface InfogramResult {
  title: string;
  summary: string;
  mainConcepts: Array<{
    concept: string;
    explanation: string;
    example?: string;
  }>;
  visualElements: {
    diagram?: string;
    keyPoints: string[];
    connections: Array<{
      from: string;
      to: string;
      relationship: string;
    }>;
  };
  studyTips: string[];
  keyQuestions: string[];
  difficulty: "Básico" | "Intermedio" | "Avanzado";
}

// Función auxiliar para rate limiting
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestCounts.get(ip) || [];
  
  // Filtrar timestamps dentro de la ventana
  const recentRequests = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  // Agregar el timestamp actual
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  
  return true;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Obtener IP del cliente
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
             req.headers['x-real-ip']?.toString() || 
             'unknown';

  // Verificar rate limit
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ 
      error: 'Demasiadas solicitudes. Esperá un momento antes de intentar de nuevo.' 
    });
  }

  // Validar origen
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    'https://adhoc-student-helper.vercel.app'
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`Request from unauthorized origin: ${origin} (IP: ${ip})`);
  }

  // Validar API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'Servicio no configurado correctamente' });
  }

  // Validar request body
  const { fileData, mimeType } = req.body;
  
  if (!fileData || typeof fileData !== 'string') {
    return res.status(400).json({ 
      error: 'Falta el archivo o formato inválido (se requiere base64)' 
    });
  }

  if (!mimeType || typeof mimeType !== 'string') {
    return res.status(400).json({ 
      error: 'Falta el tipo MIME o formato inválido' 
    });
  }

  // Validar tamaño (base64 string no debe ser excesivamente largo)
  const maxSize = 10 * 1024 * 1024; // 10MB en base64
  if (fileData.length > maxSize) {
    return res.status(400).json({ 
      error: 'El archivo es demasiado grande. El tamaño máximo es 10MB.' 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Sos un asistente educativo experto en crear infogramas didácticos y visuales para estudiantes.

Analiza el PDF adjunto y genera un INFOGRAMA EDUCATIVO completo que ayude al estudiante a entender el tema de manera clara y visual.

Debes devolver un JSON con la siguiente estructura:

{
  "title": "Título claro y conciso del tema",
  "summary": "Resumen ejecutivo del contenido en 2-3 oraciones",
  "mainConcepts": [
    {
      "concept": "Nombre del concepto clave",
      "explanation": "Explicación clara y simple del concepto",
      "example": "Ejemplo concreto que ilustra el concepto (opcional)"
    }
  ],
  "visualElements": {
    "diagram": "Descripción de cómo visualizar el diagrama o flujo principal (si aplica)",
    "keyPoints": ["Punto clave 1", "Punto clave 2", ...],
    "connections": [
      {
        "from": "Concepto A",
        "to": "Concepto B",
        "relationship": "describe la relación entre A y B"
      }
    ]
  },
  "studyTips": ["Consejo de estudio 1", "Consejo de estudio 2", ...],
  "keyQuestions": ["Pregunta clave 1 para autoevaluación", "Pregunta clave 2", ...],
  "difficulty": "Básico" | "Intermedio" | "Avanzado"
}

IMPORTANTE:
- Usa lenguaje claro y didáctico
- Identifica 4-7 conceptos principales máximo
- Las conexiones deben mostrar relaciones entre conceptos (causa-efecto, pertenencia, secuencia, etc.)
- Los study tips deben ser prácticos y accionables
- Las key questions ayudan al estudiante a autoevaluar su comprensión
- Sé visual: describe cómo se relacionan los conceptos entre sí
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: fileData
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const result: InfogramResult = JSON.parse(response.text || '{}');

    // Log exitoso (sin datos sensibles)
    console.log(`Infogram generated successfully for IP: ${ip}, title: ${result.title || 'unknown'}`);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Error generating infogram:', error);
    
    // No exponer detalles internos del error
    return res.status(500).json({ 
      error: 'Error al generar el infograma. Por favor intentá de nuevo.' 
    });
  }
}
