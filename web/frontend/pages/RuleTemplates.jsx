import React, { useState, useEffect } from "react";
import { Page, Card, Layout, Box, HorizontalStack, VerticalStack, Button, Text, Spinner, Badge, Grid, TextField } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

const PLAN_RANKS = { Free: 1, Basic: 2, Growth: 3, Pro: 4 };

export default function RuleTemplates({ navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [applyingId, setApplyingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [shopPlan, setShopPlan] = useState("Free");
  const [planScope, setPlanScope] = useState("all"); // 'all', 'my_plan', 'upgrade_needed'

  useEffect(() => {
    fetch("/api/billing/plan")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShopPlan(data.plan?.name || "Free");
        }
      })
      .catch(err => console.error("Error fetching shop plan:", err));

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

  const handleApply = (id) => {
    navigate(`/rules/new?templateId=${id}`);
  };

  const isTemplateAllowed = (requiredPlan) => {
    const userRank = PLAN_RANKS[shopPlan] || 1;
    const reqRank = PLAN_RANKS[requiredPlan] || 1;
    return userRank >= reqRank;
  };

  if (loading) {
    return (
      <Page title="Pre-built Rules">
        <HorizontalStack align="center">
          <Spinner size="large" />
        </HorizontalStack>
      </Page>
    );
  }

  // Get unique categories for filters
  const categories = ["All", ...new Set(templates.map(t => t.category))];
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = filterCategory === "All" || t.category === filterCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());

    const isAllowed = isTemplateAllowed(t.required_plan || "Free");
    const matchesScope = planScope === "all" ||
      (planScope === "my_plan" && isAllowed) ||
      (planScope === "upgrade_needed" && !isAllowed);

    return matchesCategory && matchesSearch && matchesScope;
  });

  return (
    <Page
      title="Pre-built Rules Library"
      subtitle={`Explore rule templates. Currently on the ${shopPlan} plan.`}
      backAction={{ content: "Rules", onAction: () => navigate("/rules") }}
      primaryAction={{ content: "Pricing & Plans", onAction: () => navigate("/pricing") }}
    >
      <style>{`
        .filter-bar {
          margin-bottom: 16px;
        }
        .template-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          height: 270px;
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

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <TextField
            label="Search rules"
            labelHidden
            placeholder="Search pre-built rules by title or description..."
            value={searchQuery}
            onChange={setSearchQuery}
            autoComplete="off"
          />
        </div>

        {/* Plan Filter Scope Tabs */}
        <HorizontalStack gap="2">
          <Button pressed={planScope === "all"} onClick={() => setPlanScope("all")}>
            All Templates
          </Button>

          <Button pressed={planScope === "my_plan"} onClick={() => setPlanScope("my_plan")}>
            Included in {shopPlan} Plan
          </Button>

          <Button pressed={planScope === "upgrade_needed"} onClick={() => setPlanScope("upgrade_needed")}>
            Requires Upgrade 🔒
          </Button>
        </HorizontalStack>
      </div>

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
        {filteredTemplates.map((tmpl) => {
          const reqPlan = tmpl.required_plan || "Free";
          const isUnlocked = isTemplateAllowed(reqPlan);

          return (
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
                      <div style={{ display: "flex", justifyContent: "flex-start", gap: "6px", flexWrap: "wrap" }}>
                        <Badge tone="info">{tmpl.category}</Badge>
                        {!isUnlocked ? (
                          <Badge tone="critical">{`${reqPlan} Plan 🔒`}</Badge>
                        ) : (
                          <Badge tone="success">{`${reqPlan} Plan`}</Badge>
                        )}
                      </div>
                      <Text variant="headingMd" as="h3">
                        {tmpl.title}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        {tmpl.description}
                      </Text>
                    </div>

                    <div style={{ marginTop: "12px" }}>
                      {isUnlocked ? (
                        <Button
                          primary
                          fullWidth
                          loading={applyingId === tmpl.id}
                          onClick={() => handleApply(tmpl.id)}
                        >
                          Apply Rule
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          onClick={() => navigate("/pricing")}
                        >
                          Upgrade to {reqPlan} 🔒
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </Grid.Cell>
          );
        })}
      </Grid>
    </Page>
  );
}
