import React, { useState, useEffect } from "react";
import { Page, Card, Layout, Box, HorizontalStack, VerticalStack, Button, Checkbox, Text, Spinner, Badge } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { formatConditionType } from "../utils/utils";

export default function RulesList({ navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      setRules(data);
    } catch (e) {
      shopify.toast.show("Error fetching rules", { isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSelectRule = (id, checked) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(item => item !== id));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(rules.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkToggle = async (status) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/rules/bulk-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status })
      });
      if (res.ok) {
        shopify.toast.show(`Bulk updated rules to ${status}`);
        setSelectedIds([]);
        fetchRules();
      }
    } catch (e) {
      shopify.toast.show("Bulk operation failed", { isError: true });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete these ${selectedIds.length} rules?`)) return;
    try {
      const res = await fetch("/api/rules/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        shopify.toast.show("Rules deleted successfully");
        setSelectedIds([]);
        fetchRules();
      }
    } catch (e) {
      shopify.toast.show("Bulk delete failed", { isError: true });
    }
  };

  const handleToggleSingle = async (rule) => {
    const nextStatus = rule.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rule,
          status: nextStatus
        })
      });
      if (res.ok) {
        shopify.toast.show(`Rule ${nextStatus === "active" ? "activated" : "deactivated"}`);
        fetchRules();
      }
    } catch (e) {
      shopify.toast.show("Update failed", { isError: true });
    }
  };

  const handlePriorityChange = async (rule, increment) => {
    const nextPriority = Math.max(0, (rule.priority || 0) + (increment ? 1 : -1));
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rule,
          priority: nextPriority
        })
      });
      if (res.ok) {
        fetchRules();
      }
    } catch (e) {
      shopify.toast.show("Priority update failed", { isError: true });
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        shopify.toast.show("Rule deleted successfully");
        fetchRules();
      }
    } catch (e) {
      shopify.toast.show("Delete failed", { isError: true });
    }
  };

  if (loading) {
    return (
      <Page title="Rules Management">
        <HorizontalStack align="center">
          <Spinner size="large" />
        </HorizontalStack>
      </Page>
    );
  }

  return (
    <Page
      title="Validation Rules"
      subtitle="Configure rules that prevent checkout execution based on cart attributes."
      backAction={{ content: "Dashboard", onAction: () => navigate("/") }}
      primaryAction={{
        content: "Create Custom Rule",
        onAction: () => navigate("/rules/new")
      }}
      secondaryActions={[
        {
          content: "Pre-built Templates",
          onAction: () => navigate("/templates")
        }
      ]}
    >
      <style>{`
        .bulk-bar {
          background-color: #f6f6f7;
          border-bottom: 1px solid #e1e3e5;
          padding: 12px 16px;
          border-radius: 8px 8px 0 0;
        }
        .rule-row {
          border-bottom: 1px solid #e1e3e5;
          padding: 16px;
          transition: background-color 0.2s ease;
        }
        .rule-row:hover {
          background-color: #fafbfc;
        }
        .priority-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
        }
      `}</style>

      <Card padding="0">
        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bulk-bar">
            <HorizontalStack align="space-between" blockAlign="center">
              <HorizontalStack gap="3" align="center">
                <Text variant="bodyMd" fontWeight="semibold">
                  {selectedIds.length} rules selected
                </Text>
              </HorizontalStack>
              <HorizontalStack gap="2">
                <Button size="slim" onClick={() => handleBulkToggle("active")}>
                  Activate
                </Button>
                <Button size="slim" onClick={() => handleBulkToggle("inactive")}>
                  Deactivate
                </Button>
                <Button size="slim" tone="critical" onClick={handleBulkDelete}>
                  Delete
                </Button>
              </HorizontalStack>
            </HorizontalStack>
          </div>
        )}

        {/* Rules Table */}
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #e1e3e5" }}>
          <HorizontalStack align="space-between" blockAlign="center">
            <Checkbox
              label="Select All Rules"
              checked={rules.length > 0 && selectedIds.length === rules.length}
              indeterminate={selectedIds.length > 0 && selectedIds.length < rules.length}
              onChange={handleSelectAll}
            />
            <Text variant="bodySm" tone="subdued">
              Rules are evaluated top-down based on priority value.
            </Text>
          </HorizontalStack>
        </div>

        {rules.length > 0 ? (
          rules.map((rule) => {
            const isSelected = selectedIds.includes(rule.id);
            return (
              <div key={rule.id} className="rule-row">
                <HorizontalStack align="space-between" blockAlign="center" gap="4">
                  {/* Selector & Info */}
                  <div style={{ flex: 1 }}>
                    <HorizontalStack gap="3" blockAlign="start">
                      <div style={{ paddingTop: "4px" }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => handleSelectRule(rule.id, checked)}
                        />
                      </div>
                      <VerticalStack gap="1">
                        <HorizontalStack gap="2" blockAlign="center">
                          <Text variant="headingMd" as="h4">
                            {rule.title}
                          </Text>
                          <Badge tone={rule.status === "active" ? "success" : "attention"}>
                            {rule.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                          <Badge tone="info">Priority: {rule.priority || 0}</Badge>
                        </HorizontalStack>
                        <Text variant="bodySm" tone="subdued">
                          Block Target: {rule.error_target}
                        </Text>
                        <div style={{ marginTop: "4px" }}>
                          <Text variant="bodySm" fontWeight="semibold">Conditions ({rule.conditions_operator}):</Text>
                          <HorizontalStack gap="2" wrap>
                            {rule.conditions && rule.conditions.map((cond, idx) => (
                              <Badge key={idx} tone="subdued">
                                {formatConditionType(cond.type)} ({cond.value || "Any"})
                              </Badge>
                            ))}
                          </HorizontalStack>
                        </div>
                      </VerticalStack>
                    </HorizontalStack>
                  </div>

                  {/* Priority Adjuster */}
                  <div className="priority-col">
                    <Button plain onClick={() => handlePriorityChange(rule, true)}>▲</Button>
                    <Text variant="bodySm" fontWeight="bold">{rule.priority}</Text>
                    <Button plain onClick={() => handlePriorityChange(rule, false)}>▼</Button>
                  </div>

                  {/* Actions */}
                  <HorizontalStack gap="2">
                    <Button size="slim" onClick={() => handleToggleSingle(rule)}>
                      {rule.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="slim" onClick={() => navigate(`/rules/${rule.id}/versions`)}>
                      Versions
                    </Button>
                    <Button size="slim" onClick={() => navigate(`/rules/${rule.id}`)}>
                      Edit
                    </Button>
                    <Button size="slim" tone="critical" onClick={() => handleDeleteSingle(rule.id)}>
                      Delete
                    </Button>
                  </HorizontalStack>
                </HorizontalStack>
              </div>
            );
          })
        ) : (
          <Box padding="12" textAlign="center">
            <VerticalStack gap="3">
              <Text variant="headingMd" tone="subdued">
                No checkout validation rules created yet.
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Create a custom validation rule or import from our pre-built library of rule templates.
              </Text>
              <HorizontalStack align="center" gap="3">
                <Button primary onClick={() => navigate("/rules/new")}>
                  Create First Rule
                </Button>
                <Button onClick={() => navigate("/templates")}>
                  Browse Templates
                </Button>
              </HorizontalStack>
            </VerticalStack>
          </Box>
        )}
      </Card>
    </Page>
  );
}
