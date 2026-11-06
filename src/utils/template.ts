import {
  BarcodeElementConfig,
  CanvasElement,
  LabelTemplate,
  QRElementConfig,
  ShapeElementConfig,
  ShapeType,
  TextElementConfig,
} from '../types/label';

export function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

export type StarterDesignId = 'product' | 'shipping' | 'inventory' | 'qr-badge';

function makeText(
  id: string,
  name: string,
  templateString: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<TextElementConfig> = {}
): TextElementConfig {
  return {
    id,
    name,
    type: 'text',
    templateString,
    x,
    y,
    width,
    height,
    fontSize: 18,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'left',
    lineHeight: 1.2,
    ...overrides,
  };
}

function makeShape(
  id: string,
  name: string,
  shape: ShapeType,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<ShapeElementConfig> = {}
): ShapeElementConfig {
  return {
    id,
    name,
    type: 'shape',
    shape,
    x,
    y,
    width,
    height,
    fillColor: 'transparent',
    strokeColor: '#cbd5e1',
    strokeWidth: 2,
    borderRadius: 12,
    opacity: 1,
    ...overrides,
  };
}

function makeBarcode(
  id: string,
  columnSource: string,
  x: number,
  y: number,
  width: number,
  height: number,
  format: BarcodeElementConfig['barcodeFormat'] = 'CODE128'
): BarcodeElementConfig {
  return {
    id,
    name: `${columnSource || 'Barcode'} Field`,
    type: 'barcode',
    columnSource,
    barcodeFormat: format,
    displayValue: true,
    fontSize: 11,
    lineColor: '#0f172a',
    backgroundColor: '#ffffff',
    margin: 2,
    x,
    y,
    width,
    height,
  };
}

function makeQr(
  id: string,
  templateString: string,
  x: number,
  y: number,
  size: number
): QRElementConfig {
  return {
    id,
    name: 'QR Code',
    type: 'qr',
    templateString,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    errorCorrectionLevel: 'M',
    x,
    y,
    width: size,
    height: size,
  };
}

export function createStarterTemplate(
  width: number,
  height: number,
  design: StarterDesignId
): LabelTemplate {
  const base = createBlankTemplate(width, height);
  const w = base.originalWidth;
  const h = base.originalHeight;
  const pad = Math.round(Math.min(w, h) * 0.07);
  const borderWidth = Math.max(2, Math.round(Math.min(w, h) * 0.006));
  const elements: CanvasElement[] = [];

  if (design === 'product') {
    const qrSize = Math.round(Math.min(w, h) * 0.24);
    elements.push(
      makeShape('starter_border', 'Card Border', 'rounded-rectangle', 8, 8, w - 16, h - 16, {
        strokeColor: '#0f172a',
        strokeWidth: borderWidth,
        borderRadius: Math.round(Math.min(w, h) * 0.05),
      }),
      makeText('starter_kicker', 'Kicker', 'PRODUCT LABEL', pad, pad, w - pad * 2 - qrSize, 18, {
        fontSize: Math.max(10, Math.round(Math.min(w, h) * 0.028)),
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#64748b',
      }),
      makeText('starter_name', 'Part Name', '{{Part_Name}}', pad, Math.round(h * 0.2), w - pad * 2 - qrSize, Math.round(h * 0.18), {
        fontSize: Math.max(18, Math.round(Math.min(w, h) * 0.075)),
        fontWeight: '800',
        lineHeight: 1.05,
      }),
      makeText('starter_oe', 'OE Number', '{{OE_Number}}', pad, Math.round(h * 0.4), Math.round(w * 0.5), 22, {
        fontSize: Math.max(11, Math.round(Math.min(w, h) * 0.034)),
        color: '#475569',
        fontFamily: 'JetBrains Mono',
        fontWeight: '500',
      }),
      makeShape('starter_divider', 'Divider', 'line', pad, Math.round(h * 0.53), Math.round(w * 0.55), 4, {
        strokeColor: '#cbd5e1',
        strokeWidth: 2,
      }),
      makeBarcode('starter_barcode', 'Barcode', pad, Math.round(h * 0.62), Math.round(w * 0.62), Math.round(h * 0.27)),
      makeQr('starter_qr', '{{OE_Number}}', w - pad - qrSize, Math.round(h * 0.2), qrSize)
    );
  } else if (design === 'shipping') {
    const qrSize = Math.round(Math.min(w, h) * 0.28);
    elements.push(
      makeShape('starter_border', 'Label Border', 'rounded-rectangle', 8, 8, w - 16, h - 16, {
        strokeColor: '#0f172a',
        strokeWidth: borderWidth,
      }),
      makeText('starter_title', 'Title', 'SHIPPING LABEL', pad, pad, w - pad * 2, 18, {
        fontSize: Math.max(11, Math.round(Math.min(w, h) * 0.032)),
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#64748b',
      }),
      makeText('starter_oe', 'Shipment Reference', '{{OE_Number}}', pad, Math.round(h * 0.17), w - pad * 2 - qrSize - 16, Math.round(h * 0.2), {
        fontSize: Math.max(20, Math.round(Math.min(w, h) * 0.08)),
        fontWeight: '800',
        lineHeight: 1.05,
      }),
      makeText('starter_part', 'Part Name', '{{Part_Name}}', pad, Math.round(h * 0.4), w - pad * 2 - qrSize - 16, Math.round(h * 0.12), {
        fontSize: Math.max(12, Math.round(Math.min(w, h) * 0.038)),
        color: '#475569',
      }),
      makeShape('starter_divider', 'Divider', 'line', pad, Math.round(h * 0.55), w - pad * 2, 4, {
        strokeColor: '#cbd5e1',
        strokeWidth: 2,
      }),
      makeBarcode('starter_barcode', 'Barcode', pad, Math.round(h * 0.62), Math.round(w * 0.58), Math.round(h * 0.25)),
      makeQr('starter_qr', '{{OE_Number}}', w - pad - qrSize, Math.round(h * 0.35), qrSize)
    );
  } else if (design === 'inventory') {
    const headerHeight = Math.round(h * 0.16);
    elements.push(
      makeShape('starter_header', 'Header Bar', 'rectangle', 0, 0, w, headerHeight, {
        fillColor: '#0f172a',
        strokeColor: '#0f172a',
        strokeWidth: 0,
        borderRadius: 0,
      }),
      makeText('starter_title', 'Header Text', 'INVENTORY / BIN TAG', pad, Math.round(headerHeight * 0.3), w - pad * 2, Math.round(headerHeight * 0.5), {
        fontSize: Math.max(11, Math.round(Math.min(w, h) * 0.03)),
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#ffffff',
      }),
      makeText('starter_number', 'Part Number', '{{Part_Number}}', pad, Math.round(h * 0.22), w - pad * 2, Math.round(h * 0.22), {
        fontSize: Math.max(22, Math.round(Math.min(w, h) * 0.09)),
        fontWeight: '800',
        letterSpacing: 0.5,
      }),
      makeText('starter_name', 'Part Name', '{{Part_Name}}', pad, Math.round(h * 0.46), w - pad * 2, Math.round(h * 0.1), {
        fontSize: Math.max(11, Math.round(Math.min(w, h) * 0.035)),
        color: '#475569',
      }),
      makeShape('starter_divider', 'Divider', 'line', pad, Math.round(h * 0.58), w - pad * 2, 4, {
        strokeColor: '#cbd5e1',
        strokeWidth: 2,
      }),
      makeBarcode('starter_barcode', 'Barcode', pad, Math.round(h * 0.65), w - pad * 2, Math.round(h * 0.24))
    );
  } else {
    const qrSize = Math.round(Math.min(w, h) * 0.42);
    elements.push(
      makeShape('starter_card', 'Badge Card', 'rounded-rectangle', 8, 8, w - 16, h - 16, {
        fillColor: '#eff6ff',
        strokeColor: '#2563eb',
        strokeWidth: borderWidth,
        borderRadius: Math.round(Math.min(w, h) * 0.06),
      }),
      makeText('starter_title', 'Badge Title', 'SCAN FOR DETAILS', pad, pad, w - pad * 2, 18, {
        fontSize: Math.max(10, Math.round(Math.min(w, h) * 0.028)),
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: '#1d4ed8',
      }),
      makeText('starter_name', 'Part Name', '{{Part_Name}}', pad, Math.round(h * 0.24), w - pad * 2 - qrSize - 16, Math.round(h * 0.18), {
        fontSize: Math.max(15, Math.round(Math.min(w, h) * 0.058)),
        fontWeight: '800',
        lineHeight: 1.1,
      }),
      makeText('starter_oe', 'OE Number', '{{OE_Number}}', pad, Math.round(h * 0.48), w - pad * 2 - qrSize - 16, 22, {
        fontSize: Math.max(10, Math.round(Math.min(w, h) * 0.03)),
        fontFamily: 'JetBrains Mono',
        color: '#1e40af',
      }),
      makeQr('starter_qr', '{{OE_Number}}', w - pad - qrSize, Math.round((h - qrSize) / 2), qrSize)
    );
  }

  const designNames: Record<StarterDesignId, string> = {
    product: 'Product Label',
    shipping: 'Shipping Label',
    inventory: 'Bin / Inventory Tag',
    'qr-badge': 'QR Badge',
  };

  return { ...base, name: designNames[design], elements };
}

export function createBlankTemplate(width: number, height: number, name = 'Untitled Label'): LabelTemplate {
  const safeWidth = Math.max(100, Math.min(5000, Math.round(width)));
  const safeHeight = Math.max(100, Math.min(5000, Math.round(height)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${safeWidth} ${safeHeight}" width="${safeWidth}" height="${safeHeight}"><rect width="${safeWidth}" height="${safeHeight}" fill="#ffffff"/></svg>`;

  return {
    id: `blank_${Date.now()}`,
    name,
    backgroundUrl: svgToDataUrl(svg),
    originalWidth: safeWidth,
    originalHeight: safeHeight,
    aspectRatio: safeWidth / safeHeight,
    elements: [],
  };
}
