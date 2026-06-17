import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Account, Transaction, Category } from '@/types/finance';
import { formatCurrency } from '@/lib/format';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { groupTransactionsByInvoice } from '@/lib/creditCard';
import { Receipt, ExternalLink } from 'lucide-react';

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

export function InvoiceDetailsDialog({
  open,
  onOpenChange,
  invoiceId,
  transactions,
  accounts,
  categories,
}: InvoiceDetailsDialogProps) {
  const grouped = groupTransactionsByInvoice(transactions, accounts);
  const invoice = invoiceId ? grouped.get(invoiceId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-accent" />
            {invoice ? `Fatura ${invoice.cc.name}` : 'Fatura'}
          </DialogTitle>
        </DialogHeader>

        {!invoice && (
          <p className="text-sm text-muted-foreground py-6">Fatura não encontrada.</p>
        )}

        {invoice && (
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border/50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className="text-sm font-semibold capitalize">
                    {format(invoice.dueDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-destructive">
                    {formatCurrency(invoice.total)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Lançamentos do ciclo ({invoice.transactions.length})
              </p>
              <div className="bg-card border border-border/50 rounded-2xl divide-y divide-border/50 max-h-72 overflow-y-auto">
                {invoice.transactions
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((t) => {
                    const cat = categories.find((c) => c.id === t.categoryId);
                    const isRefund = t.type === 'income';
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">
                            {t.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(t.date), 'dd/MM', { locale: ptBR })}
                            {cat && ` • ${cat.name}`}
                          </p>
                        </div>
                        <p className={`text-sm font-bold ${isRefund ? 'text-success' : 'text-destructive'}`}>
                          {isRefund ? '+ ' : '- '}
                          {formatCurrency(t.amount)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button asChild className="btn-gold">
                <Link to={`/cartoes/${invoice.cc.id}?mes=${format(invoice.dueDate, 'yyyy-MM')}`}>
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Página da fatura
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}