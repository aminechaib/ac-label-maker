import React, { useRef, useState } from 'react';
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
  Shapes,
  Square,
  Circle,
  Minus,
  Triangle,
  Star,
  ArrowRight,
  Diamond,
  RectangleHorizontal,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Palette,
  Eye,
  EyeOff,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ChevronsUp,
  ChevronsDown,
} from 'lucide-react';
import {
  CanvasElement,
  TextElementConfig,
  BarcodeElementConfig,
  QRElementConfig,
  ImageElementConfig,
  ShapeElementConfig,
  ShapeType,
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
  onMoveElement: (id: string, targetIndex: number) => void;
  onAddElement: (type: 'text' | 'barcode' | 'qr' | 'static-text' | 'image', initialSrc?: string) => void;
  onAddShape: (shape: ShapeType) => void;
  availableColumns: string[];
  activeRow: Record<string, string | number> | undefined;
}

const SHAPE_BUTTONS: { shape: ShapeType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { shape: 'rectangle', label: 'Box', Icon: Square },
  { shape: 'rounded-rectangle', label: 'Rounded', Icon: RectangleHorizontal },
  { shape: 'ellipse', label: 'Circle', Icon: Circle },
  { shape: 'line', label: 'Line', Icon: Minus },
  { shape: 'triangle', label: 'Triangle', Icon: Triangle },
  { shape: 'diamond', label: 'Diamond', Icon: Diamond },
  { shape: 'star', label: 'Star', Icon: Star },
  { shape: 'arrow', label: 'Arrow', Icon: ArrowRight },
];

type TextStylePreset = {
  label: string;
  description: string;
  style: Partial<TextElementConfig>;
};

const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    label: 'Title',
    description: 'Big, bold, uppercase',
    style: {
      fontSize: 30,
      fontWeight: '800',
      fontFamily: 'Plus Jakarta Sans',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      lineHeight: 1.05,
      textDecoration: 'none',
      fontStyle: 'normal',
      strokeWidth: 0,
    },
  },
  {
    label: 'Heading',
    description: 'Strong section header',
    style: {
      fontSize: 22,
      fontWeight: '700',
      fontFamily: 'Plus Jakarta Sans',
      textTransform: 'none',
      letterSpacing: 0,
      lineHeight: 1.15,
      textDecoration: 'none',
      fontStyle: 'normal',
      strokeWidth: 0,
    },
  },
  {
    label: 'Body',
    description: 'Clean readable text',
    style: {
      fontSize: 16,
      fontWeight: '500',
      fontFamily: 'DM Sans',
      textTransform: 'none',
      letterSpacing: 0,
      lineHeight: 1.35,
      textDecoration: 'none',
      fontStyle: 'normal',
      strokeWidth: 0,
    },
  },
  {
    label: 'Caption',
    description: 'Small supporting label',
    style: {
      fontSize: 11,
      fontWeight: '600',
      fontFamily: 'Calibri',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      lineHeight: 1.2,
      textDecoration: 'none',
      fontStyle: 'normal',
      strokeWidth: 0,
    },
  },
  {
    label: 'Mono',
    description: 'Technical / code style',
    style: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'JetBrains Mono',
      textTransform: 'none',
      letterSpacing: 0.3,
      lineHeight: 1.3,
      textDecoration: 'none',
      fontStyle: 'normal',
      strokeWidth: 0,
    },
  },
  {
    label: 'Outline',
    description: 'Hollow display text',
    style: {
      fontSize: 28,
      fontWeight: '800',
      fontFamily: 'Arial',
      textTransform: 'uppercase',
      letterSpacing: 1,
      lineHeight: 1.1,
      strokeColor: '#0f172a',
      strokeWidth: 1.5,
    },
  },
];

const ElementTypeIcon: React.FC<{ type: CanvasElement['type']; className?: string }> = ({
  type,
  className = 'w-4 h-4',
}) => {
  if (type === 'barcode') return <BarcodeIcon className={`${className} text-emerald-600`} />;
  if (type === 'image') return <ImageIcon className={`${className} text-amber-600`} />;
  if (type === 'qr') return <QrCode className={`${className} text-purple-600`} />;
  if (type === 'shape') return <Shapes className={`${className} text-indigo-600`} />;
  return <Type className={`${className} text-blue-600`} />;
};

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveElement,
  onAddElement,
  onAddShape,
  availableColumns,
  activeRow,
}) => {
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const replaceImageRef = useRef<HTMLInputElement>(null);
  const selectedElement = elements.find((el) => el.id === selectedElementId);
  const [layersOpen, setLayersOpen] = useState(true);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const layers = [...elements].reverse();
  const selectedIndex = elements.findIndex((el) => el.id === selectedElementId);

  const moveSelectedTo = (targetIndex: number) => {
    if (!selectedElement) return;
    onMoveElement(selectedElement.id, targetIndex);
  };

  const toggleElementVisibility = (element: CanvasElement) => {
    onUpdateElement({ ...element, visible: element.visible === false });
  };

  const toggleElementLock = (element: CanvasElement) => {
    onUpdateElement({ ...element, locked: !element.locked });
  };

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

        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shapes className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Shapes & Decorations
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {SHAPE_BUTTONS.map(({ shape, label, Icon }) => (
              <button
                key={shape}
                onClick={() => onAddShape(shape)}
                title={`Add ${label.toLowerCase()}`}
                className="flex flex-col items-center justify-center gap-1 p-1.5 text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <button
          type="button"
          onClick={() => setLayersOpen((open) => !open)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Layers
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full">
              {elements.length}
            </span>
          </span>
          {layersOpen ? (
            <ChevronsUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronsDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {layersOpen && (
          <div className="px-3 pb-3">
            {layers.length === 0 ? (
              <p className="px-1 pb-1 text-[11px] text-slate-400">
                No layers yet. Add text, barcodes, shapes, or images above.
              </p>
            ) : (
              <>
                <p className="px-1 pb-1.5 text-[10px] text-slate-400">
                  Top of the list is in front. Drag to reorder.
                </p>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                  {layers.map((element) => {
                    const originalIndex = elements.findIndex((el) => el.id === element.id);
                    const isSelected = element.id === selectedElementId;
                    const isHidden = element.visible === false;
                    const isDragging = draggingLayerId === element.id;
                    const isDragOver = dragOverLayerId === element.id && draggingLayerId !== element.id;

                    return (
                      <div
                        key={element.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          setDraggingLayerId(element.id);
                        }}
                        onDragEnd={() => {
                          setDraggingLayerId(null);
                          setDragOverLayerId(null);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          if (draggingLayerId && draggingLayerId !== element.id) {
                            setDragOverLayerId(element.id);
                          }
                        }}
                        onDragLeave={() => {
                          setDragOverLayerId((current) => (current === element.id ? null : current));
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggingLayerId && draggingLayerId !== element.id) {
                            onMoveElement(draggingLayerId, originalIndex);
                          }
                          setDraggingLayerId(null);
                          setDragOverLayerId(null);
                        }}
                        onClick={() => onSelectElement(element.id)}
                        className={`group flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-transparent hover:bg-slate-50'
                        } ${isDragOver ? 'ring-2 ring-blue-400 ring-inset' : ''} ${
                          isDragging ? 'opacity-40' : ''
                        }`}
                      >
                        <GripVertical className="w-3 h-3 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing" />
                        <ElementTypeIcon type={element.type} className="w-3.5 h-3.5 shrink-0" />
                        <span
                          className={`text-[11px] font-medium truncate flex-1 ${
                            isHidden ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}
                          title={element.name}
                        >
                          {element.name}
                        </span>
                        <button
                          type="button"
                          title={isHidden ? 'Show layer' : 'Hide layer'}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleElementVisibility(element);
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            isHidden
                              ? 'text-slate-400 hover:text-slate-700'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          title={element.locked ? 'Unlock layer' : 'Lock layer'}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleElementLock(element);
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            element.locked
                              ? 'text-amber-600 hover:text-amber-700'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {selectedElement ? (
        <div className="p-4 space-y-5 flex-1">
          {/* Header of selected element */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <ElementTypeIcon type={selectedElement.type} className="w-4 h-4 shrink-0" />
              <input
                type="text"
                value={selectedElement.name}
                onChange={(e) =>
                  onUpdateElement({ ...selectedElement, name: e.target.value })
                }
                className="text-xs font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-slate-600 focus:outline-none px-1 min-w-0"
              />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => toggleElementVisibility(selectedElement)}
                title={selectedElement.visible === false ? 'Show element' : 'Hide element'}
                className={`p-1 transition-colors ${
                  selectedElement.visible === false
                    ? 'text-slate-400 hover:text-slate-700'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {selectedElement.visible === false ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>

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

          <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Layer order
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => moveSelectedTo(0)}
                disabled={selectedIndex <= 0}
                title="Send to back"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
              >
                <SendToBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveSelectedTo(selectedIndex - 1)}
                disabled={selectedIndex <= 0}
                title="Send backward"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveSelectedTo(selectedIndex + 1)}
                disabled={selectedIndex >= elements.length - 1}
                title="Bring forward"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveSelectedTo(elements.length - 1)}
                disabled={selectedIndex >= elements.length - 1}
                title="Bring to front"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
              >
                <BringToFront className="w-3.5 h-3.5" />
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

              {/* Typography presets */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-semibold text-slate-600">
                    Text Design Presets
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {TEXT_STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      title={preset.description}
                      onClick={() =>
                        onUpdateElement({
                          ...selectedElement,
                          ...preset.style,
                        } as TextElementConfig)
                      }
                      className="px-1.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-300 rounded transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
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

              {/* Format style toggles */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Format Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      key: 'italic' as const,
                      label: 'Italic',
                      Icon: Italic,
                      active: (selectedElement as TextElementConfig).fontStyle === 'italic',
                      onClick: () =>
                        onUpdateElement({
                          ...selectedElement,
                          fontStyle:
                            (selectedElement as TextElementConfig).fontStyle === 'italic'
                              ? 'normal'
                              : 'italic',
                        } as TextElementConfig),
                    },
                    {
                      key: 'underline' as const,
                      label: 'Underline',
                      Icon: Underline,
                      active:
                        (selectedElement as TextElementConfig).textDecoration === 'underline',
                      onClick: () =>
                        onUpdateElement({
                          ...selectedElement,
                          textDecoration:
                            (selectedElement as TextElementConfig).textDecoration === 'underline'
                              ? 'none'
                              : 'underline',
                        } as TextElementConfig),
                    },
                    {
                      key: 'strike' as const,
                      label: 'Strike',
                      Icon: Strikethrough,
                      active:
                        (selectedElement as TextElementConfig).textDecoration === 'line-through',
                      onClick: () =>
                        onUpdateElement({
                          ...selectedElement,
                          textDecoration:
                            (selectedElement as TextElementConfig).textDecoration === 'line-through'
                              ? 'none'
                              : 'line-through',
                        } as TextElementConfig),
                    },
                  ].map(({ key, label, Icon, active, onClick }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={onClick}
                      className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacing controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Letter Spacing (px)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="-2"
                    max="10"
                    value={(selectedElement as TextElementConfig).letterSpacing ?? 0}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        letterSpacing: Number(e.target.value),
                      } as TextElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Line Height
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.8"
                    max="3"
                    value={(selectedElement as TextElementConfig).lineHeight ?? 1.25}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        lineHeight: Number(e.target.value),
                      } as TextElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Outline & Background */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Text Outline
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={(selectedElement as TextElementConfig).strokeColor || '#0f172a'}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          strokeColor: e.target.value,
                          strokeWidth:
                            (selectedElement as TextElementConfig).strokeWidth ?? 1,
                        } as TextElementConfig)
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max="8"
                      step="0.5"
                      value={(selectedElement as TextElementConfig).strokeWidth ?? 0}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          strokeWidth: Number(e.target.value),
                        } as TextElementConfig)
                      }
                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Background Fill
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={
                        (selectedElement as TextElementConfig).backgroundColor &&
                        (selectedElement as TextElementConfig).backgroundColor !== 'transparent'
                          ? (selectedElement as TextElementConfig).backgroundColor
                          : '#ffffff'
                      }
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          backgroundColor: e.target.value,
                        } as TextElementConfig)
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateElement({
                          ...selectedElement,
                          backgroundColor: 'transparent',
                        } as TextElementConfig)
                      }
                      className="flex-1 px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
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

              {/* Barcode Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Bar Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={(selectedElement as BarcodeElementConfig).lineColor || '#000000'}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          lineColor: e.target.value,
                        } as BarcodeElementConfig)
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500 truncate">
                      {(selectedElement as BarcodeElementConfig).lineColor || '#000000'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Barcode Background
                  </label>
                  <input
                    type="color"
                    value={
                      (selectedElement as BarcodeElementConfig).backgroundColor || '#ffffff'
                    }
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        backgroundColor: e.target.value,
                      } as BarcodeElementConfig)
                    }
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
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
                {availableColumns.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 max-h-20 overflow-y-auto">
                    {availableColumns.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() =>
                          onUpdateElement({
                            ...selectedElement,
                            templateString: (selectedElement as QRElementConfig).templateString
                              ? `${(selectedElement as QRElementConfig).templateString} {{${col}}}`
                              : `{{${col}}}`,
                          } as QRElementConfig)
                        }
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 hover:bg-purple-50 hover:border-purple-200 text-slate-600 hover:text-purple-700 rounded transition-colors cursor-pointer"
                      >
                        + {col}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    QR Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={(selectedElement as QRElementConfig).color || '#0f172a'}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          color: e.target.value,
                        } as QRElementConfig)
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500 truncate">
                      {(selectedElement as QRElementConfig).color || '#0f172a'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    QR Background
                  </label>
                  <input
                    type="color"
                    value={(selectedElement as QRElementConfig).backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        backgroundColor: e.target.value,
                      } as QRElementConfig)
                    }
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Error Correction Level
                </label>
                <select
                  value={(selectedElement as QRElementConfig).errorCorrectionLevel || 'M'}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      errorCorrectionLevel: e.target.value as QRElementConfig['errorCorrectionLevel'],
                    } as QRElementConfig)
                  }
                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5"
                >
                  <option value="L">L — Low (smallest code)</option>
                  <option value="M">M — Medium (recommended)</option>
                  <option value="Q">Q — Quartile (damage resistant)</option>
                  <option value="H">H — High (most robust)</option>
                </select>
              </div>
            </div>
          )}

          {/* SHAPE ELEMENT CONFIG */}
          {selectedElement.type === 'shape' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Shape Type
                </label>
                <select
                  value={(selectedElement as ShapeElementConfig).shape}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      shape: e.target.value as ShapeType,
                    } as ShapeElementConfig)
                  }
                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-2 font-medium"
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="rounded-rectangle">Rounded Rectangle</option>
                  <option value="ellipse">Ellipse / Circle</option>
                  <option value="line">Divider Line</option>
                  <option value="triangle">Triangle</option>
                  <option value="diamond">Diamond</option>
                  <option value="star">Star</option>
                  <option value="arrow">Arrow</option>
                </select>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-semibold text-slate-600">Quick color styles</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[
                    { fill: '#dbeafe', stroke: '#1d4ed8' },
                    { fill: '#dcfce7', stroke: '#15803d' },
                    { fill: '#fef3c7', stroke: '#b45309' },
                    { fill: '#fee2e2', stroke: '#b91c1c' },
                    { fill: '#f3e8ff', stroke: '#7e22ce' },
                    { fill: '#e2e8f0', stroke: '#0f172a' },
                  ].map((style) => (
                    <button
                      key={style.fill + style.stroke}
                      type="button"
                      title={`${style.fill} / ${style.stroke}`}
                      onClick={() =>
                        onUpdateElement({
                          ...selectedElement,
                          fillColor: style.fill,
                          strokeColor: style.stroke,
                        } as ShapeElementConfig)
                      }
                      className="h-6 rounded border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: style.fill, borderColor: style.stroke }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Fill Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={(selectedElement as ShapeElementConfig).fillColor}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          fillColor: e.target.value,
                        } as ShapeElementConfig)
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500 truncate">
                      {(selectedElement as ShapeElementConfig).fillColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Stroke Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={(selectedElement as ShapeElementConfig).strokeColor}
                      onChange={(e) =>
                        onUpdateElement({
                          ...selectedElement,
                          strokeColor: e.target.value,
                        } as ShapeElementConfig)
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500 truncate">
                      {(selectedElement as ShapeElementConfig).strokeColor}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Border Width (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={(selectedElement as ShapeElementConfig).strokeWidth}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        strokeWidth: Number(e.target.value),
                      } as ShapeElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Corner Radius
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={(selectedElement as ShapeElementConfig).borderRadius ?? 0}
                    onChange={(e) =>
                      onUpdateElement({
                        ...selectedElement,
                        borderRadius: Number(e.target.value),
                      } as ShapeElementConfig)
                    }
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Opacity ({Math.round(((selectedElement as ShapeElementConfig).opacity ?? 1) * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(((selectedElement as ShapeElementConfig).opacity ?? 1) * 100)}
                  onChange={(e) =>
                    onUpdateElement({
                      ...selectedElement,
                      opacity: Number(e.target.value) / 100,
                    } as ShapeElementConfig)
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
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
        /* Empty selection state */
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-500 block">
              NO ELEMENT SELECTED
            </span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 space-y-2">
              <p>Click an element on the canvas or pick a layer above to edit it.</p>
              <p>Use the eye icon to hide or show a layer.</p>
              <p>Drag layers in the list to change which element sits in front.</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            Selected elements get layer order controls: send to back, backward, forward, and bring to front.
          </div>
        </div>
      )}
    </div>
  );
};
