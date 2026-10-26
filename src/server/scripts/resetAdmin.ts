import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../db/store.ts';
import { mysqlService } from '../db/mysql.ts';

async function main() {
  console.log('[KASIRPRO] Memulai reset akun administrator...');

  await db.init();

  const user = db.getUserByUsername('admin');
  if (!user) {
    console.error('[KASIRPRO ERROR] Akun user "admin" tidak ditemukan di database.');
    process.exit(1);
  }

  const newHash = bcrypt.hashSync('admin123', 10);
  user.passwordHash = newHash;
  user.status = 'active';
  user.failedLoginAttempts = 0;
  user.supervisorPin = '123456';

  db.save();
  await mysqlService.saveUser(user);

  console.log('==================================================');
  console.log('✅ SUKSES: Akun Administrator berhasil direset!');
  console.log('   Username       : admin');
  console.log('   Password       : admin123');
  console.log('   PIN Supervisor : 123456');
  console.log('   Status         : active');
  console.log('==================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('[KASIRPRO ERROR]', err);
  process.exit(1);
});
