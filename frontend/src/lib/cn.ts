import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes de Tailwind y resuelve conflictos.
 * Ejemplo: cn('p-2', isActive && 'bg-accent', 'p-4') → 'bg-accent p-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
