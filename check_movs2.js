const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres' });
async function run() {
  await client.connect();
  const movs = await client.query(`SELECT id, "rawMaterialId", quantity, "createdAt" FROM stock_movement WHERE description ILIKE '%Pan de zanahoria%' ORDER BY "createdAt" DESC`);
  console.log('Movs to reverse:', movs.rows.slice(0, 11)); // There are 11 ingredients
  await client.end();
}
run();
