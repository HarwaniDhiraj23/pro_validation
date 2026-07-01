import sqlite3 from "sqlite3";
import path from "path";

const dbPath = path.resolve("web/database.sqlite");
console.log("Opening SQLite DB at:", dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, async (err) => {
  if (err) {
    console.error("Failed to open SQLite database:", err);
    return;
  }

  db.all("SELECT * FROM shopify_sessions WHERE shop = ?", ["pixelcart-52.myshopify.com"], async (queryErr, rows) => {
    if (queryErr) {
      console.error("Error querying SQLite:", queryErr);
      return;
    }

    if (rows.length === 0) {
      console.error("No sessions found in SQLite for pixelcart-52.myshopify.com");
      return;
    }

    const session = rows[0];
    const shop = session.shop;
    const accessToken = session.accessToken || session.accesstoken;
    console.log("Found session in SQLite, accessToken length:", accessToken?.length);

    const findQuery = `
      query {
        validations(first: 10) {
          nodes {
            id
            title
            metafields(first: 5) {
              nodes {
                id
                namespace
                key
                value
              }
            }
          }
        }
        shopifyFunctions(first: 20) {
          nodes {
            id
            title
            apiType
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: findQuery })
      });

      const result = await response.json();
      console.log("SHOPIFY RAW RESULT:");
      console.log(JSON.stringify(result, null, 2));
    } catch (fetchErr) {
      console.error("Failed to fetch from Shopify:", fetchErr);
    }
  });
});
