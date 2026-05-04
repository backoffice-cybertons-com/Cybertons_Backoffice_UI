import React, { useEffect, useState } from "react";
import { Button, Modal, ModalBody, ModalHeader, ModalFooter, Spinner } from "reactstrap";
import Select from "react-select";
import { getFiscalYears } from "../../helpers/fakebackend_helper";
import { getSelectedFiscalYearId, setSelectedFiscalYearId } from "../../utils/fiscalYearStorage";
import "./fiscalYearGate.css";

const FiscalYearGate = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const currentId = getSelectedFiscalYearId();
    if (currentId) {
      setSelected({ value: currentId, label: String(currentId) });
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await getFiscalYears();
        const data = res?.data || res || [];
        if (!mounted) return;

        const mapped = Array.isArray(data)
          ? data.map((fy) => ({
              label:
                fy.FiscalYearLabel ||
                fy.fiscalYearLabel ||
                fy.fiscal_year_label ||
                `Fiscal Year ${fy.FiscalYearId || fy.fiscalYearId || fy.fiscal_year_id || ""}`.trim(),
              value: Number(fy.FiscalYearId ?? fy.fiscalYearId ?? fy.fiscal_year_id ?? fy.id ?? fy.value),
            })).filter((x) => !Number.isNaN(x.value))
          : [];

        setOptions(mapped);

        // Pre-select the first fiscal year so user doesn't have to click it,
        // but keep the modal open so they can confirm or change it.
        if (mapped.length > 0) {
          setSelected(mapped[0]);
        }
      } catch (e) {
        console.error("[FiscalYearGate] Failed to load fiscal years:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const layout = document.getElementById("layout-wrapper");
    if (!layout) return;
    if (isOpen) layout.classList.add("sb-fiscalyear-blur");
    else layout.classList.remove("sb-fiscalyear-blur");
    return () => layout.classList.remove("sb-fiscalyear-blur");
  }, [isOpen]);

  const onConfirm = () => {
    if (!selected?.value) return;
    setSelectedFiscalYearId(selected.value);
    setIsOpen(false);
  };

  // If something cleared storage unexpectedly, ensure modal is visible again.
  useEffect(() => {
    if (!isOpen && !getSelectedFiscalYearId()) {
      setIsOpen(true);
    }
  }, [isOpen]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        backdrop="static"
        keyboard={false}
        centered
        className="sb-fiscalyear-modal"
      >
        <ModalHeader>Select Fiscal Year</ModalHeader>
        <ModalBody>
          <div className="mb-2 text-muted small">
            Fiscal Year selection is mandatory to continue.
          </div>
          {loading ? (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 80 }}>
              <Spinner size="sm" />
            </div>
          ) : (
            <Select
              options={options}
              isClearable={false}
              placeholder="Select Fiscal Year"
              value={selected}
              onChange={(opt) => setSelected(opt)}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={onConfirm}
            disabled={!selected || loading}
          >
            Continue
          </Button>
        </ModalFooter>
      </Modal>
      {children}
    </>
  );
};

export default FiscalYearGate;

