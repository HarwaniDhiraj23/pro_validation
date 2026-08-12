import React, { useState, useEffect } from "react";
import { Page, Card, HorizontalStack, VerticalStack, Box, Text, Spinner, Badge, Modal, Button, Select, FormLayout } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { formatDate } from "../utils/utils";

const CONDITION_LABELS = {
  minimum_order_value: "Minimum Order Value ($)",
  maximum_order_value: "Maximum Order Value ($)",
  customer_tags: "Customer Tags",
  login_required: "Login Status Required",
  b2b_only: "B2B / Wholesale Account",
  guest_checkout_restriction: "Guest Checkout Restriction",
  customer_age: "Customer Age Verification",
  shipping_address_pobox: "Shipping Address (PO Box check)",
  block_states: "Block State Codes",
  block_countries: "Block Country Codes",
  block_zipcodes: "Block ZIP Code Patterns",
  address_regex: "Validate Shipping Address (Regex)",
  restricted_collections: "Restricted Collections",
  restricted_vendors: "Restricted Vendors",
  product_combinations: "Incompatible Product Combinations",
  has_hazardous_item: "Hazardous Item check",
  has_subscription: "Subscription check",
  quantity_limit: "Cart Item Quantity Limit",
  weight_limit: "Weight Limit (kg)",
  sku_limit: "SKU Count Limit"
};

const OPERATOR_LABELS = {
  contains: "contains",
  not_contains: "does not contain",
  is_guest: "is guest",
  is_not_guest: "is registered",
  is_not_b2b: "is not B2B account",
  under_age: "is under age",
  greater_than: "is greater than or equal to",
  less_than: "is less than",
  is_pobox: "is PO box",
  not_pobox: "is not PO box",
  in_states: "is in state list",
  not_in_states: "is not in state list",
  in_countries: "is in country list",
  not_in_countries: "is not in country list",
  in_zips: "starts with ZIP list",
  matches_regex: "matches regex pattern",
  not_matches_regex: "does not match regex pattern",
  in_collections: "contains products in collections",
  not_in_collections: "does not contain products in collections",
  in_vendors: "contains products from vendors",
  not_in_vendors: "does not contain products from vendors",
  cannot_combine: "contains all combinations together",
  equals: "equals"
};

function diffConditions(condsA = [], condsB = []) {
  const mapA = new Map();
  (condsA || []).forEach(c => mapA.set(`${c.type}:${c.operator}`, c));

  const mapB = new Map();
  (condsB || []).forEach(c => mapB.set(`${c.type}:${c.operator}`, c));

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const result = [];

  allKeys.forEach(key => {
    const itemA = mapA.get(key);
    const itemB = mapB.get(key);

    if (itemA && itemB) {
      const isDifferent = String(itemA.value).trim() !== String(itemB.value).trim();
      result.push({
        status: isDifferent ? "modified" : "same",
        type: itemA.type,
        operator: itemA.operator,
        valA: itemA.value,
        valB: itemB.value
      });
    } else if (itemA && !itemB) {
      result.push({
        status: "removed",
        type: itemA.type,
        operator: itemA.operator,
        valA: itemA.value,
        valB: null
      });
    } else if (!itemA && itemB) {
      result.push({
        status: "added",
        type: itemB.type,
        operator: itemB.operator,
        valA: null,
        valB: itemB.value
      });
    }
  });

  return result;
}

export default function RuleVersions({ ruleId, navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [rollingBackId, setRollingBackId] = useState(null);
  const [ruleName, setRuleName] = useState("Rule");
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [planName, setPlanName] = useState("Free");
  const [lockMessage, setLockMessage] = useState("");

  // Version Comparison State
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareSourceVerNum, setCompareSourceVerNum] = useState(null);
  const [compareTargetVerNum, setCompareTargetVerNum] = useState(null);

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

          if (versionsData && versionsData.isLocked) {
            setIsLocked(true);
            setPlanName(versionsData.planName || "Free");
            setLockMessage(versionsData.message || "Version history retention is not available on the Free plan.");
            setVersions([]);
          } else {
            setIsLocked(false);
            const fetchedVersions = Array.isArray(versionsData) ? versionsData : (versionsData.versions || []);
            setVersions(fetchedVersions);
          }
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
        const errorData = await res.json().catch(() => ({}));
        shopify.toast.show(errorData.error || "Failed to rollback", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Network error", { isError: true });
    } finally {
      setRollingBackId(null);
    }
  };

  const handleOpenCompare = (sourceVer) => {
    setCompareSourceVerNum(sourceVer.version);
    const defaultTarget = versions.find(v => v.version !== sourceVer.version) || versions[0];
    setCompareTargetVerNum(defaultTarget ? defaultTarget.version : sourceVer.version);
    setCompareModalOpen(true);
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

  if (isLocked) {
    return (
      <Page
        title={`Version History - ${ruleName}`}
        subtitle="Version history retention & rollback manager"
        backAction={{ content: "Rules", onAction: () => navigate("/rules") }}
        primaryAction={{ content: "Pricing & Plans", onAction: () => navigate("/pricing") }}
      >
        <Card padding="5">
          <VerticalStack gap="4">
            <Box padding="4">
              <Text variant="headingMd" as="h3">Version History Locked 🔒 ({planName} Plan)</Text>
              <Text variant="bodyMd" tone="subdued">
                {lockMessage || "Version history retention & rollback is not available on the Free plan."}
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Upgrade to <strong>Basic Plan</strong> ($9/mo) to keep 3 versions, <strong>Growth Plan</strong> ($29/mo) for 10 versions, or <strong>Pro Plan</strong> ($79/mo) for unlimited history retention.
              </Text>
              <div style={{ marginTop: "16px" }}>
                <Button primary onClick={() => navigate("/pricing")}>
                  Upgrade Plan to Unlock Version History
                </Button>
              </div>
            </Box>
          </VerticalStack>
        </Card>
      </Page>
    );
  }

  const verA = versions.find(v => v.version === compareSourceVerNum) || versions[0];
  const verB = versions.find(v => v.version === compareTargetVerNum) || versions[0];
  const condDiffs = diffConditions(verA?.conditions, verB?.conditions);

  const versionOptions = versions.map((v, i) => ({
    label: i === 0 ? `v${v.version} - ${v.title} (Active)` : `v${v.version} - ${v.title}`,
    value: String(v.version)
  }));

  return (
    <Page
      title={`v${versions.length} - ${ruleName}`}
      subtitle="Version history logs and rollback manager"
      backAction={{ content: "Rules", onAction: () => navigate("/rules") }}
      primaryAction={
        versions.length > 1 ? {
          content: "Compare Versions",
          onAction: () => handleOpenCompare(versions[0])
        } : undefined
      }
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Premium custom select overrides (identical to RuleBuilder) */
        .Polaris-Select__Input {
          background-color: #ffffff !important;
          border: 1px solid #cccccc !important;
          border-radius: 8px !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 13px !important;
          color: #202223 !important;
          padding: 8px 36px 8px 12px !important;
          min-height: 38px !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
          cursor: pointer !important;
        }
        .Polaris-Select__Input:focus {
          border-color: #008060 !important;
          box-shadow: 0 0 0 2px rgba(0, 128, 96, 0.15) !important;
        }
        .Polaris-Select__Backdrop {
          border-radius: 8px !important;
          border-color: #cccccc !important;
        }
        .Polaris-Select__Input:hover:not(:focus) {
          border-color: #999999 !important;
        }

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
        .col-action { 
          width: 170px; 
          flex-shrink: 0; 
          display: flex; 
          gap: 8px; 
          justify-content: flex-end; 
        }

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

        .ver-preview-btn {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          transition: all 0.15s;
        }

        .ver-preview-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
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

        .ver-restore-btn.active-ver-btn {
          background: #f0fdf4;
          color: #166534;
          border-color: #bbf7d0;
          cursor: default;
        }

        /* Diff Comparison Styles */
        .compare-selector-box {
          display: flex;
          gap: 12px;
          background: #f8fafc;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          box-sizing: border-box;
          width: 100%;
        }
        .compare-selector-item {
          flex: 1;
          min-width: 0;
        }
        .diff-table-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
          box-sizing: border-box;
        }
        .diff-grid {
          display: grid;
          grid-template-columns: 100px 1fr 1fr;
          gap: 8px;
          align-items: center;
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
          box-sizing: border-box;
          width: 100%;
        }
        .diff-grid > div {
          min-width: 0;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .diff-grid.diff-header {
          background: #f8fafc;
          font-weight: 700;
          color: #475569;
        }
        .diff-changed {
          background: #fffbeb;
          border-left: 3px solid #f59e0b;
        }
        .diff-same {
          background: #ffffff;
        }
        .diff-val-del {
          background: #fef2f2;
          color: #991b1b;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #fca5a5;
        }
        .diff-val-add {
          background: #f0fdf4;
          color: #166534;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #86efac;
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
            justify-content: flex-start;
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
          versions.map((ver, idx) => {
            const numConds = ver.conditions ? ver.conditions.length : 0;
            const isActive = idx === 0; // Sorted descending, first item is active version
            return (
              <div key={ver.version} className="ver-item">
                <div className="col-ver">
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                    <Badge tone="info">v{ver.version}</Badge>
                  </div>
                </div>
                <div className="col-time">
                  {formatDate(ver.created_at)}
                </div>
                <div className="col-details">
                  <div className="ver-title">{ver.title}</div>
                  <div className="ver-error-msg" title={ver.error_message}>
                    {ver.rule_type === "delivery"
                      ? `Action: ${ver.delivery_action === "rename" ? `Rename "${ver.error_target}" to "${ver.error_message}"` : `Hide "${ver.error_target}"`}`
                      : ver.error_message
                    }
                  </div>
                </div>
                <div className="col-conds">
                  <Badge tone="attention">{numConds} condition{numConds !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="col-action">
                  <button
                    className="ver-preview-btn"
                    onClick={() => setSelectedVersion(ver)}
                  >
                    Review
                  </button>
                  {isActive ? (
                    <button className="ver-restore-btn active-ver-btn" disabled>
                      Active
                    </button>
                  ) : (
                    <button
                      className="ver-restore-btn"
                      disabled={rollingBackId === ver.version}
                      onClick={() => handleRollback(ver.version)}
                    >
                      {rollingBackId === ver.version ? "Restoring..." : "Restore"}
                    </button>
                  )}
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

      {/* Review Version Modal */}
      {selectedVersion && (
        <Modal
          open={selectedVersion !== null}
          onClose={() => setSelectedVersion(null)}
          title={`Review Rule Version v${selectedVersion.version}`}
          primaryAction={
            selectedVersion.version === versions[0].version
              ? undefined
              : {
                content: rollingBackId === selectedVersion.version ? "Restoring..." : "Restore this version",
                onAction: () => {
                  handleRollback(selectedVersion.version);
                  setSelectedVersion(null);
                },
                disabled: rollingBackId === selectedVersion.version
              }
          }
          secondaryActions={[
            {
              content: "Close",
              onAction: () => setSelectedVersion(null)
            }
          ]}
        >
          <Modal.Section>
            <VerticalStack gap="4">
              <Box>
                <Text variant="headingSm" as="h3">General Settings</Text>
                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <Text variant="bodyMd" tone="subdued">Rule Title</Text>
                    <Text variant="bodyMd" fontWeight="semibold">{selectedVersion.title}</Text>
                  </div>
                  <div>
                    <Text variant="bodyMd" tone="subdued">Priority</Text>
                    <Text variant="bodyMd" fontWeight="semibold">{selectedVersion.priority}</Text>
                  </div>
                  <div>
                    <Text variant="bodyMd" tone="subdued">Target Store</Text>
                    <Text variant="bodyMd" fontWeight="semibold">{selectedVersion.target_shop || "All Stores (Global)"}</Text>
                  </div>
                  <div>
                    <Text variant="bodyMd" tone="subdued">Created At</Text>
                    <Text variant="bodyMd" fontWeight="semibold">{formatDate(selectedVersion.created_at)}</Text>
                  </div>
                  <div>
                    <Text variant="bodyMd" tone="subdued">Version Status</Text>
                    <div style={{ marginTop: "4px" }}>
                      {selectedVersion.version === versions[0].version ? (
                        <Badge tone="success">Active (Current)</Badge>
                      ) : (
                        <Badge tone="subdued">Inactive (Old Version)</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Box>

              <Box style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                <Text variant="headingSm" as="h3">
                  Conditions ({selectedVersion.conditions_operator || "AND"})
                </Text>
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Array.isArray(selectedVersion.conditions) && selectedVersion.conditions.length > 0 ? (
                    selectedVersion.conditions.map((cond, index) => (
                      <div key={index} style={{
                        padding: "12px",
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Text variant="bodyMd" fontWeight="semibold" tone="brand">
                            {CONDITION_LABELS[cond.type] || cond.type.replace(/_/g, " ")}
                          </Text>
                          <Badge tone="attention">
                            {OPERATOR_LABELS[cond.operator] || cond.operator.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {cond.value && (
                          <div style={{ marginTop: "4px" }}>
                            <Text variant="bodySm" tone="subdued">Value: </Text>
                            <span style={{ fontSize: "13px", fontWeight: "550", color: "#111827", wordBreak: "break-all" }}>
                              {cond.value}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <Text variant="bodyMd" tone="subdued">No conditions defined.</Text>
                  )}
                </div>
              </Box>

              {selectedVersion.rule_type === "delivery" ? (
                <Box style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                  <Text variant="headingSm" as="h3">Delivery Customization Action</Text>
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <Text variant="bodyMd" tone="subdued">Target Shipping Method</Text>
                      <Text variant="bodyMd" fontWeight="semibold">{selectedVersion.error_target}</Text>
                    </div>
                    <div>
                      <Text variant="bodyMd" tone="subdued">Action Type</Text>
                      <Text variant="bodyMd" fontWeight="semibold">{selectedVersion.delivery_action === "rename" ? "Rename" : "Hide"}</Text>
                    </div>
                    {selectedVersion.delivery_action === "rename" && (
                      <div>
                        <Text variant="bodyMd" tone="subdued">Rename To</Text>
                        <Text variant="bodyMd" fontWeight="semibold">"{selectedVersion.error_message}"</Text>
                      </div>
                    )}
                  </div>
                </Box>
              ) : selectedVersion.rule_type === "payment" ? (
                <Box style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                  <Text variant="headingSm" as="h3">Payment Customization Action</Text>
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <Text variant="bodyMd" tone="subdued">Target Payment Method</Text>
                      <Text variant="bodyMd" fontWeight="semibold">{selectedVersion.error_target}</Text>
                    </div>
                    <div>
                      <Text variant="bodyMd" tone="subdued">Action Type</Text>
                      <Text variant="bodyMd" fontWeight="semibold">{selectedVersion.delivery_action === "rename" ? "Rename" : "Hide"}</Text>
                    </div>
                    {selectedVersion.delivery_action === "rename" && (
                      <div>
                        <Text variant="bodyMd" tone="subdued">Rename To</Text>
                        <Text variant="bodyMd" fontWeight="semibold">"{selectedVersion.error_message}"</Text>
                      </div>
                    )}
                  </div>
                </Box>
              ) : (
                <Box style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                  <Text variant="headingSm" as="h3">Error Display</Text>
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <Text variant="bodyMd" tone="subdued">Block Target Field</Text>
                      <Text variant="bodyMd" fontWeight="semibold">{selectedVersion.error_target || "$.cart"}</Text>
                    </div>
                    <div>
                      <Text variant="bodyMd" tone="subdued">Custom Error Message</Text>
                      <div style={{
                        padding: "12px",
                        background: "#fff0f0",
                        border: "1px solid #ffc1c1",
                        borderLeft: "4px solid #ff4d4d",
                        borderRadius: "6px",
                        color: "#b30000",
                        fontSize: "13px",
                        marginTop: "6px",
                        fontWeight: "500",
                        lineHeight: "1.4"
                      }}>
                        {selectedVersion.error_message}
                      </div>
                    </div>
                  </div>
                </Box>
              )}
            </VerticalStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Compare Versions Modal */}
      {compareModalOpen && verA && verB && (
        <Modal
          open={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          title={`Compare Version v${verA.version} vs v${verB.version}`}
          primaryAction={
            verA.version === versions[0].version
              ? undefined
              : {
                content: `Restore Version v${verA.version}`,
                onAction: () => {
                  handleRollback(verA.version);
                  setCompareModalOpen(false);
                }
              }
          }
          secondaryActions={[
            {
              content: "Close",
              onAction: () => setCompareModalOpen(false)
            }
          ]}
        >
          <Modal.Section>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", boxSizing: "border-box" }}>
              {/* Version Selectors */}
              <FormLayout>
                <FormLayout.Group>
                  <Select
                    label="Version A (Source)"
                    options={versionOptions}
                    value={String(verA.version)}
                    onChange={(val) => setCompareSourceVerNum(parseInt(val, 10))}
                  />
                  <Select
                    label="Version B (Target)"
                    options={versionOptions}
                    value={String(verB.version)}
                    onChange={(val) => setCompareTargetVerNum(parseInt(val, 10))}
                  />
                </FormLayout.Group>
              </FormLayout>

              {/* Side-by-Side Diff Table */}
              <div className="diff-table-card">
                <div className="diff-grid diff-header">
                  <div>Setting</div>
                  <div>Version v{verA.version} {verA.version === versions[0].version ? "(Active)" : ""}</div>
                  <div>Version v{verB.version} {verB.version === versions[0].version ? "(Active)" : ""}</div>
                </div>

                {/* Title */}
                <div className={`diff-grid ${verA.title !== verB.title ? "diff-changed" : "diff-same"}`}>
                  <div style={{ fontWeight: "600", color: "#475569" }}>Title</div>
                  <div className={verA.title !== verB.title ? "diff-val-del" : ""}>{verA.title}</div>
                  <div className={verA.title !== verB.title ? "diff-val-add" : ""}>{verB.title}</div>
                </div>

                {/* Priority */}
                <div className={`diff-grid ${verA.priority !== verB.priority ? "diff-changed" : "diff-same"}`}>
                  <div style={{ fontWeight: "600", color: "#475569" }}>Priority</div>
                  <div className={verA.priority !== verB.priority ? "diff-val-del" : ""}>{verA.priority}</div>
                  <div className={verA.priority !== verB.priority ? "diff-val-add" : ""}>{verB.priority}</div>
                </div>

                {/* Target Shop */}
                <div className={`diff-grid ${verA.target_shop !== verB.target_shop ? "diff-changed" : "diff-same"}`}>
                  <div style={{ fontWeight: "600", color: "#475569" }}>Store Scope</div>
                  <div>{verA.target_shop || "All Stores"}</div>
                  <div>{verB.target_shop || "All Stores"}</div>
                </div>

                {/* Target Field */}
                <div className={`diff-grid ${verA.error_target !== verB.error_target ? "diff-changed" : "diff-same"}`}>
                  <div style={{ fontWeight: "600", color: "#475569" }}>Target Field</div>
                  <div><code>{verA.error_target || "$.cart"}</code></div>
                  <div><code>{verB.error_target || "$.cart"}</code></div>
                </div>

                {/* Message */}
                <div className={`diff-grid ${verA.error_message !== verB.error_message ? "diff-changed" : "diff-same"}`}>
                  <div style={{ fontWeight: "600", color: "#475569" }}>Message</div>
                  <div className={verA.error_message !== verB.error_message ? "diff-val-del" : ""}>{verA.error_message || "—"}</div>
                  <div className={verA.error_message !== verB.error_message ? "diff-val-add" : ""}>{verB.error_message || "—"}</div>
                </div>
              </div>

              {/* Conditions Diff Comparison */}
              <div>
                <Text variant="headingSm" as="h4">Conditions Comparison</Text>
                <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {condDiffs.length > 0 ? (
                    condDiffs.map((diff, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: `1px solid ${diff.status === "added" ? "#86efac" : diff.status === "removed" ? "#fca5a5" : diff.status === "modified" ? "#fcd34d" : "#e2e8f0"}`,
                          background: diff.status === "added" ? "#f0fdf4" : diff.status === "removed" ? "#fef2f2" : diff.status === "modified" ? "#fffbeb" : "#ffffff",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          wordBreak: "break-word"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "13px" }}>
                            {CONDITION_LABELS[diff.type] || diff.type}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            Operator: <code>{OPERATOR_LABELS[diff.operator] || diff.operator}</code>
                          </div>
                          <div style={{ fontSize: "12px", marginTop: "4px" }}>
                            {diff.status === "added" && <span style={{ color: "#166534", fontWeight: "600" }}>Added in v{verB.version}: {diff.valB}</span>}
                            {diff.status === "removed" && <span style={{ color: "#991b1b", fontWeight: "600" }}>Only in v{verA.version}: {diff.valA}</span>}
                            {diff.status === "modified" && (
                              <span>
                                <span style={{ textDecoration: "line-through", color: "#991b1b", marginRight: "8px" }}>v{verA.version}: {diff.valA}</span>
                                <span style={{ color: "#166534", fontWeight: "600" }}>v{verB.version}: {diff.valB}</span>
                              </span>
                            )}
                            {diff.status === "same" && <span>Value: <code>{diff.valA || "—"}</code></span>}
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: "8px" }}>
                          {diff.status === "added" && <Badge tone="success">+ Added in v{verB.version}</Badge>}
                          {diff.status === "removed" && <Badge tone="critical">- Removed in v{verB.version}</Badge>}
                          {diff.status === "modified" && <Badge tone="warning">~ Value Changed</Badge>}
                          {diff.status === "same" && <Badge tone="subdued">Identical</Badge>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <Text tone="subdued">No condition differences detected.</Text>
                  )}
                </div>
              </div>
            </div>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
