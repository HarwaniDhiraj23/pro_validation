import { dbQuery } from "../web/db/connection.js";

async function dumpRules() {
  try {
    const result = await dbQuery("SELECT * FROM rules");
    console.log("ALL RULES IN DB:");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error("Error dumping rules:", err);
  }
}

dumpRules();
