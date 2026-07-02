import express from "express";
import { dbQuery } from "../db/connection.js";
import { syncRulesToShopify } from "./rules.js";

const router = express.Router();

// GET /api/templates - Get all prebuilt templates (excluding already applied ones)
router.get("/", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    // Fetch active/inactive rules to exclude already applied templates (excluding deleted ones)
    const existingRulesRes = await dbQuery("SELECT title FROM rules WHERE shop = $1 AND status != 'deleted'", [shop]);
    const existingTitles = existingRulesRes.rows.map(r => r.title.toLowerCase());

    const result = await dbQuery("SELECT * FROM rule_templates ORDER BY id ASC");
    
    const filteredTemplates = result.rows.filter(tmpl => 
      !existingTitles.includes(tmpl.title.toLowerCase())
    );

    res.json(filteredTemplates);
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
      `INSERT INTO rules (shop, title, status, priority, conditions_operator, conditions, error_message, error_target)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        shop,
        template.title,
        "active",
        0,
        "AND",
        JSON.stringify(template.conditions),
        template.error_message,
        template.error_target
      ]
    );
    const newRule = ruleRes.rows[0];

    // Create version 1
    await dbQuery(
      `INSERT INTO rule_versions (rule_id, version, title, priority, conditions_operator, conditions, error_message, error_target)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newRule.id,
        1,
        newRule.title,
        newRule.priority,
        newRule.conditions_operator,
        JSON.stringify(newRule.conditions),
        newRule.error_message,
        newRule.error_target
      ]
    );

    // Sync to Shopify
    await syncRulesToShopify(res.locals.shopify.session);

    res.status(201).json(newRule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
