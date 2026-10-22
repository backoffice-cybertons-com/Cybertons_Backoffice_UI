import React, { useMemo, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Col,
    Container,
    Input,
    Label,
    Row,
    Spinner,
    Table
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";
import { getBalanceSheet } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import "./BalanceSheetReport.css";

const SIDE_LABELS = {
    LIABILITIES: "Liabilities & Equity",
    ASSETS: "Assets"
};

const BalanceSheetReport = () => {
    const [asOfDate, setAsOfDate] = useState(new Date());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [hideZero, setHideZero] = useState(true);

    document.title = "Balance Sheet | SoftBook";

    const companyName = secureStorage.getPlain("companyName") || secureStorage.getPlain("CompanyName") || "SoftBook";

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
            year: "numeric"
        });
    };

    const formatMoney = (amount) => Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
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
            const response = await getBalanceSheet(companyId, date);
            const data = Array.isArray(response) ? response : (response?.data || []);
            setReportData(data);
        } catch (err) {
            console.error("Balance Sheet Error:", err);
            setError(typeof err === "string" ? err : "Failed to load Balance Sheet. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const rows = useMemo(() => {
        return (reportData || []).map((row) => ({
            reportSide: (row.reportSide || row.ReportSide || "").toString().toUpperCase(),
            rowType: (row.rowType || row.RowType || "").toString().toUpperCase(),
            groupName: (row.groupName || row.GroupName || "Other").toString(),
            ledgerId: row.ledgerId ?? row.LedgerId ?? null,
            ledgerName: (row.ledgerName || row.LedgerName || "").toString(),
            amount: Number(row.amount ?? row.Amount ?? 0)
        }));
    }, [reportData]);

    const detailRows = useMemo(() => rows.filter(row => row.rowType === "DETAIL"), [rows]);

    const shownRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return detailRows.filter(row => {
            if (hideZero && Math.abs(row.amount) < 0.01) return false;
            if (!q) return true;
            return (
                row.ledgerName.toLowerCase().includes(q) ||
                row.groupName.toLowerCase().includes(q) ||
                row.reportSide.toLowerCase().includes(q)
            );
        });
    }, [detailRows, hideZero, query]);

    const buildGroups = (side) => {
        const groups = new Map();
        shownRows
            .filter(row => row.reportSide === side)
            .forEach(row => {
                if (!groups.has(row.groupName)) {
                    groups.set(row.groupName, { groupName: row.groupName, rows: [], total: 0 });
                }
                const group = groups.get(row.groupName);
                group.rows.push(row);
                group.total += row.amount;
            });

        return Array.from(groups.values())
            .map(group => ({
                ...group,
                rows: group.rows.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName))
            }))
            .sort((a, b) => a.groupName.localeCompare(b.groupName));
    };

    const liabilityGroups = useMemo(() => buildGroups("LIABILITIES"), [shownRows]);
    const assetGroups = useMemo(() => buildGroups("ASSETS"), [shownRows]);

    const liabilityTotal = liabilityGroups.reduce((sum, group) => sum + group.total, 0);
    const assetTotal = assetGroups.reduce((sum, group) => sum + group.total, 0);
    const difference = assetTotal - liabilityTotal;
    const isBalanced = Math.abs(difference) < 0.01;

    const flattenSideRows = (groups, totalLabel, totalAmount) => {
        const flattened = [];
        groups.forEach(group => {
            flattened.push({ label: group.groupName, amount: group.total, isGroup: true });
            group.rows.forEach(row => {
                flattened.push({ label: row.ledgerName, amount: row.amount, isGroup: false });
            });
        });
        flattened.push({ label: totalLabel, amount: totalAmount, isTotal: true });
        return flattened;
    };

    const handleExcel = () => {
        if (!shownRows.length) return;

        const liabilityExportRows = flattenSideRows(liabilityGroups, "Liabilities & Equity Total", liabilityTotal);
        const assetExportRows = flattenSideRows(assetGroups, "Assets Total", assetTotal);
        const maxRows = Math.max(liabilityExportRows.length, assetExportRows.length);

        const aoa = [
            ["BALANCE SHEET", "", "", ""],
            ["Company Name:", companyName, "", ""],
            ["As of:", formatDate(asOfDate), "", ""],
            ["", "", "", ""],
            ["Liabilities & Equity", "Amount", "Assets", "Amount"]
        ];

        for (let i = 0; i < maxRows; i++) {
            const left = liabilityExportRows[i] || {};
            const right = assetExportRows[i] || {};
            aoa.push([
                left.label || "",
                left.amount || "",
                right.label || "",
                right.amount || ""
            ]);
        }

        aoa.push(["Difference", Math.abs(difference), isBalanced ? "Balanced" : (difference > 0 ? "Assets higher" : "Liabilities higher"), ""]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
        ws["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 42 }, { wch: 18 }];

        const border = {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } }
        };

        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                if (!ws[addr]) continue;

                if (r === 0) {
                    ws[addr].s = {
                        font: { bold: true, sz: 16 },
                        alignment: { horizontal: "center" }
                    };
                } else if (r === 4) {
                    ws[addr].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { patternType: "solid", fgColor: { rgb: "344767" } },
                        border,
                        alignment: { horizontal: c % 2 === 0 ? "left" : "right" }
                    };
                } else if (r > 4) {
                    ws[addr].s = {
                        border,
                        alignment: { horizontal: c % 2 === 0 ? "left" : "right" },
                        numFmt: c % 2 === 1 ? "#,##0.00" : undefined
                    };
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buffer], { type: "application/octet-stream" }), `Balance_Sheet_${formatLocalYMD(asOfDate)}.xlsx`);
    };

    const handlePrint = () => {
        const content = document.getElementById("balanceSheetPrintArea");
        if (!content) return;

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`<html><head><title>Balance Sheet</title>
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
                .bs-side-table th, .bs-side-table td { font-size: 10px !important; padding: 4px 6px !important; }
                .bs-summary-grid { margin-bottom: 8px !important; }
            </style>
            </head><body><div class="bs-print-shell">${content.innerHTML}</div>
            <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},400);};<\/script>
            </body></html>`);
        printWindow.document.close();
    };

    const renderSidePanel = (side, groups, total) => (
        <div className={`bs-side-panel bs-side-${side.toLowerCase()}`}>
            <div className="bs-side-heading">
                <div>
                    <div className="bs-side-title">{SIDE_LABELS[side]}</div>
                    <div className="bs-side-subtitle">{groups.reduce((count, group) => count + group.rows.length, 0)} ledgers</div>
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

                        {groups.map(group => (
                            <React.Fragment key={`${side}-${group.groupName}`}>
                                <tr className="bs-group-row">
                                    <td>{group.groupName}</td>
                                    <td className="text-end">{formatMoney(group.total)}</td>
                                </tr>
                                {group.rows.map(row => (
                                    <tr key={`${side}-${group.groupName}-${row.ledgerId ?? row.ledgerName}`}>
                                        <td>
                                            <span className="bs-ledger-name">{row.ledgerName}</span>
                                        </td>
                                        <td className="text-end">{formatMoney(row.amount)}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>{SIDE_LABELS[side]} Total</td>
                            <td className="text-end">{formatMoney(total)}</td>
                        </tr>
                    </tfoot>
                </Table>
            </div>
        </div>
    );

    return (
        <React.Fragment>
            <div className="page-content balance-sheet-page">
                <Container fluid>
                    <BreadCrumb title="Balance Sheet" pageTitle="Reports" />

                    <Card className="mb-2 bs-filter-card">
                        <CardBody className="py-2">
                            <Row className="g-3 align-items-end">
                                <Col xxl={2} lg={3} md={4}>
                                    <Label className="form-label text-muted text-uppercase fw-semibold mb-1">As of Date</Label>
                                    <Flatpickr
                                        className="form-control"
                                        value={asOfDate}
                                        onChange={([date]) => setAsOfDate(date)}
                                        options={{ dateFormat: "d M Y", maxDate: "today" }}
                                    />
                                </Col>
                                <Col xxl={2} lg={3} md={4}>
                                    <div className="d-flex gap-2">
                                        <Button color="primary" className="flex-grow-1" onClick={fetchReport} disabled={loading}>
                                            {loading
                                                ? <><Spinner size="sm" className="me-1" />Loading...</>
                                                : <><i className="ri-filter-2-line me-1" />Generate</>}
                                        </Button>
                                        <Button
                                            color="light"
                                            className="bs-icon-btn"
                                            onClick={() => { setQuery(""); setHideZero(true); }}
                                            disabled={loading}
                                            title="Reset filters"
                                        >
                                            <i className="ri-refresh-line fs-5" />
                                        </Button>
                                    </div>
                                </Col>
                                <Col xxl={5} lg={6} md={8}>
                                    <Label className="form-label text-muted text-uppercase fw-semibold mb-1">Search ledger</Label>
                                    <div className="d-flex gap-2 bs-toolbar-row">
                                        <Input
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            placeholder="Type ledger or group name..."
                                        />
                                        <div className="bs-actions">
                                            <div className="form-check form-switch">
                                                <Input
                                                    id="bsHideZero"
                                                    type="switch"
                                                    className="form-check-input"
                                                    checked={hideZero}
                                                    onChange={(event) => setHideZero(event.target.checked)}
                                                />
                                                <Label className="form-check-label" htmlFor="bsHideZero">Hide zero</Label>
                                            </div>
                                            <Button color="success" outline onClick={handleExcel} disabled={!shownRows.length} title="Export Excel">
                                                <i className="ri-file-excel-2-line" />
                                            </Button>
                                            <Button color="secondary" outline onClick={handlePrint} disabled={!shownRows.length} title="Print">
                                                <i className="ri-printer-line" />
                                            </Button>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                            {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
                        </CardBody>
                    </Card>

                    {reportData && detailRows.length > 0 && (
                        <Card id="balanceSheetPrintArea" className="bs-report-card">
                            <HeaderForAllReport
                                reportName="Balance Sheet"
                                reportMeta={
                                    <>
                                        <span className={`rpt-header-status rpt-header-status--${isBalanced ? "success" : "warning"}`}>
                                            {isBalanced ? "Balanced" : "Difference"}
                                        </span>
                                        <span className="rpt-header-meta">As of {formatDate(asOfDate)}</span>
                                        <span className="rpt-header-meta-sep" aria-hidden="true" />
                                        <span className="rpt-header-meta">
                                            Showing {shownRows.length} of {detailRows.length} ledgers
                                            {query.trim() ? <> · Filter: {query.trim()}</> : null}
                                        </span>
                                    </>
                                }
                            />

                            <CardBody className="bs-report-body">
                                <div className="bs-summary-grid">
                                    <div className="bs-summary-tile bs-summary-liability">
                                        <span>Liabilities & Equity</span>
                                        <strong>{formatMoney(liabilityTotal)}</strong>
                                    </div>
                                    <div className="bs-summary-tile bs-summary-asset">
                                        <span>Assets</span>
                                        <strong>{formatMoney(assetTotal)}</strong>
                                    </div>
                                    <div className={`bs-summary-tile ${isBalanced ? "bs-summary-balanced" : "bs-summary-diff"}`}>
                                        <span>Difference</span>
                                        <strong>{formatMoney(Math.abs(difference))}</strong>
                                    </div>
                                </div>

                                <div className="bs-side-grid">
                                    {renderSidePanel("LIABILITIES", liabilityGroups, liabilityTotal)}
                                    {renderSidePanel("ASSETS", assetGroups, assetTotal)}
                                </div>
                            </CardBody>

                            <FooterForAllRpt />
                        </Card>
                    )}

                    {loading && (
                        <Card>
                            <CardBody className="py-5 text-center">
                                <Spinner className="me-2" />
                                Loading Balance Sheet...
                            </CardBody>
                        </Card>
                    )}

                    {!loading && reportData && detailRows.length === 0 && (
                        <Card>
                            <CardBody className="text-center py-5 text-muted">
                                <i className="ri-inbox-2-line fs-1 mb-2 d-block" />
                                No balance sheet rows found for the selected date.
                            </CardBody>
                        </Card>
                    )}

                    {!loading && reportData && detailRows.length > 0 && shownRows.length === 0 && (
                        <Card>
                            <CardBody className="text-center py-5">
                                <div className="text-muted mb-2">No ledgers match your filters.</div>
                                <Button color="primary" outline onClick={() => { setQuery(""); setHideZero(false); }}>
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

export default BalanceSheetReport;
