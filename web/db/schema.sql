-- Create shops table for multi-store installation tracking
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) UNIQUE NOT NULL,
  uninstalled BOOLEAN DEFAULT FALSE,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uninstalled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rules table
CREATE TABLE IF NOT EXISTS rules (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  target_shop VARCHAR(255) DEFAULT NULL, -- Specific shop this rule applies to (NULL/all means all/default)
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive
  priority INTEGER DEFAULT 0,
  conditions_operator VARCHAR(10) DEFAULT 'AND', -- AND, OR
  conditions JSONB NOT NULL, -- Array of condition objects
  error_message VARCHAR(500) NOT NULL,
  error_target VARCHAR(255) DEFAULT '$.cart',
  schedule_start TIMESTAMP,
  schedule_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rule versions table for history
CREATE TABLE IF NOT EXISTS rule_versions (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER REFERENCES rules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  target_shop VARCHAR(255) DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  priority INTEGER DEFAULT 0,
  conditions_operator VARCHAR(10) DEFAULT 'AND',
  conditions JSONB NOT NULL,
  error_message VARCHAR(500) NOT NULL,
  error_target VARCHAR(255) DEFAULT '$.cart',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rule analytics table
CREATE TABLE IF NOT EXISTS rule_analytics (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) NOT NULL,
  rule_id INTEGER REFERENCES rules(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- trigger (meaning it checked), block (blocked checkout), allow
  cart_value NUMERIC(10, 2) DEFAULT 0.00,
  cart_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rule templates table
CREATE TABLE IF NOT EXISTS rule_templates (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  conditions JSONB NOT NULL,
  error_message VARCHAR(500) NOT NULL,
  error_target VARCHAR(255) DEFAULT '$.cart'
);

-- Seed pre-built templates
TRUNCATE TABLE rule_templates RESTART IDENTITY CASCADE;
INSERT INTO rule_templates (title, category, description, conditions, error_message, error_target)
VALUES
('Block PO Box Addresses', 'Address', 'Prevents shipping to PO Box addresses by checking the address lines for PO Box indicators, ensuring orders are sent to physical locations suitable for standard carrier deliveries.', 
  '[{"type": "shipping_address_pobox", "operator": "is_pobox", "value": ""}]', 
  'We cannot ship to PO Box addresses. Please provide a physical shipping address.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('B2B Only Checkout', 'B2B', 'Restricts checkout access to recognized business accounts with an active company profile. Guest accounts and standard consumer checkout profiles will be blocked.',
 '[{"type": "b2b_only", "operator": "is_not_b2b", "value": ""}]',
 'Checkout is restricted to B2B customers only.', '$.cart'),

('Login Required to Checkout', 'Customer', 'Enforces user authentication before proceeding. Unauthenticated guest checkouts are blocked, prompting customers to log in or register an account.',
 '[{"type": "login_required", "operator": "is_guest", "value": ""}]',
 'Please log in to your account to complete checkout.', '$.cart'),

('Restricted States', 'Address', 'Blocks checkout for specific state or province codes (e.g. Alaska, Hawaii, or military zones) where shipping is unsupported or incurs excessive carrier rates.',
 '[{"type": "block_states", "operator": "in_states", "value": "AK,HI"}]',
 'We currently do not ship to Alaska or Hawaii.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('Block Specific Countries', 'Address', 'Restricts checkout access for specific countries or regions to comply with trade sanctions, high-risk fraud zones, or regions outside your shipping carrier networks.',
 '[{"type": "block_countries", "operator": "in_countries", "value": "KP,IR,SY"}]',
 'We do not ship to the selected country.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('Hazardous Items Shipping Restriction', 'Product', 'Ensures hazardous or safety-restricted products are not shipped to islands, remote territories, or specific state codes where air transport regulations prohibit them.',
 '[{"type": "has_hazardous_item", "operator": "equals", "value": "true"}, {"type": "block_states", "operator": "in_states", "value": "AK,HI,PR"}]',
 'Hazardous items cannot be shipped to Alaska, Hawaii, or Puerto Rico.', '$.cart'),

('Minimum Order Value limit', 'Cart Value', 'Enforces a minimum cart subtotal requirement before allowing checkout, helping cover operational costs and logistics margins for small orders.',
 '[{"type": "minimum_order_value", "operator": "less_than", "value": "50.00"}]',
 'The minimum order value to checkout is $50.00.', '$.cart'),
 
('Maximum Order Value limit', 'Cart Value', 'Sets an upper threshold limit on the order subtotal to reduce liability risks, prevent high-value fraud, or redirect bulk trade orders to direct sales representatives.',
 '[{"type": "maximum_order_value", "operator": "greater_than", "value": "1000.00"}]',
 'Orders exceeding $1,000.00 must be placed by phone or email.', '$.cart'),
 
('Limit Customer Age (18+)', 'Customer', 'Blocks checkout if the customer''s age on file is under 18, ensuring legal compliance for age-restricted products like alcohol, tobacco, or mature content.',
 '[{"type": "customer_age", "operator": "under_age", "value": "18"}]',
 'You must be 18 years or older to purchase these items.', '$.cart'),
  
('Restrict Subscription Items', 'Product', 'Restricts subscription products to authorized customers with specific tags (e.g., VIP, wholesale), preventing general public signups for exclusive recurring plans.',
 '[{"type": "has_subscription", "operator": "equals", "value": "true"}, {"type": "customer_tags", "operator": "not_contains", "value": "vip"}]',
 'Subscriptions are exclusive to VIP members.', '$.cart'),

('Customer Tags Validation', 'Customer', 'Restricts order placement to customers possessing specific account tags (like VIP, Wholesale, or Member), protecting exclusive catalog collections.',
 '[{"type": "customer_tags", "operator": "contains", "value": "vip,wholesale"}]',
 'This checkout is reserved for Wholesale or VIP customers only.', '$.cart'),

('Guest Checkout Restriction', 'Customer', 'Blocks checkout access for guest accounts, ensuring all orders are linked to registered customer profiles for loyalty tracking and communication.',
 '[{"type": "guest_checkout_restriction", "operator": "is_guest", "value": ""}]',
 'Guest checkout is disabled. Please create an account to purchase.', '$.cart'),

('Block Specific ZIP Codes', 'Address', 'Blocks shipping to specific ZIP/postal codes known for delivery failures, remote access surcharges, or where regional distributor exclusivity applies.',
 '[{"type": "block_zipcodes", "operator": "in_zips", "value": "90210,10001"}]',
 'We do not offer shipping to your ZIP code.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('Regex Address Format Validation', 'Address', 'Validates the shipping address format against a regular expression pattern to prevent special characters, typos, or gibberish entries that cause shipment failures.',
 '[{"type": "address_regex", "operator": "matches_regex", "value": "^[a-zA-Z0-9\\\\s,.-]+$"}]',
 'Please avoid special characters in your shipping address.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('Restricted Collections Validation', 'Product', 'Checks if cart items belong to restricted collection GIDs, blocking checkout for restricted product categories during shipping blackout periods or regional lockouts.',
 '[{"type": "restricted_collections", "operator": "in_collections", "value": "restricted_id"}]',
 'Items in your cart belong to a restricted collection and cannot be shipped.', '$.cart'),

('Restricted Vendors Validation', 'Product', 'Blocks purchase of items supplied by specific brand vendors, useful for enforcing distribution agreements, regional supply constraints, or seasonal inventory halts.',
 '[{"type": "restricted_vendors", "operator": "in_vendors", "value": "restricted_vendor"}]',
 'We cannot fulfill orders for products from this vendor.', '$.cart'),

('Incompatible Product Combinations', 'Product', 'Prevents incompatible items from being purchased in the same order (e.g., pre-order products mixed with in-stock items, or conflicting fragile/heavy items).',
 '[{"type": "product_combinations", "operator": "cannot_combine", "value": "prod_id_A,prod_id_B"}]',
 'Incompatible items found in your cart. These products cannot be shipped together.', '$.cart'),

('Cart Item Quantity Limit', 'Cart Value', 'Limits the maximum number of items (total item count) allowed in the cart to prevent bulk buying, retail arbitrage, or carrier parcel weight limit issues.',
 '[{"type": "quantity_limit", "operator": "greater_than", "value": "10"}]',
 'Maximum quantity of 10 items exceeded per order.', '$.cart'),

('Weight Limit Restriction', 'Cart Value', 'Enforces a maximum threshold on the total cart weight, ensuring order shipments do not exceed standard parcel carrier limits or trigger unexpected freight shipping.',
 '[{"type": "weight_limit", "operator": "greater_than", "value": "50"}]',
 'Order weight exceeds 50kg. Please contact us for a custom shipping quote.', '$.cart'),

('SKU Quantity Limit Check', 'Cart Value', 'Restricts the number of unique SKUs (different products/variants) permitted in the cart to control inventory runs, limit order complexity, or manage pack times.',
 '[{"type": "sku_limit", "operator": "greater_than", "value": "5"}]',
 'A maximum of 5 unique product SKUs can be purchased per order.', '$.cart');
