import '@shopify/ui-extensions/preact';
import { useState } from "preact/hooks";

export function RatingScaleSurvey({ survey, onSubmit, issubmitting }) {
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState("");

  const ratingOptions = [
    { value: 1, label: "⭐ (1/5 - Poor)" },
    { value: 2, label: "⭐⭐ (2/5 - Fair)" },
    { value: 3, label: "⭐⭐⭐ (3/5 - Good)" },
    { value: 4, label: "⭐⭐⭐⭐ (4/5 - Great)" },
    { value: 5, label: "⭐⭐⭐⭐⭐ (5/5 - Excellent!)" },
  ];

  const handleSubmit = () => {
    if (!rating) return;
    onSubmit({
      survey_id: survey.id,
      survey_type: survey.survey_type || "rating",
      answer_value: String(rating),
      custom_feedback: feedback,
    });
  };

  return (
    <s-stack gap="base">
      <s-text size="base" weight="bold">
        {survey.question_text || "How was your overall experience?"}
      </s-text>
      {survey.description && (
        <s-text size="small" appearance="subdued">
          {survey.description}
        </s-text>
      )}

      <s-stack gap="tight">
        {ratingOptions.map((opt) => {
          const isSelected = rating === opt.value;
          return (
            <s-button
              key={opt.value}
              type="button"
              variant={isSelected ? "primary" : "secondary"}
              onClick={() => setRating(opt.value)}
            >
              {opt.label}
            </s-button>
          );
        })}
      </s-stack>

      {survey.allow_custom_text !== false && (
        <s-text-field
          label="Written review or comments (Optional)"
          value={feedback}
          multiline={3}
          onInput={(e) => setFeedback(e.target.value)}
          placeholder="Tell us what you liked or how we can improve..."
        />
      )}

      <s-button
        type="button"
        variant="primary"
        disabled={!rating || issubmitting}
        onClick={handleSubmit}
      >
        {issubmitting ? "Submitting..." : "Submit Rating"}
      </s-button>
    </s-stack>
  );
}
