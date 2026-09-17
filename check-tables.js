const { Client } = require('pg');
require('dotenv').config({ path: 'apps/backend/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.table(res.rows);
  await client.end();
}
checkTables().catch(console.error);
