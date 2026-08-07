import { useRef, useState, useEffect, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Account } from '@/types/finance';

interface AccountFilterProps {
  availableAccounts: Account[];
  selectedAccountIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function AccountFilter({
  availableAccounts,
  selectedAccountIds,
  onSelectionChange,
}: AccountFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const sortedAccounts = useMemo(
    () => [...availableAccounts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [availableAccounts],
  );

  const toggle = (id: string) => {
    const next = selectedAccountIds.includes(id)
      ? selectedAccountIds.filter((x) => x !== id)
      : [...selectedAccountIds, id];
    onSelectionChange(next);
  };

  const hasActive = selectedAccountIds.length > 0;
  const displayText = !hasActive
    ? 'Todas as contas'
    : selectedAccountIds.length === 1
    ? sortedAccounts.find((a) => a.id === selectedAccountIds[0])?.name || '1 conta'
    : `${selectedAccountIds.length} selecionadas`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 py-2.5 px-4 bg-secondary rounded-xl border border-border/50 text-xs font-medium transition-colors text-left',
          hasActive && 'border-accent/50',
        )}
      >
        <span className="material-symbols-outlined text-[18px] text-muted-foreground">
          account_balance_wallet
        </span>
        <span className={cn('flex-1 truncate', hasActive ? 'text-foreground' : 'text-muted-foreground')}>
          {displayText}
        </span>
        {hasActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange([]);
            }}
            className="p-0.5 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        <span className="material-symbols-outlined text-[16px] text-muted-foreground">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-1">
            {sortedAccounts.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                Nenhuma conta disponível
              </p>
            )}
            {sortedAccounts.map((acc) => {
              const isSelected = selectedAccountIds.includes(acc.id);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggle(acc.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-left',
                    isSelected && 'bg-accent/10',
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected ? 'bg-accent border-accent' : 'border-muted-foreground/30',
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-accent-foreground" />}
                  </div>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                  <span className="text-sm font-medium text-foreground truncate">{acc.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
