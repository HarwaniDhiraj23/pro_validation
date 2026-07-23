import { useState, useEffect, useCallback } from "react";
import { Modal, Checkbox, Button } from "@shopify/polaris";

export function AppOnboardingModal() {
  const [onboarded, setOnboarded] = useState(true); // Default true to avoid layout flash before fetch
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [step, setStep] = useState(1);
  const [consent, setConsent] = useState(false);

  const checkOnboarding = useCallback(async () => {
    try {
      const response = await fetch("/api/onboarding/status");
      if (response.ok) {
        const data = await response.json();
        setOnboarded(data.onboarded);
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding]);

  const handleComplete = async () => {
    if (!consent) return;
    try {
      setCompleting(true);
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        setOnboarded(true);
      } else {
        console.error("Failed to update onboarding status in database");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setCompleting(false);
    }
  };

  if (loading || onboarded) {
    return null;
  }

  return (
    <Modal
      open={!onboarded}
      onClose={() => { }} // Cannot close by clicking outside or close button
      title={
        step === 1
          ? "Welcome to Pro Validation!"
          : step === 2
            ? "You are currently on the Free Plan"
            : "Let's set up Pro Validation"
      }
      size={step === 1 ? "large" : "medium"}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (min-width: 48em) {
          .Polaris-Modal-Dialog__Modal{
            max-width: ${"60rem"} !important;
          }
        }
      `}} />
      <Modal.Section>
        {step === 1 ? (
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1a1a1a", marginBottom: "8px", lineHeight: "1.2" }}>
                Pro Validation has four features to boost your store. Choose the ones to enable
              </h1>
              <p style={{ fontSize: "14px", color: "#6d7175" }}>
                You can change, add or disable these widgets in your panel later.
              </p>
            </div>

            {/* Grid of Features */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              marginBottom: "24px"
            }}>
              {/* Feature 1: Checkout Validation */}
              <div
                style={{
                  border: "1px solid #e1e3e5",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)";
                }}
              >
                <div style={{
                  background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                  padding: "24px 12px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div style={{ padding: "16px", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "700", fontSize: "14px", color: "#202223" }}>Checkout Validation</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#6d7175", lineHeight: "1.4" }}>
                    Enforce rules on cart value, customer tags, or address formats to restrict checkout.
                  </p>
                </div>
              </div>

              {/* Feature 2: Delivery Customization */}
              <div
                style={{
                  border: "1px solid #e1e3e5",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)";
                }}
              >
                <div style={{
                  background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
                  padding: "24px 12px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                </div>
                <div style={{ padding: "16px", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "700", fontSize: "14px", color: "#202223" }}>Delivery Rules</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#6d7175", lineHeight: "1.4" }}>
                    Dynamically hide, rename, or sort shipping methods based on cart criteria.
                  </p>
                </div>
              </div>

              {/* Feature 3: Payment Customization */}
              <div
                style={{
                  border: "1px solid #e1e3e5",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)";
                }}
              >
                <div style={{
                  background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
                  padding: "24px 12px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                </div>
                <div style={{ padding: "16px", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "700", fontSize: "14px", color: "#202223" }}>Payment Rules</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#6d7175", lineHeight: "1.4" }}>
                    Control payment methods shown to customers (e.g. disable COD or PayPal).
                  </p>
                </div>
              </div>

              {/* Feature 4: Checkout Checkboxes */}
              <div
                style={{
                  border: "1px solid #e1e3e5",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)";
                }}
              >
                <div style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  padding: "24px 12px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                </div>
                <div style={{ padding: "16px", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "700", fontSize: "14px", color: "#202223" }}>Checkout Checkboxes</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#6d7175", lineHeight: "1.4" }}>
                    Add custom checkboxes for Terms & Conditions, age declaration, or digital waivers.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button primary size="large" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </div>
        ) : step === 2 ? (
          <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", paddingBottom: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: "20px",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "8px"
              }}>
                Free Plan Active
              </div>
              <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1a1a1a", marginBottom: "8px" }}>
                What's included in your Free Plan
              </h1>
              <p style={{ fontSize: "14px", color: "#6d7175" }}>
                You can get started immediately with our core features at zero cost.
              </p>
            </div>

            {/* Features Included List Card */}
            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "5px"
            }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span style={{ fontSize: "14px", color: "#334155" }}>
                    <strong>1 Active Validation Rule</strong> (Basic cart & customer checks)
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span style={{ fontSize: "14px", color: "#334155" }}>
                    Standard delivery & payment rule customization
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span style={{ fontSize: "14px", color: "#334155" }}>
                    Basic support and rule testing mode
                  </span>
                </li>
              </ul>
            </div>

            {/* Note about upgrading */}
            <div style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fef3c7",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p style={{ fontSize: "13px", color: "#b45309", margin: 0, lineHeight: "1.4" }}>
                Need unlimited rules or premium features? You can upgrade your plan anytime from the <strong>Pricing & Plan</strong> option in the menu.
              </p>
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <Button size="large" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button primary size="large" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            textAlign: "center",
            paddingBottom: "32px"
          }}>
            {/* SVG Welcome Illustration */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <div style={{
                background: "#f0fdf4",
                borderRadius: "50%",
                padding: "20px",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)"
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
            </div>

            <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1a1a1a", marginBottom: "8px" }}>
              Welcome to Pro Validation!
            </h1>

            <p style={{ fontSize: "15px", color: "#6d7175", marginBottom: "20px", maxWidth: "420px", marginLeft: "auto", marginRight: "auto", lineHeight: "1.5" }}>
              Let's set up Pro Validation rules. It will take under 1 minute.
            </p>

            {/* Terms Checkbox */}
            <div style={{
              display: "inline-flex",
              textAlign: "left",
              backgroundColor: "#f6f6f7",
              padding: "16px 20px",
              borderRadius: "8px",
              border: "1px solid #e1e3e5",
              marginBottom: "24px",

              alignItems: "center"
            }}>
              <Checkbox
                label={
                  <span style={{ fontSize: "14px", color: "#202223", userSelect: "none" }}>
                    I've read Pro Validation's{" "}
                    <a href="https://example.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#008060", textDecoration: "underline" }} onClick={(e) => e.stopPropagation()}>
                      Terms of service
                    </a>{" "}
                    and I consent to them.
                  </span>
                }
                checked={consent}
                onChange={(val) => setConsent(val)}
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
              <Button size="large" onClick={() => setStep(2)} disabled={completing}>
                Back
              </Button>
              <Button
                primary
                size="large"
                onClick={handleComplete}
                loading={completing}
                disabled={!consent}
              >
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </Modal.Section>
    </Modal>
  );
}
