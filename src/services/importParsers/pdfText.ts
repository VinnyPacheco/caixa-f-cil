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

interface TextPart {
  x: number;
  width: number;
  str: string;
}

type PageRows = Map<number, TextPart[]>;

/**
 * Finds the x coordinate that separates the two printed columns of a page by
 * looking at the horizontal gaps of the rows that contain a DD/MM date (the
 * entry rows). The gutter between columns is the right-most wide gap located
 * around the middle of the page — gaps further left belong to the
 * description/value split inside the same table.
 */
function detectColumnBoundary(rows: PageRows, pageWidth: number): number | null {
  const intervals: [number, number][] = [];
  for (const parts of rows.values()) {
    const text = parts.map((p) => p.str).join(' ');
    if (!/\d{2}\/\d{2}/.test(text)) continue;
    for (const p of parts) intervals.push([p.x, p.x + p.width]);
  }
  if (intervals.length < 6) return null;

  intervals.sort((a, b) => a[0] - b[0]);
  let cursor = intervals[0][1];
  let boundary: number | null = null;
  for (const [start, end] of intervals) {
    if (start - cursor >= 18) {
      const center = (cursor + start) / 2;
      if (center > pageWidth * 0.45 && center < pageWidth * 0.7) boundary = center;
    }
    cursor = Math.max(cursor, end);
  }
  return boundary;
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

    // Group items by their vertical position (y coordinate from transform[5]).
    const rows: PageRows = new Map();
    for (const item of textContent.items as Array<{
      str: string;
      width?: number;
      transform: number[];
    }>) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const part: TextPart = { x: item.transform[4], width: item.width ?? 0, str: item.str };
      const existing = rows.get(y);
      if (existing) existing.push(part);
      else rows.set(y, [part]);
    }

    const boundary = options.twoColumn ? detectColumnBoundary(rows, pageWidth) : null;

    // Build one bucket per column so the left column is read entirely before
    // the right one (entries continue from one column/page to the next).
    const columns: { y: number; line: string }[][] = boundary === null ? [[]] : [[], []];
    for (const [y, parts] of rows) {
      const groups =
        boundary === null
          ? [parts]
          : [parts.filter((p) => p.x < boundary), parts.filter((p) => p.x >= boundary)];
      groups.forEach((group, index) => {
        if (!group.length) return;
        const line = [...group]
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (line) columns[index].push({ y, line });
      });
    }

    // Sort rows top-to-bottom (higher y is higher on page in PDF coords).
    for (const column of columns) {
      column.sort((a, b) => b.y - a.y);
      for (const { line } of column) allLines.push(line);
    }
  }

  return allLines.join('\n');
}