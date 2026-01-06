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
};
