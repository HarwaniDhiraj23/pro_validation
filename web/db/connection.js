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
const PREBUILT_TEMPLATES = [
  {
    id: 1,
    title: "Block PO Box Addresses",
    category: "Address",
    description: "Prevents shipping to PO Box addresses by checking the address lines for PO Box indicators, ensuring orders are sent to physical locations suitable for standard carrier deliveries.",
    conditions: [{ type: "shipping_address_pobox", operator: "is_pobox", value: "" }],
    error_message: "We cannot ship to PO Box addresses. Please provide a physical shipping address.",
    error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
  },
  {
    id: 2,
    title: "B2B Only Checkout",
    category: "B2B",
    description: "Restricts checkout access to recognized business accounts with an active company profile. Guest accounts and standard consumer checkout profiles will be blocked.",
    conditions: [{ type: "b2b_only", operator: "is_not_b2b", value: "" }],
    error_message: "Checkout is restricted to B2B customers only.",
    error_target: "$.cart"
  },
  {
    id: 3,
    title: "Login Required to Checkout",
    category: "Customer",
    description: "Enforces user authentication before proceeding. Unauthenticated guest checkouts are blocked, prompting customers to log in or register an account.",
    conditions: [{ type: "login_required", operator: "is_guest", value: "" }],
    error_message: "Please log in to your account to complete checkout.",
    error_target: "$.cart"
  },
  {
    id: 4,
    title: "Restricted States",
    category: "Address",
    description: "Blocks checkout for specific state or province codes (e.g. Alaska, Hawaii, or military zones) where shipping is unsupported or incurs excessive carrier rates.",
    conditions: [{ type: "block_states", operator: "in_states", value: "AK,HI" }],
    error_message: "We currently do not ship to Alaska or Hawaii.",
    error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
  },
  {
    id: 5,
    title: "Block Specific Countries",
    category: "Address",
    description: "Restricts checkout access for specific countries or regions to comply with trade sanctions, high-risk fraud zones, or regions outside your shipping carrier networks.",
    conditions: [{ type: "block_countries", operator: "in_countries", value: "KP,IR,SY" }],
    error_message: "We do not ship to the selected country.",
    error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
  },
  {
    id: 6,
    title: "Hazardous Items Shipping Restriction",
    category: "Product",
    description: "Ensures hazardous or safety-restricted products are not shipped to islands, remote territories, or specific state codes where air transport regulations prohibit them.",
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
    description: "Enforces a minimum cart subtotal requirement before allowing checkout, helping cover operational costs and logistics margins for small orders.",
    conditions: [{ type: "minimum_order_value", operator: "less_than", value: "50.00" }],
    error_message: "The minimum order value to checkout is $50.00.",
    error_target: "$.cart"
  },
  {
    id: 8,
    title: "Maximum Order Value limit",
    category: "Cart Value",
    description: "Sets an upper threshold limit on the order subtotal to reduce liability risks, prevent high-value fraud, or redirect bulk trade orders to direct sales representatives.",
    conditions: [{ type: "maximum_order_value", operator: "greater_than", value: "1000.00" }],
    error_message: "Orders exceeding $1,000.00 must be placed by phone or email.",
    error_target: "$.cart"
  },
  {
    id: 9,
    title: "Limit Customer Age (18+)",
    category: "Customer",
    description: "Blocks checkout if the customer's age on file is under 18, ensuring legal compliance for age-restricted products like alcohol, tobacco, or mature content.",
    conditions: [{ type: "customer_age", operator: "under_age", value: "18" }],
    error_message: "You must be 18 years or older to purchase these items.",
    error_target: "$.cart"
  },
  {
    id: 10,
    title: "Restrict Subscription Items",
    category: "Product",
    description: "Restricts subscription products to authorized customers with specific tags (e.g., VIP, wholesale), preventing general public signups for exclusive recurring plans.",
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
    description: "Restricts order placement to customers possessing specific account tags (like VIP, Wholesale, or Member), protecting exclusive catalog collections.",
    conditions: [{ type: "customer_tags", operator: "contains", value: "vip,wholesale" }],
    error_message: "This checkout is reserved for Wholesale or VIP customers only.",
    error_target: "$.cart"
  },
  {
    id: 12,
    title: "Guest Checkout Restriction",
    category: "Customer",
    description: "Blocks checkout access for guest accounts, ensuring all orders are linked to registered customer profiles for loyalty tracking and communication.",
    conditions: [{ type: "guest_checkout_restriction", operator: "is_guest", value: "" }],
    error_message: "Guest checkout is disabled. Please create an account to purchase.",
    error_target: "$.cart"
  },
  {
    id: 13,
    title: "Block Specific ZIP Codes",
    category: "Address",
    description: "Blocks shipping to specific ZIP/postal codes known for delivery failures, remote access surcharges, or where regional distributor exclusivity applies.",
    conditions: [{ type: "block_zipcodes", operator: "in_zips", value: "90210,10001" }],
    error_message: "We do not offer shipping to your ZIP code.",
    error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
  },
  {
    id: 14,
    title: "Regex Address Format Validation",
    category: "Address",
    description: "Validates the shipping address format against a regular expression pattern to prevent special characters, typos, or gibberish entries that cause shipment failures.",
    conditions: [{ type: "address_regex", operator: "matches_regex", value: "^[a-zA-Z0-9\\s,.-]+$" }],
    error_message: "Please avoid special characters in your shipping address.",
    error_target: "$.cart.deliveryGroups[0].deliveryAddress.address1"
  },
  {
    id: 15,
    title: "Restricted Collections Validation",
    category: "Product",
    description: "Checks if cart items belong to restricted collection GIDs, blocking checkout for restricted product categories during shipping blackout periods or regional lockouts.",
    conditions: [{ type: "restricted_collections", operator: "in_collections", value: "restricted_id" }],
    error_message: "Items in your cart belong to a restricted collection and cannot be shipped.",
    error_target: "$.cart"
  },
  {
    id: 16,
    title: "Restricted Vendors Validation",
    category: "Product",
    description: "Blocks purchase of items supplied by specific brand vendors, useful for enforcing distribution agreements, regional supply constraints, or seasonal inventory halts.",
    conditions: [{ type: "restricted_vendors", operator: "in_vendors", value: "restricted_vendor" }],
    error_message: "We cannot fulfill orders for products from this vendor.",
    error_target: "$.cart"
  },
  {
    id: 17,
    title: "Incompatible Product Combinations",
    category: "Product",
    description: "Prevents incompatible items from being purchased in the same order (e.g., pre-order products mixed with in-stock items, or conflicting fragile/heavy items).",
    conditions: [{ type: "product_combinations", operator: "cannot_combine", value: "prod_id_A,prod_id_B" }],
    error_message: "Incompatible items found in your cart. These products cannot be shipped together.",
    error_target: "$.cart"
  },
  {
    id: 18,
    title: "Cart Item Quantity Limit",
    category: "Cart Value",
    description: "Limits the maximum number of items (total item count) allowed in the cart to prevent bulk buying, retail arbitrage, or carrier parcel weight limit issues.",
    conditions: [{ type: "quantity_limit", operator: "greater_than", value: "10" }],
    error_message: "Maximum quantity of 10 items exceeded per order.",
    error_target: "$.cart"
  },
  {
    id: 19,
    title: "Weight Limit Restriction",
    category: "Cart Value",
    description: "Enforces a maximum threshold on the total cart weight, ensuring order shipments do not exceed standard parcel carrier limits or trigger unexpected freight shipping.",
    conditions: [{ type: "weight_limit", operator: "greater_than", value: "50" }],
    error_message: "Order weight exceeds 50kg. Please contact us for a custom shipping quote.",
    error_target: "$.cart"
  },
  {
    id: 20,
    title: "SKU Quantity Limit Check",
    category: "Cart Value",
    description: "Restricts the number of unique SKUs (different products/variants) permitted in the cart to control inventory runs, limit order complexity, or manage pack times.",
    conditions: [{ type: "sku_limit", operator: "greater_than", value: "5" }],
    error_message: "A maximum of 5 unique product SKUs can be purchased per order.",
    error_target: "$.cart"
  },
  {
    id: 21,
    title: "Block PO Box from Express Shipping",
    category: "Shipping",
    description: "Hides Express Shipping method at checkout if the shipping address contains a PO Box.",
    conditions: [{ type: "shipping_address_pobox", operator: "is_pobox", value: "" }],
    error_message: "",
    error_target: "Express Shipping",
    rule_type: "delivery",
    delivery_action: "hide"
  },
  {
    id: 22,
    title: "Hide Express Shipping for Remote States",
    category: "Shipping",
    description: "Hides Express Shipping options for customers in remote states like Alaska (AK) and Hawaii (HI).",
    conditions: [{ type: "block_states", operator: "in_states", value: "AK,HI" }],
    error_message: "",
    error_target: "Express Shipping",
    rule_type: "delivery",
    delivery_action: "hide"
  },
  {
    id: 23,
    title: "Hide Free Shipping Under Minimum Purchase",
    category: "Shipping",
    description: "Ensures Free Shipping is hidden if the cart subtotal is less than $75.",
    conditions: [{ type: "minimum_order_value", operator: "less_than", value: "75.00" }],
    error_message: "",
    error_target: "Free Shipping",
    rule_type: "delivery",
    delivery_action: "hide"
  },
  {
    id: 24,
    title: "Hide Local Pickup for Non-Local ZIP Codes",
    category: "Local Pickup",
    description: "Hides the Local Pickup option if the customer's shipping address ZIP/postal code is not within specified local ZIPs (e.g. 90210).",
    conditions: [{ type: "block_zipcodes", operator: "not_in_zips", value: "90210,90211" }],
    error_message: "",
    error_target: "Local Pickup",
    rule_type: "delivery",
    delivery_action: "hide"
  },
  {
    id: 25,
    title: "Disable COD for Remote States",
    category: "Payment",
    description: "Disables Cash on Delivery (COD) payment option for remote states (e.g. Alaska, Hawaii) to avoid shipping collect risks.",
    conditions: [{ type: "block_states", operator: "in_states", value: "AK,HI" }],
    error_message: "",
    error_target: "Cash on Delivery (COD)",
    rule_type: "payment",
    delivery_action: "hide"
  },
  {
    id: 26,
    title: "Disable PayPal for Low Cart Value",
    category: "Payment",
    description: "Disables PayPal payment option if the order total is below $20 to encourage credit card usage on small transactions.",
    conditions: [{ type: "minimum_order_value", operator: "less_than", value: "20.00" }],
    error_message: "",
    error_target: "PayPal",
    rule_type: "payment",
    delivery_action: "hide"
  },
  {
    id: 27,
    title: "Disable COD for High Cart Value",
    category: "Payment",
    description: "Disables Cash on Delivery (COD) payment option for orders exceeding $500 to minimize cash collection risks on delivery.",
    conditions: [{ type: "maximum_order_value", operator: "greater_than", value: "500.00" }],
    error_message: "",
    error_target: "Cash on Delivery (COD)",
    rule_type: "payment",
    delivery_action: "hide"
  },
  {
    id: 28,
    title: "Rename PayPal for VIP Customers",
    category: "Payment",
    description: "Renames PayPal payment option to 'PayPal (Express VIP Checkout)' for customers tagged with 'vip'.",
    conditions: [{ type: "customer_tags", operator: "contains", value: "vip" }],
    error_message: "PayPal (Express VIP Checkout)",
    error_target: "PayPal",
    rule_type: "payment",
    delivery_action: "rename"
  },
  {
    id: 29,
    title: "Weekend Delivery Surcharge Note",
    category: "Shipping",
    description: "Renames 'Standard Shipping' to 'Standard Shipping (Includes Weekend Delivery Surcharge)' during checkout validation.",
    conditions: [{ type: "day_of_week", operator: "in_days", value: "Sat,Sun" }],
    error_message: "Standard Shipping (Includes Weekend Delivery Surcharge)",
    error_target: "Standard Shipping",
    rule_type: "delivery",
    delivery_action: "rename"
  },
  {
    id: 30,
    title: "Block Orders with High Weight in Express Shipping",
    category: "Shipping",
    description: "Hides Express Shipping options if the total cart weight exceeds 20kg.",
    conditions: [{ type: "weight_limit", operator: "greater_than", value: "20" }],
    error_message: "",
    error_target: "Express Shipping",
    rule_type: "delivery",
    delivery_action: "hide"
  },
  {
    id: 31,
    title: "Require Terms & Conditions Acceptance",
    category: "Checkbox",
    description: "Requires customers to check an explicit box confirming they agree to the store's Terms of Service and Privacy Policy before checking out.",
    conditions: [],
    error_message: "You must accept the Terms of Service to complete your order.",
    error_target: "purchase.checkout.block.render",
    guidance_message: "I agree to the Terms of Service and Privacy Policy.",
    rule_type: "checkbox"
  },
  {
    id: 32,
    title: "Age 18+ Legal Declaration",
    category: "Checkbox",
    description: "Adds a mandatory checkbox for customers to confirm they are at least 18 years of age for age-restricted items.",
    conditions: [],
    error_message: "You must confirm you are 18 years of age or older to proceed.",
    error_target: "purchase.checkout.block.render",
    guidance_message: "I confirm I am 18 years of age or older.",
    rule_type: "checkbox"
  },
  {
    id: 33,
    title: "Age 21+ Alcohol & Tobacco Verification",
    category: "Checkbox",
    description: "Requires buyers to confirm they are 21 years of age or older to purchase regulated items like alcohol or tobacco.",
    conditions: [],
    error_message: "You must be 21 or older to complete checkout for these items.",
    error_target: "purchase.checkout.block.render",
    guidance_message: "I verify that I am 21 years of age or older.",
    rule_type: "checkbox"
  },
  {
    id: 34,
    title: "Final Sale & Non-Refundable Acknowledgment",
    category: "Checkbox",
    description: "Ensures customers acknowledge that items in their cart are final sale and non-refundable prior to placing the order.",
    conditions: [],
    error_message: "Please confirm your acknowledgment of our final sale policy.",
    error_target: "purchase.checkout.block.render",
    guidance_message: "I understand that clearance and final sale items cannot be returned or exchanged.",
    rule_type: "checkbox"
  },
  {
    id: 35,
    title: "Pre-Order Shipping Timeline Consent",
    category: "Checkbox",
    description: "Requires buyers purchasing pre-order items to confirm they understand the estimated fulfillment timeline.",
    conditions: [],
    error_message: "Please confirm you understand the pre-order shipping timeline.",
    error_target: "purchase.checkout.shipping-option-list.render-after",
    guidance_message: "I acknowledge that pre-order items ship within 3-4 weeks.",
    rule_type: "checkbox"
  },
  {
    id: 36,
    title: "Custom Engraving & Personalization Approval",
    category: "Checkbox",
    description: "Requires customers ordering custom or engraved products to double-check their custom text and spelling before ordering.",
    conditions: [],
    error_message: "Please confirm that your personalization options have been reviewed.",
    error_target: "purchase.checkout.block.render",
    guidance_message: "I have verified that all custom text, spelling, and options selected are accurate.",
    rule_type: "checkbox"
  },
  {
    id: 37,
    title: "Perishable Food Unattended Delivery Consent",
    category: "Checkbox",
    description: "Requires agreement that perishable or frozen items will be refrigerated immediately upon carrier delivery.",
    conditions: [],
    error_message: "Please accept the perishable delivery policy before continuing.",
    error_target: "purchase.checkout.delivery-address.render-after",
    guidance_message: "I agree to unpack and refrigerate perishable items immediately upon delivery.",
    rule_type: "checkbox"
  },
  {
    id: 38,
    title: "Adult Signature Delivery Notice",
    category: "Checkbox",
    description: "Informs buyers that an adult signature is required upon delivery for high-value or restricted parcels.",
    conditions: [],
    error_message: "Please confirm you understand the signature delivery requirement.",
    error_target: "purchase.checkout.shipping-option-list.render-after",
    guidance_message: "I acknowledge that a physical signature will be required at delivery.",
    rule_type: "checkbox"
  },
  {
    id: 39,
    title: "Freight Shipping Curbside Delivery Notice",
    category: "Checkbox",
    description: "Requires acknowledgment of curbside delivery policies and heavy item offloading responsibilities.",
    conditions: [],
    error_message: "Please acknowledge the freight curbside delivery terms.",
    error_target: "purchase.checkout.shipping-option-list.render-after",
    guidance_message: "I understand freight delivery is curbside only and requires offloading assistance.",
    rule_type: "checkbox"
  },
  {
    id: 40,
    title: "B2B Tax-Exempt Resale Declaration",
    category: "Checkbox",
    description: "Requires commercial B2B buyers to verify they hold a valid resale or tax-exempt certificate on file.",
    conditions: [],
    error_message: "Please confirm your tax-exempt business purchasing status.",
    error_target: "purchase.checkout.contact.render-after",
    guidance_message: "I certify this purchase is for resale or authorized tax-exempt business use.",
    rule_type: "checkbox"
  },
  {
    id: 41,
    title: "Digital Downloads Instant Access Waiver",
    category: "Checkbox",
    description: "Waiver of right of withdrawal for instant digital downloads and software keys upon purchase.",
    conditions: [],
    error_message: "Please confirm your agreement for immediate digital delivery.",
    error_target: "purchase.checkout.payment-method-list.render-before",
    guidance_message: "I consent to immediate access to digital content and waive right to cancel once downloaded.",
    rule_type: "checkbox"
  },
  {
    id: 42,
    title: "Transactional SMS Notifications Consent",
    category: "Checkbox",
    description: "Consents to receiving transactional SMS updates and order status alerts regarding their package.",
    conditions: [],
    error_message: "Please confirm your agreement for order updates.",
    error_target: "purchase.checkout.contact.render-after",
    guidance_message: "I agree to receive transactional order status updates via SMS text message.",
    rule_type: "checkbox"
  },
  {
    id: 43,
    title: "Out-of-Stock Item Substitution Consent",
    category: "Checkbox",
    description: "Allows store pickers to substitute comparable products if an ordered item is out of stock.",
    conditions: [],
    error_message: "Please indicate whether item substitutions are permitted.",
    error_target: "purchase.checkout.block.render",
    guidance_message: "I allow equal-value item substitutions if an ordered product is out of stock.",
    rule_type: "checkbox"
  },
  {
    id: 44,
    title: "Customer Assembly Required Disclaimer",
    category: "Checkbox",
    description: "Ensures customers understand that furniture or equipment items arrive flat-packed and require self-assembly.",
    conditions: [],
    error_message: "Please confirm you understand assembly is required.",
    error_target: "purchase.checkout.block.render",
    guidance_message: "I acknowledge that products in this order require customer assembly.",
    rule_type: "checkbox"
  },
  {
    id: 45,
    title: "Minimal Eco-Friendly Packaging Consent",
    category: "Checkbox",
    description: "Consents to consolidated shipping and minimal recyclable packaging to reduce environmental waste.",
    conditions: [],
    error_message: "Please indicate your packaging preference.",
    error_target: "purchase.checkout.block.render",
    guidance_message: "I opt in to minimal eco-friendly recyclable packaging for my shipment.",
    rule_type: "checkbox"
  }
];

// Map over PREBUILT_TEMPLATES to ensure all have rule_type set
PREBUILT_TEMPLATES.forEach(t => {
  if (!t.rule_type) t.rule_type = "validation";
});

// Helper to initialize fallback JSON DB if not exists
function initFallbackDB() {
  if (!fs.existsSync(FALLBACK_DB_PATH)) {
    const initialData = {
      shops: [],
      rules: [],
      rule_versions: [],
      rule_analytics: [],
      subscriptions_log: [],
    };
    fs.mkdirSync(path.dirname(FALLBACK_DB_PATH), { recursive: true });
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(initialData, null, 2));
  } else {
    // Update templates and ensure subscriptions_log inside existing fallback DB
    try {
      const existingData = JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, "utf8"));
      existingData.rule_templates = PREBUILT_TEMPLATES;
      if (!existingData.subscriptions_log) existingData.subscriptions_log = [];
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(existingData, null, 2));
    } catch (e) {
      console.error("Failed to update fallback_db.json templates:", e.message);
    }
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

// Standalone helper to sync PREBUILT_TEMPLATES directly to PostgreSQL rule_templates table
export async function syncTemplatesToPostgres() {
  if (!pool || useFallback) return;
  try {
    console.log("[DB Sync] Ensuring rule_templates table and sync status in PostgreSQL...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rule_templates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description VARCHAR(500) NOT NULL,
        conditions JSONB NOT NULL,
        error_message VARCHAR(500) NOT NULL,
        error_target VARCHAR(255) DEFAULT '$.cart',
        rule_type VARCHAR(50) DEFAULT 'validation',
        delivery_action VARCHAR(50) DEFAULT NULL,
        guidance_message VARCHAR(500) DEFAULT NULL
      );
      ALTER TABLE rule_templates ADD COLUMN IF NOT EXISTS rule_type VARCHAR(50) DEFAULT 'validation';
      ALTER TABLE rule_templates ADD COLUMN IF NOT EXISTS delivery_action VARCHAR(50) DEFAULT NULL;
      ALTER TABLE rule_templates ADD COLUMN IF NOT EXISTS guidance_message VARCHAR(500) DEFAULT NULL;
    `);

    for (const tmpl of PREBUILT_TEMPLATES) {
      const checkRes = await pool.query(
        "SELECT id FROM rule_templates WHERE title = $1 OR id = $2",
        [tmpl.title, tmpl.id]
      );

      if (checkRes.rows && checkRes.rows.length > 0) {
        await pool.query(
          `UPDATE rule_templates SET 
             title = $1,
             category = $2,
             description = $3,
             conditions = $4,
             error_message = $5,
             error_target = $6,
             rule_type = $7,
             delivery_action = $8,
             guidance_message = $9 
           WHERE id = $10 OR title = $1`,
          [
            tmpl.title,
            tmpl.category,
            tmpl.description,
            JSON.stringify(tmpl.conditions || []),
            tmpl.error_message || "",
            tmpl.error_target || "$.cart",
            tmpl.rule_type || "validation",
            tmpl.delivery_action || null,
            tmpl.guidance_message || null,
            checkRes.rows[0].id
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO rule_templates (id, title, category, description, conditions, error_message, error_target, rule_type, delivery_action, guidance_message)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            tmpl.id,
            tmpl.title,
            tmpl.category,
            tmpl.description,
            JSON.stringify(tmpl.conditions || []),
            tmpl.error_message || "",
            tmpl.error_target || "$.cart",
            tmpl.rule_type || "validation",
            tmpl.delivery_action || null,
            tmpl.guidance_message || null
          ]
        );
      }
    }
    console.log(`[DB Sync] Successfully synced all ${PREBUILT_TEMPLATES.length} templates to PostgreSQL!`);
  } catch (err) {
    console.error("[DB Sync] Template sync error:", err.message);
  }
}

// Connect test
if (pool && !useFallback) {
  pool.connect((err, client, release) => {
    if (err) {
      console.warn("PostgreSQL connection test failed, using JSON fallback DB instead:", err.message);
      useFallback = true;
    } else {
      console.log("Successfully connected to PostgreSQL Database.");
      syncTemplatesToPostgres();
      client.query(`
        ALTER TABLE shops ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
        ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan_name VARCHAR(50) DEFAULT 'Free';
        ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255) DEFAULT NULL;
        ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ACTIVE';
        ALTER TABLE shops ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP DEFAULT NULL;
        ALTER TABLE shops ADD COLUMN IF NOT EXISTS billing_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        CREATE TABLE IF NOT EXISTS subscriptions_log (
          id SERIAL PRIMARY KEY,
          shop VARCHAR(255) NOT NULL,
          subscription_id VARCHAR(255),
          plan_name VARCHAR(50) NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(e => {
        console.error("Failed to alter shops table / create subscriptions_log table:", e.message);
      });
      release();
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
      console.error("Database query error:", err.message);
      // Only fallback to JSON DB if it is a genuine connection error, not a query logic/syntax error
      const connectionErrorCodes = ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "57P01", "57P02", "57P03", "08000", "08003", "08006", "08001", "08004"];
      if (err.code && (connectionErrorCodes.includes(err.code) || err.message.includes("connection"))) {
        console.warn("Reverting to fallback DB due to connection failure.");
        useFallback = true;
      } else {
        throw err;
      }
    }
  }

  // Fallback DB Implementation
  const db = readFallbackDB();
  const lowerText = text.trim().toLowerCase();

  if (lowerText.startsWith("select shop from shops where uninstalled")) {
    const activeShops = db.shops ? db.shops.filter(s => !s.uninstalled).map(s => ({ shop: s.shop })) : [];
    return { rows: activeShops };
  }

  if (lowerText.startsWith("select * from rule_templates")) {
    return { rows: db.rule_templates };
  }

  // Count active rules for analytics
  if (lowerText.includes("count(*)") && lowerText.includes("rules") && lowerText.includes("active") && !lowerText.includes("rule_analytics")) {
    const shop = params[0];
    const count = db.rules.filter(r => (r.shop === shop || r.target_shop === shop) && r.status === "active").length;
    return { rows: [{ count }] };
  }

  // Count expired active rules for scheduled worker
  if (lowerText.includes("select distinct shop from rules") && lowerText.includes("schedule_end")) {
    const now = new Date();
    const expiredShops = db.rules
      .filter(r => r.status === "active" && r.schedule_end && new Date(r.schedule_end) < now)
      .map(r => ({ shop: r.shop }));
    const uniqueShops = [...new Set(expiredShops.map(s => s.shop))].map(shop => ({ shop }));
    return { rows: uniqueShops };
  }

  if (lowerText.startsWith("select * from rules")) {
    const shop = params[0];
    let filteredRules = db.rules.filter(r => (r.shop === shop || r.target_shop === shop) && r.status !== 'deleted');

    // If the query specifies active status, filter by active status and date schedule
    if (lowerText.includes("status = 'active'") || lowerText.includes("status = $2") || lowerText.includes("status='active'")) {
      const now = new Date();
      filteredRules = filteredRules.filter(r => {
        if (r.status !== "active") return false;
        if (r.schedule_start && new Date(r.schedule_start) > now) return false;
        if (r.schedule_end && new Date(r.schedule_end) < now) return false;
        return true;
      });
    }

    // Order by status (active first), priority desc, id desc
    filteredRules.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.id - a.id;
    });
    return { rows: filteredRules };
  }

  if (lowerText.startsWith("select * from rules where id = $1")) {
    const id = parseInt(params[0]);
    const shop = params[1];
    const rule = db.rules.find(r => r.id === id && (r.shop === shop || r.target_shop === shop) && r.status !== 'deleted');
    return { rows: rule ? [rule] : [] };
  }

  if (lowerText.startsWith("insert into rules")) {
    let shop = params[0];
    let target_shop = null;
    let title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end;
    let rule_type = "validation";
    let delivery_action = null;
    let warning_banner = false;
    let custom_icon = null;
    let banner_style = null;
    let guidance_message = null;
    let display_in_checkout = true;

    if (params.length === 18) {
      [shop, target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, rule_type, delivery_action, warning_banner, custom_icon, banner_style, guidance_message, display_in_checkout] = params;
    } else if (params.length === 13) {
      [shop, target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, rule_type, delivery_action] = params;
    } else if (params.length === 11) {
      [shop, target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end] = params;
      rule_type = "validation";
      delivery_action = null;
    } else {
      title = params[1];
      status = params[2];
      priority = params[3];
      conditions_operator = params[4];
      conditions = params[5];
      error_message = params[6];
      error_target = params[7] || "$.cart";
      schedule_start = params[8];
      schedule_end = params[9];
    }

    const newRule = {
      id: db.rules.length > 0 ? Math.max(...db.rules.map(r => r.id)) + 1 : 1,
      shop,
      target_shop: target_shop || null,
      title,
      status,
      priority: parseInt(priority) || 0,
      conditions_operator,
      conditions: typeof conditions === "string" ? JSON.parse(conditions) : conditions,
      error_message,
      error_target,
      schedule_start,
      schedule_end,
      rule_type: rule_type || "validation",
      delivery_action: delivery_action || null,
      warning_banner: !!warning_banner,
      custom_icon: custom_icon || null,
      banner_style: banner_style || null,
      guidance_message: guidance_message || null,
      display_in_checkout: display_in_checkout !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.rules.push(newRule);
    writeFallbackDB(db);
    return { rows: [newRule] };
  }

  if (lowerText.startsWith("update rules set title = $1") || lowerText.startsWith("update rules set target_shop = $1") || lowerText.includes("update rules set")) {
    let updated;
    if (params.length === 19) {
      const [target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, rule_type, delivery_action, warning_banner, custom_icon, banner_style, guidance_message, display_in_checkout, id, shop] = params;
      const ruleIdx = db.rules.findIndex(r => r.id === parseInt(id) && r.shop === shop);
      if (ruleIdx !== -1) {
        updated = {
          ...db.rules[ruleIdx],
          target_shop: target_shop || null,
          title,
          status,
          priority: parseInt(priority) || 0,
          conditions_operator,
          conditions: typeof conditions === "string" ? JSON.parse(conditions) : conditions,
          error_message,
          error_target,
          schedule_start,
          schedule_end,
          rule_type: rule_type || "validation",
          delivery_action: delivery_action || null,
          warning_banner: !!warning_banner,
          custom_icon: custom_icon || null,
          banner_style: banner_style || null,
          guidance_message: guidance_message || null,
          display_in_checkout: display_in_checkout !== false,
          updated_at: new Date().toISOString()
        };
        db.rules[ruleIdx] = updated;
        writeFallbackDB(db);
      }
    } else if (params.length === 14) {
      const [target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, rule_type, delivery_action, id, shop] = params;
      const ruleIdx = db.rules.findIndex(r => r.id === parseInt(id) && r.shop === shop);
      if (ruleIdx !== -1) {
        updated = {
          ...db.rules[ruleIdx],
          target_shop: target_shop || null,
          title,
          status,
          priority: parseInt(priority) || 0,
          conditions_operator,
          conditions: typeof conditions === "string" ? JSON.parse(conditions) : conditions,
          error_message,
          error_target,
          schedule_start,
          schedule_end,
          rule_type: rule_type || "validation",
          delivery_action: delivery_action || null,
          updated_at: new Date().toISOString()
        };
        db.rules[ruleIdx] = updated;
        writeFallbackDB(db);
      }
    } else if (lowerText.includes("target_shop = $1") && params.length === 12) {
      const [target_shop, title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, id, shop] = params;
      const ruleIdx = db.rules.findIndex(r => r.id === parseInt(id) && r.shop === shop);
      if (ruleIdx !== -1) {
        updated = {
          ...db.rules[ruleIdx],
          target_shop: target_shop || null,
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
      }
    } else {
      const [title, status, priority, conditions_operator, conditions, error_message, error_target, schedule_start, schedule_end, id, shop] = params;
      const ruleIdx = db.rules.findIndex(r => r.id === parseInt(id) && r.shop === shop);
      if (ruleIdx !== -1) {
        updated = {
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
      }
    }
    return { rows: updated ? [updated] : [] };
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
    let rule_id, version, target_shop, title, priority, conditions_operator, conditions, error_message, error_target;
    let rule_type = "validation";
    let delivery_action = null;
    let warning_banner = false;
    let custom_icon = null;
    let banner_style = null;
    let guidance_message = null;
    let display_in_checkout = true;

    if (params.length === 16) {
      [rule_id, version, target_shop, title, priority, conditions_operator, conditions, error_message, error_target, rule_type, delivery_action, warning_banner, custom_icon, banner_style, guidance_message, display_in_checkout] = params;
    } else if (params.length === 11) {
      [rule_id, version, target_shop, title, priority, conditions_operator, conditions, error_message, error_target, rule_type, delivery_action] = params;
    } else {
      const hasTargetShop = params.length === 9;
      rule_id = params[0];
      version = params[1];
      target_shop = hasTargetShop ? params[2] : null;
      const titleIdx = hasTargetShop ? 3 : 2;
      title = params[titleIdx];
      priority = params[titleIdx + 1] || 0;
      conditions_operator = params[titleIdx + 2];
      conditions = params[titleIdx + 3];
      error_message = params[titleIdx + 4];
      error_target = params[titleIdx + 5];
    }

    const newVersion = {
      id: db.rule_versions.length > 0 ? Math.max(...db.rule_versions.map(v => v.id)) + 1 : 1,
      rule_id: parseInt(rule_id),
      version: parseInt(version),
      target_shop: target_shop || null,
      title,
      priority: parseInt(priority) || 0,
      conditions_operator,
      conditions: typeof conditions === "string" ? JSON.parse(conditions) : conditions,
      error_message,
      error_target,
      rule_type: rule_type || "validation",
      delivery_action: delivery_action || null,
      warning_banner: !!warning_banner,
      custom_icon: custom_icon || null,
      banner_style: banner_style || null,
      guidance_message: guidance_message || null,
      display_in_checkout: display_in_checkout !== false,
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

    if (lowerText.includes("cart_id = $2")) {
      const cartId = params[1];
      if (lowerText.includes("event_type = 'check'")) {
        db.rule_analytics = db.rule_analytics.filter(a => !(a.shop === shop && a.cart_id === cartId && a.event_type === 'check'));
      } else if (lowerText.includes("event_type = 'block'")) {
        db.rule_analytics = db.rule_analytics.filter(a => !(a.shop === shop && a.cart_id === cartId && a.event_type === 'block'));
      } else if (lowerText.includes("event_type in ('check', 'block')") || lowerText.includes("event_type in ('check', 'block')")) {
        db.rule_analytics = db.rule_analytics.filter(a => !(a.shop === shop && a.cart_id === cartId && (a.event_type === 'check' || a.event_type === 'block')));
      } else {
        db.rule_analytics = db.rule_analytics.filter(a => !(a.shop === shop && a.cart_id === cartId));
      }
    } else {
      db.rule_analytics = db.rule_analytics.filter(a => a.shop !== shop);
    }

    writeFallbackDB(db);
    return { rowCount: beforeLen - db.rule_analytics.length };
  }

  // Analytics: GROUP BY event_type with COUNT and SUM
  if (lowerText.includes("rule_analytics") && lowerText.includes("group by event_type")) {
    const shop = params[0];
    const shopAnalytics = db.rule_analytics.filter(a => a.shop === shop);
    const grouped = {};
    shopAnalytics.forEach(a => {
      if (!grouped[a.event_type]) {
        grouped[a.event_type] = { event_type: a.event_type, count: 0, total_value: 0 };
      }
      grouped[a.event_type].count++;
      grouped[a.event_type].total_value += parseFloat(a.cart_value) || 0;
    });
    return { rows: Object.values(grouped) };
  }

  // Analytics: Chart data — last 14 days grouped by date and event_type
  if (lowerText.includes("rule_analytics") && lowerText.includes("group by") && lowerText.includes("date")) {
    const shop = params[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const shopAnalytics = db.rule_analytics.filter(a => {
      if (a.shop !== shop) return false;
      const createdAt = new Date(a.created_at);
      return createdAt >= fourteenDaysAgo;
    });
    const grouped = {};
    shopAnalytics.forEach(a => {
      const dateStr = new Date(a.created_at).toISOString().split("T")[0];
      const key = `${dateStr}_${a.event_type}`;
      if (!grouped[key]) {
        grouped[key] = { date: dateStr, event_type: a.event_type, count: 0 };
      }
      grouped[key].count++;
    });
    const rows = Object.values(grouped);
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return { rows };
  }

  // Analytics: Rules breakdown — JOIN rules, GROUP BY title, block or check events
  if (lowerText.includes("rule_analytics") && lowerText.includes("join rules") && lowerText.includes("group by")) {
    const shop = params[0];
    let eventTypes = ["block"];
    if (lowerText.includes("in ('block', 'check')") || lowerText.includes("in ('check', 'block')")) {
      eventTypes = ["block", "check"];
    } else if (lowerText.includes("event_type = 'check'")) {
      eventTypes = ["check"];
    }
    const filteredEvents = db.rule_analytics.filter(a => a.shop === shop && eventTypes.includes(a.event_type) && a.rule_id);
    const grouped = {};
    filteredEvents.forEach(a => {
      const rule = db.rules.find(r => r.id === a.rule_id);
      const title = rule ? rule.title : "Unknown Rule";
      if (!grouped[title]) {
        grouped[title] = { title, count: 0 };
      }
      grouped[title].count++;
    });
    const rows = Object.values(grouped);
    rows.sort((a, b) => b.count - a.count);
    return { rows: rows.slice(0, 5) };
  }

  // Analytics: Recent checkout activity — LEFT JOIN rules, ordered by date DESC
  if (lowerText.includes("rule_analytics") && lowerText.includes("left join") && lowerText.includes("order by a.created_at desc")) {
    const shop = params[0];
    let eventTypes = ["block"];
    if (lowerText.includes("in ('block', 'check')") || lowerText.includes("in ('check', 'block')")) {
      eventTypes = ["block", "check"];
    }
    const filteredEvents = db.rule_analytics.filter(a => a.shop === shop && eventTypes.includes(a.event_type));
    filteredEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const rows = filteredEvents.slice(0, 10).map(a => {
      const rule = a.rule_id ? db.rules.find(r => r.id === a.rule_id) : null;
      return {
        id: a.id,
        rule_title: rule ? rule.title : "Unknown/Deleted Rule",
        cart_value: a.cart_value,
        event_type: a.event_type,
        created_at: a.created_at
      };
    });
    return { rows };
  }

  // Analytics: Deduplication check — SELECT id FROM rule_analytics WHERE shop AND cart_id
  if (lowerText.includes("rule_analytics") && lowerText.includes("cart_id") && lowerText.includes("limit 1")) {
    const shop = params[0];
    const cartId = params[1];
    let match;
    if (lowerText.includes("event_type = 'block'") && lowerText.includes("rule_id = $3")) {
      const ruleId = parseInt(params[2]);
      match = db.rule_analytics.find(a => a.shop === shop && a.cart_id === cartId && a.event_type === 'block' && a.rule_id === ruleId);
    } else if (lowerText.includes("event_type = 'allow'")) {
      match = db.rule_analytics.find(a => a.shop === shop && a.cart_id === cartId && a.event_type === 'allow');
    } else if (lowerText.includes("event_type = 'check'")) {
      match = db.rule_analytics.find(a => a.shop === shop && a.cart_id === cartId && a.event_type === 'check');
    } else if (lowerText.includes("event_type in ('check', 'allow')") || lowerText.includes("event_type in ('check', 'allow')")) {
      match = db.rule_analytics.find(a => a.shop === shop && a.cart_id === cartId && (a.event_type === 'check' || a.event_type === 'allow'));
    } else {
      match = db.rule_analytics.find(a => a.shop === shop && a.cart_id === cartId);
    }
    return { rows: match ? [{ id: match.id }] : [] };
  }

  // Analytics: Generic count query
  if (lowerText.includes("count(*)") && lowerText.includes("rule_analytics")) {
    const shop = params[0];
    const count = db.rule_analytics.filter(a => a.shop === shop).length;
    return { rows: [{ count }] };
  }

  // Analytics: Generic select fallback
  if (lowerText.includes("select") && lowerText.includes("rule_analytics")) {
    const shop = params[0];
    const shopAnalytics = db.rule_analytics.filter(a => a.shop === shop);
    return { rows: shopAnalytics };
  }

  if (lowerText.includes("insert into shops") || lowerText.includes("conflict (shop)")) {
    const shop = params[0];
    if (!db.shops) db.shops = [];
    const shopIdx = db.shops.findIndex(s => s.shop === shop);
    const now = new Date().toISOString();
    if (shopIdx !== -1) {
      db.shops[shopIdx] = {
        ...db.shops[shopIdx],
        uninstalled: false,
        installed_at: now,
        uninstalled_at: null,
        updated_at: now
      };
      writeFallbackDB(db);
      return { rows: [db.shops[shopIdx]] };
    } else {
      const newShop = {
        id: db.shops.length > 0 ? Math.max(...db.shops.map(s => s.id)) + 1 : 1,
        shop,
        uninstalled: false,
        onboarded: false,
        installed_at: now,
        uninstalled_at: null,
        created_at: now,
        updated_at: now
      };
      db.shops.push(newShop);
      writeFallbackDB(db);
      return { rows: [newShop] };
    }
  }

  if (lowerText.startsWith("update shops") && lowerText.includes("uninstalled = true")) {
    const shop = params[0];
    if (!db.shops) db.shops = [];
    const shopIdx = db.shops.findIndex(s => s.shop === shop);
    if (shopIdx !== -1) {
      db.shops[shopIdx] = {
        ...db.shops[shopIdx],
        uninstalled: true,
        uninstalled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      writeFallbackDB(db);
      return { rows: [db.shops[shopIdx]] };
    }
    return { rows: [] };
  }

  if (lowerText.startsWith("select onboarded from shops")) {
    const shop = params[0];
    const match = db.shops ? db.shops.find(s => s.shop === shop) : null;
    return { rows: [{ onboarded: match ? !!match.onboarded : false }] };
  }

  if (lowerText.includes("update shops set onboarded")) {
    const onboardedVal = params[0] === true || params[0] === 'true' || params[0] === 1;
    const shop = params[1];
    if (!db.shops) db.shops = [];
    const shopIdx = db.shops.findIndex(s => s.shop === shop);
    if (shopIdx !== -1) {
      db.shops[shopIdx] = {
        ...db.shops[shopIdx],
        onboarded: onboardedVal,
        updated_at: new Date().toISOString()
      };
      writeFallbackDB(db);
      return { rows: [db.shops[shopIdx]] };
    }
    return { rows: [] };
  }

  if (lowerText.startsWith("select * from shops where shop = $1") || lowerText.includes("from shops where shop = $1") || lowerText.includes("from shops where shop=$1")) {
    const shop = params[0];
    if (!db.shops) db.shops = [];
    const match = db.shops.find(s => s.shop === shop);
    if (match) {
      return { rows: [{ plan_name: 'Free', subscription_id: null, subscription_status: 'ACTIVE', ...match }] };
    } else {
      return { rows: [{ shop, plan_name: 'Free', subscription_id: null, subscription_status: 'ACTIVE', onboarded: false }] };
    }
  }

  if (lowerText.includes("update shops set plan_name")) {
    const [plan_name, subscription_id, subscription_status, trial_ends_at, shop] = params;
    if (!db.shops) db.shops = [];
    const shopIdx = db.shops.findIndex(s => s.shop === shop);
    const now = new Date().toISOString();
    let updated;
    if (shopIdx !== -1) {
      db.shops[shopIdx] = {
        ...db.shops[shopIdx],
        plan_name: plan_name || 'Free',
        subscription_id: subscription_id || null,
        subscription_status: subscription_status || 'ACTIVE',
        trial_ends_at: trial_ends_at || null,
        billing_updated_at: now,
        updated_at: now
      };
      updated = db.shops[shopIdx];
    } else {
      updated = {
        id: db.shops.length > 0 ? Math.max(...db.shops.map(s => s.id)) + 1 : 1,
        shop,
        uninstalled: false,
        onboarded: false,
        plan_name: plan_name || 'Free',
        subscription_id: subscription_id || null,
        subscription_status: subscription_status || 'ACTIVE',
        trial_ends_at: trial_ends_at || null,
        billing_updated_at: now,
        created_at: now,
        updated_at: now
      };
      db.shops.push(updated);
    }
    writeFallbackDB(db);
    return { rows: [updated] };
  }

  if (lowerText.startsWith("insert into subscriptions_log")) {
    const [shop, subscription_id, plan_name, price, status] = params;
    if (!db.subscriptions_log) db.subscriptions_log = [];
    const newLog = {
      id: db.subscriptions_log.length > 0 ? Math.max(...db.subscriptions_log.map(l => l.id)) + 1 : 1,
      shop,
      subscription_id,
      plan_name,
      price: parseFloat(price) || 0.00,
      status,
      created_at: new Date().toISOString()
    };
    db.subscriptions_log.push(newLog);
    writeFallbackDB(db);
    return { rows: [newLog] };
  }

  if (lowerText.startsWith("select * from subscriptions_log")) {
    const shop = params[0];
    if (!db.subscriptions_log) db.subscriptions_log = [];
    const logs = db.subscriptions_log.filter(l => l.shop === shop);
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows: logs };
  }

  return { rows: [], rowCount: 0 };
}

export { PREBUILT_TEMPLATES };
