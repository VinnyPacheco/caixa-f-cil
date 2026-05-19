export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface ImportParser {
  id: string;
  name: string;
  fileExtension: string;
  /**
   * Optional list of accepted file extensions. If provided, takes precedence
   * over `fileExtension` for validation and the file picker. Allows the same
   * parser to handle multiple formats (e.g., .txt and .pdf).
   */
  fileExtensions?: string[];
  parse: (fileContent: string) => ParsedTransaction[];
  /**
   * Optional dedicated parser for text extracted from a PDF file. When the
   * uploaded file is a PDF, the page will extract its text content first and
   * then call this function. Falls back to `parse` if not provided.
   */
  parsePdf?: (extractedText: string) => ParsedTransaction[];
}
