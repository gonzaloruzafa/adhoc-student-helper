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
IMPORTANTE: Genera TODAS las respuestas EN ESPAÑOL, sin importar el idioma original del documento.
Si el documento está en otro idioma, traduce el contenido al español automáticamente.

Devolvé un JSON con esta estructura (TODO EN ESPAÑOL):

{
  "title": "Título principal del tema (en español)",
  "summary": "Resumen en 2-3 oraciones (en español)",
  "mainConcepts": [
    {
      "concept": "Concepto 1 (en español)",
      "explanation": "Explicación breve (en español)",
      "example": "Ejemplo si corresponde (en español)"
    }
  ],
  "visualElements": {
    "diagram": "Descripción del diagrama principal si aplica (en español)",
    "keyPoints": ["Punto clave 1 (en español)", "Punto clave 2 (en español)"],
    "connections": [
      {
        "from": "Concepto A (en español)",
        "to": "Concepto B (en español)", 
        "relationship": "Relación entre ambos (en español)"
      }
    ]
  },
  "studyTips": ["Tip 1 (en español)", "Tip 2 (en español)"],
  "keyQuestions": [
    { "question": "Pregunta 1 (en español)", "answer": "Respuesta 1 (en español)" },
    { "question": "Pregunta 2 (en español)", "answer": "Respuesta 2 (en español)" }
  ],
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

    // PASO 2: Generar prompt con BALANCE entre texto e iconos
    const conceptsList = contentData.mainConcepts
      .map((c: any, i: number) => `${i+1}. ${c.concept}: ${c.explanation}`)
      .join('\n');

    const keyPointsList = contentData.visualElements?.keyPoints?.join('\n• ') || '';

    const imagePrompt = `Create a DENSE, information-rich hand-drawn SKETCH NOTES infographic about: "${contentData.title}"

LANGUAGE: ALL TEXT IN THE IMAGE MUST BE IN SPANISH. Write all labels, titles, concepts, and explanations in Spanish.

CONTENT TO INCLUDE:
${conceptsList}

Key points:
• ${keyPointsList}

CRITICAL BALANCE - MORE INFO BUT LEGIBLE TEXT:

1. TEXT STRATEGY (IMPORTANT):
   - Use SHORT COMMON WORDS that are easy to write (avoid complex technical terms)
   - Write text in CLEAR CAPITAL LETTERS when needed for legibility
   - Each concept box should have:
     * Title (2-4 words in BIG letters)
     * 2-3 bullet points with short phrases (5-8 words each)
     * Small notes or keywords in margins
   - Use simple vocabulary: "info", "key", "main", "how", "why", "vs", "ex:"
   - Abbreviate when possible: "ex:", "def:", "vs", "→"

2. LAYOUT - SEQUENTIAL DENSE FLOW:
   - Title at top with decorative underline
   - START HERE marker with arrow pointing to concept 1
   - Clear numbered sequence: ① → ② → ③ → ④
   - Each numbered box contains:
     * Concept name (large handwritten text)
     * 2-3 short bullet points or phrases
     * Small icon or simple drawing
     * Thick arrow to next concept
   - Add side notes and annotations in margins
   - Small "Key Points" box with 3-4 items
   - Additional notes box at bottom

3. VISUAL ELEMENTS (mixed with text):
   - Hand-drawn boxes with wobbly rounded corners
   - Thick curved arrows connecting ideas (→)
   - Simple icons: ★, ✓, 💡, ♡, !, ?
   - Small simple drawings to illustrate concepts
   - Yellow highlighter on important words
   - Circles and underlines for emphasis
   - Dashed lines for connections

4. HANDWRITTEN STYLE:
   - Authentic messy handwriting (slightly inconsistent letters)
   - Mix of sizes: BIG for titles, medium for main text, small for notes
   - THICK black marker for main content
   - Yellow/orange highlighter marks (messy, overlapping)
   - Some words tilted or curved
   - Occasional small corrections or cross-outs

5. PAPER & TEXTURE:
   - Beige/cream paper (like notebook paper)
   - Visible paper grain texture
   - Coffee stains or worn edges
   - Shadow/depth for physical paper feel

6. INFORMATION DENSITY:
   - Fill 70-80% of the page
   - Multiple layers: main boxes + side notes + arrows + icons
   - Think: comprehensive study sheet with ALL key info
   - Include 8-12 distinct information pieces
   - Small text is OK if it's in CLEAR CAPITAL LETTERS

7. TEXT WRITING RULES (to avoid errors):
   - When writing phrases, use SIMPLE common words
   - Prefer ALL CAPS for small text (easier to read)
   - If a word is complex, USE AN ICON instead
   - Write numbers and symbols liberally (1, 2, 3, ✓, →)
   - Short phrases better than long sentences

EXAMPLE STRUCTURE:
[TOP] "TRANSFORMER MODEL" (big title, yellow highlight)
[Box 1] "① ATTENTION" → "Focus" "Multiple" "Parallel" (+ lightbulb icon)
[Box 2] "② ENCODER" → "Process" "Input" "Layers" (+ stack icon)
[Box 3] "③ MULTI-HEAD" → "Parallel" "Brain" "Attention" (+ brain drawing)
[Box 4] "④ POSITION" → "Order" "Info" "Sequence" (+ numbered dots)
[Side notes] "Key: Self-attention", "vs RNN", "No recurrence!"

BOTTOM RIGHT CORNER - ADHOC SIGNATURE:
- In the bottom right corner, write "Adhoc" in small, neat handwritten letters (same style as the rest of the sketch notes)
- Use the same pen/marker color as the main content
- Position it with about 0.5cm padding from the bottom and right edges
- Keep it subtle and integrate it naturally as if it's a signature of the study notes creator
- The text should be about 1-1.5cm wide

Think: Atomic Habits or Restorative Justice infographic style - DENSE with information but using simple vocabulary and mix of text + icons. More text than last version, but still visually engaging and handwritten.`;

    // PASO 3: Generar la imagen con Gemini 3 Pro Image (Nano Banana Pro)
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
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

    console.log(`Infogram with Gemini 3 Pro Image generated successfully for IP: ${ip}, title: ${result.title || 'unknown'}`);
    
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Error generating infogram:', error);
    
    return res.status(500).json({ 
      error: 'Error al generar el infograma. Por favor intentá de nuevo.' 
    });
  }
}
