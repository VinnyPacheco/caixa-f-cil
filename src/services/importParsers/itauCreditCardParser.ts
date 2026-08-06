import { ImportParser, ParsedTransaction } from './types';

/**
 * Parser for Itaú credit-card invoices (PDF).
 *
 * The statement lists purchases as `DD/MM DESCRIPTION [n/m] VALUE`, where the
 * date has no year (it is inferred from the invoice due date) and the value uses
 * Brazilian formatting. Only the "Lançamentos: compras e saques" and
 * "Lançamentos: produtos e serviços" sections are imported — future
 * installments ("Compras parceladas - próximas faturas"), payments and summary
 * blocks are ignored.
 */

const LINE_REGEX = /^(\d{2}\/\d{2})\s+(.+?)\s+(-?[\d.]*\d,\d{2})$/;
const INSTALLMENT_REGEX = /\s(\d{1,2})\/(\d{1,2})$/;

const SECTION_START = /^Lançamentos:\s*(compras e saques|produtos e serviços)/i;
const SECTION_STOP =
  /^(Lançamentos no cartão|Lançamentos produtos e serviços|Total dos lançamentos|Compras parceladas|Pagamentos efetuados|Limites de crédito|Encargos cobrados|Resumo da fatura)/i;

function parseBrNumber(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

/** Reads "Vencimento: DD/MM/YYYY" (falls back to today) to anchor the year. */
function findDueDate(text: string): Date {
  const match = text.match(/Vencimento:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!match) return new Date();
  const [, d, m, y] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export const itauCreditCardParser: ImportParser = {
  id: 'itau-credit-card',
  name: 'Itaú - Cartão de Crédito',
  fileExtension: '.pdf',
  fileExtensions: ['.pdf'],
  parse: (fileContent: string) => itauCreditCardParser.parsePdf!(fileContent),
  parsePdf: (extractedText: string): ParsedTransaction[] => {
    const dueDate = findDueDate(extractedText);
    const dueYear = dueDate.getFullYear();
    const dueMonth = dueDate.getMonth() + 1; // 1-based

    const transactions: ParsedTransaction[] = [];
    let capturing = false;

    for (const rawLine of extractedText.split('\n')) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      if (!line) continue;

      if (SECTION_START.test(line)) {
        capturing = true;
        continue;
      }
      if (SECTION_STOP.test(line)) {
        capturing = false;
        continue;
      }
      if (!capturing) continue;

      const match = line.match(LINE_REGEX);
      if (!match) continue;

      const [, dayMonth, rawDesc, valueStr] = match;
      let description = rawDesc.trim();
      if (!description) continue;

      // Purchase dates have no year: months after the due month belong to a
      // previous year (older installments), otherwise the due date's year.
      const [dayStr, monthStr] = dayMonth.split('/');
      const month = Number(monthStr);
      const year = month > dueMonth ? dueYear - 1 : dueYear;
      const date = `${year}-${monthStr}-${dayStr}`;

      // Keep the installment marker in a normalized "(n/m)" suffix.
      const installment = description.match(INSTALLMENT_REGEX);
      if (installment) {
        description =
          description.replace(INSTALLMENT_REGEX, '').trim() +
          ` (${Number(installment[1])}/${Number(installment[2])})`;
      }

      const numericValue = parseBrNumber(valueStr);
      if (isNaN(numericValue) || numericValue === 0) continue;

      transactions.push({
        date,
        description,
        // Credit-card charges are expenses; negative values are refunds.
        amount: Math.abs(numericValue),
        type: numericValue > 0 ? 'expense' : 'income',
      });
    }

    return transactions;
  },
};
