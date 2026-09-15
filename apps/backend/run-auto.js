const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function runAutoAllocate() {
  await client.connect();
  
  // 1. Get active orders
  const ordersRes = await client.query(`SELECT id, status FROM "order" WHERE status IN ('PENDING', 'PREPARING') ORDER BY "createdAt" ASC`);
  const orders = ordersRes.rows;
  
  // 2. Get physical stock
  const pRes = await client.query(`SELECT id, "physicalStock" FROM product`);
  const physicalStockMap = new Map();
  for (const p of pRes.rows) {
    physicalStockMap.set(p.id, Number(p.physicalStock));
  }
  
  // Also get combo components
  const cRes = await client.query(`SELECT "comboId", "componentId", quantity FROM combo_item`);
  const comboMap = new Map();
  for (const c of cRes.rows) {
    if (!comboMap.has(c.comboId)) comboMap.set(c.comboId, []);
    comboMap.get(c.comboId).push(c);
  }
  
  let changes = 0;
  
  for (const order of orders) {
    const itemsRes = await client.query(`SELECT "productId", quantity FROM order_item WHERE "orderId" = $1`, [order.id]);
    const items = itemsRes.rows;
    
    let canFulfill = true;
    const deductions = new Map();
    
    for (const item of items) {
      const combos = comboMap.get(item.productId);
      if (combos && combos.length > 0) {
        for (const ci of combos) {
          const currentPhysical = physicalStockMap.get(ci.componentId) || 0;
          const required = item.quantity * ci.quantity;
          if (currentPhysical < required) {
            canFulfill = false; break;
          }
          deductions.set(ci.componentId, (deductions.get(ci.componentId) || 0) + required);
        }
      } else {
        const currentPhysical = physicalStockMap.get(item.productId) || 0;
        if (currentPhysical < item.quantity) {
          canFulfill = false;
        } else {
          deductions.set(item.productId, (deductions.get(item.productId) || 0) + item.quantity);
        }
      }
      if (!canFulfill) break;
    }
    
    if (canFulfill) {
      for (const [pId, amount] of deductions.entries()) {
        physicalStockMap.set(pId, (physicalStockMap.get(pId) || 0) - amount);
      }
      if (order.status !== 'PENDING') {
        await client.query(`UPDATE "order" SET status = 'PENDING' WHERE id = $1`, [order.id]);
        changes++;
      }
    } else {
      if (order.status !== 'PREPARING') {
        await client.query(`UPDATE "order" SET status = 'PREPARING' WHERE id = $1`, [order.id]);
        changes++;
      }
    }
  }
  
  console.log('Processed', orders.length, 'orders. Changes made:', changes);
  await client.end();
}

runAutoAllocate().catch(console.error);
