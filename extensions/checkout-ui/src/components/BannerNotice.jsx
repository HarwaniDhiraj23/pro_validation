import '@shopify/ui-extensions/preact';

export function BannerNotice({ rule, cartState = {} }) {
  const tone = rule.banner_style || "info";
  const icon = rule.custom_icon || "default";

  // Parse offer settings from discount_config or rule fields
  let discountConfig = rule.discount_config || {};
  if (typeof discountConfig === "string") {
    try { discountConfig = JSON.parse(discountConfig); } catch(e){}
  }

  const isPromoOffer = rule.banner_offer_type === "promotional_offer" || discountConfig.offer_type === "promotional_offer" || Boolean(discountConfig.min_amount || rule.min_amount);

  let heading = "";
  let bodyText = rule.error_message || "";
  let subtext = rule.guidance_message || "";
  let effectiveTone = tone;

  if (isPromoOffer) {
    const subtotal = parseFloat(cartState.cost?.subtotalAmount?.amount || 0);
    const currencyCode = cartState.cost?.subtotalAmount?.currencyCode || "USD";

    const getCurrencySymbol = (code) => {
      switch (code) {
        case "EUR": return "€";
        case "GBP": return "£";
        case "CAD": return "CA$";
        case "AUD": return "AU$";
        case "JPY": return "¥";
        default: return "$";
      }
    };

    const currencySymbol = getCurrencySymbol(currencyCode);
    const minAmount = parseFloat(discountConfig.min_amount || rule.min_amount || rule.threshold_amount || 75);
    const discVal = parseFloat(discountConfig.discount_value || rule.discount_value || 15);
    const discType = discountConfig.discount_type || rule.discount_type || "percentage";
    const promoCode = discountConfig.promo_code || "";
    const maxCap = parseFloat(discountConfig.max_cap || rule.max_cap || 0);

    const discountFormatted = discType === "percentage" 
      ? `${discVal}%` 
      : `${currencySymbol}${discVal.toFixed(2)}`;

    const capNote = maxCap > 0 ? ` (up to ${currencySymbol}${maxCap.toFixed(2)} max)` : "";
    const fullDiscountText = `${discountFormatted}${capNote}`;

    const remaining = Math.max(0, minAmount - subtotal);
    const formattedRemaining = `${currencySymbol}${remaining.toFixed(2)}`;
    const isQualified = subtotal >= minAmount;

    if (isQualified) {
      effectiveTone = "success";
      const rawQualified = rule.guidance_message || "🎉 Congratulations! You qualified for {discount} off your order!";
      heading = rawQualified
        .replace("{discount}", fullDiscountText)
        .replace("{min_amount}", `${currencySymbol}${minAmount.toFixed(2)}`);
      
      bodyText = promoCode 
        ? `Use code ${promoCode} at checkout or discount auto-applies.${maxCap > 0 ? ` Maximum discount cap: ${currencySymbol}${maxCap.toFixed(2)}.` : ""}` 
        : `Discount applies automatically at checkout.${maxCap > 0 ? ` Maximum discount cap: ${currencySymbol}${maxCap.toFixed(2)}.` : ""}`;
    } else {
      effectiveTone = tone;
      const rawInProgress = rule.error_message || "Special Offer: Add {remaining} more to get {discount} off your order!";
      heading = rawInProgress
        .replace("{remaining}", formattedRemaining)
        .replace("{discount}", fullDiscountText)
        .replace("{min_amount}", `${currencySymbol}${minAmount.toFixed(2)}`);
      
      bodyText = `Spend ${currencySymbol}${minAmount.toFixed(2)} or more to qualify for ${fullDiscountText}.${maxCap > 0 ? ` Maximum savings: ${currencySymbol}${maxCap.toFixed(2)}.` : ""}`;
    }
  } else {
    heading = rule.title || rule.error_message || "Announcement";
  }

  // Prepend custom emoji icons
  let titlePrefix = "";
  switch (icon) {
    case "none": titlePrefix = ""; break;
    case "lock": titlePrefix = "🔒 "; break;
    case "delivery": titlePrefix = "🚚 "; break;
    case "payment": titlePrefix = "💳 "; break;
    case "calendar": titlePrefix = "📅 "; break;
    case "info": titlePrefix = "ℹ️ "; break;
    case "warning": titlePrefix = "⚠️ "; break;
    case "critical": titlePrefix = "🚨 "; break;
    case "success": titlePrefix = "✅ "; break;
    case "gift": titlePrefix = "🎁 "; break;
    default: titlePrefix = ""; break;
  }

  const finalHeading = titlePrefix ? `${titlePrefix}${heading}` : heading;

  return (
    <s-stack gap="tight">
      <s-banner tone={effectiveTone} heading={finalHeading}>
        {bodyText && !isPromoOffer && (
          <div style={{ marginTop: "4px", fontSize: "13px", color: "#374151" }}>
            {bodyText}
          </div>
        )}
        {bodyText && isPromoOffer && (
          <div style={{ marginTop: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
            {bodyText}
          </div>
        )}
        {subtext && !isPromoOffer && (
          <div style={{ marginTop: "6px", fontSize: "12px", color: "#4b5563" }}>
            {subtext}
          </div>
        )}
      </s-banner>
    </s-stack>
  );
}
