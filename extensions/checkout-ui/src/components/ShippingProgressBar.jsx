import '@shopify/ui-extensions/preact';

export function ShippingProgressBar({ rule, cartState }) {
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
  const threshold = parseFloat(rule.threshold_amount || rule.discount_value || 100);
  const remaining = Math.max(0, threshold - subtotal);
  const percentage = Math.min(100, Math.max(0, Math.round((subtotal / threshold) * 100)));
  const isUnlocked = subtotal >= threshold;

  const formattedRemaining = `${currencySymbol}${remaining.toFixed(2)}`;
  
  let rawInProgress = rule.error_message || "Add {remaining} more to get FREE shipping!";
  const inProgressMessage = rawInProgress.replace("{remaining}", formattedRemaining);
  const unlockedMessage = rule.guidance_message || "🎉 Congratulations! You unlocked FREE shipping!";

  const tone = isUnlocked ? "success" : (rule.banner_style || "info");

  return (
    <s-stack gap="tight">
      <s-banner tone={tone} heading={isUnlocked ? unlockedMessage : inProgressMessage}>
        <div style={{ marginTop: "8px", width: "100%" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            marginBottom: "4px",
            color: "#4b5563"
          }}>
            <span>{percentage}% of {currencySymbol}{threshold.toFixed(2)} goal</span>
            <span>{isUnlocked ? "FREE Shipping Unlocked" : `${formattedRemaining} needed`}</span>
          </div>
          <div style={{
            width: "100%",
            height: "8px",
            backgroundColor: "#e5e7eb",
            borderRadius: "4px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${percentage}%`,
              height: "100%",
              backgroundColor: isUnlocked ? "#16a34a" : "#2563eb",
              borderRadius: "4px",
              transition: "width 0.4s ease-in-out"
            }} />
          </div>
        </div>
      </s-banner>
    </s-stack>
  );
}
