import { useState, useEffect, useCallback } from "react";
import { Modal, TextContainer, Banner, List, Link, Text } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

export function OnboardingModal() {
  const shopify = useAppBridge();
  const [isActive, setIsActive] = useState(true); // Assume true initially to prevent flash
  const [isLoading, setIsLoading] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/config/status");
      if (response.ok) {
        const data = await response.json();

        // If it transitions from inactive to active, show the thank you message briefly
        if (data.active && !isActive) {
          setJustActivated(true);
          setTimeout(() => {
            setJustActivated(false);
            setIsActive(true);
          }, 3000);
        } else {
          setIsActive(data.active);
        }
      } else {
        // If the request fails, we assume it's not active to be safe
        // (but log the error)
        console.error("API returned an error status:", response.status);
        const err = await response.json().catch(() => ({}));
        console.error("Error details:", err);
        setIsActive(false);
      }
    } catch (error) {
      console.error("Failed to check status", error);
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [isActive]);

  useEffect(() => {
    // Initial check on mount
    checkStatus();

    // Background check every 15 seconds
    const interval = setInterval(() => {
      checkStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, [checkStatus]);

  if (isActive && !justActivated) {
    return null;
  }

  return (
    <Modal
      open={!isActive || justActivated}
      title="Welcome! Action Required"
      onClose={() => { }} // Cannot be closed manually until activated
      primaryAction={{
        content: "Check Status",
        onAction: checkStatus,
        loading: isLoading,
      }}
    >
      <Modal.Section>
        {justActivated ? (
          <Banner status="success">
            <p>Thank you! Your configuration is complete. You can now use the app.</p>
          </Banner>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Banner status="warning" title="Configuration Required">
              <p>Once config is done, then only this app will work.</p>
            </Banner>

            <TextContainer>
              <p>
                To start using this app, you must manually activate the Checkout Validation rule in your Shopify Admin settings.
              </p>
              <List type="number">
                <List.Item>
                  Go to your <strong>Shopify Admin</strong> -> <strong>Settings</strong> -> <strong>Checkout</strong> -> <strong>Checkout Rules</strong>.
                  <br />

                </List.Item>
                <List.Item>Click <strong>Add Rule</strong>.</List.Item>
                <List.Item>Select this app's validation rule (e.g., <code>cart-checkout-validation</code>) and click <strong>Activate</strong>.</List.Item>
                <List.Item>Come back here and click <strong>Check Status</strong> below.</List.Item>
              </List>
            </TextContainer>
          </div>
        )}
      </Modal.Section>
    </Modal>
  );
}
