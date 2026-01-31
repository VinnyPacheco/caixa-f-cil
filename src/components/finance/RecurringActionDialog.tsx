import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export type RecurringActionType = 'only_this' | 'this_and_future' | 'all';

interface RecurringActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: RecurringActionType) => void;
  actionType: 'edit' | 'delete';
  isInstallment?: boolean;
}

export function RecurringActionDialog({
  open,
  onOpenChange,
  onAction,
  actionType,
  isInstallment = false,
}: RecurringActionDialogProps) {
  const title = actionType === 'delete' ? 'Excluir lançamento parcelado' : 'Editar lançamento parcelado';
  const description = actionType === 'delete' 
    ? 'Este é um lançamento parcelado. Qual ação você deseja realizar?'
    : 'Este é um lançamento parcelado. Qual ação você deseja realizar?';

  const handleAction = (action: RecurringActionType) => {
    onAction(action);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-4"
            onClick={() => handleAction('only_this')}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold">Apenas esta parcela</span>
              <span className="text-xs text-muted-foreground">
                {actionType === 'delete' 
                  ? 'Remove apenas esta parcela específica' 
                  : 'Modifica apenas esta parcela específica'}
              </span>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-4"
            onClick={() => handleAction('this_and_future')}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold">Esta e as próximas parcelas</span>
              <span className="text-xs text-muted-foreground">
                {actionType === 'delete' 
                  ? 'Remove esta parcela e todas as seguintes' 
                  : 'Modifica esta parcela e todas as seguintes'}
              </span>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-4"
            onClick={() => handleAction('all')}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold">Todas as parcelas</span>
              <span className="text-xs text-muted-foreground">
                {actionType === 'delete' 
                  ? 'Remove todas as parcelas deste lançamento' 
                  : 'Modifica todas as parcelas deste lançamento'}
              </span>
            </div>
          </Button>
        </div>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
