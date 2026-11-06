import {
  CanvasElement,
  LabelTemplate,
  TextElementConfig,
  BarcodeElementConfig,
  QRElementConfig,
  ImageElementConfig,
  ShapeElementConfig,
} from '../types/label';
import { generateBarcodeDataUrl, generateQrDataUrl } from './barcode';
import { getRowValue } from './row';

/**
 * Resolves font family with robust web fallbacks
 */
export function getFontFamilyStack(fontFamily: string | undefined): string {
  switch (fontFamily) {
    case 'Calibri':
      return '"Calibri", "Carlito", "Candara", "Segoe UI", system-ui, sans-serif';
    case 'JetBrains Mono':
      return '"JetBrains Mono", monospace';
    case 'Plus Jakarta Sans':
      return '"Plus Jakarta Sans", system-ui, sans-serif';
    case 'DM Sans':
      return '"DM Sans", system-ui, sans-serif';
    case 'Arial':
      return 'Arial, Helvetica, sans-serif';
    case 'Times New Roman':
      return '"Times New Roman", Times, serif';
    case 'Courier New':
      return '"Courier New", Courier, monospace';
    default:
      return '"Plus Jakarta Sans", system-ui, sans-serif';
  }
}

/**
 * Replaces tokens in string like "{{OE_Number}}" or "{Part Name}" with actual row values.
 * Uses case-insensitive and whitespace-tolerant matching.
 */
export function interpolateTokens(
  template: string,
  row: Record<string, string | number> | undefined,
  rowIndex: number = 0,
  counterStart: number = 1
): string {
  if (!template) return '';
  if (!row) return template;

  // Pre-index row keys with normalized lowercase/trimmed versions
  const normalizedRowMap: Record<string, string | number> = {};
  Object.entries(row).forEach(([k, v]) => {
    const cleanKey = k.toLowerCase().replace(/[\s_-]+/g, '');
    normalizedRowMap[cleanKey] = v;
    normalizedRowMap[k.toLowerCase()] = v;
  });

  return template.replace(/\{\{\s*([^}]+)\s*\}\}|\{\s*([^}]+)\s*\}/g, (match, p1, p2) => {
    const rawKey = (p1 || p2 || '').trim();
    if (!rawKey) return match;

    // Special variables
    if (rawKey.toLowerCase() === 'index' || rawKey.toLowerCase() === 'row') {
      return String(rowIndex + 1);
    }
    if (rawKey.toLowerCase() === 'counter') {
      return String(counterStart + rowIndex);
    }
    if (rawKey.toLowerCase() === 'date' || rawKey.toLowerCase() === 'today') {
      return new Date().toISOString().split('T')[0];
    }

    // Direct key match
    if (row[rawKey] !== undefined) {
      return String(row[rawKey]);
    }

    // Normalized match
    const lookupKey = rawKey.toLowerCase().replace(/[\s_-]+/g, '');
    if (normalizedRowMap[lookupKey] !== undefined) {
      return String(normalizedRowMap[lookupKey]);
    }

    // Fallback: return token or empty
    return match;
  });
}

/**
 * Loads an HTMLImageElement safely from URL or DataURI
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image from source: ${err}`));
    img.src = src;
  });
}

export interface CanvasRenderOptions {
  /** Omit the template artwork and white fill, leaving a transparent canvas. */
  transparentBackground?: boolean;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawShapeElement(
  ctx: CanvasRenderingContext2D,
  element: ShapeElementConfig,
  elX: number,
  elY: number,
  elW: number,
  elH: number,
  scale: number
): void {
  const strokeWidth = Math.max(0, element.strokeWidth ?? 0) * scale;
  const inset = strokeWidth / 2;
  const x = elX + inset;
  const y = elY + inset;
  const width = Math.max(0, elW - strokeWidth);
  const height = Math.max(0, elH - strokeWidth);
  const radius = Math.max(0, (element.borderRadius ?? 0) * scale);

  ctx.save();
  ctx.globalAlpha = element.opacity ?? 1;
  ctx.fillStyle = element.fillColor || 'transparent';
  ctx.strokeStyle = element.strokeColor || '#000000';
  ctx.lineWidth = Math.max(strokeWidth, element.shape === 'line' ? scale : 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  switch (element.shape) {
    case 'ellipse':
      ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
    case 'line':
      ctx.moveTo(x, centerY);
      ctx.lineTo(x + width, centerY);
      break;
    case 'triangle':
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + width, centerY);
      ctx.lineTo(centerX, y + height);
      ctx.lineTo(x, centerY);
      ctx.closePath();
      break;
    case 'star': {
      const outerX = width / 2;
      const outerY = height / 2;
      const innerX = outerX * 0.45;
      const innerY = outerY * 0.45;
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const rx = i % 2 === 0 ? outerX : innerX;
        const ry = i % 2 === 0 ? outerY : innerY;
        const px = centerX + Math.cos(angle) * rx;
        const py = centerY + Math.sin(angle) * ry;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'arrow':
      ctx.moveTo(x, y + height * 0.32);
      ctx.lineTo(x + width * 0.58, y + height * 0.32);
      ctx.lineTo(x + width * 0.58, y);
      ctx.lineTo(x + width, centerY);
      ctx.lineTo(x + width * 0.58, y + height);
      ctx.lineTo(x + width * 0.58, y + height * 0.68);
      ctx.lineTo(x, y + height * 0.68);
      ctx.closePath();
      break;
    case 'rounded-rectangle':
    case 'rectangle':
    default:
      roundedRectPath(ctx, x, y, width, height, radius);
      break;
  }

  if (element.shape !== 'line' && element.fillColor && element.fillColor !== 'transparent') {
    ctx.fill();
  }
  if (ctx.lineWidth > 0) {
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Renders a single label into an offscreen HTMLCanvasElement
 */
export async function renderLabelToCanvas(
  template: LabelTemplate,
  elements: CanvasElement[],
  row: Record<string, string | number> | undefined,
  rowIndex: number = 0,
  scale: number = 1,
  options: CanvasRenderOptions = {}
): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue with whatever fonts are available.
    }
  }

  const width = Math.round(template.originalWidth * scale);
  const height = Math.round(template.originalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D canvas context');
  }

  // High quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw Background Template Image
  if (!options.transparentBackground) {
    if (template.backgroundUrl) {
      try {
        const bgImg = await loadImage(template.backgroundUrl);
        ctx.drawImage(bgImg, 0, 0, width, height);
      } catch {
        // Fallback clean white canvas with subtle border if image fails
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(4 * scale, 4 * scale, width - 8 * scale, height - 8 * scale);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
  }

  // 2. Render Canvas Elements
  for (const element of elements) {
    if (element.visible === false) continue;

    const elX = Math.round(element.x * scale);
    const elY = Math.round(element.y * scale);
    const elW = Math.round(element.width * scale);
    const elH = Math.round(element.height * scale);

    if (element.type === 'text' || element.type === 'static-text' || element.type === 'counter') {
      const textConfig = element as TextElementConfig;
      const interpolated = interpolateTokens(
        textConfig.templateString,
        row,
        rowIndex,
        textConfig.counterStart || 1
      );

      ctx.save();

      // Optional background fill
      if (textConfig.backgroundColor && textConfig.backgroundColor !== 'transparent') {
        ctx.fillStyle = textConfig.backgroundColor;
        ctx.fillRect(elX, elY, elW, elH);
      }

      const fontStack = getFontFamilyStack(textConfig.fontFamily);
      const fontStyle = textConfig.fontStyle === 'italic' ? 'italic ' : '';
      const fontSizePx = Math.round(textConfig.fontSize * scale);
      ctx.font = `${fontStyle}${textConfig.fontWeight || '400'} ${fontSizePx}px ${fontStack}`;
      ctx.fillStyle = textConfig.color || '#000000';
      ctx.textBaseline = 'top';
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${
        (textConfig.letterSpacing ?? 0) * scale
      }px`;

      let textToDraw = interpolated;
      if (textConfig.textTransform === 'uppercase') {
        textToDraw = textToDraw.toUpperCase();
      } else if (textConfig.textTransform === 'lowercase') {
        textToDraw = textToDraw.toLowerCase();
      } else if (textConfig.textTransform === 'capitalize') {
        textToDraw = textToDraw.replace(/\b\w/g, (char) => char.toUpperCase());
      }

      // Handle alignment
      let drawX = elX;
      if (textConfig.textAlign === 'center') {
        ctx.textAlign = 'center';
        drawX = elX + elW / 2;
      } else if (textConfig.textAlign === 'right') {
        ctx.textAlign = 'right';
        drawX = elX + elW;
      } else {
        ctx.textAlign = 'left';
        drawX = elX;
      }

      // Handle multiline text with \n
      const lines = textToDraw.split('\n');
      const lineHeightPx = Math.round((textConfig.lineHeight || 1.25) * textConfig.fontSize * scale);
      const outlineWidth = (textConfig.strokeWidth ?? 0) * scale;

      lines.forEach((line, lineIndex) => {
        const lineY = elY + lineIndex * lineHeightPx;

        if (outlineWidth > 0) {
          ctx.strokeStyle = textConfig.strokeColor || textConfig.color || '#000000';
          ctx.lineWidth = outlineWidth;
          ctx.lineJoin = 'round';
          ctx.strokeText(line, drawX, lineY);
        }
        ctx.fillText(line, drawX, lineY);

        if (textConfig.textDecoration && textConfig.textDecoration !== 'none') {
          const textWidth = ctx.measureText(line).width;
          let startX = drawX;
          if (textConfig.textAlign === 'center') startX = drawX - textWidth / 2;
          else if (textConfig.textAlign === 'right') startX = drawX - textWidth;

          const decorationY =
            lineY +
            (textConfig.textDecoration === 'underline'
              ? fontSizePx * 1.02
              : fontSizePx * 0.58);

          ctx.save();
          ctx.strokeStyle = textConfig.color || '#000000';
          ctx.lineWidth = Math.max(1, fontSizePx * 0.06);
          ctx.beginPath();
          ctx.moveTo(startX, decorationY);
          ctx.lineTo(startX + textWidth, decorationY);
          ctx.stroke();
          ctx.restore();
        }
      });

      ctx.restore();
    } else if (element.type === 'image') {
      const imageConfig = element as ImageElementConfig;
      let imgSrc = imageConfig.src;

      // Dynamic source from Excel column if configured
      if (imageConfig.columnSource) {
        const dynamicSrc = getRowValue(row, imageConfig.columnSource);
        if (dynamicSrc) imgSrc = dynamicSrc;
      }

      if (imgSrc) {
        try {
          const img = await loadImage(imgSrc);
          ctx.save();

          if (imageConfig.opacity !== undefined && imageConfig.opacity < 1) {
            ctx.globalAlpha = imageConfig.opacity;
          }

          // Object fit calculation
          const fit = imageConfig.objectFit || 'contain';
          if (fit === 'fill') {
            ctx.drawImage(img, elX, elY, elW, elH);
          } else {
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const boxAspect = elW / elH;
            let drawW = elW;
            let drawH = elH;
            let drawX = elX;
            let drawY = elY;

            if (fit === 'contain') {
              if (imgAspect > boxAspect) {
                drawH = elW / imgAspect;
                drawY = elY + (elH - drawH) / 2;
              } else {
                drawW = elH * imgAspect;
                drawX = elX + (elW - drawW) / 2;
              }
            } else if (fit === 'cover') {
              // Clip to element boundary
              ctx.beginPath();
              ctx.rect(elX, elY, elW, elH);
              ctx.clip();

              if (imgAspect > boxAspect) {
                drawW = elH * imgAspect;
                drawX = elX + (elW - drawW) / 2;
              } else {
                drawH = elW / imgAspect;
                drawY = elY + (elH - drawH) / 2;
              }
            }

            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }

          ctx.restore();
        } catch (e) {
          console.warn('Image draw failed', e);
        }
      }
    } else if (element.type === 'shape') {
      drawShapeElement(ctx, element as ShapeElementConfig, elX, elY, elW, elH, scale);
    } else if (element.type === 'barcode') {
      const barcodeConfig = element as BarcodeElementConfig;
      const rawBarcodeVal = getRowValue(row, barcodeConfig.columnSource);
      if (!rawBarcodeVal) continue;

      const { dataUrl } = generateBarcodeDataUrl(rawBarcodeVal, {
        format: barcodeConfig.barcodeFormat,
        displayValue: barcodeConfig.displayValue !== false,
        fontSize: Math.round(barcodeConfig.fontSize * scale),
        lineColor: barcodeConfig.lineColor || '#000000',
        backgroundColor: barcodeConfig.backgroundColor || '#ffffff',
        margin: Math.round((barcodeConfig.margin ?? 2) * scale),
        width: elW,
        height: elH,
      });

      if (dataUrl) {
        try {
          const barcodeImg = await loadImage(dataUrl);
          ctx.drawImage(barcodeImg, elX, elY, elW, elH);
        } catch (e) {
          console.warn('Barcode draw failed', e);
        }
      }
    } else if (element.type === 'qr') {
      const qrConfig = element as QRElementConfig;
      const text = interpolateTokens(qrConfig.templateString, row, rowIndex);
      if (!text.trim()) continue;

      const dataUrl = generateQrDataUrl(
        text,
        Math.max(32, Math.min(elW, elH)),
        qrConfig.color || '#0f172a',
        qrConfig.backgroundColor || '#ffffff',
        qrConfig.errorCorrectionLevel || 'M'
      );
      if (dataUrl) {
        try {
          const qrImg = await loadImage(dataUrl);
          ctx.drawImage(qrImg, elX, elY, elW, elH);
        } catch (e) {
          console.warn('QR draw failed', e);
        }
      }
    }
  }

  return canvas;
}
