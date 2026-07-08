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
      // Sum all events into totalChecks for aggregate
      totalChecks += row.count;
    });

    // If no events at all, totalChecks stays 0
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

// POST /api/analytics/simulate - Simulate a checkout block event
router.post("/simulate", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const { eventType = "block" } = req.body;

    // Get an active rule to associate with the simulation
    const rulesRes = await dbQuery(
      "SELECT * FROM rules WHERE shop = $1 AND status = 'active' LIMIT 1",
      [shop]
    );
    const activeRule = rulesRes.rows[0];

    const cartValue = (Math.random() * 150 + 10).toFixed(2);
    const cartId = `sim_${eventType}_${Date.now()}`;
    const ruleId = eventType === "block" && activeRule ? activeRule.id : null;

    await dbQuery(
      `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [shop, ruleId, eventType, cartValue, cartId]
    );

    res.json({ success: true, message: `Simulated a checkout ${eventType} event successfully.` });
  } catch (error) {
    console.error("Simulation endpoint error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/seed - Generate realistic demo analytics data from existing rules
router.post("/seed", async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;

    // Get active rules for this shop
    const rulesRes = await dbQuery(
      "SELECT * FROM rules WHERE shop = $1 AND status = 'active'",
      [shop]
    );
    const activeRules = rulesRes.rows || [];

    if (activeRules.length === 0) {
      return res.json({ seeded: false, message: "No active rules to generate analytics for.", eventCount: 0 });
    }

    let eventCount = 0;
    const now = Date.now();

    // Generate events spread over the last 14 days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const dayDate = new Date(now - dayOffset * 24 * 60 * 60 * 1000);

      // Generate 2-8 block events per day, distributed across active rules
      const blockCount = Math.floor(Math.random() * 7) + 2;
      for (let i = 0; i < blockCount; i++) {
        const rule = activeRules[Math.floor(Math.random() * activeRules.length)];
        const cartValue = (Math.random() * 500 + 20).toFixed(2);
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const eventDate = new Date(dayDate);
        eventDate.setHours(hour, minute, Math.floor(Math.random() * 60));
        const cartId = `seed_block_${dayOffset}_${i}_${Date.now()}`;

        await dbQuery(
          `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [shop, rule.id, 'block', cartValue, cartId, eventDate.toISOString()]
        );
        eventCount++;
      }

      // Generate 5-15 allow events per day (successful checkouts)
      const allowCount = Math.floor(Math.random() * 11) + 5;
      for (let i = 0; i < allowCount; i++) {
        const cartValue = (Math.random() * 300 + 30).toFixed(2);
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const eventDate = new Date(dayDate);
        eventDate.setHours(hour, minute, Math.floor(Math.random() * 60));
        const cartId = `seed_allow_${dayOffset}_${i}_${Date.now()}`;

        await dbQuery(
          `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [shop, null, 'allow', cartValue, cartId, eventDate.toISOString()]
        );
        eventCount++;
      }

      // Generate 3-10 check events per day
      const checkCount = Math.floor(Math.random() * 8) + 3;
      for (let i = 0; i < checkCount; i++) {
        const cartValue = (Math.random() * 400 + 15).toFixed(2);
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const eventDate = new Date(dayDate);
        eventDate.setHours(hour, minute, Math.floor(Math.random() * 60));
        const cartId = `seed_check_${dayOffset}_${i}_${Date.now()}`;

        await dbQuery(
          `INSERT INTO rule_analytics (shop, rule_id, event_type, cart_value, cart_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [shop, null, 'check', cartValue, cartId, eventDate.toISOString()]
        );
        eventCount++;
      }
    }

    res.json({ seeded: true, eventCount });
  } catch (error) {
    console.error("Analytics seed error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
