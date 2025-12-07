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

    // PASO 2: Generar prompt OPTIMIZADO para la imagen (MENOS TEXTO, MÁS VISUAL)
    const conceptsList = contentData.mainConcepts
      .map((c: any, i: number) => `${i+1}. ${c.concept}`)
      .join('\n');

    const imagePrompt = `Create a hand-drawn SKETCH NOTES infographic about: "${contentData.title}"

Main concepts to visualize (numbered sequence):
${conceptsList}

CRITICAL INSTRUCTIONS TO AVOID TEXT ERRORS:

1. TEXT STRATEGY - USE MINIMAL TEXT:
   - Write ONLY 3-5 SHORT words per concept (2-3 words is best)
   - Use SYMBOLS and ICONS instead of explanations wherever possible
   - If you MUST write text, keep it to SINGLE WORDS or very short phrases
   - NO long sentences or paragraphs
   - NO detailed explanations in text form

2. VISUAL-FIRST APPROACH:
   - Express ideas through DRAWINGS and DIAGRAMS rather than words
   - Use ICONS: stars ★, arrows →, checkmarks ✓, lightbulbs 💡, hearts ♡
   - Use SIMPLE SHAPES: circles, boxes, clouds, speech bubbles
   - Use CONNECTING ARROWS with simple labels (1-2 words max)
   - Draw simple illustrations to represent concepts

3. LAYOUT (sequential flow):
   - Title at top (handwritten, 2-4 words MAX)
   - Clear numbered flow: ① → ② → ③ → ④
   - Each numbered section has:
     * Concept name in BIG letters (1-3 words)
     * Simple icon or small drawing
     * Thick arrow to next concept
   - "START HERE" marker with arrow

4. HANDWRITTEN STYLE:
   - Authentic messy handwriting (letters slightly inconsistent)
   - THICK black marker for main elements
   - Yellow highlighter on key words
   - Wobbly hand-drawn boxes and circles
   - Organic curved arrows
   - Slightly tilted text for natural feel

5. PAPER & TEXTURE:
   - Beige/cream paper color (like recycled notebook paper)
   - Visible paper grain texture
   - Some wear/coffee stains for authenticity
   - Shadow/depth effect

6. WHAT TO AVOID (CRITICAL):
   - ❌ NO complex words or technical terms spelled out
   - ❌ NO long sentences or explanations
   - ❌ NO tiny detailed text that's hard to read
   - ❌ NO perfect computer-like text
   - ❌ NO attempts to write definitions or full explanations

7. INSTEAD, USE:
   - ✅ Simple abbreviations (e.g., "info", "ex:", "vs")
   - ✅ Numbers and symbols (1, 2, 3, ✓, →, ★)
   - ✅ Visual metaphors and simple drawings
   - ✅ Emphasis through size and color, not text length

EXAMPLE OF GOOD vs BAD:
❌ BAD: "La justicia restaurativa se enfoca en reparar el daño causado"
✅ GOOD: "JUSTICIA" (big title) → "Reparar" (with heart icon) → "Daño" (crossed out)

Think: Atomic Habits style infographic - MOSTLY visual with minimal, bold text labels. The image should communicate through DRAWINGS and SYMBOLS more than words.

Remember: This is sketch notes, not an essay. VISUAL COMMUNICATION FIRST, text is just labels and markers!`;

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
