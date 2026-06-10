import { GoalProgress } from '@/types/goal';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';

interface Props {
  progress: GoalProgress;
  compact?: boolean;
  onClick?: () => void;
}

const statusBarColor: Record<GoalProgress['status'], string> = {
  'reached': 'bg-success',
  'on-track': 'bg-accent',
  'behind': 'bg-amber-500',
  'over': 'bg-destructive',
};

const statusTextColor: Record<GoalProgress['status'], string> = {
  'reached': 'text-success',
  'on-track': 'text-accent',
  'behind': 'text-amber-500',
  'over': 'text-destructive',
};

export function GoalProgressCard({ progress, compact, onClick }: Props) {
  const { goal, category, account, current, target, percent, status, scopeLabel } = progress;
  const ref = category || account;
  const color = ref?.color || '#6366F1';
  const icon = ref?.icon || 'flag';
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 bg-card border border-border/50 rounded-xl',
        compact ? 'p-3' : 'p-4',
        onClick && 'cursor-pointer hover:border-accent/40 transition-colors'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className="size-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          {ref ? (
            <span className="material-symbols-outlined text-sm" style={{ color }}>
              {icon}
            </span>
          ) : (
            <Target className="h-4 w-4" style={{ color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate leading-tight">{goal.name}</p>
          <p className="text-[10px] text-muted-foreground">{scopeLabel}</p>
        </div>
        <p className={cn('text-xs font-bold tabular-nums', statusTextColor[status])}>
          {Math.round(percent)}%
        </p>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', statusBarColor[status])}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{formatCurrency(current)}</span>
        <span>Meta {formatCurrency(target)}</span>
      </div>
    </div>
  );
}