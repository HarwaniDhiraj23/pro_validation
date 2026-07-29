import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import { restResources } from "@shopify/shopify-api/rest/admin/2025-07";

const DB_PATH = `${process.cwd()}/database.sqlite`;

export const BILLING_PLANS = {
  Basic: {
    amount: 9.0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 7,
  },
  Growth: {
    amount: 29.0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 7,
  },
  Pro: {
    amount: 79.0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 14,
  },
};

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecretKey = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_SECRET_KEY;
const host = process.env.HOST || process.env.SHOPIFY_APP_URL;
const scopes = process.env.SCOPES;

const missingVars = [];
if (!apiKey) missingVars.push("SHOPIFY_API_KEY");
if (!apiSecretKey) missingVars.push("SHOPIFY_API_SECRET (or SHOPIFY_API_SECRET_KEY)");
if (!host) missingVars.push("HOST (or SHOPIFY_APP_URL)");

if (missingVars.length > 0) {
  const errMsg = `[Deployment Config Error] Missing required environment variables on deployment: ${missingVars.join(", ")}. Please configure these environment variables in your deployment platform settings (e.g. Render, Fly.io, Railway, Heroku, Docker).`;
  console.error(`\n========================================\n${errMsg}\n========================================\n`);
  throw new Error(errMsg);
}

const shopify = shopifyApp({
  api: {
    ...(apiKey && { apiKey }),
    ...(apiSecretKey && { apiSecretKey }),
    ...(host && {
      hostScheme: host.split("://")[0],
      hostName: host.replace(/https?:\/\//, ""),
    }),
    ...(scopes && { scopes: scopes.split(",") }),
    apiVersion: "2026-04",
    restResources,
    allowedClockSkew: 3600,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    billing: BILLING_PLANS,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  // This should be replaced with your preferred storage strategy
  sessionStorage: new SQLiteSessionStorage(DB_PATH),
});

export default shopify;
