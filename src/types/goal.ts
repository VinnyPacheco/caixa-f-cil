import { Account, Category } from './finance';

export type GoalType = 'category' | 'account';

export interface Goal {
  id: string;
  name: string;
  goalType: GoalType;
  categoryId?: string | null;
  accountId?: string | null;
  targetAmount: number;
  startMonth?: string | null; // ISO date (first day of month)
  notes?: string | null;
}

export interface GoalProgress {
  goal: Goal;
  category?: Category;
  account?: Account;
  current: number;
  target: number;
  percent: number; // 0..100+
  status: 'on-track' | 'reached' | 'over' | 'behind';
  /** Sub-text describing the period scope (e.g. "Este mês" or "Acumulado") */
  scopeLabel: string;
}