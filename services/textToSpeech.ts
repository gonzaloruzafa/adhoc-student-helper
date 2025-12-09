import { InfogramResult } from '../types';

export const generateAudioExplanation = async (infogram: InfogramResult): Promise<{ audioUrl: string; duration: number }> => {
  try {
    // Construir el texto para la explicación
    const conceptsText = infogram.mainConcepts
      .slice(0, 5) // Tomar solo los primeros 5 conceptos
      .map((c, i) => `Concepto ${i + 1}: ${c.concept}. ${c.explanation}`)
      .join(' ');

    const fullText = `Hola, te presento un resumen de los conceptos clave del documento: "${infogram.title}". ${infogram.summary}. 

Ahora vamos a ver los conceptos principales: ${conceptsText}.

Espero que esta explicación te haya sido útil. ¡A seguir estudiando!`;

    // Llamar a la API de síntesis de voz
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: fullText,
        language: 'es-AR', // Español argentino
        name: 'es-AR-Neural2-C', // Voz femenina
      }),
    });

    if (!response.ok) {
      throw new Error(`Error generando audio: ${response.status}`);
    }

    const data = await response.json();
    return {
      audioUrl: data.audioUrl,
      duration: data.duration || 300, // 5 minutos por defecto
    };
  } catch (error: any) {
    console.error('Error generating audio explanation:', error);
    throw new Error(error.message || 'Error al generar el audio explicativo');
  }
};
