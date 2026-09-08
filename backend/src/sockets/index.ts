import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

let io: SocketIOServer | null = null;

interface JwtPayload {
  userId: number;
  username: string;
  rol: 'admin' | 'recepcionista' | 'limpieza';
}

export function initSockets(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  // Middleware: autenticación por token JWT (handshake)
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      return next(new Error('Sin token'));
    }
    try {
      const cleanToken = String(token).replace(/^Bearer\s+/, '');
      const payload = jwt.verify(cleanToken, env.JWT_SECRET) as JwtPayload;
      (socket.data as JwtPayload) = payload;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data as JwtPayload;
    console.log(`🔌 Socket conectado: ${user.username} (${user.rol})`);

    // Unir a room según rol
    socket.join(`role:${user.rol}`);

    // 🔔 Si es admin, también al room "admins" (notificaciones)
    if (user.rol === 'admin') {
      socket.join('admins');
    }
    if (user.rol === 'recepcionista' || user.rol === 'admin') {
      socket.join('recepcion');
    }
    if (user.rol === 'limpieza' || user.rol === 'admin') {
      socket.join('limpieza');
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Socket desconectado: ${user.username}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO no inicializado');
  return io;
}

export function emitToRoom(room: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(room).emit(event, data);
}

export function getSocketServer() {
  return getIO();
}
