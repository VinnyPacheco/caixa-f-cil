import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategoriesData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { importParsers, getParserById, ParsedTransaction } from '@/services/importParsers';
import { createTransaction, toggleTransactionPaid } from '@/services/transactionsService';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Transaction } from '@/types/finance';

interface MatchCandidate {
  id: string;
  description: string;
  amount: number;
  date: string;
  isPaid: boolean;
  categoryId: string;
  accountId: string;
}

// "create" = new transaction, string = existing transaction ID to settle
type ImportAction = 'create' | string;

export default function ImportTransactions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedParserId, setSelectedParserId] = useState<string>('');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [transactionCategories, setTransactionCategories] = useState<Record<number, string>>({});
  const [transactionDescriptions, setTransactionDescriptions] = useState<Record<number, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  // Duplicate detection state
  const [matchCandidates, setMatchCandidates] = useState<Record<number, MatchCandidate[]>>({});
  const [importActions, setImportActions] = useState<Record<number, ImportAction>>({});

  const selectedParser = selectedParserId ? getParserById(selectedParserId) : undefined;

  const defaultExpenseCategory = categories.find(
    (c) => c.name.toLowerCase() === 'outros' && c.type === 'expense'
  );
  const defaultIncomeCategory = categories.find(
    (c) => c.name.toLowerCase() === 'outros' && c.type === 'income'
  );

  // Search for matching existing transactions after file is parsed
  const findMatches = async (transactions: ParsedTransaction[]) => {
    if (!user || transactions.length === 0) return;

    // Get unique dates from parsed transactions
    const dates = [...new Set(transactions.map((t) => t.date))];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .in('date', dates)
      .eq('user_id', user.id);

    if (error || !data) return;

    const matches: Record<number, MatchCandidate[]> = {};
    const actions: Record<number, ImportAction> = {};

    transactions.forEach((parsed, index) => {
      const candidates = data
        .filter(
          (dbTx) =>
            dbTx.date === parsed.date &&
            Number(dbTx.amount) === parsed.amount
        )
        .map((dbTx) => ({
          id: dbTx.id,
          description: dbTx.description,
          amount: Number(dbTx.amount),
          date: dbTx.date,
          isPaid: dbTx.is_paid,
          categoryId: dbTx.category_id,
          accountId: dbTx.account_id,
        }));

      if (candidates.length > 0) {
        matches[index] = candidates;
        // Default: if exactly 1 match, auto-select it; otherwise "create"
        actions[index] = candidates.length === 1 ? candidates[0].id : 'create';
      } else {
        actions[index] = 'create';
      }
    });

    setMatchCandidates(matches);
    setImportActions((prev) => ({ ...prev, ...actions }));
  };

  // For each parsed transaction, look up the most recent existing transaction
  // with the same description and pre-fill the category accordingly.
  const autoFillCategoriesFromHistory = async (
    transactions: ParsedTransaction[],
    baseCategories: Record<number, string>
  ) => {
    if (!user || transactions.length === 0) return;

    const uniqueDescriptions = [
      ...new Set(transactions.map((t) => t.description.trim()).filter(Boolean)),
    ];
    if (uniqueDescriptions.length === 0) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('description, category_id, date, created_at')
      .eq('user_id', user.id)
      .in('description', uniqueDescriptions)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data) return;

    const latestByDescription = new Map<string, string>();
    for (const row of data) {
      if (!latestByDescription.has(row.description) && row.category_id) {
        latestByDescription.set(row.description, row.category_id);
      }
    }

    if (latestByDescription.size === 0) return;

    const updates: Record<number, string> = { ...baseCategories };
    transactions.forEach((t, index) => {
      const found = latestByDescription.get(t.description.trim());
      if (found) updates[index] = found;
    });

    setTransactionCategories(updates);
  };

  const handleFileSelect = () => {
    if (!selectedParser) {
      toast({
        title: 'Selecione a instituição',
        description: 'Por favor, selecione a instituição antes de importar o arquivo.',
        variant: 'destructive',
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedParser) return;

    if (!file.name.toLowerCase().endsWith(selectedParser.fileExtension)) {
      toast({
        title: 'Arquivo inválido',
        description: `Por favor, selecione um arquivo ${selectedParser.fileExtension}`,
        variant: 'destructive',
      });
      return;
    }

    setFileName(file.name);

    try {
      const content = await file.text();
      const transactions = selectedParser.parse(content);

      if (transactions.length === 0) {
        toast({
          title: 'Nenhum lançamento encontrado',
          description: 'O arquivo não contém lançamentos válidos.',
          variant: 'destructive',
        });
        return;
      }

      setParsedTransactions(transactions);
      setSelectedItems(new Set(transactions.map((_, index) => index)));

      const defaultCategories: Record<number, string> = {};
      transactions.forEach((t, index) => {
        const defaultCat = t.type === 'expense' ? defaultExpenseCategory : defaultIncomeCategory;
        if (defaultCat) {
          defaultCategories[index] = defaultCat.id;
        }
      });
      setTransactionCategories(defaultCategories);

      // Auto-fill categories from previous transactions with same description
      await autoFillCategoriesFromHistory(transactions, defaultCategories);

      // Find duplicate matches
      await findMatches(transactions);

      toast({
        title: 'Arquivo lido com sucesso',
        description: `${transactions.length} lançamento(s) identificado(s).`,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível processar o arquivo selecionado.',
        variant: 'destructive',
      });
    }

    e.target.value = '';
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === parsedTransactions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(parsedTransactions.map((_, index) => index)));
    }
  };

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleImport = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para importar lançamentos.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAccountId) {
      toast({
        title: 'Selecione a conta',
        description: 'Por favor, selecione a conta para vincular os lançamentos.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedItems.size === 0) {
      toast({
        title: 'Nenhum lançamento selecionado',
        description: 'Selecione pelo menos um lançamento para importar.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      let successCount = 0;
      let settledCount = 0;
      let errorCount = 0;

      for (let i = 0; i < parsedTransactions.length; i++) {
        if (!selectedItems.has(i)) continue;

        const parsed = parsedTransactions[i];
        const categoryId = transactionCategories[i];
        const action = importActions[i] || 'create';

        if (!categoryId && action === 'create') {
          errorCount++;
          continue;
        }

        try {
          if (action !== 'create') {
            // Settle existing transaction (set is_paid = true)
            await toggleTransactionPaid(action, true);
            settledCount++;
          } else {
            const category = categories.find((c) => c.id === categoryId);
            const transactionType = category?.type || parsed.type;

            await createTransaction(
              {
                accountId: selectedAccountId,
                categoryId,
                description: transactionDescriptions[i] ?? parsed.description,
                amount: parsed.amount,
                date: parsed.date,
                type: transactionType,
                isPaid: true,
                recurrenceType: 'once',
              },
              user.id
            );
            successCount++;
          }
        } catch (err) {
          console.error('Error processing transaction:', err);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      const totalProcessed = successCount + settledCount;
      if (totalProcessed > 0) {
        const parts: string[] = [];
        if (successCount > 0) parts.push(`${successCount} criado(s)`);
        if (settledCount > 0) parts.push(`${settledCount} baixado(s)`);
        if (errorCount > 0) parts.push(`${errorCount} erro(s)`);

        toast({
          title: 'Importação concluída',
          description: `${parts.join(', ')}.`,
        });
        setParsedTransactions([]);
        setSelectedItems(new Set());
        setTransactionCategories({});
        setTransactionDescriptions({});
        setMatchCandidates({});
        setImportActions({});
        setFileName('');
        navigate('/transactions');
      } else {
        toast({
          title: 'Erro na importação',
          description: 'Não foi possível importar os lançamentos.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro ao importar os lançamentos.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T12:00:00'), "dd/MM/yyyy, EEEE", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const isLoading = accountsLoading || categoriesLoading;

  return (
    <AppLayout>
      <Header title="Importar Lançamentos" showBack />

      <main className="flex-1 overflow-auto px-4 pb-24 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Account Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Conta</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Institution Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Instituição</label>
              <Select value={selectedParserId} onValueChange={setSelectedParserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a instituição" />
                </SelectTrigger>
                <SelectContent>
                  {importParsers.map((parser) => (
                    <SelectItem key={parser.id} value={parser.id}>
                      {parser.name} ({parser.fileExtension})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Arquivo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={selectedParser?.fileExtension || '.txt'}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleFileSelect}
                disabled={!selectedParserId}
              >
                <span className="material-symbols-outlined text-xl">upload_file</span>
                {fileName || 'Selecionar arquivo'}
              </Button>
              {selectedParser && (
                <p className="text-xs text-muted-foreground">
                  Formato aceito: {selectedParser.fileExtension}
                </p>
              )}
            </div>

            {/* Parsed Transactions Preview */}
            {parsedTransactions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    Lançamentos identificados ({parsedTransactions.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-xs"
                  >
                    {selectedItems.size === parsedTransactions.length
                      ? 'Desmarcar todos'
                      : 'Selecionar todos'}
                  </Button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedItems.size === parsedTransactions.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedTransactions.map((transaction, index) => {
                          const candidates = matchCandidates[index];
                          const action = importActions[index] || 'create';
                          const hasMatch = candidates && candidates.length > 0;

                          return (
                            <TableRow key={index} className={hasMatch ? 'bg-warning/5' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedItems.has(index)}
                                  onCheckedChange={() => toggleItem(index)}
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatDate(transaction.date)}
                              </TableCell>
                              <TableCell className="min-w-[200px]">
                                <input
                                  type="text"
                                  value={transactionDescriptions[index] ?? transaction.description}
                                  onChange={(e) => {
                                    setTransactionDescriptions((prev) => ({
                                      ...prev,
                                      [index]: e.target.value,
                                    }));
                                  }}
                                  className="w-full h-8 px-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </TableCell>
                              <TableCell className="min-w-[150px]">
                                <Select
                                  value={transactionCategories[index] || ''}
                                  onValueChange={(value) => {
                                    setTransactionCategories((prev) => ({
                                      ...prev,
                                      [index]: value,
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Categoria" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories
                                      .filter((cat) => cat.type === transaction.type)
                                      .map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                          <span className="flex items-center gap-2">
                                            <span
                                              className="size-2 rounded-full"
                                              style={{ backgroundColor: cat.color }}
                                            />
                                            {cat.name}
                                          </span>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell
                                className={`text-right whitespace-nowrap text-sm font-medium ${
                                  transaction.type === 'income'
                                    ? 'text-success'
                                    : 'text-destructive'
                                }`}
                              >
                                {transaction.type === 'income' ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </TableCell>
                              <TableCell className="min-w-[180px]">
                                {hasMatch ? (
                                  <div className="space-y-1">
                                    {candidates.length === 1 ? (
                                      <div className="flex flex-col gap-1">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-warning text-warning whitespace-nowrap"
                                        >
                                          <span className="material-symbols-outlined text-xs mr-1">
                                            warning
                                          </span>
                                          Possível duplicata
                                        </Badge>
                                        <Select
                                          value={action}
                                          onValueChange={(value) =>
                                            setImportActions((prev) => ({
                                              ...prev,
                                              [index]: value as ImportAction,
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="h-7 text-[11px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value={candidates[0].id}>
                                              <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">
                                                  check_circle
                                                </span>
                                                Dar baixa: {candidates[0].description.substring(0, 25)}
                                                {candidates[0].description.length > 25 ? '…' : ''}
                                              </span>
                                            </SelectItem>
                                            <SelectItem value="create">
                                              <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">
                                                  add_circle
                                                </span>
                                                Criar novo
                                              </span>
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-1">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-warning text-warning whitespace-nowrap"
                                        >
                                          <span className="material-symbols-outlined text-xs mr-1">
                                            warning
                                          </span>
                                          {candidates.length} possíveis
                                        </Badge>
                                        <Select
                                          value={action}
                                          onValueChange={(value) =>
                                            setImportActions((prev) => ({
                                              ...prev,
                                              [index]: value as ImportAction,
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="h-7 text-[11px]">
                                            <SelectValue placeholder="Selecione a ação" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="create">
                                              <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">
                                                  add_circle
                                                </span>
                                                Criar novo
                                              </span>
                                            </SelectItem>
                                            {candidates.map((candidate) => (
                                              <SelectItem key={candidate.id} value={candidate.id}>
                                                <span className="flex items-center gap-1">
                                                  <span className="material-symbols-outlined text-xs">
                                                    check_circle
                                                  </span>
                                                  Baixar: {candidate.description.substring(0, 25)}
                                                  {candidate.description.length > 25 ? '…' : ''}
                                                  {candidate.isPaid ? ' (já pago)' : ''}
                                                </span>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Criar novo</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || selectedItems.size === 0 || !selectedAccountId}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin mr-2">
                          progress_activity
                        </span>
                        Importando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined mr-2">download</span>
                        Importar {selectedItems.size} lançamento(s)
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParsedTransactions([]);
                      setSelectedItems(new Set());
                      setTransactionCategories({});
                      setTransactionDescriptions({});
                      setMatchCandidates({});
                      setImportActions({});
                      setFileName('');
                    }}
                    disabled={isImporting}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Missing category warning */}
            {(!defaultExpenseCategory || !defaultIncomeCategory) && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-warning">warning</span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Categoria "Outros" não encontrada
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Crie uma categoria chamada "Outros" para despesas e receitas antes de
                      importar.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
