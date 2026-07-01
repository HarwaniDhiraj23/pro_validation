import express from "express";
import shopify from "../shopify.js";

const router = express.Router();

// GET /api/recommendations - Smart rule recommendation engine
router.get("/", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    // 1. Query products and selling plans to customize recommendations
    const checkQuery = `
      query {
        products(first: 20) {
          nodes {
            id
            productType
            tags
            variants(first: 5) {
              nodes {
                id
              }
            }
          }
        }
        sellingPlanGroups(first: 10) {
          nodes {
            id
          }
        }
      }
    `;

    let products = [];
    let hasSubscriptions = false;
    let hasHighWeight = false;

    try {
      const checkRes = await client.request(checkQuery);
      products = checkRes.data?.products?.nodes || [];
      hasSubscriptions = (checkRes.data?.sellingPlanGroups?.nodes || []).length > 0;
      
      hasHighWeight = false;
    } catch (e) {
      console.warn("Could not query products for smart recommendations, using default heuristics.", e.message);
    }

    const recommendations = [];

    // General Recommendation: PO Box blocker (95% of stores need this if shipping physical goods)
    recommendations.push({
      id: "rec_pobox",
      title: "Block PO Box Deliveries",
      reason: "Many carriers (like DHL or FedEx) do not deliver to PO Boxes. Blocking PO boxes ensures delivery success.",
      score: 95,
      templateId: 1, // Points to template index
      impact: "High",
      difficulty: "Easy"
    });

    // Subscriptions Check
    if (hasSubscriptions) {
      recommendations.push({
        id: "rec_sub",
        title: "VIP Members-Only Subscriptions",
        reason: "You have subscription plans enabled. Restrict subscription purchases to logged-in customers with a VIP customer tag.",
        score: 90,
        templateId: 10,
        impact: "Medium",
        difficulty: "Medium"
      });
    }

    // Heavy Goods Weight limit Check
    if (hasHighWeight || products.some(p => p.productType?.toLowerCase().includes("furniture") || p.productType?.toLowerCase().includes("machinery"))) {
      recommendations.push({
        id: "rec_weight",
        title: "Maximum Weight Threshold",
        reason: "Heavy items found in catalog. Restrict total cart weight to prevent shipping errors or oversized freight charges.",
        score: 85,
        templateId: 8, // Or custom weight block
        impact: "High",
        difficulty: "Easy",
        customConfig: {
          title: "Block Extreme Cart Weight",
          conditions: [{ type: "weight_limit", operator: "greater_than", value: "100" }],
          error_message: "Order weight exceeds 100kg. Please contact us for a custom freight quote.",
          error_target: "$.cart"
        }
      });
    }

    // Cart value checkout controls
    recommendations.push({
      id: "rec_min_val",
      title: "Minimum Order Subtotal ($50)",
      reason: "Increase your Average Order Value (AOV) by requiring a minimum cart value before checkout.",
      score: 80,
      templateId: 7,
      impact: "High",
      difficulty: "Easy"
    });

    // Age restriction check
    const ageRestrictedKeywords = ["wine", "alcohol", "beer", "vape", "cbd", "tobacco", "knife", "blade"];
    const hasAgeRestrictedProduct = products.some(p => 
      p.tags.some(t => ageRestrictedKeywords.includes(t.toLowerCase())) ||
      ageRestrictedKeywords.some(k => p.productType?.toLowerCase().includes(k))
    );

    if (hasAgeRestrictedProduct) {
      recommendations.push({
        id: "rec_age",
        title: "Customer Age Verification (18+)",
        reason: "Identified potential age-restricted inventory. Restrict checkouts to buyers confirmed over 18.",
        score: 98,
        templateId: 9,
        impact: "Critical",
        difficulty: "Medium"
      });
    }

    // Default safety recommendation
    recommendations.push({
      id: "rec_fraud_max",
      title: "Block Extreme High-Value Checkouts",
      reason: "Limit checkouts to maximum $2,000 to prevent fraud and carding attacks.",
      score: 75,
      templateId: 8,
      impact: "Medium",
      difficulty: "Easy"
    });

    // Sort by recommendation score descending
    recommendations.sort((a, b) => b.score - a.score);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
