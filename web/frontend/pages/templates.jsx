import React from "react";
import { useNavigate } from "react-router-dom";
import RuleTemplates from "./RuleTemplates";

export default function TemplatesPage() {
  const navigate = useNavigate();
  return <RuleTemplates navigate={navigate} />;
}
