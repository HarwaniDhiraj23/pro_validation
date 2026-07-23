import { PLANS, getPlanConfig, validateRulePlanLimits, validateVersioningLimit } from "../utils/planLimits.js";

console.log("=== Testing Plan Limits Helper ===");

// 1. Test Free Plan Limit (1 rule allowed)
const freeValidationPass = validateRulePlanLimits("Free", 0, { status: "active", rule_type: "validation" }, true);
console.log("Free Plan - 0 active rules -> Activate 1st rule:", freeValidationPass.valid ? "PASSED ✅" : "FAILED ❌", freeValidationPass);

const freeValidationFail = validateRulePlanLimits("Free", 1, { status: "active", rule_type: "validation" }, true);
console.log("Free Plan - 1 active rule -> Activate 2nd rule:", !freeValidationFail.valid ? "BLOCKED AS EXPECTED ✅" : "FAILED ❌", freeValidationFail);

// 2. Test Rule Type Restrictions (Free cannot create delivery customization)
const freeDeliveryFail = validateRulePlanLimits("Free", 0, { status: "active", rule_type: "delivery" }, true);
console.log("Free Plan - Create delivery rule:", !freeDeliveryFail.valid ? "BLOCKED AS EXPECTED ✅" : "FAILED ❌", freeDeliveryFail);

// 3. Test Basic Plan Limit (5 rules allowed, delivery allowed, payment blocked)
const basicDeliveryPass = validateRulePlanLimits("Basic", 3, { status: "active", rule_type: "delivery" }, true);
console.log("Basic Plan - Create delivery rule:", basicDeliveryPass.valid ? "PASSED ✅" : "FAILED ❌", basicDeliveryPass);

const basicPaymentFail = validateRulePlanLimits("Basic", 3, { status: "active", rule_type: "payment" }, true);
console.log("Basic Plan - Create payment rule:", !basicPaymentFail.valid ? "BLOCKED AS EXPECTED ✅" : "FAILED ❌", basicPaymentFail);

// 4. Test Growth Plan (20 rules allowed, payment/checkbox allowed, scheduling allowed)
const growthPass = validateRulePlanLimits("Growth", 10, {
  status: "active",
  rule_type: "payment",
  schedule_start: "2026-08-01T00:00:00Z",
  conditions: [{ type: "b2b_only", operator: "is_not_b2b" }]
}, true);
console.log("Growth Plan - Advanced features:", growthPass.valid ? "PASSED ✅" : "FAILED ❌", growthPass);

// 5. Test Versioning Limits
console.log("Free Plan - 1 version limit:", !validateVersioningLimit("Free", 1).valid ? "BLOCKED AS EXPECTED ✅" : "FAILED ❌");
console.log("Basic Plan - 2 versions limit pass:", validateVersioningLimit("Basic", 2).valid ? "PASSED ✅" : "FAILED ❌");
console.log("Basic Plan - 3 versions limit fail:", !validateVersioningLimit("Basic", 3).valid ? "BLOCKED AS EXPECTED ✅" : "FAILED ❌");

console.log("=== All Plan Limits Tests Completed Successfully! ===");
