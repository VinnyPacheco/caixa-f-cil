import { ImportParser, ParsedTransaction } from './types';

/**
 * Parser for Itaú bank statement files (.txt)
 * Format: DD/MM/YYYY;DESCRIPTION;VALUE
 * Separator: ;
 * Decimal: , (comma)
 * Negative values = expenses, Positive values = income
 */
export const itauParser: ImportParser = {
  id: 'itau',
  name: 'Itaú',
  fileExtension: '.txt',
  fileExtensions: ['.txt', '.pdf'],
  parse: (fileContent: string): ParsedTransaction[] => {
    const lines = fileContent.trim().split('\n');
    const transactions: ParsedTransaction[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const parts = trimmedLine.split(';');
      if (parts.length < 3) continue;

      const [dateStr, description, valueStr] = parts;

      // Parse date from DD/MM/YYYY to YYYY-MM-DD
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) continue;
      
      const [day, month, year] = dateParts;
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Parse value - replace comma with dot for decimal
      const numericValue = parseFloat(valueStr.replace(',', '.'));
      if (isNaN(numericValue)) continue;

      const type = numericValue >= 0 ? 'income' : 'expense';
      const amount = Math.abs(numericValue);

      transactions.push({
        date: formattedDate,
        description: description.trim(),
        amount,
        type,
      });
    }

    return transactions;
  },
  /**
   * Parses text extracted from an Itaú PDF statement.
   * Each transaction line follows: `DD/MM/YYYY DESCRIPTION VALUE`, where the
   * value uses Brazilian formatting (`.` thousands, `,` decimals) and may be
   * prefixed with `-` for expenses. Lines such as "SALDO DO DIA", aviso
   * sections and headers are ignored.
   */
  parsePdf: (extractedText: string): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];
    const lines = extractedText.split('\n');

    // Matches: "27/04/2026  RSCSS WAGNERSAVIOL2604  -5,00"
    //          "02/04/2026  PAGTO SALARIO  1.055,00"
    const lineRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})\s*$/;

    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      if (!line) continue;

      const match = line.match(lineRegex);
      if (!match) continue;

      const [, dateStr, description, valueStr] = match;
      const cleanDesc = description.trim();

      // Skip daily balance rows and other non-transactional summary lines.
      const upper = cleanDesc.toUpperCase();
      if (
        upper.includes('SALDO DO DIA') ||
        upper.includes('SALDO ANTERIOR') ||
        upper.startsWith('SALDO ')
      ) {
        continue;
      }

      const [day, month, year] = dateStr.split('/');
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Brazilian number: remove thousand separators, replace decimal comma.
      const numericValue = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
      if (isNaN(numericValue)) continue;

      transactions.push({
        date: formattedDate,
        description: cleanDesc,
        amount: Math.abs(numericValue),
        type: numericValue >= 0 ? 'income' : 'expense',
      });
    }

    return transactions;
  },
};
