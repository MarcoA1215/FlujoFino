const { DataSource } = require('typeorm');
const bcrypt = require('bcryptjs');

const AppDataSource = new DataSource({
  type: "postgres",
  url: "postgresql://postgres.ecletaquophgdnwjykly:r9m%26%21MVq%24Pt%40%26sd@aws-0-us-west-2.pooler.supabase.com:5432/postgres",
  synchronize: true,
  entities: [__dirname + '/src/**/*.entity.{js,ts}'],
});

AppDataSource.initialize().then(async () => {
    console.log("Database connected");
    const result = await AppDataSource.query(`SELECT * FROM users WHERE username = 'admin'`);
    if (result.length === 0) {
      console.log("Admin not found. Creating...");
      const hash = await bcrypt.hash('admin123', 10);
      await AppDataSource.query(`INSERT INTO users (username, "passwordHash", role, "createdAt", "updatedAt") VALUES ('admin', '${hash}', 'ADMIN', NOW(), NOW())`);
      console.log("Admin created successfully!");
    } else {
      console.log("Admin already exists:", result[0]);
    }
    process.exit(0);
}).catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
