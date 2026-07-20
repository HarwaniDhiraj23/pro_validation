// Pure JS rule evaluator, reusable in Node/Shopify Function/Frontend simulations
export function evaluateRule(rule, cartInput) {
  if (rule.rule_type === "checkbox") {
    return false;
  }
  const { conditions, conditions_operator = "AND" } = rule;
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return false;
  }

  const results = conditions.map(cond => {
    try {
      return evaluateCondition(cond, cartInput);
    } catch (e) {
      console.warn("Error evaluating condition:", e, cond);
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
  const shippingAddress = cart.shippingAddress || 
    cart.deliveryGroups?.[0]?.deliveryAddress || 
    cart.billingAddress || {};

  switch (cond.type) {
    case "customer_tags": {
      const tags = customer.tags || [];
      const val = (cond.value || "").toLowerCase().trim();
      const hasTag = tags.some(t => t.toLowerCase() === val);
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
      // Age can be stored in a metafield or tag (e.g. "age:20" or "birthdate:2000-01-01")
      // Let's check tags first
      let age = null;
      const tags = customer.tags || [];
      const ageTag = tags.find(t => t.toLowerCase().startsWith("age:"));
      if (ageTag) {
        age = parseInt(ageTag.split(":")[1]);
      } else {
        // Fallback check metafield
        const birthdateMeta = customer.metafield?.value;
        if (birthdateMeta) {
          const birthDate = new Date(birthdateMeta);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }
        }
      }
      if (age === null) return true; // If age is not set, we restrict just in case or allow? Typically block if underage
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
        const regex = new RegExp(cond.value || "", "i");
        const matches = regex.test(addr);
        return cond.operator === "matches_regex" ? matches : !matches;
      } catch (err) {
        return false;
      }
    }

    case "restricted_collections": {
      // Check if product is in collection IDs
      // Standard metafields/hasAnyCollection membership check
      const restrictedCollIds = (cond.value || "").split(",").map(c => c.trim());
      const hasItem = lines.some(line => {
        const product = line.merchandise?.product || {};
        // collections or inAnyCollection check
        const colls = product.collections || [];
        return colls.some(c => restrictedCollIds.includes(c.id || c));
      });
      return cond.operator === "in_collections" ? hasItem : !hasItem;
    }

    case "restricted_vendors": {
      const restrictedVendors = (cond.value || "").toLowerCase().split(",").map(v => v.trim());
      const hasItem = lines.some(line => {
        const vendor = (line.merchandise?.product?.vendor || "").toLowerCase();
        return restrictedVendors.includes(vendor);
      });
      return cond.operator === "in_vendors" ? hasItem : !hasItem;
    }

    case "product_combinations": {
      // Restrict specific products being in the same cart
      // Value format: "prod_id_A,prod_id_B"
      const restrictedProds = (cond.value || "").split(",").map(p => p.trim());
      if (restrictedProds.length < 2) return false;
      const cartProdIds = lines.map(line => line.merchandise?.product?.id || line.merchandise?.product);
      const containsAll = restrictedProds.every(p => cartProdIds.includes(p));
      return containsAll;
    }

    case "has_hazardous_item": {
      const restrictedProds = (cond.value || "").split(",").map(p => p.trim()).filter(Boolean);
      const isHaz = lines.some(line => {
        const prod = line.merchandise?.product || {};
        const prodId = prod.id || prod;
        if (restrictedProds.length > 0 && restrictedProds.includes(prodId)) {
          return true;
        }
        const tags = prod.tags || [];
        return tags.some(t => t.toLowerCase() === "hazardous" || t.toLowerCase() === "hazmat");
      });
      return cond.operator === "equals" ? isHaz : !isHaz;
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
