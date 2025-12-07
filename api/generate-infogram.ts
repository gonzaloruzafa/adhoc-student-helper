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

    // PASO 2: Generar prompt detallado para la imagen tipo sketch notes manuscrito
    const conceptsList = contentData.mainConcepts
      .map((c: any, i: number) => `${i+1}. ${c.concept}: ${c.explanation}${c.example ? ' (Ej: ' + c.example + ')' : ''}`)
      .join('\n');

    const keyPointsList = contentData.visualElements?.keyPoints?.join('\n• ') || '';
    
    const connectionsList = contentData.visualElements?.connections
      ?.map((conn: any) => `${conn.from} → ${conn.relationship} → ${conn.to}`)
      .join('\n') || '';

    const imagePrompt = `Create a DENSE, information-rich hand-drawn SKETCH NOTES infographic about: "${contentData.title}"

CONTENT TO INCLUDE (pack as much info as possible):
Title: ${contentData.title}

Main concepts (numbered sequence):
${conceptsList}

Key points:
• ${keyPointsList}

Connections:
${connectionsList}

Additional notes: ${contentData.summary}

LAYOUT STRUCTURE (CRITICAL - follow this sequential reading flow):
1. START with a large handwritten TITLE at the TOP CENTER with decorative underlines/waves
2. Add a small star ★ or number "1" near the first concept area (top-left or top area)
3. SEQUENTIAL FLOW: Arrange concepts in a clear 1→2→3→4 order using:
   - Large numbered circles ① ② ③ ④ 
   - OR numbers in boxes [1] [2] [3]
   - Connect them with thick ARROWS showing the reading sequence
4. Each numbered section should contain:
   - The concept name (larger handwriting)
   - 2-4 lines of explanation text (smaller handwriting but still legible)
   - Small sub-bullets or notes
   - Tiny doodles/icons related to that concept
5. Use ARROWS to guide the eye from section to section (like a flowchart but organic)
6. Add small annotations, side notes, and "!" or "★" marks for emphasis
7. Fill empty spaces with:
   - Additional definitions in smaller text
   - Key formulas or examples in boxes
   - Small diagrams or mini-sketches
   - Question marks ? for things to review
   
VISUAL STYLE (authentic messy handwriting):
- REAL HANDWRITING: text should look genuinely hand-drawn, slightly messy and imperfect
- NOT neat typography - should look like rushed lecture notes
- Letters slightly inconsistent in size and angle
- Some words squeezed together, others spaced out
- Occasional cross-outs or corrections (authentic student notes!)
- THICK black marker lines for main content
- Yellow/orange HIGHLIGHTER marks (messy, overlapping on key words)
- Hand-drawn boxes with WOBBLY rounded corners
- Organic curved arrows (thick, imperfect, hand-drawn)
- Circles around important terms (not perfect circles!)
- Small stars ★, lightbulbs 💡, checkmarks ✓ scattered around
- Doodles in margins: arrows, brackets, underlines, spirals
- Some text slightly tilted or curved following the flow

PAPER TEXTURE & REALISM:
- Beige/cream colored paper (not pure white) - like notebook paper or recycled paper
- Visible paper texture/grain
- Maybe slight coffee stain or worn edges for authenticity
- Shadow or depth to make it feel like physical paper
- Pen ink should look slightly uneven (like real marker on paper)

DENSITY & INFORMATION:
- PACK the page with info - no large empty spaces
- Multiple layers of information (main text + side notes + annotations)
- 60-80% of the image should have writing/drawings
- Think of a student's comprehensive study sheet before an exam
- Include 8-12 distinct pieces of information minimum
- Small detailed text is OK (as long as it's handwritten style)

SEQUENTIAL READING GUIDE:
- Make it OBVIOUS where to start reading (big "START HERE" or "①")
- Clear arrow path from concept 1 → 2 → 3 → 4
- Visual hierarchy through size, but maintain sequential flow
- Arrows should create a natural "eye path" through the content

Think of: Real student notes from a lecture, marker-on-paper sketch notes, Atomic Habits infographic style, densely packed but organized information, authentic messy handwriting (not pretty fonts), paper texture visible, well-used study notes with highlights and annotations everywhere.

The image should feel like someone spent 30 minutes hand-drawing detailed study notes with black and yellow markers on cream-colored paper, including ALL the important information in a sequential, easy-to-follow format.`;

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
