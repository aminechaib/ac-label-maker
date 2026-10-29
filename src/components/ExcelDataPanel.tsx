import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Barcode as BarcodeIcon,
  Type,
  ArrowRight,
  AlertCircle,
  Database,
  Eye,
  Columns,
  Eraser,
} from 'lucide-react';
import { ExcelDataset } from '../types/label';
import { createEmptyDataset, parseExcelFile } from '../utils/excel';

interface ExcelDataPanelProps {
  dataset: ExcelDataset | null;
  setDataset: (dataset: ExcelDataset) => void;
  activeRowIndex: number;
  setActiveRowIndex: (index: number) => void;
  onAddTextElementForColumn: (column: string) => void;
  onAddBarcodeElementForColumn: (column: string) => void;
  onNextStep: () => void;
}

export const ExcelDataPanel: React.FC<ExcelDataPanelProps> = ({
  dataset,
  setDataset,
  activeRowIndex,
  setActiveRowIndex,
  onAddTextElementForColumn,
  onAddBarcodeElementForColumn,
  onNextStep,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blankColumns, setBlankColumns] = useState('');
  const [newColumnName, setNewColumnName] = useState('');

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const parsed = await parseExcelFile(file);
      setDataset(parsed);
      setActiveRowIndex(0);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to parse the spreadsheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleCreateBlankDataset = () => {
    const headers = Array.from(
      new Set(
        blankColumns
          .split(',')
          .map((column) => column.trim())
          .filter(Boolean)
      )
    );

    if (headers.length === 0) {
      setErrorMessage('Enter at least one column name, separated by commas.');
      return;
    }

    setErrorMessage(null);
    setDataset(createEmptyDataset('Untitled dataset', headers));
    setActiveRowIndex(0);
    setBlankColumns('');
  };

  const handleAddRow = () => {
    if (!dataset) return;
    if (dataset.headers.length === 0) {
      setErrorMessage('Add a column before adding rows.');
      return;
    }

    const newRow: Record<string, string | number> = {};
    dataset.headers.forEach((header) => {
      newRow[header] = '';
    });

    const updatedRows = [...dataset.rows, newRow];
    setDataset({ ...dataset, rows: updatedRows, totalRows: updatedRows.length });
    setActiveRowIndex(updatedRows.length - 1);
    setErrorMessage(null);
  };

  const handleDeleteRow = (index: number) => {
    if (!dataset) return;
    const updated = dataset.rows.filter((_, rowIndex) => rowIndex !== index);
    setDataset({ ...dataset, rows: updated, totalRows: updated.length });
    if (activeRowIndex >= updated.length) {
      setActiveRowIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleCellEdit = (rowIndex: number, header: string, value: string) => {
    if (!dataset) return;
    const updated = [...dataset.rows];
    updated[rowIndex] = { ...updated[rowIndex], [header]: value };
    setDataset({ ...dataset, rows: updated, totalRows: updated.length });
  };

  const handleAddColumn = () => {
    if (!dataset) return;
    const header = newColumnName.trim();
    if (!header) {
      setErrorMessage('Enter a column name.');
      return;
    }
    if (dataset.headers.includes(header)) {
      setErrorMessage('That column already exists.');
      return;
    }

    setDataset({
      ...dataset,
      headers: [...dataset.headers, header],
      rows: dataset.rows.map((row) => ({ ...row, [header]: '' })),
    });
    setNewColumnName('');
    setErrorMessage(null);
  };

  const handleClearRows = () => {
    if (!dataset || dataset.rows.length === 0) return;
    if (!window.confirm('Remove every row from this dataset? The columns will stay.')) return;
    setDataset({ ...dataset, rows: [], totalRows: 0 });
    setActiveRowIndex(0);
  };

  const uploadBox = (
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
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
        <Upload className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">Drop your spreadsheet here</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        Import .xlsx, .xls, or .csv files up to 25 MB. The first worksheet is used.
      </p>
      <button
        type="button"
        className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        Browse Files
      </button>
    </div>
  );

  if (!dataset) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Import Label Data
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload a spreadsheet or create a blank table. Column names become available as dynamic tokens.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            {isProcessing ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                Parsing spreadsheet...
              </div>
            ) : (
              uploadBox
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create a blank table</h3>
                  <p className="text-[11px] text-slate-500">Enter the column names you need.</p>
                </div>
              </div>

              <label className="text-[11px] font-semibold text-slate-600">
                Columns (comma separated)
                <input
                  type="text"
                  value={blankColumns}
                  onChange={(e) => setBlankColumns(e.target.value)}
                  placeholder="e.g. OE_Number, Barcode, Part_Name"
                  className="mt-1 w-full text-xs bg-white border border-slate-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </label>

              <button
                onClick={handleCreateBlankDataset}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Create Table</span>
              </button>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                You can add columns and rows manually after the table is created.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredRows = dataset.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return Object.values(row).some((value) => String(value).toLowerCase().includes(searchLower));
    });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Label Data
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{dataset.fileName}</span> · {dataset.totalRows} rows · {dataset.headers.length} columns
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>{isProcessing ? 'Parsing...' : 'Replace Spreadsheet'}</span>
          </button>

          <button
            onClick={onNextStep}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <span>Proceed to Designer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {errorMessage && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 tracking-wider">
              DETECTED COLUMNS (CLICK TO ADD TO THE LABEL)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a column as dynamic text or bind it to a barcode.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {dataset.headers.length} fields
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {dataset.headers.map((header) => {
            const isBarcodeLike =
              header.toLowerCase().includes('barcode') ||
              header.toLowerCase().includes('ean') ||
              header.toLowerCase().includes('upc') ||
              header.toLowerCase().includes('serial') ||
              header.toLowerCase().includes('oe');

            return (
              <div
                key={header}
                className="flex items-center gap-1.5 p-1.5 pl-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <span className="font-mono font-medium text-slate-800">{header}</span>

                <div className="flex items-center gap-1 ml-1 border-l border-slate-200 pl-1.5">
                  <button
                    onClick={() => onAddTextElementForColumn(header)}
                    title={`Add a text element for {{${header}}}`}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                  >
                    <Type className="w-3 h-3 text-slate-500" />
                    <span>Text</span>
                  </button>

                  <button
                    onClick={() => onAddBarcodeElementForColumn(header)}
                    title={`Generate a barcode from ${header}`}
                    className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                      isBarcodeLike
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <BarcodeIcon className="w-3 h-3" />
                    <span>Barcode</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-2 border-t border-slate-100 pt-3">
          <label className="text-[11px] font-semibold text-slate-600 flex-1">
            Add column
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddColumn();
              }}
              placeholder="New column name"
              className="mt-1 w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </label>
          <button
            onClick={handleAddColumn}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rows..."
                className="pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <span className="text-xs text-slate-500">
              Showing {filteredRows.length} of {dataset.totalRows} rows
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearRows}
              disabled={dataset.rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Clear Rows</span>
            </button>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-16 text-center">Active</th>
                <th className="py-2.5 px-3 w-12 text-slate-400">#</th>
                {dataset.headers.map((header) => (
                  <th key={header} className="py-2.5 px-3 whitespace-nowrap font-mono font-medium">
                    {header}
                  </th>
                ))}
                <th className="py-2.5 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(({ row, index }) => {
                const isActive = activeRowIndex === index;
                return (
                  <tr
                    key={index}
                    onClick={() => setActiveRowIndex(index)}
                    className={`transition-colors cursor-pointer ${
                      isActive ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2 px-3 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center justify-center text-blue-600">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveRowIndex(index);
                          }}
                          className="text-slate-400 hover:text-slate-600"
                          title="Preview this row in the designer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400 tabular-nums">
                      {index + 1}
                    </td>
                    {dataset.headers.map((header) => (
                      <td key={header} className="py-2 px-3 whitespace-nowrap">
                        <input
                          type="text"
                          value={String(row[header] ?? '')}
                          onChange={(e) => handleCellEdit(index, header, e.target.value)}
                          className={`w-full bg-transparent px-1.5 py-0.5 rounded focus:bg-white focus:ring-1 focus:ring-blue-400 focus:outline-none ${
                            header.toLowerCase().includes('barcode') || header.toLowerCase().includes('oe')
                              ? 'font-mono text-slate-900 font-semibold'
                              : 'text-slate-700'
                          }`}
                        />
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(index);
                        }}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={dataset.headers.length + 3} className="py-10 text-center text-xs text-slate-400">
                    {dataset.rows.length === 0
                      ? 'No rows yet. Add a row to start entering data.'
                      : 'No rows match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dataset.headers.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Tip: use {'{{Column_Name}}'} in text elements to merge row values.</span>
        </div>
      )}
    </div>
  );
};
