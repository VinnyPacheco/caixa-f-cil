import { useState, useRef, useEffect } from 'react';
import { Tag } from '@/types/tag';
import { X, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#22C55E', // green
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#EC4899', // pink
];

interface TagSelectorProps {
  selectedTags: Tag[];
  availableTags: Tag[];
  onAddTag: (tag: Tag) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag>;
}

export function TagSelector({
  selectedTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter available tags that are not already selected
  const filteredTags = availableTags.filter(
    (tag) =>
      !selectedTags.some((st) => st.id === tag.id) &&
      tag.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check if search matches an existing tag name exactly
  const exactMatch = availableTags.some(
    (tag) => tag.name.toLowerCase() === search.toLowerCase()
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateTag = async () => {
    if (!search.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      const newTag = await onCreateTag(search.trim(), newTagColor);
      onAddTag(newTag);
      setSearch('');
      setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectTag = (tag: Tag) => {
    onAddTag(tag);
    setSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
        Tags
      </label>

      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => onRemoveTag(tag.id)}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Tag input and dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2 bg-secondary p-3 rounded-xl">
          <span className="material-symbols-outlined text-muted-foreground text-lg">label</span>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Adicionar tag..."
            className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground text-sm font-medium"
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto p-1">
              {/* Existing tags */}
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleSelectTag(tag)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm font-medium text-foreground">{tag.name}</span>
                </button>
              ))}

              {/* Create new tag option */}
              {search.trim() && !exactMatch && (
                <div className="border-t border-border mt-1 pt-1">
                  <div className="px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-2">Criar nova tag:</p>
                    <div className="flex items-center gap-2">
                      {/* Color picker */}
                      <div className="flex gap-1 flex-wrap">
                        {TAG_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewTagColor(color)}
                            className={cn(
                              "w-5 h-5 rounded-full transition-all",
                              newTagColor === color && "ring-2 ring-offset-2 ring-foreground"
                            )}
                            style={{ backgroundColor: color }}
                          >
                            {newTagColor === color && (
                              <Check className="w-3 h-3 text-white mx-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      disabled={isCreating}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Criar "{search.trim()}"
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {filteredTags.length === 0 && !search.trim() && (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Digite para buscar ou criar uma tag
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple display of tag dots for transaction cards
interface TagDotsProps {
  tags: Tag[];
  maxVisible?: number;
}

export function TagDots({ tags, maxVisible = 5 }: TagDotsProps) {
  if (tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const remaining = tags.length - maxVisible;

  return (
    <div className="flex items-center gap-0.5">
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: tag.color }}
          title={tag.name}
        />
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-muted-foreground ml-0.5">+{remaining}</span>
      )}
    </div>
  );
}
