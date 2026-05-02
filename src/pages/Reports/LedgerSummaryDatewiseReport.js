import React, { useState, useEffect, useMemo } from 'react';
import {
    Card, CardHeader, CardBody, Col, Container, Row,
    Button, Input, Label, Table, Spinner, Badge
} from 'reactstrap';
import Select from 'react-select';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { APIClient } from '../../helpers/api_helper';
import * as url from '../../helpers/url_helper';
import { getLedgerSummaryDatewise } from '../../helpers/fakebackend_helper';
import './LedgerSummaryDatewiseReport.css';

const api = new APIClient();

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

/* ────────── component ────────── */
const LedgerSummaryDatewiseReport = () => {
    document.title = 'Ledger Summary Datewise | SoftBook';

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [accounts, setAccounts]         = useState([]);
    const [selectedAcc, setSelectedAcc]   = useState(null);
    const [fromDate, setFromDate]         = useState(toLocalYMD(firstOfMonth));
    const [toDate, setToDate]             = useState(toLocalYMD(today));
    const [reportData, setReportData]     = useState(null);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');

    /* fetch party/account list */
    useEffect(() => {
        api.get(url.GET_PARTIES).then((res) => {
            const arr = Array.isArray(res) ? res : (res?.data || []);
            setAccounts(arr.map((p) => ({
                value: p.partyId || p.PartyId || p.id,
                label: p.displayName || p.DisplayName || p.partyName || p.PartyName || p.name || 'Unknown'
            })));
        }).catch(() => {});
    }, []);

    const fetchReport = async () => {
        if (!selectedAcc) { setError('Please select an account.'); return; }
        if (!fromDate || !toDate) { setError('Please select both dates.'); return; }
        setLoading(true); setError(''); setReportData(null);
        try {
            const raw = await getLedgerSummaryDatewise(selectedAcc.value, fromDate, toDate);
            const rows = Array.isArray(raw) ? raw : (raw?.data || []);
            setReportData(rows);
        } catch (e) {
            console.error(e);
            setError('Failed to load report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* ── derived rows ── */
    const { openingRow, totalRow, dataRows } = useMemo(() => {
        if (!reportData) return { openingRow: null, totalRow: null, dataRows: [] };
        const opening = reportData.find(r => (r.resParticular || '').toLowerCase() === 'opening balance') || null;
        const total   = reportData.find(r => (r.resParticular || '').toLowerCase() === 'total') || null;
        const data    = reportData.filter(r => {
            const p = (r.resParticular || '').toLowerCase();
            return p !== 'opening balance' && p !== 'total';
        });
        return { openingRow: opening, totalRow: total, dataRows: data };
    }, [reportData]);

    /* ── closing balance (last dataRow balance or opening if no data) ── */
    const closingBalance = useMemo(() => {
        if (!reportData) return null;
        const last = [...dataRows].pop();
        return last?.resBalance ?? openingRow?.resBalance ?? null;
    }, [dataRows, openingRow, reportData]);

    /* ── Excel export ── */
    const handleExcel = () => {
        if (!reportData?.length) return;
        const rows = [
            ['Ledger Summary – Datewise', '', '', '', ''],
            ['Account:', selectedAcc?.label, '', '', ''],
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
        saveAs(new Blob([buf], { type: 'application/octet-stream' }), `LedgerSummary_${selectedAcc?.label}_${fromDate}_${toDate}.xlsx`);
    };

    /* ── Print ── */
    const handlePrint = () => {
        const el = document.getElementById('lsdPrintArea');
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
            </style>
            </head><body>${el.innerHTML}
            <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},400)};<\/script>
            </body></html>`);
        w.document.close();
    };

    /* ── balance colour helper ── */
    const balClass = (bal) => {
        if (bal === null || bal === undefined) return '';
        return bal >= 0 ? 'bal-dr' : 'bal-cr';
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Ledger Summary (Datewise)" pageTitle="Reports" />

                    {/* ── Filter Card ── */}
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <Row className="g-3 align-items-end">
                                        <Col lg={4}>
                                            <Label className="form-label text-muted text-uppercase fw-semibold mb-1">Account / Party</Label>
                                            <Select
                                                inputId="lsd-account"
                                                value={selectedAcc}
                                                onChange={setSelectedAcc}
                                                options={accounts}
                                                classNamePrefix="select2-selection"
                                                placeholder="Select account..."
                                                isClearable
                                            />
                                        </Col>
                                        <Col lg={2}>
                                            <Label className="form-label text-muted text-uppercase fw-semibold mb-1">From Date</Label>
                                            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                                        </Col>
                                        <Col lg={2}>
                                            <Label className="form-label text-muted text-uppercase fw-semibold mb-1">To Date</Label>
                                            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                                        </Col>
                                        <Col lg={4}>
                                            <div className="d-flex gap-2">
                                                <Button color="primary" className="flex-grow-1" onClick={fetchReport} disabled={loading}>
                                                    {loading
                                                        ? <><Spinner size="sm" className="me-1" />Loading...</>
                                                        : <><i className="ri-filter-2-line me-1" />Generate</>}
                                                </Button>
                                                <Button color="light" title="Reset" onClick={() => { setSelectedAcc(null); setReportData(null); setError(''); }} disabled={loading}>
                                                    <i className="ri-refresh-line fs-5" />
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>
                                    {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {/* ── Loading ── */}
                    {loading && (
                        <Row><Col lg={12}>
                            <Card><CardBody className="py-5 text-center"><Spinner className="me-2" />Loading Ledger Summary...</CardBody></Card>
                        </Col></Row>
                    )}

                    {/* ── Empty State ── */}
                    {!loading && reportData && reportData.length === 0 && (
                        <Card><CardBody className="text-center py-5 text-muted">
                            <i className="ri-inbox-2-line fs-1 mb-2 d-block" />
                            No transactions found for the selected account and period.
                        </CardBody></Card>
                    )}

                    {/* ── Report Card ── */}
                    {!loading && reportData && reportData.length > 0 && (
                        <Row>
                            <Col lg={12}>
                                <Card id="lsdPrintArea">
                                    {/* ── Card Header ── */}
                                    <CardHeader className="border-0 d-flex align-items-center flex-wrap gap-2 py-2">
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center flex-wrap gap-2">
                                                <h6 className="card-title mb-0 fw-semibold">{selectedAcc?.label}</h6>
                                                <span className="text-muted fs-12">
                                                    {fmtDate(fromDate)} – {fmtDate(toDate)}
                                                </span>
                                                <Badge color="info" className="rounded-pill">
                                                    {dataRows.length} transaction{dataRows.length !== 1 ? 's' : ''}
                                                </Badge>
                                            </div>
                                            <div className="d-flex gap-3 mt-1 fs-12 text-muted">
                                                <span>
                                                    Opening: <strong className={balClass(openingRow?.resBalance)}>
                                                        {balanceLabel(openingRow?.resBalance || 0)}
                                                    </strong>
                                                </span>
                                                <span>
                                                    Closing: <strong className={balClass(closingBalance)}>
                                                        {balanceLabel(closingBalance)}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2 d-print-none">
                                            <Button color="success" outline size="sm" onClick={handleExcel} title="Export Excel" disabled={!reportData?.length}>
                                                <i className="ri-file-excel-2-line fs-5" />
                                            </Button>
                                            <Button color="secondary" outline size="sm" onClick={handlePrint} title="Print" disabled={!reportData?.length}>
                                                <i className="ri-printer-line fs-5" />
                                            </Button>
                                        </div>
                                    </CardHeader>

                                    <CardBody className="pt-0 pb-0">
                                        {/* ── Summary Strips ── */}
                                        <Row className="g-2 mb-2">
                                            <Col md={3}>
                                                <div className="lsd-kpi-card border rounded px-3 py-2">
                                                    <div className="lsd-kpi-label text-muted text-uppercase">Opening Balance</div>
                                                    <div className={`lsd-kpi-value fw-bold ${balClass(openingRow?.resBalance)}`}>
                                                        {balanceLabel(openingRow?.resBalance || 0)}
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="lsd-kpi-card border rounded px-3 py-2">
                                                    <div className="lsd-kpi-label text-muted text-uppercase">Total Debit</div>
                                                    <div className="lsd-kpi-value fw-bold text-success">
                                                        {fmtMoney(totalRow?.resDebit || 0)}
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="lsd-kpi-card border rounded px-3 py-2">
                                                    <div className="lsd-kpi-label text-muted text-uppercase">Total Credit</div>
                                                    <div className="lsd-kpi-value fw-bold text-danger">
                                                        {fmtMoney(totalRow?.resCredit || 0)}
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <div className="lsd-kpi-card border rounded px-3 py-2">
                                                    <div className="lsd-kpi-label text-muted text-uppercase">Closing Balance</div>
                                                    <div className={`lsd-kpi-value fw-bold ${balClass(closingBalance)}`}>
                                                        {balanceLabel(closingBalance)}
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>

                                        {/* ── Table ── */}
                                        <div className="lsd-table-wrap">
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
                                                        {/* Opening Row */}
                                                        {openingRow && (
                                                            <tr className="lsd-opening-row">
                                                                <td className="text-muted fst-italic">{fmtDate(openingRow.resDate)}</td>
                                                                <td className="fst-italic text-muted">Opening Balance</td>
                                                                <td className="text-end text-success">
                                                                    {openingRow.resDebit > 0 ? fmtMoney(openingRow.resDebit) : <span className="text-muted">–</span>}
                                                                </td>
                                                                <td className="text-end text-danger">
                                                                    {openingRow.resCredit > 0 ? fmtMoney(openingRow.resCredit) : <span className="text-muted">–</span>}
                                                                </td>
                                                                <td className={`text-end fw-semibold ${balClass(openingRow.resBalance)}`}>
                                                                    {balanceLabel(openingRow.resBalance)}
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {/* Data Rows */}
                                                        {dataRows.map((row, idx) => (
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

                                            {/* ── Total Strip (static below scroll) ── */}
                                            {totalRow && (
                                                <div className="lsd-total-strip d-flex align-items-center px-2 py-2">
                                                    <div style={{ width: '34%' }} className="fw-bold text-dark ps-2">TOTAL</div>
                                                    <div style={{ width: '20%' }} className="text-end text-success fw-bold pe-2">
                                                        {fmtMoney(totalRow.resDebit || 0)}
                                                    </div>
                                                    <div style={{ width: '20%' }} className="text-end text-danger fw-bold pe-2">
                                                        {fmtMoney(totalRow.resCredit || 0)}
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

export default LedgerSummaryDatewiseReport;
