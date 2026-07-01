import React, { useState, useEffect } from "react";
import { Page, Layout, Card, TextContainer, Box, Text, HorizontalStack, VerticalStack, Button, Badge, DataTable, Spinner } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { formatDate } from "../utils/utils";

export default function Dashboard({ navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [applyingRec, setApplyingRec] = useState(null);

  const fetchData = async () => {
    try {
      const [analyticsRes, recRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/recommendations")
      ]);
      const analyticsData = await analyticsRes.json();
      const recData = await recRes.json();
      setData(analyticsData);
      setRecommendations(recData);
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

  const handleApplyRecommendation = async (rec) => {
    setApplyingRec(rec.id);
    try {
      const res = await fetch(`/api/templates/${rec.templateId}/apply`, {
        method: "POST"
      });
      if (res.ok) {
        shopify.toast.show(`Rule "${rec.title}" applied successfully!`);
        fetchData();
      } else {
        shopify.toast.show("Failed to apply recommendation", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Network error", { isError: true });
    } finally {
      setApplyingRec(null);
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
    // secondaryActions={[
    //   {
    //     content: "Simulate Block Event",
    //     onAction: handleSimulate
    //   }
    // ]}
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
          background: linear-gradient(135deg, #1e2229 0%, #111418 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
          color: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
        }
        .kpi-val {
          font-size: 32px;
          font-weight: 700;
          margin: 8px 0;
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(to right, #a5b4fc, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
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
      `}</style>

      {/* KPI Section */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <Text variant="bodyMd" color="subdued" fontWeight="medium">Total Checkout Checks</Text>
          <div className="kpi-val">{summary?.totalChecks || 0}</div>
          <Text variant="bodySm" tone="success">🛡️ Active Shielding</Text>
        </div>
        <div className="kpi-card">
          <Text variant="bodyMd" color="subdued" fontWeight="medium">Blocked Checkouts</Text>
          <div className="kpi-val">{summary?.totalBlocks || 0}</div>
          <Text variant="bodySm" tone="critical">🛑 Block Rate: {blockRate}%</Text>
        </div>
        <div className="kpi-card">
          <Text variant="bodyMd" color="subdued" fontWeight="medium">Blocked Order Value</Text>
          <div className="kpi-val">${(summary?.blockedValue || 0).toFixed(2)}</div>
          <Text variant="bodySm" tone="success">💵 Prevented Loss</Text>
        </div>
        <div className="kpi-card">
          <Text variant="bodyMd" color="subdued" fontWeight="medium">Active Rules</Text>
          <div className="kpi-val">{summary?.activeRulesCount || 0}</div>
          <Text variant="bodySm" tone="success">⚡ Live Rules</Text>
        </div>
      </div>

      <Layout>
        {/* Charts & Graphs */}
        <Layout.Section>
          <Card title="Checkout Blocks Trend (Last 14 Days)">
            <Box padding="4">
              {chartPoints.length > 1 ? (
                <div style={{ width: "100%", overflowX: "auto" }}>
                  <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ minWidth: "500px" }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Gridlines */}
                    <line x1="30" y1="20" x2={svgWidth - 30} y2="20" stroke="#f1f2f4" strokeWidth="1" />
                    <line x1="30" y1="100" x2={svgWidth - 30} y2="100" stroke="#f1f2f4" strokeWidth="1" />
                    <line x1="30" y1="180" x2={svgWidth - 30} y2="180" stroke="#e1e3e5" strokeWidth="1" />

                    {/* Area under line */}
                    <path
                      d={`M ${chartPoints[0].x} 180 L ${polylinePath} L ${chartPoints[chartPoints.length - 1].x} 180 Z`}
                      fill="url(#chartGrad)"
                    />

                    {/* Line */}
                    <polyline
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3"
                      points={polylinePath}
                    />

                    {/* Nodes & Labels */}
                    {chartPoints.map((pt, idx) => (
                      <g key={idx}>
                        <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />
                        <text x={pt.x} y={pt.y - 8} fontSize="9" textAnchor="middle" fill="#4f46e5" fontWeight="semibold">
                          {pt.value}
                        </text>
                        {/* Only show dates for start, mid, end to prevent overlaps */}
                        {(idx === 0 || idx === Math.floor(chartPoints.length / 2) || idx === chartPoints.length - 1) && (
                          <text x={pt.x} y="195" fontSize="10" textAnchor="middle" fill="#8c9196">
                            {pt.label.substring(5)}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <Box padding="8" textAlign="center">
                  <Text variant="bodyMd" tone="subdued">Insufficient analytics data to draw chart.</Text>
                </Box>
              )}
            </Box>
          </Card>
        </Layout.Section>

        {/* Recommendations Side Bar */}
        <Layout.Section secondary>
          <Card title="⚡ Smart Recommendations">
            <Box padding="4">
              <VerticalStack gap="4">
                {recommendations.length > 0 ? (
                  recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="rec-item">
                      <VerticalStack gap="2">
                        <HorizontalStack align="space-between">
                          <Text variant="bodyMd" fontWeight="bold">
                            {rec.title}
                          </Text>
                          <Badge tone={rec.impact === "Critical" || rec.impact === "High" ? "critical" : "info"}>
                            {rec.impact} Impact
                          </Badge>
                        </HorizontalStack>
                        <Text variant="bodySm" tone="subdued">
                          {rec.reason}
                        </Text>
                        <Box>
                          <Button
                            size="slim"
                            primary
                            loading={applyingRec === rec.id}
                            onClick={() => handleApplyRecommendation(rec)}
                          >
                            Apply Recommendation
                          </Button>
                        </Box>
                      </VerticalStack>
                    </div>
                  ))
                ) : (
                  <Text variant="bodyMd" tone="subdued">
                    Your store configuration looks perfect! No recommendations at this time.
                  </Text>
                )}
              </VerticalStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Breakdown by rule */}
        <Layout.Section>
          <Card title="Top Triggered Block Rules">
            <DataTable
              columnContentTypes={["text", "numeric"]}
              headings={["Rule Title", "Blocks Count"]}
              rows={
                rulesBreakdown.length > 0
                  ? rulesBreakdown.map(r => [r.title, r.count])
                  : [["No rules triggered blocks yet", 0]]
              }
            />
          </Card>
        </Layout.Section>

        {/* Recent logs */}
        <Layout.Section>
          <Card title="Recent Blocked Checkouts Log">
            <DataTable
              columnContentTypes={["text", "text", "text"]}
              headings={["Date/Time", "Rule Responsible", "Cart Subtotal"]}
              rows={
                recentBlocks.length > 0
                  ? recentBlocks.map(b => [
                    formatDate(b.created_at),
                    b.rule_title || "Unknown/Deleted Rule",
                    `$${parseFloat(b.cart_value).toFixed(2)}`
                  ])
                  : [["-", "No checkouts blocked yet", "-"]]
              }
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
