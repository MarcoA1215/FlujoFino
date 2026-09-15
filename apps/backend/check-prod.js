const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function checkProduct() {
  await client.connect();
  
  const res = await client.query(`SELECT id, name, "isCombo", "physicalStock", "stockQuantity" FROM product WHERE id = '15e4999b-65eb-4105-a5f8-6e4a40d3077b'`);
  console.table(res.rows);
  
  await client.end();
}

checkProduct().catch(console.error);
