const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function checkPending() {
  await client.connect();
  
  // What are the pre-assembled combos?
  const combosRes = await client.query(`SELECT id, name, "isPreAssembled" FROM product WHERE "isCombo" = true`);
  console.log("Combos:");
  console.table(combosRes.rows);

  const pendingRes = await client.query(`
    SELECT o.id, o."customerName", o.status, oi.quantity, p.name 
    FROM "order" o 
    JOIN order_item oi ON o.id = oi."orderId"
    JOIN product p ON oi."productId" = p.id
    WHERE o.status IN ('PENDING', 'PREPARING')
  `);
  console.log("\nPending/Preparing Orders:");
  console.table(pendingRes.rows);

  await client.end();
}
checkPending().catch(console.error);
