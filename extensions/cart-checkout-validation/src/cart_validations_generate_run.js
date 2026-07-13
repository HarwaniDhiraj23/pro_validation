// @ts-check

/**
 * @typedef {import("../generated/api").CartValidationsGenerateRunInput} CartValidationsGenerateRunInput
 * @typedef {import("../generated/api").CartValidationsGenerateRunResult} CartValidationsGenerateRunResult
 */

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {CartValidationsGenerateRunResult}
 */
export function cartValidationsGenerateRun(input) {
  const errors = [];
  
  // 1. Get rules metafield
  const rulesMetafield = input.validation?.metafield?.value;
  if (!rulesMetafield) {
    return { operations: [] };
  }

  let rules = [];
  try {
    rules = JSON.parse(rulesMetafield);
  } catch (e) {
    console.error("Failed to parse rules metafield JSON:", e);
    return { operations: [] };
  }

  if (!Array.isArray(rules) || rules.length === 0) {
    return { operations: [] };
  }

  // Only evaluate validation rules when the buyer is completing checkout (submitting the order).
  // This is the official Shopify-recommended practice to prevent blocking "add to cart" actions (CART_INTERACTION)
  // and login redirections (CHECKOUT_INTERACTION).
  const step = input.buyerJourney?.step;
  if (step !== "CHECKOUT_COMPLETION") {
    return { operations: [] };
  }

  for (const rule of rules) {
    if (rule.status !== "active") continue;
    if (rule.warning_banner === true || rule.warning_banner === "true") {
      // Soft warnings are handled solely by the Checkout UI Extension banner, not blocking the backend completion.
      continue;
    }
    
    // Check schedule rules if set
    if (rule.schedule_start || rule.schedule_end) {
      // Note: Shopify Functions run sandboxed without a system clock (new Date() returns 1970 or throws)
      // Thus, schedules must be activated/deactivated from the database backend.
      // But we can check if it is active.
    }

    const isTriggered = evaluateRule(rule, input);
    if (isTriggered) {
      // Prepend custom emoji icons
      let titlePrefix = "";
      const iconName = rule.custom_icon === "default" || !rule.custom_icon ? "critical" : rule.custom_icon;
      switch (iconName) {
        case "none": titlePrefix = ""; break;
        case "lock": titlePrefix = "🔒 "; break;
        case "delivery": titlePrefix = "🚚 "; break;
        case "payment": titlePrefix = "💳 "; break;
        case "calendar": titlePrefix = "📅 "; break;
        case "info": titlePrefix = "ℹ️ "; break;
        case "warning": titlePrefix = "⚠️ "; break;
        case "critical": titlePrefix = "🚨 "; break;
        case "success": titlePrefix = "✅ "; break;
        default: titlePrefix = "";
      }

      let errorMsg = titlePrefix + (rule.error_message || "Checkout is blocked by validation rules.");
      if (rule.guidance_message) {
        errorMsg += "\n" + rule.guidance_message;
      }

      let errorTarget = rule.error_target || "$.cart";
      // Shift global cart errors to the first line item for unauthenticated buyers to avoid locking the email/login form
      if (errorTarget === "$.cart" && !input.cart?.buyerIdentity?.isAuthenticated && input.cart?.lines?.[0]?.merchandise?.id) {
        errorTarget = "$.cart.lines[0].quantity";
      }
      errors.push({
        message: errorMsg,
        target: errorTarget,
      });
    }
  }

  return {
    operations: [
      {
        validationAdd: {
          errors,
        },
      },
    ],
  };
}

function evaluateRule(rule, cartInput) {
  const { conditions, conditions_operator = "AND" } = rule;
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return false;
  }

  const results = conditions.map(cond => {
    try {
      return evaluateCondition(cond, cartInput);
    } catch (e) {
      return false;
    }
  });

  if (conditions_operator === "OR") {
    return results.some(r => r === true);
  } else {
    return results.every(r => r === true);
  }
}

function evaluateCondition(cond, cartInput) {
  const cart = cartInput?.cart || {};
  const buyerIdentity = cart.buyerIdentity || {};
  const customer = buyerIdentity.customer || {};
  const lines = cart.lines || [];
  
  // Get shipping address details
  const shippingAddress = cart.deliveryGroups?.[0]?.deliveryAddress || {};

  // Parse customer metadata
  const customerMetaVal = customer.metafield?.value;
  let customerTags = [];
  let customerAge = null;
  if (customerMetaVal) {
    try {
      const parsed = JSON.parse(customerMetaVal);
      customerTags = parsed.tags || [];
      customerAge = parsed.age || null;
    } catch (e) {}
  }

  switch (cond.type) {
    case "customer_tags": {
      const val = (cond.value || "").toLowerCase().trim();
      const hasTag = customerTags.some(t => t.toLowerCase() === val);
      return cond.operator === "contains" ? hasTag : !hasTag;
    }

    case "login_required": {
      const isGuest = !buyerIdentity.isAuthenticated;
      return cond.operator === "is_guest" ? isGuest : !isGuest;
    }

    case "b2b_only": {
      const isNotB2B = !buyerIdentity.purchasingCompany;
      return cond.operator === "is_not_b2b" ? isNotB2B : !isNotB2B;
    }

    case "guest_checkout_restriction": {
      const isGuest = !buyerIdentity.isAuthenticated;
      return isGuest;
    }

    case "customer_age": {
      if (customerAge === null || customerAge === undefined) return false;
      const age = parseInt(customerAge);
      if (isNaN(age)) return false;
      const limit = parseInt(cond.value || "18");
      return cond.operator === "under_age" ? age < limit : age >= limit;
    }

    case "shipping_address_pobox": {
      const addr1 = (shippingAddress.address1 || "").toLowerCase();
      const addr2 = (shippingAddress.address2 || "").toLowerCase();
      const poBoxRegex = /\b(p\s*o\s*box|post\s*office\s*box|p\.?\s*o\.?\s*box)\b/i;
      const isPoBox = poBoxRegex.test(addr1) || poBoxRegex.test(addr2);
      return cond.operator === "is_pobox" ? isPoBox : !isPoBox;
    }

    case "block_states": {
      const state = (shippingAddress.provinceCode || "").toUpperCase().trim();
      const blocked = (cond.value || "").toUpperCase().split(",").map(s => s.trim());
      const inStates = blocked.includes(state);
      return cond.operator === "in_states" ? inStates : !inStates;
    }

    case "block_countries": {
      const country = (shippingAddress.countryCode || "").toUpperCase().trim();
      const blocked = (cond.value || "").toUpperCase().split(",").map(c => c.trim());
      const inCountries = blocked.includes(country);
      return cond.operator === "in_countries" ? inCountries : !inCountries;
    }

    case "block_zipcodes": {
      const zip = (shippingAddress.zip || "").toLowerCase().trim();
      const blocked = (cond.value || "").toLowerCase().split(",").map(z => z.trim());
      const inZips = blocked.some(z => zip.startsWith(z));
      return cond.operator === "in_zips" ? inZips : !inZips;
    }

    case "address_regex": {
      const addr = (shippingAddress.address1 || "") + " " + (shippingAddress.address2 || "");
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

    case "restricted_collections": {
      const restrictedCollIds = (cond.value || "").split(",").map(c => c.trim());
      const hasItem = lines.some(line => {
        const prodMetaVal = line.merchandise?.product?.metafield?.value || "";
        let collectionsList = [];
        try {
          const parsed = JSON.parse(prodMetaVal);
          collectionsList = parsed.collections || [];
        } catch (e) {
          // Fallback to comma-separated list if string
          collectionsList = prodMetaVal.split(",").map(c => c.trim());
        }
        return collectionsList.some(c => restrictedCollIds.includes(c));
      });
      return cond.operator === "in_collections" ? hasItem : !hasItem;
    }

    case "restricted_vendors": {
      const restrictedVendors = (cond.value || "").toLowerCase().split(",").map(v => v.trim());
      const hasItem = lines.some(line => {
        const prod = line.merchandise?.product || {};
        let vendor = (prod.vendor || "").toLowerCase();
        const prodMetaVal = prod.metafield?.value;
        if (prodMetaVal) {
          try {
            const parsed = JSON.parse(prodMetaVal);
            if (parsed.vendor) vendor = parsed.vendor.toLowerCase();
          } catch (e) {}
        }
        return restrictedVendors.includes(vendor);
      });
      return cond.operator === "in_vendors" ? hasItem : !hasItem;
    }

    case "product_combinations": {
      const restrictedProds = (cond.value || "").split(",").map(p => p.trim());
      if (restrictedProds.length < 2) return false;
      const cartProdIds = lines.map(line => line.merchandise?.product?.id || "");
      const containsAll = restrictedProds.every(p => cartProdIds.includes(p));
      return containsAll;
    }

    case "has_hazardous_item": {
      const hasItem = lines.some(line => {
        const prodMetaVal = line.merchandise?.product?.metafield?.value;
        if (prodMetaVal) {
          try {
            const parsed = JSON.parse(prodMetaVal);
            const tags = parsed.tags || [];
            return tags.some(t => t.toLowerCase() === "hazardous" || t.toLowerCase() === "hazmat");
          } catch (e) {}
        }
        return false;
      });
      return cond.operator === "equals" ? hasItem : !hasItem;
    }

    case "has_subscription": {
      const hasSub = lines.some(line => line.sellingPlanAllocation !== null && line.sellingPlanAllocation !== undefined);
      return cond.operator === "equals" ? hasSub : !hasSub;
    }

    case "minimum_order_value": {
      const subtotal = parseFloat(cart.cost?.subtotalAmount?.amount || 0);
      const val = parseFloat(cond.value || 0);
      return cond.operator === "less_than" ? subtotal < val : subtotal >= val;
    }

    case "maximum_order_value": {
      const subtotal = parseFloat(cart.cost?.subtotalAmount?.amount || 0);
      const val = parseFloat(cond.value || 0);
      return cond.operator === "greater_than" ? subtotal > val : subtotal <= val;
    }

    case "quantity_limit": {
      const totalQty = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
      const limit = parseInt(cond.value || 0);
      return cond.operator === "greater_than" ? totalQty > limit : totalQty <= limit;
    }

    case "weight_limit": {
      const totalWeight = lines.reduce((sum, line) => {
        const itemWeight = parseFloat(line.merchandise?.weight || 0);
        return sum + (itemWeight * (line.quantity || 0));
      }, 0);
      const limit = parseFloat(cond.value || 0);
      return cond.operator === "greater_than" ? totalWeight > limit : totalWeight <= limit;
    }

    case "sku_limit": {
      const totalSKUs = lines.filter(line => line.merchandise?.sku).length;
      const limit = parseInt(cond.value || 0);
      return cond.operator === "greater_than" ? totalSKUs > limit : totalSKUs <= limit;
    }

    default:
      return false;
  }
}