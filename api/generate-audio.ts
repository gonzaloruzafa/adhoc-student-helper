import type { VercelRequest, VercelResponse } from '@vercel/node';

// This endpoint is no longer used - audio synthesis now happens client-side
// Keeping it for backward compatibility
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ 
    message: 'Audio synthesis is now handled client-side using Web Speech API' 
  });
}
