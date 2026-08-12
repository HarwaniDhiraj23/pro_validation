// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Target} Target
 * @typedef {import("../generated/api").Value} Value
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: "MAXIMUM",
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const metafieldValue = input.discountNode?.metafield?.value;
  if (!metafieldValue) {
    return EMPTY_DISCOUNT;
  }

  let rules = [];
  try {
    rules = JSON.parse(metafieldValue);
  } catch (e) {
    return EMPTY_DISCOUNT;
  }

  if (!Array.isArray(rules) || rules.length === 0) {
    return EMPTY_DISCOUNT;
  }

  const cart = input.cart;
  const lines = cart.lines || [];
  const subtotal = parseFloat(cart.cost?.subtotalAmount?.amount || "0");
  const currencyCode = cart.cost?.subtotalAmount?.currencyCode || "USD";

  // Parse customer metadata tags if available
  let customerTags = [];
  const customerMetafield = cart.buyerIdentity?.customer?.metafield?.value;
  if (customerMetafield) {
    try {
      const parsed = JSON.parse(customerMetafield);
      if (Array.isArray(parsed.tags)) {
        customerTags = parsed.tags.map(t => String(t).trim().toLowerCase());
      }
    } catch (e) {
      // ignore
    }
  }

  const discounts = [];

  for (const rule of rules) {
    if (rule.status !== 'active') continue;

    const discountType = rule.discount_type || 'percentage';
    const config = rule.discount_config || {};
    const title = rule.title || "Special Discount";

    // 1. Evaluate Customer Tag Conditions if specified
    if (config.required_customer_tags && Array.isArray(config.required_customer_tags) && config.required_customer_tags.length > 0) {
      const matchesTag = config.required_customer_tags.some(tag => customerTags.includes(String(tag).trim().toLowerCase()));
      if (!matchesTag) continue;
    }

    // 2. TIERED SPEND DISCOUNT
    if (discountType === 'tiered' && Array.isArray(config.tiered_brackets)) {
      // Sort brackets by spend_threshold descending to find the highest qualifying tier
      const sortedBrackets = [...config.tiered_brackets].sort((a, b) => (parseFloat(b.spend_threshold) || 0) - (parseFloat(a.spend_threshold) || 0));
      const matchedBracket = sortedBrackets.find(b => subtotal >= (parseFloat(b.spend_threshold) || 0));

      if (matchedBracket) {
        const percentVal = parseFloat(matchedBracket.discount_percent || 0);
        const amountVal = parseFloat(matchedBracket.discount_amount || 0);

        const targets = lines.map(line => ({ productVariant: { id: line.merchandise.id } }));
        if (targets.length > 0) {
          if (percentVal > 0) {
            discounts.push({
              targets,
              value: { percentage: { value: percentVal.toFixed(1) } },
              message: `${title} (${percentVal}% off spend tier)`
            });
          } else if (amountVal > 0) {
            discounts.push({
              targets,
              value: { fixedAmount: { amount: amountVal.toFixed(2) } },
              message: `${title} ($${amountVal.toFixed(2)} off spend tier)`
            });
          }
        }
      }
    }

    // 3. VOLUME / QUANTITY PRICING
    else if (discountType === 'volume' && Array.isArray(config.volume_brackets)) {
      // Check each cart line quantity or total quantity
      const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
      const sortedBrackets = [...config.volume_brackets].sort((a, b) => (parseInt(b.min_qty, 10) || 0) - (parseInt(a.min_qty, 10) || 0));

      const matchedBracket = sortedBrackets.find(b => {
        const minQty = parseInt(b.min_qty, 10) || 0;
        const maxQty = parseInt(b.max_qty, 10) || Infinity;
        const evalQty = config.apply_per_line ? 0 : totalQty;
        return evalQty >= minQty && evalQty <= maxQty;
      });

      if (matchedBracket) {
        const percentVal = parseFloat(matchedBracket.discount_percent || 0);
        const amountVal = parseFloat(matchedBracket.discount_amount || 0);
        const targets = lines.map(line => ({ productVariant: { id: line.merchandise.id } }));

        if (targets.length > 0) {
          if (percentVal > 0) {
            discounts.push({
              targets,
              value: { percentage: { value: percentVal.toFixed(1) } },
              message: `${title} (${percentVal}% Volume Savings)`
            });
          } else if (amountVal > 0) {
            discounts.push({
              targets,
              value: { fixedAmount: { amount: amountVal.toFixed(2) } },
              message: `${title} ($${amountVal.toFixed(2)} Volume Savings)`
            });
          }
        }
      }
    }

    // 4. CUSTOM BOGO LOGIC (Buy X Get Y)
    else if (discountType === 'bogo' && config.bogo_config) {
      const bogo = config.bogo_config;
      const buyProductIds = bogo.buy_product_ids || [];
      const buyQtyNeeded = parseInt(bogo.buy_qty, 10) || 1;
      const getProductIds = bogo.get_product_ids || [];
      const getDiscountPercent = parseFloat(bogo.get_discount_percent) || 100.0;

      // Count buy items in cart
      let buyCount = 0;
      lines.forEach(line => {
        const prodId = line.merchandise?.product?.id;
        if (buyProductIds.length === 0 || buyProductIds.includes(prodId)) {
          buyCount += line.quantity;
        }
      });

      if (buyCount >= buyQtyNeeded) {
        // Find target get lines
        const targetLines = lines.filter(line => {
          const prodId = line.merchandise?.product?.id;
          return getProductIds.length === 0 || getProductIds.includes(prodId);
        });

        if (targetLines.length > 0) {
          const targets = targetLines.map(line => ({ productVariant: { id: line.merchandise.id } }));
          discounts.push({
            targets,
            value: { percentage: { value: getDiscountPercent.toFixed(1) } },
            message: `${title} (BOGO ${getDiscountPercent}% Off)`
          });
        }
      }
    }

    // 5. CUSTOMER TAG OR PERCENTAGE/FIXED DISCOUNT
    else if (discountType === 'customer_tag' || discountType === 'percentage' || discountType === 'fixed_amount') {
      const val = parseFloat(rule.discount_value || config.discount_value || "0");
      if (val > 0) {
        const targets = lines.map(line => ({ productVariant: { id: line.merchandise.id } }));
        if (targets.length > 0) {
          if (discountType === 'fixed_amount') {
            discounts.push({
              targets,
              value: { fixedAmount: { amount: val.toFixed(2) } },
              message: title
            });
          } else {
            discounts.push({
              targets,
              value: { percentage: { value: val.toFixed(1) } },
              message: title
            });
          }
        }
      }
    }
  }

  if (discounts.length === 0) {
    return EMPTY_DISCOUNT;
  }

  return {
    discountApplicationStrategy: "MAXIMUM",
    discounts
  };
}
