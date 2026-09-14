const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres' });
async function run() {
  await client.connect();
  
  const batchId = '9f806aa3-e334-41a4-9c5f-74414fdd8f42';
  const productId = 'b5d5e94f-c019-4614-a8f2-ebe75987cc51';
  
  // 1. Subtract 2 from product stock
  await client.query(`UPDATE product SET "stockQuantity" = "stockQuantity" - 2 WHERE id = $1`, [productId]);
  
  // 2. Add back raw material stock
  const movs = await client.query(`SELECT "rawMaterialId", quantity FROM stock_movement WHERE "createdAt" = '2026-09-14T05:01:32.220Z'`);
  for (const mov of movs.rows) {
    await client.query(`UPDATE raw_material SET "stockQuantity" = "stockQuantity" + $1 WHERE id = $2`, [mov.quantity, mov.rawMaterialId]);
  }
  
  // 3. Delete the movements
  await client.query(`DELETE FROM stock_movement WHERE "createdAt" = '2026-09-14T05:01:32.220Z'`);
  
  // 4. Delete the batch
  await client.query(`DELETE FROM production_batch WHERE id = $1`, [batchId]);
  
  console.log('Reversed duplicate batch successfully.');
  await client.end();
}
run();
