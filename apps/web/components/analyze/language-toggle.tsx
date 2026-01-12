'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const languages = [
  { id: 'english', label: 'Plain English' },
  { id: 'pidgin', label: 'Pidgin' },
];

interface LanguageToggleProps {
  onLanguageChange?: (language: string) => void;
}

export function LanguageToggle({ onLanguageChange }: LanguageToggleProps) {
  const [selected, setSelected] = useState('english');

  const handleSelect = (id: string) => {
    setSelected(id);
    onLanguageChange?.(id);
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
      {languages.map((lang) => (
        <button
          key={lang.id}
          onClick={() => handleSelect(lang.id)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            selected === lang.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
