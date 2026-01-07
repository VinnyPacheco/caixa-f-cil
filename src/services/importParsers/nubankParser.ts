import { ImportParser, ParsedTransaction } from './types';

/**
 * Parser for Nubank bank statement files (.csv)
 * Format: Data,Valor,Identificador,Descrição
 * First line is header, data starts at line 2
 * Separator: , (comma)
 * Decimal: . (dot)
 * Negative values = expenses, Positive values = income
 */
export const nubankParser: ImportParser = {
  id: 'nubank',
  name: 'Nubank',
  fileExtension: '.csv',
  parse: (fileContent: string): ParsedTransaction[] => {
    const lines = fileContent.trim().split('\n');
    const transactions: ParsedTransaction[] = [];

    // Skip first line (header)
    for (let i = 1; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine) continue;

      // Handle CSV with commas inside description - split carefully
      // Format: DD/MM/YYYY,VALUE,UUID,DESCRIPTION
      const match = trimmedLine.match(/^(\d{2}\/\d{2}\/\d{4}),(-?[\d.]+),([^,]+),(.+)$/);
      if (!match) continue;

      const [, dateStr, valueStr, , description] = match;

      // Parse date from DD/MM/YYYY to YYYY-MM-DD
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) continue;
      
      const [day, month, year] = dateParts;
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Parse value - already uses dot as decimal
      const numericValue = parseFloat(valueStr);
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
