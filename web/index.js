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

import rulesRouter, { syncRulesToShopify, syncDeliveryRulesToShopify, syncPaymentRulesToShopify } from "./routes/rules.js";
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

app.get("/api/config/status", async (_req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const validationData = await client.request(`
      query getCheckoutValidations {
        validations(first: 10) {
          nodes {
            id
            title
            enabled
          }
        }
      }
    `);

    const validations = validationData?.data?.validations?.nodes || [];
    // Shopify returns validations specifically for the current app
    const isActive = validations.some(node => node.enabled);

    res.status(200).send({ active: isActive });
  } catch (e) {
    console.error(`Failed to get validation status: ${e.message}`);
    res.status(500).send({ active: false, error: e.message });
  }
});

app.get("/api/onboarding/status", async (_req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const result = await dbQuery("SELECT onboarded FROM shops WHERE shop = $1", [shop]);
    const onboarded = result.rows && result.rows.length > 0 ? !!result.rows[0].onboarded : false;
    res.status(200).send({ onboarded });
  } catch (e) {
    console.error(`Failed to check onboarding status: ${e.message}`);
    res.status(500).send({ onboarded: false, error: e.message });
  }
});

app.post("/api/onboarding/complete", async (_req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    await dbQuery("UPDATE shops SET onboarded = $1, updated_at = CURRENT_TIMESTAMP WHERE shop = $2", [true, shop]);
    res.status(200).send({ success: true });
  } catch (e) {
    console.error(`Failed to complete onboarding: ${e.message}`);
    res.status(500).send({ success: false, error: e.message });
  }
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
            await syncDeliveryRulesToShopify(session);
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

// Programmatically register webhooks for all active shops on startup
const registerWebhooksForActiveShops = async () => {
  try {
    // Helper to map CHECKOUTS_CREATE -> checkouts/create, CUSTOMERS_DATA_REQUEST -> customers/data_request, etc.
    const mapHandlersToTopics = (handlers) => {
      const mapped = {};
      for (const [key, value] of Object.entries(handlers)) {
        const topic = key.toLowerCase().replace("_", "/");
        mapped[topic] = value;
      }
      return mapped;
    };

    // Add handlers to registry to make sure shopify.api knows about them
    await shopify.api.webhooks.addHandlers(
      mapHandlersToTopics({
        ...PrivacyWebhookHandlers,
        ...CheckoutWebhookHandlers,
      })
    );

    const activeShops = await dbQuery("SELECT shop FROM shops WHERE uninstalled = FALSE");
    console.log(`[Webhook Registration] Found ${activeShops.rows?.length || 0} active shops to register webhooks.`);

    for (const row of (activeShops.rows || [])) {
      const shop = row.shop;
      try {
        const sessionId = shopify.api.session.getOfflineId(shop);
        const session = await shopify.config.sessionStorage.loadSession(sessionId);
        if (session) {
          console.log(`[Webhook Registration] Registering webhooks for shop: ${shop}`);
          const result = await shopify.api.webhooks.register({ session });
          console.log(`[Webhook Registration] Result for ${shop}:`, JSON.stringify(result));
        } else {
          console.warn(`[Webhook Registration] No session found for ${shop}`);
        }
      } catch (shopErr) {
        console.error(`[Webhook Registration] Failed for shop ${shop}:`, shopErr.message);
      }
    }
  } catch (err) {
    console.error("[Webhook Registration] Error in registration loop:", err.message);
  }
};

// Auto active rule sync when server restart/start
const syncAllActiveShopsOnStartup = async () => {
  try {
    const activeShops = await dbQuery("SELECT shop FROM shops WHERE uninstalled = FALSE");
    console.log(`[Startup Sync] Found ${activeShops.rows?.length || 0} active shops. Triggering rule synchronization...`);

    for (const row of (activeShops.rows || [])) {
      const shop = row.shop;
      try {
        const sessionId = shopify.api.session.getOfflineId(shop);
        const session = await shopify.config.sessionStorage.loadSession(sessionId);
        if (session) {
          console.log(`[Startup Sync] Syncing rules to Shopify for shop: ${shop}`);
          await syncRulesToShopify(session);
          await syncDeliveryRulesToShopify(session);
          await syncPaymentRulesToShopify(session);
        } else {
          console.warn(`[Startup Sync] No offline session found for ${shop}`);
        }
      } catch (shopErr) {
        console.error(`[Startup Sync] Failed for shop ${shop}:`, shopErr.message);
      }
    }
  } catch (err) {
    console.error("[Startup Sync] Error in startup sync loop:", err.message);
  }
};

app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
  
  // Auto active rule sync when server restart
  syncAllActiveShopsOnStartup();

  // In development, shopify app dev handles webhook registration automatically.
  // Only register programmatically in production to avoid 403 errors from stale dev tokens.
  if (process.env.NODE_ENV === "production") {
    registerWebhooksForActiveShops();
  } else {
    console.log("[Webhook Registration] Skipped in development mode (handled by Shopify CLI).");
  }
});
