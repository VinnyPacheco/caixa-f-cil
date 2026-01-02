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
  const title = actionType === 'delete' ? 'Excluir lançamento recorrente' : 'Editar lançamento recorrente';
  const description = actionType === 'delete' 
    ? 'Este é um lançamento recorrente. Qual ação você deseja realizar?'
    : 'Este é um lançamento recorrente. Qual ação você deseja realizar?';

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
              <span className="font-semibold">
                {isInstallment ? 'Apenas esta parcela' : 'Apenas este lançamento'}
              </span>
              <span className="text-xs text-muted-foreground">
                {actionType === 'delete' 
                  ? 'Remove apenas este mês específico' 
                  : 'Modifica apenas este mês específico'}
              </span>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-4"
            onClick={() => handleAction('this_and_future')}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold">
                {isInstallment ? 'Esta e as próximas parcelas' : 'Este e os próximos'}
              </span>
              <span className="text-xs text-muted-foreground">
                {actionType === 'delete' 
                  ? 'Remove este mês e todos os seguintes' 
                  : 'Modifica este mês e todos os seguintes'}
              </span>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-4"
            onClick={() => handleAction('all')}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold">
                {isInstallment ? 'Todas as parcelas' : 'Todas as ocorrências'}
              </span>
              <span className="text-xs text-muted-foreground">
                {actionType === 'delete' 
                  ? 'Remove todas as ocorrências (passadas e futuras)' 
                  : 'Modifica todas as ocorrências (passadas e futuras)'}
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
