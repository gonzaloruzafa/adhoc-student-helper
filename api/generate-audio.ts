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

    // Obtener API Key de variables de entorno (intentar múltiples nombres)
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY || 
                   process.env.GOOGLE_API_KEY || 
                   process.env.GEMINI_API_KEY;
    
    console.log('API Key status:', {
      hasGoogleCloudApiKey: !!process.env.GOOGLE_CLOUD_API_KEY,
      hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
      hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
      selectedKey: apiKey ? 'found' : 'not found',
    });

    if (!apiKey) {
      console.error('No API key configured');
      return res.status(500).json({ 
        message: 'Error generando audio: Servicio no configurado correctamente',
        details: 'API key not found in environment variables'
      });
    }

    const synthesizeUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;

    console.log('Calling Google TTS API...');
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

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google TTS API error response:', errorData);
      return res.status(500).json({
        message: 'Error generando audio: ' + response.status,
        details: errorData,
      });
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      console.error('No audio content in response');
      return res.status(500).json({ 
        message: 'Error generando audio: No se generó contenido de audio' 
      });
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
      message: 'Error generando audio: ' + (error.message || 'Unknown error'),
      error: error.message,
    });
  }
}
