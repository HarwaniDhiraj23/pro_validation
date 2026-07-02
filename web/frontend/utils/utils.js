export function formatConditionType(type) {
  const mapping = {
    customer_tags: "Customer Tags",
    login_required: "Login Requirements",
    b2b_only: "B2B Only Checkout",
    guest_checkout_restriction: "Guest Restrictions",
    customer_age: "Customer Age Limit",
    shipping_address_pobox: "PO Box Restrictions",
    block_states: "Restricted States",
    block_countries: "Restricted Countries",
    block_zipcodes: "Restricted ZIPs",
    address_regex: "Regex Address Pattern",
    restricted_collections: "Restricted Collections",
    restricted_vendors: "Restricted Vendors",
    product_combinations: "Product Combinations",
    has_hazardous_item: "Hazardous Items",
    has_subscription: "Subscription Check",
    minimum_order_value: "Minimum Order Value",
    maximum_order_value: "Maximum Order Value",
    quantity_limit: "Quantity Threshold",
    weight_limit: "Weight Threshold",
    sku_limit: "SKU Count Limit"
  };
  return mapping[type] || type;
}

export function formatOperator(op) {
  const mapping = {
    contains: "contains",
    not_contains: "does not contain",
    is_guest: "is guest buyer",
    is_not_guest: "is authenticated customer",
    is_not_b2b: "is not a B2B customer",
    under_age: "is under age",
    is_pobox: "is PO box",
    not_pobox: "is not PO box",
    in_states: "is in state list",
    not_in_states: "is not in state list",
    in_countries: "is in country list",
    not_in_countries: "is not in country list",
    in_zips: "starts with ZIP list",
    matches_regex: "matches regex pattern",
    not_matches_regex: "does not match regex pattern",
    in_collections: "is in collection IDs",
    not_in_collections: "is not in collection IDs",
    in_vendors: "is in vendor list",
    not_in_vendors: "is not in vendor list",
    cannot_combine: "all present in cart",
    equals: "is true",
    not_equals: "is false",
    less_than: "is less than",
    greater_than: "is greater than"
  };
  return mapping[op] || op;
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    
    return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return "-";
  }
}
