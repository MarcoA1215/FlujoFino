const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query(`SELECT id, name, "stockQuantity" FROM product WHERE name ILIKE '%zanahoria%'`);
  console.log(res.rows);
  const orders = await client.query(`SELECT o.id, o.status, i."productName", i.quantity FROM "order" o JOIN order_item i ON o.id = i."orderId" WHERE i."productName" ILIKE '%zanahoria%'`);
  console.log('Orders:', orders.rows);
  await client.end();
}
run();
