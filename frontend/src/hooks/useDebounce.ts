import { useEffect, useState } from 'react';

/**
 * Retrasa la actualización de un valor hasta que haya pasado X milisegundos
 * sin que cambie. Útil para inputs de búsqueda.
 *
 * Uso:
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *   useEffect(() => {
 *     // Esto solo se ejecuta 300ms después de que el usuario para de escribir
 *     fetch(`/api/buscar?q=${debouncedQuery}`);
 *   }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
