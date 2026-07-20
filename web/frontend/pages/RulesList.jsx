import React, { useState, useEffect } from "react";
import { Page, Card, Box, HorizontalStack, VerticalStack, Button, Checkbox, Text, Spinner, Badge, TextField } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { formatConditionType } from "../utils/utils";

export default function RulesList({ navigate }) {
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [togglingRuleId, setTogglingRuleId] = useState(null);
  const [bulkToggling, setBulkToggling] = useState(null);

  // Get unique stores from rules to populate store filter options
  const uniqueStores = [...new Set(rules.map(r => r.target_shop).filter(Boolean))];

  const filteredRules = rules.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.error_message && r.error_message.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesPriority = filterPriority === "all" || String(r.priority || 0) === filterPriority;
    const matchesStore = filterStore === "all" ||
      (filterStore === "global" && !r.target_shop) ||
      (r.target_shop === filterStore);
    const matchesType = filterType === "all" || r.rule_type === filterType;

    return matchesSearch && matchesStatus && matchesPriority && matchesStore && matchesType;
  });

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      setRules(data);
    } catch (e) {
      shopify.toast.show("Error fetching rules", { isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleSelectRule = (id, checked) => {
    setSelectedIds(checked ? [...selectedIds, id] : selectedIds.filter(item => item !== id));
  };

  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? rules.map(r => r.id) : []);
  };

  const handleBulkToggle = async (status) => {
    if (selectedIds.length === 0) return;
    setBulkToggling(status);
    try {
      const res = await fetch("/api/rules/bulk-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status })
      });
      if (res.ok) {
        shopify.toast.show(`Rules updated to ${status}`);
        setSelectedIds([]);
        await fetchRules();
      } else {
        const errorData = await res.json();
        shopify.toast.show(errorData.error || "Bulk update failed", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Bulk operation failed", { isError: true });
    } finally {
      setBulkToggling(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} rules?`)) return;
    try {
      const res = await fetch("/api/rules/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        shopify.toast.show("Rules deleted");
        setSelectedIds([]);
        fetchRules();
      }
    } catch (e) {
      shopify.toast.show("Bulk delete failed", { isError: true });
    }
  };

  const handleToggleSingle = async (rule) => {
    setTogglingRuleId(rule.id);
    const nextStatus = rule.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, status: nextStatus })
      });
      if (res.ok) {
        shopify.toast.show(`Rule ${nextStatus === "active" ? "activated" : "deactivated"}`);
        await fetchRules();
      } else {
        const errorData = await res.json();
        shopify.toast.show(errorData.error || "Update failed", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Update failed", { isError: true });
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handlePriorityChange = async (rule, increment) => {
    const nextPriority = Math.max(0, (rule.priority || 0) + (increment ? 1 : -1));
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, priority: nextPriority })
      });
      if (res.ok) fetchRules();
    } catch (e) {
      shopify.toast.show("Priority update failed", { isError: true });
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!confirm("Delete this rule?")) return;
    try {
      const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        shopify.toast.show("Rule deleted");
        fetchRules();
      }
    } catch (e) {
      shopify.toast.show("Delete failed", { isError: true });
    }
  };

  if (loading) {
    return (
      <Page title="Rules Management">
        <HorizontalStack align="center">
          <Spinner size="large" />
        </HorizontalStack>
      </Page>
    );
  }

  return (
    <Page
      title="Validation Rules"
      subtitle="Configure rules that prevent checkout based on cart attributes."
      backAction={{ content: "Dashboard", onAction: () => navigate("/") }}
      primaryAction={{ content: "＋ Create Rule", onAction: () => navigate("/rules/new") }}
      secondaryActions={[
        { content: "Pre-built Rules", onAction: () => navigate("/templates") },
        { content: "＋ Create Checkbox Rule", onAction: () => navigate("/rules/new?type=checkbox&fixed=true") },
      ]}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Force individual header action buttons to stay inline and hide 'More actions' rollup dropdown */
        div[class*="Rollup"], div[class*="rollup"],
        button[class*="Rollup"], button[class*="rollup"],
        .Polaris-Page-Header__Rollup, .Polaris-Page-Header__RollupActions {
          display: none !important;
        }
        div[class*="IndividualActions"], div[class*="individualActions"],
        .Polaris-Page-Header__IndividualActions {
          display: flex !important;
          visibility: visible !important;
          align-items: center !important;
          gap: 8px !important;
        }

        /* Style the '＋ Create Checkbox Rule' button as a primary green button */
        .Polaris-Page-Header__SecondaryActions > *:nth-child(2) button,
        .Polaris-Page-Header__SecondaryActions > *:nth-child(2) a,
        .Polaris-Page-Header__IndividualActions > *:nth-child(2) button,
        .Polaris-Page-Header__IndividualActions > *:nth-child(2) a,
        div[class*="IndividualActions"] > *:nth-child(2) button,
        div[class*="IndividualActions"] > *:nth-child(2) a,
        .Polaris-Header-Action:nth-child(2) button,
        .Polaris-Header-Action:nth-child(2) a {
          background: #008060 !important;
          background-color: #008060 !important;
          color: #ffffff !important;
          border-color: #008060 !important;
          font-weight: 600 !important;
          border-radius: 6px !important;
          padding: 6px 12px !important;
          box-shadow: 0 1px 0 rgba(0,0,0,.05) !important;
        }
        .Polaris-Page-Header__SecondaryActions > *:nth-child(2) button *,
        .Polaris-Page-Header__SecondaryActions > *:nth-child(2) a *,
        .Polaris-Page-Header__IndividualActions > *:nth-child(2) button *,
        .Polaris-Page-Header__IndividualActions > *:nth-child(2) a *,
        div[class*="IndividualActions"] > *:nth-child(2) button *,
        div[class*="IndividualActions"] > *:nth-child(2) a *,
        .Polaris-Header-Action:nth-child(2) button *,
        .Polaris-Header-Action:nth-child(2) a * {
          color: #ffffff !important;
        }
        .Polaris-Page-Header__SecondaryActions > *:nth-child(2) button:hover,
        .Polaris-Page-Header__SecondaryActions > *:nth-child(2) a:hover,
        .Polaris-Page-Header__IndividualActions > *:nth-child(2) button:hover,
        .Polaris-Page-Header__IndividualActions > *:nth-child(2) a:hover,
        div[class*="IndividualActions"] > *:nth-child(2) button:hover,
        div[class*="IndividualActions"] > *:nth-child(2) a:hover,
        .Polaris-Header-Action:nth-child(2) button:hover,
        .Polaris-Header-Action:nth-child(2) a:hover {
          background: #006e52 !important;
          background-color: #006e52 !important;
          border-color: #006e52 !important;
          color: #ffffff !important;
        }

        .rl-wrap { font-family: 'Inter', sans-serif; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .tiny-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(0,0,0,0.15);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Bulk bar */
        .bulk-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0f4ff;
          border: 1px solid #c7d2fe;
          border-radius: 10px;
          padding: 10px 16px;
          margin-bottom: 16px;
        }
        .bulk-bar-label { font-size: 13px; font-weight: 600; color: #4338ca; }
        .bulk-btn {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .bulk-btn.green { background: #dcfce7; color: #166534; border-color: #86efac; }
        .bulk-btn.green:hover { background: #bbf7d0; }
        .bulk-btn.gray { background: #f3f4f6; color: #374151; border-color: #d1d5db; }
        .bulk-btn.gray:hover { background: #e5e7eb; }
        .bulk-btn.red { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
        .bulk-btn.red:hover { background: #fecaca; }

        /* Header row */
        .rl-header {
          display: flex;
          align-items: center;
          padding: 10px 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 10px 10px 0 0;
        }
        .rl-header-hint { font-size: 12px; color: #9ca3af; margin-left: auto; }

        /* Rule card */
        .rl-card {
          display: grid;
          grid-template-columns: 36px 1fr auto;
          align-items: center;
          gap: 20px;
          padding: 18px 20px;
          border-bottom: 1px solid #f3f4f6;
          background: #fff;
          transition: background 0.15s;
        }
        .rl-card:last-child { border-bottom: none; border-radius: 0 0 10px 10px; }
        .rl-card:hover { background: #fafbff; }
        .rl-card.selected { background: #f5f3ff; }

        /* Info section */
        .rl-info { flex: 1; min-width: 0; }
        .rl-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .status-pill.active { background: #dcfce7; color: #15803d; }
        .status-pill.inactive { background: #fef3c7; color: #92400e; }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .priority-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          background: #e0e7ff;
          color: #3730a3;
        }
        .version-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .rl-meta {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rl-conds {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 6px;
        }
        .cond-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: #f8fafc;
          color: #334155;
          border: 1px solid #e2e8f0;
          transition: all 0.15s ease;
        }
        .cond-tag:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .cond-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 8px;
          margin-bottom: 4px;
        }
        /* Priority adjuster */
        .priority-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 3px 8px;
          flex-shrink: 0;
        }
        .prio-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #4b5563;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          transition: all 0.1s;
          padding: 0;
          line-height: 1;
        }
        .prio-btn:hover {
          background: #e5e7eb;
          color: #111827;
        }
        .prio-num {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          min-width: 16px;
          text-align: center;
          line-height: 1;
        }
        /* Action buttons */
        .rl-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          flex-wrap: nowrap;
        }
        .act-btn {
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .act-btn.toggle-on  { background: #fff; border-color: #d1d5db; color: #374151; }
        .act-btn.toggle-on:hover  { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
        .act-btn.toggle-off { background: #fff; border-color: #d1d5db; color: #374151; }
        .act-btn.toggle-off:hover { background: #f0fdf4; border-color: #86efac; color: #16a34a; }
        .act-btn.ver { background: #fff; border-color: #d1d5db; color: #374151; }
        .act-btn.ver:hover { background: #f5f3ff; border-color: #c4b5fd; color: #7c3aed; }
        .act-btn.edit { background: #3b82f6; border-color: #3b82f6; color: #fff; }
        .act-btn.edit:hover { background: #2563eb; border-color: #2563eb; }
        .act-btn.del { background: #fff; border-color: #d1d5db; color: #374151; }
        .act-btn.del:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-title { font-size: 17px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .empty-sub { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }
        .empty-btns { display: flex; justify-content: center; gap: 10px; }
        .empty-btn-primary {
          padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
          background: #3b82f6; color: #fff; border: none; cursor: pointer;
        }
        .empty-btn-primary:hover { background: #2563eb; }
        .empty-btn-sec {
          padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
          background: #fff; color: #374151; border: 1px solid #d1d5db; cursor: pointer;
        }
        .empty-btn-sec:hover { background: #f3f4f6; }
      `}</style>

      <div className="rl-wrap">
        {/* Search & Multiple Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div>
            <TextField
              label="Search rules"
              labelHidden
              placeholder="Search rules by title or error message..."
              value={searchQuery}
              onChange={setSearchQuery}
              autoComplete="off"
            />
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {/* Status Filter */}
            <div style={{ flex: 1, minWidth: "120px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  fontSize: "13px",
                  color: "#1e293b",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div style={{ flex: 1, minWidth: "120px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  fontSize: "13px",
                  color: "#1e293b",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">All Priorities</option>
                {[...new Set(rules.map(r => r.priority || 0))].sort((a, b) => b - a).map(prio => (
                  <option key={prio} value={String(prio)}>Priority P{prio}</option>
                ))}
              </select>
            </div>

            {/* Store (target_shop) Filter */}
            <div style={{ flex: 1.5, minWidth: "180px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Store</label>
              <select
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  fontSize: "13px",
                  color: "#1e293b",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">All Stores</option>
                <option value="global">Global (All Stores)</option>
                {uniqueStores.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
            </div>

            {/* Rule Type Filter */}
            <div style={{ flex: 1.5, minWidth: "180px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Rule Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  fontSize: "13px",
                  color: "#1e293b",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">All Rule Types</option>
                <option value="validation">Checkout Validation</option>
                <option value="checkbox">Checkout Checkbox</option>
                <option value="delivery">Delivery Customization</option>
                <option value="payment">Payment Customization</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bulk-bar">
            <span className="bulk-bar-label">✓ {selectedIds.length} rule{selectedIds.length > 1 ? "s" : ""} selected</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="bulk-btn green"
                onClick={() => handleBulkToggle("active")}
                disabled={bulkToggling === "active"}
                style={{ opacity: bulkToggling === "active" ? 0.7 : 1 }}
              >
                {bulkToggling === "active" ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="tiny-spinner" /> Activating...
                  </span>
                ) : "Activate All"}
              </button>
              <button
                className="bulk-btn gray"
                onClick={() => handleBulkToggle("inactive")}
                disabled={bulkToggling === "inactive"}
                style={{ opacity: bulkToggling === "inactive" ? 0.7 : 1 }}
              >
                {bulkToggling === "inactive" ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="tiny-spinner" /> Deactivating...
                  </span>
                ) : "Deactivate All"}
              </button>
              <button className="bulk-btn red" onClick={handleBulkDelete}>Delete All</button>
            </div>
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {/* Header row */}
          <div className="rl-header">
            <Checkbox
              label="Select all"
              checked={rules.length > 0 && selectedIds.length === rules.length}
              indeterminate={selectedIds.length > 0 && selectedIds.length < rules.length}
              onChange={handleSelectAll}
            />
            <span className="rl-header-hint">Rules are evaluated top-down by priority ↓</span>
          </div>

          {filteredRules.length > 0 ? (
            filteredRules.map((rule) => {
              const isSelected = selectedIds.includes(rule.id);
              const isActive = rule.status === "active";
              return (
                <div key={rule.id} className={`rl-card${isSelected ? " selected" : ""}`} style={{ position: "relative" }}>
                  {/* Loading Overlay Backdrop */}
                  {togglingRuleId === rule.id && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'inherit',
                      backdropFilter: 'blur(1px)'
                    }}>
                      <div className="tiny-spinner" style={{ width: '24px', height: '24px', borderWidth: '3px', color: '#4f46e5' }} />
                    </div>
                  )}

                  {/* Column 1: Checkbox */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={(checked) => handleSelectRule(rule.id, checked)}
                    />
                  </div>

                  {/* Column 2: Info */}
                  <div className="rl-info">
                    <div className="rl-title" style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>
                      {rule.title}
                    </div>
                    <div className="rl-tags" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "6px", marginBottom: "4px" }}>
                      <span className={`status-pill ${isActive ? "active" : "inactive"}`}>
                        <span className="status-dot" />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="priority-pill">P{rule.priority || 0}</span>
                      <span className="version-pill">v{rule.version || 1}</span>
                      {rule.target_shop ? (
                        <Badge tone="attention">{rule.target_shop}</Badge>
                      ) : (
                        <Badge tone="info">Global (All Stores)</Badge>
                      )}
                      {rule.rule_type === "delivery" ? (
                        <>
                          <Badge tone="attention">Delivery Customization</Badge>
                          {rule.delivery_action === "rename" ? (
                            <Badge tone="attention">Rename</Badge>
                          ) : (
                            <Badge tone="critical">Hide</Badge>
                          )}
                        </>
                      ) : rule.rule_type === "payment" ? (
                        <>
                          <Badge tone="attention">Payment Customization</Badge>
                          {rule.delivery_action === "rename" ? (
                            <Badge tone="attention">Rename</Badge>
                          ) : (
                            <Badge tone="critical">Hide</Badge>
                          )}
                        </>
                      ) : rule.rule_type === "checkbox" ? (
                        <Badge tone="attention">Checkout Checkbox</Badge>
                      ) : (
                        <Badge tone="info">Checkout Validation</Badge>
                      )}
                    </div>
                    <div className="rl-meta" style={{ flexWrap: "wrap", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{rule.rule_type === "delivery" ? "Target Method:" : rule.rule_type === "payment" ? "Target Payment:" : "Target:"}</span>
                      <code style={{
                        background: "#f1f5f9",
                        color: "#475569",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        fontFamily: "monospace",
                        border: "1px solid #e2e8f0"
                      }}>{rule.error_target}</code>
                      {(rule.rule_type === "delivery" || rule.rule_type === "payment") && rule.delivery_action === "rename" && (
                        <>
                          <span style={{ margin: "0 4px" }}>→</span>
                          <span>Rename to:</span>
                          <span style={{ fontWeight: "600", color: "#111827" }}>"{rule.error_message}"</span>
                        </>
                      )}
                    </div>

                    {rule.conditions && rule.conditions.length > 0 && (
                      <div style={{
                        borderLeft: "2px solid #e2e8f0",
                        paddingLeft: "14px",
                        marginLeft: "6px",
                        marginTop: "10px",
                        marginBottom: "4px"
                      }}>
                        <div className="cond-label">Conditions ({rule.conditions_operator})</div>
                        <div className="rl-conds">
                          {rule.conditions.map((cond, idx) => (
                            <span key={idx} className="cond-tag">
                              {formatConditionType(cond.type)}{cond.value ? `: ${cond.value}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Priority Adjuster & Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", justifySelf: "end" }}>
                    {/* Actions */}
                    <div className="rl-actions">
                      <button
                        className={`act-btn ${isActive ? "toggle-on" : "toggle-off"}`}
                        onClick={() => handleToggleSingle(rule)}
                        disabled={togglingRuleId === rule.id}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button className="act-btn ver" onClick={() => navigate(`/rules/${rule.id}/versions`)}>Versions</button>
                      <button className="act-btn edit" onClick={() => navigate(`/rules/${rule.id}`)}>Edit</button>
                      <button className="act-btn del" onClick={() => handleDeleteSingle(rule.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : rules.length > 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No matching rules found</div>
              <div className="empty-sub">Try modifying your search keywords or clear the filters.</div>
              <div className="empty-btns">
                <button className="empty-btn-sec" onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                  setFilterPriority("all");
                  setFilterStore("all");
                  setFilterType("all");
                }}>Clear Filters</button>
              </div>
            </div>
          ) : (
            <div className="empty-state">

              <div className="empty-title">No validation rules yet</div>
              <div className="empty-sub">Create a custom rule or import from our pre-built rules library.</div>

            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
