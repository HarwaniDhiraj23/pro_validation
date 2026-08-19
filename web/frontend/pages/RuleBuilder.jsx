import React, { useState, useEffect } from "react";
import { Page, Card, Layout, FormLayout, TextField, Select, Button, HorizontalStack, VerticalStack, Box, Text, Spinner, Checkbox, Modal, Banner, Badge } from "@shopify/polaris";
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

  // Store Variant Selector Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantModalTarget, setVariantModalTarget] = useState(null);
  const [variantModalIsMulti, setVariantModalIsMulti] = useState(true);
  const [variantModalSearch, setVariantModalSearch] = useState("");
  const [storeVariants, setStoreVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [selectedVariantGids, setSelectedVariantGids] = useState([]);

  const fetchStoreVariants = async () => {
    if (storeVariants.length > 0) return;
    setLoadingVariants(true);
    try {
      const res = await fetch("/api/store/variants");
      const data = await res.json();
      if (data.success && Array.isArray(data.variants)) {
        setStoreVariants(data.variants);
      }
    } catch (err) {
      console.error("Error fetching store variants:", err);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleOpenVariantPicker = async (targetKey, isMulti = true, currentGidsString = "") => {
    if (typeof shopify !== "undefined" && shopify.resourcePicker) {
      try {
        const selected = await shopify.resourcePicker({
          type: "product",
          multiple: isMulti,
        });
        if (selected && selected.selection) {
          const selectedGids = [];
          let extractedImgUrl = "";
          selected.selection.forEach(prod => {
            if (prod.images && prod.images.length > 0) {
              extractedImgUrl = prod.images[0].originalSrc || prod.images[0].src || prod.images[0].url || "";
            } else if (prod.featuredImage) {
              extractedImgUrl = prod.featuredImage.originalSrc || prod.featuredImage.url || prod.featuredImage.src || "";
            }

            if (prod.variants && prod.variants.length > 0) {
              prod.variants.forEach(v => {
                if (v.id) selectedGids.push(v.id);
                if (!extractedImgUrl && v.image) {
                  extractedImgUrl = v.image.originalSrc || v.image.src || v.image.url || "";
                }
              });
            } else if (prod.id) {
              selectedGids.push(prod.id);
            }
          });

          if (selectedGids.length > 0) {
            applySelectedGidsToTarget(targetKey, isMulti ? selectedGids.join(", ") : selectedGids[0]);
            if (targetKey === "upsell_variant" && extractedImgUrl && !upsellImageUrl) {
              setUpsellImageUrl(extractedImgUrl);
            }
          }
        }
        // App Bridge resource picker completed or cancelled - return immediately
        return;
      } catch (e) {
        console.log("App Bridge resource picker fallback to custom modal:", e);
      }
    }

    await fetchStoreVariants();
    setVariantModalTarget(targetKey);
    setVariantModalIsMulti(isMulti);
    const initialGids = currentGidsString ? currentGidsString.split(",").map(g => g.trim()).filter(Boolean) : [];
    setSelectedVariantGids(initialGids);
    setVariantModalOpen(true);
  };

  const handleSelectUpsellImage = async () => {
    if (typeof shopify !== "undefined" && shopify.resourcePicker) {
      try {
        const selected = await shopify.resourcePicker({
          type: "product",
          multiple: false,
        });
        if (selected && selected.selection && selected.selection.length > 0) {
          const prod = selected.selection[0];
          let imgUrl = "";
          if (prod.images && prod.images.length > 0) {
            imgUrl = prod.images[0].originalSrc || prod.images[0].src || prod.images[0].url || "";
          } else if (prod.featuredImage) {
            imgUrl = prod.featuredImage.originalSrc || prod.featuredImage.url || prod.featuredImage.src || "";
          } else if (prod.variants && prod.variants.length > 0 && prod.variants[0].image) {
            imgUrl = prod.variants[0].image.originalSrc || prod.variants[0].image.src || prod.variants[0].image.url || "";
          }

          if (imgUrl) {
            setUpsellImageUrl(imgUrl);
            shopify.toast.show("Product thumbnail image selected!");
          } else {
            shopify.toast.show("No image found on selected product.", { isError: true });
          }

          if (!variantGid && prod.variants && prod.variants.length > 0 && prod.variants[0].id) {
            setVariantGid(prod.variants[0].id);
          }
        }
        return;
      } catch (e) {
        console.log("Resource picker image selection error:", e);
      }
    }

    await fetchStoreVariants();
    setVariantModalTarget("upsell_image");
    setVariantModalIsMulti(false);
    setVariantModalOpen(true);
  };

  const applySelectedGidsToTarget = (targetKey, gidValue) => {
    if (targetKey === "price_override") {
      setTransformTargetVariantIds(gidValue);
    } else if (targetKey === "kit_parent") {
      setTransformParentVariantId(gidValue);
    } else if (targetKey.startsWith("kit_comp_")) {
      const cIdx = parseInt(targetKey.replace("kit_comp_", ""), 10);
      const next = [...transformComponents];
      if (next[cIdx]) {
        next[cIdx].variant_id = gidValue;
        setTransformComponents(next);
      }
    } else if (targetKey === "bundle_comp") {
      setTransformComponentVariantIds(gidValue);
    } else if (targetKey === "bundle_parent") {
      setTransformParentVariantId(gidValue);
    } else if (targetKey === "upsell_variant") {
      setVariantGid(gidValue);
    } else if (targetKey === "upsell_image") {
      const matched = storeVariants.find(v => v.id === gidValue);
      if (matched && matched.image_url) {
        setUpsellImageUrl(matched.image_url);
      }
      if (!variantGid) {
        setVariantGid(gidValue);
      }
    }
  };

  // Store Location Selector Modal State
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [storeLocations, setStoreLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedLocationGids, setSelectedLocationGids] = useState([]);

  const fetchStoreLocations = async () => {
    if (storeLocations.length > 0) return;
    setLoadingLocations(true);
    try {
      const res = await fetch("/api/rules/locations");
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.locations) && data.locations.length > 0) {
          setStoreLocations(data.locations);
          setLoadingLocations(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error fetching store locations:", err);
    }

    setStoreLocations([
      { id: "gid://shopify/Location/main-warehouse", name: "Main Logistics Hub", isActive: true, city: "New York", provinceCode: "NY" },
      { id: "gid://shopify/Location/us-east-wh", name: "US-East Fulfillment Center", isActive: true, city: "Boston", provinceCode: "MA" },
      { id: "gid://shopify/Location/retail-store-1", name: "Retail Store Locations", isActive: true, city: "Los Angeles", provinceCode: "CA" },
      { id: "gid://shopify/Location/freight-depot", name: "Regional Freight Depot", isActive: true, city: "Chicago", provinceCode: "IL" },
      { id: "gid://shopify/Location/wholesale-hub", name: "Central Wholesale Hub", isActive: true, city: "Atlanta", provinceCode: "GA" }
    ]);
    setLoadingLocations(false);
  };

  const handleOpenLocationPicker = async () => {
    await fetchStoreLocations();
    const currentGids = fulfillmentLocationIds ? fulfillmentLocationIds.split(",").map(g => g.trim()).filter(Boolean) : [];
    setSelectedLocationGids(currentGids);
    setLocationSearchQuery("");
    setLocationModalOpen(true);
  };

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("0");
  const [status, setStatus] = useState("active");
  const [targetShop, setTargetShop] = useState(""); // "" means All Stores / Default
  const [installedShops, setInstalledShops] = useState([]);
  const [conditionsOperator, setConditionsOperator] = useState("AND");
  const [ruleType, setRuleType] = useState("validation"); // validation, delivery, payment, checkbox, discount
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

  // Discount Rule state
  const [discountType, setDiscountType] = useState("tiered");
  const [discountTarget, setDiscountTarget] = useState("order");
  const [discountValue, setDiscountValue] = useState("");
  const [tieredBrackets, setTieredBrackets] = useState([
    { spend_threshold: "100", discount_percent: "10", discount_amount: "" },
    { spend_threshold: "200", discount_percent: "20", discount_amount: "" }
  ]);
  const [volumeBrackets, setVolumeBrackets] = useState([
    { min_qty: "3", max_qty: "99", discount_percent: "15", discount_amount: "" }
  ]);
  const [bogoConfig, setBogoConfig] = useState({
    buy_qty: 1,
    get_qty: 1,
    get_discount_percent: 50,
    buy_product_ids: [],
    get_product_ids: []
  });
  const [maxDiscountCap, setMaxDiscountCap] = useState("");
  // Fulfillment Constraints state
  const [fulfillmentAction, setFulfillmentAction] = useState("require_location");
  const [fulfillmentLocationIds, setFulfillmentLocationIds] = useState("gid://shopify/Location/main-warehouse");
  const [fulfillmentLocationName, setFulfillmentLocationName] = useState("Main Logistics Hub");

  // Cart Transform state
  const [transformType, setTransformType] = useState("price_override");
  const [transformParentVariantId, setTransformParentVariantId] = useState("");
  const [transformTargetVariantIds, setTransformTargetVariantIds] = useState("");
  const [transformOverridePrice, setTransformOverridePrice] = useState("");
  const [transformCustomTitle, setTransformCustomTitle] = useState("");
  const [transformComponents, setTransformComponents] = useState([
    { variant_id: "", quantity: 1, fixed_price: "" }
  ]);
  const [transformComponentVariantIds, setTransformComponentVariantIds] = useState("");
  const [transformBundlePrice, setTransformBundlePrice] = useState("");
  const [transformBundleTitle, setTransformBundleTitle] = useState("");

  // Banner promotional offer state
  const [bannerOfferType, setBannerOfferType] = useState("promotional_offer");
  const [bannerMinAmount, setBannerMinAmount] = useState("75");
  const [bannerDiscountValue, setBannerDiscountValue] = useState("15");
  const [bannerDiscountType, setBannerDiscountType] = useState("percentage");
  const [bannerPromoCode, setBannerPromoCode] = useState("SAVE15");
  const [bannerMaxCap, setBannerMaxCap] = useState("");

  // Custom Input Fields state
  const [attributeKey, setAttributeKey] = useState("gift_message");
  const [fieldType, setFieldType] = useState("text");
  const [isRequired, setIsRequired] = useState(false);
  const [maxLength, setMaxLength] = useState("");
  const [validationPattern, setValidationPattern] = useState("");
  const [selectOptionsRaw, setSelectOptionsRaw] = useState("Option 1, Option 2, Option 3");

  // Upsell & Cross-sell state
  const [variantGid, setVariantGid] = useState("");
  const [upsellPrice, setUpsellPrice] = useState("$4.99");
  const [upsellImageUrl, setUpsellImageUrl] = useState("");

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
            setDiscountType(data.discount_type || "tiered");
            setDiscountTarget(data.discount_target || "order");
            setDiscountValue(data.discount_value || "");
            let discConfig = data.discount_config || {};
            if (typeof discConfig === "string") {
              try { discConfig = JSON.parse(discConfig); } catch(e){}
            }
            if (discConfig && typeof discConfig === "object") {
              if (Array.isArray(discConfig.tiered_brackets)) setTieredBrackets(discConfig.tiered_brackets);
              if (Array.isArray(discConfig.volume_brackets)) setVolumeBrackets(discConfig.volume_brackets);
              if (discConfig.bogo_config) setBogoConfig(discConfig.bogo_config);
              if (discConfig.max_discount_cap) setMaxDiscountCap(String(discConfig.max_discount_cap || ""));
              if (discConfig.offer_type) setBannerOfferType(discConfig.offer_type);
              if (discConfig.min_amount) setBannerMinAmount(String(discConfig.min_amount));
              if (discConfig.discount_value) setBannerDiscountValue(String(discConfig.discount_value));
              if (discConfig.discount_type) setBannerDiscountType(discConfig.discount_type);
              if (discConfig.promo_code !== undefined) setBannerPromoCode(discConfig.promo_code);
              if (discConfig.max_cap !== undefined) setBannerMaxCap(String(discConfig.max_cap || ""));
            }
            setConditionsOperator(data.conditions_operator || "AND");
            setErrorMessage(data.error_message);
            setErrorTarget(data.error_target || "$.cart");
            setConditions(data.conditions || []);
            setWarningBanner(!!data.warning_banner);
            setCustomIcon(data.custom_icon || "none");
            setBannerStyle(data.banner_style || "warning");
            setGuidanceMessage(data.guidance_message || "");
            setDisplayInCheckout(data.display_in_checkout !== false);
            setAttributeKey(data.attribute_key || "gift_message");
            setFieldType(data.field_type || "text");
            setIsRequired(!!data.is_required);
            setMaxLength(data.max_length || "");
            setSelectOptionsRaw(Array.isArray(data.select_options) ? data.select_options.join(", ") : "Option 1, Option 2, Option 3");
            setVariantGid(data.variant_gid || data.discount_value || "");
            setUpsellImageUrl(data.image_url || "");
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
            setDiscountType(data.discount_type || "tiered");
            setDiscountTarget(data.discount_target || "order");
            setDiscountValue(data.discount_value || "");
            let templateDiscConfig = data.discount_config || {};
            if (typeof templateDiscConfig === "string") {
              try { templateDiscConfig = JSON.parse(templateDiscConfig); } catch(e){}
            }
            if (templateDiscConfig && typeof templateDiscConfig === "object") {
              if (Array.isArray(templateDiscConfig.tiered_brackets)) setTieredBrackets(templateDiscConfig.tiered_brackets);
              if (Array.isArray(templateDiscConfig.volume_brackets)) setVolumeBrackets(templateDiscConfig.volume_brackets);
              if (templateDiscConfig.bogo_config) setBogoConfig(templateDiscConfig.bogo_config);
              if (templateDiscConfig.max_discount_cap) setMaxDiscountCap(String(templateDiscConfig.max_discount_cap || ""));
            }
            setConditionsOperator(data.conditions_operator || "AND");
            setErrorMessage(data.error_message);
            setErrorTarget(data.error_target || "$.cart");
            setConditions(data.conditions || []);
            setWarningBanner(!!data.warning_banner);
            setCustomIcon(data.custom_icon || "none");
            setBannerStyle(data.banner_style || "warning");
            setGuidanceMessage(data.guidance_message || "");
            setDisplayInCheckout(data.display_in_checkout !== false);
            setAttributeKey(data.attribute_key || "gift_message");
            setFieldType(data.field_type || "text");
            setIsRequired(!!data.is_required);
            setMaxLength(data.max_length || "");
            setSelectOptionsRaw(Array.isArray(data.select_options) ? data.select_options.join(", ") : "Option 1, Option 2, Option 3");
            setVariantGid(data.variant_gid || data.discount_value || "");
            setUpsellImageUrl(data.image_url || "");
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
        } else if (typeParam === "discount") {
          setErrorTarget("$.cart");
          setErrorMessage("");
          setConditions([]);
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
    } else if (ruleType !== "checkbox" && ruleType !== "discount") {
      if (!errorMessage.trim()) {
        shopify.toast.show("Announcement message body is required", { isError: true });
        return;
      }
    }
    if (ruleType !== "checkbox" && ruleType !== "discount" && ruleType !== "Announcements & Notices" && ruleType !== "announcement" && conditions.length === 0) {
      shopify.toast.show("At least one condition must be specified", { isError: true });
      return;
    }

    // Validate conditions
    if (ruleType !== "discount" && ruleType !== "Announcements & Notices" && ruleType !== "announcement") {
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
        if (new Date(scheduleEnd) <= new Date(scheduleStart)) {
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
      discount_type: ruleType === "discount" ? discountType : null,
      discount_target: ruleType === "discount" ? discountTarget : "order",
      discount_value: ruleType === "discount" ? discountValue : null,
      discount_config: ruleType === "discount" ? {
        tiered_brackets: tieredBrackets,
        volume_brackets: volumeBrackets,
        bogo_config: bogoConfig,
        max_discount_cap: maxDiscountCap
      } : ruleType === "banner" ? {
        offer_type: bannerOfferType,
        min_amount: bannerMinAmount,
        discount_value: bannerDiscountValue,
        discount_type: bannerDiscountType,
        promo_code: bannerPromoCode,
        max_cap: bannerMaxCap
      } : {},
      fulfillment_action: ruleType === "fulfillment" ? fulfillmentAction : null,
      fulfillment_config: ruleType === "fulfillment" ? {
        location_ids: fulfillmentLocationIds.split(",").map(id => id.trim()).filter(Boolean),
        location_name: fulfillmentLocationName
      } : {},
      schedule_start: enableScheduling && scheduleStart ? scheduleStart : null,
      schedule_end: enableScheduling && scheduleEnd ? scheduleEnd : null,
      warning_banner: false,
      custom_icon: customIcon,
      banner_style: isFieldTarget ? "critical" : bannerStyle,
      guidance_message: guidanceMessage,
      display_in_checkout: displayInCheckout,
      attribute_key: ruleType === "custom_input" ? attributeKey : null,
      field_type: ruleType === "custom_input" ? fieldType : null,
      is_required: ruleType === "custom_input" ? isRequired : false,
      max_length: ruleType === "custom_input" ? maxLength : null,
      select_options: ruleType === "custom_input" && fieldType === "select" ? selectOptionsRaw.split(",").map(s => s.trim()).filter(Boolean) : null,
      variant_gid: ruleType === "upsell" ? variantGid : null,
      image_url: ruleType === "upsell" ? upsellImageUrl : null
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
    { label: "Checkout Validation", value: "validation" },
    { label: "Delivery Customization", value: "delivery" },
    { label: "Payment Customization", value: "payment" },
    { label: "Checkout Checkbox", value: "checkbox" },
    { label: "Discount Allocator", value: "discount" },
    { label: "Cart Transform & Native Bundling", value: "cart_transform" },
    { label: "Fulfillment Constraints & Order Routing", value: "fulfillment" },
    { label: "Announcements & Notices", value: "Announcements & Notices" },
    { label: "Custom Banner & Announcement", value: "banner" },
    { label: "Custom Input Fields", value: "custom_input" },
    { label: "In-Checkout Upsell & Cross-sell", value: "upsell" },
    { label: "Conditional Interactivity & Modals", value: "interactive_modal" }
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
        ? (ruleType === "delivery" ? "Edit Delivery Customization" : ruleType === "payment" ? "Edit Payment Customization" : ruleType === "discount" ? "Edit Discount Allocator Rule" : "Edit Validation Rule")
        : (ruleType === "delivery" ? "Create Delivery Customization" : ruleType === "payment" ? "Create Payment Customization" : ruleType === "discount" ? "Create Discount Allocator Rule" : "Create Validation Rule")
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
                      } else if (val === "discount") {
                        setErrorTarget("$.cart");
                        setErrorMessage("");
                        setConditions([]);
                      } else if (val === "Announcements & Notices" || val === "announcement" || val === "banner") {
                        setErrorTarget("purchase.checkout.block.render");
                        setErrorMessage("Store Announcement: Order by Dec 20 for holiday shipping.");
                        setGuidanceMessage("Applies to all checkout orders.");
                        setBannerStyle("info");
                        setCustomIcon("calendar");
                        setConditions([]);
                      } else if (val === "custom_input") {
                        setErrorTarget("purchase.checkout.block.render");
                        setTitle("Gift Message / Personalization");
                        setAttributeKey("gift_message");
                        setFieldType("text");
                        setIsRequired(false);
                        setErrorMessage("Enter your gift note or card message.");
                        setGuidanceMessage("Will be printed on card and included with your order.");
                        setConditions([]);
                      } else if (val === "upsell") {
                        setErrorTarget("purchase.checkout.reductions.render-before");
                        setTitle("Shipping Protection & Warranty");
                        setErrorMessage("$4.99");
                        setGuidanceMessage("Covers lost, damaged, or stolen packages.");
                        setCustomIcon("shield");
                        setConditions([]);
                      } else if (val === "interactive_modal") {
                        setErrorTarget("purchase.checkout.actions.render-before");
                        setTitle("Age Verification Required (21+)");
                        setFieldType("age_gate");
                        setIsRequired(true);
                        setErrorMessage("Age Verification Required");
                        setGuidanceMessage("You must verify your date of birth (21+) to purchase regulated items in your cart.");
                        setConditions([]);
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
                            const tomorrowTimeStr = new Date(now.getTime() + 24 * 60 * 60 * 1000 - tzOffset).toISOString().substring(0, 16);
                            if (!scheduleStart) setScheduleStart(localTimeStr);
                            if (!scheduleEnd) setScheduleEnd(tomorrowTimeStr);
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

            {/* Discount Allocator Rules Card */}
            {ruleType === "fulfillment" && (
              <Card title="Fulfillment Constraints & Order Routing Configuration">
                <Box padding="5">
                  <FormLayout>
                    <Select
                      label="Fulfillment Routing Action"
                      options={[
                        { label: "Require Origin Location (Must Fulfill From)", value: "require_location" },
                        { label: "Restrict Origin Location (Cannot Fulfill From)", value: "restrict_location" },
                        { label: "Prefer Origin Location (Priority Routing)", value: "prefer_location" }
                      ]}
                      value={fulfillmentAction}
                      onChange={setFulfillmentAction}
                      helpText="Dictates whether matching items must ship from, cannot ship from, or prefer specific warehouse origin locations."
                    />

                    <TextField
                      label="Target Location Name / Label"
                      value={fulfillmentLocationName}
                      onChange={setFulfillmentLocationName}
                      placeholder="e.g. Main Logistics Hub"
                      autoComplete="off"
                      helpText="Human-readable label for this fulfillment origin location."
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <Text variant="bodyMd" as="label">Target Shopify Location GID(s)</Text>
                      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Target Shopify Location GID(s)"
                            labelHidden
                            value={fulfillmentLocationIds}
                            onChange={setFulfillmentLocationIds}
                            placeholder="e.g. gid://shopify/Location/12345678, gid://shopify/Location/98765432"
                            autoComplete="off"
                            helpText="Comma-separated Shopify Location GIDs to apply constraints to."
                          />
                        </div>
                        <Button onClick={handleOpenLocationPicker}>
                          Select Store Location(s) 📍
                        </Button>
                      </div>
                    </div>
                  </FormLayout>
                </Box>
              </Card>
            )}

            {ruleType === "discount" && (
              <Card title="Discount Allocator Configuration">
                <Box padding="5">
                  <FormLayout>
                    <Select
                      label="Discount Rule Strategy"
                      options={[
                        { label: "Tiered Spend Savings (Spend $X get Y% Off)", value: "tiered" },
                        { label: "Bulk Volume Pricing (Buy X items get Y% Off)", value: "volume" },
                        { label: "Custom Buy 1 Get 1 (BOGO Logic)", value: "bogo" },
                        { label: "Customer Tag Exclusive Discount (VIP/Wholesale)", value: "customer_tag" },
                        { label: "Order Percentage Discount", value: "percentage" },
                        { label: "Order Fixed Amount Discount", value: "fixed_amount" }
                      ]}
                      value={discountType}
                      onChange={setDiscountType}
                    />

                    <Select
                      label="Apply Discount To"
                      options={[
                        { label: "Entire Order Subtotal", value: "order" },
                        { label: "Individual Line Items", value: "line_items" }
                      ]}
                      value={discountTarget}
                      onChange={setDiscountTarget}
                    />

                    {discountType === "tiered" && (
                      <Box padding="4" background="bg-subdued" borderRadius="200">
                        <Text variant="headingSm">Spend Tiers Configuration</Text>
                        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(tieredBrackets || []).map((bracket, bIdx) => (
                            <HorizontalStack key={bIdx} gap="3" align="space-between" blockAlign="center">
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="Spend Threshold ($)"
                                  type="number"
                                  value={bracket.spend_threshold}
                                  onChange={(val) => {
                                    const newBrackets = [...(tieredBrackets || [])];
                                    newBrackets[bIdx].spend_threshold = val;
                                    setTieredBrackets(newBrackets);
                                  }}
                                  autoComplete="off"
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="Discount Percentage (%)"
                                  type="number"
                                  value={bracket.discount_percent}
                                  onChange={(val) => {
                                    const newBrackets = [...(tieredBrackets || [])];
                                    newBrackets[bIdx].discount_percent = val;
                                    setTieredBrackets(newBrackets);
                                  }}
                                  autoComplete="off"
                                />
                              </div>
                              <div style={{ paddingTop: "20px" }}>
                                <Button tone="critical" size="slim" onClick={() => {
                                  setTieredBrackets((tieredBrackets || []).filter((_, i) => i !== bIdx));
                                }}>Remove Tier</Button>
                              </div>
                            </HorizontalStack>
                          ))}
                          <div style={{ marginTop: "6px" }}>
                            <Button onClick={() => setTieredBrackets([...(tieredBrackets || []), { spend_threshold: "300", discount_percent: "30" }])}>+ Add Tier Bracket</Button>
                          </div>
                        </div>
                      </Box>
                    )}

                    {discountType === "volume" && (
                      <Box padding="4" background="bg-subdued" borderRadius="200">
                        <Text variant="headingSm">Volume Quantity Tiers Configuration</Text>
                        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {(volumeBrackets || []).map((vBracket, vIdx) => (
                            <HorizontalStack key={vIdx} gap="3" align="space-between" blockAlign="center">
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="Min Quantity"
                                  type="number"
                                  value={vBracket.min_qty}
                                  onChange={(val) => {
                                    const newV = [...(volumeBrackets || [])];
                                    newV[vIdx].min_qty = val;
                                    setVolumeBrackets(newV);
                                  }}
                                  autoComplete="off"
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="Max Quantity"
                                  type="number"
                                  value={vBracket.max_qty}
                                  onChange={(val) => {
                                    const newV = [...(volumeBrackets || [])];
                                    newV[vIdx].max_qty = val;
                                    setVolumeBrackets(newV);
                                  }}
                                  autoComplete="off"
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="Discount %"
                                  type="number"
                                  value={vBracket.discount_percent}
                                  onChange={(val) => {
                                    const newV = [...(volumeBrackets || [])];
                                    newV[vIdx].discount_percent = val;
                                    setVolumeBrackets(newV);
                                  }}
                                  autoComplete="off"
                                />
                              </div>
                              <div style={{ paddingTop: "20px" }}>
                                <Button tone="critical" size="slim" onClick={() => {
                                  setVolumeBrackets((volumeBrackets || []).filter((_, i) => i !== vIdx));
                                }}>Remove Tier</Button>
                              </div>
                            </HorizontalStack>
                          ))}
                          <div style={{ marginTop: "6px" }}>
                            <Button onClick={() => setVolumeBrackets([...(volumeBrackets || []), { min_qty: "5", max_qty: "10", discount_percent: "20" }])}>+ Add Volume Bracket</Button>
                          </div>
                        </div>
                      </Box>
                    )}

                    {discountType === "bogo" && (
                      <Box padding="4" background="bg-subdued" borderRadius="200">
                        <Text variant="headingSm">BOGO Logic Settings</Text>
                        <HorizontalStack gap="3" style={{ marginTop: "12px" }}>
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Buy Quantity"
                              type="number"
                              value={String((bogoConfig || {}).buy_qty || 1)}
                              onChange={(val) => setBogoConfig({ ...(bogoConfig || {}), buy_qty: parseInt(val) || 1 })}
                              autoComplete="off"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Get Quantity"
                              type="number"
                              value={String((bogoConfig || {}).get_qty || 1)}
                              onChange={(val) => setBogoConfig({ ...(bogoConfig || {}), get_qty: parseInt(val) || 1 })}
                              autoComplete="off"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Get Item Discount %"
                              type="number"
                              value={String((bogoConfig || {}).get_discount_percent || 50)}
                              onChange={(val) => setBogoConfig({ ...(bogoConfig || {}), get_discount_percent: parseFloat(val) || 50 })}
                              helpText="100% for Buy 1 Get 1 Free"
                              autoComplete="off"
                            />
                          </div>
                        </HorizontalStack>
                      </Box>
                    )}

                    {(discountType === "customer_tag" || discountType === "percentage" || discountType === "fixed_amount") && (
                      <TextField
                        label={discountType === "fixed_amount" ? "Fixed Discount Amount ($)" : "Discount Percentage (%)"}
                        type="number"
                        value={discountValue}
                        onChange={setDiscountValue}
                        placeholder={discountType === "fixed_amount" ? "15.00" : "15"}
                        autoComplete="off"
                      />
                    )}

                    <TextField
                      label="Maximum Discount Cap ($ - Optional)"
                      type="number"
                      value={maxDiscountCap}
                      onChange={setMaxDiscountCap}
                      placeholder="e.g. 50.00"
                      helpText="Limits maximum savings generated by this discount rule."
                      autoComplete="off"
                    />
                  </FormLayout>
                </Box>
              </Card>
            )}

            {/* Cart Transform Rules Card */}
            {ruleType === "cart_transform" && (
              <Card title="Cart Transform Configuration">
                <Box padding="5">
                  <FormLayout>
                    <Select
                      label="Transform Operation Type *"
                      options={[
                        { label: "Native Line-Item Unit Price Override", value: "price_override" },
                        { label: "Kit Bundle Component Expansion", value: "kit_expansion" },
                        { label: "Product Bundling (Merge Components)", value: "bundling" }
                      ]}
                      value={transformType}
                      onChange={setTransformType}
                      helpText="Choose how Shopify Cart Transform will modify items natively in cart and checkout."
                    />

                    {transformType === "price_override" && (
                      <>
                        <TextField
                          label="Target Product Variant GIDs *"
                          value={transformTargetVariantIds}
                          onChange={setTransformTargetVariantIds}
                          placeholder="gid://shopify/ProductVariant/12345678, gid://shopify/ProductVariant/87654321"
                          helpText="Comma-separated product variant GIDs whose unit prices will be overridden."
                          autoComplete="off"
                          connectedRight={
                            <Button onClick={() => handleOpenVariantPicker("price_override", true, transformTargetVariantIds)}>
                              📦 Select from Store
                            </Button>
                          }
                        />
                        <TextField
                          label="New Unit Price ($) *"
                          type="number"
                          value={transformOverridePrice}
                          onChange={setTransformOverridePrice}
                          placeholder="49.99"
                          helpText="The fixed unit price applied to matching line items at checkout."
                          autoComplete="off"
                        />
                        <TextField
                          label="Custom Line Item Title (Optional)"
                          value={transformCustomTitle}
                          onChange={setTransformCustomTitle}
                          placeholder="e.g. VIP Contract Pricing"
                          autoComplete="off"
                        />
                      </>
                    )}

                    {transformType === "kit_expansion" && (
                      <>
                        <TextField
                          label="Parent Kit Variant GID *"
                          value={transformParentVariantId}
                          onChange={setTransformParentVariantId}
                          placeholder="gid://shopify/ProductVariant/PARENT_KIT_ID"
                          helpText="When this parent kit variant is added to cart, it will be expanded into component items."
                          autoComplete="off"
                          connectedRight={
                            <Button onClick={() => handleOpenVariantPicker("kit_parent", false, transformParentVariantId)}>
                              📦 Select from Store
                            </Button>
                          }
                        />
                        <Text variant="headingSm">Component Items</Text>
                        {transformComponents.map((comp, cIdx) => (
                          <Box key={cIdx} padding="3" background="bg-subdued" borderRadius="200">
                            <HorizontalStack gap="3">
                              <div style={{ flex: 2 }}>
                                <TextField
                                  label="Component Variant GID *"
                                  value={comp.variant_id}
                                  onChange={(val) => {
                                    const next = [...transformComponents];
                                    next[cIdx].variant_id = val;
                                    setTransformComponents(next);
                                  }}
                                  placeholder="gid://shopify/ProductVariant/101"
                                  autoComplete="off"
                                  connectedRight={
                                    <Button onClick={() => handleOpenVariantPicker(`kit_comp_${cIdx}`, false, comp.variant_id)}>
                                      📦 Select
                                    </Button>
                                  }
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="Quantity"
                                  type="number"
                                  value={String(comp.quantity || 1)}
                                  onChange={(val) => {
                                    const next = [...transformComponents];
                                    next[cIdx].quantity = parseInt(val) || 1;
                                    setTransformComponents(next);
                                  }}
                                  autoComplete="off"
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <TextField
                                  label="Fixed Price ($)"
                                  type="number"
                                  value={comp.fixed_price || ""}
                                  onChange={(val) => {
                                    const next = [...transformComponents];
                                    next[cIdx].fixed_price = val;
                                    setTransformComponents(next);
                                  }}
                                  placeholder="29.99"
                                  autoComplete="off"
                                />
                              </div>
                              <div style={{ paddingTop: "20px" }}>
                                <Button tone="critical" size="slim" onClick={() => setTransformComponents(transformComponents.filter((_, i) => i !== cIdx))}>
                                  Remove
                                </Button>
                              </div>
                            </HorizontalStack>
                          </Box>
                        ))}
                        <Button onClick={() => setTransformComponents([...transformComponents, { variant_id: "", quantity: 1, fixed_price: "" }])}>
                          + Add Component
                        </Button>
                      </>
                    )}

                    {transformType === "bundling" && (
                      <>
                        <TextField
                          label="Required Component Variant GIDs *"
                          value={transformComponentVariantIds}
                          onChange={setTransformComponentVariantIds}
                          placeholder="gid://shopify/ProductVariant/101, gid://shopify/ProductVariant/102"
                          helpText="Comma-separated variant IDs that, when present together in cart, will be merged."
                          autoComplete="off"
                          connectedRight={
                            <Button onClick={() => handleOpenVariantPicker("bundle_comp", true, transformComponentVariantIds)}>
                              📦 Select Components
                            </Button>
                          }
                        />
                        <TextField
                          label="Parent Bundle Variant GID *"
                          value={transformParentVariantId}
                          onChange={setTransformParentVariantId}
                          placeholder="gid://shopify/ProductVariant/BUNDLE_PARENT_ID"
                          helpText="The target parent bundle variant displayed in cart/checkout after merging."
                          autoComplete="off"
                          connectedRight={
                            <Button onClick={() => handleOpenVariantPicker("bundle_parent", false, transformParentVariantId)}>
                              📦 Select Parent
                            </Button>
                          }
                        />
                        <TextField
                          label="Merged Bundle Unit Price ($) *"
                          type="number"
                          value={transformBundlePrice}
                          onChange={setTransformBundlePrice}
                          placeholder="89.99"
                          autoComplete="off"
                        />
                        <TextField
                          label="Custom Bundle Title (Optional)"
                          value={transformBundleTitle}
                          onChange={setTransformBundleTitle}
                          placeholder="e.g. Complete Gift Bundle"
                          autoComplete="off"
                        />
                      </>
                    )}
                  </FormLayout>
                </Box>
              </Card>
            )}

            {/* Conditions Section */}
            {ruleType !== "checkbox" && ruleType !== "discount" && ruleType !== "cart_transform" && ruleType !== "banner" && ruleType !== "custom_input" && ruleType !== "upsell" && ruleType !== "interactive_modal" && ruleType !== "Announcements & Notices" && ruleType !== "announcement" && (
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
            ) : ruleType === "banner" ? (
              <Card title="Custom Banner & Announcement Configuration">
                <Box padding="5">
                  <FormLayout>
                    <Select
                      label="Banner Purpose / Offer Type *"
                      options={[
                        { label: "Promotional Offer (Dynamic Spend & Discount)", value: "promotional_offer" },
                        { label: "General Store Announcement (Static Text)", value: "general_announcement" }
                      ]}
                      value={bannerOfferType}
                      onChange={setBannerOfferType}
                      helpText="Select whether this banner promotes a dynamic spend offer or acts as a general announcement."
                    />

                    {bannerOfferType === "promotional_offer" ? (
                      <>
                        <HorizontalStack gap="4">
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Minimum Order Subtotal ($) *"
                              type="number"
                              placeholder="75"
                              value={bannerMinAmount}
                              onChange={setBannerMinAmount}
                              helpText="Cart subtotal required to qualify for discount."
                              autoComplete="off"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <Select
                              label="Discount Type *"
                              options={[
                                { label: "Percentage (%)", value: "percentage" },
                                { label: "Fixed Amount ($)", value: "fixed_amount" }
                              ]}
                              value={bannerDiscountType}
                              onChange={(newType) => {
                                const minAmt = parseFloat(bannerMinAmount) || 0;
                                const currentVal = parseFloat(bannerDiscountValue) || 0;
                                if (minAmt > 0 && currentVal > 0) {
                                  if (newType === "percentage" && bannerDiscountType === "fixed_amount") {
                                    const calculatedPct = Math.min(100, Math.round((currentVal / minAmt) * 100));
                                    setBannerDiscountValue(String(calculatedPct));
                                  } else if (newType === "fixed_amount" && bannerDiscountType === "percentage") {
                                    const calculatedFixed = Math.round((currentVal / 100) * minAmt * 100) / 100;
                                    setBannerDiscountValue(String(calculatedFixed));
                                  }
                                }
                                setBannerDiscountType(newType);
                              }}
                              helpText="Auto-converts percentage / dollar values on toggle."
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              label={bannerDiscountType === "percentage" ? "Discount Percentage (%) *" : "Discount Amount ($) *"}
                              type="number"
                              placeholder={bannerDiscountType === "percentage" ? "15" : "10"}
                              value={bannerDiscountValue}
                              onChange={setBannerDiscountValue}
                              autoComplete="off"
                            />
                          </div>
                        </HorizontalStack>

                        <HorizontalStack gap="4">
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Promo Code / Auto-Apply Note (Optional)"
                              placeholder="e.g. SAVE15 (Leave empty if auto-applies)"
                              value={bannerPromoCode}
                              onChange={setBannerPromoCode}
                              autoComplete="off"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Maximum Discount Cap ($) (Optional)"
                              type="number"
                              placeholder="e.g. 25"
                              value={bannerMaxCap}
                              onChange={setBannerMaxCap}
                              helpText="Caps the maximum discount value."
                              autoComplete="off"
                            />
                          </div>
                        </HorizontalStack>

                        <TextField
                          label="Below Minimum Message *"
                          placeholder="Special Offer: Add {remaining} more to get {discount} off!"
                          value={errorMessage}
                          onChange={setErrorMessage}
                          multiline={2}
                          autoComplete="off"
                          helpText="Displayed when cart subtotal is below minimum. Placeholders: {remaining}, {discount}, {min_amount}."
                        />

                        <TextField
                          label="Qualified Goal Message *"
                          placeholder="🎉 Congratulations! You qualified for {discount} off your order!"
                          value={guidanceMessage}
                          onChange={setGuidanceMessage}
                          multiline={2}
                          autoComplete="off"
                          helpText="Displayed when cart subtotal reaches or exceeds minimum amount. Placeholder: {discount}."
                        />
                      </>
                    ) : (
                      <>
                        <TextField
                          label="Banner Title *"
                          placeholder="e.g. Store Announcement"
                          value={title}
                          onChange={setTitle}
                          autoComplete="off"
                        />

                        <TextField
                          label="Banner Message Body *"
                          placeholder="e.g. Orders placed today will ship within 24 hours!"
                          value={errorMessage}
                          onChange={setErrorMessage}
                          multiline={2}
                          autoComplete="off"
                        />

                        <TextField
                          label="Secondary Subtext (Optional)"
                          placeholder="e.g. Free tracking included on all orders."
                          value={guidanceMessage}
                          onChange={setGuidanceMessage}
                          autoComplete="off"
                        />
                      </>
                    )}

                    <HorizontalStack gap="4">
                      <div style={{ flex: 1 }}>
                        <Select
                          label="Banner Style / Tone *"
                          options={[
                            { label: "Info (Blue)", value: "info" },
                            { label: "Success (Green)", value: "success" },
                            { label: "Warning (Orange)", value: "warning" },
                            { label: "Critical (Red)", value: "critical" }
                          ]}
                          value={bannerStyle}
                          onChange={setBannerStyle}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Select
                          label="Banner Icon *"
                          options={[
                            { label: "Gift Icon (🎁)", value: "gift" },
                            { label: "Info Icon (ℹ️)", value: "info" },
                            { label: "Success Icon (✅)", value: "success" },
                            { label: "Warning Icon (⚠️)", value: "warning" },
                            { label: "Critical Icon (🚨)", value: "critical" },
                            { label: "Delivery Truck (🚚)", value: "delivery" },
                            { label: "Lock (🔒)", value: "lock" },
                            { label: "No Icon", value: "none" }
                          ]}
                          value={customIcon}
                          onChange={setCustomIcon}
                        />
                      </div>
                    </HorizontalStack>

                    <Select
                      label="Placement Target *"
                      options={[
                        { label: "Checkout Editor (Dynamic Block Target)", value: "purchase.checkout.block.render" },
                        { label: "Order Summary - Above Discount Code", value: "purchase.checkout.reductions.render-before" },
                        { label: "Order Summary - Below Discount Code", value: "purchase.checkout.reductions.render-after" },
                        { label: "Contact Information (After)", value: "purchase.checkout.contact.render-after" },
                        { label: "Delivery Address (After)", value: "purchase.checkout.delivery-address.render-after" },
                        { label: "Shipping Methods (Before)", value: "purchase.checkout.shipping-option-list.render-before" },
                        { label: "Payment Methods (Before)", value: "purchase.checkout.payment-method-list.render-before" },
                        { label: "Checkout Footer (After)", value: "purchase.checkout.footer.render-after" }
                      ]}
                      value={errorTarget}
                      onChange={setErrorTarget}
                    />
                  </FormLayout>
                </Box>
              </Card>
            ) : ruleType === "custom_input" ? (
              <Card title="Custom Input Field Configuration">
                <Box padding="5">
                  <FormLayout>
                    <HorizontalStack gap="4">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Field Label / Title *"
                          placeholder="e.g. Gift Message, Tax ID / VAT Number"
                          value={title}
                          onChange={setTitle}
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Order Attribute Key *"
                          placeholder="e.g. gift_message, delivery_date, tax_id"
                          value={attributeKey}
                          onChange={setAttributeKey}
                          helpText="Attribute key saved to the Shopify Order."
                          autoComplete="off"
                        />
                      </div>
                    </HorizontalStack>

                    <HorizontalStack gap="4">
                      <div style={{ flex: 1 }}>
                        <Select
                          label="Input Component Type *"
                          options={[
                            { label: "Single Line Text", value: "text" },
                            { label: "Multiline Textarea", value: "multiline" },
                            { label: "Date Picker", value: "date" },
                            { label: "Select Dropdown List", value: "select" },
                            { label: "Checkbox", value: "checkbox" }
                          ]}
                          value={fieldType}
                          onChange={setFieldType}
                        />
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: "20px" }}>
                        <Checkbox
                          label="Is Field Required?"
                          checked={isRequired}
                          onChange={setIsRequired}
                          helpText="Blocks checkout progress until customer fills out this field."
                        />
                      </div>
                    </HorizontalStack>

                    {fieldType === "select" && (
                      <TextField
                        label="Dropdown Options (Comma-separated) *"
                        placeholder="Option 1, Option 2, Option 3"
                        value={selectOptionsRaw}
                        onChange={setSelectOptionsRaw}
                        helpText="Enter options separated by commas."
                        autoComplete="off"
                      />
                    )}

                    <HorizontalStack gap="4">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Placeholder Text (Optional)"
                          placeholder="e.g. Type your personal note here..."
                          value={errorMessage}
                          onChange={setErrorMessage}
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Help Subtext (Optional)"
                          placeholder="e.g. Printed on a physical gift card."
                          value={guidanceMessage}
                          onChange={setGuidanceMessage}
                          autoComplete="off"
                        />
                      </div>
                    </HorizontalStack>

                    {fieldType === "text" && (
                      <TextField
                        label="Character Limit / Max Length (Optional)"
                        type="number"
                        placeholder="e.g. 150"
                        value={maxLength}
                        onChange={setMaxLength}
                        autoComplete="off"
                      />
                    )}

                    <Select
                      label="Placement Target *"
                      options={[
                        { label: "Checkout Editor (Dynamic Block Target)", value: "purchase.checkout.block.render" },
                        { label: "Contact Information (After)", value: "purchase.checkout.contact.render-after" },
                        { label: "Delivery Address (After)", value: "purchase.checkout.delivery-address.render-after" },
                        { label: "Shipping Methods (Before)", value: "purchase.checkout.shipping-option-list.render-before" },
                        { label: "Payment Methods (Before)", value: "purchase.checkout.payment-method-list.render-before" },
                        { label: "Order Summary - Above Discount Code", value: "purchase.checkout.reductions.render-before" },
                        { label: "Actions / Submit Button (Before)", value: "purchase.checkout.actions.render-before" }
                      ]}
                      value={errorTarget}
                      onChange={setErrorTarget}
                    />
                  </FormLayout>
                </Box>
              </Card>
            ) : ruleType === "upsell" ? (
              <Card title="In-Checkout Upsell & Cross-sell Configuration">
                <Box padding="5">
                  <FormLayout>
                    <HorizontalStack gap="4">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Offer Title / Heading *"
                          placeholder="e.g. Add Extended 2-Year Protection"
                          value={title}
                          onChange={setTitle}
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Display Price Callout *"
                          placeholder="e.g. $4.99 or FREE"
                          value={errorMessage}
                          onChange={setErrorMessage}
                          helpText="Price tag displayed on the offer banner."
                          autoComplete="off"
                        />
                      </div>
                    </HorizontalStack>

                    <TextField
                      label="Product Variant GID *"
                      placeholder="gid://shopify/ProductVariant/123456789"
                      value={variantGid}
                      onChange={setVariantGid}
                      helpText="The Shopify Variant GID added to cart when buyer clicks the offer."
                      autoComplete="off"
                      connectedRight={
                        <Button onClick={() => handleOpenVariantPicker("upsell_variant", false, variantGid)}>
                          🛍️ Browse Variant
                        </Button>
                      }
                    />

                    <TextField
                      label="Offer Description / Subtext *"
                      placeholder="e.g. Covers accidental drops, spills, and hardware failures for 24 months."
                      value={guidanceMessage}
                      onChange={setGuidanceMessage}
                      autoComplete="off"
                    />

                    <Select
                      label="Placement Target *"
                      options={[
                        { label: "Order Summary - Above Discount Code", value: "purchase.checkout.reductions.render-before" },
                        { label: "Order Summary - Below Discount Code", value: "purchase.checkout.reductions.render-after" },
                        { label: "Checkout Editor (Dynamic Block Target)", value: "purchase.checkout.block.render" },
                        { label: "Shipping Methods (Before)", value: "purchase.checkout.shipping-option-list.render-before" },
                        { label: "Payment Methods (Before)", value: "purchase.checkout.payment-method-list.render-before" },
                        { label: "Checkout Footer (After)", value: "purchase.checkout.footer.render-after" }
                      ]}
                      value={errorTarget}
                      onChange={setErrorTarget}
                    />
                  </FormLayout>
                </Box>
              </Card>
            ) : ruleType === "interactive_modal" ? (
              <Card title="Conditional Interactivity & Modal Configuration">
                <Box padding="5">
                  <FormLayout>
                    <HorizontalStack gap="4">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Modal Title / Heading *"
                          placeholder="e.g. Age Verification Required (21+)"
                          value={title}
                          onChange={setTitle}
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Select
                          label="Verification Type *"
                          options={[
                            { label: "Age Verification Gate & DOB Check", value: "age_gate" },
                            { label: "Terms & Conditions Legal Waiver", value: "terms_ack" },
                            { label: "Address & PO Box Confirmation Modal", value: "address_confirm" }
                          ]}
                          value={fieldType}
                          onChange={setFieldType}
                        />
                      </div>
                    </HorizontalStack>

                    <TextField
                      label="Modal Body Text & Instructions *"
                      placeholder="Enter the full policy, age restriction message, or agreement waiver text displayed inside the modal dialog..."
                      value={guidanceMessage}
                      onChange={setGuidanceMessage}
                      multiline={3}
                      autoComplete="off"
                    />

                    <Checkbox
                      label="Block Checkout Submit Until Verified (Required)"
                      checked={isRequired}
                      onChange={setIsRequired}
                      helpText="When enabled, buyers cannot complete their order until they acknowledge/verify the modal."
                    />

                    <Select
                      label="Placement Target *"
                      options={[
                        { label: "Actions / Submit Button (Before)", value: "purchase.checkout.actions.render-before" },
                        { label: "Checkout Editor (Dynamic Block Target)", value: "purchase.checkout.block.render" },
                        { label: "Contact Information (After)", value: "purchase.checkout.contact.render-after" },
                        { label: "Delivery Address (After)", value: "purchase.checkout.delivery-address.render-after" },
                        { label: "Order Summary - Above Discount Code", value: "purchase.checkout.reductions.render-before" }
                      ]}
                      value={errorTarget}
                      onChange={setErrorTarget}
                    />
                  </FormLayout>
                </Box>
              </Card>
            ) : (ruleType === "Announcements & Notices" || ruleType === "announcement") ? (
              <Card title="Announcements & Notices Configuration">
                <Box padding="5">
                  <FormLayout>
                    <Banner status="info" title="Broadcast Announcement Notice">
                      Announcements & Notices render high-visibility broadcast banners across your checkout funnel without needing validation conditions.
                    </Banner>

                    <TextField
                      label="Announcement Title / Heading *"
                      placeholder="e.g. Holiday Shipping Schedule Notice"
                      value={title}
                      onChange={setTitle}
                      autoComplete="off"
                      helpText="Main heading text displayed on the announcement banner."
                    />

                    <TextField
                      label="Announcement Message Body *"
                      placeholder="e.g. Order by Dec 20 for guaranteed delivery before Christmas."
                      value={errorMessage}
                      onChange={setErrorMessage}
                      multiline={2}
                      autoComplete="off"
                      helpText="Main announcement message body text shown to checkout buyers."
                    />

                    <HorizontalStack gap="4">
                      <div style={{ flex: 1 }}>
                        <Select
                          label="Banner Tone / Style *"
                          options={[
                            { label: "Information (Info / Blue)", value: "info" },
                            { label: "Success (Completed / Green)", value: "success" },
                            { label: "Warning (Alert / Orange)", value: "warning" },
                            { label: "Critical (Error / Red)", value: "critical" }
                          ]}
                          value={bannerStyle}
                          onChange={setBannerStyle}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Select
                          label="Banner Icon *"
                          options={[
                            { label: "Calendar (📅)", value: "calendar" },
                            { label: "Delivery Truck (🚚)", value: "delivery" },
                            { label: "Security Lock (🔒)", value: "lock" },
                            { label: "Gift Icon (🎁)", value: "gift" },
                            { label: "Information (ℹ️)", value: "info" },
                            { label: "Success Check (✅)", value: "success" },
                            { label: "Warning Alert (⚠️)", value: "warning" },
                            { label: "Critical Alert (🚨)", value: "critical" },
                            { label: "No Icon", value: "none" }
                          ]}
                          value={customIcon}
                          onChange={setCustomIcon}
                        />
                      </div>
                    </HorizontalStack>

                    <Select
                      label="Placement Target *"
                      options={[
                        { label: "Checkout Editor (Dynamic Block Target)", value: "purchase.checkout.block.render" },
                        { label: "Order Summary - Above Discount Code", value: "purchase.checkout.reductions.render-before" },
                        { label: "Order Summary - Below Discount Code", value: "purchase.checkout.reductions.render-after" },
                        { label: "Contact Information (After)", value: "purchase.checkout.contact.render-after" },
                        { label: "Delivery Address (After)", value: "purchase.checkout.delivery-address.render-after" },
                        { label: "Shipping Methods (Before)", value: "purchase.checkout.shipping-option-list.render-before" },
                        { label: "Payment Methods (Before)", value: "purchase.checkout.payment-method-list.render-before" },
                        { label: "Checkout Footer (After)", value: "purchase.checkout.footer.render-after" }
                      ]}
                      value={errorTarget}
                      onChange={setErrorTarget}
                      helpText="Specifies where the announcement banner will be injected in the checkout layout."
                    />
                  </FormLayout>
                </Box>
              </Card>
            ) : (ruleType === "discount" || ruleType === "cart_transform" || ruleType === "Announcements & Notices" || ruleType === "announcement") ? null : (
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
                                    {ruleType === "banner" ? "Custom Banner" : ruleType === "custom_input" ? "Custom Input Field" : ruleType === "interactive_modal" ? "Interactive Modal" : "Checkout UI Extension"}
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

      {/* Store Product Variant Picker Modal */}
      <Modal
        open={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        title="Select Product Variants from Store"
        primaryAction={{
          content: `Apply Selected (${selectedVariantGids.length})`,
          onAction: () => {
            const finalVal = variantModalIsMulti ? selectedVariantGids.join(", ") : (selectedVariantGids[0] || "");
            applySelectedGidsToTarget(variantModalTarget, finalVal);
            setVariantModalOpen(false);
          }
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setVariantModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <TextField
              label="Search Store Variants"
              labelHidden
              placeholder="🔍 Search by product title, variant title, or SKU..."
              value={variantModalSearch}
              onChange={setVariantModalSearch}
              autoComplete="off"
            />

            {loadingVariants ? (
              <div style={{ textAlign: "center", padding: "24px" }}>
                <Spinner size="medium" />
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>Loading store products and variants...</div>
              </div>
            ) : (
              <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {storeVariants
                  .filter(v =>
                    v.displayName.toLowerCase().includes(variantModalSearch.toLowerCase()) ||
                    (v.sku && v.sku.toLowerCase().includes(variantModalSearch.toLowerCase())) ||
                    v.id.toLowerCase().includes(variantModalSearch.toLowerCase())
                  )
                  .map(v => {
                    const isSelected = selectedVariantGids.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          if (variantModalIsMulti) {
                            if (isSelected) {
                              setSelectedVariantGids(selectedVariantGids.filter(g => g !== v.id));
                            } else {
                              setSelectedVariantGids([...selectedVariantGids, v.id]);
                            }
                          } else {
                            setSelectedVariantGids([v.id]);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: `1px solid ${isSelected ? "#2563eb" : "#e2e8f0"}`,
                          background: isSelected ? "#eff6ff" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {v.imageUrl ? (
                            <img src={v.imageUrl} alt="" style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📦</div>
                          )}
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{v.displayName}</div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {v.sku ? `SKU: ${v.sku} • ` : ""}${v.price} • <code style={{ fontSize: "10px" }}>{v.id}</code>
                            </div>
                          </div>
                        </div>

                        <Button size="slim" pressed={isSelected}>
                          {isSelected ? "✓ Selected" : "Select"}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </Modal.Section>
      </Modal>

      {/* Store Location Selection Modal */}
      {locationModalOpen && (
        <Modal
          open={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          title="Select Store Fulfillment Locations"
          primaryAction={{
            content: `Apply Selected Location(s) (${selectedLocationGids.length})`,
            onAction: () => {
              const joinedGids = selectedLocationGids.join(", ");
              setFulfillmentLocationIds(joinedGids);

              // Auto fill location name field if applicable
              const selectedObjs = storeLocations.filter(l => selectedLocationGids.includes(l.id));
              if (selectedObjs.length > 0) {
                const names = selectedObjs.map(l => l.name).filter(Boolean);
                if (names.length > 0) {
                  setFulfillmentLocationName(names.join(", "));
                }
              }

              setLocationModalOpen(false);
            }
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setLocationModalOpen(false)
            }
          ]}
        >
          <Modal.Section>
            <VerticalStack gap="4">
              <TextField
                label="Search locations"
                labelHidden
                placeholder="Search locations by name, city, or ID..."
                value={locationSearchQuery}
                onChange={setLocationSearchQuery}
                autoComplete="off"
              />

              {loadingLocations ? (
                <HorizontalStack align="center" padding="6">
                  <Spinner size="medium" />
                </HorizontalStack>
              ) : (
                <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {storeLocations
                    .filter(loc => {
                      if (!locationSearchQuery) return true;
                      const q = locationSearchQuery.toLowerCase();
                      return (
                        (loc.name && loc.name.toLowerCase().includes(q)) ||
                        (loc.city && loc.city.toLowerCase().includes(q)) ||
                        (loc.id && loc.id.toLowerCase().includes(q))
                      );
                    })
                    .map((loc) => {
                      const isSelected = selectedLocationGids.includes(loc.id);
                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedLocationGids(selectedLocationGids.filter(id => id !== loc.id));
                            } else {
                              setSelectedLocationGids([...selectedLocationGids, loc.id]);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: `1px solid ${isSelected ? "#008060" : "#e2e8f0"}`,
                            background: isSelected ? "#f4fbf7" : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: isSelected ? "#e6f4ed" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                              📍
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{loc.name || loc.id}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {loc.city ? `${loc.city}${loc.provinceCode ? `, ${loc.provinceCode}` : ''} • ` : ''}
                                <code style={{ fontSize: "10px" }}>{loc.id}</code>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Badge tone={loc.isActive !== false ? "success" : "info"}>
                              {loc.isActive !== false ? "Active" : "Inactive"}
                            </Badge>
                            <Button size="slim" pressed={isSelected}>
                              {isSelected ? "✓ Selected" : "Select"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </VerticalStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
