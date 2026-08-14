import '@shopify/ui-extensions/preact';

export function ComplianceNotice({ rule }) {
  const tone = rule.banner_style || "warning";
  const icon = rule.custom_icon || "lock";
  
  let iconEmoji = "";
  switch (icon) {
    case "lock": iconEmoji = "🔒 "; break;
    case "delivery": iconEmoji = "🚚 "; break;
    case "warning": iconEmoji = "⚠️ "; break;
    case "critical": iconEmoji = "🚨 "; break;
    case "info": iconEmoji = "ℹ️ "; break;
    default: iconEmoji = "⚖️ "; break;
  }

  const title = rule.title ? `${iconEmoji}${rule.title}` : `${iconEmoji}Compliance Notice`;

  return (
    <s-stack gap="tight">
      <s-banner tone={tone} heading={title}>
        {rule.error_message && (
          <div style={{ marginTop: "4px", fontSize: "13px", color: "#374151" }}>
            {rule.error_message}
          </div>
        )}
        {rule.guidance_message && (
          <div style={{ marginTop: "6px", fontSize: "12px", fontStyle: "italic", color: "#6b7280" }}>
            {rule.guidance_message}
          </div>
        )}
      </s-banner>
    </s-stack>
  );
}
