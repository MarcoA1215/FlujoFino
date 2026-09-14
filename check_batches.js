const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres' });
async function run() {
  await client.connect();
  const batches = await client.query(`SELECT * FROM production_batch WHERE "productId" = 'b5d5e94f-c019-4614-a8f2-ebe75987cc51'`);
  console.log('Batches:', batches.rows);
  const movements = await client.query(`SELECT * FROM stock_movement WHERE description ILIKE '%zanahoria%'`);
  console.log('Movements:', movements.rows);
  await client.end();
}
run();
