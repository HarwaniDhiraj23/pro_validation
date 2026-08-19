import '@shopify/ui-extensions/preact';
import { useState } from "preact/hooks";

export function AttributionSurvey({ survey, onSubmit, issubmitting }) {
  let options = [];
  try {
    const rawOptions = survey.options || survey.discount_config?.options;
    options = Array.isArray(rawOptions)
      ? rawOptions
      : typeof rawOptions === "string"
      ? JSON.parse(rawOptions)
      : ["TikTok", "Instagram", "Google Search", "YouTube", "Friend or Family", "Podcast / Influencer", "Other"];
  } catch (e) {
    options = ["TikTok", "Instagram", "Google Search", "YouTube", "Friend or Family", "Podcast / Influencer", "Other"];
  }

  const [selectedChannel, setSelectedChannel] = useState("");
  const [customText, setCustomText] = useState("");

  const handleSubmit = () => {
    if (!selectedChannel) return;
    const finalAnswer = selectedChannel;
    const finalFeedback = selectedChannel === "Other" ? customText : "";
    onSubmit({
      survey_id: survey.id,
      survey_type: "attribution",
      answer_value: finalAnswer,
      custom_feedback: finalFeedback,
    });
  };

  return (
    <s-stack gap="base">
      <s-text size="base" weight="bold">
        {survey.question_text || "How did you hear about us?"}
      </s-text>
      {survey.description && (
        <s-text size="small" appearance="subdued">
          {survey.description}
        </s-text>
      )}

      <s-stack gap="tight">
        {options.map((opt, idx) => {
          const isSelected = selectedChannel === opt;
          return (
            <s-button
              key={idx}
              type="button"
              variant={isSelected ? "primary" : "secondary"}
              onClick={() => setSelectedChannel(opt)}
            >
              {opt}
            </s-button>
          );
        })}
      </s-stack>

      {survey.allow_custom_text !== false && (
        <s-text-field
          label={selectedChannel === "Other" ? "Please specify how you found us *" : "Additional feedback / note (Optional)"}
          value={customText}
          multiline={2}
          onInput={(e) => setCustomText(e.target.value)}
          placeholder="Enter any additional details or write-in comments..."
        />
      )}

      <s-button
        type="button"
        variant="primary"
        disabled={!selectedChannel || issubmitting}
        onClick={handleSubmit}
      >
        {issubmitting ? "Submitting..." : "Submit Response"}
      </s-button>
    </s-stack>
  );
}
