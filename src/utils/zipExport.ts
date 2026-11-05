import JSZip from 'jszip';
import { CanvasElement, LabelTemplate } from '../types/label';
import { renderLabelToCanvas } from './renderer';
import { getFirstRowValue } from './row';
import { ProgressCallback } from './pdfExport';

export interface ZipExportOptions {
  scale?: number;
  transparentBackground?: boolean;
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportLabelsToZip(
  template: LabelTemplate,
  elements: CanvasElement[],
  rows: Record<string, string | number>[],
  onProgress?: ProgressCallback,
  options: ZipExportOptions = {}
): Promise<void> {
  const scale = options.scale ?? 2;
  const total = rows.length;
  if (total === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('customized_labels') || zip;
  const manifestRows: string[][] = [];

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    onProgress?.(i + 1, total, `Generating high-res PNG for item ${i + 1} of ${total}...`);

    const canvas = await renderLabelToCanvas(template, elements, row, i, scale, {
      transparentBackground: options.transparentBackground,
    });

    // Convert to blob
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

    // Use the first meaningful value in the row for a readable filename.
    const preferredColumns = ['OE_Number', 'OE Number', 'Part_Number', 'Part_Name', 'Part Name', 'Barcode'];
    const rowLabel = getFirstRowValue(row, [...preferredColumns, ...Object.keys(row)]);
    const safeLabel = rowLabel.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const filename = `label_${String(i + 1).padStart(3, '0')}${safeLabel ? `_${safeLabel}` : ''}.png`;

    folder.file(filename, base64Data, { base64: true });
    manifestRows.push([filename, ...Object.values(row).map((value) => String(value))]);
  }

  const headers = Object.keys(rows[0] || {});
  const manifest = [
    ['filename', ...headers].map(escapeCsvCell).join(','),
    ...manifestRows.map((values) => values.map(escapeCsvCell).join(',')),
  ].join('\n');
  folder.file('labels.csv', manifest);

  onProgress?.(total, total, 'Compressing ZIP archive...');
  const content = await zip.generateAsync({ type: 'blob' });

  // Download blob trigger
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Customized_Labels_${total}_Items.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
