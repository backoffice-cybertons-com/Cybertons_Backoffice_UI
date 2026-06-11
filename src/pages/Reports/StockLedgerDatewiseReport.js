// Developed by Hetak on 11-05-2026
import React, { useMemo, useState, useEffect } from 'react';
import {
    Card, CardBody, Col, Container, Row,
    Button, Input, Label, Table, Spinner
} from 'reactstrap';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { getStockLedgerDatewise, getProductsForSales } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import BreadCrumb from '../../Components/Common/BreadCrumb';
import "./StockSummaryReport.css";
import HeaderForAllRpt from '../../Components/Common/HeaderForAllRpt';
import FooterForAllRpt from '../../Components/Common/FooterForAllRpt';

const selectLayoutState = (state) => state.Layout;
const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
    layoutModeType: layout.layoutModeType,
}));

const StockLedgerDatewiseReport = () => {
    const { layoutModeType } = useSelector(selectLayoutProperties);
    const isDarkMode = layoutModeType === 'dark';
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const formatLocalYMD = (d) => {
        if (!d) return '';
        const date = d instanceof Date ? d : new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const [fromDate, setFromDate] = useState(formatLocalYMD(firstOfMonth));
    const [toDate, setToDate] = useState(formatLocalYMD(today));
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [productList, setProductList] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await getProductsForSales();
                const list = Array.isArray(response) ? response : (response?.data || []);
                setProductList(list);
            } catch (err) {
                console.error("Failed to load products:", err);
            }
        };
        fetchProducts();
    }, []);

    const companyName = secureStorage.getPlain('companyName') || secureStorage.getPlain('CompanyName') || 'SoftBook';

    const formatQty = (qty) =>
        Number(qty || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatDate = (d) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const fetchReport = async () => {
        if (!fromDate || !toDate) {
            setError('Please select date range.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const companyId = secureStorage.getPlain('companyId') || 10001;
            const response = await getStockLedgerDatewise(companyId, fromDate, toDate, selectedProductId || null);
            const data = Array.isArray(response) ? response : (response?.data || []);
            setReportData(data);
        } catch (err) {
            console.error('Stock Ledger Datewise Error:', err);
            setError('Failed to load report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const rows = useMemo(() => {
        return (reportData || []).map(row => ({
            srNo:         Number(row.srNo         || row.SrNo         || 0),
            tranDate:     row.tranDate     || row.TranDate     || null,
            description:  (row.description || row.Description || '').toString().trim(),
            inwardQty:    Number(row.inwardQty    || row.InwardQty    || 0),
            inwardAmount: Number(row.inwardAmount || row.InwardAmount || 0),
            outwardQty:   Number(row.outwardQty   || row.OutwardQty   || 0),
            outwardAmount:Number(row.outwardAmount|| row.OutwardAmount|| 0),
            balanceQty:   Number(row.balanceQty   || row.BalanceQty   || 0),
            balanceAmount:Number(row.balanceAmount|| row.BalanceAmount|| 0),
        }));
    }, [reportData]);

    const totals = useMemo(() => rows.reduce((acc, r) => ({
        inward:        acc.inward        + r.inwardQty,
        inwardAmount:  acc.inwardAmount  + r.inwardAmount,
        outward:       acc.outward       + r.outwardQty,
        outwardAmount: acc.outwardAmount + r.outwardAmount,
    }), { inward: 0, inwardAmount: 0, outward: 0, outwardAmount: 0 }), [rows]);

    const handleExcel = () => {
        if (!rows.length) return;
        const selectedProductObj = productList.find(p => {
            const pId = p.productId ?? p.ProductId ?? p.id;
            return pId?.toString() === selectedProductId?.toString();
        });
        const productName = selectedProductObj ? (selectedProductObj.name ?? selectedProductObj.Name ?? selectedProductObj.productName ?? selectedProductObj.ProductName) : "All Products";

        const aoa = [
            [`STOCK LEDGER DATEWISE REPORT - ${productName}`, "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""],
            ["Company Name:", companyName, "", "", "", "", "", "", ""],
            ["Period:", `${formatDate(fromDate)} to ${formatDate(toDate)}`, "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""],
            ["Sr No", "Date", "Description", "Inward Qty", "Inward Amt", "Outward Qty", "Outward Amt", "Balance Qty", "Balance Amt"],
        ];

        rows.forEach(r => {
            aoa.push([
                r.srNo,
                r.tranDate ? formatDate(r.tranDate) : '',
                r.description,
                r.inwardQty,
                r.inwardAmount,
                r.outwardQty,
                r.outwardAmount,
                r.balanceQty,
                r.balanceAmount,
            ]);
        });

        aoa.push(["", "TOTAL", "", totals.inward, totals.inwardAmount, totals.outward, totals.outwardAmount, "", ""]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = [
            { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }
        ];

        const border = {
            top:    { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left:   { style: "thin", color: { rgb: "D1D5DB" } },
            right:  { style: "thin", color: { rgb: "D1D5DB" } }
        };
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "405189" } },
            alignment: { horizontal: "center", vertical: "center" },
            border
        };
        const totalStyle = {
            font: { bold: true },
            fill: { patternType: "solid", fgColor: { rgb: "F3F6F9" } },
            border
        };

        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                if (!cell) continue;
                if (R === 0) { cell.s = { font: { bold: true, sz: 16 }, alignment: { horizontal: "center" } }; }
                else if (R === 5) { cell.s = headerStyle; }
                else if (R > 5) {
                    const isTotal = R === range.e.r;
                    cell.s = isTotal ? totalStyle : { border };
                    if (C >= 3) {
                        cell.t = "n";
                        cell.s.alignment = { horizontal: "right" };
                        cell.z = "#,##0.00";
                    }
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock Ledger");
        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buffer]), `Stock_Ledger_Datewise_${fromDate}_to_${toDate}.xlsx`);
    };

    const handlePrint = () => {
        const content = document.getElementById('reportViewContainer');
        if (!content) return;
        const selectedProductObj = productList.find(p => {
            const pId = p.productId ?? p.ProductId ?? p.id;
            return pId?.toString() === selectedProductId?.toString();
        });
        const productName = selectedProductObj ? (selectedProductObj.name ?? selectedProductObj.Name ?? selectedProductObj.productName ?? selectedProductObj.ProductName) : "All Products";
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Stock Ledger Datewise Report</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: sans-serif; padding: 20px; }
                .table thead th { background-color: #f3f6f9 !important; border-bottom: 2px solid #dee2e6 !important; }
                .text-end { text-align: right !important; }
                .fw-bold { font-weight: bold !important; }
                .header-info { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #405189; padding-bottom: 10px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: 800; color: #405189; margin: 0; }
                .report-title { font-size: 18px; font-weight: 600; margin: 0; color: #666; }
            </style>
            </head><body>
                <div class="header-info">
                    <div>
                        <h1 class="company-name">${companyName}</h1>
                        <p class="report-title">Stock Ledger Datewise Report - <b>${productName}</b></p>
                    </div>
                    <div class="text-end">
                        <small>Period: <b>${formatDate(fromDate)} to ${formatDate(toDate)}</b></small>
                    </div>
                </div>
                ${content.innerHTML}
            </body></html>`);
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 500);
    };

    return (
        <React.Fragment>
            <div className={`page-content stock-summary-page${isDarkMode ? ' stock-summary-page--dark' : ''}`}>
                <Container fluid>
                    <BreadCrumb title="Stock Ledger Datewise" pageTitle="Reports" />

                    {/* ── Filter Card ── */}
                    <Row>
                        <Col lg={12}>
                            <Card className="mb-2">
                                <CardBody className="py-2">
                                    <Row className="g-3 align-items-end">
                                        <Col md={2}>
                                            <Label className="text-muted text-uppercase fw-semibold mb-1">From Date</Label>
                                            <Input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                                        </Col>

                                        <Col md={2}>
                                            <Label className="text-muted text-uppercase fw-semibold mb-1">To Date</Label>
                                            <Input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                                        </Col>

                                        <Col md={4}>
                                            <Label className="text-muted text-uppercase fw-semibold mb-1">Product</Label>
                                            <Input
                                                type="select"
                                                className="form-select"
                                                value={selectedProductId}
                                                onChange={(e) => setSelectedProductId(e.target.value)}
                                            >
                                                <option value="">All Products</option>
                                                {productList.map((prod) => {
                                                    const pId = prod.productId ?? prod.ProductId ?? prod.id;
                                                    const pName = prod.name ?? prod.Name ?? prod.productName ?? prod.ProductName;
                                                    return (
                                                        <option key={pId} value={pId}>
                                                            {pName}
                                                        </option>
                                                    );
                                                })}
                                            </Input>
                                        </Col>

                                        <Col md={2}>
                                            <Button color="primary" className="w-100" onClick={fetchReport} disabled={loading}>
                                                {loading ? <Spinner size="sm" /> : "Generate"}
                                            </Button>
                                        </Col>

                                        <Col md={2}>
                                            <div className="d-flex gap-2 justify-content-end">
                                                <Button color="success" outline onClick={handleExcel} title="Export Excel">
                                                    <i className="ri-file-excel-2-line" />
                                                </Button>
                                                <Button color="secondary" outline onClick={handlePrint} title="Print">
                                                    <i className="ri-printer-line" />
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>

                                    {error && <div className="alert alert-danger mt-3">{error}</div>}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {/* ── Report Table ── */}
                    {reportData && (
                        <Row>
                            <Col lg={12}>
                                <Card id="reportViewContainer" className="report-card-compact">
                                    <HeaderForAllRpt reportName='Stock Ledger Datewise Report' />
                                    <CardBody className="py-1">

                                        {/* Summary Cards */}
                                        <Row className="g-1 mb-1 d-print-none">
                                            <Col md={3}>
                                                <Card className="ssr-summary-card inward">
                                                    <CardBody className="py-1 px-2 text-center">
                                                        <div className="text-muted text-uppercase fw-semibold ssr-summary-label">Total Inward</div>
                                                        <h4 className="ssr-summary-value mb-0 text-success">{formatQty(totals.inward)}</h4>
                                                        <div className="text-muted fs-11 mt-1">Amt: {formatQty(totals.inwardAmount)}</div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                            <Col md={3}>
                                                <Card className="ssr-summary-card outward">
                                                    <CardBody className="py-1 px-2 text-center">
                                                        <div className="text-muted text-uppercase fw-semibold ssr-summary-label">Total Outward</div>
                                                        <h4 className="ssr-summary-value mb-0 text-danger">{formatQty(totals.outward)}</h4>
                                                        <div className="text-muted fs-11 mt-1">Amt: {formatQty(totals.outwardAmount)}</div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                            <Col md={3}>
                                                <Card className="ssr-summary-card closing">
                                                    <CardBody className="py-1 px-2 text-center">
                                                        <div className="text-muted text-uppercase fw-semibold ssr-summary-label">Closing Balance</div>
                                                        <h4 className="ssr-summary-value mb-0 ssr-closing-value">
                                                            {rows.length > 0 ? formatQty(rows[rows.length - 1].balanceQty) : '—'}
                                                        </h4>
                                                        <div className="text-muted fs-11 mt-1">Amt: {rows.length > 0 ? formatQty(rows[rows.length - 1].balanceAmount) : '—'}</div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                            <Col md={3}>
                                                <Card className="ssr-summary-card opening">
                                                    <CardBody className="py-1 px-2 text-center">
                                                        <div className="text-muted text-uppercase fw-semibold ssr-summary-label">Transactions</div>
                                                        <h4 className="ssr-summary-value mb-0 text-primary">{rows.length}</h4>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                        </Row>

                                        <div className="ssr-table-wrap">
                                            <div className="ssr-table-container">
                                                <Table className="align-middle ssr-table table-hover">
                                                    <thead className="sticky-top">
                                                        <tr>
                                                            <th style={{ width: '5%' }}>Sr</th>
                                                            <th style={{ width: '11%' }}>Date</th>
                                                            <th style={{ width: '12%' }}>Description</th>
                                                            <th style={{ width: '11%' }} className="text-end">Inward Qty</th>
                                                            <th style={{ width: '13%' }} className="text-end">Inward Amt</th>
                                                            <th style={{ width: '11%' }} className="text-end">Outward Qty</th>
                                                            <th style={{ width: '13%' }} className="text-end">Outward Amt</th>
                                                            <th style={{ width: '12%' }} className="text-end">Balance Qty</th>
                                                            <th style={{ width: '12%' }} className="text-end">Balance Amt</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={9} className="text-center text-muted py-4">
                                                                    No data found for selected date range.
                                                                </td>
                                                            </tr>
                                                        ) : rows.map((r, i) => (
                                                            <tr key={i} className={r.description === 'Opening' ? 'fw-semibold' : ''}>
                                                                <td className="text-muted">{r.srNo}</td>
                                                                <td className="text-muted">{r.tranDate ? formatDate(r.tranDate) : ''}</td>
                                                                <td className="fw-medium">{r.description}</td>
                                                                <td className="text-end text-success" style={{ whiteSpace: 'nowrap' }}>
                                                                    {r.inwardQty > 0 ? formatQty(r.inwardQty) : ''}
                                                                </td>
                                                                <td className="text-end text-success" style={{ whiteSpace: 'nowrap' }}>
                                                                    {r.inwardAmount > 0 ? formatQty(r.inwardAmount) : ''}
                                                                </td>
                                                                <td className="text-end text-danger" style={{ whiteSpace: 'nowrap' }}>
                                                                    {r.outwardQty > 0 ? formatQty(r.outwardQty) : ''}
                                                                </td>
                                                                <td className="text-end text-danger" style={{ whiteSpace: 'nowrap' }}>
                                                                    {r.outwardAmount > 0 ? formatQty(r.outwardAmount) : ''}
                                                                </td>
                                                                <td className="text-end fw-bold" style={{ whiteSpace: 'nowrap' }}>{formatQty(r.balanceQty)}</td>
                                                                <td className="text-end fw-bold text-primary" style={{ whiteSpace: 'nowrap' }}>{formatQty(r.balanceAmount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>

                                            {/* Grand Total Strip */}
                                            <div className="ssr-total-strip d-flex align-items-center py-2 px-3">
                                                <div style={{ width: '28%' }} className="text-uppercase fw-bold">Grand Total</div>
                                                <div style={{ width: '11%' }} className="text-end text-success fw-bold">{formatQty(totals.inward)}</div>
                                                <div style={{ width: '13%' }} className="text-end text-success fw-bold">{formatQty(totals.inwardAmount)}</div>
                                                <div style={{ width: '11%' }} className="text-end text-danger fw-bold">{formatQty(totals.outward)}</div>
                                                <div style={{ width: '13%' }} className="text-end text-danger fw-bold">{formatQty(totals.outwardAmount)}</div>
                                                <div style={{ width: '12%' }} className="text-end fw-bold">
                                                    {rows.length > 0 ? formatQty(rows[rows.length - 1].balanceQty) : ''}
                                                </div>
                                                <div style={{ width: '12%' }} className="text-end fw-bold ssr-closing-value">
                                                    {rows.length > 0 ? formatQty(rows[rows.length - 1].balanceAmount) : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </CardBody>
                                    <FooterForAllRpt />
                                </Card>
                            </Col>
                        </Row>
                    )}
                </Container>
            </div>
        </React.Fragment>
    );
};

export default StockLedgerDatewiseReport;
