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
      } else if (row.event_type === "check") {
        totalChecks += row.count;
      }
      // Sum all events into totalChecks for aggregate
      totalChecks += row.count;
    });

    // If no check events yet, use blocks + allows as total checks
    if (totalChecks === 0) {
      totalChecks = totalBlocks + totalAllows;
    }

    // 2. Active rules count
    const activeRulesRes = await dbQuery(
      "SELECT COUNT(*)::int as count FROM rules WHERE shop = $1 AND status = 'active'",
      [shop]
    );
    const activeRulesCount = activeRulesRes.rows[0]?.count || 0;

    // 3. Chart data: last 14 days blocks/allows grouped by date
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



// DELETE /api/analytics/reset - Clear all analytics data for the shop
router.delete("/reset", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    await dbQuery("DELETE FROM rule_analytics WHERE shop = $1", [shop]);
    res.json({ message: "Analytics data cleared." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
