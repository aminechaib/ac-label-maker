import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { BarcodeFormat } from '../types/label';

/**
 * Calculates standard EAN-13 checksum digit for a 12-digit numeric string
 */
export function calculateEan13Checksum(first12: string): number {
  if (!/^\d{12}$/.test(first12)) return 0;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

/**
 * Validates and normalizes string for target barcode format.
 */
export function normalizeBarcodeValue(val: string | number | undefined, format: BarcodeFormat): { value: string; isValid: boolean; message?: string } {
  const raw = String(val ?? '').trim();
  if (!raw) {
    return { value: '', isValid: false, message: 'Empty barcode value' };
  }

  // Digits only extraction if EAN
  const digitsOnly = raw.replace(/\D/g, '');

  switch (format) {
    case 'EAN13': {
      if (digitsOnly.length === 12) {
        const check = calculateEan13Checksum(digitsOnly);
        return { value: digitsOnly + check, isValid: true };
      } else if (digitsOnly.length === 13) {
        const prefix = digitsOnly.substring(0, 12);
        const expectedCheck = calculateEan13Checksum(prefix);
        const actualCheck = parseInt(digitsOnly[12], 10);
        if (expectedCheck !== actualCheck) {
          // auto fix checksum so JsBarcode won't throw
          return { value: prefix + expectedCheck, isValid: true, message: `Adjusted check digit to ${expectedCheck}` };
        }
        return { value: digitsOnly, isValid: true };
      } else if (digitsOnly.length > 0) {
        // Pad with zeros to 12 digits + checksum
        const padded = digitsOnly.padStart(12, '0').slice(-12);
        const check = calculateEan13Checksum(padded);
        return { value: padded + check, isValid: true, message: `Padded ${digitsOnly.length} digits to 13-digit EAN` };
      }
      return { value: '', isValid: false, message: 'Invalid EAN-13 (needs numbers)' };
    }

    case 'EAN8': {
      if (digitsOnly.length === 7 || digitsOnly.length === 8) {
        return { value: digitsOnly.slice(0, 8).padStart(8, '0'), isValid: true };
      }
      return { value: digitsOnly.padStart(8, '0').slice(-8), isValid: false, message: 'Requires 8 digits' };
    }

    case 'UPC': {
      if (digitsOnly.length >= 11) {
        return { value: digitsOnly.slice(0, 12).padStart(12, '0'), isValid: true };
      }
      return { value: digitsOnly.padStart(12, '0'), isValid: false, message: 'Requires 12 digits' };
    }

    case 'CODE128':
    case 'CODE39':
    case 'ITF':
    default:
      return { value: raw, isValid: true };
  }
}

/**
 * Renders barcode to an SVG string or data URL
 */
export function generateBarcodeDataUrl(
  text: string,
  options: {
    format: BarcodeFormat;
    displayValue: boolean;
    fontSize?: number;
    lineColor?: string;
    backgroundColor?: string;
    margin?: number;
    width?: number;
    height?: number;
  }
): { dataUrl: string; error?: string } {
  try {
    const normalized = normalizeBarcodeValue(text, options.format);
    if (!normalized.value) {
      return { dataUrl: '', error: normalized.message || 'Empty barcode value' };
    }

    const canvas = document.createElement('canvas');
    JsBarcode(canvas, normalized.value, {
      format: options.format,
      displayValue: options.displayValue,
      font: 'JetBrains Mono',
      fontSize: options.fontSize || 13,
      lineColor: options.lineColor || '#000000',
      background: options.backgroundColor || 'transparent',
      margin: options.margin !== undefined ? options.margin : 2,
      height: Math.max(24, (options.height || 40) - (options.displayValue ? 16 : 4)),
      width: 2,
      valid: () => {},
    });

    return { dataUrl: canvas.toDataURL('image/png') };
  } catch (err) {
    // If the selected format failed, try CODE128 with the original value.
    const fallbackValue = String(text ?? '').trim();
    if (!fallbackValue) {
      return { dataUrl: '', error: (err as Error).message };
    }

    try {
      const fallbackCanvas = document.createElement('canvas');
      JsBarcode(fallbackCanvas, fallbackValue, {
        format: 'CODE128',
        displayValue: options.displayValue,
        fontSize: options.fontSize || 12,
        lineColor: options.lineColor || '#000000',
        background: options.backgroundColor || 'transparent',
        margin: 2,
        height: Math.max(24, (options.height || 40) - 16),
        width: 2,
      });
      return { dataUrl: fallbackCanvas.toDataURL('image/png'), error: (err as Error).message };
    } catch {
      return { dataUrl: '', error: 'Barcode rendering failed' };
    }
  }
}

export interface QrVector {
  /** Number of modules including the quiet zone. */
  totalModules: number;
  /** SVG path data drawing one unit square per dark module. */
  path: string;
}

/**
 * Builds the QR code as vector data. Used by the designer and SVG export so the
 * code stays sharp at any size and never becomes a dragged bitmap.
 */
export function generateQrPath(
  text: string,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'
): QrVector | null {
  try {
    const qr = QRCode.create(text || ' ', { errorCorrectionLevel });
    const modules = qr.modules;
    const moduleCount = modules.size;
    const quietZone = 4;
    const totalModules = moduleCount + quietZone * 2;

    let path = '';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!modules.get(row, col)) continue;
        path += `M${col + quietZone} ${row + quietZone}h1v1h-1z`;
      }
    }

    return { totalModules, path };
  } catch {
    return null;
  }
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateQrSvg(
  text: string,
  size = 100,
  darkColor = '#0f172a',
  lightColor = '#ffffff',
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'
): string {
  const qr = generateQrPath(text, errorCorrectionLevel);
  if (!qr) return '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${qr.totalModules} ${qr.totalModules}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><rect width="${qr.totalModules}" height="${qr.totalModules}" fill="${escapeXmlAttribute(
    lightColor
  )}"/><path d="${qr.path}" fill="${escapeXmlAttribute(darkColor)}"/></svg>`;
}

/**
 * Renders a real, scannable QR code as a vector SVG data URL.
 * Canvas rendering may still rasterize this when producing PNG/PDF output.
 */
export function generateQrDataUrl(
  text: string,
  size = 100,
  darkColor = '#0f172a',
  lightColor = '#ffffff',
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'
): string {
  const svg = generateQrSvg(text, size, darkColor, lightColor, errorCorrectionLevel);
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : '';
}
