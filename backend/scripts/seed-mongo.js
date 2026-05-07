/**
 * Seed MongoDB with JSON files from backend/data
 * Usage:
 *   npm run seed:mongo
 *   npm run seed:mongo -- --force
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../db');

async function main() {
  const force = process.argv.includes('--force');
  await db.connect();
  await db.ensureIndexes();
  await db.seedFromJson({ force });

  console.log(`[seed-mongo] Done. force=${force}`);
}

main()
  .catch((error) => {
    console.error('[seed-mongo] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.close();
    } catch (_error) {}
  });
