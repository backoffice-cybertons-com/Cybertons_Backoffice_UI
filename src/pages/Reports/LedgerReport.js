import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardBody, Col, Container, Row, Input, Button, Label, Table, Spinner, Badge } from 'reactstrap';
import Select from 'react-select';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import { getLedgerSummaryDatewise } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import BreadCrumb from '../../Components/Common/BreadCrumb';
import './LedgerSummaryDatewiseReport.css';

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

const LedgerReport = () => {
    document.title = 'Ledger Report | SoftBook';
    const api = new APIClient();

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [fromDate, setFromDate] = useState(toLocalYMD(firstOfMonth));
    const [toDate, setToDate] = useState(toLocalYMD(today));

    const [reportData, setReportData] = useState(null); // { type: 'detailed' | 'summary', data: any }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch accounts (Parties / Ledgers) for the dropdown
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
            } catch (err) {
                console.error("Error fetching accounts:", err);
            }
        };
        fetchAccounts();
    }, []);

    const fetchReport = async (mode) => {
        if (!selectedAccount) {
            setError("Please select an account.");
            return;
        }
        if (!fromDate || !toDate) {
            setError("Please select a valid date range.");
            return;
        }

        setLoading(true);
        setError("");
        setReportData(null);

        const companyId = secureStorage.getPlain('companyId') || 10001;

        try {
            if (mode === 'detailed') {
                const response = await api.get(url.GET_LEDGER_REPORT, {
                    companyId: companyId,
                    accountCode: selectedAccount.value,
                    fromDate: fromDate,
                    toDate: toDate
                });
                setReportData({ type: 'detailed', ...response });
            } else if (mode === 'summary') {
                const raw = await getLedgerSummaryDatewise(companyId, selectedAccount.value, fromDate, toDate);
                const rows = Array.isArray(raw) ? raw : (raw?.data || []);
                setReportData({ type: 'summary', rows: rows });
            }
        } catch (err) {
            console.error("Error fetching ledger:", err);
            setError("Failed to fetch report.");
        } finally {
            setLoading(false);
        }
    };

    // ------------- DETAILED VIEW HELPERS -------------
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

    const handlePrintDetailed = () => {
        const printContent = document.getElementById('ledgerReportViewDetailed');
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Ledger Statement - ${selectedAccount?.label}</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                    <style>
                        body { padding: 20px; background: white !important; font-family: sans-serif; }
                        .card { border: none !important; box-shadow: none !important; }
                        .text-success { color: #28a745 !important; }
                        .text-danger { color: #dc3545 !important; }
                        @media print { .d-print-none { display: none !important; } }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                    <script>
                        window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExcelDetailed = () => {
        if (!reportData || reportData.type !== 'detailed' || !reportData.entries) return;
        const debitData = reportData.entries.filter(e => e.debit !== 0).map(e => ({
            Date: fmtDate(e.jvDate), 'Vch Type': e.vType, 'Vch No': e.vCode, Particulars: e.description, Amount: e.debit
        }));
        const creditData = reportData.entries.filter(e => e.credit !== 0).map(e => ({
            Date: fmtDate(e.jvDate), 'Vch Type': e.vType, 'Vch No': e.vCode, Particulars: e.description, Amount: e.credit
        }));

        const ws = XLSX.utils.json_to_sheet([]);
        const heading = `Ledger Statement for ${selectedAccount?.label} from ${fmtDate(fromDate)} to ${fmtDate(toDate)}`;
        XLSX.utils.sheet_add_aoa(ws, [[heading]], { origin: "A1" });
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
        XLSX.utils.sheet_add_aoa(ws, [["DEBIT SIDE", "", "", "", "", "CREDIT SIDE"]], { origin: "A3" });
        XLSX.utils.sheet_add_aoa(ws, [["Date", "Type", "No", "Particulars", "Amount", "", "Date", "Type", "No", "Particulars", "Amount"]], { origin: "A4" });
        XLSX.utils.sheet_add_json(ws, debitData, { origin: "A5", skipHeader: true });
        XLSX.utils.sheet_add_json(ws, creditData, { origin: "G5", skipHeader: true });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ledger");
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buf]), `${selectedAccount?.label}_Ledger.xlsx`);
    };

    // ------------- SUMMARY VIEW HELPERS -------------
    const summaryDataRows = useMemo(() => {
        if (!reportData || reportData.type !== 'summary') return { openingRow: null, totalRow: null, dataRows: [] };
        const rows = reportData.rows || [];
        const opening = rows.find(r => (r.resParticular || '').toLowerCase() === 'opening balance') || null;
        const total   = rows.find(r => (r.resParticular || '').toLowerCase() === 'total') || null;
        const data    = rows.filter(r => {
            const p = (r.resParticular || '').toLowerCase();
            return p !== 'opening balance' && p !== 'total';
        });
        return { openingRow: opening, totalRow: total, dataRows: data };
    }, [reportData]);

    const summaryClosingBal = useMemo(() => {
        if (!reportData || reportData.type !== 'summary') return null;
        const last = [...summaryDataRows.dataRows].pop();
        return last?.resBalance ?? summaryDataRows.openingRow?.resBalance ?? null;
    }, [summaryDataRows, reportData]);

    const handleExcelSummary = () => {
        if (!reportData || reportData.type !== 'summary' || !reportData.rows?.length) return;
        const { openingRow, totalRow, dataRows } = summaryDataRows;
        const rows = [
            ['Ledger Summary – Datewise', '', '', '', ''],
            ['Account:', selectedAccount?.label, '', '', ''],
            ['Period:', `${fmtDate(fromDate)} to ${fmtDate(toDate)}`, '', '', ''],
            ['', '', '', '', ''],
            ['Date', 'Particular', 'Debit (₹)', 'Credit (₹)', 'Balance'],
        ];
        if (openingRow) rows.push([fmtDate(openingRow.resDate), 'Opening Balance', openingRow.resDebit || '', openingRow.resCredit || '', balanceLabel(openingRow.resBalance)]);
        dataRows.forEach(r => rows.push([fmtDate(r.resDate), r.resParticular, r.resDebit || '', r.resCredit || '', balanceLabel(r.resBalance)]));
        if (totalRow) rows.push(['', 'TOTAL', totalRow.resDebit || '', totalRow.resCredit || '', '']);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ledger Summary');
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buf]), `LedgerSummary_${selectedAccount?.label}_${fromDate}_${toDate}.xlsx`);
    };

    const handlePrintSummary = () => {
        const el = document.getElementById('ledgerReportViewSummary');
        if (!el) return;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Ledger Summary</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
              @page { size: A4 portrait; margin: 12mm; }
              body { font-family: system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .table > :not(caption) > * > * { padding: 5px 8px; }
              .lsd-opening-row td { background: #f0f9ff !important; font-style: italic; }
              .lsd-total-row td { background: #f8f9fa !important; font-weight: 700; border-top: 2px solid #dee2e6; }
              .bal-dr { color: #198754 !important; }
              .bal-cr { color: #dc3545 !important; }
              @media print { .d-print-none { display: none !important; } }
            </style>
            </head><body>${el.innerHTML}
            <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},400)};<\/script>
            </body></html>`);
        w.document.close();
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Ledger Report" pageTitle="Reports" />

                    {/* Filter Card */}
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <Row className="g-3 align-items-end">
                                        <Col lg={4}>
                                            <Label className="form-label text-muted text-uppercase fw-semibold mb-1">Account / Ledger</Label>
                                            <Select
                                                inputId="account-select"
                                                value={selectedAccount}
                                                onChange={setSelectedAccount}
                                                options={accounts}
                                                classNamePrefix="select2-selection"
                                                placeholder="Select Account..."
                                                isClearable
                                            />
                                        </Col>
                                        <Col lg={2}>
                                            <Label className="form-label text-muted text-uppercase fw-semibold mb-1">From Date</Label>
                                            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                                        </Col>
                                        <Col lg={2}>
                                            <Label className="form-label text-muted text-uppercase fw-semibold mb-1">To Date</Label>
                                            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                                        </Col>
                                        <Col lg={4}>
                                            <div className="d-flex gap-2">
                                                <Button color="primary" onClick={() => fetchReport('detailed')} disabled={loading}>
                                                    {loading && reportData?.type === 'detailed' ? <Spinner size="sm" className="me-2"/> : <i className="ri-list-unordered me-1 align-bottom"></i>}
                                                    Detailed Ledger
                                                </Button>
                                                <Button color="info" onClick={() => fetchReport('summary')} disabled={loading}>
                                                    {loading && reportData?.type === 'summary' ? <Spinner size="sm" className="me-2"/> : <i className="ri-calendar-event-line me-1 align-bottom"></i>}
                                                    Datewise Summary
                                                </Button>
                                                <Button color="light" title="Reset" onClick={() => { setSelectedAccount(null); setReportData(null); setError(''); }} disabled={loading}>
                                                    <i className="ri-refresh-line fs-5" />
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>
                                    {error && <Row className="mt-3"><Col><div className="alert alert-danger mb-0">{error}</div></Col></Row>}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {/* Loading State */}
                    {loading && (
                        <Row><Col lg={12}>
                            <Card><CardBody className="py-5 text-center"><Spinner className="me-2" />Loading Report...</CardBody></Card>
                        </Col></Row>
                    )}

                    {/* Report Data Card (Detailed) */}
                    {!loading && reportData?.type === 'detailed' && (
                        <Row>
                            <Col lg={12}>
                                <Card id="ledgerReportViewDetailed">
                                    <CardHeader className="border-0 align-items-center d-flex d-print-none">
                                        <h4 className="card-title mb-0 flex-grow-1">
                                            {selectedAccount?.label}
                                            <span className="text-muted fs-11 ms-2">({(reportData.entries || []).filter(e => e.debit !== 0 || e.credit !== 0).length} Records Found)</span>
                                        </h4>
                                        <div className="flex-shrink-0 d-flex align-items-center gap-2">
                                            <h5 className="mb-0 me-3 text-secondary">
                                                Opening: {balanceLabel(reportData.openingBalance)}
                                            </h5>
                                            <h5 className={`mb-0 me-3 ${balClass(reportData.closingBalance)}`}>
                                                Closing: {balanceLabel(reportData.closingBalance)}
                                            </h5>
                                            <Button color="success" outline onClick={handleExcelDetailed} className="btn-sm border-0" title="Export to Excel">
                                                <i className="ri-file-excel-2-line align-bottom fs-4"></i>
                                            </Button>
                                            <Button color="secondary" outline onClick={handlePrintDetailed} className="btn-sm border-0" title="Print Ledger">
                                                <i className="ri-printer-line align-bottom fs-4"></i>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    {/* Header visible only on print */}
                                    <div className="d-none d-print-block p-3 border-bottom text-center">
                                        <h3 className="mb-1">{selectedAccount?.label}</h3>
                                        <p className="text-muted mb-0">
                                            Detailed Ledger Statement from <strong>{fmtDate(fromDate)}</strong> to <strong>{fmtDate(toDate)}</strong>
                                        </p>
                                    </div>
                                    <CardBody className="p-0">
                                        <Row className="g-0">
                                            {/* DEBIT SIDE */}
                                            <Col lg={6} className="border-end">
                                                <div className="p-3 bg-light bg-opacity-50 border-bottom text-center">
                                                    <h6 className="mb-0 text-success fw-bold">DEBIT (Dr)</h6>
                                                </div>
                                                <div className="table-responsive">
                                                    <Table className="table-sm table-nowrap align-middle mb-0">
                                                        <thead className="table-light">
                                                            <tr className="fs-11">
                                                                <th style={{ width: "15%" }}>Date</th>
                                                                <th style={{ width: "15%" }}>Vch Type</th>
                                                                <th style={{ width: "10%" }}>No.</th>
                                                                <th style={{ width: "40%" }}>Particulars</th>
                                                                <th style={{ width: "20%" }} className="text-end">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="fs-12">
                                                            {reportData.entries?.filter(e => e.debit !== 0).map((item, index) => (
                                                                <tr key={`dr-${index}`}>
                                                                    <td>{fmtDate(item.jvDate)}</td>
                                                                    <td>
                                                                        {(["SALES", "SALE", "PURCHASE", "PAYMENT", "RECEIPT", "INCOME", "EXPENSE"].includes(item.vType?.toUpperCase())) ? (
                                                                            <Link to={getVchLink(item)} className="badge bg-info-subtle text-info border-info text-decoration-none">
                                                                                {item.vType} <i className="ri-external-link-line ms-1"></i>
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="badge bg-info-subtle text-info">{item.vType}</span>
                                                                        )}
                                                                    </td>
                                                                    <td>{item.vCode || '-'}</td>
                                                                    <td className="text-wrap" style={{ whiteSpace: "pre-line" }}>{item.description}</td>
                                                                    <td className="text-end fw-medium">{fmtMoney(item.debit)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </Col>

                                            {/* CREDIT SIDE */}
                                            <Col lg={6}>
                                                <div className="p-3 bg-light bg-opacity-50 border-bottom text-center">
                                                    <h6 className="mb-0 text-danger fw-bold">CREDIT (Cr)</h6>
                                                </div>
                                                <div className="table-responsive">
                                                    <Table className="table-sm table-nowrap align-middle mb-0">
                                                        <thead className="table-light">
                                                            <tr className="fs-11">
                                                                <th style={{ width: "15%" }}>Date</th>
                                                                <th style={{ width: "15%" }}>Vch Type</th>
                                                                <th style={{ width: "10%" }}>No.</th>
                                                                <th style={{ width: "40%" }}>Particulars</th>
                                                                <th style={{ width: "20%" }} className="text-end">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="fs-12">
                                                            {reportData.entries?.filter(e => e.credit !== 0).map((item, index) => (
                                                                <tr key={`cr-${index}`}>
                                                                    <td>{fmtDate(item.jvDate)}</td>
                                                                    <td>
                                                                        {(["SALES", "SALE", "PURCHASE", "PAYMENT", "RECEIPT", "INCOME", "EXPENSE"].includes(item.vType?.toUpperCase())) ? (
                                                                            <Link to={getVchLink(item)} className="badge bg-danger-subtle text-danger border-danger text-decoration-none">
                                                                                {item.vType} <i className="ri-external-link-line ms-1"></i>
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="badge bg-danger-subtle text-danger">{item.vType}</span>
                                                                        )}
                                                                    </td>
                                                                    <td>{item.vCode || '-'}</td>
                                                                    <td className="text-wrap" style={{ whiteSpace: "pre-line" }}>{item.description}</td>
                                                                    <td className="text-end fw-medium">{fmtMoney(item.credit)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </Col>
                                        </Row>

                                        {/* Excel-style Balances Footer */}
                                        <Row className="g-0 border-top mt-0">
                                            <Col lg={6} className="border-end p-2 bg-light bg-opacity-30">
                                                <div className="d-flex justify-content-between px-2 fw-bold">
                                                    <span>Total Debit</span>
                                                    <span className="text-success">{fmtMoney(reportData.entries?.reduce((acc, curr) => acc + curr.debit, 0))}</span>
                                                </div>
                                                {reportData.closingBalance < 0 && (
                                                    <div className="d-flex justify-content-between px-2 text-muted fs-11 mt-1">
                                                        <span>By Closing Balance</span>
                                                        <span>{fmtMoney(Math.abs(reportData.closingBalance))}</span>
                                                    </div>
                                                )}
                                            </Col>
                                            <Col lg={6} className="p-2 bg-light bg-opacity-30">
                                                <div className="d-flex justify-content-between px-2 fw-bold">
                                                    <span>Total Credit</span>
                                                    <span className="text-danger">{fmtMoney(reportData.entries?.reduce((acc, curr) => acc + curr.credit, 0))}</span>
                                                </div>
                                                {reportData.closingBalance >= 0 && (
                                                    <div className="d-flex justify-content-between px-2 text-muted fs-11 mt-1">
                                                        <span>To Closing Balance</span>
                                                        <span>{fmtMoney(Math.abs(reportData.closingBalance))}</span>
                                                    </div>
                                                )}
                                            </Col>
                                        </Row>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Report Data Card (Summary) */}
                    {!loading && reportData?.type === 'summary' && (
                        <Row>
                            <Col lg={12}>
                                <Card id="ledgerReportViewSummary">
                                    <CardHeader className="border-0 d-flex align-items-center flex-wrap gap-2 py-2">
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center flex-wrap gap-2">
                                                <h6 className="card-title mb-0 fw-semibold">{selectedAccount?.label} (Summary)</h6>
                                                <span className="text-muted fs-12">
                                                    {fmtDate(fromDate)} – {fmtDate(toDate)}
                                                </span>
                                                <Badge color="info" className="rounded-pill">
                                                    {summaryDataRows.dataRows.length} transaction{summaryDataRows.dataRows.length !== 1 ? 's' : ''}
                                                </Badge>
                                            </div>
                                            <div className="d-flex gap-3 mt-1 fs-12 text-muted">
                                                <span>
                                                    Opening: <strong className={balClass(summaryDataRows.openingRow?.resBalance)}>
                                                        {balanceLabel(summaryDataRows.openingRow?.resBalance || 0)}
                                                    </strong>
                                                </span>
                                                <span>
                                                    Closing: <strong className={balClass(summaryClosingBal)}>
                                                        {balanceLabel(summaryClosingBal)}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2 d-print-none">
                                            <Button color="success" outline size="sm" onClick={handleExcelSummary} title="Export Excel">
                                                <i className="ri-file-excel-2-line fs-5" />
                                            </Button>
                                            <Button color="secondary" outline size="sm" onClick={handlePrintSummary} title="Print">
                                                <i className="ri-printer-line fs-5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    
                                    <div className="d-none d-print-block p-3 border-bottom text-center">
                                        <h3 className="mb-1">{selectedAccount?.label}</h3>
                                        <p className="text-muted mb-0">
                                            Datewise Summary from <strong>{fmtDate(fromDate)}</strong> to <strong>{fmtDate(toDate)}</strong>
                                        </p>
                                    </div>

                                    <CardBody className="pt-0 pb-0">
                                        <Row className="g-2 mb-2 d-print-none mt-1 mx-1">
                                            <Col md={3}>
                                                <div className="lsd-kpi-card border rounded px-3 py-2">
                                                    <div className="lsd-kpi-label text-muted text-uppercase">Opening Balance</div>
                                                    <div className={`lsd-kpi-value fw-bold ${balClass(summaryDataRows.openingRow?.resBalance)}`}>
                                                        {balanceLabel(summaryDataRows.openingRow?.resBalance || 0)}
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="lsd-kpi-card border rounded px-3 py-2">
                                                    <div className="lsd-kpi-label text-muted text-uppercase">Total Debit</div>
                                                    <div className="lsd-kpi-value fw-bold text-success">
                                                        {fmtMoney(summaryDataRows.totalRow?.resDebit || 0)}
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="lsd-kpi-card border rounded px-3 py-2">
                                                    <div className="lsd-kpi-label text-muted text-uppercase">Total Credit</div>
                                                    <div className="lsd-kpi-value fw-bold text-danger">
                                                        {fmtMoney(summaryDataRows.totalRow?.resCredit || 0)}
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="lsd-kpi-card border rounded px-3 py-2">
                                                    <div className="lsd-kpi-label text-muted text-uppercase">Closing Balance</div>
                                                    <div className={`lsd-kpi-value fw-bold ${balClass(summaryClosingBal)}`}>
                                                        {balanceLabel(summaryClosingBal)}
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>

                                        <div className="lsd-table-wrap px-2 pb-2">
                                            <div className="table-responsive lsd-scroll-area">
                                                <Table className="table-hover align-middle mb-0 lsd-table">
                                                    <thead className="table-light">
                                                        <tr className="text-muted text-uppercase">
                                                            <th style={{ width: '12%' }}>Date</th>
                                                            <th style={{ width: '22%' }}>Particular</th>
                                                            <th style={{ width: '20%' }} className="text-end">Debit (₹)</th>
                                                            <th style={{ width: '20%' }} className="text-end">Credit (₹)</th>
                                                            <th style={{ width: '26%' }} className="text-end">Balance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {summaryDataRows.openingRow && (
                                                            <tr className="lsd-opening-row">
                                                                <td className="text-muted fst-italic">{fmtDate(summaryDataRows.openingRow.resDate)}</td>
                                                                <td className="fst-italic text-muted">Opening Balance</td>
                                                                <td className="text-end text-success">
                                                                    {summaryDataRows.openingRow.resDebit > 0 ? fmtMoney(summaryDataRows.openingRow.resDebit) : <span className="text-muted">–</span>}
                                                                </td>
                                                                <td className="text-end text-danger">
                                                                    {summaryDataRows.openingRow.resCredit > 0 ? fmtMoney(summaryDataRows.openingRow.resCredit) : <span className="text-muted">–</span>}
                                                                </td>
                                                                <td className={`text-end fw-semibold ${balClass(summaryDataRows.openingRow.resBalance)}`}>
                                                                    {balanceLabel(summaryDataRows.openingRow.resBalance)}
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {summaryDataRows.dataRows.map((row, idx) => (
                                                            <tr key={idx}>
                                                                <td>{fmtDate(row.resDate)}</td>
                                                                <td>
                                                                    <span className="badge bg-info-subtle text-info me-1">
                                                                        {row.resParticular}
                                                                    </span>
                                                                </td>
                                                                <td className="text-end text-success fw-medium">
                                                                    {row.resDebit > 0 ? fmtMoney(row.resDebit) : <span className="text-muted">–</span>}
                                                                </td>
                                                                <td className="text-end text-danger fw-medium">
                                                                    {row.resCredit > 0 ? fmtMoney(row.resCredit) : <span className="text-muted">–</span>}
                                                                </td>
                                                                <td className={`text-end fw-semibold ${balClass(row.resBalance)}`}>
                                                                    {balanceLabel(row.resBalance)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>

                                            {summaryDataRows.totalRow && (
                                                <div className="lsd-total-strip d-flex align-items-center px-2 py-2 mt-2 border-top">
                                                    <div style={{ width: '34%' }} className="fw-bold text-dark ps-2">TOTAL</div>
                                                    <div style={{ width: '20%' }} className="text-end text-success fw-bold pe-2">
                                                        {fmtMoney(summaryDataRows.totalRow.resDebit || 0)}
                                                    </div>
                                                    <div style={{ width: '20%' }} className="text-end text-danger fw-bold pe-2">
                                                        {fmtMoney(summaryDataRows.totalRow.resCredit || 0)}
                                                    </div>
                                                    <div style={{ width: '26%' }} className="text-end pe-2"></div>
                                                </div>
                                            )}
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}

                </Container>
            </div>
        </React.Fragment>
    );
};

export default LedgerReport;
