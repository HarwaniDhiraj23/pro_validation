# Shopify Billing & Pricing Architecture Documentation

This document provides a comprehensive technical guide on how the Billing & Subscription System operates in **Production Mode (Live Merchants)** versus **Development / Test Mode**, including API flow diagrams, database schema, webhook handlers, and plan enforcement logic.

---

## 0. How Merchant Payments Work in Shopify Apps (End-to-End)

In Shopify's app ecosystem, **merchants NEVER enter credit card numbers or payment details directly into your app**. All payment collection and payouts are handled securely by **Shopify's Billing System**.

### Key Rules of Shopify App Billing:
1. **Single Invoice**: All app subscription charges are added directly to the merchant's **monthly Shopify Store Invoice** (the same credit card or payment method the merchant uses to pay for their Shopify store subscription).
2. **Zero PCI Burden**: Your app does not handle, store, or process credit cards. Shopify handles 100% of payment collection, fraud checks, currency conversions, and tax calculations.
3. **Automatic Payouts**: Shopify collects monthly payments from the merchant, deducts Shopify's platform revenue share (0-15%), and automatically deposits your app revenue into your **Shopify Partner Bank Account**.

---

## 1. Overview of Billing Modes

| Environment Mode | `NODE_ENV` | Billing Execution Mechanism | Merchant Experience |
| :--- | :--- | :--- | :--- |
| **Production Mode (Live)** | `production` | Official Shopify Billing API (`appSubscriptionCreate` GraphQL mutation) | Redirected to official Shopify Admin charge approval page. Charge is added to merchant's monthly Shopify invoice after approval. |
| **Development Mode (Dev)** | `development` / local | Test charge request (`isTest: true`) or direct database fallback | Immediate simulated plan upgrade without incurring actual monetary charges on development stores. |

---

## 2. Production Billing Lifecycle (Step-by-Step)

In a **Production environment**, charges are billed directly through Shopify's Billing API. Below is the complete lifecycle when a live merchant upgrades or downgrades their plan.

```
       [ Merchant in App UI ]
                 │
                 │ 1. Clicks "Upgrade to Growth ($29/mo)"
                 ▼
       [ POST /api/billing/subscribe ]
                 │
                 │ 2. Backend calls shopify.api.billing.request({ session, plan: 'Growth', isTest: false })
                 ▼
      [ Shopify GraphQL Admin API ]
                 │
                 │ 3. Executes `appSubscriptionCreate` mutation
                 │    Returns official confirmationUrl: "https://admin.shopify.com/store/xyz/charges/123/confirm..."
                 ▼
       [ Merchant Frontend ]
                 │
                 │ 4. Receives confirmationUrl -> `window.top.location.href = confirmationUrl`
                 ▼
 [ Official Shopify Admin Charge Page ]
                 │
                 ├──────────────────────────────┐
                 │ Merchant Approves Charge      │ Merchant Declines / Cancels
                 ▼                              ▼
      [ GET /api/billing/callback ]    [ Redirected back to App ]
                 │                              │
                 │ 5. Validates charge          └─ Plan remains unchanged
                 │    Updates database `shops`
                 │    Log entry to `subscriptions_log`
                 ▼
       [ Redirect to App Pricing UI ]
```

### Detailed Production Steps:

### Step 1: Merchant Requests Plan Upgrade
- **Trigger**: Merchant clicks "Upgrade to Growth ($29/mo)" in the embedded app frontend (`Pricing.jsx`).
- **HTTP Request**:
  ```http
  POST /api/billing/subscribe
  Content-Type: application/json

  { "plan": "Growth" }
  ```

### Step 2: Backend Calls Shopify Billing API
- **Location**: [web/routes/billing.js](file:///d:/pro-validation/web/routes/billing.js#L110-L130)
- The backend executes `shopify.api.billing.request()` using the active shop session:
  ```javascript
  const confirmationUrl = await shopify.api.billing.request({
    session,
    plan: "Growth",
    isTest: false, // Production charge
    returnUrl: "https://your-app-domain.com/api/billing/callback?plan=Growth&shop=store.myshopify.com"
  });
  ```
- **GraphQL Mutation Executed by Shopify SDK**:
  ```graphql
  mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
    appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
      appSubscription { id }
      confirmationUrl
      userErrors { field message }
    }
  }
  ```

### Step 3: Merchant Redirected to Shopify Admin Confirmation Page
- The backend returns `{ success: true, plan: "Growth", confirmationUrl: "https://admin.shopify.com/store/xyz/charges/12345/confirm" }`.
- The frontend breaks out of the iframe (`window.top.location.href = confirmationUrl`) and navigates the merchant to Shopify's official invoice approval screen.

### Step 4: Merchant Action on Shopify Charge Screen
- **If Approved**: Shopify registers the recurring charge on the store's invoice and redirects the merchant browser to your `returnUrl` (`/api/billing/callback?plan=Growth&charge_id=gid://shopify/AppSubscription/12345`).
- **If Declined / Cancelled**: Merchant stays on Shopify Admin or is redirected back without charge approval. No database state changes occur.

### Step 5: Callback Processing & Database Sync
- **Location**: [web/routes/billing.js](file:///d:/pro-validation/web/routes/billing.js#L149-L204)
- **Backend Verification**:
  ```javascript
  const hasPayment = await shopify.api.billing.check({
    session,
    plans: ["Growth"],
    isTest: false
  });
  ```
- **Database Update**:
  ```sql
  UPDATE shops 
  SET plan_name = 'Growth',
      subscription_id = 'gid://shopify/AppSubscription/12345',
      subscription_status = 'ACTIVE',
      trial_ends_at = NOW() + INTERVAL '7 days',
      updated_at = CURRENT_TIMESTAMP
  WHERE shop = 'store.myshopify.com';
  ```
- **Audit Trail Insert**:
  ```sql
  INSERT INTO subscriptions_log (shop, subscription_id, plan_name, price, status)
  VALUES ('store.myshopify.com', 'gid://shopify/AppSubscription/12345', 'Growth', 29.00, 'ACTIVE');
  ```
- **Return to App**: Merchant is redirected seamlessly back to `https://store.myshopify.com/admin/apps/<api-key>/pricing?billing_status=success&plan=Growth`.

---

## 3. Webhook Real-time Subscription Sync (`APP_SUBSCRIPTIONS_UPDATE`)

To handle out-of-band plan cancellations, payment failures, or merchant upgrades done directly in Shopify Admin settings, the application listens to the `APP_SUBSCRIPTIONS_UPDATE` webhook topic.

### Webhook Event Flow:
1. **Event**: Merchant cancels app subscription from Shopify Admin `Settings -> Apps and sales channels`.
2. **Shopify Webhook**: Sends `POST /api/webhooks` with topic `APP_SUBSCRIPTIONS_UPDATE`.
3. **Handler**: [web/routes/webhookHandlers.js](file:///d:/pro-validation/web/routes/webhookHandlers.js)
   ```javascript
   const status = appSubscription.status; // "EXPIRED", "CANCELLED", "FROZEN", "ACTIVE"
   if (status === "CANCELLED" || status === "EXPIRED") {
     await dbQuery(
       "UPDATE shops SET plan_name = 'Free', subscription_status = $1 WHERE shop = $2",
       [status, shop]
     );
   }
   ```

---

## 4. Development & Test Mode Fallback Flow

In local development (`shopify app dev`) or staging environments:

1. `shopify.api.billing.request()` is called with `isTest: true`.
2. If running on local test stores without full Shopify Partner charge authorization, the error catch handler automatically executes:
   ```javascript
   await dbQuery(
     `INSERT INTO shops (shop, plan_name, subscription_id, subscription_status, trial_ends_at, uninstalled)
      VALUES ($1, $2, $3, 'ACTIVE', $4, FALSE)
      ON CONFLICT (shop) 
      DO UPDATE SET plan_name = $2, subscription_id = $3, subscription_status = 'ACTIVE', trial_ends_at = $4`,
     [shop, targetPlan, `sub_dev_${Date.now()}`, trialEndsAt]
   );
   ```
3. Returns `{ success: true, plan: targetPlan, confirmationUrl: null }`.
4. The embedded app frontend immediately updates the UI without leaving the iframe or losing session tokens.

---

## 5. Pricing Tiers & Plan Limits Matrix

Defined in [web/utils/planLimits.js](file:///d:/pro-validation/web/utils/planLimits.js):

| Feature / Limit | Free ($0/mo) | Basic ($9/mo) | Growth ($29/mo) | Pro ($79/mo) |
| :--- | :--- | :--- | :--- | :--- |
| **Max Active Validation Rules** | 1 Active Rule | 5 Active Rules | 20 Active Rules | Unlimited (999,999) |
| **Cart Validation Rules** | ✓ Included | ✓ Included | ✓ Included | ✓ Included |
| **Delivery Customization Rules** | ✕ Blocked | ✓ Included | ✓ Included | ✓ Included |
| **Payment Customization Rules** | ✕ Blocked | ✕ Blocked | ✓ Included | ✓ Included |
| **Checkout UI Checkbox Rules** | ✕ Blocked | ✕ Blocked | ✓ Included | ✓ Included |
| **Rule Date & Time Scheduling** | ✕ Blocked | ✕ Blocked | ✓ Included | ✓ Included |
| **Version History Retention** | 1 (Current) | 3 Versions | 10 Versions | Unlimited |
| **Analytics Retention** | 7 Days | 30 Days | 90 Days | Unlimited + CSV |

---

## 6. Backend Enforcement Mechanism

When a merchant attempts to **create**, **update**, or **enable** a rule:
- **Location**: [web/routes/rules.js](file:///d:/pro-validation/web/routes/rules.js#L45-L65)
- Middleware calls `validateRulePlanLimits(shop, requestedType, newStatus)`:
  ```javascript
  const currentPlan = shopRecord.plan_name; // e.g. "Free"
  const activeCount = await getActiveRulesCount(shop);

  if (activeCount >= planConfig.maxActiveRules && newStatus === 'active') {
    return res.status(403).json({
      success: false,
      error: `Plan limit reached! The ${currentPlan} plan allows maximum ${planConfig.maxActiveRules} active rule(s). Please upgrade to activate more rules.`
    });
  }
  ```

---

## 7. Database Schema Reference

### `shops` Table:
```sql
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) UNIQUE NOT NULL,
  plan_name VARCHAR(50) DEFAULT 'Free',           -- 'Free', 'Basic', 'Growth', 'Pro'
  subscription_id VARCHAR(255) DEFAULT NULL,    -- Shopify AppSubscription GID
  subscription_status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'CANCELLED', 'EXPIRED'
  trial_ends_at TIMESTAMP DEFAULT NULL,
  billing_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `subscriptions_log` Table (Audit Trail):
```sql
CREATE TABLE IF NOT EXISTS subscriptions_log (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  subscription_id VARCHAR(255),
  plan_name VARCHAR(50) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. API Endpoints Quick Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/billing/plan` | Returns current active plan name, price, active rules usage count, and tier features. |
| `POST` | `/api/billing/subscribe` | Initiates plan subscription via Shopify Billing API or performs dev fallback upgrade. |
| `GET` | `/api/billing/callback` | Callback endpoint triggered after merchant approves charge on Shopify Admin. |
| `POST` | `/api/billing/cancel` | Cancels current paid subscription and reverts store plan to Free. |
| `GET` | `/api/billing/history` | Fetches transaction audit logs from `subscriptions_log`. |

---

## 9. Verification & Testing Checklist

- [x] **Dev Mode Test**: Click "Upgrade to Basic" in dev mode → Database updates `plan_name = 'Basic'`, UI reflects 5 active rules quota.
- [x] **Downgrade Test**: Click "Downgrade to Free" → Database updates `plan_name = 'Free'`, UI reflects 1 active rule quota.
- [x] **Plan Limits Enforcement**: Try activating 2 active rules on Free plan → API returns `HTTP 403 Forbidden` with upgrade prompt.
- [x] **Production Ready**: Set `NODE_ENV=production` → App routes through official Shopify Admin `appSubscriptionCreate` charge confirmation page.
