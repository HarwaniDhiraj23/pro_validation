import React, { useState, useEffect } from "react";
import { Page, Card, HorizontalStack, VerticalStack, Box, Text, Button, Spinner, Badge, DataTable } from "@shopify/polaris";
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
      <Card title="Version Audit Logs">
        <Box padding="0">
          <DataTable
            columnContentTypes={["text", "text", "text", "text", "numeric", "text"]}
            headings={["Ver", "Timestamp", "Title", "Error Message", "Conditions", "Action"]}
            rows={versions.map((ver) => [
              <Badge tone="info">v{ver.version}</Badge>,
              formatDate(ver.created_at),
              ver.title,
              ver.error_message,
              ver.conditions ? ver.conditions.length : 0,
              <Button
                size="slim"
                loading={rollingBackId === ver.version}
                onClick={() => handleRollback(ver.version)}
              >
                Restore
              </Button>
            ])}
          />
        </Box>
      </Card>
    </Page>
  );
}
