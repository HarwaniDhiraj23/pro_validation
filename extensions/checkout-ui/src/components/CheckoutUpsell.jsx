import '@shopify/ui-extensions/preact';
import { useState } from "preact/hooks";

export function CheckoutUpsell({ rule, cartState }) {
  const [loading, setLoading] = useState(false);
  const variantGid = rule.variant_gid || rule.discount_value || "";
  const title = rule.title || "Special Add-On Offer";
  const price = rule.error_message || rule.price || "$4.99";
  const description = rule.guidance_message || "";
  const buttonText = rule.custom_icon && rule.custom_icon !== "none" ? `+ ${rule.custom_icon}` : "+ Add Offer";
  const imageUrl = rule.image_url || "";

  // Check if variant is already present in cart lines
  const isAlreadyInCart = Array.isArray(cartState?.lines) && cartState.lines.some(
    (line) => line.merchandise?.id === variantGid
  );

  const handleAddToCart = async () => {
    if (!variantGid) {
      console.warn("[CheckoutUpsell] Missing variant GID for upsell offer.");
      return;
    }
    setLoading(true);
    try {
      if (typeof shopify !== "undefined" && shopify.applyCartLinesChange) {
        const result = await shopify.applyCartLinesChange({
          type: "addCartLine",
          merchandiseId: variantGid,
          quantity: 1
        });
        if (result.type === "error") {
          console.error("[CheckoutUpsell] Error adding cart line:", result.message);
        }
      }
    } catch (err) {
      console.error("[CheckoutUpsell] Exception adding upsell item:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <s-banner tone="info">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px" }} />
          ) : (
            <div style={{ fontSize: "24px" }}>🎁</div>
          )}
          <div>
            <div style={{ fontWeight: "600", fontSize: "14px", color: "#0f172a" }}>
              {title} <span style={{ color: "#008060", fontWeight: "700", marginLeft: "4px" }}>{price}</span>
            </div>
            {description && (
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                {description}
              </div>
            )}
          </div>
        </div>

        <div>
          {isAlreadyInCart ? (
            <s-badge tone="success">Added ✓</s-badge>
          ) : (
            <s-button
              tone="primary"
              disabled={loading}
              onClick={handleAddToCart}
            >
              {loading ? "Adding..." : buttonText}
            </s-button>
          )}
        </div>
      </div>
    </s-banner>
  );
}
