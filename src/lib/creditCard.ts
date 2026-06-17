import { parseISO, format } from 'date-fns';
import { Account, Transaction } from '@/types/finance';

const INVOICE_PAID_PREFIX = 'cc-invoice-paid:';

/** Compute the due date of the invoice that a given transaction belongs to. */
export function getInvoiceDueDate(cc: Account, txDate: Date): Date {
  const dueDay = cc.dueDay ?? 1;
  // If no closing day is configured, assume it closes 7 days before due (or day 1).
  const closingDay = cc.statementClosingDay ?? Math.max(1, dueDay - 7);

  let year = txDate.getFullYear();
  let monthIdx = txDate.getMonth(); // 0-based; this is the cycle month
  const day = txDate.getDate();

  // After the closing day, the purchase rolls into the next cycle.
  if (day > closingDay) monthIdx += 1;

  // Within a cycle, the due date is in the same month if dueDay > closingDay,
  // otherwise in the following month (standard Brazilian credit-card cycle).
  let dueMonthIdx = monthIdx;
  if (dueDay <= closingDay) dueMonthIdx += 1;

  // Clamp the day to the last valid day of the target month.
  const lastDayOfMonth = new Date(year, dueMonthIdx + 1, 0).getDate();
  const safeDay = Math.min(dueDay, lastDayOfMonth);
  return new Date(year, dueMonthIdx, safeDay);
}

function invoicePaidKey(invoiceId: string): string {
  return INVOICE_PAID_PREFIX + invoiceId;
}

export function isInvoicePaid(invoiceId: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(invoicePaidKey(invoiceId)) === '1';
}

export function toggleInvoicePaid(invoiceId: string): boolean {
  if (typeof window === 'undefined') return false;
  const key = invoicePaidKey(invoiceId);
  const next = window.localStorage.getItem(key) === '1' ? null : '1';
  if (next) window.localStorage.setItem(key, next);
  else window.localStorage.removeItem(key);
  return next === '1';
}

export function buildInvoiceId(ccId: string, dueDate: Date): string {
  return `invoice:${ccId}:${format(dueDate, 'yyyy-MM')}`;
}

export interface InvoiceSummary {
  invoiceId: string;
  cc: Account;
  dueDate: Date;
  total: number;
  transactions: Transaction[];
}

/**
 * Group all credit-card transactions into their monthly invoices, indexed by invoice id.
 * Refunds (type=income against a CC account) reduce the invoice total.
 */
export function groupTransactionsByInvoice(
  transactions: Transaction[],
  accounts: Account[],
): Map<string, InvoiceSummary> {
  const ccMap = new Map(
    accounts.filter(a => a.type === 'credit_card').map(a => [a.id, a]),
  );
  const result = new Map<string, InvoiceSummary>();

  for (const tx of transactions) {
    const cc = ccMap.get(tx.accountId);
    if (!cc) continue;
    const dueDate = getInvoiceDueDate(cc, parseISO(tx.date));
    const invoiceId = buildInvoiceId(cc.id, dueDate);
    const entry = result.get(invoiceId) ?? {
      invoiceId,
      cc,
      dueDate,
      total: 0,
      transactions: [],
    };
    entry.total += tx.type === 'expense' ? tx.amount : -tx.amount;
    entry.transactions.push(tx);
    result.set(invoiceId, entry);
  }

  return result;
}

/**
 * Build virtual "invoice payment" transactions, one per cycle per credit card,
 * posted to the configured debit account on the due date. These are NOT persisted.
 */
export function buildInvoiceTransactions(
  transactions: Transaction[],
  accounts: Account[],
): Transaction[] {
  const grouped = groupTransactionsByInvoice(transactions, accounts);
  const invoices: Transaction[] = [];

  for (const entry of grouped.values()) {
    if (!entry.cc.creditCardDebitAccountId) continue;
    if (entry.total <= 0) continue;
    invoices.push({
      id: entry.invoiceId,
      accountId: entry.cc.creditCardDebitAccountId,
      categoryId: '',
      description: `Fatura ${entry.cc.name}`,
      amount: Number(entry.total.toFixed(2)),
      date: format(entry.dueDate, 'yyyy-MM-dd'),
      type: 'expense',
      isPaid: isInvoicePaid(entry.invoiceId),
      orderIndex: 9999,
      recurrenceType: 'once',
      isCreditCardInvoice: true,
      creditCardId: entry.cc.id,
    });
  }

  return invoices;
}

/** True when a transaction belongs to a credit-card account (debit by the card itself). */
export function isCreditCardTx(tx: Transaction, accounts: Account[]): boolean {
  const acc = accounts.find(a => a.id === tx.accountId);
  return acc?.type === 'credit_card';
}