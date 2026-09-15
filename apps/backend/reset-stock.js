const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function resetStock() {
  await client.connect();
  const res = await client.query(`UPDATE product SET "physicalStock" = 0, "stockQuantity" = 0 WHERE "isPreAssembled" = true`);
  console.log('Reset', res.rowCount, 'pre-assembled combos to 0.');
  await client.end();
}

resetStock().catch(console.error);
