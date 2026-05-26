import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardBody, Col, Container, Row, Input, Button, Label, Table, Spinner, Badge } from 'reactstrap';
import Select from 'react-select';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import { getLedgerSummaryDatewise } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import BreadCrumb from '../../Components/Common/BreadCrumb';
import './LedgerSummaryDatewiseReport.css';
import FooterForAllRpt from '../../Components/Common/FooterForAllRpt';
import HeaderForAllReport from '../../Components/Common/HeaderForAllRpt';

/* ────────── helpers ────────── */
const fmtMoney = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toLocalYMD = (d) => {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const balanceLabel = (bal) => {
    if (bal === null || bal === undefined) return '';
    const abs = Math.abs(bal);
    return `${fmtMoney(abs)} ${bal >= 0 ? 'Dr' : 'Cr'}`;
};

const balClass = (bal) => {
    if (bal === null || bal === undefined) return '';
    return bal >= 0 ? 'bal-dr text-success' : 'bal-cr text-danger';
};

const selectLayoutState = (state) => state.Layout;
const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
    layoutModeType: layout.layoutModeType,
}));

const buildLedgerSelectStyles = (isDark) => ({
    menuPortal: (base) => ({ ...base, zIndex: 999999 }),
    control: (base, state) => ({
        ...base,
        backgroundColor: isDark ? '#262a2f' : base.backgroundColor,
        borderColor: state.isFocused ? (isDark ? '#5a6acf' : base.borderColor) : (isDark ? '#2a2f34' : base.borderColor),
        color: isDark ? '#ced4da' : base.color,
    }),
    singleValue: (base) => ({ ...base, color: isDark ? '#ced4da' : base.color }),
    input: (base) => ({ ...base, color: isDark ? '#ced4da' : base.color }),
    menu: (base) => ({
        ...base,
        zIndex: 50,
        backgroundColor: isDark ? '#292e33' : base.backgroundColor,
        border: isDark ? '1px solid #32383e' : base.border,
    }),
    menuList: (base) => ({ ...base, maxHeight: 280 }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? '#405189'
            : state.isFocused
                ? (isDark ? '#2f343a' : base.backgroundColor)
                : (isDark ? '#292e33' : base.backgroundColor),
        color: state.isSelected ? '#fff' : (isDark ? '#ced4da' : base.color),
    }),
    placeholder: (base) => ({ ...base, color: isDark ? '#adb5bd' : base.color }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: isDark ? '#3d4449' : base.backgroundColor }),
    dropdownIndicator: (base) => ({ ...base, color: isDark ? '#adb5bd' : base.color }),
    clearIndicator: (base) => ({ ...base, color: isDark ? '#adb5bd' : base.color }),
});

const LedgerReport = () => {
    const { layoutModeType } = useSelector(selectLayoutProperties);
    const isDarkMode = layoutModeType === 'dark';
    const ledgerSelectProps = useMemo(() => ({
        classNamePrefix: 'lsd-select',
        menuPlacement: 'auto',
        menuShouldScrollIntoView: false,
        styles: buildLedgerSelectStyles(isDarkMode),
    }), [isDarkMode]);
    document.title = 'Ledger Report | SoftBook';
    const api = new APIClient();

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [fromDate, setFromDate] = useState(toLocalYMD(firstOfMonth));
    const [toDate, setToDate] = useState(toLocalYMD(today));
    const [reportType, setReportType] = useState({ value: 'detailed_split', label: 'Dual Ledger' });
    const reportTypeOptions = [
        { value: 'detailed_split', label: 'Dual Ledger' },
        { value: 'detailed_bank', label: 'Running Balance Ledger' },
        { value: 'summary_bank', label: 'Running Balance Ledger Date-wise' },
        { value: 'summary_split', label: 'Dual Ledger Date-wise' },
    ];

    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await api.get(url.GET_PARTIES);
                let accountsData = Array.isArray(response) ? response : (response?.data || []);
                if (accountsData.length > 0) {
                    const options = accountsData.map(p => ({
                        value: p.partyId || p.PartyId || p.id,
                        label: p.displayName || p.DisplayName || p.partyName || p.PartyName || p.name || p.Name || "Unknown Account"
                    }));
                    setAccounts(options);
                }
            } catch (err) { console.error("Error fetching accounts:", err); }
        };
        fetchAccounts();
    }, []);

    const fetchReport = async (modeOverride = null) => {
        if (!selectedAccount) { setError("Please select an account."); return; }
        const mode = modeOverride || reportType.value;
        setLoading(true); setError(""); setReportData(null);
        const companyId = secureStorage.getPlain('companyId') || 10001;
        try {
            if (mode.startsWith('detailed')) {
                const response = await api.get(url.GET_LEDGER_REPORT, { companyId, accountCode: selectedAccount.value, fromDate, toDate });
                setReportData({ type: mode, ...response });
            } else {
                const raw = await getLedgerSummaryDatewise(companyId, selectedAccount.value, fromDate, toDate);
                const rows = Array.isArray(raw) ? raw : (raw?.data || []);
                setReportData({ type: mode, rows: rows });
            }
        } catch (err) { setError("Failed to fetch report."); } finally { setLoading(false); }
    };

    const getVchLink = (item) => {
        if (!item || !item.vType) return "#";
        const vt = item.vType.toUpperCase();
        const vchId = item.vCode || item.id;
        if (!vchId || vchId === 0) return "#";
        if (vt === "SALES" || vt === "SALE") return `/sales-order/edit/${vchId}?view=true`;
        if (vt === "PURCHASE") return `/purchase-transaction/edit/${vchId}?view=true`;
        if (vt === "PAYMENT" || vt === "RECEIPT") return `/payment-receipt/edit/${vchId}?view=true`;
        if (vt === "INCOME" || vt === "EXPENSE") return `/purchases/expense/edit/${vchId}?view=true`;
        return "#";
    };

    const handlePrint = (elementId, title) => {
        const printContent = document.getElementById(elementId);
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>${title}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"><style>body{padding:20px;font-family:sans-serif;font-size:11px;}.text-success{color:#198754 !important;}.text-danger{color:#dc3545 !important;}.bg-light{background-color:#f8f9fa !important;}.table-sm th,.table-sm td{padding:4px 6px;}@media print{.d-print-none{display:none !important;}}</style></head><body>${printContent.innerHTML}<script>window.onload=function(){setTimeout(()=>{window.print();window.close();},500);};<\/script></body></html>`);
        printWindow.document.close();
    };

    const summaryData = useMemo(() => {
        if (!reportData || !reportData.type.startsWith('summary')) return { openingRow: null, totalRow: null, dataRows: [] };
        const rows = reportData.rows || [];
        const opening = rows.find(r => (r.resParticular || '').toLowerCase() === 'opening balance') || null;
        const total = rows.find(r => (r.resParticular || '').toLowerCase() === 'total') || null;
        const data = rows.filter(r => { const p = (r.resParticular || '').toLowerCase(); return p !== 'opening balance' && p !== 'total'; });
        return { openingRow: opening, totalRow: total, dataRows: data };
    }, [reportData]);

    const totals = useMemo(() => {
        if (!reportData) return { dr: 0, cr: 0, closing: 0 };
        if (reportData.type.startsWith('detailed')) {
            const dr = reportData.entries?.reduce((acc, c) => acc + (c.debit || 0), 0) || 0;
            const cr = reportData.entries?.reduce((acc, c) => acc + (c.credit || 0), 0) || 0;
            return { dr, cr, closing: reportData.closingBalance };
        } else {
            const drT = summaryData.dataRows.reduce((acc, c) => acc + (c.resDebit || 0), 0);
            const crT = summaryData.dataRows.reduce((acc, c) => acc + (c.resCredit || 0), 0);
            const drO = summaryData.openingRow?.resDebit || 0;
            const crO = summaryData.openingRow?.resCredit || 0;
            const last = [...summaryData.dataRows].pop();
            return { dr: drT + drO, cr: crT + crO, closing: last?.resBalance ?? summaryData.openingRow?.resBalance ?? 0 };
        }
    }, [reportData, summaryData]);

    const splitDetailRows = useMemo(() => {
        if (!reportData?.entries) return { debit: [], credit: [], debitPad: 0, creditPad: 0 };
        const debit = reportData.entries.filter(e => e.debit !== 0);
        const credit = reportData.entries.filter(e => e.credit !== 0);
        return {
            debit,
            credit,
            debitPad: Math.max(0, credit.length - debit.length),
            creditPad: Math.max(0, debit.length - credit.length),
        };
    }, [reportData]);

    const splitSummaryRows = useMemo(() => {
        const debit = [
            ...(summaryData.openingRow?.resDebit > 0 ? [summaryData.openingRow] : []),
            ...summaryData.dataRows.filter(e => e.resDebit > 0),
        ];
        const credit = [
            ...(summaryData.openingRow?.resCredit > 0 ? [summaryData.openingRow] : []),
            ...summaryData.dataRows.filter(e => e.resCredit > 0),
        ];
        return {
            debit,
            credit,
            debitPad: Math.max(0, credit.length - debit.length),
            creditPad: Math.max(0, debit.length - credit.length),
        };
    }, [summaryData]);

    const renderPadRows = (count, colSpan) =>
        Array.from({ length: count }, (_, i) => (
            <tr key={`pad-${i}`} className="lsd-pad-row" aria-hidden="true">
                <td colSpan={colSpan}>&#8203;</td>
            </tr>
        ));

    // ------------- EXCEL STYLE HELPERS -------------
    const S = {
        title: { font: { bold: true, sz: 14, color: { rgb: "405189" } }, alignment: { horizontal: "left" } },
        period: { font: { italic: true, sz: 10, color: { rgb: "666666" } }, alignment: { horizontal: "left" } },
        headerVal: { font: { bold: true, sz: 10 }, alignment: { horizontal: "left" } },
        drSide: { font: { bold: true, color: { rgb: "198754" } }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "E6FFED" } }, border: { outline: true } },
        crSide: { font: { bold: true, color: { rgb: "DC3545" } }, alignment: { horizontal: "center" }, fill: { fgColor: { rgb: "FFEEF0" } }, border: { outline: true } },
        th: { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "F3F3F9" } }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } },
        cell: { font: { sz: 9 }, border: { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "hair" }, right: { style: "hair" } } },
        num: { font: { sz: 9 }, alignment: { horizontal: "right" }, border: { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "hair" }, right: { style: "hair" } } },
        totalLabel: { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "F8F9FA" } }, border: { top: { style: "thin" } } },
        totalDr: { font: { bold: true, sz: 11, color: { rgb: "198754" } }, alignment: { horizontal: "right" }, fill: { fgColor: { rgb: "F8F9FA" } }, border: { top: { style: "thin" } } },
        totalCr: { font: { bold: true, sz: 11, color: { rgb: "DC3545" } }, alignment: { horizontal: "right" }, fill: { fgColor: { rgb: "F8F9FA" } }, border: { top: { style: "thin" } } },
        closing: { font: { italic: true, sz: 9, color: { rgb: "555555" } }, alignment: { horizontal: "right" } }
    };

    const c = (v, s) => ({ v: v === 0 ? "0.00" : (v || ""), s: s || S.cell });

    const handleExcelExport = () => {
        if (!reportData) return;
        const wb = XLSX.utils.book_new();
        const rows = [];
        const isSplit = reportData.type.endsWith('_split');
        const isDetailed = reportData.type.startsWith('detailed');
        const merges = [];

        // Row 1: Title
        rows.push([c(`${reportType.label} - ${selectedAccount?.label}`, S.title)]);
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: isSplit ? 10 : 6 } });

        // Row 2: Period
        rows.push([c(`${fmtDate(fromDate)} to ${fmtDate(toDate)}`, S.period)]);
        merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: isSplit ? 10 : 6 } });

        // Row 3: Opening/Closing Header Info
        const opBal = reportData.openingBalance || summaryData.openingRow?.resBalance || 0;
        rows.push([c(`Opening Balance: ${balanceLabel(opBal)}`, S.headerVal), "", "", "", "", c(`Closing Balance: ${balanceLabel(totals.closing)}`, S.headerVal)]);
        merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 3 } });
        merges.push({ s: { r: 2, c: 5 }, e: { r: 2, c: isSplit ? 10 : 6 } });

        rows.push([]);

        if (isSplit) {
            const drList = isDetailed ? reportData.entries?.filter(e => e.debit !== 0) : [summaryData.openingRow, ...summaryData.dataRows].filter(e => e && e.resDebit > 0);
            const crList = isDetailed ? reportData.entries?.filter(e => e.credit !== 0) : [summaryData.openingRow, ...summaryData.dataRows].filter(e => e && e.resCredit > 0);

            const headerRowIdx = rows.length;
            rows.push([c("DEBIT SIDE (Dr)", S.drSide), "", "", "", "", "", c("CREDIT SIDE (Cr)", S.crSide)]);
            merges.push({ s: { r: headerRowIdx, c: 0 }, e: { r: headerRowIdx, c: 4 } });
            merges.push({ s: { r: headerRowIdx, c: 6 }, e: { r: headerRowIdx, c: 10 } });

            rows.push([c("Date", S.th), c("Type", S.th), c("No", S.th), c("Particulars", S.th), c("Amount", S.th), "", c("Date", S.th), c("Type", S.th), c("No", S.th), c("Particulars", S.th), c("Amount", S.th)]);

            const max = Math.max(drList.length, crList.length);
            for (let i = 0; i < max; i++) {
                const d = drList[i]; const c_ = crList[i];
                rows.push([
                    c(d ? fmtDate(isDetailed ? d.jvDate : d.resDate) : ""),
                    c(d ? (isDetailed ? d.vType : (d.resParticular || "Summary")) : ""),
                    c(d ? (isDetailed ? d.vCode : "") : ""),
                    c(d ? (isDetailed ? d.description : "") : ""),
                    c(d ? fmtMoney(isDetailed ? d.debit : d.resDebit) : "", S.num),
                    "",
                    c(c_ ? fmtDate(isDetailed ? c_.jvDate : c_.resDate) : ""),
                    c(c_ ? (isDetailed ? c_.vType : (c_.resParticular || "Summary")) : ""),
                    c(c_ ? (isDetailed ? c_.vCode : "") : ""),
                    c(c_ ? (isDetailed ? c_.description : "") : ""),
                    c(c_ ? fmtMoney(isDetailed ? c_.credit : c_.resCredit) : "", S.num)
                ]);
            }
            rows.push([]);
            rows.push([c("TOTAL DEBIT", S.totalLabel), "", "", "", c(fmtMoney(totals.dr), S.totalDr), "", c("TOTAL CREDIT", S.totalLabel), "", "", "", c(fmtMoney(totals.cr), S.totalCr)]);
            
            // [MODIFIED 2026-05-07] Move Closing Balance to appear under Total Credit side in Excel export
            rows.push(["", "", "", "", "", "", c("Closing Balance", S.closing), "", "", "", c(balanceLabel(totals.closing), S.num)]);
        } 
        else {
            const list = isDetailed ? reportData.entries : [summaryData.openingRow, ...summaryData.dataRows].filter(Boolean);
            rows.push([c("Date", S.th), c("Type", S.th), c("No", S.th), c("Particulars", S.th), c("Debit (Dr)", S.th), c("Credit (Cr)", S.th), c("Balance", S.th)]);
            list.forEach(e => {
                rows.push([
                    c(fmtDate(isDetailed ? e.jvDate : e.resDate)),
                    c(isDetailed ? e.vType : (e.resParticular || "Summary")),
                    c(isDetailed ? e.vCode : ""),
                    c(isDetailed ? e.description : ""),
                    c(fmtMoney(isDetailed ? e.debit : e.resDebit), S.num),
                    c(fmtMoney(isDetailed ? e.credit : e.resCredit), S.num),
                    c(balanceLabel(isDetailed ? e.balance : e.resBalance), S.num)
                ]);
            });
            rows.push([]);
            rows.push([c("TOTAL", S.totalLabel), "", "", "", c(fmtMoney(totals.dr), S.totalDr), c(fmtMoney(totals.cr), S.totalCr), c(balanceLabel(totals.closing), S.num)]);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!merges"] = merges;
        ws["!cols"] = isSplit 
            ? [{ wch: 11.82 }, { wch: 12 }, { wch: 8 }, { wch: 45 }, { wch: 12 }, { wch: 4 }, { wch: 11.82 }, { wch: 12 }, { wch: 8 }, { wch: 45 }, { wch: 12 }]
            : [{ wch: 11.82 }, { wch: 15 }, { wch: 10 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
        
        XLSX.utils.book_append_sheet(wb, ws, "Ledger");
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buf]), `${selectedAccount?.label}_${reportType.label.replace(/ /g, '_')}.xlsx`);
    };

    const FinalTotalSection = () => {
        const isBank = reportData?.type?.includes('bank');

        if (isBank) {
            return (
                <div className="lsd-ledger-totals bg-light bg-opacity-50 border-top border-2 py-2 px-3">
                    {/* Row 1: Totals */}
                    <Row className="g-0 align-items-center">
                        <Col lg={4} md={1} className="d-none d-md-block"></Col>
                        <Col lg={2} md={3} sm={4} className="text-end pe-3">
                             <h6 className="mb-0 fw-bold text-uppercase fs-12 text-nowrap">Total Debit</h6>
                        </Col>
                        <Col lg={2} md={3} sm={4} className="text-end">
                            <h5 className="mb-0 fw-bold text-success fs-14">{fmtMoney(totals.dr)}</h5>
                        </Col>
                        <Col lg={2} md={2} sm={4} className="text-end pe-3">
                             <h6 className="mb-0 fw-bold text-uppercase fs-12 text-nowrap">Total Credit</h6>
                        </Col>
                        <Col lg={2} md={3} sm={4} className="text-end">
                             <h5 className="mb-0 fw-bold text-danger fs-14">{fmtMoney(totals.cr)}</h5>
                        </Col>
                    </Row>

                    {/* Row 2: Closing Balance */}
                    <Row className="g-0 mt-2 align-items-center">
                        <Col lg={8} md={7} sm={8}></Col>
                        <Col lg={2} md={2} sm={4} className="text-end pe-3">
                            <span className="text-muted fs-11 fw-medium text-nowrap">Closing Balance</span>
                        </Col>
                        <Col lg={2} md={3} sm={4} className="text-end">
                             <span className={`fw-bold fs-13 ${balClass(totals.closing)}`}>{balanceLabel(totals.closing)}</span>
                        </Col>
                    </Row>
                </div>
            );
        }

        // Original Split Layout (Dual Ledger)
        return (
            <Row className="lsd-ledger-totals g-0 border-top border-2 mt-0 bg-light bg-opacity-50">
                <Col lg={6} className="border-end py-2 px-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold text-uppercase fs-12">Total Debit</h6>
                        <h5 className="mb-0 fw-bold text-success">{fmtMoney(totals.dr)}</h5>
                    </div>
                    {totals.closing < 0 && (<div className="d-flex justify-content-between align-items-center mt-2 text-muted fs-11"><span>By Closing Balance</span><span>{fmtMoney(Math.abs(totals.closing))}</span></div>)}
                </Col>
                <Col lg={6} className="py-2 px-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold text-uppercase fs-12">Total Credit</h6>
                        <h5 className="mb-0 fw-bold text-danger">{fmtMoney(totals.cr)}</h5>
                    </div>
                    {totals.closing >= 0 && (<div className="d-flex justify-content-between align-items-center mt-2 text-muted fs-11"><span>To Closing Balance</span><span>{fmtMoney(Math.abs(totals.closing))}</span></div>)}
                </Col>
            </Row>
        );
    };

    return (
        <React.Fragment>
            <div className={`page-content ledger-report-page${isDarkMode ? ' ledger-report-page--dark' : ''}`}>
                <Container fluid>
                    <BreadCrumb title="Ledger Report" pageTitle="Reports" />
                    <Card className="mb-2 lsd-filter-card">
                        <CardBody className="py-2">
                            <Row className="g-2 align-items-end">
                                <Col xxl={3} lg={3} md={6}><Label className="fw-semibold mb-1">Account</Label><Select value={selectedAccount} onChange={setSelectedAccount} options={accounts} placeholder="Select..." isClearable {...ledgerSelectProps} /></Col>
                                <Col xxl={2} lg={2} md={3} sm={6}><Label className="fw-semibold mb-1">From</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Col>
                                <Col xxl={2} lg={2} md={3} sm={6}><Label className="fw-semibold mb-1">To</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></Col>
                                <Col xxl={3} lg={3} md={6}><Label className="fw-semibold mb-1">Report Style</Label><Select value={reportType} onChange={setReportType} options={reportTypeOptions} {...ledgerSelectProps} /></Col>
                                <Col xxl={2} lg={2} md={6}><Button color="primary" className="w-100" onClick={() => fetchReport()} disabled={loading}>{loading ? <Spinner size="sm" /> : "Show Report"}</Button></Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {loading && <Card><CardBody className="py-5 text-center"><Spinner className="me-2" />Loading...</CardBody></Card>}

                    {!loading && reportData && (
                        <Card id="reportViewContainer" className="report-card-compact">


                            <HeaderForAllReport reportName={"Ledger Report"} />


                            <CardHeader className="border-0 d-flex align-items-center py-2">
                                <div className="flex-grow-1">
                                    <h4 className="mb-1 fw-bold">{selectedAccount?.label}</h4>
                                    <div className="text-muted fs-12">{fmtDate(fromDate)} to {fmtDate(toDate)} | <span className="fw-medium text-info">{reportType.label}</span></div>
                                </div>
                                <div className="d-flex gap-3 align-items-center d-print-none">
                                    <div className="text-end">
                                        <div className="fs-11 text-muted text-uppercase">Opening</div>
                                        <div className="fw-bold">{balanceLabel(reportData.openingBalance || summaryData.openingRow?.resBalance)}</div>
                                    </div>
                                    <div className="text-end border-start ps-3">
                                        <div className="fs-11 text-muted text-uppercase">Closing</div>
                                        <div className={`fw-bold ${balClass(totals.closing)}`}>{balanceLabel(totals.closing)}</div>
                                    </div>
                                    <Button color="success" outline size="sm" onClick={handleExcelExport} title="Download Styled Excel"><i className="ri-file-excel-2-line" /></Button>
                                    <Button color="secondary" outline size="sm" onClick={() => handlePrint('reportViewContainer', reportType.label)} title="Print Report"><i className="ri-printer-line" /></Button>
                                </div>
                            </CardHeader>
                            <CardBody className="p-0 lsd-report-body">
                                <div className="lsd-table-wrap">
                                <div className="lsd-scroll-area">
                                {reportData.type === 'detailed_split' && (
                                    <Row className="g-0 lsd-split-row">
                                        <Col lg={6} className="lsd-split-col border-end">
                                            <Table className="table-sm table-nowrap mb-0"><thead className="table-light"><tr><th colSpan="5" className="text-center text-success py-2">DEBIT (Dr)</th></tr><tr className="fs-11"><th>Date</th><th>Type</th><th>No</th><th>Particulars</th><th className="text-end">Amount</th></tr></thead>
                                                <tbody className="fs-12">
                                                    {splitDetailRows.debit.map((e, i) => (<tr key={i}><td>{fmtDate(e.jvDate)}</td><td><Link to={getVchLink(e)} className="badge bg-info-subtle text-info">{e.vType}</Link></td><td>{e.vCode}</td><td className="text-wrap">{e.description}</td><td className="text-end">{fmtMoney(e.debit)}</td></tr>))}
                                                    {renderPadRows(splitDetailRows.debitPad, 5)}
                                                </tbody></Table>
                                        </Col>
                                        <Col lg={6} className="lsd-split-col">
                                            <Table className="table-sm table-nowrap mb-0"><thead className="table-light"><tr><th colSpan="5" className="text-center text-danger py-2">CREDIT (Cr)</th></tr><tr className="fs-11"><th>Date</th><th>Type</th><th>No</th><th>Particulars</th><th className="text-end">Amount</th></tr></thead>
                                                <tbody className="fs-12">
                                                    {splitDetailRows.credit.map((e, i) => (<tr key={i}><td>{fmtDate(e.jvDate)}</td><td><Link to={getVchLink(e)} className="badge bg-danger-subtle text-danger">{e.vType}</Link></td><td>{e.vCode}</td><td className="text-wrap">{e.description}</td><td className="text-end">{fmtMoney(e.credit)}</td></tr>))}
                                                    {renderPadRows(splitDetailRows.creditPad, 5)}
                                                </tbody></Table>
                                        </Col>
                                    </Row>
                                )}
                                {reportData.type === 'detailed_bank' && (
                                    <Table className="table-hover align-middle mb-0"><thead className="table-light text-uppercase fs-11"><tr><th>Date</th><th>Type</th><th>No</th><th>Particulars</th><th className="text-end">Debit (Dr)</th><th className="text-end">Credit (Cr)</th><th className="text-end">Balance</th></tr></thead>
                                        <tbody className="fs-12">{reportData.entries?.map((e, i) => (<tr key={i}><td>{fmtDate(e.jvDate)}</td><td><Link to={getVchLink(e)} className="badge bg-info-subtle text-info">{e.vType}</Link></td><td>{e.vCode}</td><td className="text-wrap">{e.description}</td><td className="text-end text-success">{e.debit > 0 ? fmtMoney(e.debit) : '-'}</td><td className="text-end text-danger">{e.credit > 0 ? fmtMoney(e.credit) : '-'}</td><td className={`text-end fw-bold ${balClass(e.balance)}`}>{balanceLabel(e.balance)}</td></tr>))}</tbody></Table>
                                )}
                                {reportData.type === 'summary_bank' && (
                                    <Table className="table-hover align-middle mb-0"><thead className="table-light text-uppercase fs-11"><tr><th>Date</th><th>Particular</th><th className="text-end">Debit (₹)</th><th className="text-end">Credit (₹)</th><th className="text-end">Balance</th></tr></thead>
                                        <tbody className="fs-12">
                                            {summaryData.openingRow && (<tr className="bg-light bg-opacity-50"><td>{fmtDate(summaryData.openingRow.resDate)}</td><td className="fst-italic">Opening Balance</td><td className="text-end text-success">{fmtMoney(summaryData.openingRow.resDebit)}</td><td className="text-end text-danger">{fmtMoney(summaryData.openingRow.resCredit)}</td><td className={`text-end fw-bold ${balClass(summaryData.openingRow.resBalance)}`}>{balanceLabel(summaryData.openingRow.resBalance)}</td></tr>)}
                                            {summaryData.dataRows.map((e, i) => (<tr key={i}><td>{fmtDate(e.resDate)}</td><td>{e.resParticular}</td><td className="text-end text-success">{e.resDebit > 0 ? fmtMoney(e.resDebit) : '-'}</td><td className="text-end text-danger">{e.resCredit > 0 ? fmtMoney(e.resCredit) : '-'}</td><td className={`text-end fw-bold ${balClass(e.resBalance)}`}>{balanceLabel(e.resBalance)}</td></tr>))}
                                        </tbody></Table>
                                )}
                                {reportData.type === 'summary_split' && (
                                    <Row className="g-0 lsd-split-row">
                                        <Col lg={6} className="lsd-split-col border-end">
                                            <Table className="table-sm mb-0"><thead className="table-light"><tr><th colSpan="3" className="text-center text-success py-2">DEBIT SUMMARY</th></tr><tr className="fs-11"><th>Date</th><th>Particular</th><th className="text-end">Amount</th></tr></thead>
                                                <tbody className="fs-12">
                                                    {splitSummaryRows.debit.map((e, i) => (
                                                        <tr key={i} className={i === 0 && summaryData.openingRow?.resDebit > 0 ? 'bg-light bg-opacity-50' : ''}>
                                                            <td>{fmtDate(e.resDate)}</td>
                                                            <td>{i === 0 && summaryData.openingRow?.resDebit > 0 ? 'Opening Balance' : e.resParticular}</td>
                                                            <td className="text-end">{fmtMoney(e.resDebit)}</td>
                                                        </tr>
                                                    ))}
                                                    {renderPadRows(splitSummaryRows.debitPad, 3)}
                                                </tbody></Table>
                                        </Col>
                                        <Col lg={6} className="lsd-split-col">
                                            <Table className="table-sm mb-0"><thead className="table-light"><tr><th colSpan="3" className="text-center text-danger py-2">CREDIT SUMMARY</th></tr><tr className="fs-11"><th>Date</th><th>Particular</th><th className="text-end">Amount</th></tr></thead>
                                                <tbody className="fs-12">
                                                    {splitSummaryRows.credit.map((e, i) => (
                                                        <tr key={i} className={i === 0 && summaryData.openingRow?.resCredit > 0 ? 'bg-light bg-opacity-50' : ''}>
                                                            <td>{fmtDate(e.resDate)}</td>
                                                            <td>{i === 0 && summaryData.openingRow?.resCredit > 0 ? 'Opening Balance' : e.resParticular}</td>
                                                            <td className="text-end">{fmtMoney(e.resCredit)}</td>
                                                        </tr>
                                                    ))}
                                                    {renderPadRows(splitSummaryRows.creditPad, 3)}
                                                </tbody></Table>
                                        </Col>
                                    </Row>
                                )}
                                </div>{/* end lsd-scroll-area */}
                                </div>{/* end lsd-table-wrap */}
                                <FinalTotalSection />
                            </CardBody>
                            <FooterForAllRpt />
                        </Card>
                    )}
                </Container>
            </div>
        </React.Fragment>
    );
};

export default LedgerReport;
