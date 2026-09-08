import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(
          'w-full h-10 px-3 rounded-md',
          'bg-bg-elevated border border-border-color text-text-primary',
          'placeholder:text-text-muted',
          'hover:border-border-hover',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          'disabled:opacity-50',
          error && 'border-danger focus:border-danger focus:ring-danger',
          className
        )}
        {...props}
      />
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  )
);

Input.displayName = 'Input';
