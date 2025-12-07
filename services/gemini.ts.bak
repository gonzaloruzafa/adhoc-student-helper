import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

const processFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeCV = async (file: File): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await processFileToBase64(file);
  
  // Determine mime type
  const mimeType = file.type || 'application/pdf';

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      feedback: {
        type: Type.OBJECT,
        description: "Structured analysis of the CV.",
        properties: {
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of 3-5 positive aspects of the CV."
          },
          improvements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of 3-5 specific areas that need improvement."
          },
          actionPlan: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Concrete, actionable steps the user should take to fix the issues."
          },
          conclusion: {
            type: Type.STRING,
            description: "A final encouraging summary paragraph."
          }
        },
        required: ["strengths", "improvements", "actionPlan", "conclusion"]
      },
      cvData: {
        type: Type.OBJECT,
        description: "Structured data extracted and optimized for ATS systems.",
        properties: {
          fullName: { type: Type.STRING },
          contactInfo: {
            type: Type.OBJECT,
            properties: {
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              location: { type: Type.STRING },
            }
          },
          professionalSummary: { type: Type.STRING, description: "A strong, concise professional summary." },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                company: { type: Type.STRING },
                dates: { type: Type.STRING },
                description: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Bullet points describing achievements, starting with action verbs."
                }
              }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                degree: { type: Type.STRING },
                institution: { type: Type.STRING },
                year: { type: Type.STRING }
              }
            }
          },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          languages: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["fullName", "experience", "education", "skills"]
      }
    },
    required: ["feedback", "cvData"]
  };

  const model = "gemini-2.5-flash";
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Sos un experto consultor de RRHH de Adhoc S.A. en Argentina. Analizá este CV.
            
            1. Generá un feedback estructurado en 4 partes:
               - **Fortalezas**: Lo que el candidato hizo bien.
               - **A mejorar**: Errores o debilidades detectadas.
               - **Plan de acción**: Pasos super concretos para arreglarlo (ej: "Cambiá el verbo 'hacer' por 'liderar'").
               - **Conclusión**: Un cierre motivador.
            
            2. Extraé y reescribí el contenido del CV ("cvData") para que quede perfecto para un sistema ATS:
               - Redactá un resumen profesional potente.
               - Mejorá las descripciones de experiencia usando verbos de acción y métricas.
               
            IMPORTANTE:
            - Hablá siempre de "vos" (español argentino).
            - Sé directo, amable y profesional.
            - Usá terminología local (ej: "Laburo", "CV", "Recruiter").`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini");
    }

    const result: AnalysisResult = JSON.parse(response.text);
    return result;

  } catch (error) {
    console.error("Error analyzing CV:", error);
    throw error;
  }
};