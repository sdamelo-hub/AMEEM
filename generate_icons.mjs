import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';

try { mkdirSync('public/icons', { recursive: true }); } catch {}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#1a56db');
  grad.addColorStop(1, '#059669');
  ctx.fillStyle = grad;
  const r = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  
  // Circle bg
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.38, 0, Math.PI * 2);
  ctx.fill();
  
  // Text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.32}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎓', size / 2, size / 2);
  
  writeFileSync(`public/icons/icon-${size}.png`, canvas.toBuffer('image/png'));
  console.log(`Generated icon-${size}.png`);
}
