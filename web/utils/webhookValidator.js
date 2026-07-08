/**
 * Evaluates validation rules against a checkout webhook payload
 * to determine if it would be blocked by any active rules.
 */
export function validateCheckoutPayload(checkout, rules) {
  const shippingAddress = checkout.shipping_address || {};
  const customer = checkout.customer || {};
  const isGuest = !checkout.customer || checkout.customer.state !== "enabled";
  const lineItems = checkout.line_items || [];
  const subtotal = parseFloat(checkout.subtotal_price || checkout.total_line_items_price || 0);

  for (const rule of rules) {
    if (rule.status !== "active") continue;

    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
    if (conditions.length === 0) continue;

    const op = rule.conditions_operator || "AND";
    const results = conditions.map(cond => {
      try {
        return evaluateCondition(cond, {
          shippingAddress,
          customer,
          isGuest,
          lineItems,
          subtotal
        });
      } catch (e) {
        return false;
      }
    });

    const isTriggered = op === "OR" 
      ? results.some(r => r === true)
      : results.every(r => r === true);

    if (isTriggered) {
      return rule; // Returns the first rule that triggers a block
    }
  }

  return null;
}

function evaluateCondition(cond, data) {
  const { shippingAddress, customer, isGuest, lineItems, subtotal } = data;

  switch (cond.type) {
    case "login_required":
    case "guest_checkout_restriction":
      return isGuest;

    case "customer_age": {
      // Typically age isn't directly on checkout payload unless stored in customer metafields.
      // We'll return false to be safe unless customer has age info.
      return false;
    }

    case "shipping_address_pobox": {
      const addr1 = (shippingAddress.address1 || shippingAddress.address_1 || "").toLowerCase();
      const addr2 = (shippingAddress.address2 || shippingAddress.address_2 || "").toLowerCase();
      const poBoxRegex = /\b(p\s*o\s*box|post\s*office\s*box|p\.?\s*o\.?\s*box)\b/i;
      const isPoBox = poBoxRegex.test(addr1) || poBoxRegex.test(addr2);
      return cond.operator === "is_pobox" ? isPoBox : !isPoBox;
    }

    case "block_states": {
      const state = (shippingAddress.province_code || shippingAddress.provinceCode || "").toUpperCase().trim();
      const blocked = (cond.value || "").toUpperCase().split(",").map(s => s.trim());
      const inStates = blocked.includes(state);
      return cond.operator === "in_states" ? inStates : !inStates;
    }

    case "block_countries": {
      const country = (shippingAddress.country_code || shippingAddress.countryCode || "").toUpperCase().trim();
      const blocked = (cond.value || "").toUpperCase().split(",").map(c => c.trim());
      const inCountries = blocked.includes(country);
      return cond.operator === "in_countries" ? inCountries : !inCountries;
    }

    case "block_zipcodes": {
      const zip = (shippingAddress.zip || shippingAddress.zip_code || "").toLowerCase().trim();
      const blocked = (cond.value || "").toLowerCase().split(",").map(z => z.trim());
      const inZips = blocked.some(z => zip.startsWith(z));
      return cond.operator === "in_zips" ? inZips : !inZips;
    }

    case "address_regex": {
      const addr = (shippingAddress.address1 || shippingAddress.address_1 || "") + " " + (shippingAddress.address2 || shippingAddress.address_2 || "");
      try {
        let pattern = cond.value || "";
        // Strip out PCRE inline modifiers like (?i) which JavaScript RegExp does not support
        if (pattern.startsWith("(?i)")) {
          pattern = pattern.substring(4);
        }
        const regex = new RegExp(pattern, "i");
        const matches = regex.test(addr);
        return cond.operator === "matches_regex" ? matches : !matches;
      } catch (err) {
        return false;
      }
    }

    case "customer_tags": {
      const tags = (customer.tags || "").split(",").map(t => t.trim().toLowerCase());
      const condTags = (cond.value || "").split(",").map(t => t.trim().toLowerCase());
      const hasTag = condTags.some(t => tags.includes(t));
      return cond.operator === "contains" ? hasTag : !hasTag;
    }

    case "minimum_order_value": {
      const val = parseFloat(cond.value || 0);
      return cond.operator === "less_than" ? subtotal < val : subtotal >= val;
    }

    case "maximum_order_value": {
      const val = parseFloat(cond.value || 0);
      return cond.operator === "greater_than" ? subtotal > val : subtotal <= val;
    }

    case "quantity_limit": {
      const totalQty = lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const limit = parseInt(cond.value || 0);
      return cond.operator === "greater_than" ? totalQty > limit : totalQty <= limit;
    }

    case "weight_limit": {
      const totalWeight = lineItems.reduce((sum, item) => {
        // Grams to kilograms conversion if grams is present
        const itemWeight = parseFloat(item.grams || 0) / 1000.0;
        return sum + (itemWeight * (item.quantity || 0));
      }, 0);
      const limit = parseFloat(cond.value || 0);
      return cond.operator === "greater_than" ? totalWeight > limit : totalWeight <= limit;
    }

    case "sku_limit": {
      const totalSKUs = lineItems.filter(item => item.sku).length;
      const limit = parseInt(cond.value || 0);
      return cond.operator === "greater_than" ? totalSKUs > limit : totalSKUs <= limit;
    }

    case "restricted_collections": {
      const cleanId = id => id.includes("gid://") ? id.split("/").pop() : id;
      const restrictedCollIds = (cond.value || "").split(",").map(c => cleanId(c.trim()));
      
      const hasItem = lineItems.some(item => {
        // Shopify checkout line items can have collection details depending on payload version
        // We look for collection lists or matching collection IDs
        const itemCollections = (item.collection_ids || item.collections || []).map(c => cleanId(String(c.id || c)));
        return itemCollections.some(c => restrictedCollIds.includes(c));
      });
      return cond.operator === "in_collections" ? hasItem : !hasItem;
    }

    case "restricted_vendors": {
      const restrictedVendors = (cond.value || "").toLowerCase().split(",").map(v => v.trim());
      const hasItem = lineItems.some(item => restrictedVendors.includes((item.vendor || "").toLowerCase()));
      return cond.operator === "in_vendors" ? hasItem : !hasItem;
    }

    case "product_combinations": {
      const cleanId = id => id.includes("gid://") ? id.split("/").pop() : id;
      const restrictedProds = (cond.value || "").split(",").map(p => cleanId(p.trim()));
      if (restrictedProds.length < 2) return false;
      const cartProdIds = lineItems.map(item => cleanId(String(item.product_id || item.product?.id || "")));
      const containsAll = restrictedProds.every(p => cartProdIds.includes(p));
      return containsAll;
    }

    case "has_hazardous_item": {
      const hasItem = lineItems.some(item => {
        const tags = (item.properties || []).map(p => String(p.name || p.key || "").toLowerCase());
        const title = (item.title || "").toLowerCase();
        return tags.includes("hazardous") || tags.includes("hazmat") || title.includes("hazardous") || title.includes("hazmat");
      });
      return cond.operator === "equals" ? hasItem : !hasItem;
    }

    case "has_subscription": {
      const hasSub = lineItems.some(item => item.selling_plan_allocation !== null && item.selling_plan_allocation !== undefined);
      return cond.operator === "equals" ? hasSub : !hasSub;
    }

    case "b2b_only": {
      // B2B checkouts typically contain a company name or company ID in the checkout payload
      const isNotB2B = !checkout.company || !checkout.company.id;
      return cond.operator === "is_not_b2b" ? isNotB2B : !isNotB2B;
    }

    default:
      return false;
  }
}
