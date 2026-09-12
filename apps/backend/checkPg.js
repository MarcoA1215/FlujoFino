const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: "postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
});

client.connect().then(async () => {
  console.log("Connected to Supabase!");
  try {
    const res = await client.query("SELECT * FROM users WHERE username = 'admin'");
    if (res.rows.length === 0) {
      console.log("Admin not found. Creating...");
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(`INSERT INTO users (username, "passwordHash", role) VALUES ('admin', '${hash}', 'ADMIN')`);
      console.log("Admin created.");
    } else {
      console.log("Admin exists:", res.rows[0]);
    }
  } catch(e) {
    console.error("Query error:", e.message);
  }
  client.end();
}).catch(e => {
  console.error("Connection error:", e);
});
