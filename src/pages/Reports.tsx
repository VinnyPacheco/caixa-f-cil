import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { useTransactions } from '@/hooks/useTransactions';
import { useProfile } from '@/hooks/useProfile';
import { useTransactionTagsBulk } from '@/hooks/useTags';
import { formatCurrency } from '@/lib/format';
import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { fetchTransactions } from '@/services/transactionsService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TagFilter } from '@/components/finance/TagFilter';
import { Tag } from '@/types/tag';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportReportCSV, exportReportPDF } from '@/lib/exportReport';

type TabType = 'budget' | 'categories';
type FilterType = 'all' | 'income' | 'expense';

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [includeNoTags, setIncludeNoTags] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>(['budget']);

  const { monthSummary, categories, transactions } = useTransactions(selectedDate);
  const { displayName } = useProfile();
  const { user } = useAuth();
  const { isSimulation } = useSimulation();

  // Fetch ALL transactions to compute the multi-month chart at the top
  const allTransactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    enabled: !!user,
    staleTime: isSimulation ? Infinity : 0,
  });
  const allTransactions = allTransactionsQuery.data || [];

  // Get all transaction IDs to fetch their tags
  const transactionIds = useMemo(() => transactions.map((t) => t.id), [transactions]);
  const { data: transactionTagsMap, isLoading: isLoadingTags } = useTransactionTagsBulk(transactionIds);

  const monthLabel = format(selectedDate, 'MMMM', { locale: ptBR });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const handlePrevMonth = () => setSelectedDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedDate((prev) => addMonths(prev, 1));

  // Base transactions for category charts (filtered by type and category, but NOT by tags)
  const chartBaseTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Filter by type
    if (filterType === 'income') {
      filtered = filtered.filter((t) => t.type === 'income');
    } else if (filterType === 'expense') {
      filtered = filtered.filter((t) => t.type === 'expense');
    }
    
    // Filter by category
    if (selectedCategoryId !== 'all') {
      filtered = filtered.filter((t) => t.categoryId === selectedCategoryId);
    }
    
    return filtered;
  }, [transactions, filterType, selectedCategoryId]);

  // Extract unique tags from chart base transactions (dynamic based on current filters)
  const availableTagsInTransactions = useMemo(() => {
    if (!transactionTagsMap) return [];
    const tagMap = new Map<string, Tag>();
    
    // Only consider tags from transactions that are in the chart base
    chartBaseTransactions.forEach((t) => {
      const tags = transactionTagsMap[t.id] || [];
      tags.forEach((tag) => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    
    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactionTagsMap, chartBaseTransactions]);

  // Filter transactions by type, category, and tags
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Filter by type
    if (filterType === 'income') {
      filtered = filtered.filter((t) => t.type === 'income');
    } else if (filterType === 'expense') {
      filtered = filtered.filter((t) => t.type === 'expense');
    }
    
    // Filter by category
    if (selectedCategoryId !== 'all') {
      filtered = filtered.filter((t) => t.categoryId === selectedCategoryId);
    }
    
    // Filter by tags (only when in categories tab and filters are active)
    if (activeTab === 'categories' && (selectedTagIds.length > 0 || includeNoTags)) {
      filtered = filtered.filter((t) => {
        const tags = transactionTagsMap?.[t.id] || [];
        const hasTags = tags.length > 0;
        
        // If includeNoTags is selected and transaction has no tags
        if (includeNoTags && !hasTags) return true;
        
        // If specific tags are selected
        if (selectedTagIds.length > 0) {
          return tags.some((tag) => selectedTagIds.includes(tag.id));
        }
        
        return false;
      });
    }
    
    return filtered;
  }, [transactions, filterType, selectedCategoryId, activeTab, selectedTagIds, includeNoTags, transactionTagsMap]);

  // Group expenses by category (using filteredTransactions for categories tab)
  const expensesByCategory = useMemo(() => {
    const source = activeTab === 'categories' ? filteredTransactions : transactions;
    const expenses = source.filter((t) => t.type === 'expense');
    const grouped = expenses.reduce((acc, t) => {
      const catId = t.categoryId;
      if (!acc[catId]) {
        acc[catId] = { total: 0, category: t.category, transactions: [] };
      }
      acc[catId].total += t.amount;
      acc[catId].transactions.push(t);
      return acc;
    }, {} as Record<string, { total: number; category: typeof transactions[0]['category']; transactions: typeof transactions }>);
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [transactions, filteredTransactions, activeTab]);

  // Group income by category (using filteredTransactions for categories tab)
  const incomeByCategory = useMemo(() => {
    const source = activeTab === 'categories' ? filteredTransactions : transactions;
    const income = source.filter((t) => t.type === 'income');
    const grouped = income.reduce((acc, t) => {
      const catId = t.categoryId;
      if (!acc[catId]) {
        acc[catId] = { total: 0, category: t.category, transactions: [] };
      }
      acc[catId].total += t.amount;
      acc[catId].transactions.push(t);
      return acc;
    }, {} as Record<string, { total: number; category: typeof transactions[0]['category']; transactions: typeof transactions }>);
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [transactions, filteredTransactions, activeTab]);

  const maxExpense = expensesByCategory[0]?.total || 1;
  const maxIncome = incomeByCategory[0]?.total || 1;

  // Combined categories list sorted by value (descending) - mixing expenses and income
  const allCategoriesSortedByValue = useMemo(() => {
    const combined = [
      ...expensesByCategory.map(item => ({ ...item, type: 'expense' as const })),
      ...incomeByCategory.map(item => ({ ...item, type: 'income' as const }))
    ];
    return combined.sort((a, b) => b.total - a.total);
  }, [expensesByCategory, incomeByCategory]);

  const maxCategoryValue = allCategoriesSortedByValue[0]?.total || 1;

  // Transactions used to build the multi-month chart. In the categories tab we
  // apply the same type/category/tag filters as the current-month list so the
  // chart reflects the selected filters across all months.
  const chartSourceTransactions = useMemo(() => {
    if (activeTab !== 'categories') return allTransactions;
    let f = allTransactions;
    if (filterType === 'income') f = f.filter((t) => t.type === 'income');
    else if (filterType === 'expense') f = f.filter((t) => t.type === 'expense');
    if (selectedCategoryId !== 'all') f = f.filter((t) => t.categoryId === selectedCategoryId);
    if (selectedTagIds.length > 0 || includeNoTags) {
      f = f.filter((t) => {
        const tags = transactionTagsMap?.[t.id] || [];
        const hasTags = tags.length > 0;
        if (includeNoTags && !hasTags) return true;
        if (selectedTagIds.length > 0) return tags.some((tag) => selectedTagIds.includes(tag.id));
        return false;
      });
    }
    return f;
  }, [activeTab, allTransactions, filterType, selectedCategoryId, selectedTagIds, includeNoTags, transactionTagsMap]);

  // Compute monthly aggregates for the 7 months window shown in the chart (-3..+3)
  const monthlyAggregates = useMemo(() => {
    const result: Array<{
      income: number;
      expense: number;
      expenseByCat: Record<string, number>;
      incomeByCat: Record<string, number>;
    }> = [];
    for (let i = -3; i <= 3; i++) {
      const monthDate = addMonths(selectedDate, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthTx = chartSourceTransactions.filter((t) =>
        isWithinInterval(parseISO(t.date), { start, end })
      );
      const agg = { income: 0, expense: 0, expenseByCat: {} as Record<string, number>, incomeByCat: {} as Record<string, number> };
      monthTx.forEach((t) => {
        if (t.type === 'income') {
          agg.income += t.amount;
          agg.incomeByCat[t.categoryId] = (agg.incomeByCat[t.categoryId] || 0) + t.amount;
        } else {
          agg.expense += t.amount;
          agg.expenseByCat[t.categoryId] = (agg.expenseByCat[t.categoryId] || 0) + t.amount;
        }
      });
      result.push(agg);
    }
    return result;
  }, [chartSourceTransactions, selectedDate]);

  // Category lines shown on the chart. Derived from the 7-month window so a
  // category with no data in the current month still shows its history.
  const chartCategoryLines = useMemo(() => {
    if (activeTab !== 'categories') return { expense: [] as Array<{ id: string; category: typeof categories[0] | undefined; total: number }>, income: [] as Array<{ id: string; category: typeof categories[0] | undefined; total: number }> };
    const expenseIds = new Set<string>();
    const incomeIds = new Set<string>();
    monthlyAggregates.forEach((m) => {
      Object.keys(m.expenseByCat).forEach((id) => expenseIds.add(id));
      Object.keys(m.incomeByCat).forEach((id) => incomeIds.add(id));
    });
    const totalExp = (id: string) => monthlyAggregates.reduce((s, m) => s + (m.expenseByCat[id] || 0), 0);
    const totalInc = (id: string) => monthlyAggregates.reduce((s, m) => s + (m.incomeByCat[id] || 0), 0);
    const findCat = (id: string) => categories.find((c) => c.id === id);
    return {
      expense: Array.from(expenseIds)
        .map((id) => ({ id, category: findCat(id), total: totalExp(id) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6),
      income: Array.from(incomeIds)
        .map((id) => ({ id, category: findCat(id), total: totalInc(id) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6),
    };
  }, [activeTab, monthlyAggregates, categories]);

  // Dynamic chart scale based on actual data across the 7-month window
  const chartMaxValue = useMemo(() => {
    let maxVal = 0;
    if (activeTab === 'budget') {
      monthlyAggregates.forEach((m) => {
        maxVal = Math.max(maxVal, m.income, m.expense);
      });
    } else {
      const topExpenseIds = chartCategoryLines.expense.map((e) => e.id);
      const topIncomeIds = chartCategoryLines.income.map((e) => e.id);
      monthlyAggregates.forEach((m) => {
        if (filterType !== 'income') topExpenseIds.forEach((id) => { maxVal = Math.max(maxVal, m.expenseByCat[id] || 0); });
        if (filterType !== 'expense') topIncomeIds.forEach((id) => { maxVal = Math.max(maxVal, m.incomeByCat[id] || 0); });
      });
    }
    maxVal = Math.max(maxVal, 1);
    // Round up to a nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / magnitude) * magnitude;
  }, [activeTab, monthlyAggregates, chartCategoryLines, filterType]);

  // Build a smooth SVG path from a series of 7 values (one per month) within viewBox 0 0 100 50
  const buildPath = (values: number[]) => {
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 50 - Math.max(0, Math.min(1, v / chartMaxValue)) * 50;
      return { x, y };
    });
    if (points.length === 0) return '';
    let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C${cx.toFixed(2)},${prev.y.toFixed(2)} ${cx.toFixed(2)},${curr.y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`;
    }
    return d;
  };

  const formatChartLabel = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    return value.toString();
  };

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Generate month labels for chart
  const monthLabels = useMemo(() => {
    const months = [];
    for (let i = -3; i <= 3; i++) {
      const date = addMonths(selectedDate, i);
      months.push({
        label: format(date, 'MMM', { locale: ptBR }),
        isCurrent: i === 0,
        opacity: i === 0 ? 1 : i === -1 || i === 1 ? 0.8 : i === -2 || i === 2 ? 0.6 : 0.4,
      });
    }
    return months;
  }, [selectedDate]);

  const budgetBalance = monthSummary.totalIncome - monthSummary.totalExpense;
  const budgetPercentage = monthSummary.totalIncome > 0 
    ? Math.round((budgetBalance / monthSummary.totalIncome) * 100) 
    : 0;

  const handleExport = (kind: 'pdf' | 'csv') => {
    const selectedCategory =
      selectedCategoryId !== 'all'
        ? categories.find((c) => c.id === selectedCategoryId)?.name
        : undefined;
    const tagNames =
      activeTab === 'categories' && selectedTagIds.length
        ? availableTagsInTransactions
            .filter((t) => selectedTagIds.includes(t.id))
            .map((t) => t.name)
        : undefined;
    const meta = {
      monthLabel: `${capitalizedMonth} ${format(selectedDate, 'yyyy')}`,
      tab: activeTab === 'budget' ? 'Orçamento' : 'Categorias',
      filterType:
        filterType === 'all' ? 'Todos' : filterType === 'income' ? 'Receita' : 'Despesa',
      categoryName: selectedCategory,
      tagNames,
    };
    if (kind === 'csv') exportReportCSV(filteredTransactions, meta);
    else exportReportPDF(filteredTransactions, meta);
  };

  return (
    <AppLayout>
      <Header showAvatar showNotification userName={displayName} />

      <main className="flex flex-col gap-6 p-6">
        {/* Export Button */}
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-xs font-bold shadow-md shadow-accent/20 transition-all active:scale-95 hover:opacity-90"
                aria-label="Exportar relatório"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Exportar Relatório
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <span className="material-symbols-outlined text-[18px] mr-2">picture_as_pdf</span>
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <span className="material-symbols-outlined text-[18px] mr-2">table_view</span>
                Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <div className="w-full bg-card p-1.5 rounded-2xl shadow-sm border border-border/50 flex">
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all text-center ${
              activeTab === 'budget'
                ? 'font-bold text-accent-foreground bg-accent shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Orçamento
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all text-center ${
              activeTab === 'categories'
                ? 'font-bold text-accent-foreground bg-accent shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Categorias
          </button>
        </div>

        {/* Main Section */}
        <section className="w-full rounded-3xl bg-card p-6 shadow-lg border border-border/50">
          {/* Month Selector - only visible on budget tab */}
          {activeTab === 'budget' && (
            <div className="flex items-center justify-between mb-6">
              <div className="w-full flex items-center justify-between gap-1 bg-secondary rounded-full p-2 px-4 border border-border/50">
                <button
                  onClick={handlePrevMonth}
                  className="size-6 flex items-center justify-center rounded-full bg-card shadow-sm text-muted-foreground hover:text-foreground transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="text-sm font-bold text-foreground mx-auto">{capitalizedMonth}</span>
                <button
                  onClick={handleNextMonth}
                  className="size-6 flex items-center justify-center rounded-full bg-card shadow-sm text-muted-foreground hover:text-foreground transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}

          {/* Filters based on active tab */}
          {activeTab === 'budget' ? (
            <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setOpenItems((prev) => prev.includes('budget') ? prev : [...prev, 'budget'])}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold shadow-md shadow-accent/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Orçamento
              </button>
              <button
                onClick={() => toggleItem('income')}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20 text-xs font-bold transition-all active:scale-95 hover:bg-success/20"
              >
                <div className="size-2 rounded-full bg-success"></div>
                Receita
              </button>
              <button
                onClick={() => toggleItem('expense')}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold transition-all active:scale-95 hover:bg-destructive/20"
              >
                <div className="size-2 rounded-full bg-destructive"></div>
                Despesa
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex p-1 bg-secondary rounded-xl border border-border/50">
                <button
                  onClick={() => {
                    setFilterType('all');
                    setSelectedCategoryId('all');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    filterType === 'all'
                      ? 'font-bold text-foreground bg-card shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => {
                    setFilterType('expense');
                    setSelectedCategoryId('all');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    filterType === 'expense'
                      ? 'font-bold text-foreground bg-card shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  Despesa
                </button>
                <button
                  onClick={() => {
                    setFilterType('income');
                    setSelectedCategoryId('all');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    filterType === 'income'
                      ? 'font-bold text-foreground bg-card shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  Receita
                </button>
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="flex-1 py-2.5 px-4 bg-secondary rounded-xl border border-border/50 text-xs font-medium hover:border-accent/30 transition-colors">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="material-symbols-outlined text-[18px]">category</span>
                      <SelectValue placeholder="Todas as categorias" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories
                      .filter((cat) => filterType === 'all' || cat.type === filterType)
                      .map((cat) => ({
                        ...cat,
                        displayText: cat.isSystem && cat.name === 'Outros'
                          ? `Outros (${cat.type === 'expense' ? 'Despesa' : 'Receita'})`
                          : cat.name
                      }))
                      .sort((a, b) => a.displayText.localeCompare(b.displayText, 'pt-BR'))
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.displayText}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex-1">
                  <TagFilter
                    availableTags={availableTagsInTransactions}
                    selectedTagIds={selectedTagIds}
                    includeNoTags={includeNoTags}
                    onSelectionChange={(tagIds, noTags) => {
                      setSelectedTagIds(tagIds);
                      setIncludeNoTags(noTags);
                    }}
                    isLoading={isLoadingTags}
                  />
                </div>
              </div>
              {/* Month Selector - inside categories tab, below filters */}
              <div className="flex items-center justify-between">
                <div className="w-full flex items-center justify-between gap-1 bg-secondary rounded-full p-2 px-4 border border-border/50">
                  <button
                    onClick={handlePrevMonth}
                    className="size-6 flex items-center justify-center rounded-full bg-card shadow-sm text-muted-foreground hover:text-foreground transition-transform active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <span className="text-sm font-bold text-foreground mx-auto">{capitalizedMonth}</span>
                  <button
                    onClick={handleNextMonth}
                    className="size-6 flex items-center justify-center rounded-full bg-card shadow-sm text-muted-foreground hover:text-foreground transition-transform active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chart Area */}
          <div className="flex items-stretch gap-3 mb-8 h-48 select-none w-full pr-1">
            <div className="flex flex-col justify-between pb-6 text-[10px] font-semibold text-muted-foreground/70 text-right w-8 flex-shrink-0 pt-[1px] -mr-1 z-10">
              <span>{formatChartLabel(chartMaxValue)}</span>
              <span>{formatChartLabel(chartMaxValue * 0.75)}</span>
              <span>{formatChartLabel(chartMaxValue * 0.5)}</span>
              <span>{formatChartLabel(chartMaxValue * 0.25)}</span>
              <span>0</span>
            </div>
            <div className="relative flex-1 h-full pl-2">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                <div className="w-full border-b border-dashed border-border/50 h-px"></div>
                <div className="w-full border-b border-dashed border-border/50 h-px"></div>
                <div className="w-full border-b border-dashed border-border/50 h-px"></div>
                <div className="w-full border-b border-dashed border-border/50 h-px"></div>
                <div className="w-full border-b border-dashed border-border/50 h-px"></div>
              </div>
              {/* Current month indicator */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-6 w-px bg-accent z-0 opacity-40"></div>
              {/* Chart lines */}
              <svg 
                key={`chart-${activeTab}-${filterType}-${selectedDate.getTime()}`}
                className="absolute inset-0 w-full h-full pb-6 overflow-visible" 
                preserveAspectRatio="none" 
                viewBox="0 0 100 50"
              >
                <defs>
                  <linearGradient id="gradGold" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.25 }} />
                    <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <style>
                  {`
                    @keyframes drawLine {
                      from {
                        stroke-dashoffset: 200;
                      }
                      to {
                        stroke-dashoffset: 0;
                      }
                    }
                    .chart-line {
                      stroke-dasharray: 200;
                      stroke-dashoffset: 200;
                      animation: drawLine 1.2s ease-out forwards;
                    }
                  `}
                </style>
                {activeTab === 'budget' ? (
                  <>
                    {/* Income line */}
                    <path
                      className="chart-line"
                      style={{ animationDelay: '0.1s' }}
                      d={buildPath(monthlyAggregates.map((m) => m.income))}
                      fill="none"
                      stroke="hsl(var(--success))"
                      strokeLinecap="round"
                      strokeWidth="1.2"
                    />
                    {/* Expense line */}
                    <path
                      className="chart-line"
                      style={{ animationDelay: '0.2s' }}
                      d={buildPath(monthlyAggregates.map((m) => m.expense))}
                      fill="none"
                      stroke="hsl(var(--destructive))"
                      strokeLinecap="round"
                      strokeWidth="1.2"
                    />
                    {/* Budget line (income - expense, clamped at 0) */}
                    <path
                      className="chart-line"
                      style={{ animationDelay: '0.3s' }}
                      d={buildPath(monthlyAggregates.map((m) => Math.max(0, m.income - m.expense)))}
                      fill="url(#gradGold)"
                      stroke="hsl(var(--accent))"
                      strokeLinecap="round"
                      strokeWidth="1.2"
                    />
                  </>
                ) : (
                  <>
                    {/* Category lines - expenses */}
                    {(filterType === 'all' || filterType === 'expense') && chartCategoryLines.expense.map(({ id: catId, category }, index) => {
                      const series = monthlyAggregates.map((m) => (catId ? (m.expenseByCat[catId] || 0) : 0));
                      return (
                        <path
                          key={`expense-${category?.id || index}`}
                          className="chart-line"
                          style={{ animationDelay: `${0.1 + index * 0.08}s`, opacity: 0.9 - (index * 0.08) }}
                          d={buildPath(series)}
                          fill="none"
                          stroke={category?.color || '#F43F5E'}
                          strokeLinecap="round"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                    {/* Category lines - income */}
                    {(filterType === 'all' || filterType === 'income') && chartCategoryLines.income.map(({ id: catId, category }, index) => {
                      const delayOffset = filterType !== 'income' ? chartCategoryLines.expense.length : 0;
                      const series = monthlyAggregates.map((m) => (catId ? (m.incomeByCat[catId] || 0) : 0));
                      return (
                        <path
                          key={`income-${category?.id || index}`}
                          className="chart-line"
                          style={{ animationDelay: `${0.1 + (delayOffset + index) * 0.08}s`, opacity: 0.9 - (index * 0.08) }}
                          d={buildPath(series)}
                          fill="none"
                          stroke={category?.color || '#10B981'}
                          strokeLinecap="round"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </>
                )}
              </svg>
              {/* Month labels */}
              <div className="absolute bottom-0 w-full flex justify-between text-[10px] font-medium text-muted-foreground">
                {monthLabels.map((month, index) => (
                  <span
                    key={index}
                    className={`w-[14%] text-center ${
                      month.isCurrent ? 'font-bold text-foreground scale-110 text-xs' : ''
                    }`}
                    style={{ opacity: month.opacity }}
                  >
                    {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="flex flex-col gap-5 pt-4 border-t border-border/50">
            {activeTab === 'budget' ? (
              <>
                {/* Budget Item */}
                <Collapsible open={openItems.includes('budget')} onOpenChange={() => toggleItem('budget')}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex flex-col gap-1.5 cursor-pointer">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 rounded-full bg-accent"></div>
                          <span className="text-xs font-bold text-accent flex items-center gap-1">
                            Orçamento
                            <span className="material-symbols-outlined text-[16px] transition-transform data-[state=open]:rotate-180">expand_more</span>
                          </span>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatCurrency(budgetBalance)}</span>
                      </div>
                      <div className="relative w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                        <div className="absolute inset-0 bg-accent/10"></div>
                        <div 
                          className="bg-accent h-full rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.max(0, Math.min(100, budgetPercentage))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Receita - Despesa</span>
                        <span>{budgetPercentage}% da receita</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-3 pl-3 pr-1 flex flex-col gap-2 border-l-2 border-accent/20 ml-1.5 mt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Total Receitas</span>
                        <span className="font-medium text-foreground">{formatCurrency(monthSummary.totalIncome)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Total Despesas</span>
                        <span className="font-medium text-foreground">{formatCurrency(monthSummary.totalExpense)}</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Income Item */}
                <Collapsible open={openItems.includes('income')} onOpenChange={() => toggleItem('income')}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex flex-col gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 rounded-full bg-success"></div>
                          <span className="text-xs font-bold text-success flex items-center gap-1">
                            Receita
                            <span className="material-symbols-outlined text-[16px] transition-transform data-[state=open]:rotate-180">expand_more</span>
                          </span>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatCurrency(monthSummary.totalIncome)}</span>
                      </div>
                      <div className="relative w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                        <div className="absolute inset-0 bg-success/10"></div>
                        <div className="bg-success h-full rounded-full transition-all duration-1000 ease-out" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-3 pl-3 pr-1 flex flex-col gap-2 border-l-2 border-success/20 ml-1.5 mt-2">
                      {incomeByCategory.map(({ total, category }) => (
                        <div key={category?.id || 'unknown'} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">{category?.name || 'Sem categoria'}</span>
                          <span className="font-medium text-foreground">{formatCurrency(total)}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Expense Item */}
                <Collapsible open={openItems.includes('expense')} onOpenChange={() => toggleItem('expense')}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex flex-col gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 rounded-full bg-destructive"></div>
                          <span className="text-xs font-bold text-destructive flex items-center gap-1">
                            Despesa
                            <span className="material-symbols-outlined text-[16px] transition-transform data-[state=open]:rotate-180">expand_more</span>
                          </span>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatCurrency(monthSummary.totalExpense)}</span>
                      </div>
                      <div className="relative w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                        <div className="absolute inset-0 bg-destructive/10"></div>
                        <div 
                          className="bg-destructive h-full rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${monthSummary.totalIncome > 0 ? Math.round((monthSummary.totalExpense / monthSummary.totalIncome) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-3 pl-3 pr-1 flex flex-col gap-2 border-l-2 border-destructive/20 ml-1.5 mt-2">
                      {expensesByCategory.map(({ total, category }) => (
                        <div key={category?.id || 'unknown'} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">{category?.name || 'Sem categoria'}</span>
                          <span className="font-medium text-foreground">{formatCurrency(total)}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              /* Categories Tab */
              <>
                {allCategoriesSortedByValue
                  .filter(item => filterType === 'all' || filterType === item.type)
                  .map(({ total, category, transactions: catTransactions, type }) => {
                    // Use different color for "Outros" categories
                    const defaultColor = type === 'expense' ? '#F43F5E' : '#10B981';
                    const outrosColor = type === 'expense' ? '#94A3B8' : '#6B7280';
                    const displayColor = category?.isSystem && category?.name === 'Outros' ? outrosColor : (category?.color || defaultColor);
                    const itemKey = type === 'expense' ? `cat-${category?.id}` : `cat-income-${category?.id}`;
                    
                    return (
                      <Collapsible key={itemKey} open={openItems.includes(itemKey)} onOpenChange={() => toggleItem(itemKey)}>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex flex-col gap-1.5 cursor-pointer opacity-90 hover:opacity-100 transition-opacity">
                            <div className="flex justify-between items-end">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-3 rounded-full" style={{ backgroundColor: displayColor }}></div>
                                <span className="text-xs font-bold flex items-center gap-1" style={{ color: displayColor }}>
                                  {category?.isSystem && category?.name === 'Outros' 
                                    ? `Outros (${type === 'expense' ? 'Despesa' : 'Receita'})`
                                    : (category?.name || 'Sem categoria')}
                                  <span className="material-symbols-outlined text-[16px] transition-transform data-[state=open]:rotate-180">expand_more</span>
                                </span>
                              </div>
                              <span className="text-sm font-bold text-foreground">{formatCurrency(total)}</span>
                            </div>
                            <div className="relative w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                              <div className="absolute inset-0" style={{ backgroundColor: `${displayColor}10` }}></div>
                              <div 
                                className="h-full rounded-full transition-all duration-1000 ease-out" 
                                style={{ 
                                  width: `${(total / maxCategoryValue) * 100}%`,
                                  backgroundColor: displayColor
                                }}
                              />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pt-3 pl-3 pr-1 flex flex-col gap-2 ml-1.5 mt-2" style={{ borderLeft: `2px solid ${displayColor}30` }}>
                            {catTransactions.map((t) => (
                              <div key={t.id} className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">{t.description}</span>
                                <span className="font-medium text-foreground">{formatCurrency(t.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
              </>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
