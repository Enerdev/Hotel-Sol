/**
 * Cliente Socket.IO para tiempo real.
 * Se conecta al backend usando el token JWT.
 */
import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from './api';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = tokenStorage.getAccess();
  if (!token) {
    throw new Error('No hay token de auth, no se puede conectar el socket');
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket conectado:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket desconectado:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket error:', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
