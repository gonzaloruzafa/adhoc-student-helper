import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

// Rate limiting: almacena timestamps de requests por IP
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 5; // 5 PDFs por minuto

interface InfogramResult {
  handDrawnSketch: {
    imageUrl: string;
    imageData: string;
    description: string;
  };
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

    // PASO 2: Generar prompt para la imagen estilo sketch notes manuscrito
    const conceptsList = contentData.mainConcepts
      .map((c: any, i: number) => `${i+1}. ${c.concept}: ${c.explanation}`)
      .join('\n');

    const imagePrompt = `
Create a HAND-DRAWN SKETCH NOTES infographic about: "${contentData.title}"

KEY CONCEPTS TO INCLUDE:
${conceptsList}

VISUAL STYLE (CRITICAL):
- Completely hand-drawn aesthetic, as if drawn on paper with markers
- Handwritten text throughout (simulate real handwriting, not typed fonts)
- Organic, wavy lines and imperfect shapes (no perfect geometric shapes)
- Hand-drawn boxes with irregular rounded corners
- Curved arrows connecting ideas (thick and imperfect)
- Simple hand-drawn icons: lightbulbs, stars, circles, checkmarks, arrows
- Yellow/golden highlights and underlines for emphasis
- Black/dark gray for main text, yellow/gold for highlights
- White/cream paper background
- Free-flowing layout (not rigidly structured)

ELEMENTS TO INCLUDE:
- Title at the top (large handwritten letters)
- Main concepts in hand-drawn boxes or bubbles
- Connecting arrows showing relationships
- Small doodles and icons (stars ★, lightbulbs 💡, checkmarks ✓)
- Underlines and emphasis marks
- Some text in different sizes for hierarchy
- Organic spacing (not a rigid grid)

STYLE REFERENCE:
Think of sketch notes by Mike Rohde or Sacha Chua - organic, authentic hand-drawn feel with personality and warmth. The image should look like someone took notes by hand during a lecture, using markers in black and yellow/gold.

Make it educational, clear, visually engaging, and authentically hand-drawn looking.
`;

    // PASO 3: Generar la imagen con Imagen 3
    const imageResponse = await ai.models.generateImages({
      model: "imagen-3.0-generate-001",
      prompt: imagePrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "3:2",
      }
    });

    // Extraer imagen generada (viene en base64)
    const generatedImage = imageResponse.images[0];
    const imageBase64 = generatedImage.image.data;

    // PASO 4: Armar respuesta completa
    const result: InfogramResult = {
      handDrawnSketch: {
        imageUrl: `data:image/png;base64,${imageBase64}`,
        imageData: imageBase64,
        description: `Sketch notes manuscrito que resume: ${contentData.title}`
      },
      ...contentData
    };

    console.log(`Infogram with image generated successfully for IP: ${ip}, title: ${result.title || 'unknown'}`);
    
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Error generating infogram:', error);
    
    return res.status(500).json({ 
      error: 'Error al generar el infograma. Por favor intentá de nuevo.' 
    });
  }
}
