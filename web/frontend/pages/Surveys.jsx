import React, { useState, useEffect } from "react";
import {
  Page,
  Card,
  Box,
  HorizontalStack,
  VerticalStack,
  Button,
  Text,
  Spinner,
  Badge,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function Surveys({ navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/surveys/analytics");
      const data = await res.json();
      if (data.success && data.analytics) {
        setResponses(data.analytics.recentFeedback || []);
        setAnalyticsData(data.analytics);
      } else {
        setResponses([]);
        setAnalyticsData(null);
      }
    } catch (e) {
      console.error("Error fetching survey responses:", e);
      setResponses([]);
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await fetch("/api/surveys/export-csv");
      if (!res.ok) throw new Error("CSV download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey_responses_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      shopify?.toast?.show("Database CSV generated & downloaded successfully");
    } catch (e) {
      console.error("Error downloading database CSV:", e);
    }
  };

  const getInitials = (email) => {
    if (!email) return "CU";
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case "attribution":
        return { bg: "#f3e8ff", color: "#7e22ce", border: "#e9d5ff", label: "ATTRIBUTION" };
      case "nps":
        return { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0", label: "NPS SCORE" };
      case "rating":
        return { bg: "#fef3c7", color: "#b45309", border: "#fde68a", label: "STAR RATING" };
      case "feedback":
        return { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd", label: "FEEDBACK" };
      default:
        return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0", label: "SURVEY" };
    }
  };

  const getAnswerIcon = (val, type) => {
    if (type === "nps") return "🎯";
    if (type === "rating") return "⭐";
    if (val.includes("TikTok")) return "🎵";
    if (val.includes("Instagram")) return "📸";
    if (val.includes("Google")) return "🔍";
    if (val.includes("YouTube")) return "▶️";
    return "💬";
  };

  const filteredResponses = responses.filter((r) => {
    const matchesType = filterType === "all" || r.survey_type === filterType;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      (r.customer_email && r.customer_email.toLowerCase().includes(query)) ||
      (r.order_id && r.order_id.toLowerCase().includes(query)) ||
      (r.answer_value && r.answer_value.toLowerCase().includes(query)) ||
      (r.custom_feedback && r.custom_feedback.toLowerCase().includes(query));

    return matchesType && matchesSearch;
  });

  // Calculate dynamic KPIs strictly from database analytics
  const totalSubmissionsCount = analyticsData?.totalResponses || 0;
  
  const topAcquisitionChannel = analyticsData?.attribution && analyticsData.attribution.length > 0
    ? [...analyticsData.attribution].sort((a, b) => b.count - a.count)[0]?.channel || "N/A"
    : "N/A";

  const npsScoreDisplay = analyticsData?.nps?.total > 0
    ? (analyticsData.nps.score >= 0 ? `+${analyticsData.nps.score}` : `${analyticsData.nps.score}`)
    : "N/A";

  const avgRatingDisplay = analyticsData?.rating?.total > 0
    ? `⭐ ${analyticsData.rating.average}`
    : "N/A";

  return (
    <Page
      title="Post-Purchase Customer Responses"
      subtitle="View customer survey submissions, HDYHAU attribution, NPS scores, and write-in feedback."
      backAction={{ content: "Validation Rules", onAction: () => navigate ? navigate("/rules") : (window.location.href = "/rules") }}
      primaryAction={{
        content: "Export Responses (CSV)",
        onAction: handleExportCSV,
        disabled: responses.length === 0,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .responses-container { font-family: 'Inter', sans-serif; }

        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 768px) {
          .kpi-row { grid-template-columns: repeat(2, 1fr); }
        }
        .kpi-card-mini {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }
        .kpi-mini-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-mini-val {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 6px;
        }

        .filter-header-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .response-card-premium {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
        }
        .response-card-premium:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          transform: translateY(-1px);
        }

        .avatar-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #e0e7ff;
          color: #4338ca;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .order-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }

        .category-badge-custom {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .answer-box-wrapper {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 10px;
          padding: 12px 16px;
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .answer-label-tiny {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .answer-pill-value {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }

        .feedback-quote-box-premium {
          background: #f8fafc;
          border-left: 3px solid #6366f1;
          border-radius: 0 10px 10px 0;
          padding: 12px 16px;
          margin-top: 12px;
          font-size: 13px;
          color: #334155;
          font-style: italic;
          line-height: 1.5;
        }

        .empty-response-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        .empty-response-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #e0e7ff;
          color: #4f46e5;
          font-size: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .empty-response-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
        }
        .empty-response-sub {
          font-size: 14px;
          color: #64748b;
          max-width: 520px;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
      `}</style>

      <div className="responses-container">
        {/* Dynamic Database KPI Row */}
        <div className="kpi-row">
          <div className="kpi-card-mini">
            <div className="kpi-mini-title">Total Submissions</div>
            <div className="kpi-mini-val">{totalSubmissionsCount}</div>
          </div>
          <div className="kpi-card-mini">
            <div className="kpi-mini-title">Top Acquisition Channel</div>
            <div className="kpi-mini-val" style={{ color: "#4f46e5" }}>
              {topAcquisitionChannel}
            </div>
          </div>
          <div className="kpi-card-mini">
            <div className="kpi-mini-title">Net Promoter Score</div>
            <div className="kpi-mini-val" style={{ color: "#16a34a" }}>
              {npsScoreDisplay}
            </div>
          </div>
          <div className="kpi-card-mini">
            <div className="kpi-mini-title">Avg Checkout Rating</div>
            <div className="kpi-mini-val" style={{ color: "#d97706" }}>
              {avgRatingDisplay}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="filter-header-bar">
          <div style={{ flex: 1, minWidth: "240px" }}>
            <TextField
              label="Search responses"
              labelHidden
              placeholder="Search by customer email, order ID, answer, or written text..."
              value={searchQuery}
              onChange={setSearchQuery}
              autoComplete="off"
            />
          </div>
          <HorizontalStack gap="2">
            <Button pressed={filterType === "all"} onClick={() => setFilterType("all")}>
              All Responses
            </Button>
            <Button pressed={filterType === "attribution"} onClick={() => setFilterType("attribution")}>
              Attribution
            </Button>
            <Button pressed={filterType === "nps"} onClick={() => setFilterType("nps")}>
              NPS Score
            </Button>
            <Button pressed={filterType === "rating"} onClick={() => setFilterType("rating")}>
              Rating
            </Button>
            <Button pressed={filterType === "feedback"} onClick={() => setFilterType("feedback")}>
              Written Feedback
            </Button>
          </HorizontalStack>
        </div>

        {/* Customer Responses List */}
        {loading ? (
          <Card padding="600">
            <HorizontalStack align="center">
              <Spinner size="large" />
            </HorizontalStack>
          </Card>
        ) : filteredResponses.length === 0 ? (
          <div className="empty-response-card">
            <div className="empty-response-icon">💬</div>
            <h3 className="empty-response-title">No Customer Survey Responses Recorded Yet</h3>
            <p className="empty-response-sub">
              When buyers complete post-purchase surveys on your checkout & Thank You page, their submissions will appear here in real time.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Button onClick={() => navigate ? navigate("/rules/new?type=survey&fixed=true") : (window.location.href = "/rules/new?type=survey&fixed=true")}>
                ＋ Create Survey Rule
              </Button>
              <Button onClick={() => navigate ? navigate("/templates") : (window.location.href = "/templates")}>
                Browse Pre-built Templates
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {filteredResponses.map((r) => {
              const typeStyle = getTypeStyle(r.survey_type);
              const icon = getAnswerIcon(r.answer_value || "", r.survey_type);

              return (
                <div key={r.id} className="response-card-premium">
                  <HorizontalStack align="space-between" blockAlign="center">
                    <HorizontalStack gap="500" blockAlign="center">
                      <div className="avatar-circle" style={{ marginRight: "12px" }}>
                        {getInitials(r.customer_email)}
                      </div>
                      <HorizontalStack gap="400" blockAlign="center">
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginRight: "14px" }}>
                          {r.customer_email}
                        </span>
                        <span className="order-tag">
                          🏷️ {r.order_id || "#1001"}
                        </span>
                      </HorizontalStack>
                    </HorizontalStack>

                    <HorizontalStack gap="500" blockAlign="center">
                      <span
                        className="category-badge-custom"
                        style={{
                          background: typeStyle.bg,
                          color: typeStyle.color,
                          border: `1px solid ${typeStyle.border}`,
                        }}
                      >
                        {typeStyle.label}
                      </span>
                      <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500", marginLeft: "16px" }}>
                        {new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </HorizontalStack>
                  </HorizontalStack>

                  <div className="answer-box-wrapper">
                    <div>
                      <div className="answer-label-tiny">Selected Response</div>
                      <div className="answer-pill-value">
                        <span>{icon}</span>
                        <span>"{r.answer_value}"</span>
                      </div>
                    </div>
                  </div>

                  {r.custom_feedback && (
                    <div className="feedback-quote-box-premium">
                      “{r.custom_feedback}”
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
