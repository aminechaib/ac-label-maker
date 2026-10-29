export function normalizeColumnKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '');
}

export function getRowValue(
  row: Record<string, string | number> | undefined,
  column: string | undefined
): string {
  if (!row || !column) return '';
  if (row[column] !== undefined) return String(row[column]);

  const target = normalizeColumnKey(column);
  const matchedKey = Object.keys(row).find((key) => normalizeColumnKey(key) === target);
  return matchedKey ? String(row[matchedKey]) : '';
}

export function getFirstRowValue(
  row: Record<string, string | number> | undefined,
  columns: string[]
): string {
  for (const column of columns) {
    const value = getRowValue(row, column);
    if (value) return value;
  }
  return '';
}
