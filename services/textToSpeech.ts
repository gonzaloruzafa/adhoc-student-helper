import { InfogramResult } from '../types';

let currentUtterance: SpeechSynthesisUtterance | null = null;

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

    // Calcular duración aproximada (aproximadamente 150 palabras por minuto)
    const wordCount = fullText.split(/\s+/).length;
    const duration = Math.ceil((wordCount / 150) * 60);

    return {
      audioUrl: null,
      duration,
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
    currentUtterance = utterance;
    
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      reject(new Error(`Error en síntesis de voz: ${event.error}`));
    };

    window.speechSynthesis.speak(utterance);
  });
};

export const pauseAudio = (): void => {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
};

export const resumeAudio = (): void => {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
};

export const stopAudio = (): void => {
  window.speechSynthesis.cancel();
  currentUtterance = null;
};

export const isAudioPlaying = (): boolean => {
  return window.speechSynthesis.speaking && !window.speechSynthesis.paused;
};

export const isAudioPaused = (): boolean => {
  return window.speechSynthesis.paused;
};
