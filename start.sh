#!/bin/sh
set -e

# Resolve any stuck failed migrations before deploying
node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query(
    \"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL OR (logs IS NOT NULL AND logs != '')\"
  );
  for (const r of rows) {
    console.log('Resolving stuck migration:', r.migration_name);
    await c.query('DELETE FROM _prisma_migrations WHERE migration_name = \$1', [r.migration_name]);
  }
  await c.end();
})().catch(e => { console.log('No migrations to resolve or table does not exist:', e.message); });
"

# Now run migrate deploy and start
npx prisma migrate deploy
exec npx next start
