import '@shopify/ui-extensions/preact';
import { useState } from "preact/hooks";

export function NpsSurvey({ survey, onSubmit, issubmitting }) {
  const [selectedScore, setSelectedScore] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");

  const scores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleSubmit = () => {
    if (selectedScore === null) return;
    onSubmit({
      survey_id: survey.id,
      survey_type: "nps",
      answer_value: String(selectedScore),
      custom_feedback: feedbackText,
    });
  };

  return (
    <s-stack gap="base">
      <s-text size="base" weight="bold">
        {survey.question_text || "How likely are you to recommend us to a friend or colleague?"}
      </s-text>
      {survey.description && (
        <s-text size="small" appearance="subdued">
          {survey.description}
        </s-text>
      )}

      <s-stack gap="tight">
        <s-text size="xsmall" appearance="subdued">
          0 = Extremely Unlikely | 10 = Extremely Likely
        </s-text>
        <s-stack gap="xtight">
          {scores.map((num) => {
            const isSelected = selectedScore === num;
            return (
              <s-button
                key={num}
                type="button"
                variant={isSelected ? "primary" : "secondary"}
                onClick={() => setSelectedScore(num)}
              >
                {String(num)}
              </s-button>
            );
          })}
        </s-stack>
      </s-stack>

      {survey.allow_custom_text !== false && (
        <s-text-field
          label="Written feedback or reason for your score (Optional)"
          value={feedbackText}
          multiline={3}
          onInput={(e) => setFeedbackText(e.target.value)}
          placeholder="Let us know what we did well or what we can improve..."
        />
      )}

      <s-button
        type="button"
        variant="primary"
        disabled={selectedScore === null || issubmitting}
        onClick={handleSubmit}
      >
        {issubmitting ? "Submitting..." : "Submit NPS Feedback"}
      </s-button>
    </s-stack>
  );
}
