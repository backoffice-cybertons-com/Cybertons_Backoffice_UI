import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardBody, Col, Container, Row, Input, Button, Label, Table, Spinner, Badge } from 'reactstrap';
import Select from 'react-select';
import Flatpickr from "react-flatpickr";
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";

const LedgerReport = () => {
    const api = new APIClient();

    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [dateRange, setDateRange] = useState([
        new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
        new Date() // Today
    ]);

    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    const fromRef = useRef(null);
    const toRef = useRef(null);

    const [fromDate, setFromDate] = useState("2026-01-01");
    const [toDate, setToDate] = useState("2026-12-31");

    // Fetch accounts (Parties / Ledgers) for the dropdown
    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                // Fetching parties using standard API client
                const response = await api.get(url.GET_PARTIES);

                let accountsData = [];
                // The APIClient already returns response.data OR the array itself based on interceptors
                if (Array.isArray(response)) {
                    accountsData = response;
                } else if (response && Array.isArray(response.data)) {
                    accountsData = response.data;
                }

                if (accountsData.length > 0) {
                    const options = accountsData
                        .map(p => ({
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

    const fetchLedger = async () => {
        if (!selectedAccount) {
            setError("Please select an account.");
            return;
        }
        if (!dateRange || dateRange.length < 2) {
            setError("Please select a valid date range.");
            return;
        }

        setLoading(true);
        setError("");
        setReportData(null);

        try {
            const formatLocalYMD = (d) => {
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            };

            // const fDate = fromDate;
            // const tDate = toDate;
            console.log("fromDate", fromRef.current.value);
            console.log("toDate", toRef.current.value);

            const response = await api.get(url.GET_LEDGER_REPORT, {
                accountCode: selectedAccount.value,
                fromDate: fromRef.current.value,
                toDate: toRef.current.value
            });

            // APIClient handles the .data nesting
            setReportData(response);
        } catch (err) {
            console.error("Error fetching ledger:", err);
            console.log(err.response?.data);
            console.log(err.response?.status);
            setError(err || "Failed to fetch ledger report.");
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getVchLink = (item) => {
        if (!item || !item.vType) return "#";
        const vt = item.vType.toUpperCase();

        // For link construction, we prioritize vCode (which is res_v_code from SQL)
        // But for some types like Payment/Receipt, the primary identifier might be the jv_code (item.id)
        const vchId = item.vCode || item.id;

        if (!vchId || vchId === 0) {
            console.warn(`LedgerReport: No valid ID found for ${item.vType}`, item);
        }

        if (vt === "SALES" || vt === "SALE") return `/sales-order/edit/${vchId}?view=true`;
        if (vt === "PURCHASE") return `/purchase-transaction/edit/${vchId}?view=true`;
        if (vt === "PAYMENT" || vt === "RECEIPT") return `/payment-receipt/edit/${vchId}?view=true`;
        if (vt === "INCOME" || vt === "EXPENSE") return `/purchases/expense/edit/${vchId}?view=true`;
        return "#";
    };

    const handlePrint = () => {
        const printContent = document.getElementById('ledgerReportView');
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
                        .table-responsive { overflow: visible !important; }
                        .badge { border: 1px solid #ddd; padding: 2px 5px; border-radius: 4px; }
                        .text-success { color: #28a745 !important; }
                        .text-danger { color: #dc3545 !important; }
                        .text-muted { color: #6c757d !important; }
                        h3, h4, h5 { margin-bottom: 10px; text-align: center; }
                        .row { display: flex; flex-wrap: nowrap; }
                        .col-6 { flex: 0 0 50%; width: 50%; box-sizing: border-box; padding: 10px; }
                        @media print {
                            .d-print-none { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadExcel = () => {
        if (!reportData || !reportData.entries) return;

        // Prepare data for Excel
        const debitData = reportData.entries.filter(e => e.debit !== 0).map(e => ({
            Date: formatDate(e.jvDate),
            'Vch Type': e.vType,
            'Vch No': e.vCode,
            Particulars: e.description,
            Amount: e.debit
        }));

        const creditData = reportData.entries.filter(e => e.credit !== 0).map(e => ({
            Date: formatDate(e.jvDate),
            'Vch Type': e.vType,
            'Vch No': e.vCode,
            Particulars: e.description,
            Amount: e.credit
        }));

        // Create Worksheet
        const ws = XLSX.utils.json_to_sheet([]);
        const heading = `Ledger Statement for ${selectedAccount?.label || 'Account'} from ${formatDate(dateRange[0])} to ${formatDate(dateRange[1])}`;
        XLSX.utils.sheet_add_aoa(ws, [[heading]], { origin: "A1" });

        // Merge heading across 11 columns (A to K)
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];

        XLSX.utils.sheet_add_aoa(ws, [["DEBIT SIDE", "", "", "", "", "CREDIT SIDE"]], { origin: "A3" });
        XLSX.utils.sheet_add_aoa(ws, [["Date", "Type", "No", "Particulars", "Amount", "", "Date", "Type", "No", "Particulars", "Amount"]], { origin: "A4" });

        // Add Debit table
        XLSX.utils.sheet_add_json(ws, debitData, { origin: "A5", skipHeader: true });

        // Add Credit table starting at column G
        XLSX.utils.sheet_add_json(ws, creditData, { origin: "G5", skipHeader: true });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ledger");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `${selectedAccount?.label}_Ledger.xlsx`);
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    {/* Header */}
                    <Row className="mb-3 pb-1">
                        <Col xs={12}>
                            <div className="d-flex align-items-lg-center flex-lg-row flex-column">
                                <div className="flex-grow-1">
                                    <h4 className="fs-16 mb-1">Ledger Report</h4>
                                    <p className="text-muted mb-0">View highly detailed transaction history for any account.</p>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {/* Filter Card */}
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <Row className="g-3">
                                        <Col lg={4}>
                                            <div className="mb-3 mb-lg-0">
                                                <Label htmlFor="account-select" className="form-label text-muted text-uppercase fw-semibold mb-1">Account / Ledger</Label>
                                                <Select
                                                    inputId="account-select"
                                                    value={selectedAccount}
                                                    onChange={setSelectedAccount}
                                                    options={accounts}
                                                    classNamePrefix="select2-selection"
                                                    placeholder="Select Account..."
                                                />
                                            </div>
                                        </Col>
                                        <Col lg={2}>
                                            <div className="mb-3 mb-lg-0">
                                                <Label className="form-label text-muted text-uppercase fw-semibold mb-1">
                                                    From Date
                                                </Label>
                                                <Input
                                                    type="date"
                                                    defaultValue={fromDate}
                                                    innerRef={fromRef}
                                                />
                                            </div>
                                        </Col>

                                        <Col lg={2}>
                                            <div className="mb-3 mb-lg-0">
                                                <Label className="form-label text-muted text-uppercase fw-semibold mb-1">
                                                    To Date
                                                </Label>

                                                <Input
                                                    type="date"
                                                    defaultValue={toDate}
                                                    innerRef={toRef}
                                                />
                                            </div>
                                        </Col>
                                        <Col lg={4} className="d-flex align-items-end">
                                            <div className="w-100 mb-3 mb-lg-0">
                                                <Button color="primary" className="w-100" onClick={fetchLedger} disabled={loading}>
                                                    {loading ? <Spinner size="sm" className="me-2" /> : <i className="ri-filter-2-line me-1 align-bottom"></i>}
                                                    Generate Report
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>
                                    {error && (
                                        <Row className="mt-3">
                                            <Col>
                                                <div className="alert alert-danger mb-0">{error}</div>
                                            </Col>
                                        </Row>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {/* Report Data Card */}
                    {reportData && (
                        <Row>
                            <Col lg={12}>
                                <Card id="ledgerReportView">
                                    <CardHeader className="border-0 align-items-center d-flex d-print-none">
                                        <h4 className="card-title mb-0 flex-grow-1">
                                            {selectedAccount?.label}
                                            <span className="text-muted fs-11 ms-2">({(reportData.entries || []).filter(e => e.debit !== 0 || e.credit !== 0).length} Records Found)</span>
                                        </h4>
                                        <div className="flex-shrink-0 d-flex align-items-center gap-2">
                                            <h5 className={`mb-0 me-3 ${reportData.openingBalance >= 0 ? "text-secondary" : "text-secondary"}`}>
                                                Opening: {formatMoney(Math.abs(reportData.openingBalance))} {reportData.openingBalance >= 0 ? 'Dr' : 'Cr'}
                                            </h5>
                                            <h5 className={`mb-0 me-3 ${reportData.closingBalance >= 0 ? "text-success" : "text-danger"}`}>
                                                Closing: {formatMoney(Math.abs(reportData.closingBalance))} {reportData.closingBalance >= 0 ? 'Dr' : 'Cr'}
                                            </h5>
                                            <Button color="success" outline onClick={handleDownloadExcel} className="btn-sm border-0" title="Export to Excel">
                                                <i className="ri-file-excel-2-line align-bottom fs-4"></i>
                                            </Button>
                                            <Button color="secondary" outline onClick={handlePrint} className="btn-sm border-0" title="Print Ledger">
                                                <i className="ri-printer-line align-bottom fs-4"></i>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    {/* Header visible only on print */}
                                    <div className="d-none d-print-block p-3 border-bottom text-center">
                                        <h3 className="mb-1">{selectedAccount?.label}</h3>
                                        <p className="text-muted mb-0">
                                            Ledger Statement from <strong>{formatDate(dateRange[0])}</strong> to <strong>{formatDate(dateRange[1])}</strong>
                                        </p>
                                    </div>
                                    <CardBody className="p-0">
                                        <Row className="g-0">
                                            {/* DEBIT SIDE (Left) */}
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
                                                                    <td>{formatDate(item.jvDate)}</td>
                                                                    <td>
                                                                        {(["SALES", "SALE", "PURCHASE", "PAYMENT", "RECEIPT", "INCOME", "EXPENSE"].includes(item.vType?.toUpperCase())) ? (
                                                                            <Link
                                                                                to={getVchLink(item)}
                                                                                className="badge bg-info-subtle text-info border-info text-decoration-none"
                                                                                onClick={(e) => {
                                                                                    if (getVchLink(item) === "#") e.preventDefault();
                                                                                }}
                                                                            >
                                                                                {item.vType} <i className="ri-external-link-line ms-1"></i>
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="badge bg-info-subtle text-info">{item.vType}</span>
                                                                        )}
                                                                    </td>
                                                                    <td>{item.vCode || '-'}</td>
                                                                    <td className="text-wrap" style={{ whiteSpace: "pre-line" }}>{item.description}</td>
                                                                    <td className="text-end fw-medium">{formatMoney(item.debit)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </Col>

                                            {/* CREDIT SIDE (Right) */}
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
                                                                    <td>{formatDate(item.jvDate)}</td>
                                                                    <td>
                                                                        {(["SALES", "SALE", "PURCHASE", "PAYMENT", "RECEIPT", "INCOME", "EXPENSE"].includes(item.vType?.toUpperCase())) ? (
                                                                            <Link
                                                                                to={getVchLink(item)}
                                                                                className="badge bg-danger-subtle text-danger border-danger text-decoration-none"
                                                                                onClick={(e) => {
                                                                                    if (getVchLink(item) === "#") e.preventDefault();
                                                                                }}
                                                                            >
                                                                                {item.vType} <i className="ri-external-link-line ms-1"></i>
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="badge bg-danger-subtle text-danger">{item.vType}</span>
                                                                        )}
                                                                    </td>
                                                                    <td>{item.vCode || '-'}</td>
                                                                    <td className="text-wrap" style={{ whiteSpace: "pre-line" }}>{item.description}</td>
                                                                    <td className="text-end fw-medium">{formatMoney(item.credit)}</td>
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
                                                    <span className="text-success">{formatMoney(reportData.entries?.reduce((acc, curr) => acc + curr.debit, 0))}</span>
                                                </div>
                                                {reportData.closingBalance < 0 && (
                                                    <div className="d-flex justify-content-between px-2 text-muted fs-11 mt-1">
                                                        <span>By Closing Balance</span>
                                                        <span>{formatMoney(Math.abs(reportData.closingBalance))}</span>
                                                    </div>
                                                )}
                                            </Col>
                                            <Col lg={6} className="p-2 bg-light bg-opacity-30">
                                                <div className="d-flex justify-content-between px-2 fw-bold">
                                                    <span>Total Credit</span>
                                                    <span className="text-danger">{formatMoney(reportData.entries?.reduce((acc, curr) => acc + curr.credit, 0))}</span>
                                                </div>
                                                {reportData.closingBalance >= 0 && (
                                                    <div className="d-flex justify-content-between px-2 text-muted fs-11 mt-1">
                                                        <span>To Closing Balance</span>
                                                        <span>{formatMoney(Math.abs(reportData.closingBalance))}</span>
                                                    </div>
                                                )}
                                            </Col>
                                        </Row>
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
