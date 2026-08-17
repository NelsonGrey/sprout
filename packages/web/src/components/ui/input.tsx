import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface px-3 py-2 text-ink placeholder:text-ink-muted',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
