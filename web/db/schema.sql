-- Create shops table for multi-store installation tracking
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  shop VARCHAR(255) UNIQUE NOT NULL,
  uninstalled BOOLEAN DEFAULT FALSE,
  onboarded BOOLEAN DEFAULT FALSE,
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
  rule_type VARCHAR(50) DEFAULT 'validation', -- validation, delivery
  delivery_action VARCHAR(50) DEFAULT NULL,   -- hide, rename, move
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
  rule_type VARCHAR(50) DEFAULT 'validation',
  delivery_action VARCHAR(50) DEFAULT NULL,
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
  error_target VARCHAR(255) DEFAULT '$.cart',
  rule_type VARCHAR(50) DEFAULT 'validation',
  delivery_action VARCHAR(50) DEFAULT NULL,
  guidance_message VARCHAR(500) DEFAULT NULL
);

-- Seed pre-built templates
TRUNCATE TABLE rule_templates RESTART IDENTITY CASCADE;
INSERT INTO rule_templates (title, category, description, conditions, error_message, error_target, rule_type, delivery_action, guidance_message)
VALUES
('Block PO Box Addresses', 'Address', 'Prevents shipping to PO Box addresses by checking the address lines for PO Box indicators, ensuring orders are sent to physical locations suitable for standard carrier deliveries.', 
  '[{"type": "shipping_address_pobox", "operator": "is_pobox", "value": ""}]', 
  'We cannot ship to PO Box addresses. Please provide a physical shipping address.', '$.cart.deliveryGroups[0].deliveryAddress.address1', 'validation', NULL, NULL),

('B2B Only Checkout', 'B2B', 'Restricts checkout access to recognized business accounts with an active company profile. Guest accounts and standard consumer checkout profiles will be blocked.',
 '[{"type": "b2b_only", "operator": "is_not_b2b", "value": ""}]',
 'Checkout is restricted to B2B customers only.', '$.cart', 'validation', NULL, NULL),

('Login Required to Checkout', 'Customer', 'Enforces user authentication before proceeding. Unauthenticated guest checkouts are blocked, prompting customers to log in or register an account.',
 '[{"type": "login_required", "operator": "is_guest", "value": ""}]',
 'Please log in to your account to complete checkout.', '$.cart', 'validation', NULL, NULL),

('Restricted States', 'Address', 'Blocks checkout for specific state or province codes (e.g. Alaska, Hawaii, or military zones) where shipping is unsupported or incurs excessive carrier rates.',
 '[{"type": "block_states", "operator": "in_states", "value": "AK,HI"}]',
 'We currently do not ship to Alaska or Hawaii.', '$.cart.deliveryGroups[0].deliveryAddress.address1', 'validation', NULL, NULL),

('Block Specific Countries', 'Address', 'Restricts checkout access for specific countries or regions to comply with trade sanctions, high-risk fraud zones, or regions outside your shipping carrier networks.',
 '[{"type": "block_countries", "operator": "in_countries", "value": "KP,IR,SY"}]',
 'We do not ship to the selected country.', '$.cart.deliveryGroups[0].deliveryAddress.address1', 'validation', NULL, NULL),

('Hazardous Items Shipping Restriction', 'Product', 'Ensures hazardous or safety-restricted products are not shipped to islands, remote territories, or specific state codes where air transport regulations prohibit them.',
 '[{"type": "has_hazardous_item", "operator": "equals", "value": "true"}, {"type": "block_states", "operator": "in_states", "value": "AK,HI,PR"}]',
 'Hazardous items cannot be shipped to Alaska, Hawaii, or Puerto Rico.', '$.cart', 'validation', NULL, NULL),

('Minimum Order Value limit', 'Cart Value', 'Enforces a minimum cart subtotal requirement before allowing checkout, helping cover operational costs and logistics margins for small orders.',
 '[{"type": "minimum_order_value", "operator": "less_than", "value": "50.00"}]',
 'The minimum order value to checkout is $50.00.', '$.cart', 'validation', NULL, NULL),
 
('Maximum Order Value limit', 'Cart Value', 'Sets an upper threshold limit on the order subtotal to reduce liability risks, prevent high-value fraud, or redirect bulk trade orders to direct sales representatives.',
 '[{"type": "maximum_order_value", "operator": "greater_than", "value": "1000.00"}]',
 'Orders exceeding $1,000.00 must be placed by phone or email.', '$.cart', 'validation', NULL, NULL),
 
('Limit Customer Age (18+)', 'Customer', 'Blocks checkout if the customer''s age on file is under 18, ensuring legal compliance for age-restricted products like alcohol, tobacco, or mature content.',
 '[{"type": "customer_age", "operator": "under_age", "value": "18"}]',
 'You must be 18 years or older to purchase these items.', '$.cart', 'validation', NULL, NULL),
  
('Restrict Subscription Items', 'Product', 'Restricts subscription products to authorized customers with specific tags (e.g., VIP, wholesale), preventing general public signups for exclusive recurring plans.',
 '[{"type": "has_subscription", "operator": "equals", "value": "true"}, {"type": "customer_tags", "operator": "not_contains", "value": "vip"}]',
 'Subscriptions are exclusive to VIP members.', '$.cart', 'validation', NULL, NULL),

('Customer Tags Validation', 'Customer', 'Restricts order placement to customers possessing specific account tags (like VIP, Wholesale, or Member), protecting exclusive catalog collections.',
 '[{"type": "customer_tags", "operator": "contains", "value": "vip,wholesale"}]',
 'This checkout is reserved for Wholesale or VIP customers only.', '$.cart', 'validation', NULL, NULL),

('Guest Checkout Restriction', 'Customer', 'Blocks checkout access for guest accounts, ensuring all orders are linked to registered customer profiles for loyalty tracking and communication.',
 '[{"type": "guest_checkout_restriction", "operator": "is_guest", "value": ""}]',
 'Guest checkout is disabled. Please create an account to purchase.', '$.cart', 'validation', NULL, NULL),

('Block Specific ZIP Codes', 'Address', 'Blocks shipping to specific ZIP/postal codes known for delivery failures, remote access surcharges, or where regional distributor exclusivity applies.',
 '[{"type": "block_zipcodes", "operator": "in_zips", "value": "90210,10001"}]',
 'We do not offer shipping to your ZIP code.', '$.cart.deliveryGroups[0].deliveryAddress.address1', 'validation', NULL, NULL),

('Regex Address Format Validation', 'Address', 'Validates the shipping address format against a regular expression pattern to prevent special characters, typos, or gibberish entries that cause shipment failures.',
 '[{"type": "address_regex", "operator": "matches_regex", "value": "^[a-zA-Z0-9\\\\s,.-]+$"}]',
 'Please avoid special characters in your shipping address.', '$.cart.deliveryGroups[0].deliveryAddress.address1', 'validation', NULL, NULL),

('Restricted Collections Validation', 'Product', 'Checks if cart items belong to restricted collection GIDs, blocking checkout for restricted product categories during shipping blackout periods or regional lockouts.',
 '[{"type": "restricted_collections", "operator": "in_collections", "value": "restricted_id"}]',
 'Items in your cart belong to a restricted collection and cannot be shipped.', '$.cart', 'validation', NULL, NULL),

('Restricted Vendors Validation', 'Product', 'Blocks purchase of items supplied by specific brand vendors, useful for enforcing distribution agreements, regional supply constraints, or seasonal inventory halts.',
 '[{"type": "restricted_vendors", "operator": "in_vendors", "value": "restricted_vendor"}]',
 'We cannot fulfill orders for products from this vendor.', '$.cart', 'validation', NULL, NULL),

('Incompatible Product Combinations', 'Product', 'Prevents incompatible items from being purchased in the same order (e.g., pre-order products mixed with in-stock items, or conflicting fragile/heavy items).',
 '[{"type": "product_combinations", "operator": "cannot_combine", "value": "prod_id_A,prod_id_B"}]',
 'Incompatible items found in your cart. These products cannot be shipped together.', '$.cart', 'validation', NULL, NULL),

('Cart Item Quantity Limit', 'Cart Value', 'Limits the maximum number of items (total item count) allowed in the cart to prevent bulk buying, retail arbitrage, or carrier parcel weight limit issues.',
 '[{"type": "quantity_limit", "operator": "greater_than", "value": "10"}]',
 'Maximum quantity of 10 items exceeded per order.', '$.cart', 'validation', NULL, NULL),

('Weight Limit Restriction', 'Cart Value', 'Enforces a maximum threshold on the total cart weight, ensuring order shipments do not exceed standard parcel carrier limits or trigger unexpected freight shipping.',
 '[{"type": "weight_limit", "operator": "greater_than", "value": "50"}]',
 'Order weight exceeds 50kg. Please contact us for a custom shipping quote.', '$.cart', 'validation', NULL, NULL),

('SKU Quantity Limit Check', 'Cart Value', 'Restricts the number of unique SKUs (different products/variants) permitted in the cart to control inventory runs, limit order complexity, or manage pack times.',
 '[{"type": "sku_limit", "operator": "greater_than", "value": "5"}]',
 'A maximum of 5 unique product SKUs can be purchased per order.', '$.cart', 'validation', NULL, NULL),

('Block PO Box from Express Shipping', 'Shipping', 'Hides Express Shipping method at checkout if the shipping address contains a PO Box.',
  '[{"type": "shipping_address_pobox", "operator": "is_pobox", "value": ""}]', 
  '', 'Express Shipping', 'delivery', 'hide', NULL),

('Hide Express Shipping for Remote States', 'Shipping', 'Hides Express Shipping options for customers in remote states like Alaska (AK) and Hawaii (HI).',
 '[{"type": "block_states", "operator": "in_states", "value": "AK,HI"}]',
 '', 'Express Shipping', 'delivery', 'hide', NULL),

('Hide Free Shipping Under Minimum Purchase', 'Shipping', 'Ensures Free Shipping is hidden if the cart subtotal is less than $75.',
 '[{"type": "minimum_order_value", "operator": "less_than", "value": "75.00"}]',
 '', 'Free Shipping', 'delivery', 'hide', NULL),

('Hide Local Pickup for Non-Local ZIP Codes', 'Local Pickup', 'Hides the Local Pickup option if the customer''s shipping address ZIP/postal code is not within specified local ZIPs (e.g. 90210).',
 '[{"type": "block_zipcodes", "operator": "not_in_zips", "value": "90210,90211"}]',
 '', 'Local Pickup', 'delivery', 'hide', NULL),

('Disable COD for Remote States', 'Payment', 'Disables Cash on Delivery (COD) payment option for remote states (e.g. Alaska, Hawaii) to avoid shipping collect risks.',
 '[{"type": "block_states", "operator": "in_states", "value": "AK,HI"}]',
 '', 'Cash on Delivery (COD)', 'payment', 'hide', NULL),

('Disable PayPal for Low Cart Value', 'Payment', 'Disables PayPal payment option if the order total is below $20 to encourage credit card usage on small transactions.',
 '[{"type": "minimum_order_value", "operator": "less_than", "value": "20.00"}]',
 '', 'PayPal', 'payment', 'hide', NULL),

('Disable COD for High Cart Value', 'Payment', 'Disables Cash on Delivery (COD) payment option for orders exceeding $500 to minimize cash collection risks on delivery.',
 '[{"type": "maximum_order_value", "operator": "greater_than", "value": "500.00"}]',
 '', 'Cash on Delivery (COD)', 'payment', 'hide', NULL),

('Rename PayPal for VIP Customers', 'Payment', 'Renames PayPal payment option to ''PayPal (Express VIP Checkout)'' for customers tagged with ''vip''.',
 '[{"type": "customer_tags", "operator": "contains", "value": "vip"}]',
 'PayPal (Express VIP Checkout)', 'PayPal', 'payment', 'rename', NULL),

('Weekend Delivery Surcharge Note', 'Shipping', 'Renames ''Standard Shipping'' to ''Standard Shipping (Includes Weekend Delivery Surcharge)'' during checkout validation.',
 '[{"type": "day_of_week", "operator": "in_days", "value": "Sat,Sun"}]',
 'Standard Shipping (Includes Weekend Delivery Surcharge)', 'Standard Shipping', 'delivery', 'rename', NULL),

('Block Orders with High Weight in Express Shipping', 'Shipping', 'Hides Express Shipping options if the total cart weight exceeds 20kg.',
 '[{"type": "weight_limit", "operator": "greater_than", "value": "20"}]',
 '', 'Express Shipping', 'delivery', 'hide', NULL),

('Require Terms & Conditions Acceptance', 'Checkbox', 'Requires customers to check an explicit box confirming they agree to the store''s Terms of Service and Privacy Policy before checking out.',
 '[]', 'You must accept the Terms of Service to complete your order.', 'purchase.checkout.block.render', 'checkbox', NULL, 'I agree to the Terms of Service and Privacy Policy.'),

('Age 18+ Legal Declaration', 'Checkbox', 'Adds a mandatory checkbox for customers to confirm they are at least 18 years of age for age-restricted items.',
 '[]', 'You must confirm you are 18 years of age or older to proceed.', 'purchase.checkout.block.render', 'checkbox', NULL, 'I confirm I am 18 years of age or older.'),

('Age 21+ Alcohol & Tobacco Verification', 'Checkbox', 'Requires buyers to confirm they are 21 years of age or older to purchase regulated items like alcohol or tobacco.',
 '[]', 'You must be 21 or older to complete checkout for these items.', 'purchase.checkout.block.render', 'checkbox', NULL, 'I verify that I am 21 years of age or older.'),

('Final Sale & Non-Refundable Acknowledgment', 'Checkbox', 'Ensures customers acknowledge that items in their cart are final sale and non-refundable prior to placing the order.',
 '[]', 'Please confirm your acknowledgment of our final sale policy.', 'purchase.checkout.block.render', 'checkbox', NULL, 'I understand that clearance and final sale items cannot be returned or exchanged.'),

('Pre-Order Shipping Timeline Consent', 'Checkbox', 'Requires buyers purchasing pre-order items to confirm they understand the estimated fulfillment timeline.',
 '[]', 'Please confirm you understand the pre-order shipping timeline.', 'purchase.checkout.shipping-option-list.render-after', 'checkbox', NULL, 'I acknowledge that pre-order items ship within 3-4 weeks.'),

('Custom Engraving & Personalization Approval', 'Checkbox', 'Requires customers ordering custom or engraved products to double-check their custom text and spelling before ordering.',
 '[]', 'Please confirm that your personalization options have been reviewed.', 'purchase.checkout.block.render', 'checkbox', NULL, 'I have verified that all custom text, spelling, and options selected are accurate.'),

('Perishable Food Unattended Delivery Consent', 'Checkbox', 'Requires agreement that perishable or frozen items will be refrigerated immediately upon carrier delivery.',
 '[]', 'Please accept the perishable delivery policy before continuing.', 'purchase.checkout.delivery-address.render-after', 'checkbox', NULL, 'I agree to unpack and refrigerate perishable items immediately upon delivery.'),

('Adult Signature Delivery Notice', 'Checkbox', 'Informs buyers that an adult signature is required upon delivery for high-value or restricted parcels.',
 '[]', 'Please confirm you understand the signature delivery requirement.', 'purchase.checkout.shipping-option-list.render-after', 'checkbox', NULL, 'I acknowledge that a physical signature will be required at delivery.'),

('Freight Shipping Curbside Delivery Notice', 'Checkbox', 'Requires acknowledgment of curbside delivery policies and heavy item offloading responsibilities.',
 '[]', 'Please acknowledge the freight curbside delivery terms.', 'purchase.checkout.shipping-option-list.render-after', 'checkbox', NULL, 'I understand freight delivery is curbside only and requires offloading assistance.'),

('B2B Tax-Exempt Resale Declaration', 'Checkbox', 'Requires commercial B2B buyers to verify they hold a valid resale or tax-exempt certificate on file.',
 '[]', 'Please confirm your tax-exempt business purchasing status.', 'purchase.checkout.contact.render-after', 'checkbox', NULL, 'I certify this purchase is for resale or authorized tax-exempt business use.'),

('Digital Downloads Instant Access Waiver', 'Checkbox', 'Waiver of right of withdrawal for instant digital downloads and software keys upon purchase.',
 '[]', 'Please confirm your agreement for immediate digital delivery.', 'purchase.checkout.payment-method-list.render-before', 'checkbox', NULL, 'I consent to immediate access to digital content and waive right to cancel once downloaded.'),

('Transactional SMS Notifications Consent', 'Checkbox', 'Consents to receiving transactional SMS updates and order status alerts regarding their package.',
 '[]', 'Please confirm your agreement for order updates.', 'purchase.checkout.contact.render-after', 'checkbox', NULL, 'I agree to receive transactional order status updates via SMS text message.'),

('Out-of-Stock Item Substitution Consent', 'Checkbox', 'Allows store pickers to substitute comparable products if an ordered item is out of stock.',
 '[]', 'Please indicate whether item substitutions are permitted.', 'purchase.checkout.block.render', 'checkbox', NULL, 'I allow equal-value item substitutions if an ordered product is out of stock.'),

('Customer Assembly Required Disclaimer', 'Checkbox', 'Ensures customers understand that furniture or equipment items arrive flat-packed and require self-assembly.',
 '[]', 'Please confirm you understand assembly is required.', 'purchase.checkout.block.render', 'checkbox', NULL, 'I acknowledge that products in this order require customer assembly.'),

('Minimal Eco-Friendly Packaging Consent', 'Checkbox', 'Consents to consolidated shipping and minimal recyclable packaging to reduce environmental waste.',
 '[]', 'Please indicate your packaging preference.', 'purchase.checkout.block.render', 'checkbox', NULL, 'I opt in to minimal eco-friendly recyclable packaging for my shipment.');
