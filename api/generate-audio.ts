import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { text, language = 'es-AR', name = 'es-AR-Neural2-C' } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    // Usar Google Cloud Text-to-Speech API
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_CLOUD_API_KEY not configured');
    }

    const synthesizeUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const response = await fetch(synthesizeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: language,
          name: name,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google TTS API error response:', errorData);
      throw new Error(`Google TTS API error: ${response.status}`);
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      throw new Error('No audio content generated');
    }

    const audioUrl = `data:audio/mp3;base64,${audioContent}`;

    // Calcular duración aproximada (aproximadamente 150 palabras por minuto)
    const wordCount = text.split(/\s+/).length;
    const duration = Math.ceil((wordCount / 150) * 60); // en segundos

    res.status(200).json({
      audioUrl,
      duration,
    });
  } catch (error: any) {
    console.error('Error generating audio:', error);
    res.status(500).json({
      message: 'Error generating audio',
      error: error.message,
    });
  }
}
