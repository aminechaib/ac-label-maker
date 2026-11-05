import JSZip from 'jszip';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  BarcodeElementConfig,
  CanvasElement,
  ImageElementConfig,
  LabelTemplate,
  QRElementConfig,
  TextElementConfig,
} from '../types/label';
import { generateBarcodeDataUrl, normalizeBarcodeValue } from './barcode';
import { getFontFamilyStack, interpolateTokens } from './renderer';
import { getFirstRowValue, getRowValue } from './row';
import { ProgressCallback } from './pdfExport';

export interface SvgRenderOptions {
  /** Omit the template artwork and white canvas fill, leaving only placed elements. */
  transparentBackground?: boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function escapeXml(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toCssLength(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function applyTextTransform(value: string, transform: TextElementConfig['textTransform']): string {
  if (transform === 'uppercase') return value.toUpperCase();
  if (transform === 'lowercase') return value.toLowerCase();
  if (transform === 'capitalize') return value.replace(/\b\w/g, (char) => char.toUpperCase());
  return value;
}

function renderTextElement(element: TextElementConfig, row: Record<string, string | number> | undefined, rowIndex: number): string {
  const text = applyTextTransform(
    interpolateTokens(element.templateString, row, rowIndex, element.counterStart || 1),
    element.textTransform
  );
  if (!text) return '';

  const parts: string[] = [];
  if (element.backgroundColor && element.backgroundColor !== 'transparent') {
    parts.push(
      `<rect x="${toCssLength(element.x)}" y="${toCssLength(element.y)}" width="${toCssLength(
        element.width
      )}" height="${toCssLength(element.height)}" fill="${escapeXml(element.backgroundColor)}"/>`
    );
  }

  let anchorX = element.x;
  let textAnchor = 'start';
  if (element.textAlign === 'center') {
    anchorX = element.x + element.width / 2;
    textAnchor = 'middle';
  } else if (element.textAlign === 'right') {
    anchorX = element.x + element.width;
    textAnchor = 'end';
  }

  const fontSize = element.fontSize;
  const lineHeight = (element.lineHeight || 1.25) * fontSize;
  const letterSpacing =
    element.letterSpacing !== undefined && element.letterSpacing !== 0
      ? ` letter-spacing="${toCssLength(element.letterSpacing)}"`
      : '';

  const lines = text.split('\n');
  const tspans = lines
    .map((line, index) => {
      const y = element.y + index * lineHeight;
      return `<tspan x="${toCssLength(anchorX)}" y="${toCssLength(y)}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  parts.push(
    `<text font-family="${escapeXml(getFontFamilyStack(element.fontFamily))}" font-size="${toCssLength(
      fontSize
    )}" font-weight="${escapeXml(element.fontWeight || '400')}" fill="${escapeXml(
      element.color || '#000000'
    )}" text-anchor="${textAnchor}" dominant-baseline="text-before-edge"${letterSpacing}>${tspans}</text>`
  );

  return parts.join('');
}

function renderBarcodeElement(
  element: BarcodeElementConfig,
  row: Record<string, string | number> | undefined
): string {
  const rawValue = getRowValue(row, element.columnSource);
  if (!rawValue) return '';

  const normalized = normalizeBarcodeValue(rawValue, element.barcodeFormat);
  if (!normalized.value) return '';

  try {
    const svg = document.createElementNS(SVG_NS, 'svg');
    JsBarcode(svg, normalized.value, {
      format: element.barcodeFormat,
      displayValue: element.displayValue !== false,
      font: 'JetBrains Mono',
      fontSize: element.fontSize || 13,
      lineColor: element.lineColor || '#000000',
      background: element.backgroundColor || 'transparent',
      margin: element.margin ?? 2,
      height: Math.max(24, element.height - (element.displayValue ? 16 : 4)),
      width: 2,
      xmlDocument: document,
      valid: () => {},
    });

    const nativeWidth = parseFloat(svg.getAttribute('width') || '0') || element.width;
    const nativeHeight = parseFloat(svg.getAttribute('height') || '0') || element.height;

    svg.setAttribute('x', toCssLength(element.x));
    svg.setAttribute('y', toCssLength(element.y));
    svg.setAttribute('width', toCssLength(element.width));
    svg.setAttribute('height', toCssLength(element.height));
    svg.setAttribute('viewBox', `0 0 ${nativeWidth} ${nativeHeight}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('xmlns', SVG_NS);

    return new XMLSerializer().serializeToString(svg);
  } catch {
    // Fall back to the raster renderer so a barcode never silently disappears.
    const { dataUrl } = generateBarcodeDataUrl(rawValue, {
      format: element.barcodeFormat,
      displayValue: element.displayValue !== false,
      fontSize: element.fontSize || 13,
      lineColor: element.lineColor || '#000000',
      backgroundColor: element.backgroundColor || 'transparent',
      margin: element.margin ?? 2,
      width: element.width,
      height: element.height,
    });
    if (!dataUrl) return '';
    return `<image href="${escapeXml(dataUrl)}" x="${toCssLength(element.x)}" y="${toCssLength(
      element.y
    )}" width="${toCssLength(element.width)}" height="${toCssLength(
      element.height
    )}" preserveAspectRatio="none"/>`;
  }
}

function renderQrElement(
  element: QRElementConfig,
  row: Record<string, string | number> | undefined,
  rowIndex: number
): string {
  const text = interpolateTokens(element.templateString, row, rowIndex);
  if (!text.trim()) return '';

  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const moduleCount = qr.modules.size;
    const quietZone = 4;
    const total = moduleCount + quietZone * 2;

    let path = '';
    for (let rowIndexQr = 0; rowIndexQr < moduleCount; rowIndexQr++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.modules.get(rowIndexQr, col)) {
          path += `M${col + quietZone} ${rowIndexQr + quietZone}h1v1h-1z`;
        }
      }
    }

    return `<svg x="${toCssLength(element.x)}" y="${toCssLength(element.y)}" width="${toCssLength(
      element.width
    )}" height="${toCssLength(element.height)}" viewBox="0 0 ${total} ${total}" preserveAspectRatio="none"><rect width="${total}" height="${total}" fill="${escapeXml(
      element.backgroundColor || '#ffffff'
    )}"/><path d="${path}" fill="${escapeXml(element.color || '#0f172a')}" shape-rendering="crispEdges"/></svg>`;
  } catch {
    return '';
  }
}

function renderImageElement(
  element: ImageElementConfig,
  row: Record<string, string | number> | undefined,
  rowIndex: number
): string {
  let src = element.src;
  if (element.columnSource) {
    const dynamicSrc = getRowValue(row, element.columnSource);
    if (dynamicSrc) src = dynamicSrc;
  }
  if (!src) return '';

  const preserveAspectRatio =
    element.objectFit === 'fill' ? 'none' : element.objectFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';
  const opacity = element.opacity !== undefined && element.opacity < 1 ? ` opacity="${element.opacity}"` : '';
  const radius = element.borderRadius || 0;
  const clipId = radius > 0 ? `clip_${element.id.replace(/[^a-zA-Z0-9_-]/g, '_')}_${rowIndex}` : '';
  const clipPath =
    radius > 0
      ? `<defs><clipPath id="${clipId}"><rect x="${toCssLength(element.x)}" y="${toCssLength(
          element.y
        )}" width="${toCssLength(element.width)}" height="${toCssLength(
          element.height
        )}" rx="${toCssLength(radius)}" ry="${toCssLength(radius)}"/></clipPath></defs>`
      : '';
  const clipAttr = radius > 0 ? ` clip-path="url(#${clipId})"` : '';

  return `${clipPath}<image href="${escapeXml(src)}" x="${toCssLength(element.x)}" y="${toCssLength(
    element.y
  )}" width="${toCssLength(element.width)}" height="${toCssLength(
    element.height
  )}" preserveAspectRatio="${preserveAspectRatio}"${opacity}${clipAttr}/>`;
}

/**
 * Renders a label as a self-contained SVG string. Text, QR codes, and barcodes
 * stay vector-based; the template artwork and placed pictures are embedded.
 */
export async function renderLabelToSvg(
  template: LabelTemplate,
  elements: CanvasElement[],
  row: Record<string, string | number> | undefined,
  rowIndex: number = 0,
  options: SvgRenderOptions = {}
): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue with the fonts that are available.
    }
  }

  const width = template.originalWidth;
  const height = template.originalHeight;
  const parts: string[] = [];

  if (!options.transparentBackground) {
    if (template.backgroundUrl) {
      parts.push(
        `<image href="${escapeXml(template.backgroundUrl)}" x="0" y="0" width="${toCssLength(
          width
        )}" height="${toCssLength(height)}" preserveAspectRatio="none"/>`
      );
    } else {
      parts.push(`<rect width="${toCssLength(width)}" height="${toCssLength(height)}" fill="#ffffff"/>`);
    }
  }

  for (const element of elements) {
    if (element.visible === false) continue;

    if (element.type === 'text' || element.type === 'static-text' || element.type === 'counter') {
      parts.push(renderTextElement(element as TextElementConfig, row, rowIndex));
    } else if (element.type === 'barcode') {
      parts.push(renderBarcodeElement(element as BarcodeElementConfig, row));
    } else if (element.type === 'qr') {
      parts.push(renderQrElement(element as QRElementConfig, row, rowIndex));
    } else if (element.type === 'image') {
      parts.push(renderImageElement(element as ImageElementConfig, row, rowIndex));
    }
  }

  return `<svg xmlns="${SVG_NS}" width="${toCssLength(width)}" height="${toCssLength(
    height
  )}" viewBox="0 0 ${toCssLength(width)} ${toCssLength(height)}"><title>${escapeXml(
    template.name
  )}</title>${parts.join('')}</svg>`;
}

function safeRowLabel(row: Record<string, string | number>): string {
  const preferredColumns = ['OE_Number', 'OE Number', 'Part_Number', 'Part_Name', 'Part Name', 'Barcode'];
  return getFirstRowValue(row, [...preferredColumns, ...Object.keys(row)])
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function downloadLabelSvg(
  template: LabelTemplate,
  elements: CanvasElement[],
  row: Record<string, string | number> | undefined,
  rowIndex: number,
  options: SvgRenderOptions = {}
): Promise<void> {
  const svg = await renderLabelToSvg(template, elements, row, rowIndex, options);
  const label = safeRowLabel(row || {}) || 'label';
  triggerBlobDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `Label_${label}.svg`);
}

export async function exportLabelsToSvgZip(
  template: LabelTemplate,
  elements: CanvasElement[],
  rows: Record<string, string | number>[],
  options: SvgRenderOptions = {},
  onProgress?: ProgressCallback
): Promise<void> {
  const total = rows.length;
  if (total === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('vector_labels') || zip;
  const manifestRows: string[][] = [];

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    onProgress?.(i + 1, total, `Generating vector SVG for item ${i + 1} of ${total}...`);
    const svg = await renderLabelToSvg(template, elements, row, i, options);

    const safeLabel = safeRowLabel(row);
    const filename = `label_${String(i + 1).padStart(3, '0')}${safeLabel ? `_${safeLabel}` : ''}.svg`;
    folder.file(filename, svg);
    manifestRows.push([filename, ...Object.values(row).map((value) => String(value))]);
  }

  const headers = Object.keys(rows[0] || {});
  const escapeCsvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const manifest = [
    ['filename', ...headers].map(escapeCsvCell).join(','),
    ...manifestRows.map((values) => values.map(escapeCsvCell).join(',')),
  ].join('\n');
  folder.file('labels.csv', manifest);

  onProgress?.(total, total, 'Compressing vector SVG archive...');
  const content = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(content, `Vector_Labels_${total}_Items.zip`);
}
