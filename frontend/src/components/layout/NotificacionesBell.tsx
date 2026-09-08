import { useState, useRef, useEffect } from 'react';
import { Bell, Receipt, X, CheckCheck, Smartphone } from 'lucide-react';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';

export function NotificacionesBell() {
  const { user } = useAuth();
  const { notificaciones, noLeidas, marcarTodasLeidas, limpiarNotificaciones } =
    useNotificaciones();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Solo mostrar para admin
  if (user?.rol !== 'admin') return null;

  const handleToggle = () => {
    if (!open) {
      setOpen(true);
      // Marcar como leídas al abrir
      setTimeout(() => marcarTodasLeidas(), 300);
    } else {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'relative size-9 rounded-md flex items-center justify-center transition',
          'bg-bg-elevated border border-border-color hover:border-accent/50',
          noLeidas > 0 && 'border-accent/50'
        )}
        aria-label="Notificaciones"
      >
        <Bell className={cn('size-4', noLeidas > 0 ? 'text-accent' : 'text-text-secondary')} />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-bg-surface border border-border-color rounded-lg shadow-2xl z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border-color">
            <h3 className="text-sm font-semibold text-text-primary">
              Notificaciones de caja
            </h3>
            <div className="flex gap-1">
              {notificaciones.length > 0 && (
                <button
                  type="button"
                  onClick={limpiarNotificaciones}
                  className="text-xs text-text-muted hover:text-danger flex items-center gap-1 px-2 py-1 rounded hover:bg-bg-elevated"
                  title="Limpiar todas"
                >
                  <X className="size-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 px-2 py-1 rounded hover:bg-bg-elevated"
                title="Cerrar"
              >
                <CheckCheck className="size-3" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {notificaciones.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="size-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-secondary">
                  No hay notificaciones de hoy
                </p>
              </div>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-3 border-b border-border-color/40 flex items-start gap-2 transition',
                    !n.leido && 'bg-accent/5'
                  )}
                >
                  <div className="size-8 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
                    <Receipt className="size-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">
                        {n.codigo}
                      </p>
                      <p className="text-sm font-semibold text-accent tabular-nums">
                        S/ {Number(n.monto).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs text-text-secondary truncate">
                      {n.concepto}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1">
                        {(n.metodo_pago === 'yape' || n.metodo_pago === 'plin') && (
                          <Smartphone className="size-3 text-info" />
                        )}
                        {n.metodo_pago}
                      </span>
                      <span>·</span>
                      <span>{formatHora(n.fecha)}</span>
                      {n.recepcionista_nombre && (
                        <>
                          <span>·</span>
                          <span className="truncate">{n.recepcionista_nombre}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatHora(s: string): string {
  return new Date(s).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
