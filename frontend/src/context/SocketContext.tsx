import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { getSocket } from '../services/socket';

/**
 * Tipo de un listener de socket.
 */
type Listener<T = unknown> = (payload: T) => void;

interface SocketContextValue {
  /**
   * Suscribe a un evento. Retorna función para desuscribirse.
   * Uso típico dentro de una página:
   *
   *   useEffect(() => {
   *     return socketCtx.on('limpieza:cambio', (data) => {
   *       refetch();
   *     });
   *   }, []);
   */
  on: <T = unknown>(event: string, listener: Listener<T>) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Map<event, Set<listener>>
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  // Suscribir a eventos del backend cuando hay usuario
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    // ── Eventos GLOBALES con notificación toast automática ──
    // Estos se emiten para que TODOS los suscriptores reciban + se muestra toast.

    const eventos: Array<{
      event: string;
      toastFor?: ('admin' | 'recepcionista' | 'limpieza')[];
      makeToast: (payload: any) => string;
      style?: 'default' | 'success' | 'info' | 'warning';
    }> = [
      {
        event: 'limpieza:lista_para_validar',
        toastFor: ['admin', 'recepcionista'],
        style: 'info',
        makeToast: (p) =>
          `🧹 Hab. ${p.habitacion_numero} lista para validar (limpió ${p.empleado_nombre ?? 'limpieza'})`,
      },
      {
        event: 'limpieza:validada',
        toastFor: ['admin', 'limpieza'],
        style: 'success',
        makeToast: (p) =>
          `✓ Hab. ${p.habitacion_numero} validada y disponible`,
      },
      {
        event: 'limpieza:rechazada',
        toastFor: ['admin', 'limpieza'],
        style: 'warning',
        makeToast: (p) =>
          `✗ Hab. ${p.habitacion_numero} rechazada · ${p.motivo ?? 'revisar'}`,
      },
      {
        event: 'limpieza:nueva_pendiente',
        toastFor: ['admin', 'limpieza'],
        style: 'info',
        makeToast: (p) =>
          `📋 Nueva habitación por limpiar (#${p.habitacion_id})`,
      },
      {
        event: 'limpieza:cambio',
        // Sin toast — solo emite para que las páginas refresquen
        makeToast: () => '',
      },
      {
        event: 'habitacion:disponible',
        // Sin toast — solo refresh silencioso
        makeToast: () => '',
      },
      {
        event: 'reserva:creada',
        toastFor: ['admin', 'recepcionista'],
        style: 'info',
        makeToast: (p) => `📅 Nueva reserva ${p.codigo}`,
      },
    ];

    // Wrappers que (a) llaman listeners locales y (b) muestran toast si aplica
    const handlers: Array<[string, (...args: unknown[]) => void]> = [];

    for (const def of eventos) {
      const handler = (payload: unknown) => {
        // Ejecutar listeners locales
        const set = listenersRef.current.get(def.event);
        set?.forEach((fn) => fn(payload));

        // Mostrar toast si corresponde a este rol
        if (def.toastFor && def.toastFor.includes(user.rol)) {
          const msg = def.makeToast(payload);
          if (!msg) return;
          if (def.style === 'success') toast.success(msg);
          else if (def.style === 'warning') toast.warning(msg);
          else if (def.style === 'info') toast.info(msg);
          else toast(msg);
        }
      };
      socket.on(def.event, handler);
      handlers.push([def.event, handler]);
    }

    return () => {
      for (const [event, handler] of handlers) {
        socket.off(event, handler);
      }
    };
  }, [user]);

  const on = <T,>(event: string, listener: Listener<T>) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(listener as Listener);

    // función de cleanup
    return () => {
      listenersRef.current.get(event)?.delete(listener as Listener);
    };
  };

  return (
    <SocketContext.Provider value={{ on }}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket debe usarse dentro de <SocketProvider>');
  return ctx;
}
