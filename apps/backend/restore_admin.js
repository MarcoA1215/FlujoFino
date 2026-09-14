const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const connectionString = 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  const res = await client.query('SELECT count(*) FROM users;');
  if (parseInt(res.rows[0].count) === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (id, username, "passwordHash", role, "createdAt")
      VALUES (gen_random_uuid(), 'admin', $1, 'ADMIN', NOW())
    `, [hash]);
    console.log('Restored admin user');
  }
  
  await client.end();
}
run().catch(console.error);
