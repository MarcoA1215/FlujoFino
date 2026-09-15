const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function checkOrders() {
  await client.connect();
  
  const res = await client.query(`SELECT id, status, "customerName" FROM "order" WHERE status IN ('PENDING', 'PREPARING')`);
  console.log('Orders:');
  console.table(res.rows);
  
  const pRes = await client.query(`SELECT id, name, "physicalStock", "stockQuantity" FROM product WHERE "physicalStock" > 0 OR "stockQuantity" < 0`);
  console.log('Products:');
  console.table(pRes.rows);
  
  await client.end();
}

checkOrders().catch(console.error);
