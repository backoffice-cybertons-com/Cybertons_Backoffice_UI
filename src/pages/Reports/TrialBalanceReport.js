import React, { useMemo, useState } from 'react';
import {
    Badge,
    Card, CardHeader, CardBody, Col, Container, Row,
    Button, Input, Label, Table, Spinner
} from 'reactstrap';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import Flatpickr from "react-flatpickr";
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { getTrialBalance } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import BreadCrumb from '../../Components/Common/BreadCrumb';
import "./TrialBalanceReport.css";
import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";

const selectLayoutState = (state) => state.Layout;
const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
    layoutModeType: layout.layoutModeType,
}));

const TrialBalanceReport = () => {
    const { layoutModeType } = useSelector(selectLayoutProperties);
    const isDarkMode = layoutModeType === 'dark';
    const [asOfDate, setAsOfDate] = useState(new Date());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [hideZero, setHideZero] = useState(true);
    const [sortBy, setSortBy] = useState({ key: 'accountName', dir: 'asc' }); // key: accountName|debit|credit

    const formatLocalYMD = (d) => {
        if (!d) return '';
        const date = d instanceof Date ? d : new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const formatMoney = (amount) => {
        return Number(amount || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (d) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const companyName = secureStorage.getPlain('companyName') || secureStorage.getPlain('CompanyName') || 'SoftBook';

    const fetchReport = async () => {
        if (!asOfDate) {
            setError('Please select a date.');
            return;
        }
        setLoading(true);
        setError('');
        setReportData(null);
        try {
            const dateStr = formatLocalYMD(asOfDate);
            const companyId = secureStorage.getPlain('companyId') || 10001; // fallback if missing
            const response = await getTrialBalance(companyId, dateStr);

            const data = Array.isArray(response) ? response : (response?.data || []);
            setReportData(data);
        } catch (err) {
            console.error('Trial Balance Error:', err);
            setError('Failed to load Trial Balance. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // The backend only provides AccountName, Debit, and Credit
    const rows = (reportData || []).map(row => ({
        accountName: (row.accountName || row.AccountName || '').toString().trim() || 'Unknown',
        debit: Number(row.debit || row.Debit || 0),
        credit: Number(row.credit || row.Credit || 0),
        isTotal: (row.accountName || row.AccountName || '').toUpperCase() === 'TOTAL'
    }));

    // Filter out the 'TOTAL' row sent by the backend so we can calculate it ourselves cleanly
    const accountRows = rows.filter(r => !r.isTotal);

    // Calculate Grand Totals
    const totalDebit = accountRows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = accountRows.reduce((s, r) => s + r.credit, 0);
    const diff = totalDebit - totalCredit;
    const isBalanced = Math.abs(diff) < 0.01;

    const shownRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        let data = accountRows;
        if (hideZero) data = data.filter(r => (r.debit || 0) !== 0 || (r.credit || 0) !== 0);
        if (q) data = data.filter(r => (r.accountName || '').toLowerCase().includes(q));

        const dir = sortBy.dir === 'asc' ? 1 : -1;
        const sorted = [...data].sort((a, b) => {
            if (sortBy.key === 'accountName') return dir * a.accountName.localeCompare(b.accountName);
            return dir * ((a[sortBy.key] || 0) - (b[sortBy.key] || 0));
        });
        return sorted;
    }, [accountRows, hideZero, query, sortBy]);

    const setSort = (key) => {
        setSortBy(prev => {
            if (prev.key !== key) return { key, dir: 'asc' };
            return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
        });
    };

    const sortIcon = (key) => {
        if (sortBy.key !== key) return 'ri-arrow-up-down-line';
        return sortBy.dir === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
    };

    const handleExcel = () => {
        if (!shownRows.length) return;
        const dateLabel = formatDate(asOfDate);

        // Layout: A=Accounts, B=Debit, C=Credit
        const aoa = [
            ["TRIAL BALANCE SHEET", "", ""],
            ["", "", ""],
            ["Company Name:", companyName, ""],
            ["Time Period:", `As of ${dateLabel}`, ""],
            ["", "", ""],
            ["Accounts", "Closing Balance", ""],
            ["", "Debit", "Credit"],
        ];

        // Data rows
        for (const r of shownRows) {
            aoa.push([r.accountName, r.debit || "", r.credit || ""]);
        }
        aoa.push(["Total", totalDebit, totalCredit]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Merges
        ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // title
            { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } }, // "Closing Balance"
        ];

        // Column widths
        ws["!cols"] = [
            { wch: 45 },
            { wch: 18 },
            { wch: 18 },
        ];

        const border = {
            top: { style: "thin", color: { rgb: "2F2F2F" } },
            bottom: { style: "thin", color: { rgb: "2F2F2F" } },
            left: { style: "thin", color: { rgb: "2F2F2F" } },
            right: { style: "thin", color: { rgb: "2F2F2F" } },
        };

        const titleStyle = {
            font: { bold: true, sz: 16, color: { rgb: "1F2937" } },
            alignment: { horizontal: "center", vertical: "center" },
        };

        const headerGreen = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "4B6B1F" } },
            alignment: { horizontal: "center", vertical: "center" },
            border,
        };

        const subHeader = {
            font: { bold: true, color: { rgb: "1F2937" } },
            fill: { patternType: "solid", fgColor: { rgb: "DDE8C6" } },
            alignment: { horizontal: "center", vertical: "center" },
            border,
        };

        const labelStyle = {
            font: { bold: true, color: { rgb: "111827" } },
            alignment: { horizontal: "left" },
        };

        const moneyStyle = {
            numFmt: "#,##0.00",
            alignment: { horizontal: "right" },
            border,
        };

        const nameStyle = {
            alignment: { horizontal: "left" },
            border,
        };

        const totalStyle = {
            font: { bold: true, color: { rgb: "111827" } },
            fill: { patternType: "solid", fgColor: { rgb: "C8E08A" } },
            alignment: { vertical: "center" },
            border,
        };

        // Apply styles
        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const addr = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[addr];
                if (!cell) continue;

                // Title row
                if (R === 0) {
                    cell.s = titleStyle;
                    continue;
                }

                // Labels (Company/Time)
                if (R === 2 || R === 3) {
                    if (C === 0) cell.s = labelStyle;
                    if (C === 1) cell.s = { alignment: { horizontal: "left" } };
                    continue;
                }

                // Header rows
                if (R === 5) {
                    cell.s = headerGreen;
                    continue;
                }
                if (R === 6) {
                    cell.s = subHeader;
                    continue;
                }

                // Data rows (start at 7)
                if (R >= 7) {
                    const isTotalRow = R === range.e.r;
                    if (isTotalRow) {
                        cell.s = { ...totalStyle, ...(C === 0 ? {} : moneyStyle) };
                    } else if (C === 0) {
                        cell.s = nameStyle;
                    } else {
                        cell.s = moneyStyle;
                    }
                }
            }
        }

        // Ensure numeric cells are numbers
        for (let i = 0; i < shownRows.length; i++) {
            const r = 7 + i;
            const debitAddr = XLSX.utils.encode_cell({ r, c: 1 });
            const creditAddr = XLSX.utils.encode_cell({ r, c: 2 });
            if (ws[debitAddr]) ws[debitAddr].t = "n";
            if (ws[creditAddr]) ws[creditAddr].t = "n";
        }
        const totalRowIndex = 7 + shownRows.length;
        const tDebit = XLSX.utils.encode_cell({ r: totalRowIndex, c: 1 });
        const tCredit = XLSX.utils.encode_cell({ r: totalRowIndex, c: 2 });
        if (ws[tDebit]) ws[tDebit].t = "n";
        if (ws[tCredit]) ws[tCredit].t = "n";

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buffer], { type: "application/octet-stream" }), `Trial_Balance_${formatLocalYMD(asOfDate)}.xlsx`);
    };

    const handlePrint = () => {
        const content = document.getElementById('trialBalancePrintArea');
        if (!content) return;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Trial Balance</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <link href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css" rel="stylesheet">
            <style>
              /* Force A4 portrait when printing / saving PDF */
              @page { size: A4 portrait; margin: 12mm; }
              html, body { height: auto; }
              body{
                padding:0;
                font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* A4 page canvas */
              .tb-a4{
                width: 210mm;
                margin: 0 auto;
                background: #fff;
              }

              .table-responsive { overflow: visible !important; }
              .tb-print-title{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:12px}
              .tb-print-title h3{margin:0;font-weight:800;letter-spacing:.2px}
              .tb-print-sub{color:#6c757d;font-size:12px}
              .tb-print-badge{border:1px solid #dee2e6;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700}
              .tb-print-meta{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
              .tb-print-kv{border:1px solid #dee2e6;border-radius:10px;padding:6px 10px;font-size:12px}
              .tb-print-kv b{display:block;font-size:11px;color:#6c757d;font-weight:700;text-transform:uppercase;letter-spacing:.06em}

              /* Print table look (closer to report sheet) */
              table{ page-break-inside:auto; }
              thead{ display: table-header-group; }
              tfoot{ display: table-footer-group; }
              tr{ page-break-inside: avoid; page-break-after:auto; }
              .table > :not(caption) > * > *{ padding: 6px 10px; }
              .table-light{ --bs-table-bg: #f3f4f6; }
              .tb-total-row{ background:#f8f9fa !important; color:#212529 !important; border-top:2px solid #dee2e6 !important; }
              .tb-total-row td:nth-child(2){ color:#198754 !important; }
              .tb-total-row td:nth-child(3){ color:#dc3545 !important; }

              /* Remove sticky behaviors for print */
              .sticky-top, .sticky-bottom { position: static !important; }
            </style>
            </head><body><div class="tb-a4">${content.innerHTML}</div>
            <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},400);};<\/script>
            </body></html>`);
        w.document.close();
    };

    document.title = "Trial Balance | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content trial-balance-page">
                <Container fluid>
                    <BreadCrumb title="Trial Balance" pageTitle="Reports" />

                    {/* Filter Card */}
                    <Row>
                        <Col lg={12}>
                            <Card className="mb-2">
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
                                                    className="tb-icon-btn"
                                                    onClick={() => { setQuery(''); setHideZero(true); }}
                                                    disabled={loading}
                                                    title="Reset filters"
                                                >
                                                    <i className="ri-refresh-line fs-5" />
                                                </Button>
                                            </div>
                                        </Col>
                                        <Col xxl={4} lg={5} md={8}>
                                            <Label className="form-label text-muted text-uppercase fw-semibold mb-1 tb-filter-label">Search account</Label>
                                            <div className="d-flex gap-2 tb-toolbar-search-row">
                                                <Input
                                                    className="tb-toolbar-input flex-grow-1"
                                                    value={query}
                                                    onChange={(e) => setQuery(e.target.value)}
                                                    placeholder="Type account name..."
                                                />
                                                <div className="tb-actions">
                                                    <div className="form-check form-switch">
                                                        <Input
                                                            id="tbHideZero"
                                                            type="switch"
                                                            className="form-check-input"
                                                            checked={hideZero}
                                                            onChange={(e) => setHideZero(e.target.checked)}
                                                        />
                                                        <Label className="form-check-label" htmlFor="tbHideZero">
                                                            Hide zero
                                                        </Label>
                                                    </div>
                                                    <Button
                                                        color="success"
                                                        outline
                                                        onClick={handleExcel}
                                                        title="Export Excel"
                                                        disabled={!shownRows.length}
                                                        className="tb-action-btn"
                                                    >
                                                        <i className="ri-file-excel-2-line" />
                                                    </Button>
                                                    <Button
                                                        color="secondary"
                                                        outline
                                                        onClick={handlePrint}
                                                        title="Print"
                                                        disabled={!accountRows.length}
                                                        className="tb-action-btn"
                                                    >
                                                        <i className="ri-printer-line" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                    {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {/* Report */}
                    {reportData && accountRows.length > 0 && (

                        <Row>
                            <Col lg={12}>
                                <Card id="reportViewContainer" className="report-card-compact">

                                    {/*COMMON HEADER */}
                                    <div className="text-start">
                                        <HeaderForAllReport reportName="Trial Balance" />
                                    </div>

                                    {/* Print-only header */}
                                    <div className="d-none d-print-block p-3 border-bottom">
                                        <div className="tb-print-title">
                                            <div>
                                                <h3 className="mb-1">Trial Balance</h3>
                                                <div className="tb-print-sub">
                                                    <strong>{companyName}</strong> · As of <strong>{formatDate(asOfDate)}</strong>
                                                </div>
                                            </div>
                                            <div className="tb-print-meta">
                                                <div className="tb-print-kv">
                                                    <b>Status</b>
                                                    <span className="tb-print-badge">{isBalanced ? 'Balanced' : 'Not balanced'}</span>
                                                </div>
                                                <div className="tb-print-kv">
                                                    <b>Difference</b>
                                                    {formatMoney(Math.abs(diff))} {isBalanced ? '' : (diff > 0 ? '(Dr)' : '(Cr)')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <CardHeader className="border-0 d-flex align-items-start align-items-md-center flex-wrap gap-1 py-1">
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center flex-wrap gap-2">
                                                <h6 className="card-title mb-0 fs-6 fw-semibold">Trial Balance</h6>
                                                <Badge color={isBalanced ? "success" : "warning"} className="tb-pill">
                                                    {isBalanced ? "Balanced" : "Not balanced"}
                                                </Badge>
                                                <span className="text-muted fs-12">As of <strong>{formatDate(asOfDate)}</strong></span>
                                            </div>
                                            <div className="text-muted fs-11 mt-1">
                                                Showing <strong>{shownRows.length}</strong> of <strong>{accountRows.length}</strong> accounts
                                                {query.trim() ? <> · Filter: <strong>{query.trim()}</strong></> : null}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardBody className="pt-0 pb-0">
                                        <Row className="g-1 mb-1">
                                            <Col md={4}>
                                                <Card className={`tb-summary-card tb-summary-debit${isBalanced ? " tb-summary-balanced" : ""}`}>
                                                    <CardBody className="py-1 px-2">
                                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                                            <div className="text-muted text-uppercase fw-semibold tb-summary-label">Total Debit</div>
                                                            <i className={`ri-arrow-right-up-line tb-summary-icon ${isBalanced ? "text-dark" : "text-success"}`} aria-hidden />
                                                        </div>
                                                        <div className={`tb-summary-value mb-0 ${isBalanced ? "text-dark" : "text-success"}`}>{formatMoney(totalDebit)}</div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                            <Col md={4}>
                                                <Card className={`tb-summary-card tb-summary-credit${isBalanced ? " tb-summary-balanced" : ""}`}>
                                                    <CardBody className="py-1 px-2">
                                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                                            <div className="text-muted text-uppercase fw-semibold tb-summary-label">Total Credit</div>
                                                            <i className={`ri-arrow-right-down-line tb-summary-icon ${isBalanced ? "text-dark" : "text-danger"}`} aria-hidden />
                                                        </div>
                                                        <div className={`tb-summary-value mb-0 ${isBalanced ? "text-dark" : "text-danger"}`}>{formatMoney(totalCredit)}</div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                            <Col md={4}>
                                                <Card className={`tb-summary-card tb-summary-diff${isBalanced ? " tb-summary-balanced" : ""}`}>
                                                    <CardBody className="py-1 px-2">
                                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                                            <div className="text-muted text-uppercase fw-semibold tb-summary-label">Difference</div>
                                                            <i className={`ri-scales-3-line tb-summary-icon ${isBalanced ? "text-dark" : "text-warning"}`} aria-hidden />
                                                        </div>
                                                        <div className={`tb-summary-value mb-0 ${isBalanced ? "text-dark" : "text-warning"}`}>
                                                            {formatMoney(Math.abs(diff))} {isBalanced ? "" : (diff > 0 ? "(Dr)" : "(Cr)")}
                                                        </div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                        </Row>

                                        <div className="tb-table-wrap">
                                            <div className="table-responsive">
                                                <Table className="table-hover align-middle mb-0 tb-table">
                                                    <thead className="table-light sticky-top" style={{ zIndex: 2 }}>
                                                        <tr className="text-muted text-uppercase">
                                                            <th style={{ width: '50%' }} className="ps-3">
                                                                <button type="button" className="tb-th-btn" onClick={() => setSort('accountName')}>
                                                                    Account Name <i className={sortIcon('accountName')} />
                                                                </button>
                                                            </th>
                                                            <th style={{ width: '25%' }} className="text-end">
                                                                <button type="button" className="tb-th-btn tb-th-btn-end" onClick={() => setSort('debit')}>
                                                                    Debit (₹) <i className={sortIcon('debit')} />
                                                                </button>
                                                            </th>
                                                            <th style={{ width: '25%' }} className="text-end pe-3">
                                                                <button type="button" className="tb-th-btn tb-th-btn-end" onClick={() => setSort('credit')}>
                                                                    Credit (₹) <i className={sortIcon('credit')} />
                                                                </button>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {shownRows.map((row, idx) => (
                                                            <tr key={`${row.accountName}-${idx}`}>
                                                                <td className="ps-3 fw-medium">
                                                                    <div className="d-flex align-items-center">
                                                                        <i className="ri-file-list-3-line text-muted me-2" />
                                                                        <span className="tb-account">{row.accountName}</span>
                                                                    </div>
                                                                </td>
                                                                <td className={`text-end fw-medium ${isBalanced ? "text-dark" : "text-success"}`}>
                                                                    {row.debit > 0 ? formatMoney(row.debit) : <span className="text-muted">-</span>}
                                                                </td>
                                                                <td className={`text-end pe-3 fw-medium ${isBalanced ? "text-dark" : "text-danger"}`}>
                                                                    {row.credit > 0 ? formatMoney(row.credit) : <span className="text-muted">-</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>

                                            {/* Static Total Strip Under Table */}
                                            <div className="tb-total-strip d-flex align-items-center py-2">
                                                <div style={{ width: '50%' }} className="text-start ps-4 tb-grand-total-label fw-bold">GRAND TOTAL</div>
                                                <div style={{ width: '25%' }} className={`text-end fw-bold ${isBalanced ? "text-dark" : "text-success"}`}>{formatMoney(totalDebit)}</div>
                                                <div style={{ width: '25%' }} className={`text-end pe-3 fw-bold ${isBalanced ? "text-dark" : "text-danger"}`}>{formatMoney(totalCredit)}</div>
                                            </div>
                                        </div>
                                    </CardBody>

                                    <FooterForAllRpt />

                                </Card>
                            </Col>
                        </Row>
                    )}

                    {loading && (
                        <Row>
                            <Col lg={12}>
                                <Card>
                                    <CardBody className="py-5 text-center">
                                        <Spinner className="me-2" />
                                        Loading Trial Balance...
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {!loading && reportData && accountRows.length === 0 && (
                        <Card>
                            <CardBody className="text-center py-5 text-muted">
                                <i className="ri-inbox-2-line fs-1 mb-2 d-block" />
                                No transactions found for the selected date.
                            </CardBody>
                        </Card>
                    )}

                    {!loading && reportData && accountRows.length > 0 && shownRows.length === 0 && (
                        <Card>
                            <CardBody className="text-center py-5">
                                <div className="text-muted mb-2">
                                    No accounts match your filters.
                                </div>
                                <Button color="primary" outline onClick={() => { setQuery(''); setHideZero(false); }}>
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

export default TrialBalanceReport;
