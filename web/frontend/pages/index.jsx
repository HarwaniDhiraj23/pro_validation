import React from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";

export default function HomePage() {
  const navigate = useNavigate();
  return <Dashboard navigate={navigate} />;
}
