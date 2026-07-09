import express from "express";
import { dbQuery } from "../db/connection.js";
import shopify from "../shopify.js";

const router = express.Router();

// Helper to sync active validation rules to Shopify
async function syncRulesToShopify(session) {
  const shop = session.shop;
  console.log(`Syncing validation rules for ${shop} to Shopify...`);

  try {
    // 1. Fetch active validation rules
    const result = await dbQuery(
      `SELECT * FROM rules 
       WHERE (shop = $1 OR target_shop = $1) 
         AND status = 'active'
         AND rule_type = 'validation'
         AND (schedule_start IS NULL OR schedule_start <= CURRENT_TIMESTAMP)
         AND (schedule_end IS NULL OR schedule_end >= CURRENT_TIMESTAMP)
       ORDER BY priority DESC, id DESC`,
      [shop]
    );
    const activeRules = result.rows || [];

    // Automatically sanitize old or invalid target paths to valid leaf paths
    const sanitizedRules = activeRules.map(rule => {
      let target = rule.error_target;
      if (target === "$.cart.deliveryGroups[0].deliveryAddress") {
        target = "$.cart.deliveryGroups[0].deliveryAddress.address1";
      }
      if (target === "$.cart.lines[0]") {
        target = "$.cart.lines[0].quantity";
      }
      return {
        ...rule,
        error_target: target
      };
    });

    const rulesJson = JSON.stringify(sanitizedRules);

    // 2. Client for GraphQL Admin API
    const client = new shopify.api.clients.Graphql({ session });

    // 3. Find if there's an existing validation customization
    const findQuery = `
      query {
        validations(first: 10) {
          nodes {
            id
            title
          }
        }
      }
    `;
    const findRes = await client.request(findQuery);
    const validations = findRes.data?.validations?.nodes || [];

    let validationId = null;
    const targetValidation = validations.find(v => v.title === "Cart & Checkout Validation");

    if (targetValidation) {
      validationId = targetValidation.id;
    } else if (validations.length > 0) {
      validationId = validations[0].id;
    }

    // 4. If no validation customization exists, create one
    if (!validationId) {
      const appQuery = `
        query {
          shopifyFunctions(first: 20) {
            nodes {
              id
              title
              apiType
            }
          }
        }
      `;
      const appRes = await client.request(appQuery);
      const functions = appRes.data?.shopifyFunctions?.nodes || [];
      const func = functions.find(f => f.apiType === "cart_checkout_validation" || f.title.toLowerCase().includes("validation"));

      if (func) {
        const createMutation = `
          mutation validationCreate($input: ValidationCreateInput!) {
            validationCreate(validation: $input) {
              validation {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
        const createRes = await client.request(createMutation, {
          variables: {
            input: {
              title: "Cart & Checkout Validation",
              functionId: func.id,
              enable: true
            }
          }
        });
        validationId = createRes.data?.validationCreate?.validation?.id;
      }
    }

    if (!validationId) {
      console.warn("Could not locate or create a Validation customization. Skipping Shopify metafield sync.");
      return;
    }

    // 5. Update metafield on the validation customization
    const metafieldMutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const setRes = await client.request(metafieldMutation, {
      variables: {
        metafields: [
          {
            ownerId: validationId,
            namespace: "cart-validation",
            key: "rules",
            value: rulesJson,
            type: "json"
          }
        ]
      }
    });

    const errors = setRes.data?.metafieldsSet?.userErrors || [];
    if (errors.length > 0) {
      console.error("Shopify metafield set errors:", errors);
    } else {
      console.log("Successfully synced validation rules to Shopify metafield.");
    }
  } catch (error) {
    console.error("Failed to sync rules to Shopify metafields (likely mock/offline session):", error.message);
  }
}

// Helper to sync active delivery customization rules to Shopify
async function syncDeliveryRulesToShopify(session) {
  const shop = session.shop;
  console.log(`Syncing delivery customization rules for ${shop} to Shopify...`);

  try {
    // 1. Fetch active delivery rules
    const result = await dbQuery(
      `SELECT * FROM rules 
       WHERE (shop = $1 OR target_shop = $1) 
         AND status = 'active'
         AND rule_type = 'delivery'
         AND (schedule_start IS NULL OR schedule_start <= CURRENT_TIMESTAMP)
         AND (schedule_end IS NULL OR schedule_end >= CURRENT_TIMESTAMP)
       ORDER BY priority DESC, id DESC`,
      [shop]
    );
    const activeRules = result.rows || [];
    const rulesJson = JSON.stringify(activeRules);

    // 2. Client for GraphQL Admin API
    const client = new shopify.api.clients.Graphql({ session });

    // 3. Find if there's an existing delivery customization
    const findQuery = `
      query {
        deliveryCustomizations(first: 10) {
          nodes {
            id
            title
            enabled
          }
        }
      }
    `;
    const findRes = await client.request(findQuery);
    const customizations = findRes.data?.deliveryCustomizations?.nodes || [];

    let customizationId = null;
    const targetCustomization = customizations.find(v => v.title === "Delivery Customization");

    if (targetCustomization) {
      customizationId = targetCustomization.id;
    } else if (customizations.length > 0) {
      customizationId = customizations[0].id;
    }

    // 4. If no delivery customization exists, create one
    if (!customizationId) {
      const appQuery = `
        query {
          shopifyFunctions(first: 20) {
            nodes {
              id
              title
              apiType
            }
          }
        }
      `;
      const appRes = await client.request(appQuery);
      const functions = appRes.data?.shopifyFunctions?.nodes || [];
      const func = functions.find(f => f.apiType === "delivery_customization" || f.title.toLowerCase().includes("delivery"));

      if (func) {
        const createMutation = `
          mutation deliveryCustomizationCreate($input: DeliveryCustomizationInput!) {
            deliveryCustomizationCreate(deliveryCustomization: $input) {
              deliveryCustomization {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
        const createRes = await client.request(createMutation, {
          variables: {
            input: {
              title: "Delivery Customization",
              functionId: func.id,
              enabled: true
            }
          }
        });
        customizationId = createRes.data?.deliveryCustomizationCreate?.deliveryCustomization?.id;
      }
    }

    if (!customizationId) {
      console.warn("Could not locate or create a Delivery customization. Skipping Shopify metafield sync.");
      return;
    }

    // 5. Update metafield on the delivery customization
    const metafieldMutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const setRes = await client.request(metafieldMutation, {
      variables: {
        metafields: [
          {
            ownerId: customizationId,
            namespace: "cart-validation",
            key: "delivery-rules",
            value: rulesJson,
            type: "json"
          }
        ]
      }
    });

    const errors = setRes.data?.metafieldsSet?.userErrors || [];
    if (errors.length > 0) {
      console.error("Shopify delivery metafield set errors:", errors);
    } else {
      console.log("Successfully synced delivery rules to Shopify metafield.");
    }
  } catch (error) {
    console.error("Failed to sync delivery rules to Shopify metafields (likely mock/offline session):", error.message);
  }
}

// Helper to sync active payment customization rules to Shopify
async function syncPaymentRulesToShopify(session) {
  const shop = session.shop;
  console.log(`Syncing payment customization rules for ${shop} to Shopify...`);

  try {
    // 1. Fetch active payment rules
    const result = await dbQuery(
      `SELECT * FROM rules 
       WHERE (shop = $1 OR target_shop = $1) 
         AND status = 'active'
         AND rule_type = 'payment'
         AND (schedule_start IS NULL OR schedule_start <= CURRENT_TIMESTAMP)
         AND (schedule_end IS NULL OR schedule_end >= CURRENT_TIMESTAMP)
       ORDER BY priority DESC, id DESC`,
      [shop]
    );
    const activeRules = result.rows || [];
    const rulesJson = JSON.stringify(activeRules);

    // 2. Client for GraphQL Admin API
    const client = new shopify.api.clients.Graphql({ session });

    // 3. Find if there's an existing payment customization
    const findQuery = `
      query {
        paymentCustomizations(first: 10) {
          nodes {
            id
            title
            enabled
          }
        }
      }
    `;
    const findRes = await client.request(findQuery);
    const customizations = findRes.data?.paymentCustomizations?.nodes || [];
    console.log("[Payment Sync] Existing customizations found:", JSON.stringify(customizations));

    let customizationId = null;
    let isEnabled = false;
    const targetCustomization = customizations.find(v => v.title === "Payment Customization");

    if (targetCustomization) {
      customizationId = targetCustomization.id;
      isEnabled = targetCustomization.enabled;
      console.log(`[Payment Sync] Found target customization: id=${customizationId}, enabled=${isEnabled}`);
    } else if (customizations.length > 0) {
      customizationId = customizations[0].id;
      isEnabled = customizations[0].enabled;
      console.log(`[Payment Sync] Using first customization: id=${customizationId}, enabled=${isEnabled}`);
    }

    // 4. If no payment customization exists, create one
    if (!customizationId) {
      const appQuery = `
        query {
          shopifyFunctions(first: 20) {
            nodes {
              id
              title
              apiType
            }
          }
        }
      `;
      const appRes = await client.request(appQuery);
      const functions = appRes.data?.shopifyFunctions?.nodes || [];
      console.log("[Payment Sync] Available Shopify functions:", JSON.stringify(functions));
      const func = functions.find(f => f.apiType === "payment_customization" || f.title.toLowerCase().includes("payment"));

      if (func) {
        console.log(`[Payment Sync] Creating new payment customization with functionId=${func.id}`);
        const createMutation = `
          mutation paymentCustomizationCreate($input: PaymentCustomizationInput!) {
            paymentCustomizationCreate(paymentCustomization: $input) {
              paymentCustomization {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
        const createRes = await client.request(createMutation, {
          variables: {
            input: {
              title: "Payment Customization",
              functionId: func.id,
              enabled: true
            }
          }
        });
        const createErrors = createRes.data?.paymentCustomizationCreate?.userErrors || [];
        if (createErrors.length > 0) {
          console.error("[Payment Sync] Create errors:", JSON.stringify(createErrors));
        }
        customizationId = createRes.data?.paymentCustomizationCreate?.paymentCustomization?.id;
        isEnabled = true; // We just created it with enabled: true
        console.log(`[Payment Sync] Created new customization: id=${customizationId}`);
      }
    }

    if (!customizationId) {
      console.warn("[Payment Sync] Could not locate or create a Payment customization. Skipping Shopify metafield sync.");
      return;
    }

    // 4b. Ensure the customization is ENABLED
    if (!isEnabled) {
      console.log(`[Payment Sync] Customization is DISABLED. Enabling it now...`);
      const enableMutation = `
        mutation paymentCustomizationUpdate($id: ID!, $input: PaymentCustomizationInput!) {
          paymentCustomizationUpdate(id: $id, paymentCustomization: $input) {
            paymentCustomization {
              id
              enabled
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      const enableRes = await client.request(enableMutation, {
        variables: {
          id: customizationId,
          input: {
            enabled: true
          }
        }
      });
      const enableErrors = enableRes.data?.paymentCustomizationUpdate?.userErrors || [];
      if (enableErrors.length > 0) {
        console.error("[Payment Sync] Enable errors:", JSON.stringify(enableErrors));
      } else {
        const nowEnabled = enableRes.data?.paymentCustomizationUpdate?.paymentCustomization?.enabled;
        console.log(`[Payment Sync] Customization enabled state now: ${nowEnabled}`);
      }
    } else {
      console.log(`[Payment Sync] Customization is already enabled.`);
    }

    // 5. Update metafield on the payment customization
    const metafieldMutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const setRes = await client.request(metafieldMutation, {
      variables: {
        metafields: [
          {
            ownerId: customizationId,
            namespace: "cart-validation",
            key: "payment-rules",
            value: rulesJson,
            type: "json"
          }
        ]
      }
    });

    const errors = setRes.data?.metafieldsSet?.userErrors || [];
    if (errors.length > 0) {
      console.error("Shopify payment metafield set errors:", errors);
    } else {
      console.log("Successfully synced payment rules to Shopify metafield.");
    }
  } catch (error) {
    console.error("Failed to sync payment rules to Shopify metafields (likely mock/offline session):", error.message);
  }
}


// Helper to sync multiple shops affected by a rule change
async function syncRulesForAffectedShops(creatorShop, targetShopBefore, targetShopAfter) {
  const shopsToSync = new Set();

  if (creatorShop) shopsToSync.add(creatorShop);
  if (targetShopBefore) shopsToSync.add(targetShopBefore);
  if (targetShopAfter) shopsToSync.add(targetShopAfter);

  // If target_shop is null/empty for either, it was/is a global rule. Sync all active stores.
  if (targetShopBefore === null || targetShopBefore === "" || targetShopAfter === null || targetShopAfter === "") {
    try {
      const activeShopsResult = await dbQuery("SELECT shop FROM shops WHERE uninstalled = FALSE");
      for (const row of activeShopsResult.rows) {
        shopsToSync.add(row.shop);
      }
    } catch (err) {
      console.error("[Sync propagation] Failed to fetch active shops:", err);
    }
  }

  console.log(`[Sync propagation] Triggering rule sync for shops:`, Array.from(shopsToSync));

  for (const shop of shopsToSync) {
    try {
      const sessionId = shopify.api.session.getOfflineId(shop);
      const session = await shopify.config.sessionStorage.loadSession(sessionId);
      if (session) {
        await syncRulesToShopify(session);
        await syncDeliveryRulesToShopify(session);
        await syncPaymentRulesToShopify(session);
      } else {
        console.warn(`[Sync propagation] No offline session found for shop: ${shop}`);
      }
    } catch (err) {
      console.error(`[Sync propagation] Error syncing shop ${shop}:`, err);
    }
  }
}

// Debug sync status
router.get("/debug-sync", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
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
      }
    `;
    const findRes = await client.request(findQuery);
    res.json(findRes.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rules/installed-shops -> Fetch all installed active shops
router.get("/installed-shops", async (req, res) => {
  try {
    const result = await dbQuery(
      "SELECT shop FROM shops WHERE uninstalled = FALSE ORDER BY shop ASC"
    );
    res.json(result.rows.map(r => r.shop));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to sync collection GIDs to product metafields for any restricted collection rules
async function syncProductCollectionMetafields(session, conditions) {
  const client = new shopify.api.clients.Graphql({ session });

  // 1. Extract restricted collection GIDs
  const collectionIds = new Set();
  for (const cond of conditions) {
    if (cond.type === "restricted_collections" && cond.value) {
      cond.value.split(",").forEach(id => {
        const trimmed = id.trim();
        if (trimmed.startsWith("gid://shopify/Collection/")) {
          collectionIds.add(trimmed);
        }
      });
    }
  }

  if (collectionIds.size === 0) return;

  console.log(`[Collection Sync] Syncing product collection metafields for collections:`, Array.from(collectionIds));

  // 2. Fetch products in these collections and write their metafields
  for (const collectionId of collectionIds) {
    try {
      let hasNextPage = true;
      let cursor = null;

      while (hasNextPage) {
        const productsQuery = `
          query getCollectionProducts($id: ID!, $cursor: String) {
            collection(id: $id) {
              products(first: 50, after: $cursor) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  collections(first: 50) {
                    nodes {
                      id
                    }
                  }
                }
              }
            }
          }
        `;

        const res = await client.request(productsQuery, {
          variables: { id: collectionId, cursor }
        });

        const products = res.data?.collection?.products?.nodes || [];
        const pageInfo = res.data?.collection?.products?.pageInfo || {};
        hasNextPage = pageInfo.hasNextPage;
        cursor = pageInfo.endCursor;

        if (products.length === 0) break;

        const metafields = products.map(product => {
          const belongsTo = product.collections?.nodes?.map(c => c.id) || [];
          return {
            ownerId: product.id,
            namespace: "cart-validation",
            key: "metadata",
            value: JSON.stringify({ collections: belongsTo }),
            type: "json"
          };
        });

        // Write metafields in batch
        const mutation = `
          mutation setProductMetafields($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              userErrors {
                field
                message
              }
            }
          }
        `;

        const setRes = await client.request(mutation, {
          variables: { metafields }
        });

        const errors = setRes.data?.metafieldsSet?.userErrors || [];
        if (errors.length > 0) {
          console.error("[Collection Sync] userErrors setting product metafields:", errors);
        }
      }
    } catch (err) {
      console.error(`[Collection Sync] Error syncing collection ${collectionId}:`, err.message);
    }
  }
}

// GET /api/rules/customer-tags -> Fetch unique customer tags
router.get("/customer-tags", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
    const query = `
      query {
        customers(first: 250) {
          edges {
            node {
              tags
            }
          }
        }
      }
    `;
    const checkRes = await client.request(query);
    const edges = checkRes.data?.customers?.edges || [];
    const allTags = new Set();
    for (const edge of edges) {
      const tags = edge.node?.tags || [];
      for (const tag of tags) {
        allTags.add(tag);
      }
    }
    res.json(Array.from(allTags));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1. GET /api/rules -> Get all rules
router.get("/", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const ruleType = req.query.rule_type || "all";

    // Auto-deactivate expired rules
    if (ruleType === "all") {
      await dbQuery(
        "UPDATE rules SET status = 'inactive' WHERE shop = $1 AND status = 'active' AND schedule_end IS NOT NULL AND schedule_end < CURRENT_TIMESTAMP",
        [shop]
      );
      await syncRulesToShopify(res.locals.shopify.session);
      await syncDeliveryRulesToShopify(res.locals.shopify.session);
      await syncPaymentRulesToShopify(res.locals.shopify.session);
    } else {
      await dbQuery(
        "UPDATE rules SET status = 'inactive' WHERE shop = $1 AND rule_type = $2 AND status = 'active' AND schedule_end IS NOT NULL AND schedule_end < CURRENT_TIMESTAMP",
        [shop, ruleType]
      );
      if (ruleType === "delivery") {
        await syncDeliveryRulesToShopify(res.locals.shopify.session);
      } else if (ruleType === "payment") {
        await syncPaymentRulesToShopify(res.locals.shopify.session);
      } else {
        await syncRulesToShopify(res.locals.shopify.session);
      }
    }

    let result;
    if (ruleType === "all") {
      result = await dbQuery(
        "SELECT * FROM rules WHERE (shop = $1 OR target_shop = $1) AND status != 'deleted' ORDER BY priority DESC, id DESC",
        [shop]
      );
    } else {
      result = await dbQuery(
        "SELECT * FROM rules WHERE (shop = $1 OR target_shop = $1) AND rule_type = $2 AND status != 'deleted' ORDER BY priority DESC, id DESC",
        [shop, ruleType]
      );
    }

    const rules = result.rows || [];
    const rulesWithVersion = await Promise.all(rules.map(async (rule) => {
      const verRes = await dbQuery(
        "SELECT COALESCE(MAX(version), 1) as max_version FROM rule_versions WHERE rule_id = $1",
        [rule.id]
      );
      const version = verRes.rows[0]?.max_version || verRes.rows[0]?.max || 1;
      return { ...rule, version };
    }));

    res.json(rulesWithVersion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rules/shipping-methods
router.get("/shipping-methods", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
    const response = await client.query({
      data: {
        query: `
          query GetShippingMethods {
            deliveryProfiles(first: 20) {
              nodes {
                profileLocationGroups {
                  locationGroupZones(first: 20) {
                    nodes {
                      methodDefinitions(first: 50) {
                        nodes {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      },
    });

    const body = response.body;
    const profiles = body?.data?.deliveryProfiles?.nodes || [];
    const namesSet = new Set();

    // Add default options standard/express/local pickup to safeguard fallback
    namesSet.add("Standard");
    namesSet.add("Express");
    namesSet.add("Local Pickup");
    namesSet.add("Free Shipping");

    for (const profile of profiles) {
      const groups = profile.profileLocationGroups || [];
      for (const group of groups) {
        const zones = group.locationGroupZones?.nodes || [];
        for (const zone of zones) {
          const methods = zone.methodDefinitions?.nodes || [];
          for (const method of methods) {
            if (method.name) {
              namesSet.add(method.name);
            }
          }
        }
      }
    }

    res.json(Array.from(namesSet));
  } catch (error) {
    console.error("Error fetching shipping methods:", error);
    // Return defaults as fallback on error
    res.json(["Standard", "Express", "Local Pickup", "Free Shipping"]);
  }
});

// 2. GET /api/rules/:id -> Get single rule
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const shop = res.locals.shopify.session.shop;
    const result = await dbQuery(
      "SELECT * FROM rules WHERE id = $1 AND (shop = $2 OR target_shop = $2) AND status != 'deleted'",
      [id, shop]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Rule not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/rules -> Create rule
router.post("/", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const { target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, rule_type = "validation", delivery_action = null } = req.body;

    // Insert rule
    const ruleRes = await dbQuery(
      `INSERT INTO rules (shop, target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, rule_type, delivery_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [shop, target_shop || null, title, status || "active", priority || 0, conditions_operator || "AND", JSON.stringify(conditions), error_message, error_target || "$.cart", schedule_start || null, schedule_end || null, rule_type, delivery_action]
    );
    const newRule = ruleRes.rows[0];

    // Create version 1
    await dbQuery(
      `INSERT INTO rule_versions (rule_id, version, target_shop, title, priority, conditions_operator, conditions, error_message, error_target, rule_type, delivery_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [newRule.id, 1, newRule.target_shop || null, newRule.title, newRule.priority, newRule.conditions_operator, JSON.stringify(newRule.conditions), newRule.error_message, newRule.error_target, rule_type, delivery_action]
    );

    // Sync product collections metafields if needed
    await syncProductCollectionMetafields(res.locals.shopify.session, conditions);

    // Sync to all affected Shopify stores
    await syncRulesForAffectedShops(shop, null, newRule.target_shop);

    res.status(201).json(newRule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. PUT /api/rules/:id -> Update rule (generates new version)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const shop = res.locals.shopify.session.shop;
    const { target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, rule_type = "validation", delivery_action = null } = req.body;

    // Check if exists
    const checkRes = await dbQuery("SELECT * FROM rules WHERE id = $1 AND shop = $2", [id, shop]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Rule not found" });
    }
    const oldRule = checkRes.rows[0];

    // Block activation if schedule_end is in the past
    if (status === "active" && schedule_end && new Date(schedule_end) < new Date()) {
      return res.status(400).json({ error: "Cannot activate a rule with an expired end date." });
    }

    // Get max version to increment
    const versionRes = await dbQuery("SELECT COALESCE(MAX(version), 0) as max FROM rule_versions WHERE rule_id = $1", [id]);
    const nextVersion = (versionRes.rows[0]?.max || 0) + 1;

    // Update rule
    const ruleRes = await dbQuery(
      `UPDATE rules 
       SET target_shop = $1, title = $2, status = $3, priority = $4, conditions_operator = $5, conditions = $6, error_message = $7, error_target = $8, schedule_start = $9, schedule_end = $10, rule_type = $11, delivery_action = $12, updated_at = CURRENT_TIMESTAMP
       WHERE id = $13 AND shop = $14 RETURNING *`,
      [target_shop || null, title, status, priority || 0, conditions_operator || "AND", JSON.stringify(conditions), error_message, error_target, schedule_start || null, schedule_end || null, rule_type, delivery_action, id, shop]
    );
    const updatedRule = ruleRes.rows[0];

    // Insert version history
    await dbQuery(
      `INSERT INTO rule_versions (rule_id, version, target_shop, title, priority, conditions_operator, conditions, error_message, error_target, rule_type, delivery_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, nextVersion, target_shop || null, title, priority || 0, conditions_operator || "AND", JSON.stringify(conditions), error_message, error_target, rule_type, delivery_action]
    );

    // Sync product collections metafields if needed
    await syncProductCollectionMetafields(res.locals.shopify.session, conditions);

    // Sync to all affected Shopify stores
    await syncRulesForAffectedShops(shop, oldRule.target_shop, updatedRule.target_shop);

    res.json(updatedRule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. DELETE /api/rules/:id -> Delete rule (Soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const shop = res.locals.shopify.session.shop;

    // Find the rule first to know its target_shop
    const findRes = await dbQuery("SELECT target_shop FROM rules WHERE id = $1 AND shop = $2", [id, shop]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ error: "Rule not found" });
    }
    const targetShop = findRes.rows[0].target_shop;

    // Deactivate/Soft-delete in database
    await dbQuery(
      "UPDATE rules SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND shop = $2",
      [id, shop]
    );

    // Sync to all affected Shopify stores so they are immediately deactivated
    await syncRulesForAffectedShops(shop, targetShop, null);

    res.json({ success: true, message: "Rule soft-deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/rules/bulk-toggle -> Bulk toggle status
router.post("/bulk-toggle", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const { ids, status } = req.body; // ids: array of IDs, status: 'active'/'inactive'

    if (status === "active") {
      const expiredRes = await dbQuery(
        "SELECT id, title FROM rules WHERE id = ANY($1) AND shop = $2 AND schedule_end IS NOT NULL AND schedule_end < CURRENT_TIMESTAMP AND status != 'deleted'",
        [ids, shop]
      );
      if (expiredRes.rows.length > 0) {
        const titles = expiredRes.rows.map(r => `"${r.title}"`).join(", ");
        return res.status(400).json({ error: `Cannot activate expired rules: ${titles}` });
      }
    }

    // Get list of targets before updating
    const rulesToUpdate = await dbQuery("SELECT DISTINCT target_shop FROM rules WHERE id = ANY($1) AND shop = $2 AND status != 'deleted'", [ids, shop]);

    await dbQuery(
      "UPDATE rules SET status = $1 WHERE id = ANY($2) AND shop = $3 AND status != 'deleted'",
      [status, ids, shop]
    );

    // Sync all affected stores
    for (const row of rulesToUpdate.rows) {
      await syncRulesForAffectedShops(shop, row.target_shop, null);
    }

    res.json({ success: true, message: `Bulk updated ${ids.length} rules to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/rules/bulk-delete -> Bulk delete (Soft delete)
router.post("/bulk-delete", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const { ids } = req.body;

    // Get list of targets before deleting
    const rulesToDelete = await dbQuery("SELECT DISTINCT target_shop FROM rules WHERE id = ANY($1) AND shop = $2", [ids, shop]);

    await dbQuery(
      "UPDATE rules SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1) AND shop = $2",
      [ids, shop]
    );

    // Sync all affected stores so the rules are deactivated immediately
    for (const row of rulesToDelete.rows) {
      await syncRulesForAffectedShops(shop, row.target_shop, null);
    }

    res.json({ success: true, message: `Bulk soft-deleted ${ids.length} rules` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET /api/rules/:id/versions -> Get version history
router.get("/:id/versions", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbQuery(
      "SELECT * FROM rule_versions WHERE rule_id = $1 ORDER BY version DESC",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. POST /api/rules/:id/rollback -> Rollback to version
router.post("/:id/rollback", async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body;
    const shop = res.locals.shopify.session.shop;

    // Get specific version
    const versionRes = await dbQuery(
      "SELECT * FROM rule_versions WHERE rule_id = $1 AND version = $2",
      [id, version]
    );
    if (versionRes.rows.length === 0) {
      return res.status(404).json({ error: "Version not found" });
    }
    const ver = versionRes.rows[0];

    // Update main rule
    const ruleRes = await dbQuery(
      `UPDATE rules 
       SET title = $1, priority = $2, conditions_operator = $3, conditions = $4, error_message = $5, error_target = $6, rule_type = $7, delivery_action = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND shop = $10 RETURNING *`,
      [ver.title, ver.priority, ver.conditions_operator, JSON.stringify(ver.conditions), ver.error_message, ver.error_target, ver.rule_type || 'validation', ver.delivery_action || null, id, shop]
    );

    // Insert new version history step
    const maxVerRes = await dbQuery("SELECT COALESCE(MAX(version), 0) as max FROM rule_versions WHERE rule_id = $1", [id]);
    const nextVersion = (maxVerRes.rows[0]?.max || 0) + 1;

    await dbQuery(
      `INSERT INTO rule_versions (rule_id, version, title, priority, conditions_operator, conditions, error_message, error_target, rule_type, delivery_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, nextVersion, ver.title, ver.priority, ver.conditions_operator, JSON.stringify(ver.conditions), ver.error_message, ver.error_target, ver.rule_type || 'validation', ver.delivery_action || null]
    );

    // Sync to Shopify
    await syncRulesToShopify(res.locals.shopify.session);
    await syncDeliveryRulesToShopify(res.locals.shopify.session);
    await syncPaymentRulesToShopify(res.locals.shopify.session);

    res.json(ruleRes.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Manually trigger payment sync and return status
router.post("/debug/sync-payment", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    console.log("[DEBUG] Manually triggering payment sync for shop:", session.shop);
    await syncPaymentRulesToShopify(session);
    res.json({ success: true, message: "Payment sync triggered. Check server logs for details." });
  } catch (error) {
    console.error("[DEBUG] Payment sync failed:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
export { syncRulesToShopify, syncDeliveryRulesToShopify, syncPaymentRulesToShopify };
