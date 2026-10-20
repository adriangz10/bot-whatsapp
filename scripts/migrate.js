// Ejecuta las migraciones SQL de /migrations en orden y registra las aplicadas.
// Uso: npm run migrate   (lee DB_* desde .env o variables de entorno)
//      npm run migrate -- --baseline 005_create_clients_and_relations.sql
//      marca como aplicadas las migraciones hasta ese archivo (inclusive) sin ejecutarlas,
//      para bases que ya tienen ese esquema.
// .env.local tiene prioridad sobre .env (dotenv no pisa variables ya definidas)
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  await conn.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name varchar(255) PRIMARY KEY, appliedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  );
  const [rows] = await conn.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  const baselineIdx = process.argv.indexOf('--baseline');
  const baseline = baselineIdx > -1 ? process.argv[baselineIdx + 1] : null;
  let baselining = Boolean(baseline);

  for (const file of files) {
    if (applied.has(file)) continue;
    if (baselining) {
      console.log(`Baseline: ${file}`);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      if (file === baseline) baselining = false;
      continue;
    }
    console.log(`Aplicando ${file}...`);
    await conn.query(fs.readFileSync(path.join(dir, file), 'utf8'));
    await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
  }

  console.log('Migraciones al día');
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
