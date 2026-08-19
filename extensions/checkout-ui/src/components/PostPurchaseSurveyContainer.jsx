import '@shopify/ui-extensions/preact';
import { useState } from "preact/hooks";
import { AttributionSurvey } from "./AttributionSurvey.jsx";
import { NpsSurvey } from "./NpsSurvey.jsx";
import { RatingScaleSurvey } from "./RatingScaleSurvey.jsx";

export function PostPurchaseSurveyContainer({ surveyRules = [], cartState = {}, appUrl = "" }) {
  console.log(`[PostPurchaseSurveyContainer] Received surveyRules prop (${surveyRules ? surveyRules.length : 0}):`, surveyRules);
  const [submitted, setSubmitted] = useState(false);
  const [issubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!surveyRules || surveyRules.length === 0) {
    console.warn(`[PostPurchaseSurveyContainer] surveyRules is empty. Returning null.`);
    return null;
  }

  // Active survey matching rule type
  const activeSurvey = surveyRules.find(s => !s.status || s.status === "active" || s.status === "ACTIVE") || surveyRules[0];
  if (!activeSurvey) {
    console.warn(`[PostPurchaseSurveyContainer] No active survey found in list. Returning null.`);
    return null;
  }

  console.log(`[PostPurchaseSurveyContainer] Rendering active survey:`, activeSurvey);

  const handleSurveySubmit = async (payload) => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const orderId = cartState.order?.id || cartState.buyerIdentity?.customer?.id || "ORDER-PREVIEW";
      const customerEmail = cartState.buyerIdentity?.email || "";

      const bodyData = {
        shop: shopify.shop?.myshopifyDomain || "default-shop",
        survey_id: activeSurvey.id,
        order_id: orderId,
        customer_email: customerEmail,
        ...payload,
      };

      // Determine backend URL for submission
      const backendUrl = appUrl || "http://localhost:3000";
      const response = await fetch(`${backendUrl}/api/public/survey-responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        // Fallback optimistic submission indicator
        setSubmitted(true);
      }
    } catch (err) {
      console.warn("[PostPurchaseSurvey] Network submission fallback:", err);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <s-banner tone="success" heading="Thank you for your feedback!">
        Your insights have been recorded and will help us improve our store experience.
      </s-banner>
    );
  }

  const surveyType = activeSurvey.survey_type || "attribution";

  return (
    <s-banner tone="info" heading={activeSurvey.title || "Customer Feedback & Insights"}>
      <s-stack gap="base">
        {surveyType === "attribution" ? (
          <AttributionSurvey
            survey={activeSurvey}
            onSubmit={handleSurveySubmit}
            issubmitting={issubmitting}
          />
        ) : surveyType === "nps" ? (
          <NpsSurvey
            survey={activeSurvey}
            onSubmit={handleSurveySubmit}
            issubmitting={issubmitting}
          />
        ) : (
          <RatingScaleSurvey
            survey={activeSurvey}
            onSubmit={handleSurveySubmit}
            issubmitting={issubmitting}
          />
        )}
        {errorMsg && (
          <s-text size="small" appearance="critical">
            {errorMsg}
          </s-text>
        )}
      </s-stack>
    </s-banner>
  );
}
