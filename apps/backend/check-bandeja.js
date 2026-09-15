const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function checkBandeja() {
  await client.connect();
  const res = await client.query(`SELECT id, name, "isCombo", "isPreAssembled", "physicalStock", "stockQuantity" FROM product WHERE name LIKE '%Bandeja de Pasteles de Plátano%'`);
  console.table(res.rows);
  await client.end();
}

checkBandeja().catch(console.error);
