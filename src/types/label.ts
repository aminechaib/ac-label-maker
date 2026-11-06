export type ElementType = 'text' | 'barcode' | 'qr' | 'static-text' | 'counter' | 'image' | 'shape';

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF';

export type ShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'ellipse'
  | 'line'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'arrow';

export interface BaseElement {
  id: string;
  name: string;
  type: ElementType;
  x: number; // template pixel coordinate
  y: number;
  width: number;
  height: number;
  locked?: boolean;
  visible?: boolean;
}

export interface TextElementConfig extends BaseElement {
  type: 'text' | 'static-text' | 'counter';
  templateString: string; // e.g. "OE Number is: {{OE_Number}}"
  fontSize: number; // in px at base template scale
  fontFamily: 'Calibri' | 'Plus Jakarta Sans' | 'DM Sans' | 'JetBrains Mono' | 'Arial' | 'Times New Roman' | 'Courier New';
  fontWeight: '400' | '500' | '600' | '700' | '800';
  color: string;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  letterSpacing?: number;
  lineHeight?: number;
  strokeColor?: string;
  strokeWidth?: number;
  prefix?: string;
  suffix?: string;
  counterStart?: number;
  counterStep?: number;
  counterPad?: number; // e.g. 3 => 001
}

export interface BarcodeElementConfig extends BaseElement {
  type: 'barcode';
  columnSource: string; // Excel column name to read data from, e.g. "Barcode" or "OE_Number"
  barcodeFormat: BarcodeFormat;
  displayValue: boolean; // Show human readable numbers below bars
  fontSize: number;
  lineColor: string;
  backgroundColor: string;
  margin: number;
  autoEanChecksum?: boolean; // automatically correct checksum if 12-13 digits
}

export interface QRElementConfig extends BaseElement {
  type: 'qr';
  templateString: string; // can use {{column}} tokens
  color: string;
  backgroundColor: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface ImageElementConfig extends BaseElement {
  type: 'image';
  src: string; // Base64 data URL, SVG, or remote URL
  objectFit: 'contain' | 'cover' | 'fill';
  opacity?: number; // 0 to 1
  keepAspectRatio?: boolean;
  columnSource?: string; // Optional: Excel column to read image URL or data from
  borderRadius?: number;
}

export interface ShapeElementConfig extends BaseElement {
  type: 'shape';
  shape: ShapeType;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius?: number;
  opacity?: number;
}

export type CanvasElement =
  | TextElementConfig
  | BarcodeElementConfig
  | QRElementConfig
  | ImageElementConfig
  | ShapeElementConfig;

export interface LabelTemplate {
  id: string;
  name: string;
  backgroundUrl: string; // data URL or object URL or SVG
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
  elements: CanvasElement[];
}

export interface ExcelDataset {
  fileName: string;
  headers: string[];
  rows: Record<string, string | number>[];
  totalRows: number;
}

export type SheetGridSize = 'single' | '2x4' | '3x7' | '3x8' | '2x2';

export interface PrintSettings {
  paperSize: 'a4' | 'letter' | 'thermal_4x6' | 'single_label';
  grid: SheetGridSize;
  dpi: number; // 150, 300
  labelsPerPage: number;
  marginMm: number;
  gapMm: number;
}
