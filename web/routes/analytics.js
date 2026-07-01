import express from "express";
import { dbQuery } from "../db/connection.js";

const router = express.Router();

// GET /api/analytics - Get summary stats & chart data
router.get("/", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;

    // 1. Get total checks, blocks, and allows
    const analyticsRes = await dbQuery(
      "SELECT event_type, COUNT(*)::int as count, COALESCE(SUM(cart_value), 0)::float as total_value FROM rule_analytics WHERE shop = $1 GROUP BY event_type",
      [shop]
    );

    let totalChecks = 0;
    let totalBlocks = 0;
    let totalAllows = 0;
    let blockedValue = 0;

    (analyticsRes.rows || []).forEach(row => {
      if (row.event_type === "block") {
        totalBlocks = row.count;
        blockedValue = row.total_value;
      } else if (row.event_type === "allow") {
        totalAllows = row.count;
      }
      totalChecks += row.count;
    });

    // 2. Active rules count
    const activeRulesRes = await dbQuery(
      "SELECT COUNT(*)::int as count FROM rules WHERE shop = $1 AND status = 'active'",
      [shop]
    );
    const activeRulesCount = activeRulesRes.rows[0]?.count || 0;

    // 3. Chart data: last 7 days blocks/allows grouped by date
    const chartRes = await dbQuery(
      `SELECT DATE(created_at) as date, event_type, COUNT(*)::int as count 
       FROM rule_analytics 
       WHERE shop = $1 AND created_at >= NOW() - INTERVAL '14 days' 
       GROUP BY DATE(created_at), event_type 
       ORDER BY DATE(created_at) ASC`,
      [shop]
    );

    // Format chart data for frontend chart
    const dailyStats = {};
    (chartRes.rows || []).forEach(row => {
      // Format date to YYYY-MM-DD
      const dateStr = new Date(row.date).toISOString().split("T")[0];
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = { date: dateStr, blocks: 0, allows: 0, total: 0 };
      }
      if (row.event_type === "block") {
        dailyStats[dateStr].blocks = row.count;
      } else if (row.event_type === "allow") {
        dailyStats[dateStr].allows = row.count;
      }
      dailyStats[dateStr].total += row.count;
    });

    const chartData = Object.values(dailyStats);

    // 4. Breakdown by triggered rules
    const rulesBreakdownRes = await dbQuery(
      `SELECT r.title, COUNT(a.id)::int as count 
       FROM rule_analytics a 
       JOIN rules r ON a.rule_id = r.id 
       WHERE a.shop = $1 AND a.event_type = 'block'
       GROUP BY r.title 
       ORDER BY count DESC 
       LIMIT 5`,
      [shop]
    );

    // 5. Recent blocked checkouts list
    const recentBlocksRes = await dbQuery(
      `SELECT a.id, r.title as rule_title, a.cart_value, a.created_at 
       FROM rule_analytics a
       LEFT JOIN rules r ON a.rule_id = r.id
       WHERE a.shop = $1 AND a.event_type = 'block'
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [shop]
    );

    res.json({
      summary: {
        totalChecks,
        totalBlocks,
        totalAllows,
        blockedValue,
        activeRulesCount
      },
      chartData,
      rulesBreakdown: rulesBreakdownRes.rows || [],
      recentBlocks: recentBlocksRes.rows || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/simulate - Trigger a mock check/block event for testing dashboard visualization
router.post("/simulate", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const { ruleId, eventType, cartValue } = req.body;

    const val = cartValue || (Math.random() * 200 + 10).toFixed(2);
    const event = eventType || (Math.random() > 0.3 ? "allow" : "block");

    const result = await dbQuery(
      `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [shop, ruleId || null, event, val, `cart_${Math.random().toString(36).substring(2, 9)}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
