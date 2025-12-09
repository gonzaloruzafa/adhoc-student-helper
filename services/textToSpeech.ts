import { InfogramResult } from '../types';

export const generateAudioExplanation = async (infogram: InfogramResult): Promise<{ audioUrl: string | null; duration: number; textForTTS: string }> => {
  try {
    // Construir el texto para la explicación
    const conceptsText = infogram.mainConcepts
      .slice(0, 5) // Tomar solo los primeros 5 conceptos
      .map((c, i) => `Concepto ${i + 1}: ${c.concept}. ${c.explanation}`)
      .join(' ');

    const fullText = `Hola, te presento un resumen de los conceptos clave del documento: "${infogram.title}". ${infogram.summary}. 

Ahora vamos a ver los conceptos principales: ${conceptsText}.

Espero que esta explicación te haya sido útil. ¡A seguir estudiando!`;

    // Llamar al servidor para obtener metadatos de duración
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: fullText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error generando audio: ${response.status}`);
    }

    const data = await response.json();
    return {
      audioUrl: data.audioUrl || null,
      duration: data.duration || 300, // 5 minutos por defecto
      textForTTS: fullText,
    };
  } catch (error: any) {
    console.error('Error generating audio explanation:', error);
    throw new Error(error.message || 'Error al generar el audio explicativo');
  }
};

// Usar Web Speech API del navegador para síntesis de voz
export const speakText = async (text: string, language: string = 'es-AR'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (event) => {
      reject(new Error(`Error en síntesis de voz: ${event.error}`));
    };

    window.speechSynthesis.speak(utterance);
  });
};
