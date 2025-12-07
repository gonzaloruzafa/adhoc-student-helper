import { CVRanking } from '../types';

export const generateRankingImage = async (ranking: CVRanking, userName: string): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d')!;

  // Background gradient (Adhoc colors)
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#7C6CD8'); // adhoc-violet
  gradient.addColorStop(0.5, '#BCAFEF'); // adhoc-lavanda
  gradient.addColorStop(1, '#7C6CD8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(900, 200, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(200, 900, 250, 0, Math.PI * 2);
  ctx.fill();

  // White rounded rectangle background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  roundRect(ctx, 80, 200, canvas.width - 160, 700, 40);
  ctx.fill();

  // Title
  ctx.fillStyle = '#7C6CD8';
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Mi Resultado en Adhoc CV', canvas.width / 2, 140);

  // User name (if provided)
  if (userName) {
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '40px Arial';
    ctx.fillText(userName, canvas.width / 2, 280);
  }

  // Score circle
  ctx.fillStyle = '#7C6CD8';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 480, 150, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 140px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(ranking.score.toString(), canvas.width / 2, 520);
  
  ctx.font = '32px Arial';
  ctx.fillText('de 100 puntos', canvas.width / 2, 670);

  // Nivel with emoji
  ctx.fillStyle = '#2a2a2a';
  ctx.font = 'bold 56px Arial';
  ctx.fillText(ranking.nivel, canvas.width / 2, 770);

  // Progress bar
  const barX = 180;
  const barY = 820;
  const barWidth = canvas.width - 360;
  const barHeight = 40;
  
  // Background bar
  ctx.fillStyle = 'rgba(124, 108, 216, 0.2)';
  roundRect(ctx, barX, barY, barWidth, barHeight, 20);
  ctx.fill();
  
  // Progress fill
  const progressWidth = (barWidth * ranking.score) / 100;
  const progressGradient = ctx.createLinearGradient(barX, 0, barX + progressWidth, 0);
  progressGradient.addColorStop(0, '#FEA912'); // mustard
  progressGradient.addColorStop(1, '#FF7348'); // coral
  ctx.fillStyle = progressGradient;
  roundRect(ctx, barX, barY, progressWidth, barHeight, 20);
  ctx.fill();

  // Footer text
  ctx.fillStyle = '#666';
  ctx.font = '36px Arial';
  ctx.fillText('¿Querés mejorar tu CV?', canvas.width / 2, 1000);
  
  ctx.fillStyle = '#7C6CD8';
  ctx.font = 'bold 42px Arial';
  ctx.fillText('Probá la herramienta de Adhoc', canvas.width / 2, 1060);

  // Logo/watermark
  ctx.fillStyle = 'rgba(124, 108, 216, 0.3)';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('adhoc.com.ar', canvas.width - 100, 1150);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
};

// Helper function to draw rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
