import dotenv from "dotenv";
import pg from "pg";
import fs from "fs";
import path from "path";

// Load .env from project root (parent of web/)
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
// Also try current directory in case CWD is already root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
let useFallback = false;

const __dirnameRoot = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const FALLBACK_DB_PATH = path.join(__dirnameRoot, "fallback_db.json");

// Helper to initialize fallback JSON DB if not exists
function initFallbackDB() {
  if (!fs.existsSync(FALLBACK_DB_PATH)) {
    const initialData = {
      rules: [],
      rule_versions: [],
      rule_analytics: [],
      rule_templates: [
        {
          id: 1,
          title: "Block PO Box Addresses",
          category: "Address",
          description: "Prevents customers from shipping to Post Office Boxes.",
          conditions: [{ type: "shipping_address_pobox", operator: "is_pobox", value: "" }],
          error_message: "We cannot ship to PO Box addresses. Please provide a physical shipping address.",
          error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
        },
        {
          id: 2,
          title: "B2B Only Checkout",
          category: "B2B",
          description: "Restricts checkout to recognized business accounts (purchasing companies) only.",
          conditions: [{ type: "b2b_only", operator: "is_not_b2b", value: "" }],
          error_message: "Checkout is restricted to B2B customers only.",
          error_target: "$.cart"
        },
        {
          id: 3,
          title: "Login Required to Checkout",
          category: "Customer",
          description: "Ensures that customers are logged in before proceeding to checkout.",
          conditions: [{ type: "login_required", operator: "is_guest", value: "" }],
          error_message: "Please log in to your account to complete checkout.",
          error_target: "$.cart"
        },
        {
          id: 4,
          title: "Restricted States",
          category: "Address",
          description: "Blocks checkout for specific states/provinces (e.g., AK, HI).",
          conditions: [{ type: "block_states", operator: "in_states", value: "AK,HI" }],
          error_message: "We currently do not ship to Alaska or Hawaii.",
          error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
        },
        {
          id: 5,
          title: "Block Specific Countries",
          category: "Address",
          description: "Blocks checkout for specific country codes.",
          conditions: [{ type: "block_countries", operator: "in_countries", value: "KP,IR,SY" }],
          error_message: "We do not ship to the selected country.",
          error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
        },
        {
          id: 6,
          title: "Hazardous Items Shipping Restriction",
          category: "Product",
          description: "Blocks hazardous items from being shipped to restricted states/regions.",
          conditions: [
            { type: "has_hazardous_item", operator: "equals", value: "true" },
            { type: "block_states", operator: "in_states", value: "AK,HI,PR" }
          ],
          error_message: "Hazardous items cannot be shipped to Alaska, Hawaii, or Puerto Rico.",
          error_target: "$.cart"
        },
        {
          id: 7,
          title: "Minimum Order Value limit",
          category: "Cart Value",
          description: "Forces a minimum subtotal value before completing checkout.",
          conditions: [{ type: "minimum_order_value", operator: "less_than", value: "50.00" }],
          error_message: "The minimum order value to checkout is $50.00.",
          error_target: "$.cart"
        },
        {
          id: 8,
          title: "Maximum Order Value limit",
          category: "Cart Value",
          description: "Limits the maximum subtotal value allowed for safety/fraud reasons.",
          conditions: [{ type: "maximum_order_value", operator: "greater_than", value: "1000.00" }],
          error_message: "Orders exceeding $1,000.00 must be placed by phone or email.",
          error_target: "$.cart"
        },
        {
          id: 9,
          title: "Limit Customer Age (18+)",
          category: "Customer",
          description: "Ensures that checkout is blocked if the customer is under 18.",
          conditions: [{ type: "customer_age", operator: "under_age", value: "18" }],
          error_message: "You must be 18 years or older to purchase these items.",
          error_target: "$.cart"
        },
        {
          id: 10,
          title: "Restrict Subscription Items",
          category: "Product",
          description: "Limits subscription purchases to authenticated customers with a specific tag (e.g., VIP).",
          conditions: [
            { type: "has_subscription", operator: "equals", value: "true" },
            { type: "customer_tags", operator: "not_contains", value: "vip" }
          ],
          error_message: "Subscriptions are exclusive to VIP members.",
          error_target: "$.cart"
        },
        {
          id: 11,
          title: "Customer Tags Validation",
          category: "Customer",
          description: "Ensures customer has VIP or Wholesale tags to purchase.",
          conditions: [{ type: "customer_tags", operator: "contains", value: "vip,wholesale" }],
          error_message: "This checkout is reserved for Wholesale or VIP customers only.",
          error_target: "$.cart"
        },
        {
          id: 12,
          title: "Guest Checkout Restriction",
          category: "Customer",
          description: "Disables guest checkout entirely.",
          conditions: [{ type: "guest_checkout_restriction", operator: "is_guest", value: "" }],
          error_message: "Guest checkout is disabled. Please create an account to purchase.",
          error_target: "$.cart"
        },
        {
          id: 13,
          title: "Block Specific ZIP Codes",
          category: "Address",
          description: "Blocks checkout for selected ZIP/Postal codes.",
          conditions: [{ type: "block_zipcodes", operator: "in_zips", value: "90210,10001" }],
          error_message: "We do not offer shipping to your ZIP code.",
          error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
        },
        {
          id: 14,
          title: "Regex Address Format Validation",
          category: "Address",
          description: "Enforces correct formatting using regex to block invalid entries.",
          conditions: [{ type: "address_regex", operator: "matches_regex", value: "^[a-zA-Z0-9\\s,.-]+$" }],
          error_message: "Please avoid special characters in your shipping address.",
          error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
        },
        {
          id: 15,
          title: "Restricted Collections Validation",
          category: "Product",
          description: "Blocks purchase of products in restricted collections.",
          conditions: [{ type: "restricted_collections", operator: "in_collections", value: "restricted_id" }],
          error_message: "Items in your cart belong to a restricted collection and cannot be shipped.",
          error_target: "$.cart"
        },
        {
          id: 16,
          title: "Restricted Vendors Validation",
          category: "Product",
          description: "Blocks checkout for products from specific vendors.",
          conditions: [{ type: "restricted_vendors", operator: "in_vendors", value: "restricted_vendor" }],
          error_message: "We cannot fulfill orders for products from this vendor.",
          error_target: "$.cart"
        },
        {
          id: 17,
          title: "Incompatible Product Combinations",
          category: "Product",
          description: "Prevents conflicting products from being bought together.",
          conditions: [{ type: "product_combinations", operator: "cannot_combine", value: "prod_id_A,prod_id_B" }],
          error_message: "Incompatible items found in your cart. These products cannot be shipped together.",
          error_target: "$.cart"
        },
        {
          id: 18,
          title: "Cart Item Quantity Limit",
          category: "Cart Value",
          description: "Restricts the maximum total item count allowed in a single order.",
          conditions: [{ type: "quantity_limit", operator: "greater_than", value: "10" }],
          error_message: "Maximum quantity of 10 items exceeded per order.",
          error_target: "$.cart"
        },
        {
          id: 19,
          title: "Weight Limit Restriction",
          category: "Cart Value",
          description: "Restricts total cart weight to prevent freight shipping errors.",
          conditions: [{ type: "weight_limit", operator: "greater_than", value: "50" }],
          error_message: "Order weight exceeds 50kg. Please contact us for a custom shipping quote.",
          error_target: "$.cart"
        },
        {
          id: 20,
          title: "SKU Quantity Limit Check",
          category: "Cart Value",
          description: "Restricts the number of unique SKUs allowed in the cart.",
          conditions: [{ type: "sku_limit", operator: "greater_than", value: "5" }],
          error_message: "A maximum of 5 unique product SKUs can be purchased per order.",
          error_target: "$.cart"
        }
      ]
    };
    // Generate some simulated analytics data
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      initialData.rule_analytics.push(
        { id: i * 3 + 1, shop: "mock-shop.myshopify.com", rule_id: 1, event_type: "block", cart_value: 45.00, created_at: date.toISOString() },
        { id: i * 3 + 2, shop: "mock-shop.myshopify.com", rule_id: 2, event_type: "block", cart_value: 120.00, created_at: date.toISOString() },
        { id: i * 3 + 3, shop: "mock-shop.myshopify.com", rule_id: null, event_type: "allow", cart_value: 75.00, created_at: date.toISOString() }
      );
    }
    fs.mkdirSync(path.dirname(FALLBACK_DB_PATH), { recursive: true });
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// Read database helper
function readFallbackDB() {
  initFallbackDB();
  return JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, "utf8"));
}

// Write database helper
function writeFallbackDB(data) {
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
}

// Initialize PostgreSQL Pool
if (DATABASE_URL) {
  try {
    const useSsl = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1") ? false : { rejectUnauthorized: false };
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: useSsl
    });
    console.log("PostgreSQL Pool Initialized.");
  } catch (err) {
    console.warn("Failed to initialize PostgreSQL pool, falling back to JSON storage:", err.message);
    useFallback = true;
  }
} else {
  console.log("No DATABASE_URL found. Utilizing Local persistent JSON DB storage.");
  useFallback = true;
}

// Connect test
if (pool && !useFallback) {
  pool.connect((err, client, release) => {
    if (err) {
      console.warn("PostgreSQL connection test failed, using JSON fallback DB instead:", err.message);
      useFallback = true;
    } else {
      console.log("Successfully connected to PostgreSQL Database.");
      try {
        const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
        const schemaPath = path.join(__dirname, "schema.sql");
        console.log("Looking for schema.sql at:", schemaPath);
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, "utf8");
          client.query(sql, (sqlErr) => {
            if (sqlErr) {
              console.error("Failed to run schema.sql on database initialization:", sqlErr.message);
            } else {
              console.log("PostgreSQL database tables verified/created successfully.");
              client.query(
                `UPDATE rules SET error_target = '$.cart.deliveryGroups[0].deliveryAddress.address1' WHERE error_target = '$.cart.deliveryGroups[0].deliveryAddress';
                 UPDATE rules SET error_target = '$.cart.lines[0].quantity' WHERE error_target = '$.cart.lines[0]';`,
                (migErr) => {
                  if (migErr) {
                    console.error("Migration error updating old targets:", migErr.message);
                  } else {
                    console.log("Existing rule targets migrated successfully.");
                  }
                  release();
                }
              );
            }
          });
        } else {
          release();
        }
      } catch (schemaErr) {
        console.error("Error reading schema.sql:", schemaErr.message);
        release();
      }
    }
  });
}

// Core Query Execution Function
export async function dbQuery(text, params = []) {
  if (!useFallback && pool) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (err) {
      console.error("Database query error, reverting to fallback DB:", err.message);
      useFallback = true;
    }
  }

  // Fallback DB Implementation
  const db = readFallbackDB();
  const lowerText = text.trim().toLowerCase();

  if (lowerText.startsWith("select * from rule_templates")) {
    return { rows: db.rule_templates };
  }

  if (lowerText.startsWith("select * from rules")) {
    const shop = params[0];
    let filteredRules = db.rules.filter(r => r.shop === shop && r.status !== 'deleted');
    // Order by priority desc, id desc
    filteredRules.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.id - a.id;
    });
    return { rows: filteredRules };
  }

  if (lowerText.startsWith("select * from rules where id = $1")) {
    const id = parseInt(params[0]);
    const shop = params[1];
    const rule = db.rules.find(r => r.id === id && r.shop === shop && r.status !== 'deleted');
    return { rows: rule ? [rule] : [] };
  }

  if (lowerText.startsWith("insert into rules")) {
    const [shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end] = params;
    const newRule = {
      id: db.rules.length > 0 ? Math.max(...db.rules.map(r => r.id)) + 1 : 1,
      shop,
      title,
      status: status || "active",
      priority: parseInt(priority) || 0,
      conditions_operator: conditions_operator || "AND",
      conditions: typeof conditions === "string" ? JSON.parse(conditions) : conditions,
      error_message,
      error_target: error_target || "$.cart",
      schedule_start,
      schedule_end,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.rules.push(newRule);
    writeFallbackDB(db);
    return { rows: [newRule] };
  }

  if (lowerText.startsWith("update rules set title = $1")) {
    const [title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, id, shop] = params;
    const ruleIdx = db.rules.findIndex(r => r.id === parseInt(id) && r.shop === shop);
    if (ruleIdx !== -1) {
      const updated = {
        ...db.rules[ruleIdx],
        title,
        status,
        priority: parseInt(priority) || 0,
        conditions_operator,
        conditions: typeof conditions === "string" ? JSON.parse(conditions) : conditions,
        error_message,
        error_target,
        schedule_start,
        schedule_end,
        updated_at: new Date().toISOString()
      };
      db.rules[ruleIdx] = updated;
      writeFallbackDB(db);
      return { rows: [updated] };
    }
    return { rows: [] };
  }

  if (lowerText.startsWith("update rules set status = 'deleted'")) {
    const id = parseInt(params[0]);
    const shop = params[1];
    const ruleIdx = db.rules.findIndex(r => r.id === id && r.shop === shop);
    if (ruleIdx !== -1) {
      db.rules[ruleIdx].status = 'deleted';
      db.rules[ruleIdx].updated_at = new Date().toISOString();
      const updated = db.rules[ruleIdx];
      writeFallbackDB(db);
      return { rows: [updated] };
    }
    return { rows: [] };
  }

  if (lowerText.startsWith("delete from rules where id = $1")) {
    const id = parseInt(params[0]);
    const shop = params[1];
    const index = db.rules.findIndex(r => r.id === id && r.shop === shop);
    if (index !== -1) {
      const deleted = db.rules.splice(index, 1)[0];
      writeFallbackDB(db);
      return { rows: [deleted] };
    }
    return { rows: [] };
  }

  if (lowerText.includes("update rules set status = $1 where id = any($2)")) {
    const [status, ids, shop] = params;
    const parsedIds = Array.isArray(ids) ? ids.map(Number) : [];
    let updatedCount = 0;
    db.rules = db.rules.map(r => {
      if (parsedIds.includes(r.id) && r.shop === shop && r.status !== 'deleted') {
        updatedCount++;
        return { ...r, status, updated_at: new Date().toISOString() };
      }
      return r;
    });
    writeFallbackDB(db);
    return { rowCount: updatedCount };
  }

  if (lowerText.includes("delete from rules where id = any($1)")) {
    const [ids, shop] = params;
    const parsedIds = Array.isArray(ids) ? ids.map(Number) : [];
    const beforeCount = db.rules.length;
    db.rules = db.rules.filter(r => !(parsedIds.includes(r.id) && r.shop === shop));
    writeFallbackDB(db);
    return { rowCount: beforeCount - db.rules.length };
  }

  if (lowerText.startsWith("insert into rule_versions")) {
    const [rule_id, version, title, priority, conditions_operator, conditions, error_message, error_target] = params;
    const newVersion = {
      id: db.rule_versions.length > 0 ? Math.max(...db.rule_versions.map(v => v.id)) + 1 : 1,
      rule_id: parseInt(rule_id),
      version: parseInt(version),
      title,
      priority: parseInt(priority) || 0,
      conditions_operator,
      conditions: typeof conditions === "string" ? JSON.parse(conditions) : conditions,
      error_message,
      error_target,
      created_at: new Date().toISOString()
    };
    db.rule_versions.push(newVersion);
    writeFallbackDB(db);
    return { rows: [newVersion] };
  }

  if (lowerText.includes("select max(version)")) {
    const rule_id = parseInt(params[0]);
    const versions = db.rule_versions.filter(v => v.rule_id === rule_id);
    const maxVal = versions.length > 0 ? Math.max(...versions.map(v => v.version)) : 0;
    return { rows: [{ max: maxVal }] };
  }

  if (lowerText.startsWith("select * from rule_versions where rule_id = $1")) {
    const rule_id = parseInt(params[0]);
    const versions = db.rule_versions.filter(v => v.rule_id === rule_id);
    versions.sort((a, b) => b.version - a.version);
    return { rows: versions };
  }

  if (lowerText.startsWith("insert into rule_analytics")) {
    const [shop, rule_id, event_type, cart_value, cart_id, created_at] = params;
    const newAnalytics = {
      id: db.rule_analytics.length > 0 ? Math.max(...db.rule_analytics.map(a => a.id)) + 1 : 1,
      shop,
      rule_id: rule_id ? parseInt(rule_id) : null,
      event_type,
      cart_value: parseFloat(cart_value) || 0.00,
      cart_id,
      created_at: created_at || new Date().toISOString()
    };
    db.rule_analytics.push(newAnalytics);
    writeFallbackDB(db);
    return { rows: [newAnalytics] };
  }

  if (lowerText.startsWith("delete from rule_analytics")) {
    const shop = params[0];
    const beforeLen = db.rule_analytics.length;
    db.rule_analytics = db.rule_analytics.filter(a => a.shop !== shop);
    writeFallbackDB(db);
    return { rowCount: beforeLen - db.rule_analytics.length };
  }

  if (lowerText.includes("count(*)") && lowerText.includes("rule_analytics")) {
    const shop = params[0];
    const count = db.rule_analytics.filter(a => a.shop === shop).length;
    return { rows: [{ count }] };
  }

  if (lowerText.includes("select") && lowerText.includes("rule_analytics")) {
    const shop = params[0];
    const shopAnalytics = db.rule_analytics.filter(a => a.shop === shop);
    return { rows: shopAnalytics };
  }

  return { rows: [], rowCount: 0 };
}
