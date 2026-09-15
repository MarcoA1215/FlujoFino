const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function fixStock() {
  await client.connect();
  
  // Bandeja de Pasteles de Plátano/Mechada (Kit)
  await client.query(`UPDATE product SET "physicalStock" = 6, "stockQuantity" = 5 WHERE id = '1c4ce2c0-02cc-4edb-b99f-f63770cc734e'`);
  
  // Pastel de Plátano/Mechada (Individual)
  await client.query(`UPDATE product SET "physicalStock" = 2, "stockQuantity" = 0 WHERE id = '009149ee-a58d-41f2-82bf-d3b538a4ede1'`);
  
  console.log('Stock ajustado manualmente a petición del usuario.');
  
  await client.end();
}

fixStock().catch(console.error);
