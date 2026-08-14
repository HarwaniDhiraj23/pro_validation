import '@shopify/ui-extensions/preact';
import { useState, useEffect } from "preact/hooks";

export function InteractiveModal({ rule, cartState, showErrors }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [dob, setDob] = useState("");
  const [dobError, setDobError] = useState("");

  const modalTitle = rule.title || "Verification Required";
  const modalText = rule.guidance_message || rule.error_message || "Please review and acknowledge to continue checkout.";
  const mode = rule.field_type || "terms_ack"; // 'age_gate' | 'terms_ack' | 'address_confirm'
  const isRequired = rule.is_required !== false;
  const buttonText = rule.custom_icon ? `Verify ${rule.custom_icon}` : "Open Verification";

  // Handle Buyer Journey Interception if verification is required
  useEffect(() => {
    if (isRequired && !isVerified && typeof shopify !== "undefined" && shopify.buyerJourney && shopify.buyerJourney.intercept) {
      const unsubscribe = shopify.buyerJourney.intercept(({ canBlockProgress }) => {
        if (!isVerified) {
          setIsOpen(true);
          return {
            behavior: "block",
            reason: "Verification required before completing checkout.",
            perform: (result) => {
              if (result.type === "error") {
                setIsOpen(true);
              }
            }
          };
        }
        return { behavior: "allow" };
      });
      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    }
  }, [isRequired, isVerified]);

  const handleConfirmAge = () => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 21) {
        setDobError("You must be at least 21 years old to purchase restricted items.");
        return;
      }
    }
    setDobError("");
    setIsVerified(true);
    setIsOpen(false);
  };

  const handleConfirmGeneral = () => {
    setIsVerified(true);
    setIsOpen(false);
  };

  return (
    <div style={{ margin: "8px 0" }}>
      {isVerified ? (
        <s-banner tone="success">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "600" }}>✓ {modalTitle} Verified</span>
            <s-badge tone="success">Verified ✓</s-badge>
          </div>
        </s-banner>
      ) : (
        <s-banner tone="warning" heading={modalTitle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "4px" }}>
            <span style={{ fontSize: "13px", color: "#475569" }}>{modalText}</span>
            <s-button tone="primary" onClick={() => setIsOpen(true)}>
              {buttonText}
            </s-button>
          </div>
          {showErrors && isRequired && !isVerified && (
            <div style={{ color: "#dc2626", fontWeight: "600", fontSize: "12px", marginTop: "6px" }}>
              ⚠️ Verification is required to complete order.
            </div>
          )}
        </s-banner>
      )}

      {isOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "16px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                🔒 {modalTitle}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "14px", color: "#334155", lineHeight: "1.5", marginBottom: "16px" }}>
              {modalText}
            </p>

            {mode === "age_gate" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#1e293b", marginBottom: "6px" }}>
                  Date of Birth (DOB) *
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px"
                  }}
                />
                {dobError && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                    {dobError}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
              <s-button onClick={() => setIsOpen(false)}>Cancel</s-button>
              <s-button
                tone="primary"
                onClick={mode === "age_gate" ? handleConfirmAge : handleConfirmGeneral}
              >
                Confirm & Acknowledge
              </s-button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
