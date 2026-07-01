import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import RuleVersions from "../../RuleVersions";

export default function RuleVersionsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  return <RuleVersions ruleId={id} navigate={navigate} />;
}
