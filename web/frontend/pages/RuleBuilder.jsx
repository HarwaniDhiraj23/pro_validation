import React, { useState, useEffect } from "react";
import { Page, Card, Layout, FormLayout, TextField, Select, Button, HorizontalStack, VerticalStack, Box, Text, Spinner, Checkbox, Modal } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

const US_STATES = [
  { label: "Alabama (AL)", value: "AL" },
  { label: "Alaska (AK)", value: "AK" },
  { label: "Arizona (AZ)", value: "AZ" },
  { label: "Arkansas (AR)", value: "AR" },
  { label: "California (CA)", value: "CA" },
  { label: "Colorado (CO)", value: "CO" },
  { label: "Connecticut (CT)", value: "CT" },
  { label: "Delaware (DE)", value: "DE" },
  { label: "Florida (FL)", value: "FL" },
  { label: "Georgia (GA)", value: "GA" },
  { label: "Hawaii (HI)", value: "HI" },
  { label: "Idaho (ID)", value: "ID" },
  { label: "Illinois (IL)", value: "IL" },
  { label: "Indiana (IN)", value: "IN" },
  { label: "Iowa (IA)", value: "IA" },
  { label: "Kansas (KS)", value: "KS" },
  { label: "Kentucky (KY)", value: "KY" },
  { label: "Louisiana (LA)", value: "LA" },
  { label: "Maine (ME)", value: "ME" },
  { label: "Maryland (MD)", value: "MD" },
  { label: "Massachusetts (MA)", value: "MA" },
  { label: "Michigan (MI)", value: "MI" },
  { label: "Minnesota (MN)", value: "MN" },
  { label: "Mississippi (MS)", value: "MS" },
  { label: "Missouri (MO)", value: "MO" },
  { label: "Montana (MT)", value: "MT" },
  { label: "Nebraska (NE)", value: "NE" },
  { label: "Nevada (NV)", value: "NV" },
  { label: "New Hampshire (NH)", value: "NH" },
  { label: "New Jersey (NJ)", value: "NJ" },
  { label: "New Mexico (NM)", value: "NM" },
  { label: "New York (NY)", value: "NY" },
  { label: "North Carolina (NC)", value: "NC" },
  { label: "North Dakota (ND)", value: "ND" },
  { label: "Ohio (OH)", value: "OH" },
  { label: "Oklahoma (OK)", value: "OK" },
  { label: "Oregon (OR)", value: "OR" },
  { label: "Pennsylvania (PA)", value: "PA" },
  { label: "Puerto Rico (PR)", value: "PR" },
  { label: "Rhode Island (RI)", value: "RI" },
  { label: "South Carolina (SC)", value: "SC" },
  { label: "South Dakota (SD)", value: "SD" },
  { label: "Tennessee (TN)", value: "TN" },
  { label: "Texas (TX)", value: "TX" },
  { label: "Utah (UT)", value: "UT" },
  { label: "Vermont (VT)", value: "VT" },
  { label: "Virginia (VA)", value: "VA" },
  { label: "Washington (WA)", value: "WA" },
  { label: "West Virginia (WV)", value: "WV" },
  { label: "Wisconsin (WI)", value: "WI" },
  { label: "Wyoming (WY)", value: "WY" }
];

const COMMON_COUNTRIES = [
  { label: "United States (US)", value: "US" },
  { label: "Canada (CA)", value: "CA" },
  { label: "United Kingdom (GB)", value: "GB" },
  { label: "Australia (AU)", value: "AU" },
  { label: "Germany (DE)", value: "DE" },
  { label: "France (FR)", value: "FR" },
  { label: "India (IN)", value: "IN" },
  { label: "North Korea (KP)", value: "KP" },
  { label: "Iran (IR)", value: "IR" },
  { label: "Syria (SY)", value: "SY" }
];

const CONDITION_TYPES = [
  { label: "Customer Tags", value: "customer_tags" },
  { label: "Login Required", value: "login_required" },
  { label: "B2B Only Checkout", value: "b2b_only" },
  { label: "Guest Restriction", value: "guest_checkout_restriction" },
  { label: "Customer Age", value: "customer_age" },
  { label: "Block PO Box Addresses", value: "shipping_address_pobox" },
  { label: "Restricted States", value: "block_states" },
  { label: "Restricted Countries", value: "block_countries" },
  { label: "Restricted ZIPs", value: "block_zipcodes" },
  { label: "Regex Address Match", value: "address_regex" },
  { label: "Restricted Collections", value: "restricted_collections" },
  { label: "Restricted Vendors", value: "restricted_vendors" },
  { label: "Product Combinations", value: "product_combinations" },
  { label: "Hazardous Items", value: "has_hazardous_item" },
  { label: "Subscription Restriction", value: "has_subscription" },
  { label: "Minimum Order Value", value: "minimum_order_value" },
  { label: "Maximum Order Value", value: "maximum_order_value" },
  { label: "Quantity Limit", value: "quantity_limit" },
  { label: "Weight Limit", value: "weight_limit" },
  { label: "SKU Count Limit", value: "sku_limit" }
];

const OPERATORS_BY_TYPE = {
  customer_tags: [
    { label: "contains", value: "contains" },
    { label: "does not contain", value: "not_contains" }
  ],
  login_required: [
    { label: "is guest", value: "is_guest" },
    { label: "is registered", value: "is_not_guest" }
  ],
  b2b_only: [
    { label: "is not B2B account", value: "is_not_b2b" }
  ],
  guest_checkout_restriction: [
    { label: "is guest customer", value: "is_guest" }
  ],
  customer_age: [
    { label: "is under age", value: "under_age" },
    { label: "is equal or older than", value: "greater_than" }
  ],
  shipping_address_pobox: [
    { label: "is PO box", value: "is_pobox" },
    { label: "is not PO box", value: "not_pobox" }
  ],
  block_states: [
    { label: "is in state code list", value: "in_states" },
    { label: "is not in state code list", value: "not_in_states" }
  ],
  block_countries: [
    { label: "is in country code list", value: "in_countries" },
    { label: "is not in country code list", value: "not_in_countries" }
  ],
  block_zipcodes: [
    { label: "starts with ZIP list", value: "in_zips" }
  ],
  address_regex: [
    { label: "matches regex pattern", value: "matches_regex" },
    { label: "does not match regex pattern", value: "not_matches_regex" }
  ],
  restricted_collections: [
    { label: "contains products in collections", value: "in_collections" },
    { label: "does not contain products in collections", value: "not_in_collections" }
  ],
  restricted_vendors: [
    { label: "contains product from vendor", value: "in_vendors" },
    { label: "does not contain product from vendor", value: "not_in_vendors" }
  ],
  product_combinations: [
    { label: "contains all combinations together", value: "cannot_combine" }
  ],
  has_hazardous_item: [
    { label: "is present", value: "equals" }
  ],
  has_subscription: [
    { label: "is present", value: "equals" }
  ],
  minimum_order_value: [
    { label: "is less than", value: "less_than" }
  ],
  maximum_order_value: [
    { label: "is greater than", value: "greater_than" }
  ],
  quantity_limit: [
    { label: "is greater than", value: "greater_than" },
    { label: "is less than", value: "less_than" }
  ],
  weight_limit: [
    { label: "is greater than", value: "greater_than" },
    { label: "is less than", value: "less_than" }
  ],
  sku_limit: [
    { label: "is greater than", value: "greater_than" }
  ]
};

const ERROR_TARGETS = [
  { label: "Cart Summary (Generic)", value: "$.cart" },
  { label: "Delivery Address Form", value: "$.cart.deliveryGroups[0].deliveryAddress" },
  { label: "First Line Item", value: "$.cart.lines[0]" }
];

export default function RuleBuilder({ ruleId, navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("0");
  const [status, setStatus] = useState("active");
  const [conditionsOperator, setConditionsOperator] = useState("AND");
  const [errorMessage, setErrorMessage] = useState("We cannot complete your checkout with the current items or address details.");
  const [errorTarget, setErrorTarget] = useState("$.cart");
  const [conditions, setConditions] = useState([
    { type: "minimum_order_value", operator: "less_than", value: "50" }
  ]);

  const [browseModalOpen, setBrowseModalOpen] = useState(false);
  const [browseType, setBrowseType] = useState("");
  const [browseIdx, setBrowseIdx] = useState(null);
  const [browseItems, setBrowseItems] = useState([]);
  const [selectedBrowseItems, setSelectedBrowseItems] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  useEffect(() => {
    if (ruleId && ruleId !== "new") {
      setLoading(true);
      fetch(`/api/rules/${ruleId}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setTitle(data.title);
            setPriority(String(data.priority || 0));
            setStatus(data.status);
            setConditionsOperator(data.conditions_operator || "AND");
            setErrorMessage(data.error_message);
            setErrorTarget(data.error_target || "$.cart");
            setConditions(data.conditions || []);
          }
        })
        .catch(err => {
          shopify.toast.show("Error loading rule data", { isError: true });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [ruleId]);

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { type: "customer_tags", operator: "contains", value: "" }
    ]);
  };

  const handleRemoveCondition = (index) => {
    setConditions(conditions.filter((_, idx) => idx !== index));
  };

  const handleConditionChange = (index, field, value) => {
    const updated = [...conditions];
    updated[index][field] = value;

    // Auto-reset operator and value if condition type changes
    if (field === "type") {
      const defaultOp = OPERATORS_BY_TYPE[value]?.[0]?.value || "equals";
      updated[index]["operator"] = defaultOp;
      updated[index]["value"] = "";
    }

    setConditions(updated);
  };

  const handleOpenBrowse = async (idx, type, currentValue) => {
    setBrowseIdx(idx);
    setBrowseType(type);
    
    // Parse current values
    const currentList = currentValue ? currentValue.split(",").map(v => v.trim()) : [];
    setSelectedBrowseItems(currentList);

    if (type === "customer_tags") {
      setBrowseLoading(true);
      setBrowseModalOpen(true);
      try {
        const res = await fetch("/api/rules/customer-tags");
        if (res.ok) {
          const tags = await res.json();
          setBrowseItems(tags.map(t => ({ label: t, value: t })));
        } else {
          setBrowseItems([]);
        }
      } catch (err) {
        setBrowseItems([]);
      } finally {
        setBrowseLoading(false);
      }
    } else if (type === "block_states") {
      setBrowseItems(US_STATES);
      setBrowseModalOpen(true);
    } else if (type === "block_countries") {
      setBrowseItems(COMMON_COUNTRIES);
      setBrowseModalOpen(true);
    }
  };

  const handleSaveBrowseSelection = () => {
    if (browseIdx !== null) {
      const value = selectedBrowseItems.join(",");
      handleConditionChange(browseIdx, "value", value);
    }
    setBrowseModalOpen(false);
  };

  const handleToggleBrowseItem = (val) => {
    setSelectedBrowseItems(prev => {
      if (prev.includes(val)) {
        return prev.filter(item => item !== val);
      } else {
        return [...prev, val];
      }
    });
  };

  const handleSelectResources = async (idx, condType) => {
    try {
      let pickerType = "product";
      if (condType === "restricted_collections") {
        pickerType = "collection";
      }

      const selected = await shopify.resourcePicker({
        type: pickerType,
        multiple: true,
      });

      if (selected && selected.selection) {
        const ids = selected.selection.map(item => item.id).join(",");
        handleConditionChange(idx, "value", ids);
      }
    } catch (error) {
      console.error("Resource picker error:", error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      shopify.toast.show("Title is required", { isError: true });
      return;
    }
    if (!errorMessage.trim()) {
      shopify.toast.show("Error message is required", { isError: true });
      return;
    }
    if (conditions.length === 0) {
      shopify.toast.show("At least one condition must be specified", { isError: true });
      return;
    }

    setSaving(true);
    const body = {
      title,
      priority: parseInt(priority) || 0,
      status,
      conditions_operator: conditionsOperator,
      conditions,
      error_message: errorMessage,
      error_target: errorTarget
    };

    try {
      const url = ruleId && ruleId !== "new" ? `/api/rules/${ruleId}` : "/api/rules";
      const method = ruleId && ruleId !== "new" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        shopify.toast.show("Rule saved successfully!");
        navigate("/rules");
      } else {
        shopify.toast.show("Failed to save rule", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Network error", { isError: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page title="Loading Rule...">
        <HorizontalStack align="center">
          <Spinner size="large" />
        </HorizontalStack>
      </Page>
    );
  }

  return (
    <Page
      title={ruleId && ruleId !== "new" ? "Edit Validation Rule" : "Create Validation Rule"}
      backAction={{ content: "Rules", onAction: () => navigate("/rules") }}
      primaryAction={{
        content: saving ? "Saving..." : "Save Rule",
        onAction: handleSave,
        loading: saving
      }}
    >
      <style>{`
        .checkout-banner {
          background-color: #fff0f0;
          border: 1px solid #ffc1c1;
          border-left: 5px solid #ff4d4d;
          border-radius: 6px;
          padding: 16px;
          color: #b30000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin-top: 12px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .cond-row {
          background-color: #f9fafb;
          border: 1px solid #e1e3e5;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
        }
      `}</style>

      <Layout>
        {/* Core Settings */}
        <Layout.Section>
          <VerticalStack gap="4">
            <Card>
              <Box padding="5">
                <FormLayout>
                  <TextField
                    label="Rule Title"
                    value={title}
                    onChange={setTitle}
                    placeholder="e.g. Block PO Box Orders"
                    autoComplete="off"
                  />

                  <HorizontalStack gap="4">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Priority"
                        type="number"
                        value={priority}
                        onChange={setPriority}
                        helpText="Higher priority rules evaluate first."
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Rule Status"
                        options={[
                          { label: "Active", value: "active" },
                          { label: "Inactive", value: "inactive" }
                        ]}
                        value={status}
                        onChange={setStatus}
                      />
                    </div>
                  </HorizontalStack>
                </FormLayout>
              </Box>
            </Card>

            {/* Conditions Section */}
            <Card title="Conditions Configuration">
              <Box padding="5">
                <VerticalStack gap="4">
                  <HorizontalStack align="space-between" blockAlign="center">
                    <Text variant="headingSm">Match Conditions</Text>
                    <div style={{ width: "150px" }}>
                      <Select
                        label="Operator"
                        labelHidden
                        options={[
                          { label: "Match ALL (AND)", value: "AND" },
                          { label: "Match ANY (OR)", value: "OR" }
                        ]}
                        value={conditionsOperator}
                        onChange={setConditionsOperator}
                      />
                    </div>
                  </HorizontalStack>

                  {conditions.map((cond, idx) => (
                    <div key={idx} style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "12px", 
                      padding: "16px", 
                      border: "1px solid #dcdfe3", 
                      borderRadius: "8px", 
                      backgroundColor: "#fafbfb"
                    }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        borderBottom: "1px solid #eef0f1",
                        paddingBottom: "8px",
                        marginBottom: "4px"
                      }}>
                        <Text variant="headingSm" as="h4">Condition #{idx + 1}</Text>
                        <Button size="slim" tone="critical" onClick={() => handleRemoveCondition(idx)}>
                          Remove
                        </Button>
                      </div>

                      <FormLayout>
                        <Select
                          label="Condition Type"
                          options={CONDITION_TYPES}
                          value={cond.type}
                          onChange={(val) => handleConditionChange(idx, "type", val)}
                        />
                        <Select
                          label="Condition Criteria"
                          options={OPERATORS_BY_TYPE[cond.type] || []}
                          value={cond.operator}
                          onChange={(val) => handleConditionChange(idx, "operator", val)}
                        />
                        
                        {/* Only show value field for types that need it */}
                        {cond.type !== "shipping_address_pobox" && 
                         cond.type !== "login_required" && 
                         cond.type !== "b2b_only" && 
                         cond.type !== "guest_checkout_restriction" && 
                         cond.type !== "has_hazardous_item" && 
                         cond.type !== "has_subscription" ? (
                          <TextField
                            label="Value"
                            placeholder={
                              cond.type === "block_states" ? "e.g. AK,HI,PR" : 
                              cond.type === "block_countries" ? "e.g. KP,IR,SY" : 
                              cond.type === "product_combinations" ? "e.g. prod_A,prod_B" :
                              "value"
                            }
                            value={cond.value}
                            onChange={(val) => handleConditionChange(idx, "value", val)}
                            autoComplete="off"
                             connectedRight={
                               (cond.type === "product_combinations" || cond.type === "restricted_collections") ? (
                                 <Button onClick={() => handleSelectResources(idx, cond.type)}>
                                   {cond.type === "restricted_collections" ? "Browse Collections" : "Browse Products"}
                                 </Button>
                               ) : (cond.type === "customer_tags" || cond.type === "block_states" || cond.type === "block_countries") ? (
                                 <Button onClick={() => handleOpenBrowse(idx, cond.type, cond.value)}>
                                   Browse
                                 </Button>
                               ) : null
                             }
                           />
                        ) : null}
                      </FormLayout>
                    </div>
                  ))}

                  <Button onClick={handleAddCondition}>Add Condition</Button>
                </VerticalStack>
              </Box>
            </Card>

            {/* Checkout Block Response Settings */}
            <Card title="Error Message Display">
              <Box padding="5">
                <FormLayout>
                  <TextField
                    label="Custom Error Message"
                    value={errorMessage}
                    onChange={setErrorMessage}
                    multiline={2}
                    helpText="This is what the customer will see when checkout is blocked."
                    autoComplete="off"
                  />
                  <Select
                    label="Block Target Field"
                    options={ERROR_TARGETS}
                    value={errorTarget}
                    onChange={setErrorTarget}
                    helpText="Specifies where the error badge will be attached in the checkout UI."
                  />
                </FormLayout>
              </Box>
            </Card>
          </VerticalStack>
        </Layout.Section>

        {/* Visual Live Preview Widget */}
        <Layout.Section secondary>
          <Card title="📱 Checkout UI Live Preview">
            <Box padding="4" background="bg-surface-secondary" borderRadius="3">
              <VerticalStack gap="2">
                <Text variant="bodySm" tone="subdued">
                  Below is a visual simulation of the error banner rendered inside the Shopify Checkout wrapper when this rule triggers:
                </Text>

                <Box padding="4" background="bg-surface" borderRadius="2" border="1px" borderColor="border">
                  <Text variant="bodySm" tone="subdued" fontWeight="medium">
                    🛒 Order Summary
                  </Text>
                  <HorizontalStack align="space-between" style={{ borderBottom: "1px solid #e1e3e5", padding: "8px 0" }}>
                    <Text variant="bodyMd">Subtotal</Text>
                    <Text variant="bodyMd" fontWeight="semibold">$120.00</Text>
                  </HorizontalStack>

                  {/* Simulated Shopify Error Banner */}
                  <div className="checkout-banner">
                    <span style={{ fontSize: "18px" }}>⚠️</span>
                    <VerticalStack gap="1">
                      <Text variant="bodyMd" fontWeight="bold">Cannot Complete Purchase</Text>
                      <Text variant="bodySm">{errorMessage || "Custom validation error is displayed here."}</Text>
                    </VerticalStack>
                  </div>

                  <Box marginTop="4">
                    <Button fullWidth disabled>
                      Pay Now ($120.00)
                    </Button>
                  </Box>
                </Box>
              </VerticalStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
      <Modal
        open={browseModalOpen}
        onClose={() => setBrowseModalOpen(false)}
        title={
          browseType === "customer_tags" ? "Browse Customer Tags" :
          browseType === "block_states" ? "Select States" :
          "Select Countries"
        }
        primaryAction={{
          content: "Done",
          onAction: handleSaveBrowseSelection
        }}
      >
        <Modal.Section>
          {browseLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
              <Spinner size="large" />
            </div>
          ) : browseItems.length === 0 ? (
            <Text tone="subdued">
              {browseType === "customer_tags" 
                ? "No customer tags found on your store." 
                : "No items available."}
            </Text>
          ) : (
            <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {browseItems.map((item) => (
                <Checkbox
                  key={item.value}
                  label={item.label}
                  checked={selectedBrowseItems.includes(item.value)}
                  onChange={() => handleToggleBrowseItem(item.value)}
                />
              ))}
            </div>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
