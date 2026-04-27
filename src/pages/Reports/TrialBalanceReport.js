import React, { useState } from 'react';
import {
    Card, CardHeader, CardBody, Col, Container, Row,
    Button, Label, Table, Spinner
} from 'reactstrap';
import Flatpickr from "react-flatpickr";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getTrialBalance } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import BreadCrumb from '../../Components/Common/BreadCrumb';

const TrialBalanceReport = () => {
    const [asOfDate, setAsOfDate] = useState(new Date());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
        accountName: row.accountName || row.AccountName || 'Unknown',
        debit: Number(row.debit || row.Debit || 0),
        credit: Number(row.credit || row.Credit || 0),
        isTotal: (row.accountName || row.AccountName || '').toUpperCase() === 'TOTAL'
    }));

    // Filter out the 'TOTAL' row sent by the backend so we can calculate it ourselves cleanly
    const accountRows = rows.filter(r => !r.isTotal);
    
    // Calculate Grand Totals
    const totalDebit = accountRows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = accountRows.reduce((s, r) => s + r.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const handleExcel = () => {
        if (!accountRows.length) return;
        const excelRows = accountRows.map(r => ({
            'Account': r.accountName,
            'Debit (₹)': r.debit.toFixed(2),
            'Credit (₹)': r.credit.toFixed(2)
        }));
        
        // Add Total Row
        excelRows.push({
            'Account': 'TOTAL',
            'Debit (₹)': totalDebit.toFixed(2),
            'Credit (₹)': totalCredit.toFixed(2)
        });

        const ws = XLSX.utils.json_to_sheet(excelRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `Trial_Balance_${formatLocalYMD(asOfDate)}.xlsx`);
    };

    const handlePrint = () => {
        const content = document.getElementById('trialBalancePrintArea');
        if (!content) return;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Trial Balance</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <link href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css" rel="stylesheet">
            <style>body{padding:20px;font-family:sans-serif;} .table-responsive { overflow: visible !important; }</style>
            </head><body>${content.innerHTML}
            <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},400);};<\/script>
            </body></html>`);
        w.document.close();
    };

    document.title = "Trial Balance | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Trial Balance" pageTitle="Reports" />

                    {/* Filter Card */}
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <Row className="g-3 align-items-end">
                                        <Col lg={3}>
                                            <Label className="form-label text-muted text-uppercase fw-semibold mb-1">As of Date</Label>
                                            <Flatpickr
                                                className="form-control"
                                                value={asOfDate}
                                                onChange={([date]) => setAsOfDate(date)}
                                                options={{ dateFormat: "d M Y", maxDate: "today" }}
                                            />
                                        </Col>
                                        <Col lg={2}>
                                            <Button color="primary" className="w-100" onClick={fetchReport} disabled={loading}>
                                                {loading
                                                    ? <><Spinner size="sm" className="me-1" />Loading...</>
                                                    : <><i className="ri-filter-2-line me-1" />Generate</>}
                                            </Button>
                                        </Col>
                                        {reportData && (
                                            <>
                                                <Col lg="auto">
                                                    <Button color="success" outline onClick={handleExcel} title="Export Excel">
                                                        <i className="ri-file-excel-2-line fs-5" />
                                                    </Button>
                                                </Col>
                                                <Col lg="auto">
                                                    <Button color="secondary" outline onClick={handlePrint} title="Print">
                                                        <i className="ri-printer-line fs-5" />
                                                    </Button>
                                                </Col>
                                            </>
                                        )}
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
                                <Card id="trialBalancePrintArea">
                                    <CardHeader className="border-0 d-flex align-items-center flex-wrap gap-2">
                                        <div className="flex-grow-1">
                                            <h5 className="card-title mb-0">Trial Balance</h5>
                                            <p className="text-muted fs-12 mb-0">As of <strong>{formatDate(asOfDate)}</strong></p>
                                        </div>
                                    </CardHeader>
                                    <CardBody className="p-0">
                                        <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                            <Table className="table-hover align-middle mb-0">
                                                <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
                                                    <tr className="fs-12 text-muted text-uppercase">
                                                        <th style={{ width: '50%' }} className="ps-4">Account Name</th>
                                                        <th style={{ width: '25%' }} className="text-end">Debit (₹)</th>
                                                        <th style={{ width: '25%' }} className="text-end pe-4">Credit (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="fs-13">
                                                    {accountRows.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td className="ps-4 fw-medium text-primary">
                                                                <div className="d-flex align-items-center">
                                                                    <i className="ri-file-list-3-line text-muted me-2"></i>
                                                                    {row.accountName}
                                                                </div>
                                                            </td>
                                                            <td className="text-end text-success">
                                                                {row.debit > 0 ? formatMoney(row.debit) : <span className="text-muted">-</span>}
                                                            </td>
                                                            <td className="text-end text-danger pe-4">
                                                                {row.credit > 0 ? formatMoney(row.credit) : <span className="text-muted">-</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="sticky-bottom" style={{ zIndex: 1, bottom: 0, position: 'sticky' }}>
                                                    <tr className="bg-dark text-white fs-14 fw-bold">
                                                        <td className="text-end pe-4 py-3">GRAND TOTAL</td>
                                                        <td className="text-end text-success py-3">{formatMoney(totalDebit)}</td>
                                                        <td className="text-end text-danger pe-4 py-3">{formatMoney(totalCredit)}</td>
                                                    </tr>
                                                </tfoot>
                                            </Table>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {reportData && accountRows.length === 0 && (
                        <div className="text-center py-5 text-muted">
                            <i className="ri-inbox-2-line fs-1 mb-2 d-block" />
                            No transactions found for the selected date.
                        </div>
                    )}
                </Container>
            </div>
        </React.Fragment>
    );
};

export default TrialBalanceReport;