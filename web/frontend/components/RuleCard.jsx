import React from "react";
import { Card, Badge, Button, HorizontalStack, VerticalStack, Box, Text } from "@shopify/polaris";
import { formatConditionType, formatOperator } from "../utils/utils";

export default function RuleCard({ rule, onEdit, onDelete, onToggle }) {
  const { title, status, priority, conditions, conditions_operator = "AND", error_message } = rule;

  return (
    <Card>
      <Box padding="4">
        <VerticalStack gap="3">
          <HorizontalStack align="space-between">
            <VerticalStack gap="1">
              <HorizontalStack gap="2" align="center">
                <Text variant="headingMd" as="h3">
                  {title}
                </Text>
                <Badge tone={status === "active" ? "success" : "attention"}>
                  {status === "active" ? "Active" : "Inactive"}
                </Badge>
                <Badge tone="info">Priority: {priority}</Badge>
              </HorizontalStack>
              <Text variant="bodySm" tone="subdued">
                Target: {rule.error_target}
              </Text>
            </VerticalStack>
            <HorizontalStack gap="2">
              <Button size="slim" onClick={() => onToggle(rule)}>
                {status === "active" ? "Deactivate" : "Activate"}
              </Button>
              <Button size="slim" primary onClick={() => onEdit(rule)}>
                Edit
              </Button>
              <Button size="slim" tone="critical" onClick={() => onDelete(rule.id)}>
                Delete
              </Button>
            </HorizontalStack>
          </HorizontalStack>

          <Box padding="3" background="bg-surface-secondary" borderRadius="2">
            <VerticalStack gap="2">
              <Text variant="bodyMd" fontWeight="semibold">
                Conditions ({conditions_operator}):
              </Text>
              {conditions && conditions.map((cond, idx) => (
                <div key={idx} style={{ paddingLeft: "10px" }}>
                  <Text variant="bodyMd" as="span" fontWeight="medium">
                    • {formatConditionType(cond.type)}
                  </Text>{" "}
                  <Text variant="bodyMd" as="span" tone="subdued">
                    {formatOperator(cond.operator)}
                  </Text>{" "}
                  {cond.value && (
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      "{cond.value}"
                    </Text>
                  )}
                </div>
              ))}
            </VerticalStack>
          </Box>

          <VerticalStack gap="1">
            <Text variant="bodySm" fontWeight="semibold" tone="critical">
              Custom Error Message:
            </Text>
            <Text variant="bodyMd" tone="critical">
              "{error_message}"
            </Text>
          </VerticalStack>
        </VerticalStack>
      </Box>
    </Card>
  );
}
