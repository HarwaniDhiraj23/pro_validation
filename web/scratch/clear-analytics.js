import { dbQuery } from "../db/connection.js";

async function clearAnalytics() {
  try {
    const res = await dbQuery("TRUNCATE TABLE rule_analytics RESTART IDENTITY CASCADE");
    console.log("Truncated rule_analytics table successfully.");
  } catch (err) {
    console.error("Failed to truncate rule_analytics table:", err.message);
  }
}

clearAnalytics();
