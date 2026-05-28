import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input } from "reactstrap";
import { toast } from "react-toastify";
import {
  addOutstandingTermConfig,
  deleteOutstandingTermConfig,
  getOutstandingTermConfigList,
  updateOutstandingTermConfig,
} from "../../../helpers/fakebackend_helper";

const OutstandingTermColorRulesSection = ({
  companyId,
  initialRules = [],
}) => {
  const [termColorRules, setTermColorRules] = useState([]);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [busyRuleId, setBusyRuleId] = useState(null);

  useEffect(() => {
    if (!Array.isArray(initialRules) || initialRules.length === 0) return;

    const mapped = initialRules.map((r) => ({
      id: r.configId ?? r.ConfigId ?? r.id,
      minDays: r.minDays ?? r.MinDays ?? 0,
      maxDays: r.maxDays ?? r.MaxDays ?? 0,
      bgColor: r.bgColor ?? r.BgColor ?? "#FFFFFF",
    }));

    // only replace if ids exist (avoid wiping defaults with junk)
    if (mapped.every((m) => m.id !== undefined && m.id !== null)) {
      setTermColorRules(mapped);
      setEditingRuleId(null);
    }
  }, [initialRules]);

  const reloadRules = async () => {
    if (!companyId) return;
    const res = await getOutstandingTermConfigList(companyId);
    const rules = res?.data || res || [];
    const mapped = (Array.isArray(rules) ? rules : []).map((r) => ({
      id: r.configId ?? r.ConfigId ?? r.id,
      minDays: r.minDays ?? r.MinDays ?? 0,
      maxDays: r.maxDays ?? r.MaxDays ?? 0,
      bgColor: r.bgColor ?? r.BgColor ?? "#FFFFFF",
    }));
    if (mapped.length) setTermColorRules(mapped);
  };

  const nextId = useMemo(() => {
    return termColorRules.length
      ? Math.max(...termColorRules.map((r) => r.id)) + 1
      : 1;
  }, [termColorRules]);

  const addRule = () => {
    const id = nextId;
    setTermColorRules((prev) => [
      ...prev,
      { id, minDays: 0, maxDays: 0, bgColor: "#FFFFFF", isNew: true },
    ]);
    setEditingRuleId(id);
  };

  const updateRuleField = (id, field, value) => {
    setTermColorRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const saveRule = async (rule) => {
    if (!companyId) {
      toast.error("CompanyId missing. Please reload and try again.", {
        autoClose: 3000,
      });
      return;
    }

    try {
      setBusyRuleId(rule.id);
      if (rule.isNew) {
        await addOutstandingTermConfig({
          companyId: Number(companyId),
          minDays: Number(rule.minDays) || 0,
          maxDays: Number(rule.maxDays) || 0,
          bgColor: rule.bgColor,
          isActive: true,
        });
        toast.success("Rule saved successfully.", { autoClose: 2500 });
      } else {
        await updateOutstandingTermConfig({
          configId: Number(rule.id),
          companyId: Number(companyId),
          minDays: Number(rule.minDays) || 0,
          maxDays: Number(rule.maxDays) || 0,
          bgColor: rule.bgColor,
          isActive: true,
        });
        toast.success("Rule updated successfully.", { autoClose: 2500 });
      }

      setEditingRuleId(null);
      await reloadRules();
    } catch (err) {
      toast.error(err || "Failed to save rule.", { autoClose: 3000 });
    } finally {
      setBusyRuleId(null);
    }
  };

  const deleteRule = async (rule) => {
    // If it's a new unsaved rule, just remove locally
    if (rule.isNew) {
      setTermColorRules((prev) => prev.filter((r) => r.id !== rule.id));
      setEditingRuleId((prev) => (prev === rule.id ? null : prev));
      toast.success("Rule removed.", { autoClose: 2000 });
      return;
    }

    try {
      setBusyRuleId(rule.id);
      await deleteOutstandingTermConfig(rule.id);
      setTermColorRules((prev) => prev.filter((r) => r.id !== rule.id));
      setEditingRuleId((prev) => (prev === rule.id ? null : prev));
      toast.success("Rule deleted successfully.", { autoClose: 2500 });
    } catch (err) {
      toast.error(err || "Failed to delete rule.", { autoClose: 3000 });
    } finally {
      setBusyRuleId(null);
    }
  };

  return (
    <Card className="otcr-card mt-4">
      <CardHeader className="otcr-header">
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <h5 className="card-title mb-0">Outstanding Term Color Rules</h5>
            <i
              className="ri-information-line otcr-info-icon"
              title="Define color rules based on outstanding average term (in days). Rules are applied in order of Min Days."
            />
          </div>
          <Button
            type="button"
            color="primary"
            className="otcr-add-btn"
            onClick={addRule}
          >
            <i className="ri-add-line me-1" />
            Add Rule
          </Button>
        </div>
        <p className="text-muted mb-0 mt-2 otcr-subtitle">
          Configure background colors based on average outstanding term days.
        </p>
      </CardHeader>
      <CardBody className="pt-3">
        <div className="table-responsive">
          <table className="table align-middle otcr-table mb-0">
            <thead>
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th>Min Days</th>
                <th>Max Days</th>
                <th>BG Color</th>
                <th className="text-end" style={{ width: 140 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {termColorRules.map((rule, idx) => {
                debugger;
                const isEditing = editingRuleId === rule.id;
                const isBusy = busyRuleId === rule.id;
                return (
                  <tr key={rule.id}>
                    <td className="text-muted fw-medium">{idx + 1}</td>
                    <td>
                      <Input
                        type="number"
                        className="form-control otcr-input"
                        value={rule.minDays}
                        disabled={!isEditing || isBusy}
                        min={0}
                        onChange={(e) =>
                          updateRuleField(
                            rule.id,
                            "minDays",
                            Number(e.target.value),
                          )
                        }
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        className="form-control otcr-input"
                        value={rule.maxDays}
                        disabled={!isEditing || isBusy}
                        min={0}
                        onChange={(e) =>
                          updateRuleField(
                            rule.id,
                            "maxDays",
                            Number(e.target.value),
                          )
                        }
                      />
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Input
                          type="text"
                          className="form-control otcr-input otcr-color-text"
                          value={rule.bgColor}
                          disabled={!isEditing || isBusy}
                          onChange={(e) =>
                            updateRuleField(rule.id, "bgColor", e.target.value)
                          }
                        />
                        <Input
                          type="color"
                          className="form-control form-control-color otcr-color-picker"
                          value={rule.bgColor}
                          disabled={!isEditing || isBusy}
                          onChange={(e) =>
                            updateRuleField(rule.id, "bgColor", e.target.value)
                          }
                          title="Choose background color"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        {isEditing ? (
                          <Button
                            type="button"
                            color="success"
                            outline
                            size="sm"
                            className="otcr-icon-btn"
                            disabled={isBusy}
                            onClick={() => saveRule(rule)}
                            title="Save"
                          >
                            <i className="ri-check-line" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            color="primary"
                            outline
                            size="sm"
                            className="otcr-icon-btn"
                            disabled={isBusy}
                            onClick={() => setEditingRuleId(rule.id)}
                            title="Edit"
                          >
                            <i className="ri-pencil-line" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          color="danger"
                          outline
                          size="sm"
                          className="otcr-icon-btn"
                          disabled={isBusy}
                          onClick={() => deleteRule(rule)}
                          title="Delete"
                        >
                          <i className="ri-delete-bin-line" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
};

export default OutstandingTermColorRulesSection;

