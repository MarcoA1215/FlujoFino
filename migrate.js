const { Client } = require('pg');
require('dotenv').config({ path: 'apps/backend/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  await client.connect();
  
  try {
    // 1. Create a default Tenant (NutriDeli)
    const tRes = await client.query(`
      INSERT INTO tenant (id, name, "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'NutriDeli (Matriz)', true, NOW(), NOW())
      RETURNING id
    `);
    const tenantId = tRes.rows[0].id;
    console.log("Created Default Tenant:", tenantId);

    // 2. Assign this tenant to all existing tables
    const tablesToUpdate = [
      'product', 'order', 'raw_material', 'production_batch', 
      'stock_movement', 'settings', 'delivery_zone'
    ];
    
    for (const table of tablesToUpdate) {
      await client.query(`UPDATE "${table}" SET "tenantId" = $1 WHERE "tenantId" IS NULL`, [tenantId]);
      console.log(`Updated table: ${table}`);
    }

    // 3. Link existing Users to this Tenant via UserTenantAccess
    const uRes = await client.query('SELECT id, role FROM users');
    for (const u of uRes.rows) {
      // Check if access already exists
      const accessCheck = await client.query(`SELECT id FROM user_tenant_access WHERE "userId" = $1 AND "tenantId" = $2`, [u.id, tenantId]);
      if (accessCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO user_tenant_access (id, "userId", "tenantId", role, "isActive")
          VALUES (gen_random_uuid(), $1, $2, $3, true)
        `, [u.id, tenantId, u.role || 'USER']);
        console.log(`Linked user ${u.id} to tenant`);
      }
    }
    
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await client.end();
  }
}

migrateData();
