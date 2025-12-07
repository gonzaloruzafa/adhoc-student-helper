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

    // PASO 2: Generar prompt para la imagen tipo sketch notes manuscrito
    const conceptsList = contentData.mainConcepts
      .map((c: any, i: number) => `${i+1}. ${c.concept}: ${c.explanation}`)
      .join('\n');

    const imagePrompt = `Create a hand-drawn SKETCH NOTES style infographic about: "${contentData.title}"

Main concepts to visualize:
${conceptsList}

VISUAL STYLE (CRITICAL - this is the most important part):
- AUTHENTIC HAND-DRAWN look, as if someone drew it by hand with markers on paper
- Completely handwritten text throughout (simulate real handwriting, not computer fonts)
- Organic, wavy, slightly imperfect lines (nothing should look computer-generated)
- Hand-drawn boxes with irregular rounded corners
- Thick curved arrows connecting ideas (imperfect, organic curves)
- Simple hand-drawn icons: stars ★, lightbulbs 💡, checkmarks ✓, circles, arrows
- Yellow/golden highlighter marks for emphasis
- Black marker for main text, yellow/gold marker for highlights and underlines
- White or cream paper background texture
- Free-flowing organic layout (NOT a rigid grid - more like someone's study notes)

ELEMENTS TO INCLUDE:
- Large handwritten title at the top with decorative underlines
- Main concepts in hand-drawn boxes or speech bubbles
- Connecting arrows showing relationships between ideas
- Small doodles and icons scattered throughout
- Yellow highlighter marks on important words
- Varied text sizes for visual hierarchy (all handwritten style)
- Some text slightly rotated for organic feel
- Natural spacing (like real handwritten notes)

Think of sketch notes by Mike Rohde or Sacha Chua - organic, warm, personal, with authentic marker-on-paper aesthetic.

The image should look like educational study notes someone hand-drew during a lecture using black and yellow markers on white paper. Make it visually engaging, clear, and authentically hand-drawn.`;

    // PASO 3: Generar la imagen con Gemini Flash Image
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: imagePrompt }]
      }
    });

    // Extraer imagen generada (base64)
    let imageBase64: string | null = null;
    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      throw new Error('No se pudo generar la imagen del infográfico');
    }

    // PASO 4: Armar respuesta completa
    const result: InfogramResult = {
      handDrawnSketch: {
        imageUrl: `data:image/png;base64,${imageBase64}`,
        imageData: imageBase64,
        description: `Infográfico tipo sketch notes manuscrito sobre: ${contentData.title}`
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
