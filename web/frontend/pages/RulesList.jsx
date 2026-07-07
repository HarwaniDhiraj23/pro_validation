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

  const filteredRules = rules.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.error_message && r.error_message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    try {
      const res = await fetch("/api/rules/bulk-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status })
      });
      if (res.ok) {
        shopify.toast.show(`Rules updated to ${status}`);
        setSelectedIds([]);
        fetchRules();
      } else {
        const errorData = await res.json();
        shopify.toast.show(errorData.error || "Bulk update failed", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Bulk operation failed", { isError: true });
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
    const nextStatus = rule.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, status: nextStatus })
      });
      if (res.ok) {
        shopify.toast.show(`Rule ${nextStatus === "active" ? "activated" : "deactivated"}`);
        fetchRules();
      } else {
        const errorData = await res.json();
        shopify.toast.show(errorData.error || "Update failed", { isError: true });
      }
    } catch (e) {
      shopify.toast.show("Update failed", { isError: true });
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
      secondaryActions={[{ content: "Pre-built Templates", onAction: () => navigate("/templates") }]}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .rl-wrap { font-family: 'Inter', sans-serif; }

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
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
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
        .rl-meta { font-size: 12px; color: #9ca3af; margin-top: 3px; }
        .rl-conds {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .cond-tag {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .cond-label {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          margin-top: 6px;
          margin-bottom: 2px;
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
        {/* Search Bar */}
        <div style={{ marginBottom: "16px" }}>
          <TextField
            label="Search rules"
            labelHidden
            placeholder="Search rules by title or error message..."
            value={searchQuery}
            onChange={setSearchQuery}
            autoComplete="off"
          />
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bulk-bar">
            <span className="bulk-bar-label">✓ {selectedIds.length} rule{selectedIds.length > 1 ? "s" : ""} selected</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="bulk-btn green" onClick={() => handleBulkToggle("active")}>Activate All</button>
              <button className="bulk-btn gray" onClick={() => handleBulkToggle("inactive")}>Deactivate All</button>
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
                <div key={rule.id} className={`rl-card${isSelected ? " selected" : ""}`}>
                  {/* Checkbox */}
                  <div style={{ paddingTop: "2px" }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={(checked) => handleSelectRule(rule.id, checked)}
                    />
                  </div>

                  {/* Info */}
                  <div className="rl-info">
                    <div className="rl-title">
                      {rule.title}
                      <span className={`status-pill ${isActive ? "active" : "inactive"}`}>
                        <span className="status-dot" />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="priority-pill">P{rule.priority || 0}</span>
                      {rule.target_shop ? (
                        <Badge tone="attention">{rule.target_shop}</Badge>
                      ) : (
                        <Badge tone="info">Global (All Stores)</Badge>
                      )}
                    </div>
                    <div className="rl-meta">Target: {rule.error_target}</div>
                    {rule.conditions && rule.conditions.length > 0 && (
                      <>
                        <div className="cond-label">Conditions ({rule.conditions_operator}):</div>
                        <div className="rl-conds">
                          {rule.conditions.map((cond, idx) => (
                            <span key={idx} className="cond-tag">
                              {formatConditionType(cond.type)}{cond.value ? `: ${cond.value}` : ""}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Priority adjuster */}
                  <div className="priority-box" title="Priority Level (evaluated highest to lowest)">
                    <button className="prio-btn" onClick={() => handlePriorityChange(rule, false)}>−</button>
                    <span className="prio-num">{rule.priority || 0}</span>
                    <button className="prio-btn" onClick={() => handlePriorityChange(rule, true)}>+</button>
                  </div>

                  {/* Actions */}
                  <div className="rl-actions">
                    <button
                      className={`act-btn ${isActive ? "toggle-on" : "toggle-off"}`}
                      onClick={() => handleToggleSingle(rule)}
                    >
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button className="act-btn ver" onClick={() => navigate(`/rules/${rule.id}/versions`)}>Versions</button>
                    <button className="act-btn edit" onClick={() => navigate(`/rules/${rule.id}`)}>Edit</button>
                    <button className="act-btn del" onClick={() => handleDeleteSingle(rule.id)}>Delete</button>
                  </div>
                </div>
              );
            })
          ) : rules.length > 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No matching rules found</div>
              <div className="empty-sub">Try modifying your search keywords or clear the filter.</div>
              <div className="empty-btns">
                <button className="empty-btn-sec" onClick={() => setSearchQuery("")}>Clear Search</button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No validation rules yet</div>
              <div className="empty-sub">Create a custom rule or import from our pre-built template library.</div>
              <div className="empty-btns">
                <button className="empty-btn-primary" onClick={() => navigate("/rules/new")}>Create First Rule</button>
                <button className="empty-btn-sec" onClick={() => navigate("/templates")}>Browse Templates</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
