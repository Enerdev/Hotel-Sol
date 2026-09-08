import mysql from 'mysql2/promise';
import { env } from './env.js';

/**
 * Pool de conexiones MySQL.
 * Usar pool en vez de conexión única permite manejar múltiples queries
 * en paralelo sin bloquear el servidor.
 */
export const db = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Importante: que devuelva fechas como strings, no como objetos Date
  // (evita problemas de timezone entre MySQL y Node)
  dateStrings: true,
  // Soporta múltiples queries en una sola llamada (útil para el seed)
  multipleStatements: false,
  // Charset
  charset: 'utf8mb4',
});

/**
 * Verifica que la BD esté accesible al arrancar el servidor.
 * Si falla, el servidor no inicia (mejor fallar rápido que silencioso).
 */
export async function testDbConnection(): Promise<void> {
  try {
    const conn = await db.getConnection();
    await conn.ping();
    conn.release();
    console.log(`✅ Conectado a MySQL: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  } catch (error) {
    console.error('❌ No se pudo conectar a MySQL:');
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
      // Pistas según el código de error
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ECONNREFUSED') {
        console.error('   💡 ¿Está corriendo MySQL? Inicia XAMPP/Laragon.');
      } else if (code === 'ER_BAD_DB_ERROR') {
        console.error('   💡 La BD "hotel_system" no existe. Importa schema.sql + seed.sql.');
      } else if (code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('   💡 Usuario/contraseña incorrectos. Revisa tu .env');
      }
    }
    throw error;
  }
}
