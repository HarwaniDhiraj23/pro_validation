import React, { useState, useEffect } from "react";
import { Page, Card, Layout, FormLayout, TextField, Select, Button, HorizontalStack, VerticalStack, Box, Text, Spinner, Checkbox, Modal, Banner } from "@shopify/polaris";
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

const COMMON_REGEXES = [
  { label: "Block PO Boxes", value: "(?i)\\b(p(ost)?\\.?\\s*o(ffice)?\\.?\\s*b(ox)?|b(in)?\\s*#?\\s*\\d+)\\b" },
  { label: "Only Alphanumeric characters", value: "^[a-zA-Z0-9\\s,\\.-]+$" },
  { label: "Must contain a number (e.g. house number)", value: ".*\\d+.*" },
  { label: "Block links or URLs", value: "https?://|www\\." },
  { label: "No special characters (only letters/numbers/spaces)", value: "^[a-zA-Z0-9 ]+$" }
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
  { label: "Contact Email Field", value: "$.cart.email" },
  { label: "Contact Phone Field", value: "$.cart.buyerIdentity.phone" },
  { label: "Delivery Address Form (General)", value: "$.cart.deliveryGroups[0].deliveryAddress" },
  { label: "Address Line 1", value: "$.cart.deliveryGroups[0].deliveryAddress.address1" },
  { label: "Address Line 2", value: "$.cart.deliveryGroups[0].deliveryAddress.address2" },
  { label: "City Field", value: "$.cart.deliveryGroups[0].deliveryAddress.city" },
  { label: "State/Province Field", value: "$.cart.deliveryGroups[0].deliveryAddress.provinceCode" },
  { label: "ZIP/Postal Code Field", value: "$.cart.deliveryGroups[0].deliveryAddress.zip" },
  { label: "Country Field", value: "$.cart.deliveryGroups[0].deliveryAddress.countryCode" },
  { label: "Shipping Phone Field", value: "$.cart.deliveryGroups[0].deliveryAddress.phone" },
  { label: "First Line Item Quantity", value: "$.cart.lines[0].quantity" }
];

export default function RuleBuilder({ ruleId, navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("0");
  const [status, setStatus] = useState("active");
  const [targetShop, setTargetShop] = useState(""); // "" means All Stores / Default
  const [installedShops, setInstalledShops] = useState([]);
  const [conditionsOperator, setConditionsOperator] = useState("AND");
  const [ruleType, setRuleType] = useState("validation"); // validation or delivery
  const [isTypeFixed, setIsTypeFixed] = useState(false);
  const [deliveryAction, setDeliveryAction] = useState("hide"); // hide or rename
  const [errorMessage, setErrorMessage] = useState("We cannot complete your checkout with the current items or address details.");
  const [errorTarget, setErrorTarget] = useState("$.cart");
  const [warningBanner, setWarningBanner] = useState(false);
  const [customIcon, setCustomIcon] = useState("none");
  const [bannerStyle, setBannerStyle] = useState("warning");
  const [guidanceMessage, setGuidanceMessage] = useState("");
  const [displayInCheckout, setDisplayInCheckout] = useState(true);
  const [conditions, setConditions] = useState([
    { type: "minimum_order_value", operator: "less_than", value: "50" }
  ]);

  const [browseModalOpen, setBrowseModalOpen] = useState(false);
  const [browseType, setBrowseType] = useState("");
  const [browseIdx, setBrowseIdx] = useState(null);
  const [browseItems, setBrowseItems] = useState([]);
  const [selectedBrowseItems, setSelectedBrowseItems] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [enableScheduling, setEnableScheduling] = useState(false);

  const [shippingMethods, setShippingMethods] = useState(["Standard", "Express", "Local Pickup", "Free Shipping"]);
  const [customShippingMethod, setCustomShippingMethod] = useState("");
  const [selectShippingValue, setSelectShippingValue] = useState("");

  // Fetch installed active stores and shipping methods on component mount
  useEffect(() => {
    fetch("/api/rules/installed-shops")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInstalledShops(data);
        }
      })
      .catch(err => console.error("Error fetching installed shops:", err));

    fetch("/api/rules/shipping-methods")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setShippingMethods(data);
        }
      })
      .catch(err => console.error("Error fetching shipping methods:", err));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get("templateId");

    if (ruleId && ruleId !== "new") {
      setLoading(true);
      fetch(`/api/rules/${ruleId}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setTitle(data.title);
            setPriority(String(data.priority || 0));
            setStatus(data.status);
            setTargetShop(data.target_shop || "");
            setRuleType(data.rule_type || "validation");
            setDeliveryAction(data.delivery_action || "hide");
            setConditionsOperator(data.conditions_operator || "AND");
            setErrorMessage(data.error_message);
            setErrorTarget(data.error_target || "$.cart");
            setConditions(data.conditions || []);
            setWarningBanner(!!data.warning_banner);
            setCustomIcon(data.custom_icon || "none");
            setBannerStyle(data.banner_style || "warning");
            setGuidanceMessage(data.guidance_message || "");
            setDisplayInCheckout(data.display_in_checkout !== false);
            const toLocalDateTimeString = (dateInput) => {
              if (!dateInput) return "";
              const d = new Date(dateInput);
              if (isNaN(d.getTime())) return "";
              const tzOffset = d.getTimezoneOffset() * 60000;
              const localISOTime = new Date(d.getTime() - tzOffset).toISOString();
              return localISOTime.slice(0, 16);
            };

            if (data.schedule_start) {
              setScheduleStart(toLocalDateTimeString(data.schedule_start));
              setEnableScheduling(true);
            }
            if (data.schedule_end) {
              setScheduleEnd(toLocalDateTimeString(data.schedule_end));
              setEnableScheduling(true);
            }
          }
        })
        .catch(err => {
          shopify.toast.show("Error loading rule data", { isError: true });
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (templateId) {
      setLoading(true);
      fetch(`/api/templates/${templateId}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setTitle(data.title);
            setPriority("0");
            setStatus("active");
            setTargetShop("");
            setRuleType(data.rule_type || "validation");
            setDeliveryAction(data.delivery_action || "hide");
            setConditionsOperator(data.conditions_operator || "AND");
            setErrorMessage(data.error_message);
            setErrorTarget(data.error_target || "$.cart");
            setConditions(data.conditions || []);
            setWarningBanner(!!data.warning_banner);
            setCustomIcon(data.custom_icon || "none");
            setBannerStyle(data.banner_style || "warning");
            setGuidanceMessage(data.guidance_message || "");
            setDisplayInCheckout(data.display_in_checkout !== false);
          }
        })
        .catch(err => {
          shopify.toast.show("Error loading template details", { isError: true });
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      const typeParam = params.get("type");
      const fixedParam = params.get("fixed");
      if (ruleId === "new" && typeParam) {
        setRuleType(typeParam);
        if (fixedParam === "true") {
          setIsTypeFixed(true);
        }
        if (typeParam === "checkbox") {
          setErrorTarget("purchase.checkout.actions.render-before");
          setErrorMessage("Please accept the checkbox to complete checkout.");
          setGuidanceMessage("I agree to the Terms & Conditions.");
          setConditions([]);
        } else if (typeParam === "delivery") {
          setErrorTarget("Express");
          setErrorMessage("");
        } else if (typeParam === "payment") {
          setErrorTarget("Cash on Delivery (COD)");
          setErrorMessage("");
        }
      }
    }
  }, [ruleId]);

  useEffect(() => {
    if (ruleType === "delivery") {
      if (shippingMethods.includes(errorTarget)) {
        setSelectShippingValue(errorTarget);
      } else if (errorTarget && errorTarget !== "custom") {
        setSelectShippingValue("custom");
        setCustomShippingMethod(errorTarget);
      }
    }
  }, [errorTarget, shippingMethods, ruleType]);

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

    let sanitizedValue = value;
    if (field === "value") {
      const type = updated[index].type;
      if (type === "minimum_order_value" || type === "maximum_order_value" || type === "weight_limit") {
        // Only allow digits and a single optional decimal point
        sanitizedValue = value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, '$1');
      } else if (type === "quantity_limit" || type === "sku_limit" || type === "customer_age") {
        // Only allow whole digits
        sanitizedValue = value.replace(/[^0-9]/g, "");
      }
    }

    updated[index][field] = sanitizedValue;

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
    } else if (type === "address_regex") {
      setBrowseItems(COMMON_REGEXES);
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
      if (browseType === "address_regex") {
        return prev.includes(val) ? [] : [val];
      }
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
    if (ruleType === "checkbox") {
      if (!guidanceMessage.trim()) {
        shopify.toast.show("Checkbox label text is required", { isError: true });
        return;
      }
      if (!errorTarget.trim()) {
        shopify.toast.show("Checkbox position is required", { isError: true });
        return;
      }
      if (!errorMessage.trim()) {
        shopify.toast.show("Block error message is required", { isError: true });
        return;
      }
    }

    if (ruleType === "delivery" || ruleType === "payment") {
      if (!errorTarget.trim()) {
        shopify.toast.show(`Target ${ruleType} method name is required`, { isError: true });
        return;
      }
      if (deliveryAction === "rename" && !errorMessage.trim()) {
        shopify.toast.show("Renamed title is required for rename action", { isError: true });
        return;
      }
    } else if (ruleType !== "checkbox") {
      if (!errorMessage.trim()) {
        shopify.toast.show("Error message is required", { isError: true });
        return;
      }
    }
    if (ruleType !== "checkbox" && conditions.length === 0) {
      shopify.toast.show("At least one condition must be specified", { isError: true });
      return;
    }

    // Validate conditions
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      if (cond.type !== "shipping_address_pobox" &&
        cond.type !== "login_required" &&
        cond.type !== "b2b_only" &&
        cond.type !== "guest_checkout_restriction" &&
        cond.type !== "has_hazardous_item" &&
        cond.type !== "has_subscription") {

        if (!cond.value || !cond.value.trim()) {
          shopify.toast.show(`Condition #${i + 1} value is required`, { isError: true });
          return;
        }

        // Numeric validation checks
        if (cond.type === "minimum_order_value" || cond.type === "maximum_order_value" || cond.type === "weight_limit") {
          if (isNaN(Number(cond.value))) {
            shopify.toast.show(`Condition #${i + 1} value must be a valid number`, { isError: true });
            return;
          }
        }
        if (cond.type === "quantity_limit" || cond.type === "sku_limit" || cond.type === "customer_age") {
          const num = Number(cond.value);
          if (isNaN(num) || !Number.isInteger(num)) {
            shopify.toast.show(`Condition #${i + 1} value must be a valid whole number`, { isError: true });
            return;
          }
        }
      }
    }

    if (enableScheduling) {
      if (!scheduleStart) {
        shopify.toast.show("Start date & time is required when scheduling is enabled", { isError: true });
        return;
      }
      const buffer = new Date(Date.now() - 5 * 60 * 1000); // 5 minute clock variation buffer
      if (new Date(scheduleStart) < buffer) {
        shopify.toast.show("Start date & time cannot be in the past", { isError: true });
        return;
      }
      if (scheduleEnd) {
        if (new Date(scheduleEnd) < buffer) {
          shopify.toast.show("End date & time cannot be in the past", { isError: true });
          return;
        }
        if (new Date(scheduleEnd) < new Date(scheduleStart)) {
          shopify.toast.show("End date & time must be after start date & time", { isError: true });
          return;
        }
      }
    }

    setSaving(true);
    const isFieldTarget = ruleType === "validation" && errorTarget !== "$.cart";
    const body = {
      target_shop: targetShop || null,
      title,
      priority: parseInt(priority) || 0,
      status,
      conditions_operator: conditionsOperator,
      conditions,
      error_message: (ruleType === "delivery" || ruleType === "payment") && deliveryAction === "hide" ? "" : errorMessage,
      error_target: errorTarget,
      rule_type: ruleType,
      delivery_action: (ruleType === "delivery" || ruleType === "payment") ? deliveryAction : null,
      schedule_start: enableScheduling && scheduleStart ? scheduleStart : null,
      schedule_end: enableScheduling && scheduleEnd ? scheduleEnd : null,
      warning_banner: false,
      custom_icon: customIcon,
      banner_style: isFieldTarget ? "critical" : bannerStyle,
      guidance_message: guidanceMessage,
      display_in_checkout: displayInCheckout
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
      title={ruleId && ruleId !== "new"
        ? (ruleType === "delivery" ? "Edit Delivery Customization" : ruleType === "payment" ? "Edit Payment Customization" : "Edit Validation Rule")
        : (ruleType === "delivery" ? "Create Delivery Customization" : ruleType === "payment" ? "Create Payment Customization" : "Create Validation Rule")
      }
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
        /* Premium custom select overrides */
        .Polaris-Select__Input {
          background-color: #ffffff !important;
          border: 1px solid #cccccc !important;
          border-radius: 8px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 14px !important;
          color: #202223 !important;
          padding: 10px 36px 10px 14px !important;
          min-height: 42px !important;
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
      `}</style>

      <Layout>
        {/* Core Settings */}
        <Layout.Section>
          <VerticalStack gap="4">
            <Card>
              <Box padding="5">
                <FormLayout>
                  <TextField
                    label="Rule Title *"
                    value={title}
                    onChange={setTitle}
                    placeholder="e.g. Block PO Box Orders"
                    autoComplete="off"
                  />

                  <Select
                    label="Rule Type"
                    disabled={isTypeFixed}
                    options={[
                      { label: "Checkout Validation", value: "validation" },
                      { label: "Checkout Checkbox", value: "checkbox" },
                      { label: "Delivery Customization", value: "delivery" },
                      { label: "Payment Customization", value: "payment" }
                    ]}
                    value={ruleType}
                    onChange={(val) => {
                      setRuleType(val);
                      if (val === "delivery") {
                        setErrorTarget("Express");
                        setErrorMessage("");
                      } else if (val === "payment") {
                        setErrorTarget("Cash on Delivery (COD)");
                        setErrorMessage("");
                      } else if (val === "checkbox") {
                        setErrorTarget("purchase.checkout.actions.render-before");
                        setErrorMessage("Please accept the checkbox to complete checkout.");
                        setGuidanceMessage("I agree to the Terms & Conditions.");
                        setConditions([]); // Default to no conditions so it always shows
                      } else {
                        setErrorTarget("$.cart");
                        setErrorMessage("We cannot complete your checkout with the current items or address details.");
                      }
                    }}
                  />

                  <HorizontalStack gap="4">
                    <div style={{ flex: "0 0 140px" }}>
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
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Target Store"
                        options={[
                          { label: "All Stores (Global)", value: "" },
                          ...installedShops.map(shop => ({ label: shop, value: shop }))
                        ]}
                        value={targetShop}
                        onChange={setTargetShop}
                        helpText="Select which store this rule applies to."
                      />
                    </div>
                  </HorizontalStack>

                  {/* Scheduling Section */}
                  <div style={{ marginTop: "16px", borderTop: "1px solid #f1f2f4", paddingTop: "16px" }}>
                    <Checkbox
                      label="Schedule active timeframe"
                      checked={enableScheduling}
                      onChange={(val) => {
                        setEnableScheduling(val);
                        if (val) {
                          const now = new Date();
                          const tzOffset = now.getTimezoneOffset() * 60000;
                          const localTimeStr = new Date(now.getTime() - tzOffset).toISOString().substring(0, 16);
                          if (!scheduleStart) setScheduleStart(localTimeStr);
                          if (!scheduleEnd) setScheduleEnd(localTimeStr);
                        }
                      }}
                    />

                    {enableScheduling && (
                      <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#202223", marginBottom: "4px" }}>
                            Start Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={scheduleStart}
                            onChange={(e) => setScheduleStart(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #cccccc",
                              borderRadius: "8px",
                              fontFamily: "inherit",
                              fontSize: "14px",
                              boxSizing: "border-box",
                              outline: "none"
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#202223", marginBottom: "4px" }}>
                            End Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={scheduleEnd}
                            onChange={(e) => setScheduleEnd(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #cccccc",
                              borderRadius: "8px",
                              fontFamily: "inherit",
                              fontSize: "14px",
                              boxSizing: "border-box",
                              outline: "none"
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </FormLayout>
              </Box>
            </Card>

            {/* Conditions Section */}
            {ruleType !== "checkbox" && (
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
                            cond.type !== "has_subscription" ? (
                            <TextField
                              label="Value"
                              placeholder={
                                cond.type === "block_states" ? "e.g. AK,HI,PR" :
                                  cond.type === "block_countries" ? "e.g. KP,IR,SY" :
                                    cond.type === "product_combinations" ? "e.g. prod_A,prod_B" :
                                      cond.type === "has_hazardous_item" ? "Select products considered hazardous (optional)" :
                                        "value"
                              }
                              value={cond.value}
                              onChange={(val) => handleConditionChange(idx, "value", val)}
                              autoComplete="off"
                              connectedRight={
                                (cond.type === "product_combinations" || cond.type === "restricted_collections" || cond.type === "has_hazardous_item") ? (
                                  <Button onClick={() => handleSelectResources(idx, cond.type)}>
                                    {cond.type === "restricted_collections" ? "Browse Collections" : "Browse Products"}
                                  </Button>
                                ) : (cond.type === "customer_tags" || cond.type === "block_states" || cond.type === "block_countries" || cond.type === "address_regex") ? (
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
            )}

            {/* Checkout Block Response Settings / Delivery & Payment Customization Logic */}
            {ruleType === "checkbox" ? (
              <Card title="Checkbox Configuration">
                <Box padding="5">
                  <FormLayout>
                    <TextField
                      label="Checkbox Label Text *"
                      placeholder="e.g. I agree to the Terms of Service and Privacy Policy."
                      value={guidanceMessage}
                      onChange={setGuidanceMessage}
                      autoComplete="off"
                      helpText="This is the text displayed next to the checkbox."
                    />

                    <Select
                      label="Checkbox Position *"
                      options={[
                        { label: "Checkout Editor (Dynamic Block)", value: "purchase.checkout.block.render" },
                        { label: "Contact Information (After)", value: "purchase.checkout.contact.render-after" },
                        { label: "Delivery Address (After)", value: "purchase.checkout.delivery-address.render-after" },
                        { label: "Shipping Methods (Before)", value: "purchase.checkout.shipping-option-list.render-before" },
                        { label: "Shipping Methods (After)", value: "purchase.checkout.shipping-option-list.render-after" },
                        { label: "Payment Methods (Before)", value: "purchase.checkout.payment-method-list.render-before" },
                        { label: "Payment Methods (After)", value: "purchase.checkout.payment-method-list.render-after" },
                        { label: "Actions / Submit Button (Before)", value: "purchase.checkout.actions.render-before" },
                        { label: "Order Summary - Below Cart Items (Right Sidebar)", value: "purchase.checkout.cart-line-list.render-after" },
                        { label: "Order Summary - Below Each Product (Right Sidebar)", value: "purchase.checkout.cart-line-item.render-after" },
                        { label: "Order Summary - Above Discount Code (Right Sidebar)", value: "purchase.checkout.reductions.render-before" },
                        { label: "Order Summary - Below Discount Code (Right Sidebar)", value: "purchase.checkout.reductions.render-after" },
                        { label: "Checkout Footer (After)", value: "purchase.checkout.footer.render-after" }
                      ]}
                      value={errorTarget}
                      onChange={setErrorTarget}
                      helpText="Select where the checkbox will render on the checkout page."
                    />

                    <TextField
                      label="Block Error Message *"
                      placeholder="e.g. Please accept the checkbox to complete checkout."
                      value={errorMessage}
                      onChange={setErrorMessage}
                      autoComplete="off"
                      helpText="This message is displayed if the buyer attempts to check out without checking the box."
                    />
                  </FormLayout>
                </Box>
              </Card>
            ) : ruleType === "delivery" ? (
              <Card title="Customization Logic">
                <Box padding="5">
                  <FormLayout>
                    <Select
                      label="Target Shipping Method Name *"
                      options={[
                        ...shippingMethods.map(m => ({ label: m, value: m })),
                        { label: "Custom (Type manually)...", value: "custom" }
                      ]}
                      value={selectShippingValue}
                      onChange={(val) => {
                        setSelectShippingValue(val);
                        if (val !== "custom") {
                          setErrorTarget(val);
                        } else {
                          setErrorTarget(customShippingMethod || "");
                        }
                      }}
                      helpText="Select from active shipping methods on your store, or select Custom to type manually."
                    />

                    {selectShippingValue === "custom" && (
                      <TextField
                        label="Custom Shipping Method Name *"
                        placeholder="e.g. Economy Post"
                        value={customShippingMethod}
                        onChange={(val) => {
                          setCustomShippingMethod(val);
                          setErrorTarget(val);
                        }}
                        autoComplete="off"
                        helpText="Enter the exact or partial shipping method name to target."
                      />
                    )}

                    <Select
                      label="Delivery Action"
                      options={[
                        { label: "Hide Method", value: "hide" },
                        { label: "Rename Method", value: "rename" }
                      ]}
                      value={deliveryAction}
                      onChange={setDeliveryAction}
                    />

                    {deliveryAction === "rename" && (
                      <TextField
                        label="Rename To *"
                        placeholder="e.g. Expedited Carrier Shipping"
                        value={errorMessage}
                        onChange={setErrorMessage}
                        autoComplete="off"
                      />
                    )}
                  </FormLayout>
                </Box>
              </Card>
            ) : ruleType === "payment" ? (
              <Card title="Payment Customization Logic">
                <Box padding="5">
                  <FormLayout>
                    {deliveryAction !== "rename" && ["Credit Card", "(for testing) Bogus Gateway"].some(m => errorTarget.toLowerCase().includes(m.toLowerCase())) && (
                      <Banner tone="warning" title="Shopify Plus Required">
                        <p>
                          Hiding credit card payment methods (e.g. Credit Card, Bogus Gateway) at checkout is only supported on <strong>Shopify Plus</strong> stores.
                          On non-Plus stores, Shopify will silently ignore the hide operation for credit card gateways.
                          Non-credit-card methods like COD and PayPal can be hidden on all plans.
                        </p>
                      </Banner>
                    )}
                    <Select
                      label="Target Payment Method Name *"
                      options={[
                        { label: "Cash on Delivery (COD)", value: "Cash on Delivery (COD)" },
                        { label: "PayPal", value: "PayPal" },
                        { label: "Credit Card", value: "Credit Card" },
                        { label: "(for testing) Bogus Gateway", value: "(for testing) Bogus Gateway" },
                        { label: "Custom (Type manually)...", value: "custom" }
                      ]}
                      value={["Cash on Delivery (COD)", "PayPal", "Credit Card", "(for testing) Bogus Gateway"].includes(errorTarget) ? errorTarget : "custom"}
                      onChange={(val) => {
                        if (val !== "custom") {
                          setErrorTarget(val);
                        } else {
                          setErrorTarget("");
                        }
                      }}
                      helpText="Select or enter the payment method name to customize."
                    />

                    {!["Cash on Delivery (COD)", "PayPal", "Credit Card", "(for testing) Bogus Gateway"].includes(errorTarget) && (
                      <TextField
                        label="Custom Payment Method Name *"
                        placeholder="e.g. Bank Deposit"
                        value={errorTarget}
                        onChange={setErrorTarget}
                        autoComplete="off"
                        helpText="Enter the exact or partial payment method name to target."
                      />
                    )}

                    <Select
                      label="Payment Action"
                      options={[
                        { label: "Hide Method", value: "hide" },
                        { label: "Rename Method", value: "rename" }
                      ]}
                      value={deliveryAction || "hide"}
                      onChange={setDeliveryAction}
                    />

                    {deliveryAction === "rename" && (
                      <TextField
                        label="Rename To *"
                        placeholder="e.g. Pay with Cash"
                        value={errorMessage}
                        onChange={setErrorMessage}
                        autoComplete="off"
                      />
                    )}


                  </FormLayout>
                </Box>
              </Card>
            ) : (
              <Card>
                <Box padding="5">
                  <VerticalStack gap="4">
                    <VerticalStack gap="3">
                      <Text variant="headingMd" as="h3">Error Message & Placement</Text>
                      <TextField
                        label="Custom Message *"
                        value={errorMessage}
                        onChange={setErrorMessage}
                        multiline={2}
                        placeholder="e.g. We cannot complete your checkout with the current items or address details."
                        helpText="This is the main block message displayed to the customer."
                        autoComplete="off"
                      />
                      <Select
                        label="Block Target Field"
                        options={ERROR_TARGETS}
                        value={errorTarget}
                        onChange={setErrorTarget}
                        helpText="Specifies where the error badge will be attached in the checkout UI."
                      />
                    </VerticalStack>

                    <div style={{ margin: "8px 0", borderTop: "1px solid #e1e3e5" }} />

                    {/* Section 2: Behavior Settings */}
                    <VerticalStack gap="3">
                      <Text variant="headingMd" as="h3">Behavior & Visibility</Text>
                      <Checkbox
                        label="Show Banner / Message in Checkout UI Extension"
                        checked={displayInCheckout}
                        onChange={setDisplayInCheckout}
                      />
                    </VerticalStack>

                    {/* Section 3: Nested Customizer Panel */}
                    {displayInCheckout && (
                      <div style={{
                        marginTop: "8px",
                        padding: "16px",
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e1e3e5",
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                      }}>
                        <Text variant="headingSm" as="h4">Checkout UI Extension Styling</Text>

                        <div style={{ display: "flex", gap: "24px", width: "100%", alignItems: "stretch" }}>
                          {/* Left Column: Controls */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                            {ruleType === "validation" && errorTarget !== "$.cart" && (
                              <Banner tone="warning">
                                <p>Banner Tone / Style is disabled because it will not work with this block target field.</p>
                              </Banner>
                            )}

                            <div style={{ display: "flex", gap: "16px" }}>
                              <div style={{ flex: 1 }}>
                                <Select
                                  label="Banner Tone / Style"
                                  disabled={ruleType === "validation" && errorTarget !== "$.cart"}
                                  options={[
                                    { label: "Critical (Error / Red)", value: "critical" },
                                    { label: "Warning (Alert / Orange)", value: "warning" },
                                    { label: "Information (Info / Blue)", value: "info" },
                                    { label: "Success (Completed / Green)", value: "success" }
                                  ]}
                                  value={ruleType === "validation" && errorTarget !== "$.cart" ? "critical" : bannerStyle}
                                  onChange={setBannerStyle}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <Select
                                  label="Custom Icon"
                                  options={[
                                    { label: "Tone Default Icon", value: "default" },
                                    { label: "None", value: "none" },
                                    { label: "Warning (⚠️)", value: "warning" },
                                    { label: "Critical / Error (🚨)", value: "critical" },
                                    { label: "Information (ℹ️)", value: "info" },
                                    { label: "Checkmark (✅)", value: "success" },
                                    { label: "Security Lock (🔒)", value: "lock" },
                                    { label: "Shipping/Delivery (🚚)", value: "delivery" },
                                    { label: "Payment/Card (💳)", value: "payment" },
                                    { label: "Calendar (📅)", value: "calendar" }
                                  ]}
                                  value={customIcon}
                                  onChange={setCustomIcon}
                                />
                              </div>
                            </div>

                            <TextField
                              label="Customer Guidance / Instructions"
                              value={guidanceMessage}
                              onChange={setGuidanceMessage}
                              placeholder="e.g. Please change your shipping address to a physical location or add $15 more to cart."
                              multiline={2}
                              helpText="Helpful instructions to assist the customer in resolving the block/warning."
                              autoComplete="off"
                            />
                          </div>

                          {/* Vertical Divider */}
                          <div style={{ borderLeft: "1px solid #e1e3e5" }} />

                          {/* Right Column: Preview */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", justifyContent: "flex-start" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <Text variant="headingSm">Live Checkout Banner Preview</Text>
                              <span style={{
                                fontSize: "11px",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                color: "#6d7175",
                                backgroundColor: "#e1e3e5",
                                padding: "2px 8px",
                                borderRadius: "4px"
                              }}>
                                Checkout Preview
                              </span>
                            </div>
                            {ruleType === "validation" && errorTarget !== "$.cart" ? (
                              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                                {/* Mock Input Field */}
                                <div style={{
                                  border: "1px solid #c91414",
                                  borderRadius: "8px",
                                  padding: "10px 14px",
                                  backgroundColor: "#ffffff",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "6px"
                                }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "11px", color: "#707070" }}>
                                      {(() => {
                                        if (errorTarget.includes("email")) return "Email";
                                        if (errorTarget.includes("phone")) return "Phone";
                                        if (errorTarget.includes("firstName")) return "First name";
                                        if (errorTarget.includes("lastName")) return "Last name";
                                        if (errorTarget.includes("address1")) return "Address";
                                        if (errorTarget.includes("address2")) return "Apartment, suite, etc. (optional)";
                                        if (errorTarget.includes("city")) return "City";
                                        if (errorTarget.includes("provinceCode")) return "State/Province";
                                        if (errorTarget.includes("zip")) return "ZIP/Postal Code";
                                        if (errorTarget.includes("countryCode")) return "Country/Region";
                                        if (errorTarget.includes("company")) return "Company";
                                        if (errorTarget.includes("poNumber")) return "Purchase Order (PO) Number";
                                        if (errorTarget.includes("discountCodes")) return "Discount code or gift card";
                                        if (errorTarget.includes("lines[0]")) return "Quantity";
                                        return "Field";
                                      })()}
                                    </span>
                                    <span style={{ fontSize: "14px", color: "#111111" }}>
                                      {(() => {
                                        if (errorTarget.includes("email")) return "qizywiz@mailinator.com";
                                        if (errorTarget.includes("phone")) return "1234567890";
                                        if (errorTarget.includes("firstName")) return "Erica";
                                        if (errorTarget.includes("lastName")) return "Diaz";
                                        if (errorTarget.includes("address1")) return "Po Box";
                                        if (errorTarget.includes("city")) return "New York";
                                        if (errorTarget.includes("provinceCode")) return "New York";
                                        if (errorTarget.includes("zip")) return "90210";
                                        if (errorTarget.includes("countryCode")) return "United States";
                                        if (errorTarget.includes("company")) return "Acme Corp";
                                        return "invalid value";
                                      })()}
                                    </span>
                                  </div>
                                  {errorTarget.includes("address1") && (
                                    <span style={{ color: "#707070", fontSize: "16px" }}>🔍</span>
                                  )}
                                </div>
                                {/* Error Messages */}
                                <div style={{ color: "#c91414", fontSize: "14px", lineHeight: "1.4", display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <div>{errorMessage || "Checkout is blocked by validation rules."}</div>
                                  {guidanceMessage && <div>{guidanceMessage}</div>}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {/* Main Banner */}
                                <div style={{
                                  padding: "12px 16px",
                                  borderRadius: "12px",
                                  backgroundColor:
                                    bannerStyle === "critical" ? "#FFF5F5" :
                                    bannerStyle === "warning" ? "#FFFAF0" :
                                    bannerStyle === "info" ? "#EBF8FF" :
                                    "#F0FFF4",
                                  border: `1px solid ${
                                    bannerStyle === "critical" ? "#FED7D7" :
                                    bannerStyle === "warning" ? "#FEEBC8" :
                                    bannerStyle === "info" ? "#BEE3F8" :
                                    "#C6F6D5"
                                  }`,
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center"
                                }}>
                                  <span style={{ fontSize: "18px", display: "flex", alignItems: "center" }}>
                                    {(() => {
                                      const iconName = customIcon === "default" ? bannerStyle : customIcon;
                                      switch (iconName) {
                                        case "none": return "";
                                        case "lock": return "🔒";
                                        case "delivery": return "🚚";
                                        case "payment": return "💳";
                                        case "calendar": return "📅";
                                        case "info": return "ℹ️";
                                        case "warning": return "⚠️";
                                        case "critical": return "🚨";
                                        case "success": return "✅";
                                        default: return "⚠️";
                                      }
                                    })()}
                                  </span>
                                  <div style={{
                                    flex: 1,
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    fontWeight: "500",
                                    fontSize: "14px",
                                    color:
                                      bannerStyle === "critical" ? "#9B2C2C" :
                                      bannerStyle === "warning" ? "#9C4221" :
                                      bannerStyle === "info" ? "#2B6CB0" :
                                      "#22543D"
                                  }}>
                                    {errorMessage || "Checkout is blocked by validation rules."}
                                  </div>
                                </div>

                                {/* Guidance/Guideline Banner */}
                                {guidanceMessage && (
                                  <div style={{
                                    padding: "12px 16px",
                                    borderRadius: "12px",
                                    backgroundColor: "#F7F9FA",
                                    border: "1px solid #E2E8F0",
                                    display: "flex",
                                    gap: "10px",
                                    alignItems: "center"
                                  }}>
                                    <span style={{ fontSize: "18px", display: "flex", alignItems: "center" }}>
                                      ℹ️
                                    </span>
                                    <div style={{
                                      flex: 1,
                                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                      fontWeight: "500",
                                      fontSize: "14px",
                                      color: "#4A5568"
                                    }}>
                                      {guidanceMessage}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </VerticalStack>
                </Box>
              </Card>
            )}
          </VerticalStack>
        </Layout.Section>
      </Layout>
      <Modal
        open={browseModalOpen}
        onClose={() => setBrowseModalOpen(false)}
        title={
          browseType === "customer_tags" ? "Browse Customer Tags" :
            browseType === "block_states" ? "Select States" :
              browseType === "address_regex" ? "Select Address Regex Pattern" :
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
            <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
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
