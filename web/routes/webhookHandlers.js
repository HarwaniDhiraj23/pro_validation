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

        // Deduplication: Check if we already recorded a check or block event for this checkout cartId
        const existingCheck = await dbQuery(
          "SELECT id FROM rule_analytics WHERE shop = $1 AND cart_id = $2 AND event_type IN ('check', 'block') LIMIT 1",
          [shop, cartId]
        );
        if (existingCheck.rows && existingCheck.rows.length > 0) {
          console.log(`[Webhook] Duplicate checkout event for cart ${cartId} ignored.`);
          return;
        }

        // 1. Fetch active rules for this shop
        const rulesRes = await dbQuery(
          "SELECT * FROM rules WHERE shop = $1 AND status = 'active'",
          [shop]
        );
        const activeRules = rulesRes.rows || [];

        // 2. Validate payload against active rules
        const triggeredRule = validateCheckoutPayload(payload, activeRules);

        if (triggeredRule) {
          // If a rule condition is met, log as a "block" event with the specific rule ID
          console.log(`[Webhook] Block detected by rule "${triggeredRule.title}" (ID: ${triggeredRule.id}) for ${shop}`);
          await dbQuery(
            `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
             VALUES ($1, $2, 'block', $3, $4)`,
            [shop, triggeredRule.id, cartValue, cartId]
          );
        } else {
          // Otherwise, log as a normal "check" event (no block triggered)
          await dbQuery(
            `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
             VALUES ($1, NULL, 'check', $2, $3)`,
            [shop, cartValue, cartId]
          );
        }
      } catch (err) {
        console.error("[Webhook] CHECKOUTS_CREATE error:", err.message);
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

        // Log as an "allow" event - order was successfully completed
        await dbQuery(
          `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
           VALUES ($1, NULL, 'allow', $2, $3)`,
          [shop, cartValue, cartId]
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
