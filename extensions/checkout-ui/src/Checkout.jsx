import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [showErrors, setShowErrors] = useState(false);
  const [checkedStates, setCheckedStates] = useState({});

  // 2. Fetch stateful values from the shopify context
  const lines = shopify.lines?.value || [];
  const shippingAddress = shopify.shippingAddress?.value || {};
  const buyerIdentity = shopify.buyerIdentity?.value || {};
  const cost = shopify.cost?.value || {};
  const appMetafields = shopify.appMetafields?.value || [];

  const cartState = { lines, shippingAddress, buyerIdentity, cost };
  const currentTarget = shopify.extension.target;
  const isBlockTarget = currentTarget === "purchase.checkout.block.render";

  // 3. Load synced validation, delivery, and payment rules from the Shop metafields
  const rulesMetafield = appMetafields.find(
    (m) =>
      m.target?.type === "shop" &&
      m.metafield?.namespace === "cart-validation" &&
      m.metafield?.key === "rules"
  );
  const deliveryRulesMetafield = appMetafields.find(
    (m) =>
      m.target?.type === "shop" &&
      m.metafield?.namespace === "cart-validation" &&
      m.metafield?.key === "delivery-rules"
  );
  const paymentRulesMetafield = appMetafields.find(
    (m) =>
      m.target?.type === "shop" &&
      m.metafield?.namespace === "cart-validation" &&
      m.metafield?.key === "payment-rules"
  );

  let activeRules = [];
  try {
    if (rulesMetafield?.metafield?.value) {
      activeRules = activeRules.concat(JSON.parse(rulesMetafield.metafield.value));
    }
    if (deliveryRulesMetafield?.metafield?.value) {
      activeRules = activeRules.concat(JSON.parse(deliveryRulesMetafield.metafield.value));
    }
    if (paymentRulesMetafield?.metafield?.value) {
      activeRules = activeRules.concat(JSON.parse(paymentRulesMetafield.metafield.value));
    }
  } catch (e) {
    console.error("[Checkout UI] Error parsing rules:", e);
  }

  // Filter checkbox rules matching this target
  const matchingCheckboxRules = activeRules.filter(
    (rule) =>
      rule.rule_type === "checkbox" &&
      rule.status === "active" &&
      rule.error_target === currentTarget &&
      (!rule.conditions || !Array.isArray(rule.conditions) || rule.conditions.length === 0 || evaluateRule(rule, cartState))
  );

  // Track the last state snapshot seen by the intercept to distinguish reactive
  // re-validations (address/country updates) from actual Pay Now submissions.
  const isInitialIntercept = useRef(true);
  const lastStateSnapshot = useRef(null);
  const stateRef = useRef({ activeRules, cartState, matchingCheckboxRules, checkedStates });
  stateRef.current = { activeRules, cartState, matchingCheckboxRules, checkedStates };

  useEffect(() => {
    const unsubscribe = shopify.buyerJourney.intercept((payload) => {
      const canBlockProgress = payload?.canBlockProgress;
      if (!canBlockProgress) return { behavior: "allow" };

      const {
        activeRules: currentRules,
        cartState: currentState,
        matchingCheckboxRules: currentCheckboxRules,
        checkedStates: currentCheckedStates
      } = stateRef.current;

      // Build a snapshot of mutable user-input fields (address + buyer identity).
      // If the snapshot differs from the last call, Shopify fired this intercept
      // reactively due to a field change — NOT because the user clicked Pay Now.
      const snapshot = JSON.stringify({
        addr: currentState.shippingAddress || {},
        buyer: {
          email: currentState.buyerIdentity?.email,
          phone: currentState.buyerIdentity?.phone
        }
      });

      const isReactiveUpdate = !isInitialIntercept.current && lastStateSnapshot.current !== snapshot;
      const wasInitial = isInitialIntercept.current;

      // Always update refs for next call
      isInitialIntercept.current = false;
      lastStateSnapshot.current = snapshot;

      if (wasInitial || isReactiveUpdate) {
        // Initial load OR address/country/contact field changed:
        // Block silently (enforce checkbox requirement) but NEVER show the error banner.
        setShowErrors(false);
        const checkboxBlocked = currentCheckboxRules.some(r => !currentCheckedStates[r.id]);
        if (checkboxBlocked) {
          return { behavior: "block", reason: "Checkbox required" };
        }
        return { behavior: "allow" };
      }

      // ── Reaches here only when state is UNCHANGED from last intercept call ──
      // This means the user clicked Pay Now / Complete Order (no field changes).

      // 1. Check checkbox validations for matching rules on this target
      let checkboxBlocked = false;
      for (const rule of currentCheckboxRules) {
        if (!currentCheckedStates[rule.id]) {
          checkboxBlocked = true;
          break;
        }
      }

      // 2. Check standard validation rules (only on block target)
      let shouldBlock = false;
      if (isBlockTarget) {
        for (const rule of currentRules) {
          if (rule.status !== "active") continue;
          if (rule.display_in_checkout === false) continue;
          if (rule.rule_type === "checkbox") continue;
          if (rule.warning_banner !== true && rule.warning_banner !== "true") {
            if (evaluateRule(rule, currentState)) {
              shouldBlock = true;
              break;
            }
          }
        }
      }

      if (checkboxBlocked || shouldBlock) {
        setShowErrors(true);
        return {
          behavior: "block",
          reason: "Validation rules triggered or checkbox not accepted"
        };
      }

      setShowErrors(false);
      return { behavior: "allow" };
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [currentTarget, isBlockTarget]);


  // 4. Evaluate which rules are triggered (only evaluate validation rules for block target banners)
  const triggeredBanners = [];

  if (isBlockTarget) {
    for (const rule of activeRules) {
      if (rule.status !== "active") continue;
      if (rule.display_in_checkout === false) continue;
      if (rule.rule_type === "checkbox") continue;

      // Do not show blocking error banners until the user attempts to submit checkout (Pay now)
      const isWarning = rule.warning_banner === true || rule.warning_banner === "true";
      if (!isWarning && !showErrors) {
        continue;
      }

      const isTriggered = evaluateRule(rule, cartState);
      if (isTriggered) {
        // Build banner properties
        let tone = rule.banner_style;
        if (!tone) {
          if (rule.rule_type === "validation" && rule.error_target && rule.error_target !== "$.cart") {
            tone = "critical";
          } else if (!rule.warning_banner) {
            tone = "critical"; // Default validation rules block checkout (critical/red)
          } else {
            tone = "warning"; // Warning banners default to orange/warning
          }
        }

        // Prepend custom emoji icons
        let titlePrefix = "";
        const iconName = rule.custom_icon === "default" || !rule.custom_icon ? tone : rule.custom_icon;
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

        let message = rule.error_message;
        if (!message) {
          if (rule.rule_type === "delivery") {
            message = rule.delivery_action === "rename" 
              ? `Shipping method "${rule.error_target}" will be renamed to "${rule.error_message}".`
              : `Shipping restriction: "${rule.error_target}" method is disabled.`;
          } else if (rule.rule_type === "payment") {
            message = rule.delivery_action === "rename"
              ? `Payment method "${rule.error_target}" will be renamed.`
              : `Payment restriction: "${rule.error_target}" option is disabled.`;
          } else {
            message = "Checkout is restricted by validation rules.";
          }
        }

        triggeredBanners.push({
          id: rule.id,
          tone,
          heading: titlePrefix + message,
          guidance: rule.guidance_message || ""
        });
      }
    }
  }

  // 5. Render:
  // Render checkboxes matching this target, and banners only on block target
  const renderedCheckboxes = matchingCheckboxRules.map((rule) => {
    const isChecked = Boolean(checkedStates[rule.id]);
    const isUnchecked = !isChecked;

    const handleToggle = (e) => {
      let val;
      if (typeof e === "boolean") {
        val = e;
      } else if (e && typeof e.target?.checked === "boolean") {
        val = e.target.checked;
      } else if (e && typeof e.currentTarget?.checked === "boolean") {
        val = e.currentTarget.checked;
      } else if (e && typeof e.detail?.checked === "boolean") {
        val = e.detail.checked;
      } else if (e && typeof e.detail === "boolean") {
        val = e.detail;
      } else {
        val = !isChecked;
      }

      setCheckedStates((prev) => {
        const nextStates = { ...prev, [rule.id]: val };
        const allChecked = matchingCheckboxRules.every((r) => Boolean(nextStates[r.id]));
        if (allChecked) {
          setShowErrors(false);
        }
        return nextStates;
      });
    };

    return (
      <s-stack key={rule.id} gap="tight">
        <s-checkbox
          label={rule.guidance_message || rule.title}
          checked={isChecked}
          onChange={handleToggle}
        />
        {showErrors && isUnchecked && (
          <s-banner
            tone="critical"
            heading={rule.error_message || "This checkbox is required to complete checkout."}
          />
        )}
      </s-stack>
    );
  });

  const renderedBanners = isBlockTarget
    ? triggeredBanners.map((banner) => (
        <s-stack key={banner.id} gap="base">
          <s-banner heading={banner.heading} tone={banner.tone} />
          {banner.guidance && (
            <s-banner heading={banner.guidance} tone="info" />
          )}
        </s-stack>
      ))
    : [];

  if (renderedCheckboxes.length === 0 && renderedBanners.length === 0) {
    return null;
  }

  return (
    <s-stack gap="base">
      {renderedCheckboxes}
      {renderedBanners}
    </s-stack>
  );
}

// Rule evaluation implementation
function evaluateRule(rule, cartState) {
  const { conditions, conditions_operator = "AND" } = rule;
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return false;
  }

  const results = conditions.map(cond => {
    try {
      return evaluateCondition(cond, cartState);
    } catch (e) {
      console.error("[Checkout UI] Condition evaluation error:", e);
      return false;
    }
  });

  if (conditions_operator === "OR") {
    return results.some(r => r === true);
  } else {
    return results.every(r => r === true);
  }
}

function evaluateCondition(cond, cartState) {
  const { lines = [], shippingAddress = {}, buyerIdentity = {}, cost = {} } = cartState;
  const customer = buyerIdentity.customer || {};
  
  // Parse customer metadata
  let customerTags = customer.tags || [];
  let customerAge = null;
  const customerMetaVal = customer.metafield?.value;
  if (customerMetaVal) {
    try {
      const parsed = JSON.parse(customerMetaVal);
      if (parsed.tags) customerTags = parsed.tags;
      if (parsed.age) customerAge = parsed.age;
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
      const subtotal = parseFloat(cost.subtotalAmount?.amount || 0);
      const val = parseFloat(cond.value || 0);
      return cond.operator === "less_than" ? subtotal < val : subtotal >= val;
    }

    case "maximum_order_value": {
      const subtotal = parseFloat(cost.subtotalAmount?.amount || 0);
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