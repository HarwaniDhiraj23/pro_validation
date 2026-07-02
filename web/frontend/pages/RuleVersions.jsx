import React, { useState, useEffect } from "react";
import { Page, Card, HorizontalStack, VerticalStack, Box, Text, Spinner, Badge } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { formatDate } from "../utils/utils";

export default function RuleVersions({ ruleId, navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [rollingBackId, setRollingBackId] = useState(null);
  const [ruleName, setRuleName] = useState("Rule");

  useEffect(() => {
    if (ruleId) {
      Promise.all([
        fetch(`/api/rules/${ruleId}`),
        fetch(`/api/rules/${ruleId}/versions`)
      ])
        .then(async ([ruleRes, versionsRes]) => {
          const ruleData = await ruleRes.json();
          const versionsData = await versionsRes.json();
          setRuleName(ruleData.title || "Rule");
          setVersions(versionsData);
        })
        .catch(err => {
          shopify.toast.show("Error loading version history", { isError: true });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [ruleId]);

  const handleRollback = async (version) => {
    setRollingBackId(version);
    try {
      const res = await fetch(`/api/rules/${ruleId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version })
      });
      if (res.ok) {
        shopify.toast.show(`Rolled back to version v${version} successfully!`);
        navigate("/rules");
      } else {
        shopify.toast.show("Failed to rollback", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Network error", { isError: true });
    } finally {
      setRollingBackId(null);
    }
  };

  if (loading) {
    return (
      <Page title="Version History">
        <HorizontalStack align="center">
          <Spinner size="large" />
        </HorizontalStack>
      </Page>
    );
  }

  return (
    <Page
      title={`v${versions.length} - ${ruleName}`}
      subtitle="Version history logs and rollback manager"
      backAction={{ content: "Rules", onAction: () => navigate("/rules") }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .ver-container {
          font-family: 'Inter', sans-serif;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        .ver-header {
          display: flex;
          align-items: center;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 20px;
          font-size: 12px;
          font-weight: 600;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ver-item {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.15s;
        }

        .ver-item:last-child {
          border-bottom: none;
        }

        .ver-item:hover {
          background: #fafbff;
        }

        .col-ver { width: 80px; flex-shrink: 0; }
        .col-time { width: 180px; flex-shrink: 0; font-size: 13px; color: #4b5563; }
        .col-details { flex: 1; min-width: 0; padding-right: 16px; }
        .col-conds { width: 100px; flex-shrink: 0; }
        .col-action { width: 100px; flex-shrink: 0; text-align: right; }

        .ver-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .ver-error-msg {
          font-size: 13px;
          color: #6b7280;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ver-restore-btn {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background: #3b82f6;
          color: white;
          border: 1px solid #3b82f6;
          transition: all 0.15s;
        }

        .ver-restore-btn:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .ver-restore-btn:disabled {
          background: #9ca3af;
          border-color: #9ca3af;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .ver-header { display: none; }
          .ver-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .col-ver, .col-time, .col-details, .col-conds, .col-action {
            width: 100%;
            text-align: left;
            padding: 0;
          }
          .col-action {
            margin-top: 4px;
          }
        }
      `}</style>

      <div className="ver-container">
        <div className="ver-header">
          <div className="col-ver">Version</div>
          <div className="col-time">Timestamp</div>
          <div className="col-details">Details</div>
          <div className="col-conds">Conditions</div>
          <div className="col-action">Action</div>
        </div>

        {versions.length > 0 ? (
          versions.map((ver) => {
            const numConds = ver.conditions ? ver.conditions.length : 0;
            return (
              <div key={ver.version} className="ver-item">
                <div className="col-ver">
                  <Badge tone="info">v{ver.version}</Badge>
                </div>
                <div className="col-time">
                  {formatDate(ver.created_at)}
                </div>
                <div className="col-details">
                  <div className="ver-title">{ver.title}</div>
                  <div className="ver-error-msg" title={ver.error_message}>
                    {ver.error_message}
                  </div>
                </div>
                <div className="col-conds">
                  <Badge tone="attention">{numConds} condition{numConds !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="col-action">
                  <button
                    className="ver-restore-btn"
                    disabled={rollingBackId === ver.version}
                    onClick={() => handleRollback(ver.version)}
                  >
                    {rollingBackId === ver.version ? "Restoring..." : "Restore"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <Box padding="8" textAlign="center">
            <Text tone="subdued">No version history logs found for this rule.</Text>
          </Box>
        )}
      </div>
    </Page>
  );
}
