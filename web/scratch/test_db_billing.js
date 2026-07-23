import { dbQuery } from "../db/connection.js";

async function runDbTests() {
  console.log("=== Testing DB Billing Queries ===");
  const testShop = "test-store.myshopify.com";

  // 1. Fetch default shop plan details
  const shopRes = await dbQuery("SELECT * FROM shops WHERE shop = $1", [testShop]);
  console.log("Default shop record:", shopRes.rows[0]);

  // 2. Update shop plan to Growth
  await dbQuery(
    "UPDATE shops SET plan_name = $1, subscription_id = $2, subscription_status = $3, trial_ends_at = $4 WHERE shop = $5",
    ["Growth", "sub_12345", "ACTIVE", new Date(Date.now() + 7 * 86400000).toISOString(), testShop]
  );

  const updatedShopRes = await dbQuery("SELECT * FROM shops WHERE shop = $1", [testShop]);
  console.log("Updated shop record:", updatedShopRes.rows[0]);

  // 3. Log subscription event
  await dbQuery(
    "INSERT INTO subscriptions_log (shop, subscription_id, plan_name, price, status) VALUES ($1, $2, $3, $4, $5)",
    [testShop, "sub_12345", "Growth", 29.00, "ACTIVE"]
  );

  const logsRes = await dbQuery("SELECT * FROM subscriptions_log WHERE shop = $1", [testShop]);
  console.log("Subscription logs:", logsRes.rows);

  console.log("=== DB Billing Tests Completed Successfully! ===");
}

runDbTests().catch(err => console.error("DB Test Error:", err));
