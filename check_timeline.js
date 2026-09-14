const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres' });
async function run() {
  await client.connect();
  const orders = await client.query(`SELECT o.id, o.status, o."createdAt", i."productName", i.quantity FROM "order" o JOIN order_item i ON o.id = i."orderId" WHERE i."productName" ILIKE '%zanahoria%' ORDER BY o."createdAt"`);
  console.log('Orders:', orders.rows);
  const batches = await client.query(`SELECT id, quantity, "createdAt" FROM production_batch WHERE "productId" = 'b5d5e94f-c019-4614-a8f2-ebe75987cc51' ORDER BY "createdAt"`);
  console.log('Batches:', batches.rows);
  await client.end();
}
run();
