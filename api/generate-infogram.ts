import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

// Rate limiting: almacena timestamps de requests por IP
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 5; // 5 PDFs por minuto

interface InfogramResult {
  mermaidCode: string;
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

    // PASO 1: Extraer contenido del PDF con Gemini Flash
    const analysisPrompt = `
Analiza este PDF y extrae el contenido principal para crear un infograma educativo.

Devolvé un JSON con esta estructura:

{
  "title": "Título principal del tema",
  "summary": "Resumen en 2-3 oraciones",
  "mainConcepts": [
    {
      "concept": "Concepto 1",
      "explanation": "Explicación breve",
      "example": "Ejemplo si corresponde"
    }
  ],
  "visualElements": {
    "diagram": "Descripción del diagrama principal si aplica",
    "keyPoints": ["Punto clave 1", "Punto clave 2"],
    "connections": [
      {
        "from": "Concepto A",
        "to": "Concepto B", 
        "relationship": "Relación entre ambos"
      }
    ]
  },
  "studyTips": ["Tip 1", "Tip 2"],
  "keyQuestions": ["Pregunta 1", "Pregunta 2"],
  "difficulty": "Básico" | "Intermedio" | "Avanzado"
}
`;

    const analysisResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          parts: [
            { text: analysisPrompt },
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

    const contentData = JSON.parse(analysisResponse.text || '{}');

    // PASO 2: Generar código Mermaid basado en el contenido
    const mermaidPrompt = `
Basándote en este contenido extraído de un PDF educativo, genera un diagrama Mermaid.js en ESPAÑOL.

CONTENIDO:
Título: ${contentData.title}
Resumen: ${contentData.summary}

Conceptos principales:
${contentData.mainConcepts.map((c: any, i: number) => `${i+1}. ${c.concept}: ${c.explanation}`).join('\n')}

Puntos clave:
${contentData.visualElements?.keyPoints?.map((p: string) => `• ${p}`).join('\n') || ''}

Conexiones:
${contentData.visualElements?.connections?.map((c: any) => `${c.from} → ${c.to} (${c.relationship})`).join('\n') || ''}

INSTRUCCIONES CRÍTICAS:

1. Genera código Mermaid.js válido usando SOLO la sintaxis "graph TD" (Top-Down) o "graph LR" (Left-Right)
2. TODO EL TEXTO debe estar en ESPAÑOL (sin excepciones)
3. Usa nodos con formas diferentes para distinguir tipos de información:
   - Rectángulos para conceptos principales: [Concepto]
   - Rectángulos redondeados para acciones: (Acción)
   - Rombos para decisiones: {Decisión?}
   - Círculos para puntos clave: ((Punto))
4. Conecta los nodos con flechas etiquetadas: -->|relación|
5. El diagrama debe ser DENSO e informativo (8-15 nodos mínimo)
6. Incluye el título como primer nodo destacado
7. Agrupa conceptos relacionados visualmente
8. Usa subgraphs si es necesario para organizar secciones

EJEMPLO DE ESTRUCTURA:

graph TD
    A["📚 ${contentData.title}"]
    A --> B["Concepto 1"]
    A --> C["Concepto 2"]
    B -->|relación| D("Explicación")
    C -->|relación| E{Pregunta clave?}
    E -->|Sí| F((Punto importante))
    E -->|No| G["Alternativa"]
    
    subgraph "Sección adicional"
        H["Detalle 1"]
        I["Detalle 2"]
    end

RESPONDE ÚNICAMENTE CON EL CÓDIGO MERMAID, SIN MARKDOWN NI EXPLICACIONES.
El código debe empezar directamente con "graph TD" o "graph LR".
`;

    const mermaidResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: {
        parts: [{ text: mermaidPrompt }]
      }
    });

    let mermaidCode = mermaidResponse.text?.trim() || '';
    
    // Limpiar el código si viene envuelto en markdown
    mermaidCode = mermaidCode.replace(/^```mermaid\n?/i, '').replace(/\n?```$/i, '');
    mermaidCode = mermaidCode.trim();

    if (!mermaidCode || !mermaidCode.startsWith('graph')) {
      throw new Error('No se pudo generar código Mermaid válido');
    }

    // PASO 3: Armar respuesta completa
    const result: InfogramResult = {
      mermaidCode,
      ...contentData
    };

    console.log(`Infogram with Mermaid diagram generated successfully for IP: ${ip}, title: ${result.title || 'unknown'}`);
    
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Error generating infogram:', error);
    
    return res.status(500).json({ 
      error: 'Error al generar el infograma. Por favor intentá de nuevo.' 
    });
  }
}
