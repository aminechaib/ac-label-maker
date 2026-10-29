import * as XLSX from 'xlsx';
import { ExcelDataset } from '../types/label';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Parses an uploaded Excel or CSV file. Only the first worksheet is read.
 * Cell values are stringified and trimmed for predictable token interpolation.
 */
export async function parseExcelFile(file: File): Promise<ExcelDataset> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('That file is larger than 25 MB. Please use a smaller spreadsheet.');
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded spreadsheet has no worksheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (rawRows.length === 0) {
    throw new Error('The uploaded spreadsheet contains no data rows.');
  }

  const headerSet = new Set<string>();
  rawRows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const header = key.trim();
      if (header) headerSet.add(header);
    });
  });

  const headers = Array.from(headerSet);
  if (headers.length === 0) {
    throw new Error('The uploaded spreadsheet contains no column headers.');
  }

  const rows = rawRows.map((row) => {
    const cleanRow: Record<string, string | number> = {};
    headers.forEach((header) => {
      const value = row[header];
      cleanRow[header] = value !== undefined && value !== null ? String(value).trim() : '';
    });
    return cleanRow;
  });

  return {
    fileName: file.name,
    headers,
    rows,
    totalRows: rows.length,
  };
}

export function createEmptyDataset(
  fileName: string,
  headers: string[],
  rows: Record<string, string | number>[] = []
): ExcelDataset {
  return {
    fileName,
    headers,
    rows,
    totalRows: rows.length,
  };
}
