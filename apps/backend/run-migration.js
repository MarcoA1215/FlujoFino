const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function migrate() {
  await client.connect();
  
  // 1. Get reserved direct
  const resDirect = await client.query(`
    SELECT i."productId", SUM(i.quantity) as reserved
    FROM order_item i
    JOIN "order" o ON o.id = i."orderId"
    WHERE o.status IN ('PENDING', 'PREPARING')
    GROUP BY i."productId"
  `);
  
  // 2. Get reserved combos
  const resCombos = await client.query(`
    SELECT ci."componentId" as "productId", SUM(i.quantity * ci.quantity) as reserved
    FROM order_item i
    JOIN "order" o ON o.id = i."orderId"
    JOIN combo_item ci ON ci."comboId" = i."productId"
    WHERE o.status IN ('PENDING', 'PREPARING')
    GROUP BY ci."componentId"
  `);
  
  const reservedMap = {};
  for (const row of resDirect.rows) {
    reservedMap[row.productId] = (reservedMap[row.productId] || 0) + Number(row.reserved);
  }
  for (const row of resCombos.rows) {
    reservedMap[row.productId] = (reservedMap[row.productId] || 0) + Number(row.reserved);
  }
  
  // 3. Get products
  const products = await client.query(`SELECT id, "stockQuantity" FROM product`);
  
  let count = 0;
  for (const p of products.rows) {
    const reserved = reservedMap[p.id] || 0;
    const physical = Number(p.stockQuantity) + reserved;
    await client.query(`UPDATE product SET "physicalStock" = $1 WHERE id = $2`, [physical, p.id]);
    count++;
  }
  
  console.log('Migrated', count, 'products.');
  await client.end();
}

migrate().catch(console.error);
