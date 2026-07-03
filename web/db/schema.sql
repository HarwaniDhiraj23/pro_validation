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
('Block PO Box Addresses', 'Address', 'Prevents customers from shipping to Post Office Boxes.', 
 '[{"type": "shipping_address_pobox", "operator": "is_pobox", "value": ""}]', 
 'We cannot ship to PO Box addresses. Please provide a physical shipping address.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('B2B Only Checkout', 'B2B', 'Restricts checkout to recognized business accounts (purchasing companies) only.',
 '[{"type": "b2b_only", "operator": "is_not_b2b", "value": ""}]',
 'Checkout is restricted to B2B customers only.', '$.cart'),

('Login Required to Checkout', 'Customer', 'Ensures that customers are logged in before proceeding to checkout.',
 '[{"type": "login_required", "operator": "is_guest", "value": ""}]',
 'Please log in to your account to complete checkout.', '$.cart'),

('Restricted States', 'Address', 'Blocks checkout for specific states/provinces (e.g., AK, HI).',
 '[{"type": "block_states", "operator": "in_states", "value": "AK,HI"}]',
 'We currently do not ship to Alaska or Hawaii.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('Block Specific Countries', 'Address', 'Blocks checkout for specific country codes.',
 '[{"type": "block_countries", "operator": "in_countries", "value": "KP,IR,SY"}]',
 'We do not ship to the selected country.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('Hazardous Items Shipping Restriction', 'Product', 'Blocks hazardous items from being shipped to restricted states/regions.',
 '[{"type": "has_hazardous_item", "operator": "equals", "value": "true"}, {"type": "block_states", "operator": "in_states", "value": "AK,HI,PR"}]',
 'Hazardous items cannot be shipped to Alaska, Hawaii, or Puerto Rico.', '$.cart'),

('Minimum Order Value limit', 'Cart Value', 'Forces a minimum subtotal value before completing checkout.',
 '[{"type": "minimum_order_value", "operator": "less_than", "value": "50.00"}]',
 'The minimum order value to checkout is $50.00.', '$.cart'),
 
('Maximum Order Value limit', 'Cart Value', 'Limits the maximum subtotal value allowed for safety/fraud reasons.',
 '[{"type": "maximum_order_value", "operator": "greater_than", "value": "1000.00"}]',
 'Orders exceeding $1,000.00 must be placed by phone or email.', '$.cart'),
 
('Limit Customer Age (18+)', 'Customer', 'Ensures that checkout is blocked if the customer is under 18.',
 '[{"type": "customer_age", "operator": "under_age", "value": "18"}]',
 'You must be 18 years or older to purchase these items.', '$.cart'),
  
('Restrict Subscription Items', 'Product', 'Limits subscription purchases to authenticated customers with a specific tag (e.g., VIP).',
 '[{"type": "has_subscription", "operator": "equals", "value": "true"}, {"type": "customer_tags", "operator": "not_contains", "value": "vip"}]',
 'Subscriptions are exclusive to VIP members.', '$.cart'),

('Customer Tags Validation', 'Customer', 'Ensures customer has VIP or Wholesale tags to purchase.',
 '[{"type": "customer_tags", "operator": "contains", "value": "vip,wholesale"}]',
 'This checkout is reserved for Wholesale or VIP customers only.', '$.cart'),

('Guest Checkout Restriction', 'Customer', 'Disables guest checkout entirely.',
 '[{"type": "guest_checkout_restriction", "operator": "is_guest", "value": ""}]',
 'Guest checkout is disabled. Please create an account to purchase.', '$.cart'),

('Block Specific ZIP Codes', 'Address', 'Blocks checkout for selected ZIP/Postal codes.',
 '[{"type": "block_zipcodes", "operator": "in_zips", "value": "90210,10001"}]',
 'We do not offer shipping to your ZIP code.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('Regex Address Format Validation', 'Address', 'Enforces correct formatting using regex to block invalid entries.',
 '[{"type": "address_regex", "operator": "matches_regex", "value": "^[a-zA-Z0-9\\\\s,.-]+$"}]',
 'Please avoid special characters in your shipping address.', '$.cart.deliveryGroups[0].deliveryAddress.address1'),

('Restricted Collections Validation', 'Product', 'Blocks purchase of products in restricted collections.',
 '[{"type": "restricted_collections", "operator": "in_collections", "value": "restricted_id"}]',
 'Items in your cart belong to a restricted collection and cannot be shipped.', '$.cart'),

('Restricted Vendors Validation', 'Product', 'Blocks checkout for products from specific vendors.',
 '[{"type": "restricted_vendors", "operator": "in_vendors", "value": "restricted_vendor"}]',
 'We cannot fulfill orders for products from this vendor.', '$.cart'),

('Incompatible Product Combinations', 'Product', 'Prevents conflicting products from being bought together.',
 '[{"type": "product_combinations", "operator": "cannot_combine", "value": "prod_id_A,prod_id_B"}]',
 'Incompatible items found in your cart. These products cannot be shipped together.', '$.cart'),

('Cart Item Quantity Limit', 'Cart Value', 'Restricts the maximum total item count allowed in a single order.',
 '[{"type": "quantity_limit", "operator": "greater_than", "value": "10"}]',
 'Maximum quantity of 10 items exceeded per order.', '$.cart'),

('Weight Limit Restriction', 'Cart Value', 'Restricts total cart weight to prevent freight shipping errors.',
 '[{"type": "weight_limit", "operator": "greater_than", "value": "50"}]',
 'Order weight exceeds 50kg. Please contact us for a custom shipping quote.', '$.cart'),

('SKU Quantity Limit Check', 'Cart Value', 'Restricts the number of unique SKUs allowed in the cart.',
 '[{"type": "sku_limit", "operator": "greater_than", "value": "5"}]',
 'A maximum of 5 unique product SKUs can be purchased per order.', '$.cart');
