export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash';
export type TransactionType = 'income' | 'expense';
export type RecurrenceType = 'once' | 'installment' | 'recurring';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  color: string;
  icon: string;
  isPrimary?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isSystem?: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  isPaid: boolean;
  orderIndex: number;
  recurrenceType: RecurrenceType;
  installmentCurrent?: number;
  installmentTotal?: number;
  notes?: string;
  autoSettle?: boolean;
  // For recurring transactions - the parent ID to link instances
  parentId?: string;
  // Original start date for recurring transactions
  startDate?: string;
  // End date for recurring transactions (when "this and future" is used)
  endDate?: string;
}

export interface MonthlyBalance {
  year: number;
  month: number;
  accountId: string;
  openingBalance: number;
  closingBalance: number;
}

export interface TransactionWithBalance extends Transaction {
  runningBalance: number;
  category?: Category;
  account?: Account;
}

export interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  openingBalance: number;
  closingBalance: number;
}

// Grouped transactions by date
export interface TransactionGroup {
  date: string;
  label: string;
  transactions: TransactionWithBalance[];
}
