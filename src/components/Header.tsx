import React, { useRef } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Image as ImageIcon,
  Sparkles,
  Download,
  Save,
  FolderOpen,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'template' | 'data' | 'designer' | 'bulk';
  setActiveTab: (tab: 'template' | 'data' | 'designer' | 'bulk') => void;
  rowCount: number;
  templateName: string;
  onOpenExport: () => void;
  onSaveTemplate: () => void;
  onLoadTemplate: (file: File) => void;
  hasTemplate: boolean;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  rowCount,
  templateName,
  onOpenExport,
  onSaveTemplate,
  onLoadTemplate,
  hasTemplate,
  hasData,
}) => {
  const templateFileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Zone 1: Logo + Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs overflow-hidden">
          <img src="/AC.png" alt="AC Logo" className="w-7 h-7 object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            AC LABEL MAKER
          </span>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {templateName ? `${templateName} · ` : ''}{rowCount} records loaded
          </span>
        </div>
      </div>

      {/* Zone 2: Workflow Navigation Links */}
      <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab('template')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'template'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-slate-500" />
          <span>1. Template Image</span>
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'data'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-slate-500" />
          <span>2. Excel Data</span>
          {rowCount > 0 && (
            <span className="text-xs font-mono px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded-sm">
              {rowCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('designer')}
          disabled={!hasTemplate}
          title={hasTemplate ? 'Open the visual designer' : 'Upload or create a template first'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-40 ${
            activeTab === 'designer'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-slate-500" />
          <span>3. Visual Designer</span>
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          disabled={!hasTemplate || !hasData}
          title={hasTemplate && hasData ? 'Preview all rendered labels' : 'Add a template and data first'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:cursor-not-allowed disabled:opacity-40 ${
            activeTab === 'bulk'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>4. Batch Preview</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          ref={templateFileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onLoadTemplate(file);
            event.target.value = '';
          }}
        />

        <button
          onClick={() => templateFileRef.current?.click()}
          title="Load a saved template (.json)"
          className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden xl:inline">Load</span>
        </button>

        <button
          onClick={onSaveTemplate}
          disabled={!hasTemplate}
          title={hasTemplate ? 'Save this template as a .json file' : 'Create a template first'}
          className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden xl:inline">Save Template</span>
        </button>

        <button
          onClick={onOpenExport}
          disabled={!hasTemplate}
          title={hasTemplate ? 'Open export options' : 'Upload or create a template first'}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Generate & Export ({rowCount})</span>
        </button>
      </div>
    </header>
  );
};