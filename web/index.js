// @ts-check
import dotenv from "dotenv";
import { join, resolve } from "path";

// Load .env from project root (parent of web/)
dotenv.config({ path: resolve(process.cwd(), "../.env") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import CheckoutWebhookHandlers from "./routes/webhookHandlers.js";

import rulesRouter, { syncRulesToShopify } from "./routes/rules.js";
import templatesRouter from "./routes/templates.js";
import analyticsRouter from "./routes/analytics.js";
import recommendationsRouter from "./routes/recommendations.js";
import { dbQuery } from "./db/connection.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    try {
      const session = res.locals.shopify.session;
      const shop = session.shop;
      console.log(`[Installation] Recording installation for shop: ${shop}`);

      await dbQuery(
        `INSERT INTO shops (shop, uninstalled, installed_at, uninstalled_at)
         VALUES ($1, FALSE, CURRENT_TIMESTAMP, NULL)
         ON CONFLICT (shop) 
         DO UPDATE SET uninstalled = FALSE, installed_at = CURRENT_TIMESTAMP, uninstalled_at = NULL, updated_at = CURRENT_TIMESTAMP`,
        [shop]
      );
    } catch (err) {
      console.error("[Installation] Error writing shop to database:", err.message);
    }
    next();
  },
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: { ...PrivacyWebhookHandlers, ...CheckoutWebhookHandlers } })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

// Ensure shop is registered in the database on every authenticated request.
// If shop exists → update updated_at. If not → insert new entry.
app.use("/api/*", async (req, res, next) => {
  try {
    const session = res.locals.shopify?.session;
    const shop = session?.shop;
    if (shop) {
      await dbQuery(
        `INSERT INTO shops (shop, uninstalled, installed_at, uninstalled_at)
         VALUES ($1, FALSE, CURRENT_TIMESTAMP, NULL)
         ON CONFLICT (shop) 
         DO UPDATE SET uninstalled = FALSE, updated_at = CURRENT_TIMESTAMP`,
        [shop]
      );
    }
  } catch (err) {
    console.error("[Shop Tracking] Error ensuring shop registration:", err.message);
  }
  next();
});

app.use(express.json());

app.use("/api/rules", rulesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/recommendations", recommendationsRouter);

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", async (req, res, next) => {
  // Return a clean 404 for asset fallbacks (e.g. favicon, css, js) rather than triggering authentication
  if (req.path.includes(".") || req.path.startsWith("/assets/")) {
    return res.status(404).send("Not Found");
  }

  const shop = req.query.shop;
  if (!shop) {
    // If shop is missing, return a clean bad request instead of throwing a library exception
    return res.status(400).send("Missing shop query parameter.");
  }

  next();
}, shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

// Background worker to deactivate expired rules and sync them to Shopify
const startScheduledWorker = () => {
  setInterval(async () => {
    try {
      // Find all shops that have expired active rules
      const expiredRules = await dbQuery(
        "SELECT DISTINCT shop FROM rules WHERE status = 'active' AND schedule_end IS NOT NULL AND schedule_end < CURRENT_TIMESTAMP"
      );
      
      for (const row of expiredRules.rows) {
        const shop = row.shop;
        console.log(`[Scheduled Worker] Auto-deactivating expired rules for shop: ${shop}`);
        
        // Deactivate expired rules in DB
        await dbQuery(
          "UPDATE rules SET status = 'inactive' WHERE shop = $1 AND status = 'active' AND schedule_end IS NOT NULL AND schedule_end < CURRENT_TIMESTAMP",
          [shop]
        );
        
        // Load the shop session to sync with Shopify
        try {
          const sessionId = shopify.api.session.getOfflineId(shop);
          const session = await shopify.config.sessionStorage.loadSession(sessionId);
          if (session) {
            await syncRulesToShopify(session);
            console.log(`[Scheduled Worker] Successfully synchronized rules for ${shop}`);
          } else {
            console.warn(`[Scheduled Worker] Could not load offline session for ${shop}`);
          }
        } catch (syncErr) {
          console.error(`[Scheduled Worker] Error syncing shop ${shop}:`, syncErr);
        }
      }
    } catch (err) {
      console.error("[Scheduled Worker] Error in check loop:", err);
    }
  }, 60 * 1000); // Check every 60 seconds (1 minute)
};

startScheduledWorker();

app.listen(PORT);
