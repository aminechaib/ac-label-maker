import { LabelTemplate } from '../types/label';

export function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
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
