import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

// Rate limiting: almacena timestamps de requests por IP
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 5; // 5 PDFs por minuto

interface InfogramResult {
  handDrawnSketch: {
    svg: string;
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

    const prompt = `
Sos un diseñador experto en crear INFOGRÁFICOS EDUCATIVOS estilo "sketch notes" o "visual thinking", similar a los populares resúmenes visuales de libros como Atomic Habits.

Analiza el PDF adjunto y crea un INFOGRÁFICO VISUAL a mano alzada que resuma el contenido de forma didáctica.

ESTILO DE DISEÑO (SUPER IMPORTANTE):
- Inspirate en infografías educativas tipo "Booknotic" o "sketch notes"
- Layout tipo poster/infográfico: distribuí elementos como en una página de revista educativa
- Tipografía variada: títulos grandes, subtítulos medianos, texto pequeño
- Jerarquía visual fuerte: el título principal debe destacarse (font-size 32-40px)
- Usa cajas, círculos, y formas simples para agrupar conceptos
- Flechas GRUESAS (stroke-width: 3-5px) conectando ideas
- Iconos simples dibujados a mano (átomo, libro, estrella, check, lupa, lámpara, etc)
- Diagramas simples (círculos concéntricos, flujos, matrices 2x2, loops, etc)
- Variedad en los tamaños de letra para crear ritmo visual

Debes devolver un JSON con la siguiente estructura:

{
  "handDrawnSketch": {
    "svg": "CÓDIGO SVG COMPLETO del infográfico. DEBE SER UN DISEÑO PROFESIONAL tipo infográfico educativo. Especificaciones técnicas:
    
    ESTRUCTURA:
    - viewBox='0 0 1200 800' (formato landscape/horizontal)
    - Background: #FFFEF9 (color papel cálido)
    
    ELEMENTOS REQUERIDOS:
    1. TÍTULO PRINCIPAL (arriba, grande): 
       - font-size: 36-42px, font-weight: bold
       - Puede tener una decoración (líneas, subrayado grueso)
    
    2. SECCIONES CON CAJAS/BURBUJAS:
       - Usá <rect> con rx='12' para cajas redondeadas
       - Usá <circle> o <ellipse> para conceptos importantes
       - Cada caja debe tener título + puntos clave
    
    3. ÍCONOS SIMPLES (dibujados a mano con paths):
       - Estrella: para puntos importantes
       - Check ✓: para acciones completadas  
       - Flecha →: para causa-efecto
       - Bombilla 💡: para ideas clave
       - Etc. (adaptá según el tema)
    
    4. FLECHAS CONECTORAS:
       - Usá <path> con curvas (bezier) para flechas orgánicas
       - stroke-width: 3-5px
       - Agregá marker-end para punta de flecha
    
    5. TEXTO MANUSCRITO:
       - Fuentes: 'Comic Sans MS', 'Segoe Print', 'Arial Rounded MT Bold', cursive
       - Variá tamaños: 14px (normal), 18-22px (subtítulos), 36-42px (título)
       - Podés rotar algunos textos levemente (transform='rotate(-3 x y)')
    
    6. PALETA DE COLORES (tonos suaves):
       - Verde: #5FB57A (conceptos clave)
       - Violeta: #7C6CD8 (títulos importantes)
       - Coral: #FF7348 (alertas/énfasis)
       - Amarillo: #FFC857 (highlights)
       - Negro: #2D3142 (texto principal)
       - Gris: #6B7280 (texto secundario)
    
    7. LAYOUT SUGERIDO:
       - Dividí el espacio en secciones visuales
       - Arriba: título + subtítulo
       - Centro: 2-3 columnas con conceptos en cajas
       - Abajo: conclusión o llamado a la acción
       - Usá todo el espacio, evitá que quede vacío
    
    EJEMPLO DE ESTRUCTURA (adaptala al contenido):
    <svg viewBox='0 0 1200 800' xmlns='http://www.w3.org/2000/svg'>
      <!-- Background -->
      <rect width='1200' height='800' fill='#FFFEF9'/>
      
      <!-- Título principal con decoración -->
      <text x='600' y='80' font-size='40' font-weight='bold' text-anchor='middle' fill='#2D3142'>
        [TÍTULO DEL TEMA]
      </text>
      <path d='M 400 95 Q 600 105 800 95' stroke='#7C6CD8' stroke-width='4' fill='none'/>
      
      <!-- Sección 1: Concepto en caja -->
      <rect x='50' y='140' width='350' height='200' rx='15' fill='#F0F9FF' stroke='#5FB57A' stroke-width='3'/>
      <text x='225' y='180' font-size='24' font-weight='bold' text-anchor='middle' fill='#2D3142'>
        Concepto 1
      </text>
      <!-- ... más texto dentro -->
      
      <!-- Ícono dibujado a mano -->
      <circle cx='100' cy='160' r='25' fill='none' stroke='#FF7348' stroke-width='3'/>
      <!-- ... -->
      
      <!-- Flecha conectando conceptos -->
      <path d='M 420 240 Q 500 240 580 240' stroke='#7C6CD8' stroke-width='4' fill='none' marker-end='url(#arrowhead)'/>
      
      <!-- Más secciones, iconos, textos... -->
      
      <!-- Definición de marker para flechas -->
      <defs>
        <marker id='arrowhead' markerWidth='10' markerHeight='7' refX='9' refY='3.5' orient='auto'>
          <polygon points='0 0, 10 3.5, 0 7' fill='#7C6CD8' />
        </marker>
      </defs>
    </svg>
    ",
    "description": "Descripción de cómo leer el infográfico (qué representa cada sección)"
  },
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

CRÍTICO:
- El SVG DEBE ser un diseño completo y profesional, NO uses placeholders como "..." o "[MÁS CONTENIDO]"
- Creá un infográfico real con TODO el contenido relevante del PDF
- Usá TODA la superficie del viewBox, distribuí elementos estratégicamente
- Asegurate de que sea visualmente atractivo y fácil de entender de un vistazo
- El objetivo es que un estudiante pueda estudiar solo mirando este infográfico
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
