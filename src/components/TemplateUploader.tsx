import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  ArrowRight,
  FileCode,
  Ruler,
  Info,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { LabelTemplate } from '../types/label';
import { createBlankTemplate } from '../utils/template';

interface TemplateUploaderProps {
  currentTemplate: LabelTemplate | null;
  onSelectTemplate: (template: LabelTemplate) => void;
  onUploadImage: (file: File) => void;
  onNextStep: () => void;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = /\.(svg|png|jpe?g|webp)$/i;

export const TemplateUploader: React.FC<TemplateUploaderProps> = ({
  currentTemplate,
  onSelectTemplate,
  onUploadImage,
  onNextStep,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blankWidth, setBlankWidth] = useState('800');
  const [blankHeight, setBlankHeight] = useState('480');

  const acceptFile = (file: File) => {
    if (!file.type.startsWith('image/') && !ACCEPTED_EXTENSIONS.test(file.name)) {
      setError('Please choose an SVG, PNG, JPG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('That file is larger than 15 MB. Please use a smaller image.');
      return;
    }
    setError(null);
    onUploadImage(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const handleCreateBlank = () => {
    const width = Number(blankWidth);
    const height = Number(blankHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 100 || height < 100) {
      setError('Blank labels must be at least 100 × 100 px.');
      return;
    }
    if (width > 5000 || height > 5000) {
      setError('Blank labels are limited to 5000 px per side.');
      return;
    }
    setError(null);
    onSelectTemplate(createBlankTemplate(width, height));
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Start With Your Label Template
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload your own artwork or create a blank label, then add dynamic text, barcodes, and images in the designer.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center min-h-[220px] transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-50/60'
                : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,image/svg+xml,.png,image/png,.jpg,.jpeg,image/jpeg,.webp,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Drop your label artwork here
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              SVG, PNG, JPG, or WebP up to 15 MB. Transparent artwork works best.
            </p>
            <button
              type="button"
              className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Browse Files
            </button>
          </div>

          {currentTemplate ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-400 tracking-wider">ACTIVE TEMPLATE</span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5 truncate">
                    {currentTemplate.name}
                  </h4>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {currentTemplate.originalWidth} × {currentTemplate.originalHeight} px
                  </span>
                  <div className="text-[11px] text-slate-400">
                    Ratio: {currentTemplate.aspectRatio.toFixed(2)} : 1
                  </div>
                </div>
              </div>

              <div className="bg-slate-100/70 border border-slate-200 rounded-lg p-4 flex items-center justify-center overflow-hidden">
                <img
                  src={currentTemplate.backgroundUrl}
                  alt="Template Preview"
                  className="max-h-56 object-contain rounded shadow-xs"
                />
              </div>

              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Template ready</span>
                </div>
                <button
                  onClick={onNextStep}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <span>Continue to Excel Data</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No template selected yet</h3>
              <p className="mt-1 text-xs text-slate-500">
                Upload artwork above, or create a blank label with an exact pixel size.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Ruler className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create a blank label</h3>
                <p className="text-[11px] text-slate-500">Start from a clean white canvas.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold text-slate-600">
                Width (px)
                <input
                  type="number"
                  min="100"
                  max="5000"
                  value={blankWidth}
                  onChange={(e) => setBlankWidth(e.target.value)}
                  className="mt-1 w-full text-xs font-mono bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-600">
                Height (px)
                <input
                  type="number"
                  min="100"
                  max="5000"
                  value={blankHeight}
                  onChange={(e) => setBlankHeight(e.target.value)}
                  className="mt-1 w-full text-xs font-mono bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { label: '4 × 6 in', w: 1200, h: 1800 },
                { label: '2 × 1 in', w: 600, h: 300 },
                { label: 'A6', w: 1240, h: 1748 },
                { label: 'Square', w: 800, h: 800 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setBlankWidth(String(preset.w));
                    setBlankHeight(String(preset.h));
                  }}
                  className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateBlank}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Create Blank Label</span>
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Info className="w-3.5 h-3.5" />
              <span>Template tips</span>
            </div>
            <p>Leave clear zones on your artwork for barcodes and dynamic text.</p>
            <p>Use the same pixel size as your printer artwork for accurate placement.</p>
            <p>You can replace the background at any time without losing your elements.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
