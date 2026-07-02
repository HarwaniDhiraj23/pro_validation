import { dbQuery } from "../db/connection.js";
import shopify from "../shopify.js";

async function checkValidations() {
  try {
    // 1. Fetch offline session from session storage
    // We get the shop from the database rules table to know which shop to query
    const shopRes = await dbQuery("SELECT DISTINCT shop FROM rules LIMIT 1");
    if (shopRes.rows.length === 0) {
      console.log("No shops found in database.");
      return;
    }
    const shop = shopRes.rows[0].shop;
    console.log(`Checking validations for shop: ${shop}`);

    const sessionId = shopify.api.session.getOfflineId(shop);
    const session = await shopify.config.sessionStorage.loadSession(sessionId);
    if (!session) {
      console.log(`Could not load offline session for ${shop}`);
      return;
    }

    const client = new shopify.api.clients.Graphql({ session });

    // 2. Query validations
    const query = `
      query {
        validations(first: 10) {
          nodes {
            id
            title
            enabled
            status
            app {
              title
            }
          }
        }
      }
    `;

    const res = await client.request(query);
    console.log("Active validations on store:", JSON.stringify(res.data?.validations?.nodes, null, 2));

  } catch (err) {
    console.error("Error checking validations:", err);
  }
}

checkValidations();
