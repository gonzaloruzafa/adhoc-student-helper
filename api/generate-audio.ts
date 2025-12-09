import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    // Calcular duración aproximada (aproximadamente 150 palabras por minuto)
    const wordCount = text.split(/\s+/).length;
    const duration = Math.ceil((wordCount / 150) * 60); // en segundos

    // Retornar el texto para que el cliente use Web Speech API
    res.status(200).json({
      audioUrl: null,
      textForTTS: text,
      duration,
      message: 'Usando síntesis de voz del navegador'
    });
  } catch (error: any) {
    console.error('Error preparing audio:', error);
    res.status(500).json({
      message: 'Error preparando audio: ' + (error.message || 'Unknown error'),
      error: error.message,
    });
  }
}
