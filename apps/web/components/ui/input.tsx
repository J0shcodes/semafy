import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          // Base
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground',
          'transition-shadow',

          // Placeholder
          'placeholder:text-muted-foreground',

          // Selection
          'selection:bg-primary selection:text-primary-foreground',

          // Focus
          'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',

          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-50',

          // File input
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',

          // Error state
          'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30',

          // Dark mode
          'dark:bg-input/30',

          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
