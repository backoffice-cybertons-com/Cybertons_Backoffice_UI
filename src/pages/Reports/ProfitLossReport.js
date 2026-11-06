import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Input,
  Label,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";
import { getProfitLoss } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import "./ProfitLossReport.css";

const SIDE_LABELS = {
  EXPENSES: "EXPENSES & Equity",
  INCOMES: "INCOMES",
};

const normalizeGroupLabel = (value) =>
  (value || "").toString().trim().toUpperCase().replace(/S$/, "");

const isSameAsReportSide = (subGroupName, reportSide) =>
  normalizeGroupLabel(subGroupName) === normalizeGroupLabel(reportSide);

const isDirectSubGroup = (subGroupName, reportSide) => {
  if (isSameAsReportSide(subGroupName, reportSide)) return true;
  return /^(DIRECT)\b/.test((subGroupName || "").toString().trim().toUpperCase());
};

const ProfitLossReport = () => {
  const [asOfDate, setAsOfDate] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [hideZero, setHideZero] = useState(true);

  document.title = "Profit & Loss Account | BookSoft";

  const companyName =
    secureStorage.getPlain("companyName") ||
    secureStorage.getPlain("CompanyName") ||
    "SoftBook";

  const formatLocalYMD = (value) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fetchReport = async () => {
    if (!asOfDate) {
      setError("Please select an as of date.");
      return;
    }

    setLoading(true);
    setError("");
    setReportData(null);

    try {
      const companyId = secureStorage.getPlain("companyId") || 10001;
      const date = formatLocalYMD(asOfDate);
      const response = await getProfitLoss(companyId, date);
      const data = Array.isArray(response) ? response : response?.data || [];
      setReportData(data);
    } catch (err) {
      console.error("Profit & Loss Account Error:", err);
      setError(
        typeof err === "string"
          ? err
          : "Failed to load Profit & Loss Account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    return (reportData || []).map((row) => ({
      reportSide: (row.reportSide || row.ReportSide || "")
        .toString()
        .toUpperCase(),
      rowType: (row.rowType || row.RowType || "").toString().toUpperCase(),
      groupName: (row.groupName || row.GroupName || "Other").toString(),
      subGroupName:
        (row.subGroupName || row.SubGroupName || row.sub_group_name || "")
          .toString()
          .trim() || "Other",
      ledgerId:
        row.ledgerId ?? row.LedgerId ?? row.accountId ?? row.AccountId ?? null,
      ledgerName: (row.ledgerName || row.LedgerName || "").toString(),
      amount: Number(row.amount ?? row.Amount ?? 0),
    }));
  }, [reportData]);

  const detailRows = useMemo(
    () => rows.filter((row) => row.rowType === "DETAIL"),
    [rows],
  );

  const shownRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return detailRows.filter((row) => {
      if (hideZero && Math.abs(row.amount) < 0.01) return false;
      if (!q) return true;
      return (
        row.ledgerName.toLowerCase().includes(q) ||
        row.groupName.toLowerCase().includes(q) ||
        row.subGroupName.toLowerCase().includes(q) ||
        row.reportSide.toLowerCase().includes(q)
      );
    });
  }, [detailRows, hideZero, query]);

  const buildGroups = (side) => {
    const groups = new Map();
    shownRows
      .filter((row) => row.reportSide === side)
      .forEach((row) => {
        if (!groups.has(row.groupName)) {
          groups.set(row.groupName, {
            groupName: row.groupName,
            directRows: [],
            subGroups: new Map(),
            total: 0,
          });
        }
        const group = groups.get(row.groupName);
        group.total += row.amount;

        // Direct sub-groups (Expense, Direct Expenses) stay with the group — no title row
        if (isDirectSubGroup(row.subGroupName, side)) {
          group.directRows.push(row);
          return;
        }

        if (!group.subGroups.has(row.subGroupName)) {
          group.subGroups.set(row.subGroupName, {
            subGroupName: row.subGroupName,
            rows: [],
            total: 0,
          });
        }
        const subGroup = group.subGroups.get(row.subGroupName);
        subGroup.rows.push(row);
        subGroup.total += row.amount;
      });

    return Array.from(groups.values())
      .map((group) => ({
        groupName: group.groupName,
        total: group.total,
        directRows: group.directRows.sort((a, b) =>
          a.ledgerName.localeCompare(b.ledgerName),
        ),
        subGroups: Array.from(group.subGroups.values())
          .map((subGroup) => ({
            ...subGroup,
            rows: subGroup.rows.sort((a, b) =>
              a.ledgerName.localeCompare(b.ledgerName),
            ),
          }))
          .sort((a, b) => a.subGroupName.localeCompare(b.subGroupName)),
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  };

  const liabilityGroups = useMemo(() => buildGroups("EXPENSES"), [shownRows]);
  const assetGroups = useMemo(() => buildGroups("INCOMES"), [shownRows]);

  const liabilityTotal = liabilityGroups.reduce(
    (sum, group) => sum + group.total,
    0,
  );
  const assetTotal = assetGroups.reduce((sum, group) => sum + group.total, 0);
  const difference = assetTotal - liabilityTotal;
  const isBalanced = Math.abs(difference) < 0.01;

  const flattenSideRows = (groups, totalLabel, totalAmount) => {
    const flattened = [];
    groups.forEach((group, groupIndex) => {
      if (groupIndex > 0) flattened.push({ kind: "spacer" });

      flattened.push({
        label: group.groupName,
        amount: group.total,
        kind: "group",
      });

      group.directRows.forEach((row) => {
        flattened.push({
          label: row.ledgerName,
          amount: row.amount,
          kind: "direct",
        });
      });

      group.subGroups.forEach((subGroup) => {
        flattened.push({
          label: subGroup.subGroupName,
          amount: subGroup.total,
          kind: "subgroup",
        });
        subGroup.rows.forEach((row) => {
          flattened.push({
            label: row.ledgerName,
            amount: row.amount,
            kind: "subledger",
          });
        });
      });
    });
    flattened.push({ label: totalLabel, amount: totalAmount, kind: "total" });
    return flattened;
  };

  const excelCellValue = (value) => {
    if (value === undefined || value === null || value === "") return "";
    return value;
  };

  const handleExcel = () => {
    if (!shownRows.length) return;

    const liabilityExportRows = flattenSideRows(
      liabilityGroups,
      "EXPENSES & Equity Total",
      liabilityTotal,
    );
    const assetExportRows = flattenSideRows(
      assetGroups,
      "INCOMES Total",
      assetTotal,
    );
    const maxRows = Math.max(
      liabilityExportRows.length,
      assetExportRows.length,
    );
    const headerRowIndex = 4;
    const dataStartRow = headerRowIndex + 1;
    const leftKinds = new Map();
    const rightKinds = new Map();

    const aoa = [
      ["Profit & Loss Account", "", "", ""],
      ["Company Name:", companyName, "", ""],
      ["As of:", formatDate(asOfDate), "", ""],
      ["", "", "", ""],
      ["EXPENSES & Equity", "Amount", "INCOMES", "Amount"],
    ];

    for (let i = 0; i < maxRows; i++) {
      const left = liabilityExportRows[i] || { kind: "spacer" };
      const right = assetExportRows[i] || { kind: "spacer" };
      const excelRow = dataStartRow + i;
      leftKinds.set(excelRow, left.kind || "ledger");
      rightKinds.set(excelRow, right.kind || "ledger");
      aoa.push([
        left.label || "",
        excelCellValue(left.amount),
        right.label || "",
        excelCellValue(right.amount),
      ]);
    }

    const diffRowIndex = aoa.length;
    aoa.push([
      "Difference",
      Math.abs(difference),
      isBalanced
        ? "Balanced"
        : difference > 0
          ? "INCOMES higher"
          : "EXPENSES higher",
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    ws["!cols"] = [{ wch: 46 }, { wch: 18 }, { wch: 46 }, { wch: 18 }];

    const thin = { style: "thin", color: { rgb: "E5E7EB" } };
    const border = { top: thin, bottom: thin, left: thin, right: thin };
    const moneyFmt = "#,##0.00";

    const kindStyle = {
      group: {
        font: { bold: true, sz: 11, color: { rgb: "1E293B" } },
        fill: { patternType: "solid", fgColor: { rgb: "F3F5F8" } },
        border: {
          top: { style: "thin", color: { rgb: "D1D5DB" } },
          bottom: { style: "thin", color: { rgb: "D1D5DB" } },
          left: thin,
          right: thin,
        },
      },
      subgroup: {
        font: { bold: true, sz: 10, color: { rgb: "3D4A57" } },
        fill: { patternType: "solid", fgColor: { rgb: "F7F6F3" } },
        border,
      },
      direct: {
        font: { sz: 10, color: { rgb: "4B5563" } },
        fill: { patternType: "solid", fgColor: { rgb: "F7FAFC" } },
        border,
      },
      ledger: {
        font: { sz: 10, color: { rgb: "4B5563" } },
        border,
      },
      subledger: {
        font: { sz: 10, color: { rgb: "6B7280" } },
        border,
      },
      total: {
        font: { bold: true, sz: 11, color: { rgb: "111827" } },
        fill: { patternType: "solid", fgColor: { rgb: "E5E7EB" } },
        border: {
          top: { style: "thin", color: { rgb: "9CA3AF" } },
          bottom: { style: "thin", color: { rgb: "9CA3AF" } },
          left: thin,
          right: thin,
        },
      },
    };

    const indentByKind = {
      group: 0,
      subgroup: 1,
      direct: 1,
      ledger: 1,
      subledger: 2,
      total: 0,
    };

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const rowMeta = [];

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { t: "s", v: "" };

        if (r === 0) {
          ws[addr].s = {
            font: { bold: true, sz: 16, color: { rgb: "0F172A" } },
            alignment: { horizontal: "center", vertical: "center" },
          };
          continue;
        }

        if (r === 1 || r === 2) {
          ws[addr].s =
            c % 2 === 0
              ? {
                  font: { bold: true, color: { rgb: "334155" } },
                  alignment: { horizontal: "left" },
                }
              : {
                  font: { color: { rgb: "111827" } },
                  alignment: { horizontal: "left" },
                };
          continue;
        }

        if (r === headerRowIndex) {
          ws[addr].s = {
            font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "1F2937" } },
            border,
            alignment: {
              horizontal: c % 2 === 0 ? "left" : "right",
              vertical: "center",
            },
          };
          continue;
        }

        if (r === diffRowIndex) {
          ws[addr].s = {
            font: { bold: true, color: { rgb: "111827" } },
            fill: { patternType: "solid", fgColor: { rgb: "F3F4F6" } },
            border: {
              top: { style: "thin", color: { rgb: "9CA3AF" } },
              bottom: { style: "thin", color: { rgb: "9CA3AF" } },
              left: thin,
              right: thin,
            },
            alignment: {
              horizontal: c % 2 === 0 ? "left" : "right",
              vertical: "center",
            },
            numFmt: c === 1 ? moneyFmt : undefined,
          };
          if (c === 1 && typeof ws[addr].v === "number") ws[addr].t = "n";
          continue;
        }

        if (r >= dataStartRow) {
          const kind = (c <= 1 ? leftKinds : rightKinds).get(r) || "spacer";
          if (kind === "spacer") {
            ws[addr].s = {
              fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
            };
            continue;
          }

          const base = kindStyle[kind] || kindStyle.ledger;
          const isAmountCol = c % 2 === 1;
          ws[addr].s = {
            ...base,
            alignment: {
              horizontal: isAmountCol ? "right" : "left",
              vertical: "center",
              indent: isAmountCol ? 0 : indentByKind[kind] || 0,
            },
            numFmt: isAmountCol ? moneyFmt : undefined,
          };
          if (isAmountCol && typeof ws[addr].v === "number") ws[addr].t = "n";
        }
      }

      if (r === 0) rowMeta[r] = { hpt: 24 };
      else if (r === headerRowIndex || r === diffRowIndex)
        rowMeta[r] = { hpt: 20 };
      else if (leftKinds.get(r) === "group" || rightKinds.get(r) === "group")
        rowMeta[r] = { hpt: 20 };
      else if (
        leftKinds.get(r) === "subgroup" ||
        rightKinds.get(r) === "subgroup"
      )
        rowMeta[r] = { hpt: 18 };
      else if (leftKinds.get(r) === "spacer" && rightKinds.get(r) === "spacer")
        rowMeta[r] = { hpt: 10 };
    }

    ws["!rows"] = rowMeta;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss Account");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Profit_Loss_${formatLocalYMD(asOfDate)}.xlsx`,
    );
  };

  const handlePrint = () => {
    const content = document.getElementById("balanceSheetPrintArea");
    if (!content) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<html><head><title>Profit & Loss Account</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <link href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css" rel="stylesheet">
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                body {
                    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    background: #fff;
                }
                .bs-print-shell { width: 210mm; margin: 0 auto; }
                .bs-filter-card, .bs-actions, .breadcrumb, .btn, .form-control { display: none !important; }
                .card { border: 0 !important; box-shadow: none !important; }
                .bs-report-body { overflow: visible !important; }
                .bs-side-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
                .bs-side-panel { border: 1px solid #111827 !important; border-radius: 0 !important; overflow: visible !important; }
                .bs-side-scroll { overflow: visible !important; max-height: none !important; }
                .bs-side-foot { display: flex; justify-content: space-between; background: #eef2f7 !important; color: #111827 !important; font-weight: 800 !important; border-top: 2px solid #d8dee9; padding: 6px; }
                .bs-group-row td { background: #f3f5f8 !important; font-weight: 700 !important; color: #1e293b !important; }
                .bs-group-row td:first-child { box-shadow: inset 2px 0 0 #c5ced8; }
                .bs-subgroup-row td { background: #f7f6f3 !important; font-weight: 600 !important; color: #3f4a57 !important; }
                .bs-subgroup-row td:first-child { padding-left: 16px !important; box-shadow: inset 2px 0 0 #ddd6cc; }
                .bs-nested-ledger { padding-left: 22px !important; }
                .bs-summary-grid { margin-bottom: 8px !important; }
                .bs-ledger-link { color: inherit !important; text-decoration: none !important; cursor: default !important; }
            </style>
            </head><body><div class="bs-print-shell">${content.innerHTML}</div>
            <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},400);};<\/script>
            </body></html>`);
    printWindow.document.close();
  };

  const getFiscalYearStart = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const fyYear =
      date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    return `${fyYear}-04-01`;
  };

  const openAccountLedger = (row) => {
    if (!row?.ledgerId) return;
    const params = new URLSearchParams({
      accountId: String(row.ledgerId),
      accountName: row.ledgerName || "",
      fromDate: getFiscalYearStart(asOfDate),
      toDate: formatLocalYMD(asOfDate),
    });
    const base = process.env.PUBLIC_URL || "";
    window.open(
      `${base}/reports/ledger?${params.toString().replace(/\+/g, "%20")}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const renderSidePanel = (side, groups, total) => (
    <div className={`bs-side-panel bs-side-${side.toLowerCase()}`}>
      <div className="bs-side-heading">
        <div>
          <div className="bs-side-title">{SIDE_LABELS[side]}</div>
          <div className="bs-side-subtitle">
            {groups.reduce(
              (count, group) =>
                count +
                group.directRows.length +
                group.subGroups.reduce(
                  (subCount, sub) => subCount + sub.rows.length,
                  0,
                ),
              0,
            )}{" "}
            ledgers
          </div>
        </div>
        <div className="bs-side-total">{formatMoney(total)}</div>
      </div>

      <div className="bs-side-scroll">
        <Table className="align-middle mb-0 bs-side-table">
          <thead>
            <tr>
              <th>Particulars</th>
              <th className="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center text-muted py-4">
                  No rows
                </td>
              </tr>
            )}

            {groups.map((group) => (
              <React.Fragment key={`${side}-${group.groupName}`}>
                <tr className="bs-group-row">
                  <td>{group.groupName}</td>
                  <td className="text-end">{formatMoney(group.total)}</td>
                </tr>
                {group.directRows.map((row) => (
                  <tr
                    key={`${side}-${group.groupName}-direct-${row.ledgerId ?? row.ledgerName}`}
                    className="bs-direct-row"
                  >
                    <td>
                      {row.ledgerId ? (
                        <span
                          className="bs-ledger-name bs-ledger-link"
                          role="button"
                          tabIndex={0}
                          title="Open account ledger"
                          onClick={() => openAccountLedger(row)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openAccountLedger(row);
                            }
                          }}
                        >
                          {row.ledgerName}
                        </span>
                      ) : (
                        <span className="bs-ledger-name">{row.ledgerName}</span>
                      )}
                    </td>
                    <td className="text-end">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
                {group.subGroups.map((subGroup) => (
                  <React.Fragment
                    key={`${side}-${group.groupName}-${subGroup.subGroupName}`}
                  >
                    <tr className="bs-subgroup-row">
                      <td>{subGroup.subGroupName}</td>
                      <td className="text-end">
                        {formatMoney(subGroup.total)}
                      </td>
                    </tr>
                    {subGroup.rows.map((row) => (
                      <tr
                        key={`${side}-${group.groupName}-${subGroup.subGroupName}-${row.ledgerId ?? row.ledgerName}`}
                      >
                        <td>
                          {row.ledgerId ? (
                            <span
                              className="bs-ledger-name bs-nested-ledger bs-ledger-link"
                              role="button"
                              tabIndex={0}
                              title="Open account ledger"
                              onClick={() => openAccountLedger(row)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  openAccountLedger(row);
                                }
                              }}
                            >
                              {row.ledgerName}
                            </span>
                          ) : (
                            <span className="bs-ledger-name bs-nested-ledger">
                              {row.ledgerName}
                            </span>
                          )}
                        </td>
                        <td className="text-end">{formatMoney(row.amount)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
        <div className="bs-side-foot">
          <span>{SIDE_LABELS[side]} Total</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <React.Fragment>
      <div className="page-content balance-sheet-page">
        <Container fluid>
          <BreadCrumb title="Profit & Loss Account" pageTitle="Reports" />

          <Card className="mb-2 bs-filter-card">
            <CardBody className="py-2">
              <Row className="g-3 align-items-end">
                <Col xxl={2} lg={3} md={4}>
                  <Label className="form-label text-muted text-uppercase fw-semibold mb-1">
                    As of Date
                  </Label>
                  <Flatpickr
                    className="form-control"
                    value={asOfDate}
                    onChange={([date]) => setAsOfDate(date)}
                    options={{ dateFormat: "d M Y", maxDate: "today" }}
                  />
                </Col>
                <Col xxl={2} lg={3} md={4}>
                  <div className="d-flex gap-2">
                    <Button
                      color="primary"
                      className="flex-grow-1"
                      onClick={fetchReport}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-1" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <i className="ri-filter-2-line me-1" />
                          Generate
                        </>
                      )}
                    </Button>
                    <Button
                      color="light"
                      className="bs-icon-btn"
                      onClick={() => {
                        setQuery("");
                        setHideZero(true);
                      }}
                      disabled={loading}
                      title="Reset filters"
                    >
                      <i className="ri-refresh-line fs-5" />
                    </Button>
                  </div>
                </Col>
                <Col xxl={5} lg={6} md={8}>
                  <Label className="form-label text-muted text-uppercase fw-semibold mb-1">
                    Search ledger
                  </Label>
                  <div className="d-flex gap-2 bs-toolbar-row">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Type ledger, group or sub-group..."
                    />
                    <div className="bs-actions">
                      <div className="form-check form-switch">
                        <Input
                          id="bsHideZero"
                          type="switch"
                          className="form-check-input"
                          checked={hideZero}
                          onChange={(event) =>
                            setHideZero(event.target.checked)
                          }
                        />
                        <Label
                          className="form-check-label"
                          htmlFor="bsHideZero"
                        >
                          Hide zero
                        </Label>
                      </div>
                      <Button
                        color="success"
                        outline
                        onClick={handleExcel}
                        disabled={!shownRows.length}
                        title="Export Excel"
                      >
                        <i className="ri-file-excel-2-line" />
                      </Button>
                      <Button
                        color="secondary"
                        outline
                        onClick={handlePrint}
                        disabled={!shownRows.length}
                        title="Print"
                      >
                        <i className="ri-printer-line" />
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>
              {error && (
                <div className="alert alert-danger mt-3 mb-0">{error}</div>
              )}
            </CardBody>
          </Card>

          {reportData && detailRows.length > 0 && (
            <Card id="balanceSheetPrintArea" className="bs-report-card">
              <HeaderForAllReport reportName="Profit & Loss Account" />

              <CardHeader className="border-0 py-2">
                <div className="d-flex align-items-start align-items-md-center justify-content-between flex-wrap gap-2">
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h6 className="card-title mb-0 fs-6 fw-semibold">
                        Profit & Loss Account
                      </h6>
                      <Badge
                        color={isBalanced ? "success" : "warning"}
                        className="bs-pill"
                      >
                        {isBalanced ? "Balanced" : "Difference"}
                      </Badge>
                      <span className="text-muted fs-12">
                        As of <strong>{formatDate(asOfDate)}</strong>
                      </span>
                    </div>
                    <div className="text-muted fs-11 mt-1">
                      Showing <strong>{shownRows.length}</strong> of{" "}
                      <strong>{detailRows.length}</strong> ledgers
                      {query.trim() ? (
                        <>
                          {" "}
                          | Filter: <strong>{query.trim()}</strong>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardBody className="bs-report-body">
                <div className="bs-summary-grid">
                  <div className="bs-summary-tile bs-summary-liability">
                    <span>EXPENSES & Equity</span>
                    <strong>{formatMoney(liabilityTotal)}</strong>
                  </div>
                  <div className="bs-summary-tile bs-summary-asset">
                    <span>INCOMES</span>
                    <strong>{formatMoney(assetTotal)}</strong>
                  </div>
                  <div
                    className={`bs-summary-tile ${isBalanced ? "bs-summary-balanced" : "bs-summary-diff"}`}
                  >
                    <span>Difference</span>
                    <strong>{formatMoney(Math.abs(difference))}</strong>
                  </div>
                </div>

                <div className="bs-side-grid">
                  {renderSidePanel("EXPENSES", liabilityGroups, liabilityTotal)}
                  {renderSidePanel("INCOMES", assetGroups, assetTotal)}
                </div>
              </CardBody>

              <FooterForAllRpt />
            </Card>
          )}

          {loading && (
            <Card>
              <CardBody className="py-5 text-center">
                <Spinner className="me-2" />
                Loading Profit & Loss Account...
              </CardBody>
            </Card>
          )}

          {!loading && reportData && detailRows.length === 0 && (
            <Card>
              <CardBody className="text-center py-5 text-muted">
                <i className="ri-inbox-2-line fs-1 mb-2 d-block" />
                No Profit & Loss Account rows found for the selected date.
              </CardBody>
            </Card>
          )}

          {!loading &&
            reportData &&
            detailRows.length > 0 &&
            shownRows.length === 0 && (
              <Card>
                <CardBody className="text-center py-5">
                  <div className="text-muted mb-2">
                    No ledgers match your filters.
                  </div>
                  <Button
                    color="primary"
                    outline
                    onClick={() => {
                      setQuery("");
                      setHideZero(false);
                    }}
                  >
                    Clear filters
                  </Button>
                </CardBody>
              </Card>
            )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default ProfitLossReport;
