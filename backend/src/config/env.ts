import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Carga el .env siempre desde backend/.env, sin importar el directorio de
// trabajo con el que Passenger/Plesk arranque el proceso.
// Este archivo compila a backend/dist/config/env.js, así que backend/.env
// queda dos niveles arriba de __dirname.
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Esquema de validación de variables de entorno.
 * Si falta algo o es inválido, el servidor no arranca y te dice qué falta.
 */
const envSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0 && value < 65536, {
      message: 'PORT debe ser un número entero entre 1 y 65535',
    }),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z
    .string()
    .default('3306')
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0 && value < 65536, {
      message: 'DB_PORT debe ser un número entero entre 1 y 65535',
    }),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('lapreperu_hotel'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  BCRYPT_ROUNDS: z
    .string()
    .default('10')
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0, {
      message: 'BCRYPT_ROUNDS debe ser un número entero mayor a 0',
    }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  console.error('\n💡 Asegúrate de tener un archivo .env basado en .env.example');
  process.exit(1);
}

export const env = parsed.data;