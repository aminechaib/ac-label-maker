import { CanvasElement, ElementType, LabelTemplate } from '../types/label';

const TEMPLATE_FILE_FORMAT = 'ac-label-maker-template';
const TEMPLATE_FILE_VERSION = 1;

const ELEMENT_TYPES: ElementType[] = [
  'text',
  'barcode',
  'qr',
  'static-text',
  'counter',
  'image',
  'shape',
];

interface SavedTemplateFile {
  format: typeof TEMPLATE_FILE_FORMAT;
  version: number;
  savedAt: string;
  template: LabelTemplate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function slugifyFileName(name: string): string {
  const slug = name
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'label-template';
}

function normalizeElements(rawElements: unknown): CanvasElement[] {
  if (!Array.isArray(rawElements)) return [];

  return rawElements.flatMap((raw, index) => {
    if (!isRecord(raw)) return [];
    if (!ELEMENT_TYPES.includes(raw.type as ElementType)) return [];

    const element = {
      ...raw,
      id:
        typeof raw.id === 'string' && raw.id
          ? raw.id
          : `imported_${Date.now()}_${index}`,
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name
          : `Element ${index + 1}`,
      type: raw.type,
      x: asFiniteNumber(raw.x, 0),
      y: asFiniteNumber(raw.y, 0),
      width: Math.max(1, asFiniteNumber(raw.width, 100)),
      height: Math.max(1, asFiniteNumber(raw.height, 30)),
    };

    return [element as CanvasElement];
  });
}

export function serializeTemplate(template: LabelTemplate): string {
  const file: SavedTemplateFile = {
    format: TEMPLATE_FILE_FORMAT,
    version: TEMPLATE_FILE_VERSION,
    savedAt: new Date().toISOString(),
    template,
  };
  return JSON.stringify(file, null, 2);
}

export function parseTemplateFile(raw: string): LabelTemplate {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const candidate = isRecord(parsed) && isRecord(parsed.template) ? parsed.template : parsed;
  if (!isRecord(candidate)) {
    throw new Error('This file does not contain a label template.');
  }

  const backgroundUrl = candidate.backgroundUrl;
  if (typeof backgroundUrl !== 'string' || !backgroundUrl.trim()) {
    throw new Error('This template file is missing its background artwork.');
  }

  const originalWidth = Math.round(asFiniteNumber(candidate.originalWidth, 0));
  const originalHeight = Math.round(asFiniteNumber(candidate.originalHeight, 0));
  if (originalWidth <= 0 || originalHeight <= 0) {
    throw new Error('This template file has invalid dimensions.');
  }

  const elements = normalizeElements(candidate.elements);
  if (!Array.isArray(candidate.elements)) {
    throw new Error('This template file is missing its element list.');
  }

  return {
    id:
      typeof candidate.id === 'string' && candidate.id
        ? candidate.id
        : `imported_template_${Date.now()}`,
    name:
      typeof candidate.name === 'string' && candidate.name.trim()
        ? candidate.name
        : 'Imported Template',
    backgroundUrl,
    originalWidth,
    originalHeight,
    aspectRatio: originalWidth / originalHeight,
    elements,
  };
}

export function downloadTemplateFile(template: LabelTemplate): string {
  const fileName = `${slugifyFileName(template.name)}.label-template.json`;
  const blob = new Blob([serializeTemplate(template)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
