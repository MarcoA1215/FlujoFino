const { Client } = require('pg');

async function run() {
  const connectionString = 'postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres';
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  
  // Get all tables in public schema
  const res = await client.query(`
    SELECT tablename 
    FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public';
  `);
  
  const tables = res.rows.map(row => row.tablename);
  console.log('Tables found:', tables);
  
  const keepTables = ['user', 'settings'];
  const tablesToClear = tables.filter(t => !keepTables.includes(t));
  
  if (tablesToClear.length > 0) {
    const truncateQuery = `TRUNCATE TABLE "${tablesToClear.join('", "')}" CASCADE;`;
    console.log('Executing:', truncateQuery);
    await client.query(truncateQuery);
    console.log('Database cleared (excluding user and settings)');
  } else {
    console.log('No tables to clear.');
  }

  await client.end();
}

run().catch(console.error);
