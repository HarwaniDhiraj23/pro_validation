import { dbQuery } from "../web/db/connection.js";

async function run() {
  const result = await dbQuery("SELECT * FROM rules");
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}
run();
