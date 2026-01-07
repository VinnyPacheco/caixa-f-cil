import { ImportParser, ParsedTransaction } from './types';

/**
 * Parser for Banco do Brasil bank statement files (.csv)
 * Format: "Data","Lançamento","Detalhes","Nº documento","Valor","Tipo Lançamento"
 * First line is header, data starts at line 2
 * Separator: , (comma) with quoted fields
 * Decimal: , (comma)
 * Skip lines with "Saldo Anterior", "Saldo do dia", "S A L D O" or date "00/00/0000"
 * Tipo Lançamento: "Saída" = expense, "Entrada" = income
 */
export const bancoBrasilParser: ImportParser = {
  id: 'banco_brasil',
  name: 'Banco do Brasil',
  fileExtension: '.csv',
  parse: (fileContent: string): ParsedTransaction[] => {
    const lines = fileContent.trim().split('\n');
    const transactions: ParsedTransaction[] = [];

    // Skip first line (header)
    for (let i = 1; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine) continue;

      // Parse CSV with quoted fields
      const matches = trimmedLine.match(/"([^"]*)"/g);
      if (!matches || matches.length < 6) continue;

      // Remove quotes from each field
      const fields = matches.map(m => m.replace(/"/g, ''));
      const [dateStr, lancamento, detalhes, , valorStr, tipoLancamento] = fields;

      // Skip balance lines and invalid dates
      if (dateStr === '00/00/0000') continue;
      if (lancamento.includes('Saldo Anterior')) continue;
      if (lancamento.includes('Saldo do dia')) continue;
      if (lancamento.includes('S A L D O')) continue;

      // Parse date from DD/MM/YYYY to YYYY-MM-DD
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) continue;
      
      const [day, month, year] = dateParts;
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Parse value - replace comma with dot for decimal
      const cleanedValue = valorStr.replace(/\./g, '').replace(',', '.');
      const numericValue = parseFloat(cleanedValue);
      if (isNaN(numericValue)) continue;

      // Determine type based on "Tipo Lançamento" or value sign
      let type: 'income' | 'expense';
      if (tipoLancamento) {
        type = tipoLancamento.toLowerCase().includes('entrada') ? 'income' : 'expense';
      } else {
        type = numericValue >= 0 ? 'income' : 'expense';
      }
      
      const amount = Math.abs(numericValue);

      // Combine lançamento and detalhes for description
      const description = detalhes?.trim() 
        ? `${lancamento.trim()} - ${detalhes.trim()}`
        : lancamento.trim();

      transactions.push({
        date: formattedDate,
        description,
        amount,
        type,
      });
    }

    return transactions;
  },
};
