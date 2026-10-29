import React, { useRef } from 'react';
import {
  Type,
  Barcode as BarcodeIcon,
  QrCode,
  Copy,
  Trash2,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Layers,
  CheckCircle,
  AlertTriangle,
  Move,
  Image as ImageIcon,
  Upload,
  Maximize2,
  Sparkles,
  Sliders,
  Ratio,
} from 'lucide-react';
import {
  CanvasElement,
  TextElementConfig,
  BarcodeElementConfig,
  QRElementConfig,
  ImageElementConfig,
  BarcodeFormat,
} from '../types/label';
import { normalizeBarcodeValue } from '../utils/barcode';
import { getRowValue } from '../utils/row';

interface ElementInspectorProps {
  elements: CanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: CanvasElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onAddElement: (type: 'text' | 'barcode' | 'qr' | 'static-text' | 'image', initialSrc?: string) => void;
  availableColumns: string[];
  activeRow: Record<string, string | number> | undefined;
}

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onAddElement,
  availableColumns,
  activeRow,
}) => {
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const replaceImageRef = useRef<HTMLInputElement>(null);
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const handleInsertToken = (token: string) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    const textEl = selectedElement as TextElementConfig;
    const updated = {
      ...textEl,
      templateString: textEl.templateString ? `${textEl.templateString} {{${token}}}` : `{{${token}}}`,
    };
    onUpdateElement(updated);
  };

  const handleImageFilePicked = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onAddElement('image', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleReplaceImageFile = (file: File) => {
    if (!selectedElement || selectedElement.type !== 'image') return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onUpdateElement({
        ...selectedElement,
        src: dataUrl,
      } as ImageElementConfig);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto">
      {/* Top Add Element Buttons */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block mb-2">
          Add New Placeholder
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onAddElement('text')}
            className="flex flex-col items-center justify-center p-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Type className="w-4 h-4 text-blue-600 mb-1" />
            <span>Text</span>
          </button>

          <button
            onClick={() => onAddElement('barcode')}
            className="flex flex-col items-center justify-center p-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <BarcodeIcon className="w-4 h-4 text-emerald-600 mb-1" />
            <span>Barcode</span>
          </button>

          <button
            onClick={() => onAddElement('qr')}
            className="flex flex-col items-center justify-center p-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-purple-600 mb-1" />
            <span>QR Code</span>
          </button>

          <button
            onClick={() => imageUploadRef.current?.click()}
            className="flex flex-col items-center justify-center p-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-amber-600 mb-1" />
            <span>Picture</span>
          </button>
        </div>

        <input
          ref={imageUploadRef}
          type="file"
          accept="image/*,.svg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFilePicked(file);
            e.target.value = '';
          }}
          className="hidden"
        />

        <input
          ref={replaceImageRef}
          type="file"
          accept="image/*,.svg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReplaceImageFile(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {selectedElement ? (
        <div className="p-4 space-y-5 flex-1">
          {/* Header of selected element */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              {selectedElement.type === 'barcode' ? (
                <BarcodeIcon className="w-4 h-4 text-emerald-600" />
              ) : selectedElement.type === 'image' ? (
                <ImageIcon className="w-4 h-4 text-amber-600" />
              ) : selectedElement.type === 'qr' ? (
                <QrCode className="w-4 h-4 text-purple-600" />
              ) : (
                <Type className="w-4 h-4 text-blue-600" />
              )}
              <input
                type="text"
                value={selectedElement.name}
                onChange={(e) =>
                  onUpdateElement({ ...selectedElement, name: e.target.value })
                }
                className="text-xs font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-slate-600 focus:outline-none px-1"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onUpdateElement({
                    ...selectedElement,
                    locked: !selectedElement.locked,
                  })
                }
                title={selectedElement.locked ? 'Unlock element' : 'Lock element position'}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {selectedElement.locked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => onDuplicateElement(selectedElement.id)}
                title="Duplicate element"
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onDeleteElement(selectedElement.id)}
                title="Delete element"
                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* TEXT ELEMENT CONFIG */}
          {selectedElement.type === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Text Template & Dynamic Tokens
                </label>
                <textarea
                  rows={2}
                  value={(selectedElement as TextElementConfig).templateString}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      templateString: e.target.value,
                    } as TextElementConfig)
                  }
                  placeholder="e.g. Part: {{Part_Name}}"
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Write any static prefix and insert columns like <code className="text-slate-700 font-semibold">{`{{Column_Name}}`}</code>
                </span>
              </div>

              {/* Quick Token Insertion Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Insert Excel Column Token:
                </span>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded border border-slate-100">
                  {availableColumns.map((col) => (
                    <button
                      key={col}
                      onClick={() => handleInsertToken(col)}
                      type="button"
                      className="px-2 py-0.5 text-[11px] font-mono bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 rounded transition-colors cursor-pointer"
                    >
                      + {col}
                    </button>
                  ))}
                  <button
                    onClick={() => handleInsertToken('Row')}
                    type="button"
                    className="px-2 py-0.5 text-[11px] font-mono bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                  >
                    + Row#
                  </button>
                  <button
                    onClick={() => handleInsertToken('Date')}
                    type="button"
                    className="px-2 py-0.5 text-[11px] font-mono bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                  >
                    + Today
                  </button>
                </div>
              </div>

              {/* Font Family & Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Font Family
                  </label>
                  <select
                    value={(selectedElement as TextElementConfig).fontFamily}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        fontFamily: e.target.value as any,
                      } as TextElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-medium"
                  >
                    <option value="Calibri">Calibri (Standard)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                    <option value="DM Sans">DM Sans</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Font Size ({ (selectedElement as TextElementConfig).fontSize }px)
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="96"
                    value={(selectedElement as TextElementConfig).fontSize}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        fontSize: Number(e.target.value),
                      } as TextElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Weight & Alignment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Weight
                  </label>
                  <select
                    value={(selectedElement as TextElementConfig).fontWeight}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        fontWeight: e.target.value as any,
                      } as TextElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5"
                  >
                    <option value="400">Regular (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">SemiBold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">ExtraBold (800)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Alignment
                  </label>
                  <div className="flex border border-slate-200 rounded overflow-hidden">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() =>
                          onUpdateElement({
                            ...selectedElement,
                            textAlign: align,
                          } as TextElementConfig)
                        }
                        className={`flex-1 py-1 flex items-center justify-center transition-colors ${
                          (selectedElement as TextElementConfig).textAlign === align
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                        {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                        {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text Color & Transform */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(selectedElement as TextElementConfig).color}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          color: e.target.value,
                        } as TextElementConfig)
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={(selectedElement as TextElementConfig).color}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          color: e.target.value,
                        } as TextElementConfig)
                      }
                      className="w-full text-xs font-mono uppercase bg-white border border-slate-200 rounded px-2 py-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Transform
                  </label>
                  <select
                    value={(selectedElement as TextElementConfig).textTransform || 'none'}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        textTransform: e.target.value as any,
                      } as TextElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5"
                  >
                    <option value="none">Normal Case</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="lowercase">lowercase</option>
                    <option value="capitalize">Capitalize</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* BARCODE ELEMENT CONFIG */}
          {selectedElement.type === 'barcode' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Source Excel Column
                </label>
                <select
                  value={(selectedElement as BarcodeElementConfig).columnSource}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      columnSource: e.target.value,
                    } as BarcodeElementConfig)
                  }
                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-2 font-mono font-medium"
                >
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col} {getRowValue(activeRow, col) ? `(e.g. ${getRowValue(activeRow, col).slice(0, 16)})` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Takes the value from this column for each row to generate the barcode.
                </span>
              </div>

              {/* Barcode Format & Validation Check */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Barcode Symbology / Format
                </label>
                <select
                  value={(selectedElement as BarcodeElementConfig).barcodeFormat}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      barcodeFormat: e.target.value as BarcodeFormat,
                    } as BarcodeElementConfig)
                  }
                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                >
                  <option value="EAN13">EAN-13 (13-digit)</option>
                  <option value="CODE128">CODE 128 (Universal Alphanumeric)</option>
                  <option value="UPC">UPC-A (12-digit Retail)</option>
                  <option value="EAN8">EAN-8 (8-digit Compact)</option>
                  <option value="CODE39">CODE 39 (Standard)</option>
                  <option value="ITF">ITF / Interleaved 2 of 5</option>
                </select>
              </div>

              {/* Status indicator for active row's barcode value */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Active Row Value:</span>
                  <span className="font-mono font-bold text-slate-900 truncate">
                    {getRowValue(activeRow, (selectedElement as BarcodeElementConfig).columnSource) || 'None'}
                  </span>
                </div>
                {(() => {
                  const barcodeConfig = selectedElement as BarcodeElementConfig;
                  const rawValue = getRowValue(activeRow, barcodeConfig.columnSource);
                  if (!rawValue) {
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>No value in the active row for this column.</span>
                      </div>
                    );
                  }

                  const norm = normalizeBarcodeValue(rawValue, barcodeConfig.barcodeFormat);
                  if (!norm.isValid) {
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{norm.message || 'This value cannot be encoded in the selected format.'}</span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Ready: {norm.value} {norm.message ? `(${norm.message})` : ''}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Display text toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    Show Numbers Below Barcode
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Human readable digits below the bars
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={(selectedElement as BarcodeElementConfig).displayValue}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      displayValue: e.target.checked,
                    } as BarcodeElementConfig)
                  }
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
              </div>

              {/* Number Font Size & Margin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Text Font Size
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="28"
                    value={(selectedElement as BarcodeElementConfig).fontSize}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        fontSize: Number(e.target.value),
                      } as BarcodeElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Quiet Margin (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={(selectedElement as BarcodeElementConfig).margin ?? 2}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        margin: Number(e.target.value),
                      } as BarcodeElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* QR CODE CONFIG */}
          {selectedElement.type === 'qr' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  QR Content Expression
                </label>
                <textarea
                  rows={2}
                  value={(selectedElement as QRElementConfig).templateString}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      templateString: e.target.value,
                    } as QRElementConfig)
                  }
                  placeholder="{{Column_Name}}"
                  className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded"
                />
              </div>
            </div>
          )}

          {/* PICTURE / IMAGE ELEMENT CONFIG */}
          {selectedElement.type === 'image' && (
            <div className="space-y-4">
              {/* Picture Preview & Replace */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Picture / Logo Graphic
                </label>
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {(selectedElement as ImageElementConfig).src ? (
                      <img
                        src={(selectedElement as ImageElementConfig).src}
                        alt="Thumbnail"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => replaceImageRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Change Picture...</span>
                    </button>
                    <span className="text-[11px] text-slate-400 block">
                      PNG, JPG, SVG, WebP
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Resize Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Quick Size Presets:
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(selectedElement as ImageElementConfig).keepAspectRatio !== false}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          keepAspectRatio: e.target.checked,
                        } as ImageElementConfig)
                      }
                      className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                    />
                    <span>Lock Aspect</span>
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '48px', w: 48, h: 48 },
                    { label: '80px', w: 80, h: 80 },
                    { label: '120px', w: 120, h: 120 },
                    { label: '180px', w: 180, h: 180 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        onUpdateElement({
                          ...selectedElement,
                          width: preset.w,
                          height: preset.h,
                        } as ImageElementConfig)
                      }
                      className="px-2 py-1 text-xs font-mono font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Object Fit & Opacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Fit Mode
                  </label>
                  <select
                    value={(selectedElement as ImageElementConfig).objectFit || 'contain'}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        objectFit: e.target.value as any,
                      } as ImageElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5"
                  >
                    <option value="contain">Contain (Best Fit)</option>
                    <option value="cover">Cover (Crop)</option>
                    <option value="fill">Stretch to Box</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Opacity ({Math.round(((selectedElement as ImageElementConfig).opacity ?? 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={Math.round(((selectedElement as ImageElementConfig).opacity ?? 1) * 100)}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        opacity: Number(e.target.value) / 100,
                      } as ImageElementConfig)
                    }
                    className="w-full accent-blue-600 cursor-pointer mt-1"
                  />
                </div>
              </div>

              {/* Optional Excel column source */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Or Bind Dynamic Picture from Column (Optional)
                </label>
                <select
                  value={(selectedElement as ImageElementConfig).columnSource || ''}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      columnSource: e.target.value || undefined,
                    } as ImageElementConfig)
                  }
                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                >
                  <option value="">Static Graphic (Current Image)</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      Column: {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Geometry & Coordinates */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block mb-2">
              Exact Dimensions (px)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                <span className="text-slate-400">X:</span>
                <input
                  type="number"
                  value={Math.round(selectedElement.x)}
                  onChange={(e) =>
                    onUpdateElement({ ...selectedElement, x: Number(e.target.value) })
                  }
                  className="w-full bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                <span className="text-slate-400">Y:</span>
                <input
                  type="number"
                  value={Math.round(selectedElement.y)}
                  onChange={(e) =>
                    onUpdateElement({ ...selectedElement, y: Number(e.target.value) })
                  }
                  className="w-full bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                <span className="text-slate-400">W:</span>
                <input
                  type="number"
                  value={Math.round(selectedElement.width)}
                  onChange={(e) =>
                    onUpdateElement({ ...selectedElement, width: Number(e.target.value) })
                  }
                  className="w-full bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                <span className="text-slate-400">H:</span>
                <input
                  type="number"
                  value={Math.round(selectedElement.height)}
                  onChange={(e) =>
                    onUpdateElement({ ...selectedElement, height: Number(e.target.value) })
                  }
                  className="w-full bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty selection state: show element layer hierarchy */
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-500 block">
              TEMPLATE ELEMENTS ({elements.length})
            </span>
            <div className="space-y-1.5">
              {elements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => onSelectElement(el.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    {el.type === 'barcode' ? (
                      <BarcodeIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : el.type === 'image' ? (
                      <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <Type className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                    <span className="font-medium text-slate-800 truncate">{el.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {Math.round(el.x)},{Math.round(el.y)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
            Click any element on the canvas to inspect its font size, text tokens, or barcode configuration.
          </div>
        </div>
      )}
    </div>
  );
};
