import React, { useRef, useState, useEffect } from 'react';
import {
  CanvasElement,
  LabelTemplate,
  TextElementConfig,
  BarcodeElementConfig,
  QRElementConfig,
  ImageElementConfig,
  ShapeElementConfig,
} from '../types/label';
import { interpolateTokens, getFontFamilyStack } from '../utils/renderer';
import { generateBarcodeDataUrl, generateQrPath } from '../utils/barcode';
import { getRowValue } from '../utils/row';
import { ZoomIn, ZoomOut, Grid, Lock, Image as ImageIcon } from 'lucide-react';

function getStarPoints(width: number, height: number, inset: number): string {
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
    points.push(`${cx + Math.cos(angle) * rx},${cy + Math.sin(angle) * ry}`);
  }
  return points.join(' ');
}

const ShapePreview: React.FC<{ config: ShapeElementConfig }> = ({ config }) => {
  const width = Math.max(1, config.width);
  const height = Math.max(1, config.height);
  const strokeWidth = Math.max(0, config.strokeWidth || 0);
  const inset = strokeWidth / 2;
  const innerWidth = Math.max(0, width - strokeWidth);
  const innerHeight = Math.max(0, height - strokeWidth);
  const radius = Math.max(
    0,
    Math.min(config.borderRadius ?? 0, innerWidth / 2, innerHeight / 2)
  );
  const shared = {
    fill: config.fillColor,
    stroke: config.strokeColor,
    strokeWidth,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };

  let shapeNode: React.ReactNode;
  switch (config.shape) {
    case 'ellipse':
      shapeNode = (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={innerWidth / 2}
          ry={innerHeight / 2}
          {...shared}
        />
      );
      break;
    case 'line':
      shapeNode = (
        <line
          x1={inset}
          y1={height / 2}
          x2={width - inset}
          y2={height / 2}
          stroke={config.strokeColor}
          strokeWidth={Math.max(1, strokeWidth || 2)}
          strokeLinecap="round"
        />
      );
      break;
    case 'triangle':
      shapeNode = (
        <polygon
          points={`${width / 2},${inset} ${width - inset},${height - inset} ${inset},${height - inset}`}
          {...shared}
        />
      );
      break;
    case 'diamond':
      shapeNode = (
        <polygon
          points={`${width / 2},${inset} ${width - inset},${height / 2} ${width / 2},${height - inset} ${inset},${height / 2}`}
          {...shared}
        />
      );
      break;
    case 'star':
      shapeNode = (
        <polygon points={getStarPoints(width, height, inset)} {...shared} />
      );
      break;
    case 'arrow': {
      const x = inset;
      const y = inset;
      const w = innerWidth;
      const h = innerHeight;
      shapeNode = (
        <polygon
          points={`${x},${y + h * 0.32} ${x + w * 0.58},${y + h * 0.32} ${x + w * 0.58},${y} ${
            x + w
          },${y + h / 2} ${x + w * 0.58},${y + h} ${x + w * 0.58},${y + h * 0.68} ${x},${
            y + h * 0.68
          }`}
          {...shared}
        />
      );
      break;
    }
    case 'rounded-rectangle':
    case 'rectangle':
    default:
      shapeNode = (
        <rect
          x={inset}
          y={inset}
          width={innerWidth}
          height={innerHeight}
          rx={radius}
          ry={radius}
          {...shared}
        />
      );
      break;
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ opacity: config.opacity ?? 1, pointerEvents: 'none' }}
    >
      {shapeNode}
    </svg>
  );
};

type ResizeDirection = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's';

interface ResizeState {
  id: string;
  dir: ResizeDirection;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialW: number;
  initialH: number;
  aspect: number;
  lockAspect: boolean;
}

interface DesignerCanvasProps {
  template: LabelTemplate;
  elements: CanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: CanvasElement) => void;
  onAddImageAtPosition?: (file: File, x: number, y: number) => void;
  activeRow: Record<string, string | number> | undefined;
  activeRowIndex: number;
}

export const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  template,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onAddImageAtPosition,
  activeRow,
  activeRowIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-fit initial zoom based on container width
  useEffect(() => {
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth - 80;
      const fitZoom = Math.min(1.2, Math.max(0.6, containerW / template.originalWidth));
      setZoom(fitZoom);
    }
  }, [template.id, template.originalWidth]);

  // Keyboard navigation for nudging selected element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElementId) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const el = elements.find((item) => item.id === selectedElementId);
      if (!el || el.locked) return;

      const step = e.shiftKey ? 10 : 1;
      let newX = el.x;
      let newY = el.y;

      if (e.key === 'ArrowLeft') {
        newX = Math.max(0, el.x - step);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        newX = Math.min(template.originalWidth - el.width, el.x + step);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        newY = Math.max(0, el.y - step);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        newY = Math.min(template.originalHeight - el.height, el.y + step);
        e.preventDefault();
      } else {
        return;
      }

      onUpdateElement({ ...el, x: newX, y: newY });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, elements, template, onUpdateElement]);

  // Handle Drag Move & Resize Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId) {
      const el = elements.find((item) => item.id === draggingId);
      if (!el || el.locked) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentMouseX = (e.clientX - rect.left) / zoom;
      const currentMouseY = (e.clientY - rect.top) / zoom;

      let newX = currentMouseX - dragOffset.x;
      let newY = currentMouseY - dragOffset.y;

      if (showGrid) {
        newX = Math.round(newX / 5) * 5;
        newY = Math.round(newY / 5) * 5;
      }

      newX = Math.max(0, Math.min(template.originalWidth - el.width, newX));
      newY = Math.max(0, Math.min(template.originalHeight - el.height, newY));

      onUpdateElement({ ...el, x: newX, y: newY });
    } else if (resizeState) {
      const el = elements.find((item) => item.id === resizeState.id);
      if (!el || el.locked) return;

      const deltaX = (e.clientX - resizeState.startX) / zoom;
      const deltaY = (e.clientY - resizeState.startY) / zoom;
      const lock = resizeState.lockAspect || e.shiftKey;
      const aspect = resizeState.aspect || 1;

      let newW = resizeState.initialW;
      let newH = resizeState.initialH;
      let newX = resizeState.initialX;
      let newY = resizeState.initialY;

      switch (resizeState.dir) {
        case 'se': {
          newW = Math.max(20, resizeState.initialW + deltaX);
          if (lock) {
            newH = Math.max(20, Math.round(newW / aspect));
          } else {
            newH = Math.max(20, resizeState.initialH + deltaY);
          }
          break;
        }
        case 'sw': {
          newW = Math.max(20, resizeState.initialW - deltaX);
          newX = resizeState.initialX + (resizeState.initialW - newW);
          if (lock) {
            newH = Math.max(20, Math.round(newW / aspect));
          } else {
            newH = Math.max(20, resizeState.initialH + deltaY);
          }
          break;
        }
        case 'ne': {
          newW = Math.max(20, resizeState.initialW + deltaX);
          if (lock) {
            newH = Math.max(20, Math.round(newW / aspect));
            newY = resizeState.initialY + (resizeState.initialH - newH);
          } else {
            newH = Math.max(20, resizeState.initialH - deltaY);
            newY = resizeState.initialY + (resizeState.initialH - newH);
          }
          break;
        }
        case 'nw': {
          newW = Math.max(20, resizeState.initialW - deltaX);
          newX = resizeState.initialX + (resizeState.initialW - newW);
          if (lock) {
            newH = Math.max(20, Math.round(newW / aspect));
            newY = resizeState.initialY + (resizeState.initialH - newH);
          } else {
            newH = Math.max(20, resizeState.initialH - deltaY);
            newY = resizeState.initialY + (resizeState.initialH - newH);
          }
          break;
        }
        case 'e': {
          newW = Math.max(20, resizeState.initialW + deltaX);
          if (lock) {
            newH = Math.max(20, Math.round(newW / aspect));
          }
          break;
        }
        case 's': {
          newH = Math.max(20, resizeState.initialH + deltaY);
          if (lock) {
            newW = Math.max(20, Math.round(newH * aspect));
          }
          break;
        }
      }

      if (showGrid) {
        newW = Math.round(newW / 5) * 5;
        newH = Math.round(newH / 5) * 5;
        newX = Math.round(newX / 5) * 5;
        newY = Math.round(newY / 5) * 5;
      }

      onUpdateElement({ ...el, x: newX, y: newY, width: newW, height: newH });
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    setResizeState(null);
  };

  const startResize = (
    e: React.MouseEvent,
    el: CanvasElement,
    dir: ResizeDirection
  ) => {
    e.stopPropagation();
    const isImage = el.type === 'image';
    const lockAspect = isImage
      ? (el as ImageElementConfig).keepAspectRatio !== false
      : false;

    setResizeState({
      id: el.id,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialW: el.width,
      initialH: el.height,
      aspect: el.width / Math.max(1, el.height),
      lockAspect,
    });
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.name.endsWith('.svg'))) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dropX = Math.max(0, Math.round((e.clientX - rect.left) / zoom - 40));
      const dropY = Math.max(0, Math.round((e.clientY - rect.top) / zoom - 40));
      onAddImageAtPosition?.(file, dropX, dropY);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Canvas Top Bar Controls */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-200 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">CANVAS VIEWPORT</span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-slate-500 tabular-nums">
            {template.originalWidth} × {template.originalHeight} px (Scale {Math.round(zoom * 100)}%)
          </span>
          <span className="text-slate-400 hidden sm:inline">·</span>
          <span className="text-slate-500 hidden sm:inline text-[11px]">
            Tip: Drag & drop any picture file directly onto the label
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Snap Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              showGrid ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid Snap</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono px-2 text-[11px] font-semibold text-slate-700 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-1.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 border-l border-slate-200 ml-0.5 cursor-pointer"
              title="Reset 100%"
            >
              1:1
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Workspace with scrolling and drag-drop support */}
      <div
        className="flex-1 overflow-auto p-10 flex items-center justify-center relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropOnCanvas}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectElement(null);
          }
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: `${template.originalWidth * zoom}px`,
            height: `${template.originalHeight * zoom}px`,
          }}
          className="relative bg-white shadow-2xl rounded-sm transition-transform duration-75 overflow-hidden border border-slate-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onSelectElement(null);
            }
          }}
        >
          {/* Background Label Template Artwork */}
          <img
            src={template.backgroundUrl}
            alt="Template Background"
            draggable={false}
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />

          {/* Optional Visual Grid Lines */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-15"
              style={{
                backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              }}
            />
          )}

          {/* Interactive Element Layers */}
          {elements.map((el) => {
            if (el.visible === false) return null;
            const isSelected = el.id === selectedElementId;
            const isCurrentlyResizing = resizeState?.id === el.id;

            const xPx = el.x * zoom;
            const yPx = el.y * zoom;
            const wPx = el.width * zoom;
            const hPx = el.height * zoom;

            return (
              <div
                key={el.id}
                style={{
                  transform: `translate(${xPx}px, ${yPx}px)`,
                  width: `${wPx}px`,
                  height: `${hPx}px`,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelectElement(el.id);
                  if (el.locked) return;

                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const currentMouseX = (e.clientX - rect.left) / zoom;
                    const currentMouseY = (e.clientY - rect.top) / zoom;
                    setDragOffset({
                      x: currentMouseX - el.x,
                      y: currentMouseY - el.y,
                    });
                    setDraggingId(el.id);
                  }
                }}
                className={`absolute top-0 left-0 transition-shadow ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-md z-30 cursor-move'
                    : 'hover:ring-1 hover:ring-slate-400/80 z-20 cursor-pointer'
                }`}
              >
                {/* Visual Label Tag Badge when selected */}
                {isSelected && (
                  <div className="absolute -top-5 left-0 px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-mono rounded-t flex items-center gap-1 shadow-xs pointer-events-none whitespace-nowrap">
                    <span>{el.name}</span>
                    {el.locked && <Lock className="w-2.5 h-2.5 text-amber-300" />}
                    <span className="text-blue-200 text-[9px] tabular-nums">
                      ({Math.round(el.width)}×{Math.round(el.height)})
                    </span>
                  </div>
                )}

                {/* Content Rendering for Dynamic Text */}
                {(el.type === 'text' || el.type === 'static-text' || el.type === 'counter') && (
                  <div
                    style={{
                      fontFamily: getFontFamilyStack((el as TextElementConfig).fontFamily),
                      fontSize: `${(el as TextElementConfig).fontSize * zoom}px`,
                      fontWeight: (el as TextElementConfig).fontWeight || '400',
                      color: (el as TextElementConfig).color || '#000000',
                      textAlign: (el as TextElementConfig).textAlign || 'left',
                      textTransform: (el as TextElementConfig).textTransform || 'none',
                      fontStyle: (el as TextElementConfig).fontStyle || 'normal',
                      textDecoration: (el as TextElementConfig).textDecoration || 'none',
                      backgroundColor: (el as TextElementConfig).backgroundColor || 'transparent',
                      lineHeight: (el as TextElementConfig).lineHeight || 1.25,
                      letterSpacing: `${((el as TextElementConfig).letterSpacing ?? 0) * zoom}px`,
                      WebkitTextStroke:
                        (el as TextElementConfig).strokeWidth &&
                        (el as TextElementConfig).strokeWidth! > 0
                          ? `${(el as TextElementConfig).strokeWidth! * zoom}px ${
                              (el as TextElementConfig).strokeColor || (el as TextElementConfig).color
                            }`
                          : undefined,
                    }}
                    className="w-full h-full p-1 whitespace-pre-wrap break-words overflow-hidden"
                  >
                    {interpolateTokens(
                      (el as TextElementConfig).templateString,
                      activeRow,
                      activeRowIndex,
                      (el as TextElementConfig).counterStart || 1
                    )}
                  </div>
                )}

                {/* Content Rendering for Picture / Image */}
                {el.type === 'image' && (
                  <div className="w-full h-full overflow-hidden flex items-center justify-center pointer-events-none select-none">
                    {(() => {
                      const imgEl = el as ImageElementConfig;
                      let src = imgEl.src;
                      if (imgEl.columnSource) {
                        src = getRowValue(activeRow, imgEl.columnSource) || imgEl.src;
                      }
                      return src ? (
                        <img
                          src={src}
                          alt={imgEl.name}
                          draggable={false}
                          style={{
                            objectFit: imgEl.objectFit || 'contain',
                            opacity: imgEl.opacity !== undefined ? imgEl.opacity : 1,
                          }}
                          className="w-full h-full"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-slate-400 bg-slate-50 border border-slate-200 w-full h-full">
                          <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                          <span className="text-[10px]">No Picture</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Content Rendering for Barcode */}
                {el.type === 'barcode' && (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white/95 rounded-xs p-1">
                    {(() => {
                      const barcodeEl = el as BarcodeElementConfig;
                      const rawVal = getRowValue(activeRow, barcodeEl.columnSource);

                      if (!rawVal) {
                        return (
                          <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] font-medium text-slate-400">
                            No barcode value
                          </div>
                        );
                      }

                      const { dataUrl } = generateBarcodeDataUrl(rawVal, {
                        format: barcodeEl.barcodeFormat,
                        displayValue: barcodeEl.displayValue !== false,
                        fontSize: barcodeEl.fontSize * zoom,
                        lineColor: barcodeEl.lineColor || '#000000',
                        backgroundColor: barcodeEl.backgroundColor || '#ffffff',
                        margin: barcodeEl.margin ?? 2,
                        width: el.width * zoom,
                        height: el.height * zoom,
                      });

                      return dataUrl ? (
                        <img
                          src={dataUrl}
                          alt="Barcode"
                          draggable={false}
                          className="w-full h-full object-contain pointer-events-none select-none"
                        />
                      ) : (
                        <div className="text-[10px] text-red-500 font-mono">Barcode Invalid</div>
                      );
                    })()}
                  </div>
                )}

                {/* Content Rendering for QR Code */}
                {el.type === 'qr' && (
                  <div className="w-full h-full flex items-center justify-center p-1 bg-white/90">
                    {(() => {
                      const qrEl = el as QRElementConfig;
                      const val = interpolateTokens(qrEl.templateString, activeRow, activeRowIndex);
                      if (!val.trim()) {
                        return (
                          <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] font-medium text-slate-400">
                            No QR content
                          </div>
                        );
                      }
                      const qr = generateQrPath(val, qrEl.errorCorrectionLevel || 'M');
                      return qr ? (
                        <svg
                          viewBox={`0 0 ${qr.totalModules} ${qr.totalModules}`}
                          preserveAspectRatio="xMidYMid meet"
                          shapeRendering="crispEdges"
                          className="w-full h-full pointer-events-none select-none"
                          role="img"
                          aria-label="QR Code"
                        >
                          <rect
                            width={qr.totalModules}
                            height={qr.totalModules}
                            fill={qrEl.backgroundColor || '#ffffff'}
                          />
                          <path d={qr.path} fill={qrEl.color || '#0f172a'} />
                        </svg>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Content Rendering for Shapes */}
                {el.type === 'shape' && (
                  <div className="w-full h-full pointer-events-none">
                    <ShapePreview config={el as ShapeElementConfig} />
                  </div>
                )}

                {/* Multi-Handle Resizers when Selected */}
                {isSelected && !el.locked && (
                  <>
                    {/* Bottom-Right Handle (SE) */}
                    <div
                      onMouseDown={(e) => startResize(e, el, 'se')}
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-xs cursor-se-resize shadow-md z-40 hover:scale-125 transition-transform"
                      title="Drag to resize (Shift to lock aspect ratio)"
                    />

                    {/* Bottom-Left Handle (SW) */}
                    <div
                      onMouseDown={(e) => startResize(e, el, 'sw')}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-xs cursor-sw-resize shadow-md z-40 hover:scale-125 transition-transform"
                      title="Drag to resize"
                    />

                    {/* Top-Right Handle (NE) */}
                    <div
                      onMouseDown={(e) => startResize(e, el, 'ne')}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-xs cursor-ne-resize shadow-md z-40 hover:scale-125 transition-transform"
                      title="Drag to resize"
                    />

                    {/* Top-Left Handle (NW) */}
                    <div
                      onMouseDown={(e) => startResize(e, el, 'nw')}
                      className="absolute -top-2 -left-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-xs cursor-nw-resize shadow-md z-40 hover:scale-125 transition-transform"
                      title="Drag to resize"
                    />

                    {/* Right-Edge Handle (E) */}
                    <div
                      onMouseDown={(e) => startResize(e, el, 'e')}
                      className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-5 bg-blue-600 border border-white rounded-xs cursor-e-resize shadow-xs z-40"
                      title="Resize width"
                    />

                    {/* Bottom-Edge Handle (S) */}
                    <div
                      onMouseDown={(e) => startResize(e, el, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-3 bg-blue-600 border border-white rounded-xs cursor-s-resize shadow-xs z-40"
                      title="Resize height"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
