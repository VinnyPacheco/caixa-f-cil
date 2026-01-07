import { ImportParser, ParsedTransaction } from './types';

/**
 * Parser for Mercado Pago bank statement files (.csv)
 * Format: DD-MM-YYYY;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE
 * First 4 lines are header/summary, data starts at line 5
 * Separator: ;
 * Decimal: , (comma)
 * Negative values = expenses, Positive values = income
 */
export const mercadoPagoParser: ImportParser = {
  id: 'mercado_pago',
  name: 'Mercado Pago',
  fileExtension: '.csv',
  parse: (fileContent: string): ParsedTransaction[] => {
    const lines = fileContent.trim().split('\n');
    const transactions: ParsedTransaction[] = [];

    // Skip first 4 lines (summary header, summary values, empty line, data header)
    for (let i = 4; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine) continue;

      const parts = trimmedLine.split(';');
      if (parts.length < 4) continue;

      const [dateStr, description, , valueStr] = parts;

      // Parse date from DD-MM-YYYY to YYYY-MM-DD
      const dateParts = dateStr.split('-');
      if (dateParts.length !== 3) continue;
      
      const [day, month, year] = dateParts;
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Parse value - replace comma with dot for decimal, handle thousand separator
      const cleanedValue = valueStr.replace(/\./g, '').replace(',', '.');
      const numericValue = parseFloat(cleanedValue);
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
