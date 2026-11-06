import JSZip from 'jszip';
import JsBarcode from 'jsbarcode';
import {
  BarcodeElementConfig,
  CanvasElement,
  ImageElementConfig,
  LabelTemplate,
  QRElementConfig,
  ShapeElementConfig,
  TextElementConfig,
} from '../types/label';
import { generateBarcodeDataUrl, generateQrPath, normalizeBarcodeValue } from './barcode';
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
  const fontStyle = element.fontStyle === 'italic' ? ' font-style="italic"' : '';
  const textDecoration =
    element.textDecoration && element.textDecoration !== 'none'
      ? ` text-decoration="${element.textDecoration}"`
      : '';
  const outline =
    (element.strokeWidth ?? 0) > 0
      ? ` stroke="${escapeXml(element.strokeColor || element.color || '#000000')}" stroke-width="${toCssLength(
          element.strokeWidth || 0
        )}" paint-order="stroke fill"`
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
    )}" text-anchor="${textAnchor}" dominant-baseline="text-before-edge"${letterSpacing}${fontStyle}${textDecoration}${outline}>${tspans}</text>`
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

  const qr = generateQrPath(text, element.errorCorrectionLevel || 'M');
  if (!qr) return '';

  return `<svg x="${toCssLength(element.x)}" y="${toCssLength(element.y)}" width="${toCssLength(
    element.width
  )}" height="${toCssLength(element.height)}" viewBox="0 0 ${qr.totalModules} ${
    qr.totalModules
  }" preserveAspectRatio="none"><rect width="${qr.totalModules}" height="${
    qr.totalModules
  }" fill="${escapeXml(element.backgroundColor || '#ffffff')}"/><path d="${
    qr.path
  }" fill="${escapeXml(element.color || '#0f172a')}" shape-rendering="crispEdges"/></svg>`;
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

function getStarPointsSvg(width: number, height: number, inset: number): string {
  const cx = width / 2;
  const cy = height / 2;
  const outerX = Math.max(1, (width - inset * 2) / 2);
  const outerY = Math.max(1, (height - inset * 2) / 2);
  const innerX = outerX * 0.45;
  const innerY = outerY * 0.45;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rx = i % 2 === 0 ? outerX : innerX;
    const ry = i % 2 === 0 ? outerY : innerY;
    points.push(`${toCssLength(cx + Math.cos(angle) * rx)},${toCssLength(cy + Math.sin(angle) * ry)}`);
  }
  return points.join(' ');
}

function renderShapeElement(element: ShapeElementConfig): string {
  const width = Math.max(1, element.width);
  const height = Math.max(1, element.height);
  const strokeWidth = Math.max(0, element.strokeWidth ?? 0);
  const inset = strokeWidth / 2;
  const innerWidth = Math.max(0, width - strokeWidth);
  const innerHeight = Math.max(0, height - strokeWidth);
  const radius = Math.max(0, Math.min(element.borderRadius ?? 0, innerWidth / 2, innerHeight / 2));
  const shared = `fill="${escapeXml(element.fillColor || 'transparent')}" stroke="${escapeXml(
    element.strokeColor || '#000000'
  )}" stroke-width="${toCssLength(strokeWidth)}" stroke-linejoin="round" stroke-linecap="round"`;

  let shapeNode = '';
  switch (element.shape) {
    case 'ellipse':
      shapeNode = `<ellipse cx="${toCssLength(width / 2)}" cy="${toCssLength(
        height / 2
      )}" rx="${toCssLength(innerWidth / 2)}" ry="${toCssLength(innerHeight / 2)}" ${shared}/>`;
      break;
    case 'line':
      shapeNode = `<line x1="${toCssLength(inset)}" y1="${toCssLength(height / 2)}" x2="${toCssLength(
        width - inset
      )}" y2="${toCssLength(height / 2)}" stroke="${escapeXml(
        element.strokeColor || '#000000'
      )}" stroke-width="${toCssLength(
        Math.max(strokeWidth, 1)
      )}" stroke-linecap="round"/>`;
      break;
    case 'triangle':
      shapeNode = `<polygon points="${toCssLength(width / 2)},${toCssLength(inset)} ${toCssLength(
        width - inset
      )},${toCssLength(height - inset)} ${toCssLength(inset)},${toCssLength(
        height - inset
      )}" ${shared}/>`;
      break;
    case 'diamond':
      shapeNode = `<polygon points="${toCssLength(width / 2)},${toCssLength(inset)} ${toCssLength(
        width - inset
      )},${toCssLength(height / 2)} ${toCssLength(width / 2)},${toCssLength(
        height - inset
      )} ${toCssLength(inset)},${toCssLength(height / 2)}" ${shared}/>`;
      break;
    case 'star':
      shapeNode = `<polygon points="${getStarPointsSvg(width, height, inset)}" ${shared}/>`;
      break;
    case 'arrow': {
      const x = inset;
      const y = inset;
      const w = innerWidth;
      const h = innerHeight;
      shapeNode = `<polygon points="${toCssLength(x)},${toCssLength(y + h * 0.32)} ${toCssLength(
        x + w * 0.58
      )},${toCssLength(y + h * 0.32)} ${toCssLength(x + w * 0.58)},${toCssLength(y)} ${toCssLength(
        x + w
      )},${toCssLength(y + h / 2)} ${toCssLength(x + w * 0.58)},${toCssLength(
        y + h
      )} ${toCssLength(x + w * 0.58)},${toCssLength(y + h * 0.68)} ${toCssLength(
        x
      )},${toCssLength(y + h * 0.68)}" ${shared}/>`;
      break;
    }
    case 'rounded-rectangle':
    case 'rectangle':
    default:
      shapeNode = `<rect x="${toCssLength(inset)}" y="${toCssLength(inset)}" width="${toCssLength(
        innerWidth
      )}" height="${toCssLength(innerHeight)}" rx="${toCssLength(radius)}" ry="${toCssLength(
        radius
      )}" ${shared}/>`;
      break;
  }

  return `<g transform="translate(${toCssLength(element.x)}, ${toCssLength(
    element.y
  )})" opacity="${element.opacity ?? 1}">${shapeNode}</g>`;
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
    } else if (element.type === 'shape') {
      parts.push(renderShapeElement(element as ShapeElementConfig));
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
