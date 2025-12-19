import { useState, useEffect } from 'react';
import { Category, TransactionType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (category: Omit<Category, 'id'> & { id?: string }) => void;
}

const categoryTypes: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
];

const categoryIcons = [
  'restaurant',
  'directions_car',
  'movie',
  'health_and_safety',
  'home',
  'school',
  'shopping_cart',
  'build',
  'paid',
  'work',
  'trending_up',
  'flight',
  'pets',
  'fitness_center',
  'local_cafe',
  'sports_esports',
  'checkroom',
  'local_hospital',
  'more_horiz',
];

const categoryColors = [
  '#F59E0B', // Yellow
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#0EA5E9', // Sky
  '#64748B', // Gray
];

export function CategoryForm({ open, onOpenChange, category, onSave }: CategoryFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState(categoryColors[0]);
  const [icon, setIcon] = useState(categoryIcons[0]);

  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
      setIcon(category.icon);
    } else {
      setName('');
      setType('expense');
      setColor(categoryColors[0]);
      setIcon(categoryIcons[0]);
    }
  }, [category, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      ...(category?.id && { id: category.id }),
      name: name.trim(),
      type,
      color,
      icon,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da categoria</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alimentação, Transporte..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as TransactionType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                {categoryTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {categoryColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {categoryIcons.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                    icon === i
                      ? 'ring-2 ring-accent bg-accent/20'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ color: color }}>
                    {i}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gold">
              {isEditing ? 'Salvar' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
