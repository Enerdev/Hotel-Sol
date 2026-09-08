/**
 * Script: test:db
 *
 * Verifica que la conexión a MySQL funcione y que las tablas estén pobladas.
 * Ejecutar: npm run test:db
 */

import { db, testDbConnection } from '../config/db.js';
import type { RowDataPacket } from 'mysql2';

async function main() {
  console.log('🔍 Probando conexión a la BD...\n');

  await testDbConnection();

  console.log('\n📊 Conteo de registros:\n');

  const checks: Array<{ table: string; expected: number }> = [
    { table: 'usuarios', expected: 6 },
    { table: 'habitaciones', expected: 25 },
    { table: 'camas_habitacion', expected: 26 },
    { table: 'tarifas_franjas', expected: 24 },
    { table: 'temporadas', expected: 5 },
    { table: 'tarifas_noche_temporada', expected: 30 },
    { table: 'productos', expected: 3 },
    { table: 'clientes', expected: 6 },
    { table: 'reservas', expected: 5 },
    { table: 'limpieza_registros', expected: 2 },
  ];

  let allOk = true;

  for (const { table, expected } of checks) {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${table}`);
    const total = (rows[0] as { total: number }).total;
    const ok = total === expected;
    const symbol = ok ? '✅' : '⚠️ ';
    console.log(
      `  ${symbol} ${table.padEnd(28)} ${String(total).padStart(4)} (esperado: ${expected})`
    );
    if (!ok) allOk = false;
  }

  console.log('');
  if (allOk) {
    console.log('✨ Todo en orden. La BD está lista para que el backend la use.');
  } else {
    console.log('⚠️  Algunos conteos no coinciden. Verifica que importaste schema.sql + seed.sql.');
  }

  await db.end();
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('💥 Error:', err);
  process.exit(1);
});
