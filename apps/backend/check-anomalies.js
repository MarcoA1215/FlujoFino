const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function checkStock() {
  await client.connect();
  
  const pRes = await client.query(`
    SELECT name, "physicalStock", "stockQuantity", "isCombo", "isPreAssembled"
    FROM product 
    WHERE "stockQuantity" > "physicalStock" OR ("stockQuantity" != "physicalStock" AND "isCombo" = false)
  `);
  console.table(pRes.rows);

  await client.end();
}
checkStock().catch(console.error);
