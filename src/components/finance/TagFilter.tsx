import { useState, useRef, useEffect } from 'react';
import { Tag } from '@/types/tag';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagFilterProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  includeNoTags: boolean;
  onSelectionChange: (tagIds: string[], includeNoTags: boolean) => void;
  isLoading?: boolean;
}

export function TagFilter({
  availableTags,
  selectedTagIds,
  includeNoTags,
  onSelectionChange,
  isLoading = false,
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTagToggle = (tagId: string) => {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onSelectionChange(newSelection, includeNoTags);
  };

  const handleNoTagsToggle = () => {
    onSelectionChange(selectedTagIds, !includeNoTags);
  };

  const handleClearAll = () => {
    onSelectionChange([], false);
  };

  const hasActiveFilters = selectedTagIds.length > 0 || includeNoTags;
  const filterCount = selectedTagIds.length + (includeNoTags ? 1 : 0);

  // Get display text
  const getDisplayText = () => {
    if (!hasActiveFilters) return 'Todas as tags';
    if (filterCount === 1) {
      if (includeNoTags) return 'Sem tags';
      const tag = availableTags.find((t) => t.id === selectedTagIds[0]);
      return tag?.name || 'Tag selecionada';
    }
    return `${filterCount} selecionadas`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "w-full flex items-center gap-2 py-2.5 px-4 bg-secondary rounded-xl border border-border/50 text-xs font-medium transition-colors text-left",
          hasActiveFilters && "border-accent/50",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="material-symbols-outlined text-[18px] text-muted-foreground">label</span>
        <span className={cn(
          "flex-1 truncate",
          hasActiveFilters ? "text-foreground" : "text-muted-foreground"
        )}>
          {getDisplayText()}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClearAll();
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-1">
            {/* No tags option */}
            <button
              type="button"
              onClick={handleNoTagsToggle}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-left",
                includeNoTags && "bg-accent/10"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                includeNoTags 
                  ? "bg-accent border-accent" 
                  : "border-muted-foreground/30"
              )}>
                {includeNoTags && <Check className="w-3 h-3 text-accent-foreground" />}
              </div>
              <span className="text-sm font-medium text-muted-foreground italic">Sem tags</span>
            </button>

            {availableTags.length > 0 && (
              <div className="border-t border-border my-1" />
            )}

            {/* Tag options */}
            {availableTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-left",
                    isSelected && "bg-accent/10"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                    isSelected 
                      ? "bg-accent border-accent" 
                      : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-accent-foreground" />}
                  </div>
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm font-medium text-foreground">{tag.name}</span>
                </button>
              );
            })}

            {/* Empty state */}
            {availableTags.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                Nenhuma tag encontrada nos lançamentos
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
