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

const getIconEmoji = (iconVal, toneVal) => {
  const effectiveIcon = iconVal === "default" || !iconVal ? "" : iconVal;
  switch (effectiveIcon) {
    case "none": return "";
    case "lock": return "🔒";
    case "delivery": return "🚚";
    case "payment": return "💳";
    case "calendar": return "📅";
    case "info": return "ℹ️";
    case "warning": return "⚠️";
    case "critical": return "🚨";
    case "success": return "✅";
    default: return "";
  }
};

const renderToneSvgIcon = (tone, customColor) => {
  const iconColor = customColor || (
    tone === "success" ? "#16A34A" :
    tone === "warning" ? "#D97706" :
    tone === "info" ? "#2563EB" :
    "#DC2626"
  );

  if (tone === "success") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="10" cy="10" r="8.25" stroke={iconColor} strokeWidth="1.5" />
        <path d="M6.5 10L9 12.5L13.5 7.5" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="10" cy="10" r="8.25" stroke={iconColor} strokeWidth="1.5" />
        <path d="M10 6V11" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="13.5" r="1" fill={iconColor} />
      </svg>
    );
  }
  if (tone === "critical") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="10" cy="10" r="8.25" stroke={iconColor} strokeWidth="1.5" />
        <path d="M7 7L13 13M13 7L7 13" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8.25" stroke={iconColor} strokeWidth="1.5" />
      <path d="M10 9.25V14" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.75" r="1" fill={iconColor} />
    </svg>
  );
};

const getToneStyles = (tone) => {
  switch (tone) {
    case "critical":
      return {
        bg: "#FEF2F2",
        border: "#FCA5A5",
        text: "#0F172A",
        badgeBg: "#FEE2E2",
        badgeText: "#991B1B",
        iconColor: "#DC2626",
        label: "Critical (Error / Red)"
      };
    case "warning":
      return {
        bg: "#FFFBEB",
        border: "#FCD34D",
        text: "#0F172A",
        badgeBg: "#FEF3C7",
        badgeText: "#92400E",
        iconColor: "#D97706",
        label: "Warning (Alert / Orange)"
      };
    case "info":
      return {
        bg: "#EFF6FF",
        border: "#93C5FD",
        text: "#0F172A",
        badgeBg: "#DBEAFE",
        badgeText: "#1E40AF",
        iconColor: "#2563EB",
        label: "Information (Info / Blue)"
      };
    case "success":
      return {
        bg: "#EEFBEA",
        border: "#B2EBB0",
        text: "#0F172A",
        badgeBg: "#DCFCE7",
        badgeText: "#166534",
        iconColor: "#16A34A",
        label: "Success (Completed / Green)"
      };
    default:
      return {
        bg: "#FEF2F2",
        border: "#FCA5A5",
        text: "#0F172A",
        badgeBg: "#FEE2E2",
        badgeText: "#991B1B",
        iconColor: "#DC2626",
        label: "Critical (Error / Red)"
      };
  }
};

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
  const [previewTab, setPreviewTab] = useState("live");
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

  const [shopPlan, setShopPlan] = useState("Free");
  const [planConfig, setPlanConfig] = useState(null);
  const [planUsage, setPlanUsage] = useState(null);
  const [initialStatus, setInitialStatus] = useState(null);

  // Fetch installed active stores, shipping methods, and shop plan details on component mount
  useEffect(() => {
    fetch("/api/billing/plan")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShopPlan(data.plan?.name || "Free");
          setPlanConfig(data.plan?.config || null);
          setPlanUsage(data.usage || null);
        }
      })
      .catch(err => console.error("Error fetching shop plan:", err));

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
            setInitialStatus(data.status);
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
      target_shop: null,
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
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || errorData.message || "Failed to save rule";
        shopify.toast.show(errorMsg, { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Network error: " + (e.message || "Failed to connect"), { isError: true });
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

  const isFree = shopPlan === "Free";
  const isBasic = shopPlan === "Basic";
  const isGrowthOrPro = shopPlan === "Growth" || shopPlan === "Pro";

  const ruleTypeOptions = [
    { label: "Checkout Validation (Free Plan)", value: "validation" },
    {
      label: isFree ? "Delivery Customization 🔒 (Requires Basic Plan)" : "Delivery Customization",
      value: "delivery",
      disabled: isFree
    },
    {
      label: !isGrowthOrPro ? "Payment Customization 🔒 (Requires Growth Plan)" : "Payment Customization",
      value: "payment",
      disabled: !isGrowthOrPro
    },
    {
      label: !isGrowthOrPro ? "Checkout Checkbox 🔒 (Requires Growth Plan)" : "Checkout Checkbox",
      value: "checkbox",
      disabled: !isGrowthOrPro
    }
  ];

  const restrictedConditionTypes = planConfig?.restrictedConditionTypes || [
    "b2b_only", "login_required", "has_hazardous_item", "has_subscription",
    "customer_tags", "guest_checkout_restriction", "restricted_collections",
    "restricted_vendors", "product_combinations", "day_of_week"
  ];

  const conditionTypeOptions = CONDITION_TYPES.map(ct => {
    const isRestricted = restrictedConditionTypes.includes(ct.value);
    return {
      label: isRestricted ? `${ct.label} 🔒 (Growth Plan)` : ct.label,
      value: ct.value,
      disabled: isRestricted
    };
  });

  const rawMaxRules = planUsage?.maxActiveRules;
  const isUnlimitedPlan = !rawMaxRules || rawMaxRules === Infinity || rawMaxRules >= 999999 || shopPlan === "Pro";
  const isActivatingNewOrInactive = status === "active" && ((ruleId === "new" || ruleId === undefined) || initialStatus !== "active");
  const isQuotaExceeded = !isUnlimitedPlan && isActivatingNewOrInactive && (planUsage?.activeRulesCount >= rawMaxRules);

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
        loading: saving,
        disabled: isQuotaExceeded
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
        {!isUnlimitedPlan && isQuotaExceeded && (
          <Layout.Section>
            <Banner
              status="warning"
              title={`Plan Active Rule Limit Reached (${planUsage?.activeRulesCount}/${planUsage?.maxActiveRules})`}
              action={{ content: "Upgrade Plan", onAction: () => navigate("/pricing") }}
            >
              Your store is currently using all {planUsage?.maxActiveRules} active rule(s) included in the {shopPlan} plan. Upgrade to activate additional rules.
            </Banner>
          </Layout.Section>
        )}

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
                    options={ruleTypeOptions}
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
                  </HorizontalStack>

                  {/* Scheduling Section */}
                  {!isGrowthOrPro ? (
                    <div style={{ marginTop: "16px", borderTop: "1px solid #f1f2f4", paddingTop: "16px" }}>
                      <Banner status="info" title="Rule Scheduling 🔒 (Growth Plan Feature)">
                        Rule date & time scheduling is available on the Growth plan. Upgrade to automatically schedule rule start and expiry dates.
                        <div style={{ marginTop: "8px" }}>
                          <Button size="slim" onClick={() => navigate("/pricing")}>Upgrade to Growth ($29/mo)</Button>
                        </div>
                      </Banner>
                    </div>
                  ) : (
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
                  )}
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
                            options={conditionTypeOptions}
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
                    {isFree ? (
                      <div style={{ marginTop: "16px", paddingTop: "8px" }}>
                        <Banner status="info" title="Behavior & Visibility 🔒 (Basic Plan Feature)">
                          Behavior & Visibility customization (custom banner tone, icons, guidance instructions, and live checkout extension preview) is not available on the Free plan. Upgrade to the Basic plan or higher to unlock Behavior & Visibility customization.
                          <div style={{ marginTop: "8px" }}>
                            <Button size="slim" onClick={() => navigate("/pricing")}>Upgrade to Basic ($9/mo)</Button>
                          </div>
                        </Banner>
                      </div>
                    ) : (
                      <>
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

                            <div style={{ display: "flex", gap: "24px", width: "100%", alignItems: "stretch", flexWrap: "wrap" }}>
                              {/* Left Column: Controls */}
                              <div style={{ flex: 1, minWidth: "300px", display: "flex", flexDirection: "column", gap: "16px" }}>
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

                              {/* Right Column: Live Checkout Extension Preview */}
                              <div style={{
                                flex: 1,
                                minWidth: "320px",
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "#ffffff",
                                border: "1px solid #c9cccf",
                                borderRadius: "8px",
                                overflow: "hidden",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                              }}>
                                {/* Simulated Shopify Checkout Header */}
                                <div style={{
                                  backgroundColor: "#111827",
                                  color: "#ffffff",
                                  padding: "10px 14px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: "12px",
                                  fontWeight: "600"
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "14px" }}>🛍️</span>
                                    <span>Shopify Checkout Live Preview</span>
                                  </div>
                                  <span style={{
                                    fontSize: "10px",
                                    backgroundColor: "#1f2937",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    color: "#38bdf8",
                                    border: "1px solid #374151"
                                  }}>
                                    Checkout UI Extension
                                  </span>
                                </div>

                                {/* Mode Switcher Tabs */}
                                <div style={{
                                  display: "flex",
                                  borderBottom: "1px solid #e5e7eb",
                                  backgroundColor: "#f9fafb",
                                  fontSize: "12px"
                                }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewTab("live")}
                                    style={{
                                      flex: 1,
                                      padding: "8px 6px",
                                      border: "none",
                                      background: previewTab === "live" ? "#ffffff" : "transparent",
                                      borderBottom: previewTab === "live" ? "2px solid #008060" : "2px solid transparent",
                                      fontWeight: previewTab === "live" ? "600" : "500",
                                      color: previewTab === "live" ? "#008060" : "#6b7280",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease"
                                    }}
                                  >
                                    ⚡ Live View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewTab("gallery")}
                                    style={{
                                      flex: 1,
                                      padding: "8px 6px",
                                      border: "none",
                                      background: previewTab === "gallery" ? "#ffffff" : "transparent",
                                      borderBottom: previewTab === "gallery" ? "2px solid #008060" : "2px solid transparent",
                                      fontWeight: previewTab === "gallery" ? "600" : "500",
                                      color: previewTab === "gallery" ? "#008060" : "#6b7280",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease"
                                    }}
                                  >
                                    🎨 All Tones
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewTab("placement")}
                                    style={{
                                      flex: 1,
                                      padding: "8px 6px",
                                      border: "none",
                                      background: previewTab === "placement" ? "#ffffff" : "transparent",
                                      borderBottom: previewTab === "placement" ? "2px solid #008060" : "2px solid transparent",
                                      fontWeight: previewTab === "placement" ? "600" : "500",
                                      color: previewTab === "placement" ? "#008060" : "#6b7280",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease"
                                    }}
                                  >
                                    📍 Placements
                                  </button>
                                </div>

                                {/* Content Box */}
                                <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "420px", overflowY: "auto" }}>
                                  
                                  {/* TAB 1: LIVE PREVIEW */}
                                  {previewTab === "live" && (() => {
                                    const activeToneKey = (ruleType === "validation" && errorTarget !== "$.cart") ? "critical" : bannerStyle;
                                    const tStyle = getToneStyles(activeToneKey);
                                    const iconEmoji = getIconEmoji(customIcon, activeToneKey);
                                    const isCheckboxRule = ruleType === "checkbox";

                                    if (isCheckboxRule) {
                                      return (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                          <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                            Checkout Checkbox Component
                                          </div>
                                          <div style={{
                                            padding: "12px 14px",
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "12px",
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "10px"
                                          }}>
                                            <input type="checkbox" readOnly checked style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#008060" }} />
                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                              <span style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A" }}>
                                                {guidanceMessage || "I agree to the Terms & Conditions and Store Policies."}
                                              </span>
                                              <span style={{ fontSize: "11px", color: "#6b7280" }}>
                                                Required to complete purchase
                                              </span>
                                            </div>
                                          </div>
                                          {errorMessage && (
                                            <div style={{
                                              padding: "10px 14px",
                                              backgroundColor: "#FEF2F2",
                                              border: "1px solid #FCA5A5",
                                              borderRadius: "12px",
                                              fontSize: "13px",
                                              fontWeight: "600",
                                              color: "#0F172A",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "10px"
                                            }}>
                                              {renderToneSvgIcon("critical", "#DC2626")}
                                              <span>{errorMessage}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <span style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                            Checkout Banner Preview
                                          </span>
                                          <span style={{
                                            fontSize: "10px",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            backgroundColor: tStyle.badgeBg,
                                            color: tStyle.badgeText,
                                            fontWeight: "600"
                                          }}>
                                            {tStyle.label}
                                          </span>
                                        </div>

                                        {/* Top Banner (Main Error / Message) */}
                                        <div style={{
                                          backgroundColor: tStyle.bg,
                                          border: `1px solid ${tStyle.border}`,
                                          borderRadius: "12px",
                                          padding: "10px 14px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px"
                                        }}>
                                          {renderToneSvgIcon(activeToneKey, tStyle.iconColor)}
                                          {iconEmoji && (
                                            <span style={{ fontSize: "15px", lineHeight: "1", flexShrink: 0 }}>{iconEmoji}</span>
                                          )}
                                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", lineHeight: "1.4" }}>
                                            {errorMessage || "Please log in to your account to complete checkout."}
                                          </div>
                                        </div>

                                        {/* Bottom Banner (Customer Guidance Banner) */}
                                        {guidanceMessage && (
                                          <div style={{
                                            backgroundColor: "#F4F4F5",
                                            border: "1px solid #E4E4E7",
                                            borderRadius: "12px",
                                            padding: "10px 14px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px"
                                          }}>
                                            {renderToneSvgIcon("info", "#71717A")}
                                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", lineHeight: "1.4" }}>
                                              {guidanceMessage}
                                            </div>
                                          </div>
                                        )}

                                        {/* Target Location Metadata */}
                                        <div style={{
                                          padding: "8px 10px",
                                          backgroundColor: "#f3f4f6",
                                          borderRadius: "6px",
                                          fontSize: "11px",
                                          color: "#4b5563",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between"
                                        }}>
                                          <span>📍 Placement: <strong>{ERROR_TARGETS.find(t => t.value === errorTarget)?.label || errorTarget}</strong></span>
                                          <span>{warningBanner ? "⚠️ Warning Banner" : "🛑 Block Submission"}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* TAB 2: ALL TONES GALLERY (ALL POSSIBILITIES) */}
                                  {previewTab === "gallery" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                        All Tone Possibilities Preview
                                      </div>
                                      {[
                                        { key: "critical", label: "Critical / Red (Error)" },
                                        { key: "warning", label: "Warning / Orange (Alert)" },
                                        { key: "info", label: "Information / Blue (Notice)" },
                                        { key: "success", label: "Success / Green (Completed)" }
                                      ].map((toneItem) => {
                                        const tStyle = getToneStyles(toneItem.key);
                                        const iconEmoji = getIconEmoji(customIcon, toneItem.key);
                                        const isSelected = bannerStyle === toneItem.key;

                                        return (
                                          <div
                                            key={toneItem.key}
                                            onClick={() => {
                                              if (ruleType === "validation" && errorTarget !== "$.cart") return;
                                              setBannerStyle(toneItem.key);
                                            }}
                                            style={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: "6px",
                                              cursor: (ruleType === "validation" && errorTarget !== "$.cart") ? "not-allowed" : "pointer",
                                              padding: "8px",
                                              borderRadius: "14px",
                                              border: isSelected ? "2px solid #008060" : "1px transparent solid",
                                              backgroundColor: isSelected ? "#f0fdf4" : "transparent"
                                            }}
                                          >
                                            <div style={{ fontSize: "10px", fontWeight: "700", color: tStyle.badgeText, display: "flex", justifyContent: "space-between" }}>
                                              <span>{toneItem.label}</span>
                                              {isSelected && <span>✓ CURRENTLY SELECTED</span>}
                                            </div>

                                            {/* Top Banner */}
                                            <div style={{
                                              backgroundColor: tStyle.bg,
                                              border: `1px solid ${tStyle.border}`,
                                              borderRadius: "12px",
                                              padding: "10px 14px",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "10px"
                                            }}>
                                              {renderToneSvgIcon(toneItem.key, tStyle.iconColor)}
                                              {iconEmoji && <span style={{ fontSize: "15px", lineHeight: "1", flexShrink: 0 }}>{iconEmoji}</span>}
                                              <div style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", lineHeight: "1.4" }}>
                                                {errorMessage || "Please log in to your account to complete checkout."}
                                              </div>
                                            </div>

                                            {/* Bottom Guidance Banner */}
                                            {guidanceMessage && (
                                              <div style={{
                                                backgroundColor: "#F4F4F5",
                                                border: "1px solid #E4E4E7",
                                                borderRadius: "12px",
                                                padding: "10px 14px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px"
                                              }}>
                                                {renderToneSvgIcon("info", "#71717A")}
                                                <div style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", lineHeight: "1.4" }}>
                                                  {guidanceMessage}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* TAB 3: TARGET PLACEMENT SIMULATION */}
                                  {previewTab === "placement" && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                        Target Placement Preview
                                      </div>

                                      {/* 1. Cart Summary */}
                                      <div style={{ border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "10px", backgroundColor: "#f8fafc" }}>
                                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                                          🛒 1. Cart Summary Banner (<code>$.cart</code>)
                                        </div>
                                        <div style={{ padding: "8px 10px", backgroundColor: getToneStyles(bannerStyle).bg, border: `1px solid ${getToneStyles(bannerStyle).border}`, borderRadius: "6px", fontSize: "12px", color: getToneStyles(bannerStyle).text }}>
                                          {getIconEmoji(customIcon, bannerStyle)} {errorMessage}
                                        </div>
                                      </div>

                                      {/* 2. Inline Field Placement */}
                                      <div style={{ border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "10px", backgroundColor: "#f8fafc" }}>
                                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                                          📝 2. Inline Field Error (e.g. Email / Address line)
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                          <label style={{ fontSize: "11px", color: "#475569" }}>Shipping Address / Email Field</label>
                                          <input type="text" readOnly value="PO Box 123, Invalid St" style={{ padding: "6px 8px", borderRadius: "4px", border: "1px solid #ef4444", fontSize: "12px", backgroundColor: "#fef2f2" }} />
                                          <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                                            🚨 {errorMessage}
                                          </span>
                                        </div>
                                      </div>

                                      {/* 3. Checkbox Render */}
                                      <div style={{ border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "10px", backgroundColor: "#f8fafc" }}>
                                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                                          ☑️ 3. Checkout Checkbox Component
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                                          <input type="checkbox" readOnly checked style={{ accentColor: "#008060" }} />
                                          <span>{guidanceMessage || "I agree to Terms & Conditions"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
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
