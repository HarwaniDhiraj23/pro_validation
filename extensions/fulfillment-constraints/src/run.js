// @ts-check

/**
 * @typedef {Object} RunInput
 * @typedef {Object} FulfillmentConstraintsGenerateResult
 */

/**
 * @param {any} input
 * @returns {any}
 */
export function run(input) {
  const operations = [];

  const rulesMetafield = input.shop?.metafield?.value;
  console.log("fulfillment-constraints: rulesMetafield =", rulesMetafield);
  console.log("fulfillment-constraints: cart =", JSON.stringify(input.cart));

  if (!rulesMetafield) {
    return { operations: [] };
  }

  let rules = [];
  try {
    rules = JSON.parse(rulesMetafield);
  } catch (e) {
    console.error("Failed to parse fulfillment rules metafield JSON:", e);
    return { operations: [] };
  }

  if (!Array.isArray(rules) || rules.length === 0) {
    return { operations: [] };
  }

  const lines = input.cart?.lines || [];
  if (lines.length === 0) {
    return { operations: [] };
  }

  for (const rule of rules) {
    if (rule.status !== "active") continue;

    // Evaluate rule condition against the cart
    const isTriggered = evaluateRule(rule, input);
    if (!isTriggered) continue;

    const action = rule.fulfillment_action || "require_location";
    let config = rule.fulfillment_config || {};
    if (typeof config === "string") {
      try {
        config = JSON.parse(config);
      } catch (e) {
        config = {};
      }
    }

    const locationIds = config.location_ids || [];
    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      continue;
    }

    const locationRefs = locationIds.map(id => ({ id }));
    const lineIds = lines.map(l => l.id);

    if (action === "require_location" || action === "prefer_location") {
      operations.push({
        attributeConstraint: {
          cartLineIds: lineIds,
          mustFulfillFrom: locationRefs,
        },
      });
    } else if (action === "restrict_location") {
      operations.push({
        attributeConstraint: {
          cartLineIds: lineIds,
          cannotFulfillFrom: locationRefs,
        },
      });
    }
  }

  console.log("fulfillment-constraints: final operations =", JSON.stringify(operations));
  return {
    operations,
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
      console.error(`fulfillment-constraints: error evaluating condition type=${cond.type}:`, e);
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
  const cart = cartInput.cart || {};
  const lines = cart.lines || [];
  const buyer = cart.buyerIdentity || {};
  const customer = buyer.customer || {};

  let customerTags = [];
  if (customer.metafield?.value) {
    try {
      const meta = JSON.parse(customer.metafield.value);
      if (Array.isArray(meta.tags)) {
        customerTags = meta.tags;
      }
    } catch (e) {}
  }

  const address = (cart.deliveryGroups && cart.deliveryGroups[0] && cart.deliveryGroups[0].deliveryAddress) || {};

  switch (cond.type) {
    case "has_hazardous_item": {
      const isHazardous = lines.some(line => {
        const metadataStr = line.merchandise?.product?.metafield?.value;
        if (!metadataStr) return false;
        try {
          const meta = JSON.parse(metadataStr);
          return meta.is_hazardous === true || meta.hazardous === true;
        } catch (e) {
          return false;
        }
      });
      return cond.value === "true" ? isHazardous : !isHazardous;
    }

    case "weight_limit": {
      const totalWeight = lines.reduce((acc, line) => {
        const w = line.merchandise?.weight || 0;
        return acc + (w * (line.quantity || 1));
      }, 0);
      const limit = parseFloat(cond.value) || 0;
      if (cond.operator === "greater_than") return totalWeight > limit;
      if (cond.operator === "less_than") return totalWeight < limit;
      return false;
    }

    case "block_states": {
      const states = (cond.value || "").toUpperCase().split(",").map(s => s.trim());
      const stateCode = (address.provinceCode || "").toUpperCase();
      if (cond.operator === "in_states") {
        return states.includes(stateCode);
      }
      if (cond.operator === "not_in_states") {
        return !states.includes(stateCode);
      }
      return false;
    }

    case "block_countries": {
      const countries = (cond.value || "").toUpperCase().split(",").map(c => c.trim());
      const countryCode = (address.countryCode || "").toUpperCase();
      if (cond.operator === "in_countries") {
        return countries.includes(countryCode);
      }
      if (cond.operator === "not_in_countries") {
        return countryCode.length > 0 && !countries.includes(countryCode);
      }
      return false;
    }

    case "customer_tags": {
      const requiredTags = (cond.value || "").toLowerCase().split(",").map(t => t.trim());
      const userTagsLower = customerTags.map(t => t.toLowerCase());
      if (cond.operator === "contains") {
        return requiredTags.some(rt => userTagsLower.includes(rt));
      }
      if (cond.operator === "not_contains") {
        return !requiredTags.some(rt => userTagsLower.includes(rt));
      }
      return false;
    }

    default:
      return false;
  }
}
