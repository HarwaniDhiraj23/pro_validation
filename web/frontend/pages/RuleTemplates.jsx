import React, { useState, useEffect } from "react";
import { Page, Card, Layout, Box, HorizontalStack, VerticalStack, Button, Text, Spinner, Badge, Grid } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function RuleTemplates({ navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [applyingId, setApplyingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");

  useEffect(() => {
    fetch("/api/templates")
      .then(res => res.json())
      .then(data => {
        setTemplates(data);
      })
      .catch(err => {
        shopify.toast.show("Error loading templates", { isError: true });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleApply = async (id, title) => {
    setApplyingId(id);
    try {
      const res = await fetch(`/api/templates/${id}/apply`, {
        method: "POST"
      });
      if (res.ok) {
        shopify.toast.show(`Template "${title}" applied successfully!`);
        navigate("/rules");
      } else {
        shopify.toast.show("Failed to apply template", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Network error", { isError: true });
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <Page title="Rule Templates">
        <HorizontalStack align="center">
          <Spinner size="large" />
        </HorizontalStack>
      </Page>
    );
  }

  // Get unique categories for filters
  const categories = ["All", ...new Set(templates.map(t => t.category))];
  const filteredTemplates = filterCategory === "All"
    ? templates
    : templates.filter(t => t.category === filterCategory);

  return (
    <Page
      title="Pre-built Rule Templates"
      subtitle="Instantly launch pre-configured checkout validation templates with one click."
      backAction={{ content: "Rules", onAction: () => navigate("/rules") }}
    >
      <style>{`
        .filter-bar {
          margin-bottom: 20px;
        }
        .template-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          height: 200px;
          display: flex;
        }
        .template-card > * {
          flex: 1;
          height: 100%;
        }
        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* Categories Filter Tabs */}
      <div className="filter-bar">
        <HorizontalStack gap="2">
          {categories.map((cat) => (
            <Button
              key={cat}
              pressed={filterCategory === cat}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </HorizontalStack>
      </div>

      {/* Grid Library */}
      <Grid>
        {filteredTemplates.map((tmpl) => (
          <Grid.Cell key={tmpl.id} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <div className="template-card">
              <Card padding="0">
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  padding: "16px",
                  boxSizing: "border-box"
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <Badge tone="info">{tmpl.category}</Badge>
                    </div>
                    <Text variant="headingMd" as="h3">
                      {tmpl.title}
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      {tmpl.description}
                    </Text>
                  </div>

                  <div style={{ marginTop: "12px" }}>
                    <Button
                      primary
                      fullWidth
                      loading={applyingId === tmpl.id}
                      onClick={() => handleApply(tmpl.id, tmpl.title)}
                    >
                      Apply Template
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </Grid.Cell>
        ))}
      </Grid>
    </Page>
  );
}
