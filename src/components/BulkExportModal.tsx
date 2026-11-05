import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  FileArchive,
  CheckCircle2,
  Loader2,
  FileCode2,
  Sparkles,
  EyeOff,
} from 'lucide-react';
import { CanvasElement, LabelTemplate, PrintSettings } from '../types/label';
import { exportLabelsToPdf } from '../utils/pdfExport';
import { exportLabelsToZip } from '../utils/zipExport';
import { downloadLabelSvg, exportLabelsToSvgZip } from '../utils/svgExport';
import { renderLabelToCanvas } from '../utils/renderer';

const GRID_OPTIONS: { value: PrintSettings['grid']; title: string; description: string }[] = [
  {
    value: 'single',
    title: 'Individual Label Rolls',
    description: '1 label per page at exact artwork ratio. Best for Zebra / thermal roll printers.',
  },
  {
    value: '2x4',
    title: 'Sheet (2 × 4)',
    description: '8 labels per A4/Letter sheet. Standard industrial parts sticker layout.',
  },
  {
    value: '3x7',
    title: 'Sheet (3 × 7)',
    description: '21 compact labels per page. Ideal for bin & inventory tags.',
  },
  {
    value: '3x8',
    title: 'Sheet (3 × 8)',
    description: '24 ultra-compact labels per page for dense catalog sheets.',
  },
  {
    value: '2x2',
    title: 'Sheet (2 × 2)',
    description: '4 large labels per page. Great for shipping and pallet labels.',
  },
];

interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: LabelTemplate;
  elements: CanvasElement[];
  rows: Record<string, string | number>[];
  activeRowIndex: number;
}

export const BulkExportModal: React.FC<BulkExportModalProps> = ({
  isOpen,
  onClose,
  template,
  elements,
  rows,
  activeRowIndex,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    paperSize: 'a4',
    grid: 'single',
    dpi: 300,
    labelsPerPage: 1,
    marginMm: 8,
    gapMm: 4,
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: rows.length,
    message: '',
  });
  const [rasterScale, setRasterScale] = useState<number>(2);
  const [transparentBackground, setTransparentBackground] = useState<boolean>(false);

  const [renderedPreviews, setRenderedPreviews] = useState<string[]>([]);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState<boolean>(false);

  // Generate lightweight thumbnails for live batch inspection
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGeneratingPreviews(true);

    const generatePreviews = async () => {
      const previews: string[] = [];
      // Generate up to first 24 items for responsive UI
      const count = Math.min(rows.length, 24);
      for (let i = 0; i < count; i++) {
        if (!isMounted) break;
        try {
          const canvas = await renderLabelToCanvas(template, elements, rows[i], i, 0.45);
          previews.push(canvas.toDataURL('image/jpeg', 0.85));
        } catch (e) {
          console.warn('Preview error', e);
        }
      }
      if (isMounted) {
        setRenderedPreviews(previews);
        setIsGeneratingPreviews(false);
      }
    };

    generatePreviews();

    return () => {
      isMounted = false;
    };
  }, [isOpen, template, elements, rows]);

  if (!isOpen) return null;

  const handleExportPdf = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    try {
      await exportLabelsToPdf(
        template,
        elements,
        rows,
        printSettings,
        (current, total, message) => {
          setExportProgress({ current, total, message });
        },
        { scale: rasterScale }
      );
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZip = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    try {
      await exportLabelsToZip(
        template,
        elements,
        rows,
        (current, total, message) => {
          setExportProgress({ current, total, message });
        },
        { scale: rasterScale, transparentBackground }
      );
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSvgZip = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: rows.length, message: 'Preparing vector export...' });
    try {
      await exportLabelsToSvgZip(
        template,
        elements,
        rows,
        { transparentBackground },
        (current, total, message) => {
          setExportProgress({ current, total, message });
        }
      );
    } catch (err) {
      alert(`Vector export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const currentRow = rows[activeRowIndex] || rows[0] || {};
  const activeRowLabel =
    String(Object.values(currentRow).find((value) => String(value).trim()) || 'label')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40) || 'label';

  const handleDownloadSinglePng = async () => {
    try {
      const canvas = await renderLabelToCanvas(
        template,
        elements,
        currentRow,
        activeRowIndex,
        rasterScale,
        { transparentBackground }
      );
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Label_${activeRowLabel}@${rasterScale}x.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert(`Download failed: ${(err as Error).message}`);
    }
  };

  const handleDownloadSingleSvg = async () => {
    try {
      await downloadLabelSvg(template, elements, currentRow, activeRowIndex, { transparentBackground });
    } catch (err) {
      alert(`Vector download failed: ${(err as Error).message}`);
    }
  };

  const handleDirectPrint = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: rows.length, message: 'Preparing print layout...' });

    // Open a clean print window with high-res labels
    try {
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Please allow popups to open the print dialog.');
        setIsExporting(false);
        return;
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bulk Labels Print (${rows.length} Items)</title>
          <style>
            @page {
              size: auto;
              margin: 6mm;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: sans-serif;
              background: white;
            }
            .label-page {
              page-break-after: always;
              break-after: page;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 6mm;
            }
            .label-img {
              max-width: 100%;
              height: auto;
              display: block;
            }
          </style>
        </head>
        <body>
          <div id="labels-container"></div>
        </body>
        </html>
      `);

      const container = printWin.document.getElementById('labels-container');

      for (let i = 0; i < rows.length; i++) {
        setExportProgress({
          current: i + 1,
          total: rows.length,
          message: `Rendering label ${i + 1} for print...`,
        });
        const canvas = await renderLabelToCanvas(template, elements, rows[i], i, rasterScale);
        const img = printWin.document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.className = 'label-img';

        const pageDiv = printWin.document.createElement('div');
        pageDiv.className = 'label-page';
        pageDiv.appendChild(img);
        container?.appendChild(pageDiv);
      }

      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        setIsExporting(false);
      }, 500);
    } catch (e) {
      setIsExporting(false);
      alert('Print initialization failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bulk Customized Output Generator
              </h3>
              <p className="text-xs text-slate-500">
                {rows.length > 0
                  ? `Ready to generate ${rows.length} personalized labels with dynamic text and integrated barcodes.`
                  : 'No data rows loaded. You can still download the active label as a PNG.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Export Mode / Layout Selection */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">
              1. Choose Page & Print Format
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {GRID_OPTIONS.map((option) => {
                const isActive = printSettings.grid === option.value;
                return (
                  <div
                    key={option.value}
                    onClick={() =>
                      setPrintSettings({
                        ...printSettings,
                        grid: option.value,
                        paperSize: option.value === 'single' ? printSettings.paperSize : 'a4',
                      })
                    }
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-xs font-bold text-slate-900">{option.title}</span>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500">{option.description}</p>
                  </div>
                );
              })}
            </div>

            {printSettings.grid !== 'single' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Paper size</span>
                  <select
                    value={printSettings.paperSize === 'letter' ? 'letter' : 'a4'}
                    onChange={(event) =>
                      setPrintSettings({
                        ...printSettings,
                        paperSize: event.target.value as PrintSettings['paperSize'],
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Page margin (mm)</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={printSettings.marginMm}
                    onChange={(event) =>
                      setPrintSettings({
                        ...printSettings,
                        marginMm: Math.max(0, Math.min(30, Number(event.target.value) || 0)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Label gap (mm)</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={printSettings.gapMm}
                    onChange={(event) =>
                      setPrintSettings({
                        ...printSettings,
                        gapMm: Math.max(0, Math.min(20, Number(event.target.value) || 0)),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Output quality + vector options */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">
              2. Output Quality & Vector Export
            </span>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900">Raster quality</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setRasterScale(scale)}
                      className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        rasterScale === scale
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {scale}×
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setTransparentBackground((value) => !value)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    transparentBackground
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <EyeOff className="w-3.5 h-3.5" />
                    Transparent background
                  </span>
                  <span
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
                      transparentBackground ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-3 h-3 bg-white rounded-full transition-transform ${
                        transparentBackground ? 'translate-x-4' : ''
                      }`}
                    />
                  </span>
                </button>
                <p className="text-[11px] text-slate-500">
                  Transparent mode omits the template artwork so only your placed fields are exported.
                </p>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Vector SVG export</span>
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-600 text-white rounded">
                    Crisp
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Text, barcodes, and QR codes stay sharp at any size. Perfect for print shops and
                  laser engravers.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleDownloadSingleSvg}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    Active Label SVG
                  </button>
                  <button
                    onClick={handleExportSvgZip}
                    disabled={isExporting || rows.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    All SVG (.zip)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Thumbnails Preview Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">
                3. Live Batch Verification ({rows.length} Labels)
              </span>
              {isGeneratingPreviews && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering previews...</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 max-h-56 overflow-y-auto">
              {renderedPreviews.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {renderedPreviews.map((src, idx) => {
                    const row = rows[idx];
                    const rowLabel =
                      Object.values(row || {}).find((value) => String(value).trim()) || `#${idx + 1}`;
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-lg p-2 shadow-xs flex flex-col justify-between"
                      >
                        <img
                          src={src}
                          alt={`Label ${idx + 1}`}
                          className="w-full object-contain max-h-24 rounded"
                        />
                        <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono truncate max-w-[80px]">{String(rowLabel)}</span>
                          <span className="font-mono font-semibold text-slate-800 truncate max-w-[100px]">
                            #{idx + 1}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  {rows.length === 0
                    ? 'Add rows in the Data step to generate batch previews.'
                    : 'Rendering batch previews...'}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar during export */}
          {isExporting && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-blue-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  {exportProgress.message || 'Processing labels...'}
                </span>
                <span className="font-mono tabular-nums">
                  {Math.round((exportProgress.current / Math.max(1, exportProgress.total)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-150"
                  style={{
                    width: `${Math.round(
                      (exportProgress.current / Math.max(1, exportProgress.total)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Template: <strong className="text-slate-800">{template.name}</strong></span>
            <span>·</span>
            <button
              onClick={handleDownloadSinglePng}
              className="text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
            >
              Download active PNG ({rasterScale}×)
            </button>
            <span>·</span>
            <button
              onClick={handleDownloadSingleSvg}
              className="text-emerald-600 hover:text-emerald-800 font-medium underline cursor-pointer"
            >
              Active SVG
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportZip}
              disabled={isExporting || rows.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileArchive className="w-3.5 h-3.5 text-slate-500" />
              <span>Download ZIP (All PNGs)</span>
            </button>

            <button
              onClick={handleDirectPrint}
              disabled={isExporting || rows.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Directly</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting || rows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download PDF ({rows.length} Labels)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
