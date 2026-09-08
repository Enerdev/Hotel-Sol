import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { Receipt } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { api } from '../services/api';

export interface NotificacionCobro {
  id: number;
  codigo: string;
  concepto: string;
  monto: number;
  metodo_pago: string;
  recepcionista_nombre: string | null;
  fecha: string;
  leido?: boolean;
}

interface NotificacionesContextType {
  notificaciones: NotificacionCobro[];
  noLeidas: number;
  marcarTodasLeidas: () => void;
  limpiarNotificaciones: () => void;
  refresh: () => void;
}

const NotificacionesContext = createContext<NotificacionesContextType | null>(null);

export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketCtx = useSocket();
  const [notificaciones, setNotificaciones] = useState<NotificacionCobro[]>([]);

  // Cargar últimas notificaciones del día (solo admin)
  useEffect(() => {
    if (user?.rol !== 'admin') return;
    api
      .get<NotificacionCobro[]>('/caja/notificaciones')
      .then((data) => {
        setNotificaciones(data.map((n) => ({ ...n, leido: true })));
      })
      .catch(() => {});
  }, [user]);

  // Escuchar nuevos cobros vía socket (solo admin)
  useEffect(() => {
    if (user?.rol !== 'admin') return;

    const unsubNuevo = socketCtx.on<Omit<NotificacionCobro, 'leido'>>('cobro:nuevo', (data) => {
      setNotificaciones((prev) => [{ ...data, leido: false }, ...prev].slice(0, 50));
      toast(
        <div className="flex items-start gap-3">
          <Receipt className="size-5 text-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-text-primary">
              Nuevo cobro: {data.codigo}
            </p>
            <p className="text-sm text-text-secondary">
              {data.concepto} · S/ {Number(data.monto).toFixed(2)} · {data.metodo_pago}
            </p>
            {data.recepcionista_nombre && (
              <p className="text-xs text-text-muted">
                Por {data.recepcionista_nombre}
              </p>
            )}
          </div>
        </div>,
        { duration: 5000 }
      );
    });

    const unsubAnulado = socketCtx.on<{ codigo: string; motivo: string }>('cobro:anulado', (data) => {
      toast.error(`Cobro ${data.codigo} anulado: ${data.motivo}`, { duration: 4000 });
    });

    return () => {
      unsubNuevo();
      unsubAnulado();
    };
  }, [user, socketCtx]);

  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  const marcarTodasLeidas = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
  };

  const limpiarNotificaciones = () => {
    setNotificaciones([]);
  };

  const refresh = () => {
    if (user?.rol !== 'admin') return;
    api
      .get<NotificacionCobro[]>('/caja/notificaciones')
      .then((data) => {
        setNotificaciones((prev) => {
          const leidasMap = new Map(prev.map((n) => [n.id, n.leido]));
          return data.map((n) => ({ ...n, leido: leidasMap.get(n.id) ?? true }));
        });
      })
      .catch(() => {});
  };

  return (
    <NotificacionesContext.Provider
      value={{ notificaciones, noLeidas, marcarTodasLeidas, limpiarNotificaciones, refresh }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
  return ctx;
}
