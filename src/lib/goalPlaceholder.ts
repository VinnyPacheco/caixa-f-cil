import { addMonths, endOfMonth, format, isBefore, isWithinInterval, parseISO, startOfMonth } from 'date-fns';
import { Account, Category, Transaction } from '@/types/finance';
import { Goal } from '@/types/goal';

/**
 * Build virtual "Lançamento Mensal" transactions tied to expense-category goals
 * that opted in (`createMonthlyPlaceholder`). One row per month per goal,
 * from the goal's start_month (or its earliest reference month) up to `toDate`.
 *
 * The amount is `max(0, targetAmount - sum of same-category real transactions in that month)`.
 * These rows are NOT persisted and always come back unpaid.
 */
export function buildGoalPlaceholderTransactions(
  transactions: Transaction[],
  goals: Goal[],
  categories: Category[],
  accounts: Account[],
  toDate: Date,
): Transaction[] {
  const result: Transaction[] = [];
  if (!goals.length) return result;

  const primaryAccount =
    accounts.find((a) => a.isPrimary && a.type !== 'credit_card') ||
    accounts.find((a) => a.type !== 'credit_card');
  if (!primaryAccount) return result;

  const toMonthEnd = endOfMonth(toDate);

  for (const goal of goals) {
    if (!goal.createMonthlyPlaceholder) continue;
    if (goal.goalType !== 'category' || !goal.categoryId) continue;
    const category = categories.find((c) => c.id === goal.categoryId);
    if (!category || category.type !== 'expense') continue;

    const startBase = goal.startMonth ? parseISO(goal.startMonth) : new Date();
    let cursor = startOfMonth(startBase);

    while (!isBefore(toMonthEnd, cursor)) {
      const monthStart = cursor;
      const monthEnd = endOfMonth(cursor);

      const sumInMonth = transactions
        .filter(
          (t) =>
            t.categoryId === goal.categoryId &&
            !t.isGoalPlaceholder &&
            isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd }),
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = Math.max(0, goal.targetAmount - sumInMonth);
      const lastDay = format(monthEnd, 'yyyy-MM-dd');

      result.push({
        id: `goal-placeholder:${goal.id}:${format(monthStart, 'yyyy-MM')}`,
        accountId: primaryAccount.id,
        categoryId: goal.categoryId,
        description: `Lançamento Mensal ${category.name}`,
        amount: Number(remaining.toFixed(2)),
        date: lastDay,
        type: 'expense',
        isPaid: false,
        orderIndex: 99998,
        recurrenceType: 'once',
        isGoalPlaceholder: true,
        goalId: goal.id,
      });

      cursor = addMonths(cursor, 1);
    }
  }

  return result;
}