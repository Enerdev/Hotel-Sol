import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Contenido */}
      <div
        className={cn(
          'relative w-full bg-bg-surface border border-border-color',
          'rounded-t-2xl sm:rounded-xl shadow-xl',
          'max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col',
          sizeClasses[size]
        )}
      >
        {/* Indicador arrastre móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-color" />
        </div>

        {/* Header */}
        {(title || description) && (
          <div className="px-5 sm:px-6 py-3 sm:py-4 border-b border-border-color flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-bg-elevated shrink-0"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        )}

        {/* Body con scroll */}
        <div className="overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
