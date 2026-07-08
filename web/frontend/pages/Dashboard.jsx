import React, { useState, useEffect } from "react";
import { Page, Layout, Card, TextContainer, Box, Text, HorizontalStack, VerticalStack, Button, Badge, DataTable, Spinner, Pagination } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { formatDate } from "../utils/utils";

export default function Dashboard({ navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    try {
      const analyticsRes = await fetch("/api/analytics");
      const analyticsData = await analyticsRes.json();

      // Auto-seed demo data if there are no analytics events at all
      const totalEvents = (analyticsData?.summary?.totalChecks || 0) + (analyticsData?.summary?.totalBlocks || 0) + (analyticsData?.summary?.totalAllows || 0);
      if (totalEvents === 0) {
        try {
          const seedRes = await fetch("/api/analytics/seed", { method: "POST" });
          const seedResult = await seedRes.json();
          if (seedResult.seeded) {
            // Re-fetch with the newly seeded data
            const refreshRes = await fetch("/api/analytics");
            const refreshData = await refreshRes.json();
            setData(refreshData);
            return;
          }
        } catch (seedErr) {
          console.warn("Auto-seed failed:", seedErr);
        }
      }

      setData(analyticsData);
    } catch (e) {
      console.error(e);
      shopify.toast.show("Error loading dashboard data", { isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimulate = async () => {
    try {
      const res = await fetch("/api/analytics/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "block" })
      });
      if (res.ok) {
        shopify.toast.show("Checkout block simulated!");
        fetchData();
      }
    } catch (e) {
      shopify.toast.show("Simulation failed", { isError: true });
    }
  };

  const handleResetAnalytics = async () => {
    try {
      await fetch("/api/analytics/reset", { method: "DELETE" });
      // Re-seed fresh data
      const seedRes = await fetch("/api/analytics/seed", { method: "POST" });
      const seedData = await seedRes.json();
      if (seedData.seeded) {
        shopify.toast.show(`Analytics refreshed with ${seedData.eventCount} demo events`);
      } else {
        shopify.toast.show("Analytics reset complete");
      }
      fetchData();
    } catch (e) {
      shopify.toast.show("Reset failed", { isError: true });
    }
  };

  if (loading) {
    return (
      <Page title="Dashboard">
        <HorizontalStack align="center">
          <Spinner size="large" />
        </HorizontalStack>
      </Page>
    );
  }

  const { summary, chartData = [], rulesBreakdown = [], recentBlocks = [] } = data || {};
  const blockRate = summary?.totalChecks > 0
    ? ((summary.totalBlocks / summary.totalChecks) * 100).toFixed(1)
    : "0.0";

  // Calculate SVG dimensions for the chart
  const svgWidth = 600;
  const svgHeight = 200;
  const chartPoints = chartData.map((d, index) => {
    const x = (index / (Math.max(chartData.length - 1, 1))) * (svgWidth - 60) + 30;
    const maxVal = Math.max(...chartData.map(cd => cd.total), 10);
    const y = svgHeight - ((d.blocks / maxVal) * (svgHeight - 40) + 20);
    return { x, y, label: d.date, value: d.blocks };
  });

  const polylinePath = chartPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <Page
      title="Dashboard"
      subtitle="Cart & Checkout Validation Analytics and recommendations"
      primaryAction={{
        content: "View Rules",
        onAction: () => navigate("/rules")
      }}
    >
      <style>{`
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr; }
        }
        .kpi-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          color: #1e293b;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .kpi-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: #6366f1;
        }
        .kpi-card:nth-child(1)::before { background: linear-gradient(90deg, #4f46e5, #818cf8); }
        .kpi-card:nth-child(2)::before { background: linear-gradient(90deg, #e11d48, #fb7185); }
        .kpi-card:nth-child(3)::before { background: linear-gradient(90deg, #059669, #34d399); }
        .kpi-card:nth-child(4)::before { background: linear-gradient(90deg, #d97706, #fbbf24); }

        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
          border-color: #cbd5e1;
        }
        .kpi-title {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-val {
          font-size: 38px;
          font-weight: 800;
          margin: 12px 0 8px 0;
          font-family: 'Outfit', 'Inter', sans-serif;
          color: #0f172a;
          letter-spacing: -1px;
          line-height: 1;
        }
        .rec-item {
          border-bottom: 1px solid #e1e3e5;
          padding: 16px 0;
        }
        .rec-item:last-child {
          border-bottom: none;
        }
        .glowing-button {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }
        .custom-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-family: 'Inter', sans-serif;
        }
        .custom-table th {
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #8c9196;
          text-transform: uppercase;
          border-bottom: 2px solid rgba(0,0,0,0.05);
        }
        .custom-table td {
          padding: 14px 16px;
          font-size: 14px;
          color: #202223;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          vertical-align: middle;
        }
        .custom-table tr:hover td {
          background-color: rgba(99, 102, 241, 0.02);
        }
        .rule-name-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rule-icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.08);
          color: #4f46e5;
          font-size: 16px;
        }
        .rule-progress-bar {
          height: 6px;
          border-radius: 3px;
          background-color: #f1f2f4;
          overflow: hidden;
          width: 100%;
        }
        .rule-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4f46e5, #818cf8);
          border-radius: 3px;
        }
        .count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 13px;
          min-width: 32px;
        }
        .count-badge.high {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }
        .count-badge.medium {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }
        .count-badge.low {
          background: rgba(99, 102, 241, 0.1);
          color: #4f46e5;
        }
        .rules-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 12px;
        }
        @media (max-width: 990px) {
          .rules-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .rules-grid {
            grid-template-columns: 1fr;
          }
        }
        .rule-stat-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          transition: all 0.25s ease;
          min-height: 120px;
          overflow: hidden;
        }
        .rule-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.2);
        }
        .rule-stat-card.high {
          border-left: 4px solid #dc2626;
        }
        .rule-stat-card.medium {
          border-left: 4px solid #d97706;
        }
        .rule-stat-card.low {
          border-left: 4px solid #4f46e5;
        }
        .rule-stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .rule-stat-icon {
          font-size: 16px;
        }
        .rule-stat-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .high .rule-stat-badge {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }
        .medium .rule-stat-badge {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }
        .low .rule-stat-badge {
          background: rgba(99, 102, 241, 0.1);
          color: #4f46e5;
        }
        .rule-stat-title {
          font-size: 14px;
          font-weight: 600;
          color: #202223;
          margin-bottom: 16px;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .rule-stat-footer {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-top: 1px solid rgba(0, 0, 0, 0.04);
          padding-top: 10px;
        }
        .rule-stat-label {
          font-size: 11px;
          color: #8c9196;
        }
        .rule-stat-count {
          font-size: 20px;
          font-weight: 800;
          color: #1a1c1e;
        }
      `}</style>

      {/* KPI Section */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Checkout Checks</div>
          <div className="kpi-val">{summary?.totalChecks || 0}</div>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>🛡️</span> Active Shielding
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Blocked Checkouts</div>
          <div className="kpi-val">{summary?.totalBlocks || 0}</div>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#dc2626", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>🛑</span> Block Rate: {blockRate}%
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Blocked Order Value</div>
          <div className="kpi-val">${(summary?.blockedValue || 0).toFixed(2)}</div>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>💵</span> Prevented Loss
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Active Rules</div>
          <div className="kpi-val">{summary?.activeRulesCount || 0}</div>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#4f46e5", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>⚡</span> Live Rules
          </div>
        </div>
      </div>
      <Layout>
        {/* Breakdown by rule */}

        <Layout.Section>
          <Card>
            <Box padding="5">
              <div style={{ marginBottom: "16px" }}>
                <Text variant="headingMd" as="h2">Top Triggered Block Rules</Text>
              </div>
              {rulesBreakdown.length > 0 ? (
                <div className="rules-grid">
                  {rulesBreakdown.map((r, idx) => {
                    let levelClass = "low";
                    if (r.count >= 20) levelClass = "high";
                    else if (r.count >= 10) levelClass = "medium";

                    return (
                      <div className={`rule-stat-card ${levelClass}`} key={idx}>
                        <div className="rule-stat-header">
                          <span className="rule-stat-icon"></span>
                          <span className="rule-stat-badge">{levelClass} trigger rate</span>
                        </div>
                        <div className="rule-stat-title">{r.title}</div>
                        <div className="rule-stat-footer">
                          <span className="rule-stat-label">Total Blocks</span>
                          <span className="rule-stat-count">{r.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Box padding="4" textAlign="center">
                  <Text variant="bodyMd" tone="subdued">No rules triggered blocks yet</Text>
                </Box>
              )}
            </Box>
          </Card>
        </Layout.Section>



        {/* Recent logs */}
        <Layout.Section>
          <Card>
            <Box padding="5">
              <div style={{ marginBottom: "16px" }}>
                <Text variant="headingMd" as="h2">Recent Blocked Checkouts Log</Text>
              </div>
              {recentBlocks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Sr.</th>
                          <th>Rule Responsible</th>
                          <th style={{ textAlign: "right" }}>Cart Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const currentItems = recentBlocks.slice(0, 5);

                          return currentItems.map((b, idx) => (
                            <tr key={idx}>
                              <td style={{ color: "#6d7175", fontSize: "13px" }}>
                                {idx + 1}
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#dc2626" }} />
                                  <Text variant="bodyMd" fontWeight="medium">{b.rule_title || "Unknown/Deleted Rule"}</Text>
                                </div>
                              </td>
                              <td style={{ textAlign: "right", fontWeight: "700", color: "#1f2937" }}>
                                ${parseFloat(b.cart_value).toFixed(2)}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <Box padding="4" textAlign="center">
                  <Text variant="bodyMd" tone="subdued">No checkouts blocked yet</Text>
                </Box>
              )}
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
