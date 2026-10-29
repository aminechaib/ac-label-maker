import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from 'lucide-react';
import { ExcelDataset } from '../types/label';
import { getRowValue } from '../utils/row';

interface RecordNavigatorProps {
  dataset: ExcelDataset;
  activeRowIndex: number;
  setActiveRowIndex: (index: number) => void;
}

export const RecordNavigator: React.FC<RecordNavigatorProps> = ({
  dataset,
  activeRowIndex,
  setActiveRowIndex,
}) => {
  const total = dataset.rows.length;
  if (total === 0) return null;

  const currentRow = dataset.rows[activeRowIndex] || {};
  const oeNum = getRowValue(currentRow, 'OE_Number') || getRowValue(currentRow, 'Part_Name');
  const barcodeNum = getRowValue(currentRow, 'Barcode') || getRowValue(currentRow, 'EAN');

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400">DATA RECORD:</span>
        <div className="flex items-center gap-1 font-mono text-xs tabular-nums bg-slate-800 px-2 py-0.5 rounded">
          <span className="text-emerald-400 font-bold">{activeRowIndex + 1}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-300">{total}</span>
        </div>
      </div>

      {/* Row context snippet */}
      {(oeNum || barcodeNum) && (
        <div className="hidden sm:flex items-center gap-3 text-xs">
          {oeNum && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">OE:</span>
              <span className="font-mono font-semibold text-white">{String(oeNum)}</span>
            </div>
          )}
          {barcodeNum && (
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
              <span className="text-slate-400">Barcode:</span>
              <span className="font-mono font-semibold text-amber-300">{String(barcodeNum)}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActiveRowIndex(0)}
          disabled={activeRowIndex === 0}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          title="First Record"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveRowIndex(Math.max(0, activeRowIndex - 1))}
          disabled={activeRowIndex === 0}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          title="Previous Record"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <select
          value={activeRowIndex}
          onChange={(e) => setActiveRowIndex(Number(e.target.value))}
          className="bg-slate-800 text-white text-xs font-mono rounded px-2 py-1 border border-slate-700 focus:outline-none"
        >
          {dataset.rows.map((r, i) => {
            const label =
              getRowValue(r, 'OE_Number') ||
              getRowValue(r, 'Barcode') ||
              Object.values(r).find((value) => String(value).trim()) ||
              `Row ${i + 1}`;
            return (
              <option key={i} value={i}>
                #{i + 1}: {String(label).slice(0, 24)}
              </option>
            );
          })}
        </select>

        <button
          onClick={() => setActiveRowIndex(Math.min(total - 1, activeRowIndex + 1))}
          disabled={activeRowIndex >= total - 1}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          title="Next Record"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveRowIndex(total - 1)}
          disabled={activeRowIndex >= total - 1}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          title="Last Record"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
