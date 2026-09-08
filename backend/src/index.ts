import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { env } from './config/env.js';
import { db, testDbConnection } from './config/db.js';
import { initSockets } from './sockets/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import { authRouter } from './routes/auth.routes.js';
import { habitacionesRouter } from './routes/habitaciones.routes.js';
import { clientesRouter } from './routes/clientes.routes.js';
import { limpiezaRouter } from './routes/limpieza.routes.js';
import { tarifasRouter } from './routes/tarifas.routes.js';
import { reservasRouter } from './routes/reservas.routes.js';
import { personalRouter } from './routes/personal.routes.js';
import { productosRouter } from './routes/productos.routes.js';
import { reportesRouter } from './routes/reportes.routes.js';
import { configuracionRouter } from './routes/configuracion.routes.js';
import { cobrosRouter } from './routes/cobros.routes.js';
import { cajaRouter } from './routes/caja.routes.js';

async function main() {
  await testDbConnection();

  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/habitaciones', habitacionesRouter);
  app.use('/api/clientes', clientesRouter);
  app.use('/api/limpieza', limpiezaRouter);
  app.use('/api/tarifas', tarifasRouter);
  app.use('/api/reservas', reservasRouter);
  app.use('/api/personal', personalRouter);
  app.use('/api/productos', productosRouter);
  app.use('/api/reportes', reportesRouter);
  app.use('/api/configuracion', configuracionRouter);
  app.use('/api/cobros', cobrosRouter);
  app.use('/api/caja', cajaRouter);

  // Sirve el build del frontend (copiado a backend/public en el build) desde
  // el mismo subdominio. Las rutas /api/* ya fueron resueltas arriba, así que
  // cualquier ruta que llegue hasta aquí y no empiece con /api es del SPA.
  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  const httpServer = createServer(app);
  initSockets(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🏨 Hotel System Backend                  ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║   📡 API:        http://localhost:${env.PORT}     ║`);
    console.log(`║   🔌 Socket.IO:  http://localhost:${env.PORT}     ║`);
    console.log(`║   🌍 Entorno:    ${env.NODE_ENV.padEnd(26)}║`);
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('Endpoints principales:');
    console.log('  /api/auth, /api/habitaciones, /api/clientes');
    console.log('  /api/limpieza, /api/reservas, /api/tarifas');
    console.log('  /api/personal, /api/productos');
    console.log('  /api/reportes, /api/configuracion');
    console.log('  /api/cobros, /api/caja ⭐');
    console.log('');
  });

  const shutdown = async (signal: string) => {
    console.log(`\n📥 Recibida señal ${signal}, cerrando...`);
    httpServer.close();
    await db.end();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('💥 Fallo al iniciar:', err);
  process.exit(1);
});
