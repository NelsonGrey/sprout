import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'rounded-lg border border-white/20 bg-transparent px-3 py-2 text-white placeholder:text-white/40',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
