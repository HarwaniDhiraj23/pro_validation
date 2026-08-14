import '@shopify/ui-extensions/preact';
import { useState, useEffect } from "preact/hooks";

export function CustomInputField({ rule, cartState, showErrors }) {
  const attributeKey = rule.attribute_key || rule.title || "Custom Attribute";
  const fieldType = rule.field_type || "text"; // text, multiline, date, select, checkbox
  const isRequired = !!rule.is_required;
  const label = rule.title || "Custom Information";
  const helpText = rule.guidance_message || "";
  const placeholder = rule.error_message || "";
  const maxLength = rule.max_length ? parseInt(rule.max_length, 10) : undefined;

  // Options for select input type
  let options = [];
  if (fieldType === "select" && Array.isArray(rule.select_options)) {
    options = rule.select_options.map(opt => 
      typeof opt === "string" ? { label: opt, value: opt } : opt
    );
  }

  const [value, setValue] = useState("");

  const handleChange = (newValue) => {
    setValue(newValue);
    if (typeof shopify !== "undefined" && shopify.applyAttributeChange) {
      shopify.applyAttributeChange({
        type: "updateAttribute",
        key: attributeKey,
        value: String(newValue)
      }).catch(err => console.error("[CustomInput] Attribute change error:", err));
    }
  };

  const isInvalid = isRequired && showErrors && !String(value).trim();

  return (
    <s-stack gap="tight">
      {fieldType === "multiline" ? (
        <s-text-field
          label={isRequired ? `${label} *` : label}
          value={value}
          onInput={(e) => handleChange(e.target.value)}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          multiline={3}
          maxlength={maxLength}
          error={isInvalid ? (rule.validation_error_message || `${label} is required.`) : undefined}
        />
      ) : fieldType === "select" ? (
        <s-select
          label={isRequired ? `${label} *` : label}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          error={isInvalid ? (rule.validation_error_message || `${label} is required.`) : undefined}
        >
          <option value="">{placeholder || "-- Select an Option --"}</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>{opt.label}</option>
          ))}
        </s-select>
      ) : fieldType === "checkbox" ? (
        <s-checkbox
          checked={Boolean(value)}
          onChange={(e) => handleChange(e.target.checked)}
        >
          {isRequired ? `${label} *` : label}
        </s-checkbox>
      ) : fieldType === "date" ? (
        <s-text-field
          type="date"
          label={isRequired ? `${label} *` : label}
          value={value}
          onInput={(e) => handleChange(e.target.value)}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          error={isInvalid ? (rule.validation_error_message || `${label} is required.`) : undefined}
        />
      ) : (
        <s-text-field
          label={isRequired ? `${label} *` : label}
          value={value}
          onInput={(e) => handleChange(e.target.value)}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          maxlength={maxLength}
          error={isInvalid ? (rule.validation_error_message || `${label} is required.`) : undefined}
        />
      )}
      {helpText && (
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
          {helpText}
        </div>
      )}
    </s-stack>
  );
}
