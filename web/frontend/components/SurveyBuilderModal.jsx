import React, { useState, useEffect } from "react";
import {
  Modal,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Banner,
  Box,
  Text,
  Badge,
} from "@shopify/polaris";

export function SurveyBuilderModal({ open, onClose, onSave, survey = null, saving = false }) {
  const [title, setTitle] = useState("");
  const [surveyType, setSurveyType] = useState("attribution");
  const [questionText, setQuestionText] = useState("");
  const [description, setDescription] = useState("");
  const [optionsText, setOptionsText] = useState("TikTok, Instagram, Google Search, YouTube, Friend or Family, Podcast / Influencer, Other");
  const [allowCustomText, setAllowCustomText] = useState(true);
  const [status, setStatus] = useState("active");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (survey) {
      setTitle(survey.title || "");
      setSurveyType(survey.survey_type || "attribution");
      setQuestionText(survey.question_text || "");
      setDescription(survey.description || "");

      let opts = survey.options;
      if (typeof opts === "string") {
        try { opts = JSON.parse(opts); } catch (e) {}
      }
      if (Array.isArray(opts)) {
        setOptionsText(opts.join(", "));
      } else {
        setOptionsText("TikTok, Instagram, Google Search, YouTube, Friend or Family, Podcast / Influencer, Other");
      }

      setAllowCustomText(survey.allow_custom_text !== false);
      setStatus(survey.status || "active");
    } else {
      setTitle("Post-Purchase Attribution Survey");
      setSurveyType("attribution");
      setQuestionText("How did you hear about us?");
      setDescription("Help us understand which channel brought you to our store.");
      setOptionsText("TikTok, Instagram, Google Search, YouTube, Friend or Family, Podcast / Influencer, Other");
      setAllowCustomText(true);
      setStatus("active");
    }
  }, [survey, open]);

  const handleSurveyTypeChange = (newType) => {
    setSurveyType(newType);
    if (newType === "attribution") {
      setTitle("Post-Purchase Attribution Survey");
      setQuestionText("How did you hear about us?");
      setOptionsText("TikTok, Instagram, Google Search, YouTube, Friend or Family, Podcast / Influencer, Other");
    } else if (newType === "nps") {
      setTitle("Net Promoter Score (NPS 0-10)");
      setQuestionText("How likely are you to recommend us to a friend or colleague?");
      setDescription("Score from 0 (Extremely Unlikely) to 10 (Extremely Likely)");
    } else if (newType === "rating") {
      setTitle("Shopping Experience Rating (1-5 Stars)");
      setQuestionText("How was your overall checkout & shopping experience?");
    } else if (newType === "feedback") {
      setTitle("Customer Feedback & Ideas");
      setQuestionText("What could we improve to make your experience even better?");
    }
  };

  const handleSave = () => {
    if (!title.trim() || !questionText.trim()) {
      setErrorMsg("Survey Title and Question Text are required.");
      return;
    }
    setErrorMsg("");

    const parsedOptions = surveyType === "attribution"
      ? optionsText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    onSave({
      id: survey?.id,
      title: title.trim(),
      survey_type: surveyType,
      question_text: questionText.trim(),
      description: description.trim(),
      options: parsedOptions,
      allow_custom_text: allowCustomText,
      status,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={survey ? "Edit Survey Configuration" : "Create Post-Purchase Survey"}
      primaryAction={{
        content: saving ? "Saving..." : "Save & Sync Survey",
        onAction: handleSave,
        disabled: saving,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        {errorMsg && (
          <Box paddingBottom="400">
            <Banner tone="critical">{errorMsg}</Banner>
          </Box>
        )}

        <FormLayout>
          <Select
            label="Survey Category / Format"
            options={[
              { label: "Attribution Survey (HDYHAU Options)", value: "attribution" },
              { label: "Net Promoter Score (NPS 0-10 Scale)", value: "nps" },
              { label: "CSAT & Rating Scale (1-5 Stars)", value: "rating" },
              { label: "Feedback & Suggestions Form", value: "feedback" },
            ]}
            value={surveyType}
            onChange={handleSurveyTypeChange}
            helpText="Select the display format rendered on the post-payment page."
          />

          <TextField
            label="Survey Title (Internal & Header)"
            value={title}
            onChange={setTitle}
            autoComplete="off"
            placeholder="e.g. How Did You Hear About Us?"
          />

          <TextField
            label="Buyer Prompt Question"
            value={questionText}
            onChange={setQuestionText}
            autoComplete="off"
            placeholder="e.g. How did you hear about our brand today?"
          />

          <TextField
            label="Subtext / Guidance (Optional)"
            value={description}
            onChange={setDescription}
            autoComplete="off"
            placeholder="e.g. Select the channel that brought you to us"
          />

          {surveyType === "attribution" && (
            <TextField
              label="Attribution Channels / Options (Comma-Separated)"
              value={optionsText}
              onChange={setOptionsText}
              multiline={2}
              autoComplete="off"
              helpText="Provide options buyers can pick from. (e.g. TikTok, Instagram, Search, YouTube, Other)"
            />
          )}

          <Checkbox
            label="Allow Custom Write-In / Follow-up Feedback Text"
            checked={allowCustomText}
            onChange={setAllowCustomText}
            helpText="Enables buyers to provide open-ended text explanations alongside their rating or choice."
          />

          <Select
            label="Survey Status"
            options={[
              { label: "Active (Enabled on Post-Purchase Page)", value: "active" },
              { label: "Draft / Inactive", value: "draft" },
            ]}
            value={status}
            onChange={setStatus}
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}
