export const PLANS = {
  Free: {
    name: "Free",
    price: 0.00,
    trialDays: 0,
    maxActiveRules: 1,
    allowedRuleTypes: ["validation"],
    maxVersionsPerRule: 1,
    allowScheduling: false,
    allowBehaviorCustomization: false,
    analyticsRetentionDays: 7,
    restrictedConditionTypes: [
      "b2b_only", "login_required", "has_hazardous_item", "has_subscription",
      "customer_tags", "guest_checkout_restriction", "restricted_collections",
      "restricted_vendors", "product_combinations", "day_of_week"
    ]
  },
  Basic: {
    name: "Basic",
    price: 9.00,
    trialDays: 7,
    maxActiveRules: 5,
    allowedRuleTypes: ["validation", "delivery"],
    maxVersionsPerRule: 3,
    allowScheduling: false,
    allowBehaviorCustomization: true,
    analyticsRetentionDays: 30,
    restrictedConditionTypes: [
      "b2b_only", "login_required", "has_hazardous_item", "has_subscription",
      "customer_tags", "guest_checkout_restriction", "restricted_collections",
      "restricted_vendors", "product_combinations"
    ]
  },
  Growth: {
    name: "Growth",
    price: 29.00,
    trialDays: 7,
    maxActiveRules: 20,
    allowedRuleTypes: ["validation", "delivery", "payment", "checkbox"],
    maxVersionsPerRule: 10,
    allowScheduling: true,
    allowBehaviorCustomization: true,
    analyticsRetentionDays: 90,
    restrictedConditionTypes: []
  },
  Pro: {
    name: "Pro",
    price: 79.00,
    trialDays: 14,
    maxActiveRules: Infinity,
    allowedRuleTypes: ["validation", "delivery", "payment", "checkbox"],
    maxVersionsPerRule: Infinity,
    allowScheduling: true,
    allowBehaviorCustomization: true,
    analyticsRetentionDays: Infinity,
    restrictedConditionTypes: []
  }
};

/**
 * Returns plan configuration for a given plan name (defaults to Free)
 */
export function getPlanConfig(planName) {
  if (!planName || !PLANS[planName]) {
    return PLANS.Free;
  }
  return PLANS[planName];
}

/**
 * Recommends minimum plan required for a rule type
 */
export function getRequiredPlanForRuleType(ruleType) {
  if (ruleType === "delivery") return "Basic";
  if (ruleType === "payment" || ruleType === "checkbox") return "Growth";
  return "Free";
}

/**
 * Recommends minimum plan required for active rule count
 */
export function getRequiredPlanForRuleCount(count) {
  if (count < 1) return "Free";
  if (count < 5) return "Basic";
  if (count < 20) return "Growth";
  return "Pro";
}

/**
 * Determines minimum plan required for a prebuilt template based on rule type and conditions
 */
export function getRequiredPlanForTemplate(tmpl) {
  if (tmpl.rule_type === "delivery") return "Basic";
  if (tmpl.rule_type === "payment" || tmpl.rule_type === "checkbox") return "Growth";

  const conditions = Array.isArray(tmpl.conditions)
    ? tmpl.conditions
    : (typeof tmpl.conditions === "string" ? JSON.parse(tmpl.conditions || "[]") : []);

  const growthTypes = [
    "b2b_only", "login_required", "has_hazardous_item", "has_subscription",
    "customer_tags", "guest_checkout_restriction", "restricted_collections",
    "restricted_vendors", "product_combinations", "day_of_week"
  ];
  const basicTypes = ["block_states", "block_countries", "block_zipcodes", "address_regex"];

  for (const cond of conditions) {
    if (cond && cond.type) {
      if (growthTypes.includes(cond.type)) return "Growth";
      if (basicTypes.includes(cond.type)) return "Basic";
    }
  }

  return "Free";
}

/**
 * Validates rule creation or activation against shop plan limits
 */
export function validateRulePlanLimits(planName, currentActiveCount, ruleData, isNewActivation = false) {
  const plan = getPlanConfig(planName);

  // 1. Active rules count limit check
  const willBeActive = ruleData.status === "active";
  if (isNewActivation || willBeActive) {
    if (currentActiveCount >= plan.maxActiveRules) {
      const requiredPlan = getRequiredPlanForRuleCount(currentActiveCount + 1);
      return {
        valid: false,
        error: "ACTIVE_RULES_LIMIT_EXCEEDED",
        message: `Your current ${plan.name} plan allows up to ${plan.maxActiveRules} active rule(s). You currently have ${currentActiveCount} active rule(s). Please upgrade to activate more rules.`,
        requiredPlan,
        currentLimit: plan.maxActiveRules,
        currentCount: currentActiveCount
      };
    }
  }

  // 2. Rule type restriction check
  const ruleType = ruleData.rule_type || "validation";
  if (!plan.allowedRuleTypes.includes(ruleType)) {
    const requiredPlan = getRequiredPlanForRuleType(ruleType);
    return {
      valid: false,
      error: "RULE_TYPE_NOT_ALLOWED",
      message: `${ruleType.toUpperCase()} customization rules are not available on the ${plan.name} plan. Upgrade to ${requiredPlan} or higher to unlock this feature.`,
      requiredPlan
    };
  }

  // 3. Rule scheduling restriction check
  if ((ruleData.schedule_start || ruleData.schedule_end) && !plan.allowScheduling) {
    return {
      valid: false,
      error: "SCHEDULING_NOT_ALLOWED",
      message: `Rule date & time scheduling is not included in the ${plan.name} plan. Please upgrade to the Growth plan to schedule rules.`,
      requiredPlan: "Growth"
    };
  }

  // 4. Restricted condition types check
  const conditions = Array.isArray(ruleData.conditions)
    ? ruleData.conditions
    : (typeof ruleData.conditions === "string" ? JSON.parse(ruleData.conditions || "[]") : []);

  for (const cond of conditions) {
    if (cond && cond.type && plan.restrictedConditionTypes.includes(cond.type)) {
      return {
        valid: false,
        error: "ADVANCED_CONDITION_NOT_ALLOWED",
        message: `The condition '${cond.type}' requires advanced logic capabilities not supported on your ${plan.name} plan. Upgrade to Growth or Pro to use advanced condition filters.`,
        requiredPlan: "Growth"
      };
    }
  }

  // 5. Behavior & Visibility restriction check (Free plan block)
  if (!plan.allowBehaviorCustomization && (ruleData.guidance_message || (ruleData.custom_icon && ruleData.custom_icon !== "none" && ruleData.custom_icon !== "default") || (ruleData.banner_style && ruleData.banner_style !== "warning" && ruleData.banner_style !== "critical"))) {
    return {
      valid: false,
      error: "BEHAVIOR_VISIBILITY_NOT_ALLOWED",
      message: `Behavior & Visibility customization (custom icons, banner styling, and guidance instructions) is not included in the Free plan. Please upgrade to Basic or higher to unlock Behavior & Visibility settings.`,
      requiredPlan: "Basic"
    };
  }

  return { valid: true };
}

/**
 * Validates versioning creation against plan limits
 */
export function validateVersioningLimit(planName, currentVersionCount) {
  const plan = getPlanConfig(planName);

  if (currentVersionCount >= plan.maxVersionsPerRule) {
    let requiredPlan = "Basic";
    if (currentVersionCount >= 10) requiredPlan = "Pro";
    else if (currentVersionCount >= 3) requiredPlan = "Growth";

    return {
      valid: false,
      error: "VERSION_LIMIT_EXCEEDED",
      message: `Your ${plan.name} plan keeps up to ${plan.maxVersionsPerRule} rule version(s). Please upgrade to keep extended version history.`,
      requiredPlan
    };
  }

  return { valid: true };
}
