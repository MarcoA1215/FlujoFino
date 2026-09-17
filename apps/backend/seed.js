const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedAdmin() {
  await client.connect();
  
  const res = await client.query('SELECT * FROM users');
  if (res.rows.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);
    await client.query(`
      INSERT INTO users (id, name, username, password, role, "createdAt", "updatedAt") 
      VALUES (gen_random_uuid(), 'Admin', 'admin', $1, 'ADMIN', NOW(), NOW())
    `, [hash]);
    console.log("Admin user created (admin / 123456)");
  } else {
    console.log("Users already exist, skipping seed.");
  }
  
  const sRes = await client.query('SELECT * FROM settings');
  if (sRes.rows.length === 0) {
    await client.query(`
      INSERT INTO settings (id, "exchangeRate", "createdAt", "updatedAt") 
      VALUES (gen_random_uuid(), 40.00, NOW(), NOW())
    `);
    console.log("Default settings created.");
  }
  
  await client.end();
}
seedAdmin().catch(console.error);
