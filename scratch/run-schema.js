import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: false
});

const schemaPath = path.resolve("web/db/schema.sql");
console.log("Reading schema from:", schemaPath);
const sql = fs.readFileSync(schemaPath, "utf8");

try {
  const client = await pool.connect();
  console.log("Connected to database. Executing schema.sql...");
  await client.query(sql);
  console.log("schema.sql executed successfully!");
  
  // Also run the migration query just in case
  await client.query(`
    ALTER TABLE rules ADD COLUMN IF NOT EXISTS target_shop VARCHAR(255) DEFAULT NULL;
    ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS target_shop VARCHAR(255) DEFAULT NULL;
    UPDATE rules SET error_target = '$.cart.deliveryGroups[0].deliveryAddress.address1' WHERE error_target = '$.cart.deliveryGroups[0].deliveryAddress';
    UPDATE rules SET error_target = '$.cart.lines[0].quantity' WHERE error_target = '$.cart.lines[0]';
  `);
  console.log("Migration columns verified.");
  
  client.release();
} catch (err) {
  console.error("Error executing query:", err);
} finally {
  await pool.end();
}
