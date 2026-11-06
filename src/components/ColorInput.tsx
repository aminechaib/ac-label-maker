import React, { useEffect, useState } from 'react';
import { Pipette } from 'lucide-react';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  title?: string;
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_PATTERN.test(withHash) ? withHash.toUpperCase() : null;
}

function toSwatchColor(value: string): string {
  const normalized = normalizeHex(value);
  if (!normalized) return '#000000';

  const hex = normalized.slice(1);
  if (hex.length === 3) {
    return `#${hex
      .split('')
      .map((char) => char + char)
      .join('')}`;
  }
  if (hex.length === 8) return `#${hex.slice(0, 6)}`;
  return normalized;
}

export const ColorInput: React.FC<ColorInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '#748DC8',
  title = 'Color',
}) => {
  const [text, setText] = useState(value.toUpperCase());
  const [isValid, setIsValid] = useState(true);
  const canUseEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  useEffect(() => {
    setText(value.toUpperCase());
    setIsValid(true);
  }, [value]);

  const commitText = (nextText: string) => {
    setText(nextText);
    const normalized = normalizeHex(nextText);
    setIsValid(Boolean(normalized));
    if (normalized) onChange(normalized);
  };

  const handleBlur = () => {
    if (isValid) return;
    setText(value.toUpperCase());
    setIsValid(true);
  };

  const handleEyeDropper = async () => {
    if (!canUseEyeDropper) return;

    try {
      const EyeDropperCtor = (window as unknown as {
        EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
      }).EyeDropper;
      const result = await new EyeDropperCtor().open();
      const normalized = normalizeHex(result.sRGBHex) || result.sRGBHex;
      setText(normalized.toUpperCase());
      setIsValid(true);
      onChange(normalized);
    } catch {
      // The user cancelled the picker or the browser blocked it.
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <input
        type="color"
        title={`${title} swatch`}
        value={toSwatchColor(value)}
        onChange={(event) => {
          const normalized = event.target.value.toUpperCase();
          setText(normalized);
          setIsValid(true);
          onChange(normalized);
        }}
        className="w-7 h-7 shrink-0 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
      />
      <input
        type="text"
        value={text}
        onChange={(event) => commitText(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        placeholder={placeholder}
        spellCheck={false}
        className={`min-w-0 flex-1 text-[11px] font-mono uppercase bg-white border rounded px-2 py-1 focus:outline-none focus:ring-1 ${
          isValid
            ? 'border-slate-200 focus:border-slate-400 focus:ring-slate-300'
            : 'border-red-300 text-red-600 focus:border-red-400 focus:ring-red-200'
        }`}
      />
      <button
        type="button"
        onClick={handleEyeDropper}
        disabled={!canUseEyeDropper}
        title={
          canUseEyeDropper
            ? 'Pick a color from the screen'
            : 'Eyedropper is not supported by this browser'
        }
        className="p-1.5 shrink-0 text-slate-500 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      >
        <Pipette className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
