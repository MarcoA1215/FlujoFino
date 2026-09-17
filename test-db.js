const { Client } = require('pg');
require('dotenv').config({ path: 'apps/backend/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    await client.connect();
    console.log("SUCCESS! Connected to the new database.");
    const res = await client.query("SELECT current_database();");
    console.log("Database:", res.rows[0].current_database);
  } catch (error) {
    console.error("CONNECTION FAILED:", error.message);
  } finally {
    await client.end();
  }
}
testConnection();
