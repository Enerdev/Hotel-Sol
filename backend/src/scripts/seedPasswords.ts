/**
 * Script: seed:passwords
 *
 * Reemplaza los password_hash placeholder de la BD por hashes bcrypt reales.
 * Después de correr esto, los usuarios pueden hacer login.
 *
 * Ejecutar: npm run seed:passwords
 */

import { db } from '../config/db.js';
import { hashPassword } from '../utils/auth.js';
import type { ResultSetHeader } from 'mysql2';

const credentials: Array<{ username: string; password: string }> = [
  { username: 'admin', password: 'admin123' },
  { username: 'recep1', password: 'recep123' },
  { username: 'recep2', password: 'recep123' },
  { username: 'recep3', password: 'recep123' },
  { username: 'limpieza1', password: 'limp123' },
  { username: 'limpieza2', password: 'limp123' },
];

async function main() {
  console.log('🔐 Generando hashes bcrypt para los usuarios de prueba...\n');

  for (const { username, password } of credentials) {
    const hash = await hashPassword(password);
    const [result] = await db.query<ResultSetHeader>(
      'UPDATE usuarios SET password_hash = ? WHERE username = ?',
      [hash, username]
    );

    if (result.affectedRows === 1) {
      console.log(`  ✅ ${username.padEnd(12)} → contraseña activada`);
    } else {
      console.log(`  ⚠️  ${username.padEnd(12)} → no encontrado en BD`);
    }
  }

  console.log('\n✨ Listo. Ahora puedes hacer login con:');
  console.log('');
  console.log('   ┌────────────┬─────────────┬──────────────┐');
  console.log('   │ Usuario    │ Contraseña  │ Rol          │');
  console.log('   ├────────────┼─────────────┼──────────────┤');
  console.log('   │ admin      │ admin123    │ admin        │');
  console.log('   │ recep1     │ recep123    │ recepcionista│');
  console.log('   │ recep2     │ recep123    │ recepcionista│');
  console.log('   │ recep3     │ recep123    │ recepcionista│');
  console.log('   │ limpieza1  │ limp123     │ limpieza     │');
  console.log('   │ limpieza2  │ limp123     │ limpieza     │');
  console.log('   └────────────┴─────────────┴──────────────┘');
  console.log('');

  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('💥 Error:', err);
  process.exit(1);
});
