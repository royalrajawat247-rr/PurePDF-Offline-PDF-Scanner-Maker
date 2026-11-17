import type { ScanFilterMode, ScanQualityPreset } from '../types';
import { computeCropRectPixels, getScanQualityConfig, type CropEdgesPct } from './documentMath';

/**
 * Pure pixel-level Magic Color document enhancement:
 * stretches local white point so paper backgrounds brighten cleanly to white,
 * deepens dark ink strokes, and subtly boosts chroma for colored stamps/highlights.
 */
export function applyMagicColorFilter(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum > 188) {
      // Brighten paper background toward pure white while preserving faint tint
      const factor = (lum - 188) / 67;
      out[i] = Math.min(255, Math.round(r + (255 - r) * (0.65 + 0.35 * factor)));
      out[i + 1] = Math.min(255, Math.round(g + (255 - g) * (0.65 + 0.35 * factor)));
      out[i + 2] = Math.min(255, Math.round(b + (255 - b) * (0.65 + 0.35 * factor)));
    } else {
      // Contrast stretch & mild saturation boost for ink/graphics
      const avg = (r + g + b) / 3;
      const satBoost = 1.25;
      const contrast = 1.22;
      const nr = (avg + (r - avg) * satBoost - 128) * contrast + 122;
      const ng = (avg + (g - avg) * satBoost - 128) * contrast + 122;
      const nb = (avg + (b - avg) * satBoost - 128) * contrast + 122;
      out[i] = Math.max(0, Math.min(255, Math.round(nr)));
      out[i + 1] = Math.max(0, Math.min(255, Math.round(ng)));
      out[i + 2] = Math.max(0, Math.min(255, Math.round(nb)));
    }
    out[i + 3] = a;
  }
  return out;
}

/**
 * Pure pixel-level B&W Crisp scan filter:
 * converts RGB to perceptual luminance and applies a sharp S-curve around
 * document threshold so text reads razor-sharp against clean white paper.
 */
export function applyBwCrispFilter(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);

  // Compute mean luminance to adapt threshold slightly to lighting
  let sum = 0;
  const pixelCount = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }
  const meanLum = pixelCount > 0 ? sum / pixelCount : 128;
  const threshold = Math.max(105, Math.min(185, meanLum * 0.86));

  for (let i = 0; i < pixels.length; i += 4) {
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    let v: number;
    if (lum >= threshold + 18) {
      v = 255;
    } else if (lum <= threshold - 22) {
      v = 12;
    } else {
      // Smooth anti-aliased transition band for crisp glyph edges
      const t = (lum - (threshold - 22)) / 40;
      v = Math.round(12 + t * 243);
    }
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = pixels[i + 3];
  }
  return out;
}

export async function applyScanFilterToDataUrl(
  sourceDataUrl: string,
  filter: ScanFilterMode,
  scanQuality: ScanQualityPreset = 'high-hd'
): Promise<string> {
  if (filter === 'original' && scanQuality === 'high-hd') return sourceDataUrl;

  const cfg = getScanQualityConfig(scanQuality);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to decode image for scan filter.'));
    img.src = sourceDataUrl;
  });

  const naturalW = img.naturalWidth || img.width || 800;
  const naturalH = img.naturalHeight || img.height || 1000;
  const longest = Math.max(naturalW, naturalH, 1);
  const scale = longest > cfg.maxDimensionPx ? cfg.maxDimensionPx / longest : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(naturalW * scale));
  canvas.height = Math.max(1, Math.round(naturalH * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceDataUrl;

  try {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (filter !== 'original') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processed =
        filter === 'magic-color'
          ? applyMagicColorFilter(imageData.data)
          : applyBwCrispFilter(imageData.data);
      const outData = new ImageData(new Uint8ClampedArray(processed), canvas.width, canvas.height);
      ctx.putImageData(outData, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', cfg.jpegQuality);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function optimizeImageForQuality(
  sourceDataUrl: string,
  scanQuality: ScanQualityPreset = 'high-hd'
): Promise<string> {
  return applyScanFilterToDataUrl(sourceDataUrl, 'original', scanQuality);
}

export async function rotateDataUrl90(sourceDataUrl: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for rotation.'));
    img.src = sourceDataUrl;
  });

  const w = img.naturalWidth || img.width || 800;
  const h = img.naturalHeight || img.height || 1000;
  const canvas = document.createElement('canvas');
  canvas.width = h;
  canvas.height = w;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceDataUrl;

  try {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return canvas.toDataURL('image/jpeg', 0.94);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function cropDataUrl(
  sourceDataUrl: string,
  edges: CropEdgesPct
): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for cropping.'));
    img.src = sourceDataUrl;
  });

  const w = img.naturalWidth || img.width || 800;
  const h = img.naturalHeight || img.height || 1000;
  const { sx, sy, sw, sh } = computeCropRectPixels(w, h, edges);

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceDataUrl;

  try {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL('image/jpeg', 0.94);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
