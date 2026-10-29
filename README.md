# AC LABEL MAKER

A client-only label design and bulk export tool. Upload label artwork or create a blank canvas, map spreadsheet columns, place dynamic text, barcodes, QR codes, and images, then export print-ready labels.

## Features

- Upload SVG, PNG, JPG, or WebP label artwork, or create a blank label with preset sizes.
- Import `.xlsx`, `.xls`, or `.csv` data, or build a table manually.
- Bind text, barcodes, QR codes, and images to spreadsheet columns.
- Real EAN-13, UPC, EAN-8, CODE128, CODE39, ITF barcodes via JsBarcode.
- Real scannable QR codes via `qrcode`.
- Batch preview, single-label PNG, multi-page PDF, ZIP with PNGs and `labels.csv`, and direct printing.
- No backend, account, or persistence: all state stays in the browser.

## Run locally

Requires Node.js.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm run dev      # Start Vite on 0.0.0.0:3000
npm run lint     # TypeScript check (tsc --noEmit)
npm run build    # Production build
npm run preview  # Preview the production build
```

## Tech stack

Vite 8, React 19, TypeScript 7, Tailwind CSS 4, JsBarcode, qrcode, SheetJS, jsPDF, JSZip.
