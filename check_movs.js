const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres' });
async function run() {
  await client.connect();
  const movs = await client.query(`SELECT "rawMaterialId", quantity FROM stock_movement WHERE "createdAt" >= '2026-09-14T05:01:32Z' AND "createdAt" <= '2026-09-14T05:01:33Z'`);
  console.log('Movs to reverse:', movs.rows);
  await client.end();
}
run();
