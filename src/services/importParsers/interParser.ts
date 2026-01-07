import { ImportParser, ParsedTransaction } from './types';

/**
 * Parser for Banco Inter bank statement files (.csv)
 * Format: DD/MM/YYYY;HISTÓRICO;DESCRIÇÃO;VALOR;SALDO
 * First 5 lines are header/summary, column header at line 6, data starts at line 7
 * Separator: ;
 * Decimal: , (comma)
 * Negative values = expenses, Positive values = income
 */
export const interParser: ImportParser = {
  id: 'inter',
  name: 'Inter',
  fileExtension: '.csv',
  parse: (fileContent: string): ParsedTransaction[] => {
    const lines = fileContent.trim().split('\n');
    const transactions: ParsedTransaction[] = [];

    // Skip first 6 lines (header info + column headers)
    for (let i = 6; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine) continue;

      const parts = trimmedLine.split(';');
      if (parts.length < 4) continue;

      const [dateStr, historico, descricao, valueStr] = parts;

      // Parse date from DD/MM/YYYY to YYYY-MM-DD
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) continue;
      
      const [day, month, year] = dateParts;
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Parse value - replace comma with dot for decimal
      const cleanedValue = valueStr.replace(/\./g, '').replace(',', '.');
      const numericValue = parseFloat(cleanedValue);
      if (isNaN(numericValue)) continue;

      const type = numericValue >= 0 ? 'income' : 'expense';
      const amount = Math.abs(numericValue);

      // Combine histórico and descrição for full description
      const fullDescription = descricao?.trim() 
        ? `${historico.trim()} - ${descricao.trim()}`
        : historico.trim();

      transactions.push({
        date: formattedDate,
        description: fullDescription,
        amount,
        type,
      });
    }

    return transactions;
  },
};
