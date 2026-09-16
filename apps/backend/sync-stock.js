const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function syncStock() {
  await client.connect();
  
  // 1. Reset all Kits' physical and available stock to 0 to start clean.
  await client.query(`UPDATE product SET "physicalStock" = 0, "stockQuantity" = 0 WHERE "isPreAssembled" = true`);
  
  // 2. Fetch all products
  const pRes = await client.query(`SELECT id, "physicalStock", "isCombo", "isPreAssembled" FROM product`);
  const products = {};
  pRes.rows.forEach(p => {
    products[p.id] = { ...p, stockQuantity: p.physicalStock };
  });
  
  // 3. Fetch combo items for virtual combos
  const cRes = await client.query(`SELECT "comboId", "componentId", quantity FROM combo_item`);
  const comboItems = {};
  cRes.rows.forEach(c => {
    if (!comboItems[c.comboId]) comboItems[c.comboId] = [];
    comboItems[c.comboId].push(c);
  });
  
  // 4. Fetch all pending/preparing order items
  const oRes = await client.query(`
    SELECT oi."productId", oi.quantity, p."isCombo", p."isPreAssembled"
    FROM order_item oi
    JOIN "order" o ON oi."orderId" = o.id
    JOIN product p ON oi."productId" = p.id
    WHERE o.status IN ('PENDING', 'PREPARING')
  `);
  
  // 5. Deduct from available stock (stockQuantity)
  for (const item of oRes.rows) {
    if (item.isCombo && !item.isPreAssembled) {
      // Virtual combo -> deduct components
      const items = comboItems[item.productId] || [];
      for (const cItem of items) {
        if (products[cItem.componentId]) {
          products[cItem.componentId].stockQuantity -= (cItem.quantity * item.quantity);
        }
      }
    } else {
      // Normal product or PreAssembled combo -> deduct itself
      if (products[item.productId]) {
        products[item.productId].stockQuantity -= item.quantity;
      }
    }
  }
  
  // 6. Update DB
  await client.query('BEGIN');
  for (const id of Object.keys(products)) {
    await client.query(`UPDATE product SET "stockQuantity" = $1 WHERE id = $2`, [products[id].stockQuantity, id]);
  }
  await client.query('COMMIT');
  
  console.log("Stock successfully synced!");
  await client.end();
}
syncStock().catch(console.error);
