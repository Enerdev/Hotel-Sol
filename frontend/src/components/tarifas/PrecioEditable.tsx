import { useEffect, useRef, useState } from 'react';
import { Check, X, Pencil, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface PrecioEditableProps {
  /** Precio actual (puede ser null = no disponible) */
  precio: number | null;
  /** Si lo guarda con éxito */
  onSave: (nuevoPrecio: number | null) => Promise<void>;
  /** Si quieres mostrar moneda */
  currency?: string;
  /** Permite ponerlo a null (no disponible) */
  allowNull?: boolean;
  /** Texto para mostrar si está null */
  nullLabel?: string;
}

/**
 * Celda con precio que se puede editar haciendo click.
 * Muestra el precio en modo lectura y se transforma en input al hacer click.
 */
export function PrecioEditable({
  precio,
  onSave,
  currency = 'S/',
  allowNull = false,
  nullLabel = '—',
}: PrecioEditableProps) {
  const [editing, setEditing] = useState(false);
  const [valor, setValor] = useState(precio !== null ? String(precio) : '');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Sincronizar cuando el precio cambia desde fuera
  useEffect(() => {
    if (!editing) {
      setValor(precio !== null ? String(precio) : '');
    }
  }, [precio, editing]);

  const handleSave = async () => {
    const trimmed = valor.trim();
    let nuevoValor: number | null;

    if (trimmed === '' || trimmed === '-' || trimmed === '—') {
      if (!allowNull) {
        setValor(precio !== null ? String(precio) : '');
        setEditing(false);
        return;
      }
      nuevoValor = null;
    } else {
      const n = Number(trimmed);
      if (isNaN(n) || n < 0) {
        // Valor inválido: revertir
        setValor(precio !== null ? String(precio) : '');
        setEditing(false);
        return;
      }
      nuevoValor = n;
    }

    // Si no cambió, salir sin guardar
    if (nuevoValor === precio) {
      setEditing(false);
      return;
    }

    setBusy(true);
    try {
      await onSave(nuevoValor);
      setEditing(false);
    } catch {
      // El padre debería mostrar el toast de error
      setValor(precio !== null ? String(precio) : '');
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setValor(precio !== null ? String(precio) : '');
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          'group w-full text-right px-2 py-1 rounded transition-colors',
          'hover:bg-bg-elevated',
          precio === null && 'text-text-muted italic'
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          {precio !== null ? (
            <span className="tabular-nums text-text-primary font-medium">
              {currency} {precio.toFixed(2)}
            </span>
          ) : (
            <span>{nullLabel}</span>
          )}
          <Pencil className="size-3 opacity-0 group-hover:opacity-100 text-text-muted shrink-0" />
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min={0}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        disabled={busy}
        className="w-24 h-8 px-2 rounded bg-bg-elevated border border-accent text-text-primary text-right text-sm tabular-nums focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={busy}
        className="p-1 rounded text-success hover:bg-success/10"
        title="Guardar (Enter)"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        disabled={busy}
        className="p-1 rounded text-text-muted hover:bg-bg-elevated"
        title="Cancelar (Esc)"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
