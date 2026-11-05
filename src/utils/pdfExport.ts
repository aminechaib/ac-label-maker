import jsPDF from 'jspdf';
import { CanvasElement, LabelTemplate, PrintSettings } from '../types/label';
import { renderLabelToCanvas } from './renderer';

export interface ProgressCallback {
  (current: number, total: number, message: string): void;
}

export interface PdfExportOptions {
  scale?: number;
}

export async function exportLabelsToPdf(
  template: LabelTemplate,
  elements: CanvasElement[],
  rows: Record<string, string | number>[],
  settings: PrintSettings,
  onProgress?: ProgressCallback,
  options: PdfExportOptions = {}
): Promise<void> {
  const total = rows.length;
  if (total === 0) return;
  const renderScale = Math.max(1, Math.min(4, options.scale ?? 2));

  if (settings.grid === 'single') {
    // 1 label per page, sized to label dimensions in mm
    // Standard 300 DPI conversion: 1 px ≈ 0.264583 mm
    const pxToMm = 0.264583;
    const labelWidthMm = template.originalWidth * pxToMm;
    const labelHeightMm = template.originalHeight * pxToMm;
    const orientation = labelWidthMm >= labelHeightMm ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [labelWidthMm, labelHeightMm],
      compress: true,
    });

    for (let i = 0; i < total; i++) {
      onProgress?.(i + 1, total, `Rendering label ${i + 1} of ${total}...`);
      if (i > 0) {
        pdf.addPage([labelWidthMm, labelHeightMm], orientation);
      }

      // Render at 2x scale for 300 DPI crispness
      const canvas = await renderLabelToCanvas(template, elements, rows[i], i, renderScale);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, labelWidthMm, labelHeightMm, undefined, 'FAST');
    }

    onProgress?.(total, total, 'Compiling PDF document...');
    pdf.save(`Bulk_Labels_${template.name.replace(/\s+/g, '_')}_${total}_Items.pdf`);
  } else {
    // Sheet layout (e.g., A4 or Letter with 2x4, 3x7, 2x2 grid)
    const pageFormat = settings.paperSize === 'letter' ? 'letter' : 'a4';
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: pageFormat,
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Determine grid columns and rows
    let cols = 2;
    let gridRows = 4;
    if (settings.grid === '3x7') {
      cols = 3;
      gridRows = 7;
    } else if (settings.grid === '3x8') {
      cols = 3;
      gridRows = 8;
    } else if (settings.grid === '2x2') {
      cols = 2;
      gridRows = 2;
    }

    const marginX = settings.marginMm ?? 10;
    const marginY = settings.marginMm ?? 10;
    const gapX = settings.gapMm ?? 4;
    const gapY = settings.gapMm ?? 4;

    const availableW = pageWidth - marginX * 2 - (cols - 1) * gapX;
    const availableH = pageHeight - marginY * 2 - (gridRows - 1) * gapY;

    const cellWidth = availableW / cols;
    const cellHeight = availableH / gridRows;

    const labelsPerPage = cols * gridRows;

    for (let i = 0; i < total; i++) {
      const pageIndex = Math.floor(i / labelsPerPage);
      const positionInPage = i % labelsPerPage;

      if (positionInPage === 0 && pageIndex > 0) {
        pdf.addPage(pageFormat, 'portrait');
      }

      const col = positionInPage % cols;
      const row = Math.floor(positionInPage / cols);

      const x = marginX + col * (cellWidth + gapX);
      const y = marginY + row * (cellHeight + gapY);

      onProgress?.(i + 1, total, `Rendering label ${i + 1} onto sheet page ${pageIndex + 1}...`);

      const canvas = await renderLabelToCanvas(template, elements, rows[i], i, renderScale);
      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      // Fit aspect ratio inside cell
      const templateAspect = template.originalWidth / template.originalHeight;
      const cellAspect = cellWidth / cellHeight;
      let drawW = cellWidth;
      let drawH = cellHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (templateAspect > cellAspect) {
        drawH = cellWidth / templateAspect;
        offsetY = (cellHeight - drawH) / 2;
      } else {
        drawW = cellHeight * templateAspect;
        offsetX = (cellWidth - drawW) / 2;
      }

      pdf.addImage(imgData, 'JPEG', x + offsetX, y + offsetY, drawW, drawH, undefined, 'FAST');
    }

    onProgress?.(total, total, 'Finalizing printable label sheet PDF...');
    pdf.save(`Label_Sheet_${total}_Items.pdf`);
  }
}
