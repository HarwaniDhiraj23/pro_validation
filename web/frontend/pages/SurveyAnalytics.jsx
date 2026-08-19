import React, { useEffect } from "react";
import { Page, Card, HorizontalStack, Spinner } from "@shopify/polaris";

export default function SurveyAnalytics({ navigate }) {
  useEffect(() => {
    // Redirect to Dashboard where survey analytics & insights are integrated
    if (navigate) {
      navigate("/", { replace: true });
    } else {
      window.location.href = "/";
    }
  }, [navigate]);

  return (
    <Page title="Redirecting to Dashboard...">
      <Card padding="600">
        <HorizontalStack align="center">
          <Spinner size="large" />
        </HorizontalStack>
      </Card>
    </Page>
  );
}
