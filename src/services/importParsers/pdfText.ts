import * as pdfjsLib from 'pdfjs-dist';
// Vite serves this as a static asset URL; pdfjs needs a worker to parse PDFs.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PdfTextOptions {
  /**
   * Statements printed in two columns (e.g. Itaú credit-card invoices) must be
   * read column by column, otherwise rows from both columns get merged into a
   * single line and the entries become unparseable.
   */
  twoColumn?: boolean;
}

/**
 * Extracts text from a PDF file, preserving line breaks by grouping text
 * items that share approximately the same vertical position on each page.
 */
export async function extractTextFromPdf(
  file: File,
  password?: string,
  options: PdfTextOptions = {}
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    ...(password ? { password } : {}),
  }).promise;

  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageWidth = page.getViewport({ scale: 1 }).width;
    const midX = pageWidth / 2;

    // One bucket per column (a single bucket when the page is single-column).
    const columns: Map<number, { x: number; str: string }[]>[] = options.twoColumn
      ? [new Map(), new Map()]
      : [new Map()];

    for (const item of textContent.items as Array<{ str: string; transform: number[] }>) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const rows = options.twoColumn && x >= midX ? columns[1] : columns[0];
      const existing = rows.get(y);
      if (existing) {
        existing.push({ x, str: item.str });
      } else {
        rows.set(y, [{ x, str: item.str }]);
      }
    }

    // Sort rows top-to-bottom (higher y is higher on page in PDF coords),
    // emitting the left column entirely before the right one.
    for (const rows of columns) {
      const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const parts = rows.get(y)!.sort((a, b) => a.x - b.x);
        const line = parts.map((p) => p.str).join(' ').replace(/\s+/g, ' ').trim();
        if (line) allLines.push(line);
      }
    }
  }

  return allLines.join('\n');
}