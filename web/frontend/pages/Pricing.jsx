import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Text,
  Box,
  Badge,
  Button,
  ProgressBar,
  Banner,
  HorizontalStack,
  VerticalStack,
  Spinner,
  Modal,
  Divider
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function Pricing({ navigate: propNavigate }) {
  const shopify = useAppBridge();
  const routerNavigate = useNavigate();
  const navigate = propNavigate || routerNavigate;

  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState(null);
  const [submittingPlan, setSubmittingPlan] = useState(null);
  const [modalPlan, setModalPlan] = useState(null);
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/billing/plan");
      const data = await res.json();
      if (data.success) {
        setPlanData(data);
      } else {
        shopify?.toast?.show("Failed to fetch plan details", { isError: true });
      }
    } catch (err) {
      console.error("Error fetching plan:", err);
      shopify?.toast?.show("Error loading pricing details", { isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanDetails();

    const urlParams = new URLSearchParams(window.location.search);
    const billingStatus = urlParams.get("billing_status");
    const planParam = urlParams.get("plan");

    if (billingStatus === "success" && planParam) {
      setSuccessBanner(`Congratulations! Your store is now active on the ${planParam} plan.`);
      shopify?.toast?.show(`Upgraded to ${planParam} plan successfully!`);
    }
  }, []);

  const handleSubscribe = async (planName) => {
    try {
      setSubmittingPlan(planName);
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planName })
      });
      const data = await res.json();

      if (!data.success) {
        shopify?.toast?.show(data.message || "Subscription update failed.", { isError: true });
        setSubmittingPlan(null);
        return;
      }

      if (data.confirmationUrl) {
        shopify?.toast?.show(`Redirecting to Shopify Billing...`);
        if (window.top) {
          window.top.location.href = data.confirmationUrl;
        } else {
          window.location.href = data.confirmationUrl;
        }
      } else {
        shopify?.toast?.show(data.message || "Plan updated successfully!");
        setModalPlan(null);
        setDowngradeModalOpen(false);
        fetchPlanDetails();
      }
    } catch (err) {
      console.error("Subscription request error:", err);
      shopify?.toast?.show("An error occurred while updating subscription.", { isError: true });
    } finally {
      setSubmittingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setSubmittingPlan("Free");
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();

      if (data.success) {
        shopify?.toast?.show("Subscription cancelled. Downgraded to Free plan.");
        setDowngradeModalOpen(false);
        fetchPlanDetails();
      } else {
        shopify?.toast?.show(data.message || "Failed to cancel subscription.", { isError: true });
      }
    } catch (err) {
      console.error("Cancel subscription error:", err);
      shopify?.toast?.show("Error cancelling subscription.", { isError: true });
    } finally {
      setSubmittingPlan(null);
    }
  };

  if (loading) {
    return (
      <Page 
        title="Pricing & Plan Management"
        backAction={{ content: "Dashboard", onAction: () => navigate("/") }}
      >
        <Box padding="800">
          <HorizontalStack align="center">
            <Spinner size="large" />
          </HorizontalStack>
        </Box>
      </Page>
    );
  }

  const currentPlanName = planData?.plan?.name || "Free";
  const activeCount = planData?.usage?.activeRulesCount || 0;
  const maxRules = planData?.usage?.maxActiveRules === Infinity || planData?.usage?.maxActiveRules > 1000
    ? "Unlimited"
    : planData?.usage?.maxActiveRules || 1;
  const usagePercentage = planData?.usage?.usagePercentage || 0;

  const plans = [
    {
      name: "Free",
      price: "$0",
      trial: "Always Free",
      target: "Early-stage stores & testing",
      type: "free",
      features: [
        "1 Active Validation Rule",
        "Essential Cart Validation (PO Box, Min/Max Value)",
        "5 Pre-built Rule Templates",
        "Standard Error Target Options",
        "7 Days Analytics Retention"
      ]
    },
    {
      name: "Basic",
      price: "$9",
      trial: "7 Days Free Trial",
      target: "Growing stores customizing checkout",
      type: "basic",
      features: [
        "Up to 5 Active Rules",
        "Delivery Customizations (Hide/Rename Shipping)",
        "15+ Pre-built Templates",
        "State, Zip Code & Country Address Filters",
        "Up to 3 Rule Version History",
        "30 Days Analytics Retention",
        "Standard Email Support"
      ]
    },
    {
      name: "Growth",
      price: "$29",
      trial: "7 Days Free Trial",
      target: "Scaling stores requiring full controls",
      recommended: true,
      type: "growth",
      features: [
        "Up to 20 Active Rules",
        "Payment & Checkbox Customizations",
        "Advanced Conditions (B2B, Subscriptions, Hazardous)",
        "Rule Scheduling (Start & End dates)",
        "Up to 10 Rule Version History",
        "90 Days Analytics Retention",
        "Priority Email Support"
      ]
    },
    {
      name: "Pro",
      price: "$79",
      trial: "14 Days Free Trial",
      target: "High-volume enterprises & multi-store brands",
      type: "pro",
      features: [
        "Unlimited Active Rules",
        "All Customizations & Advanced Rule Types",
        "Multi-Store Sync across stores",
        "Unlimited Version History & Instant Rollback",
        "Unlimited Analytics Retention",
        "Dedicated VIP Support & Custom Rules Setup"
      ]
    }
  ];

  return (
    <Page
      title="Pricing & Plan Management"
      subtitle="Choose the right subscription tier to protect revenue, streamline checkout, and scale validation rules."
      backAction={{ content: "Dashboard", onAction: () => navigate("/") }}
      primaryAction={{
        content: "Back to Dashboard",
        onAction: () => navigate("/")
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .pricing-wrap {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #111827;
        }

        /* Top Status Banner Card */
        .status-banner-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
        }
        .status-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .status-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .plan-badge-tag {
          background: #dcfce7;
          color: #166534;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 50px;
          border: 1px solid #bbf7d0;
          text-transform: uppercase;
        }
        .plan-badge-tag.free {
          background: #f3f4f6;
          color: #4b5563;
          border-color: #e5e7eb;
        }
        .plan-badge-tag.basic {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }
        .plan-badge-tag.pro {
          background: #eee4ff;
          color: #5b21b6;
          border-color: #ddd6fe;
        }

        /* 4 Cards Grid */
        .plan-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 1200px) {
          .plan-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .plan-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Tier Card */
        .plan-card-item {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
          position: relative;
        }
        .plan-card-item:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
          border-color: #d1d5db;
        }

        .plan-card-item.growth-featured {
          border: 2px solid #008060;
          box-shadow: 0 8px 24px -4px rgba(0, 128, 96, 0.15);
        }

        .plan-card-item.pro-featured {
          border: 2px solid #6366f1;
        }

        .popular-pill-badge {
          position: absolute;
          top: -12px;
          right: 20px;
          background: #008060;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 50px;
          box-shadow: 0 2px 6px rgba(0, 128, 96, 0.3);
        }

        .card-plan-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .card-plan-desc {
          font-size: 13px;
          color: #6b7280;
          min-height: 36px;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .card-price-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 8px;
        }
        .card-big-price {
          font-size: 36px;
          font-weight: 800;
          color: #111827;
          line-height: 1;
        }
        .card-price-month {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .card-trial-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
          background: #f3f4f6;
          padding: 3px 8px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .card-divider {
          height: 1px;
          background: #f3f4f6;
          margin-bottom: 16px;
        }

        .card-feature-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }
        .card-feature-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: #374151;
          line-height: 1.4;
        }
        .check-green-icon {
          color: #008060;
          font-weight: 800;
          font-size: 14px;
          flex-shrink: 0;
          line-height: 1.2;
        }

        /* Buttons matching RulesList primary green style */
        .btn-action-primary {
          width: 100%;
          background: #008060;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid #008060;
          cursor: pointer;
          transition: background 0.15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .btn-action-primary:hover {
          background: #006e52;
          border-color: #006e52;
        }
        .btn-action-secondary {
          width: 100%;
          background: #ffffff;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .btn-action-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        .btn-action-disabled {
          width: 100%;
          background: #f3f4f6;
          color: #9ca3af;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          cursor: default;
        }
      `}</style>

      <div className="pricing-wrap">
        <Layout>
          {successBanner && (
            <Layout.Section>
              <Banner status="success" onDismiss={() => setSuccessBanner(null)}>
                <Text as="p" variant="bodyMd">{successBanner}</Text>
              </Banner>
            </Layout.Section>
          )}

          {/* 4 Tier Cards Grid */}
          <Layout.Section>
            <div className="plan-cards-grid">
              {plans.map((p) => {
                const isCurrent = currentPlanName === p.name;
                const isGrowth = p.type === "growth";
                const isPro = p.type === "pro";

                return (
                  <div
                    key={p.name}
                    className={`plan-card-item ${isGrowth ? "growth-featured" : isPro ? "pro-featured" : ""}`}
                  >
                    {isGrowth && <div className="popular-pill-badge">⭐ MOST POPULAR</div>}

                    <div>
                      <div className="card-plan-title">{p.name}</div>
                      <div className="card-plan-desc">{p.target}</div>

                      <div className="card-price-row">
                        <span className="card-big-price">{p.price}</span>
                        <span className="card-price-month">/ month</span>
                      </div>

                      <div>
                        <span className="card-trial-tag">{p.trial}</span>
                      </div>

                      <div className="card-divider" />

                      <div className="card-feature-list">
                        {p.features.map((feat, idx) => (
                          <div key={idx} className="card-feature-row">
                            <span className="check-green-icon">✓</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Box paddingBlockStart="300">
                      {isCurrent ? (
                        <button className="btn-action-disabled" disabled>
                          Current Plan
                        </button>
                      ) : p.name === "Free" ? (
                        <button
                          className="btn-action-secondary"
                          disabled={submittingPlan === "Free"}
                          onClick={() => setDowngradeModalOpen(true)}
                        >
                          Downgrade to Free
                        </button>
                      ) : (
                        <button
                          className={isGrowth ? "btn-action-primary" : "btn-action-secondary"}
                          disabled={submittingPlan === p.name}
                          onClick={() => setModalPlan(p)}
                        >
                          {submittingPlan === p.name
                            ? "Processing..."
                            : currentPlanName === "Pro" || (currentPlanName === "Growth" && p.name === "Basic")
                            ? `Switch to ${p.name}`
                            : `Upgrade to ${p.name}`}
                        </button>
                      )}
                    </Box>
                  </div>
                );
              })}
            </div>
          </Layout.Section>
        </Layout>

        {/* Upgrade Confirmation Modal */}
        {modalPlan && (
          <Modal
            open={Boolean(modalPlan)}
            onClose={() => setModalPlan(null)}
            title={`Subscribe to ${modalPlan.name} Plan`}
            primaryAction={{
              content: `Approve Subscription (${modalPlan.price}/mo)`,
              loading: submittingPlan === modalPlan.name,
              onClick: () => handleSubscribe(modalPlan.name)
            }}
            secondaryActions={[
              {
                content: "Cancel",
                onClick: () => setModalPlan(null)
              }
            ]}
          >
            <Modal.Section>
              <VerticalStack gap="400">
                <Banner status="info">
                  <Text as="p" variant="bodyMd">
                    You are upgrading to the <strong>{modalPlan.name} Plan</strong> for <strong>{modalPlan.price} / month</strong> with <strong>{modalPlan.trial}</strong>.
                  </Text>
                </Banner>
                <Text variant="bodyMd" as="p">
                  You will be redirected to Shopify Admin to approve the monthly recurring charge on your official store invoice. You can modify or cancel anytime.
                </Text>
              </VerticalStack>
            </Modal.Section>
          </Modal>
        )}

        {/* Downgrade Confirmation Modal */}
        {downgradeModalOpen && (
          <Modal
            open={downgradeModalOpen}
            onClose={() => setDowngradeModalOpen(false)}
            title="Confirm Downgrade to Free Plan"
            primaryAction={{
              content: "Confirm Downgrade to Free",
              destructive: true,
              loading: submittingPlan === "Free",
              onClick: handleCancelSubscription
            }}
            secondaryActions={[
              {
                content: "Keep Current Plan",
                onClick: () => setDowngradeModalOpen(false)
              }
            ]}
          >
            <Modal.Section>
              <VerticalStack gap="400">
                <Banner status="warning">
                  <Text as="p" variant="bodyMd">
                    Are you sure you want to cancel your subscription and revert to the Free Plan?
                  </Text>
                </Banner>
                <Text variant="bodyMd" as="p">
                  The Free plan limits your store to <strong>1 active validation rule</strong>. Any additional active rules or delivery/payment customizers will stop executing.
                </Text>
              </VerticalStack>
            </Modal.Section>
          </Modal>
        )}
      </div>
    </Page>
  );
}
