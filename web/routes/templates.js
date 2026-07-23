import express from "express";
import { dbQuery, PREBUILT_TEMPLATES, syncTemplatesToPostgres } from "../db/connection.js";
import { syncRulesToShopify, syncDeliveryRulesToShopify, syncPaymentRulesToShopify } from "./rules.js";
import { getRequiredPlanForTemplate } from "../utils/planLimits.js";

const router = express.Router();

// GET /api/templates - Get all prebuilt templates (excluding already applied ones)
router.get("/", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const ruleType = req.query.rule_type || "all";

    // Ensure database table rule_templates is synced with all 45 prebuilt templates
    await syncTemplatesToPostgres();
    
    let existingRulesRes = { rows: [] };
    let dbRows = [];
    try {
      if (ruleType === "all") {
        existingRulesRes = await dbQuery("SELECT title FROM rules WHERE shop = $1 AND status != 'deleted'", [shop]);
        const result = await dbQuery("SELECT * FROM rule_templates ORDER BY id ASC");
        dbRows = result.rows || [];
      } else {
        existingRulesRes = await dbQuery("SELECT title FROM rules WHERE shop = $1 AND rule_type = $2 AND status != 'deleted'", [shop, ruleType]);
        const result = await dbQuery("SELECT * FROM rule_templates WHERE rule_type = $1 ORDER BY id ASC", [ruleType]);
        dbRows = result.rows || [];
      }
    } catch (e) {
      console.error("Database template fetch error:", e.message);
    }

    // Combine PREBUILT_TEMPLATES fallback with DB rows so all 45 templates are guaranteed
    const templateMap = new Map();
    (PREBUILT_TEMPLATES || []).forEach(tmpl => {
      if (ruleType === "all" || tmpl.rule_type === ruleType) {
        templateMap.set(tmpl.id, tmpl);
      }
    });
    dbRows.forEach(tmpl => {
      if (ruleType === "all" || tmpl.rule_type === ruleType) {
        templateMap.set(tmpl.id, tmpl);
      }
    });

    const allTemplates = Array.from(templateMap.values()).map(tmpl => ({
      ...tmpl,
      required_plan: getRequiredPlanForTemplate(tmpl)
    }));

    const existingTitles = (existingRulesRes.rows || []).map(r => r.title.toLowerCase());
    const filteredTemplates = allTemplates.filter(tmpl => 
      !existingTitles.includes(tmpl.title.toLowerCase())
    );

    res.json(filteredTemplates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/templates/:id - Get specific template details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id);

    // Check PREBUILT_TEMPLATES first
    const prebuiltMatch = (PREBUILT_TEMPLATES || []).find(t => t.id === numId);
    if (prebuiltMatch) {
      return res.json(prebuiltMatch);
    }

    const result = await dbQuery("SELECT * FROM rule_templates WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/templates/:id/apply - Apply a template to the merchant rules
router.post("/:id/apply", async (req, res) => {
  try {
    const { id } = req.params;
    const shop = res.locals.shopify.session.shop;

    // Get template details
    const templateResult = await dbQuery("SELECT * FROM rule_templates WHERE id = $1", [id]);
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    const template = templateResult.rows[0];

    // Create a new rule from template
    const ruleRes = await dbQuery(
      `INSERT INTO rules (shop, title, status, priority, conditions_operator, conditions, error_message, error_target, rule_type, delivery_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        shop,
        template.title,
        "active",
        0,
        "AND",
        JSON.stringify(template.conditions),
        template.error_message,
        template.error_target,
        template.rule_type || "validation",
        template.delivery_action || null
      ]
    );
    const newRule = ruleRes.rows[0];

    // Create version 1
    await dbQuery(
      `INSERT INTO rule_versions (rule_id, version, title, priority, conditions_operator, conditions, error_message, error_target, rule_type, delivery_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        newRule.id,
        1,
        newRule.title,
        newRule.priority,
        newRule.conditions_operator,
        JSON.stringify(newRule.conditions),
        newRule.error_message,
        newRule.error_target,
        newRule.rule_type || "validation",
        newRule.delivery_action || null
      ]
    );

    // Sync to Shopify
    await syncRulesToShopify(res.locals.shopify.session);
    await syncDeliveryRulesToShopify(res.locals.shopify.session);
    await syncPaymentRulesToShopify(res.locals.shopify.session);

    res.status(201).json(newRule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
