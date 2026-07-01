import React from "react";
import { useNavigate } from "react-router-dom";
import RulesList from "../RulesList";

export default function RulesPage() {
  const navigate = useNavigate();
  return <RulesList navigate={navigate} />;
}
