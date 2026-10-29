import React, { useState } from 'react';
import { Header } from './components/Header';
import { TemplateUploader } from './components/TemplateUploader';
import { ExcelDataPanel } from './components/ExcelDataPanel';
import { DesignerCanvas } from './components/DesignerCanvas';
import { ElementInspector } from './components/ElementInspector';
import { RecordNavigator } from './components/RecordNavigator';
import { BulkExportModal } from './components/BulkExportModal';
import { EmptyState } from './components/EmptyState';
import {
  CanvasElement,
  ExcelDataset,
  LabelTemplate,
  TextElementConfig,
  BarcodeElementConfig,
  ImageElementConfig,
  QRElementConfig,
} from './types/label';
import { renderLabelToCanvas } from './utils/renderer';
import { Download, Eye, LayoutTemplate, Database, Printer } from 'lucide-react';

export default function App() {
  const [currentTemplate, setCurrentTemplate] = useState<LabelTemplate | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [dataset, setDataset] = useState<ExcelDataset | null>(null);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'template' | 'data' | 'designer' | 'bulk'>('template');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const handleSelectTemplate = (template: LabelTemplate) => {
    setCurrentTemplate(template);
    setElements(template.elements);
    setSelectedElementId(template.elements[0]?.id || null);
  };

  const handleUploadCustomImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || 800;
        const height = img.naturalHeight || 500;
        const newTemplate: LabelTemplate = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          backgroundUrl: dataUrl,
          originalWidth: width,
          originalHeight: height,
          aspectRatio: width / height,
          elements,
        };
        setCurrentTemplate(newTemplate);
        if (elements.length === 0) {
          setSelectedElementId(null);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateElement = (updated: CanvasElement) => {
    setElements((prev) => prev.map((el) => (el.id === updated.id ? updated : el)));
  };

  const handleDeleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleDuplicateElement = (id: string) => {
    if (!currentTemplate) return;
    const el = elements.find((item) => item.id === id);
    if (!el) return;
    const duplicated: CanvasElement = {
      ...el,
      id: `el_${Date.now()}`,
      name: `${el.name} (Copy)`,
      x: Math.min(currentTemplate.originalWidth - el.width, el.x + 20),
      y: Math.min(currentTemplate.originalHeight - el.height, el.y + 20),
    };
    setElements((prev) => [...prev, duplicated]);
    setSelectedElementId(duplicated.id);
  };

  const handleAddElement = (
    type: 'text' | 'barcode' | 'qr' | 'static-text' | 'image',
    initialSrc?: string
  ) => {
    if (!currentTemplate) return;

    const headers = dataset?.headers ?? [];
    const firstCol = headers[0] || '';
    const barcodeCol =
      headers.find(
        (header) =>
          header.toLowerCase().includes('barcode') || header.toLowerCase().includes('ean')
      ) || firstCol;

    if (type === 'image') {
      const newImage: ImageElementConfig = {
        id: `el_img_${Date.now()}`,
        name: 'Picture / Badge',
        type: 'image',
        src: initialSrc || '',
        objectFit: 'contain',
        keepAspectRatio: true,
        x: Math.round(currentTemplate.originalWidth * 0.72),
        y: 100,
        width: 100,
        height: 100,
      };
      setElements((prev) => [...prev, newImage]);
      setSelectedElementId(newImage.id);
    } else if (type === 'barcode') {
      const newBarcode: BarcodeElementConfig = {
        id: `el_barcode_${Date.now()}`,
        name: barcodeCol ? `Barcode (${barcodeCol})` : 'Barcode',
        type: 'barcode',
        columnSource: barcodeCol,
        barcodeFormat: 'EAN13',
        displayValue: true,
        fontSize: 13,
        lineColor: '#000000',
        backgroundColor: '#ffffff',
        margin: 2,
        x: Math.round(currentTemplate.originalWidth * 0.25),
        y: Math.round(currentTemplate.originalHeight * 0.6),
        width: 340,
        height: 80,
      };
      setElements((prev) => [...prev, newBarcode]);
      setSelectedElementId(newBarcode.id);
    } else if (type === 'qr') {
      const size = Math.max(80, Math.min(180, Math.round(currentTemplate.originalHeight * 0.25)));
      const newQr: QRElementConfig = {
        id: `el_qr_${Date.now()}`,
        name: 'QR Code',
        type: 'qr',
        templateString: firstCol ? `{{${firstCol}}}` : '',
        color: '#0f172a',
        backgroundColor: '#ffffff',
        x: Math.round(currentTemplate.originalWidth * 0.75),
        y: Math.round(currentTemplate.originalHeight * 0.25),
        width: size,
        height: size,
      };
      setElements((prev) => [...prev, newQr]);
      setSelectedElementId(newQr.id);
    } else {
      const newText: TextElementConfig = {
        id: `el_text_${Date.now()}`,
        name: firstCol ? `Text (${firstCol})` : 'Text',
        type: 'text',
        templateString: firstCol ? `{{${firstCol}}}` : '',
        x: Math.round(currentTemplate.originalWidth * 0.1),
        y: Math.round(currentTemplate.originalHeight * 0.3),
        width: 400,
        height: 36,
        fontSize: 18,
        fontFamily: 'Calibri',
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'left',
      };
      setElements((prev) => [...prev, newText]);
      setSelectedElementId(newText.id);
    }
  };

  const handleAddImageAtPosition = (file: File, x: number, y: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || 100;
        const naturalH = img.naturalHeight || 100;
        const targetW = Math.min(160, Math.max(60, naturalW));
        const targetH = Math.round(targetW * (naturalH / naturalW));

        const newImage: ImageElementConfig = {
          id: `el_img_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, '').slice(0, 18),
          type: 'image',
          src: dataUrl,
          objectFit: 'contain',
          keepAspectRatio: true,
          x,
          y,
          width: targetW,
          height: targetH,
        };
        setElements((prev) => [...prev, newImage]);
        setSelectedElementId(newImage.id);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAddTextElementForColumn = (column: string) => {
    if (!currentTemplate) return;
    const newText: TextElementConfig = {
      id: `el_text_${Date.now()}`,
      name: `${column} Field`,
      type: 'text',
      templateString: `{{${column}}}`,
      x: 40,
      y: 60 + (elements.length % 6) * 45,
      width: 380,
      height: 34,
      fontSize: 16,
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: '600',
      color: '#0f172a',
      textAlign: 'left',
    };
    setElements((prev) => [...prev, newText]);
    setSelectedElementId(newText.id);
    setActiveTab('designer');
  };

  const handleAddBarcodeElementForColumn = (column: string) => {
    if (!currentTemplate) return;
    const isEan = column.toLowerCase().includes('ean');
    const newBarcode: BarcodeElementConfig = {
      id: `el_barcode_${Date.now()}`,
      name: `${column} Barcode`,
      type: 'barcode',
      columnSource: column,
      barcodeFormat: isEan ? 'EAN13' : 'CODE128',
      displayValue: true,
      fontSize: 13,
      lineColor: '#000000',
      backgroundColor: '#ffffff',
      margin: 2,
      x: 60,
      y: Math.round(currentTemplate.originalHeight * 0.65),
      width: 360,
      height: 80,
    };
    setElements((prev) => [...prev, newBarcode]);
    setSelectedElementId(newBarcode.id);
    setActiveTab('designer');
  };

  const activeRow = dataset?.rows?.[activeRowIndex] ?? dataset?.rows?.[0];
  const hasData = Boolean(dataset && dataset.rows.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        rowCount={dataset?.totalRows ?? 0}
        templateName={currentTemplate?.name ?? ''}
        onOpenExport={() => setIsExportModalOpen(true)}
        hasTemplate={Boolean(currentTemplate)}
        hasData={hasData}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'template' && (
          <div className="flex-1 overflow-y-auto">
            <TemplateUploader
              currentTemplate={currentTemplate}
              onSelectTemplate={handleSelectTemplate}
              onUploadImage={handleUploadCustomImage}
              onNextStep={() => setActiveTab('data')}
            />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="flex-1 overflow-y-auto">
            <ExcelDataPanel
              dataset={dataset}
              setDataset={setDataset}
              activeRowIndex={activeRowIndex}
              setActiveRowIndex={setActiveRowIndex}
              onAddTextElementForColumn={handleAddTextElementForColumn}
              onAddBarcodeElementForColumn={handleAddBarcodeElementForColumn}
              onNextStep={() => setActiveTab('designer')}
            />
          </div>
        )}

        {activeTab === 'designer' && (
          currentTemplate ? (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-4">
                {dataset && dataset.rows.length > 0 ? (
                  <RecordNavigator
                    dataset={dataset}
                    activeRowIndex={activeRowIndex}
                    setActiveRowIndex={setActiveRowIndex}
                  />
                ) : (
                  <div className="text-xs text-slate-500">
                    No data loaded yet. Elements will show their placeholder text.
                  </div>
                )}

                <div className="hidden lg:flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('bulk')}
                    disabled={!hasData}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View All {dataset?.totalRows ?? 0} Rendered Labels</span>
                  </button>

                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export Batch PDF / ZIP</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <DesignerCanvas
                  template={currentTemplate}
                  elements={elements}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onUpdateElement={handleUpdateElement}
                  onAddImageAtPosition={handleAddImageAtPosition}
                  activeRow={activeRow}
                  activeRowIndex={activeRowIndex}
                />

                <ElementInspector
                  elements={elements}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onUpdateElement={handleUpdateElement}
                  onDeleteElement={handleDeleteElement}
                  onDuplicateElement={handleDuplicateElement}
                  onAddElement={handleAddElement}
                  availableColumns={dataset?.headers ?? []}
                  activeRow={activeRow}
                />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={LayoutTemplate}
              title="Choose a template first"
              description="Upload your artwork or create a blank label before opening the designer."
              actionLabel="Go to Template"
              onAction={() => setActiveTab('template')}
            />
          )
        )}

        {activeTab === 'bulk' && (
          !currentTemplate ? (
            <EmptyState
              icon={LayoutTemplate}
              title="No template selected"
              description="Add a template before previewing a batch of labels."
              actionLabel="Go to Template"
              onAction={() => setActiveTab('template')}
            />
          ) : !hasData ? (
            <EmptyState
              icon={Database}
              title="No data to preview"
              description="Import a spreadsheet or create a table, then come back to see every rendered label."
              actionLabel="Go to Data"
              onAction={() => setActiveTab('data')}
            />
          ) : (
            <div className="flex-1 overflow-y-auto max-w-6xl mx-auto px-6 py-8 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Batch Preview ({dataset?.totalRows ?? 0} Labels)
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Review each label populated with row data and rendered barcodes.
                  </p>
                </div>

                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Open Export Dialog</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dataset?.rows.map((row, index) => {
                  const firstValue =
                    Object.values(row).find((value) => String(value).trim().length > 0) || `#${index + 1}`;
                  const partName = Object.entries(row).find(
                    ([key, value]) => /part|name|description/i.test(key) && String(value).trim()
                  )?.[1];

                  return (
                    <div
                      key={index}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 text-xs gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold shrink-0">
                            #{index + 1}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">
                            {String(firstValue)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center p-2 bg-slate-50 rounded-lg overflow-hidden">
                        <BatchCardPreview
                          template={currentTemplate}
                          elements={elements}
                          row={row}
                          rowIndex={index}
                        />
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-3">
                        <span className="truncate">
                          {partName ? String(partName).slice(0, 32) : 'Custom Label'}
                        </span>
                        <button
                          onClick={() => {
                            setActiveRowIndex(index);
                            setActiveTab('designer');
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer shrink-0"
                        >
                          Edit in Designer →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </main>

      {currentTemplate && (
        <BulkExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          template={currentTemplate}
          elements={elements}
          rows={dataset?.rows ?? []}
          activeRowIndex={activeRowIndex}
        />
      )}
    </div>
  );
}

/**
 * Lightweight individual label card renderer for the bulk preview tab.
 */
function BatchCardPreview({
  template,
  elements,
  row,
  rowIndex,
}: {
  template: LabelTemplate;
  elements: CanvasElement[];
  row: Record<string, string | number>;
  rowIndex: number;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');

  React.useEffect(() => {
    let isMounted = true;
    renderLabelToCanvas(template, elements, row, rowIndex, 0.75).then((canvas) => {
      if (isMounted) {
        setDataUrl(canvas.toDataURL('image/jpeg', 0.9));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [template, elements, row, rowIndex]);

  if (!dataUrl) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400">
        Rendering label #{rowIndex + 1}...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`Label ${rowIndex + 1}`}
      className="max-h-56 object-contain rounded shadow-xs"
    />
  );
}
