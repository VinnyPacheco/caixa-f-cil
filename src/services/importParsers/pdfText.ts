import * as pdfjsLib from 'pdfjs-dist';
// Vite serves this as a static asset URL; pdfjs needs a worker to parse PDFs.
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extracts text from a PDF file, preserving line breaks by grouping text
 * items that share approximately the same vertical position on each page.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items by their vertical position (y coordinate from transform[5]).
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of textContent.items as Array<{ str: string; transform: number[] }>) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const existing = rows.get(y);
      if (existing) {
        existing.push({ x, str: item.str });
      } else {
        rows.set(y, [{ x, str: item.str }]);
      }
    }

    // Sort rows top-to-bottom (higher y is higher on page in PDF coords).
    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const parts = rows.get(y)!.sort((a, b) => a.x - b.x);
      const line = parts.map((p) => p.str).join(' ').replace(/\s+/g, ' ').trim();
      if (line) allLines.push(line);
    }
  }

  return allLines.join('\n');
}