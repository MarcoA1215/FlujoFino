const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function checkCombo() {
  await client.connect();
  const res = await client.query(`SELECT ci.*, p.name as component_name, p."physicalStock", p."stockQuantity" FROM combo_item ci JOIN product p ON ci."componentId" = p.id WHERE ci."comboId" = '1c4ce2c0-02cc-4edb-b99f-f63770cc734e'`);
  console.table(res.rows);
  await client.end();
}

checkCombo().catch(console.error);
