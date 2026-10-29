# AGENTS.md

## What this is

AC LABEL MAKER: a client-only React SPA for uploading label artwork, mapping spreadsheet columns, placing text/barcode/QR/image elements, and exporting bulk labels. Vite 8 + React 19 + TypeScript 7 + Tailwind 4. No backend, router, tests, or persistence; all state lives in `src/App.tsx`. This checkout is not a git repository.

## Commands

- `npm install` — use npm; both `package-lock.json` and `bun.lock` exist.
- `npm run dev` — Vite dev server on `0.0.0.0:3000`.
- `npm run lint` — runs only `tsc --noEmit` (there is no ESLint). Run it after changes.
- `npm run build` / `npm run preview`.
- There is no test script or test framework. Canvas/Excel utilities require a browser DOM, so don't assume a Node test harness.
- Baseline is currently green: `npm run lint` and `npm run build` pass. Build reports only the existing `__dirname` Vite warning and a large-chunk warning.

## Architecture

- `src/App.tsx` owns all state and the tab flow: `template` -> `data` -> `designer` -> `bulk`. `BulkExportModal` is opened from the header and from the designer/bulk views.
- `src/types/label.ts` is the schema source of truth. Element `x`/`y`/`width`/`height` are template pixels, not percentages.
- `src/utils/renderer.ts` is the single rendering path for designer previews, batch previews, PDF, ZIP, and print. Change rendering behavior there, not in each component.
- Exporters: `pdfExport.ts` (single-label pages or sheet grids), `zipExport.ts` (2x PNGs plus a `labels.csv` manifest). Barcodes use JsBarcode in `barcode.ts`; Excel parsing (first worksheet only, values stringified/trimmed) is in `excel.ts`.
- `src/utils/row.ts` provides `normalizeColumnKey`, `getRowValue`, and `getFirstRowValue`; use these for case/space/underscore-tolerant column lookup.
- `src/utils/template.ts` creates blank-label SVG data URLs. `TemplateUploader` supports upload, drag/drop, blank-label presets, and file validation.
- There are no sample templates, sample badges, or sample spreadsheet rows in `src/`. The app starts empty and asks the user to upload artwork/data or create blanks.
- Branding assets live in `public/` (`AC.png`, favicons, app icons, `og-image.png`, `site.webmanifest`). `index.html` references them.

## Gotchas

- QR codes use the real `qrcode` package via `generateQrDataUrl`; do not reintroduce a fake hash-based QR.
- Token interpolation (`interpolateTokens`) supports `{{Col}}` and `{Col}`, ignores case/spaces/underscores, and has special tokens `index`/`row`, `counter`, and `date`/`today`.
- Barcode and image column lookups use `getRowValue`, so they are tolerant of case/spacing differences.
- Empty barcode/QR values are skipped or shown as placeholders; there is no hard-coded sample barcode fallback.
- EAN-13 values are auto-padded and re-checksummed. If the selected barcode format fails, `generateBarcodeDataUrl` retries with CODE128 using the original value; empty values return an error instead of a fake barcode.
- `zipExport` chooses a readable filename from preferred/common columns but falls back to the first non-empty value or a numbered filename. It does not require `OE_Number`/`Barcode`.
- `BulkExportModal` allows a single-label PNG export even when no rows are loaded; PDF/ZIP/print require at least one row.
- The `@` alias resolves to the repository root, not `src/` (`vite.config.ts`, `tsconfig.json`). Existing imports are relative.
- Vite intentionally disables HMR and file watching when `DISABLE_HMR=true`; don't remove that AI Studio behavior.
- README and `.env.example` are AI Studio boilerplate: `GEMINI_API_KEY` and `APP_URL` are unused, and `express`/`dotenv`/`tsx` are installed but unused. There is no server.
- Tailwind v4 is CSS-first (`@import "tailwindcss"` in `src/index.css`); there is no `tailwind.config.*`.
- `tsconfig.json` has no `strict` and uses `noEmit`, so typecheck will not catch null/undefined dereferences.
- Root `AC.png` is the source artwork; the copy in `public/AC.png` is what ships in `dist/`.

## Conventions

- Components are `src/components/PascalCase.tsx` with named exports (`export const X: React.FC<Props>`); `App` is the only default export.
- Use types from `src/types/label.ts`, Tailwind utility classes inline (slate/blue/emerald palette), and `lucide-react` icons.
