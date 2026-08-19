import express from "express";
import { dbQuery } from "../db/connection.js";
import shopify from "../shopify.js";

const router = express.Router();

// Helper to sync active surveys to Shop Metafield
export async function syncSurveysToShopify(session) {
  const shop = session.shop;
  console.log(`Syncing active surveys for ${shop} to Shopify Metafields...`);

  try {
    const result = await dbQuery(
      `SELECT * FROM surveys WHERE shop = $1 AND status = 'active' ORDER BY id DESC`,
      [shop]
    );
    const activeSurveys = result.rows || [];

    const client = new shopify.api.clients.Graphql({ session });
    const shopRes = await client.request(`query { shop { id } }`);
    const shopId = shopRes.data?.shop?.id;

    if (shopId) {
      const metafieldsSetMutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      await client.request(metafieldsSetMutation, {
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: "cart-validation",
              key: "survey-rules",
              type: "json",
              value: JSON.stringify(activeSurveys),
            },
          ],
        },
      });
      console.log(`Synced ${activeSurveys.length} survey rules to Shopify Metafield.`);
    }
  } catch (err) {
    console.error("[Sync Surveys] Error syncing to Shopify Metafield:", err.message);
  }
}

// 1. GET /api/surveys - Fetch all surveys for current shop
router.get("/", async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    const shop = session?.shop || req.query.shop || "default-shop";

    const result = await dbQuery(
      `SELECT * FROM surveys WHERE shop = $1 ORDER BY id DESC`,
      [shop]
    );

    return res.json({ success: true, surveys: result.rows || [] });
  } catch (error) {
    console.error("Error fetching surveys:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/surveys - Create or update a survey configuration
router.post("/", async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    const shop = session?.shop || req.body.shop || "default-shop";

    const {
      id,
      title,
      status = "active",
      survey_type, // attribution, nps, rating, feedback
      question_text,
      description = null,
      options = [],
      allow_custom_text = true,
      conditions = [],
    } = req.body;

    if (!title || !survey_type || !question_text) {
      return res.status(400).json({
        success: false,
        error: "Missing required survey fields (title, survey_type, question_text)",
      });
    }

    const optionsJson = typeof options === "string" ? options : JSON.stringify(options);
    const conditionsJson = typeof conditions === "string" ? conditions : JSON.stringify(conditions);

    let savedSurvey;
    if (id) {
      const updateRes = await dbQuery(
        `UPDATE surveys 
         SET title = $1, status = $2, survey_type = $3, question_text = $4, description = $5, options = $6, allow_custom_text = $7, conditions = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 AND shop = $10
         RETURNING *`,
        [
          title,
          status,
          survey_type,
          question_text,
          description,
          optionsJson,
          allow_custom_text,
          conditionsJson,
          id,
          shop,
        ]
      );
      savedSurvey = updateRes.rows?.[0];
    } else {
      const insertRes = await dbQuery(
        `INSERT INTO surveys (shop, title, status, survey_type, question_text, description, options, allow_custom_text, conditions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          shop,
          title,
          status,
          survey_type,
          question_text,
          description,
          optionsJson,
          allow_custom_text,
          conditionsJson,
        ]
      );
      savedSurvey = insertRes.rows?.[0];
    }

    if (session) {
      await syncSurveysToShopify(session);
    }

    return res.json({ success: true, survey: savedSurvey });
  } catch (error) {
    console.error("Error saving survey:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. DELETE /api/surveys/:id - Delete survey configuration
router.delete("/:id", async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    const shop = session?.shop || req.query.shop || "default-shop";
    const surveyId = req.params.id;

    await dbQuery(`DELETE FROM surveys WHERE id = $1 AND shop = $2`, [
      surveyId,
      shop,
    ]);

    if (session) {
      await syncSurveysToShopify(session);
    }

    return res.json({ success: true, message: "Survey deleted successfully" });
  } catch (error) {
    console.error("Error deleting survey:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GET /api/surveys/analytics - Detailed survey analytics (NPS, HDYHAU, Ratings)
router.get("/analytics", async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    const shop = session?.shop || req.query.shop || "default-shop";

    // Fetch all authentic survey responses for shop from PostgreSQL database
    const respResult = await dbQuery(
      `SELECT * FROM survey_responses WHERE shop = $1 ORDER BY submitted_at DESC`,
      [shop]
    );
    const responses = respResult.rows || [];

    // 1. Total survey metrics
    const totalResponses = responses.length;

    // 2. Attribution Channel Breakdown (HDYHAU)
    const attributionResponses = responses.filter(
      (r) => r.survey_type === "attribution"
    );
    const channelCounts = {};
    attributionResponses.forEach((r) => {
      const channel = r.answer_value || "Unspecified";
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });
    const totalAttribution = attributionResponses.length || 1;
    const attributionBreakdown = Object.keys(channelCounts).map((channel) => ({
      channel,
      count: channelCounts[channel],
      percentage: Math.round((channelCounts[channel] / totalAttribution) * 100),
    }));

    // 3. NPS Score Calculation
    // Promoters (9-10), Passives (7-8), Detractors (0-6)
    const npsResponses = responses.filter((r) => r.survey_type === "nps");
    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    npsResponses.forEach((r) => {
      const score = parseInt(r.answer_value, 10);
      if (!isNaN(score)) {
        if (score >= 9) promoters++;
        else if (score >= 7) passives++;
        else detractors++;
      }
    });

    const totalNps = npsResponses.length;
    const npsScore =
      totalNps > 0
        ? Math.round(((promoters - detractors) / totalNps) * 100)
        : 0;

    // 4. Star Rating Breakdown
    const ratingResponses = responses.filter((r) => r.survey_type === "rating");
    let totalRatingSum = 0;
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    ratingResponses.forEach((r) => {
      const rating = parseInt(r.answer_value, 10);
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating]++;
        totalRatingSum += rating;
      }
    });
    const avgRating =
      ratingResponses.length > 0
        ? (totalRatingSum / ratingResponses.length).toFixed(1)
        : "0.0";

    // 5. All database survey responses (without filtering out rows with empty feedback)
    const allResponses = responses.map((r) => ({
      id: r.id,
      survey_type: r.survey_type,
      answer_value: r.answer_value,
      custom_feedback: r.custom_feedback,
      order_id: r.order_id,
      customer_email: r.customer_email,
      submitted_at: r.submitted_at,
    }));

    return res.json({
      success: true,
      analytics: {
        totalResponses,
        nps: {
          score: npsScore,
          total: totalNps,
          promoters,
          passives,
          detractors,
          promoterPct: totalNps > 0 ? Math.round((promoters / totalNps) * 100) : 0,
          passivePct: totalNps > 0 ? Math.round((passives / totalNps) * 100) : 0,
          detractorPct: totalNps > 0 ? Math.round((detractors / totalNps) * 100) : 0,
        },
        attribution: attributionBreakdown,
        rating: {
          average: avgRating,
          total: ratingResponses.length,
          counts: ratingCounts,
        },
        recentFeedback: allResponses,
        allResponses,
      },
    });
  } catch (error) {
    console.error("Error fetching survey analytics:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/surveys/export-csv - Generate CSV directly from PostgreSQL database
router.get("/export-csv", async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    const shop = session?.shop || req.query.shop || "default-shop";

    const result = await dbQuery(
      `SELECT id, survey_type, answer_value, custom_feedback, order_id, customer_email, submitted_at
       FROM survey_responses WHERE shop = $1 ORDER BY submitted_at DESC`,
      [shop]
    );
    const rows = result.rows || [];

    const headers = ["Response ID", "Survey Type", "Answer Value", "Custom Feedback", "Order ID", "Customer Email", "Submitted At"];
    const csvLines = [
      headers.join(","),
      ...rows.map((r) => [
        r.id,
        r.survey_type,
        `"${String(r.answer_value || "").replace(/"/g, '""')}"`,
        `"${String(r.custom_feedback || "").replace(/"/g, '""')}"`,
        `"${String(r.order_id || "").replace(/"/g, '""')}"`,
        `"${String(r.customer_email || "").replace(/"/g, '""')}"`,
        `"${String(r.submitted_at || "").replace(/"/g, '""')}"`,
      ].join(","))
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=survey_responses_${new Date().toISOString().slice(0, 10)}.csv`);
    return res.status(200).send(csvLines.join("\n"));
  } catch (error) {
    console.error("Error exporting CSV directly from database:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUBLIC ENDPOINT: GET /api/public/surveys (Called by Post-Purchase / Thank You UI Extension)
router.get("/public/surveys", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const shop = req.query.shop || "default-shop";

    const surveysResult = await dbQuery(
      `SELECT * FROM surveys WHERE shop = $1 AND status = 'active' ORDER BY id DESC`,
      [shop]
    );
    const activeSurveys = surveysResult.rows || [];

    const rulesResult = await dbQuery(
      `SELECT id, shop, title, status, rule_type, 
              COALESCE(survey_type, 'attribution') AS survey_type,
              title AS question_text, description, options, conditions 
       FROM rules 
       WHERE (shop = $1 OR target_shop = $1) 
         AND status = 'active' 
         AND rule_type = 'survey'
       ORDER BY priority DESC, id DESC`,
      [shop]
    );
    const activeRules = rulesResult.rows || [];

    const allSurveys = [...activeSurveys, ...activeRules];
    return res.json({ success: true, surveys: allSurveys });
  } catch (error) {
    console.error("Error fetching public surveys:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. PUBLIC ENDPOINT: POST /api/public/survey-responses (Called by Post-Purchase / Thank You UI Extension)
router.post("/public/survey-responses", async (req, res) => {
  // Allow cross-origin requests from checkout UI extensions
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const {
      shop = "default-shop",
      survey_id = null,
      order_id = null,
      customer_id = null,
      customer_email = null,
      survey_type,
      answer_value,
      custom_feedback = null,
    } = req.body;

    if (!survey_type || answer_value === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required response parameters (survey_type, answer_value)",
      });
    }

    const insertRes = await dbQuery(
      `INSERT INTO survey_responses (shop, survey_id, order_id, customer_id, customer_email, survey_type, answer_value, custom_feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        shop,
        survey_id,
        order_id,
        customer_id,
        customer_email,
        survey_type,
        String(answer_value),
        custom_feedback,
      ]
    );

    return res.json({
      success: true,
      message: "Survey response recorded successfully",
      response: insertRes.rows?.[0],
    });
  } catch (error) {
    console.error("Error recording survey response:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
