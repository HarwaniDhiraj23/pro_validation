import React, { useState, useEffect } from "react";
import { Page, Card, HorizontalStack, VerticalStack, Box, Text, Spinner, Badge, Modal } from "@shopify/polaris";
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

export default function RuleVersions({ ruleId, navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [rollingBackId, setRollingBackId] = useState(null);
  const [ruleName, setRuleName] = useState("Rule");
  const [selectedVersion, setSelectedVersion] = useState(null);

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

        .ver-restore-btn.active-ver-btn:hover {
          background: #f0fdf4;
          border-color: #bbf7d0;
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
    </Page>
  );
}

