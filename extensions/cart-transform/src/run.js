// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Operation} Operation
 */

/**
 * @type {FunctionRunResult}
 */
const NO_CHANGES = {
  operations: []
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const metafieldValue = input.cartTransform?.metafield?.value;
  if (!metafieldValue) {
    return NO_CHANGES;
  }

  let rules = [];
  try {
    rules = JSON.parse(metafieldValue);
  } catch (e) {
    return NO_CHANGES;
  }

  if (!Array.isArray(rules) || rules.length === 0) {
    return NO_CHANGES;
  }

  const cart = input.cart;
  const lines = cart?.lines || [];
  if (lines.length === 0) {
    return NO_CHANGES;
  }

  /** @type {Operation[]} */
  const operations = [];

  // Track customer tags if available
  let customerTags = [];
  const customerMetafield = cart.buyerIdentity?.customer?.metafield?.value;
  if (customerMetafield) {
    try {
      const parsed = JSON.parse(customerMetafield);
      if (Array.isArray(parsed.tags)) {
        customerTags = parsed.tags.map(t => String(t).trim().toLowerCase());
      }
    } catch (e) {
      // ignore parsing error
    }
  }

  for (const rule of rules) {
    if (rule.status !== 'active') continue;

    const config = rule.transform_config || rule.discount_config || {};
    const transformType = rule.transform_type || config.transform_type || 'price_override';

    // Verify customer tags requirement if specified
    if (config.required_customer_tags && Array.isArray(config.required_customer_tags) && config.required_customer_tags.length > 0) {
      const matchesTag = config.required_customer_tags.some(tag => customerTags.includes(String(tag).trim().toLowerCase()));
      if (!matchesTag) continue;
    }

    // 1. KIT EXPANSION (expand parent kit into individual component variants)
    if (transformType === 'kit_expansion') {
      const parentVariantId = config.parent_variant_id;
      const components = config.components || []; // Array of { variant_id, quantity, fixed_price }

      if (parentVariantId && Array.isArray(components) && components.length > 0) {
        for (const line of lines) {
          const merchandiseId = line.merchandise?.id;
          if (merchandiseId === parentVariantId) {
            operations.push({
              expand: {
                cartLineId: line.id,
                expandedCartItems: components.map(comp => {
                  const compQty = parseInt(comp.quantity, 10) || 1;
                  const item = {
                    merchandiseId: comp.variant_id,
                    quantity: compQty * line.quantity
                  };
                  if (comp.fixed_price !== undefined && comp.fixed_price !== null && comp.fixed_price !== "") {
                    item.price = {
                      adjustment: {
                        fixedPricePerUnit: {
                          amount: parseFloat(comp.fixed_price).toFixed(2)
                        }
                      }
                    };
                  }
                  return item;
                })
              }
            });
          }
        }
      }
    }

    // 2. LINE ITEM PRICE OVERRIDE (update unit price natively in cart/checkout)
    else if (transformType === 'price_override') {
      const targetVariantIds = config.target_variant_ids || (config.parent_variant_id ? [config.parent_variant_id] : []);
      const overridePriceVal = parseFloat(config.override_price !== undefined ? config.override_price : rule.discount_value);

      if (!isNaN(overridePriceVal) && targetVariantIds.length > 0) {
        for (const line of lines) {
          const merchandiseId = line.merchandise?.id;
          if (targetVariantIds.includes(merchandiseId)) {
            const updateOp = {
              cartLineId: line.id,
              price: {
                adjustment: {
                  fixedPricePerUnit: {
                    amount: overridePriceVal.toFixed(2)
                  }
                }
              }
            };
            if (config.custom_title) {
              updateOp.title = config.custom_title;
            }
            operations.push({
              update: updateOp
            });
          }
        }
      }
    }

    // 3. PRODUCT BUNDLING (merge component lines into a parent bundle line item)
    else if (transformType === 'bundling') {
      const parentVariantId = config.parent_variant_id;
      const componentVariantIds = config.component_variant_ids || [];
      const bundlePriceVal = parseFloat(config.bundle_price);

      if (parentVariantId && Array.isArray(componentVariantIds) && componentVariantIds.length > 0) {
        const matchedLines = lines.filter(line => componentVariantIds.includes(line.merchandise?.id));
        
        // Ensure all components required for the bundle are present in the cart
        if (matchedLines.length === componentVariantIds.length) {
          const mergeOp = {
            parentVariantId: parentVariantId,
            cartLines: matchedLines.map(line => ({
              cartLineId: line.id,
              quantity: line.quantity
            }))
          };
          if (!isNaN(bundlePriceVal)) {
            mergeOp.price = {
              adjustment: {
                fixedPricePerUnit: {
                  amount: bundlePriceVal.toFixed(2)
                }
              }
            };
          }
          if (config.bundle_title) {
            mergeOp.title = config.bundle_title;
          }
          operations.push({
            merge: mergeOp
          });
        }
      }
    }
  }

  return {
    operations
  };
}
