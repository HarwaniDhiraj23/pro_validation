import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import RuleBuilder from "../RuleBuilder";

export default function RuleBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  return <RuleBuilder ruleId={id} navigate={navigate} />;
}
