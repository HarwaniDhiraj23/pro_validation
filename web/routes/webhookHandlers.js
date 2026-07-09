import { DeliveryMethod } from "@shopify/shopify-api";
import { dbQuery } from "../db/connection.js";
import { validateCheckoutPayload } from "../utils/webhookValidator.js";

/**
 * Webhook handlers for checkout and order tracking analytics.
 * These webhooks allow us to track checkout attempts and completed orders
 * to calculate blocked checkout statistics for the dashboard.
 */
const WebhookHandlers = {
  CHECKOUTS_CREATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = JSON.parse(body);
        const cartValue = parseFloat(payload.total_line_items_price || payload.total_price || 0);
        const cartId = String(payload.token || payload.id || `checkout_${Date.now()}`);

        console.log(`[Webhook] CHECKOUTS_CREATE for ${shop} - Cart: ${cartId}, Value: $${cartValue}`);

        // If checkout has already been completed and allowed, do not modify analytics
        const existingAllow = await dbQuery(
          "SELECT id FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'allow' LIMIT 1",
          [shop, cartId]
        );
        if (existingAllow.rows && existingAllow.rows.length > 0) {
          console.log(`[Webhook] Checkout ${cartId} is already completed/allowed. Ignoring create.`);
          return;
        }

        // 1. Fetch active rules for this shop
        const rulesRes = await dbQuery(
          "SELECT * FROM rules WHERE shop = $1 AND status = 'active'",
          [shop]
        );
        const activeRules = rulesRes.rows || [];
        console.log(`[Webhook] Active rules fetched: ${activeRules.length}`, activeRules.map(r => ({ id: r.id, title: r.title })));

        // 2. Validate payload against active rules
        const triggeredRule = validateCheckoutPayload(payload, activeRules);
        console.log(`[Webhook] triggeredRule evaluation:`, triggeredRule ? { id: triggeredRule.id, title: triggeredRule.title } : "None matched");

        if (triggeredRule) {
          // If blocked:
          // Remove previous check event if any
          await dbQuery(
            "DELETE FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'check'",
            [shop, cartId]
          );

          // First check if block is already logged
          const existingBlock = await dbQuery(
            "SELECT id FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'block' AND rule_id = $3 LIMIT 1",
            [shop, cartId, triggeredRule.id]
          );
          if (existingBlock.rows && existingBlock.rows.length > 0) {
            return;
          }

          console.log(`[Webhook] Block detected by rule "${triggeredRule.title}" (ID: ${triggeredRule.id}) for ${shop}`);
          await dbQuery(
            `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [shop, triggeredRule.id, 'block', cartValue, cartId]
          );
        } else {
          // If not blocked:
          // Remove any previous block event
          await dbQuery(
            "DELETE FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'block'",
            [shop, cartId]
          );

          // First check if any check event is already logged
          const existingCheck = await dbQuery(
            "SELECT id FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'check' LIMIT 1",
            [shop, cartId]
          );
          if (existingCheck.rows && existingCheck.rows.length > 0) {
            return;
          }

          console.log(`[Webhook] Logging check event for ${shop}`);
          await dbQuery(
            `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [shop, null, 'check', cartValue, cartId]
          );
        }
      } catch (err) {
        console.error("[Webhook] CHECKOUTS_CREATE error:", err.stack || err.message);
      }
    },
  },

  CHECKOUTS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = JSON.parse(body);
        const cartValue = parseFloat(payload.total_line_items_price || payload.total_price || 0);
        const cartId = String(payload.token || payload.id || `checkout_${Date.now()}`);

        console.log(`[Webhook] CHECKOUTS_UPDATE for ${shop} - Cart: ${cartId}, Value: $${cartValue}`);
        console.log("[Webhook] CHECKOUTS_UPDATE raw payload:", JSON.stringify(payload));

        // If checkout has already been completed and allowed, do not modify analytics
        const existingAllow = await dbQuery(
          "SELECT id FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'allow' LIMIT 1",
          [shop, cartId]
        );
        if (existingAllow.rows && existingAllow.rows.length > 0) {
          console.log(`[Webhook] Checkout ${cartId} is already completed/allowed. Ignoring update.`);
          return;
        }

        // 1. Fetch active rules for this shop
        const rulesRes = await dbQuery(
          "SELECT * FROM rules WHERE shop = $1 AND status = 'active'",
          [shop]
        );
        const activeRules = rulesRes.rows || [];
        console.log(`[Webhook] CHECKOUTS_UPDATE Active rules fetched: ${activeRules.length}`, activeRules.map(r => ({ id: r.id, title: r.title })));

        // 2. Validate payload against active rules
        const triggeredRule = validateCheckoutPayload(payload, activeRules);
        console.log(`[Webhook] CHECKOUTS_UPDATE triggeredRule evaluation:`, triggeredRule ? { id: triggeredRule.id, title: triggeredRule.title } : "None matched");

        if (triggeredRule) {
          // If blocked:
          // We can delete previous "check" event for this cart to keep analytics clean if it now blocks
          await dbQuery(
            "DELETE FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'check'",
            [shop, cartId]
          );

          // Check if block already logged
          const existingBlock = await dbQuery(
            "SELECT id FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'block' AND rule_id = $3 LIMIT 1",
            [shop, cartId, triggeredRule.id]
          );
          if (existingBlock.rows && existingBlock.rows.length > 0) {
            return;
          }

          console.log(`[Webhook] Block detected by rule "${triggeredRule.title}" (ID: ${triggeredRule.id}) for ${shop}`);
          await dbQuery(
            `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [shop, triggeredRule.id, 'block', cartValue, cartId]
          );
        } else {
          // If not blocked:
          // Remove any previous block event
          await dbQuery(
            "DELETE FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'block'",
            [shop, cartId]
          );

          // For check/allow events, only log if no check is currently in DB for this cartId
          const existingCheck = await dbQuery(
            "SELECT id FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'check' LIMIT 1",
            [shop, cartId]
          );
          if (existingCheck.rows && existingCheck.rows.length > 0) {
            return;
          }

          console.log(`[Webhook] Logging check event for ${shop}`);
          await dbQuery(
            `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [shop, null, 'check', cartValue, cartId]
          );
        }
      } catch (err) {
        console.error("[Webhook] CHECKOUTS_UPDATE error:", err.stack || err.message);
      }
    },
  },

  ORDERS_CREATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const payload = JSON.parse(body);
        const cartValue = parseFloat(payload.total_line_items_price || payload.total_price || 0);
        const cartId = String(payload.checkout_token || payload.cart_token || `order_${payload.id}`);

        console.log(`[Webhook] ORDERS_CREATE for ${shop} - Order: ${payload.id}, Value: $${cartValue}`);

        // Deduplication: Check if we already recorded an allow event for this checkout/order cartId
        const existingOrder = await dbQuery(
          "SELECT id FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type = 'allow' LIMIT 1",
          [shop, cartId]
        );
        if (existingOrder.rows && existingOrder.rows.length > 0) {
          console.log(`[Webhook] Duplicate order event for order/cart ${cartId} ignored.`);
          return;
        }

        // Clean up any check/block events for this cart first!
        await dbQuery(
          "DELETE FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type IN ('check', 'block')",
          [shop, cartId]
        );

        // Log as an "allow" event - order was successfully completed
        await dbQuery(
          `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [shop, null, 'allow', cartValue, cartId]
        );
      } catch (err) {
        console.error("[Webhook] ORDERS_CREATE error:", err.message);
      }
    },
  },

  APP_UNINSTALLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        console.log(`[Webhook] APP_UNINSTALLED for shop: ${shop}`);
        
        await dbQuery(
          `UPDATE shops 
           SET uninstalled = TRUE, uninstalled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
           WHERE shop = $1`,
          [shop]
        );
      } catch (err) {
        console.error("[Webhook] APP_UNINSTALLED error:", err.message);
      }
    },
  },
};

export default WebhookHandlers;
