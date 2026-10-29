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

/**
 * Renders a real, scannable QR code to a PNG data URL.
 */
export function generateQrDataUrl(
  text: string,
  size = 100,
  darkColor = '#0f172a',
  lightColor = '#ffffff'
): string {
  try {
    const qr = QRCode.create(text || ' ', { errorCorrectionLevel: 'M' });
    const modules = qr.modules;
    const moduleCount = modules.size;
    const quietZone = 4;
    const totalModules = moduleCount + quietZone * 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = darkColor;

    const cellSize = size / totalModules;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!modules.get(row, col)) continue;
        const x = Math.floor((col + quietZone) * cellSize);
        const y = Math.floor((row + quietZone) * cellSize);
        const nextX = Math.floor((col + quietZone + 1) * cellSize);
        const nextY = Math.floor((row + quietZone + 1) * cellSize);
        ctx.fillRect(x, y, Math.max(1, nextX - x), Math.max(1, nextY - y));
      }
    }

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}
