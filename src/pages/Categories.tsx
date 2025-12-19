import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { mockCategories } from '@/data/mockData';
import { Category, TransactionType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type FilterType = 'all' | TransactionType;

const filterLabels: Record<FilterType, string> = {
  all: 'Todas',
  expense: 'Despesas',
  income: 'Receitas',
};

export default function Categories() {
  const [categories] = useState<Category[]>(mockCategories);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredCategories = categories.filter((category) => {
    if (filter === 'all') return true;
    return category.type === filter;
  });

  const expenseCategories = filteredCategories.filter((c) => c.type === 'expense');
  const incomeCategories = filteredCategories.filter((c) => c.type === 'income');

  const renderCategoryGroup = (title: string, items: Category[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
          {title}
        </h3>
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
          {items.map((category) => (
            <button
              key={category.id}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
            >
              <div
                className="size-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: category.color }}
                >
                  {category.icon}
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">{category.name}</p>
                <p className="text-sm text-muted-foreground">
                  {category.type === 'expense' ? 'Despesa' : 'Receita'}
                </p>
              </div>
              <span className="material-symbols-outlined text-muted-foreground">
                chevron_right
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <Header title="Categorias" showBack />

      <main className="flex flex-col gap-6 p-6">
        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {(Object.keys(filterLabels) as FilterType[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`filter-pill ${
                filter === key ? 'filter-pill-active' : 'filter-pill-inactive'
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
            <Plus className="size-4 mr-1" />
            Nova
          </Button>
        </div>

        {/* Category Groups */}
        {filter !== 'income' && renderCategoryGroup('Despesas', expenseCategories)}
        {filter !== 'expense' && renderCategoryGroup('Receitas', incomeCategories)}

        {/* Summary */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total de categorias</p>
              <p className="text-xl font-bold text-foreground">{categories.length}</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="text-lg font-semibold text-foreground">
                {categories.filter((c) => c.type === 'expense').length}
              </p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="text-lg font-semibold text-success">
                {categories.filter((c) => c.type === 'income').length}
              </p>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
