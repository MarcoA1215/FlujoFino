const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function fixNegativeStock() {
  await client.connect();
  
  const res = await client.query(`UPDATE product SET "physicalStock" = 0 WHERE "physicalStock" < 0 RETURNING id, name`);
  console.log('Fixed', res.rowCount, 'products with negative physical stock.');
  
  await client.end();
}

fixNegativeStock().catch(console.error);
