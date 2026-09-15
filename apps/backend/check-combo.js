const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function checkCombo() {
  await client.connect();
  
  const res = await client.query(`SELECT * FROM combo_item WHERE "comboId" = '15e4999b-65eb-4105-a5f8-6e4a40d3077b'`);
  console.log('Combo Items for Bandeja Surtida:');
  console.table(res.rows);
  
  await client.end();
}

checkCombo().catch(console.error);
