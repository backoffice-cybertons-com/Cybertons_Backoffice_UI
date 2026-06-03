import React, { useMemo, useState, useEffect } from 'react';
import {
    Badge,
    Card, CardHeader, CardBody, Col, Container, Row,
    Button, Input, Label, Table, Spinner
} from 'reactstrap';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { getStockSummaryReport } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import BreadCrumb from '../../Components/Common/BreadCrumb';
import "./StockSummaryReport.css";
import HeaderForAllRpt from '../../Components/Common/HeaderForAllRpt';
import FooterForAllRpt from '../../Components/Common/FooterForAllRpt';

const selectLayoutState = (state) => state.Layout;
const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
    layoutModeType: layout.layoutModeType,
}));

const StockSummaryReport = () => {
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
    const [query, setQuery] = useState('');
    const [hideZero, setHideZero] = useState(true);
    const [sortBy, setSortBy] = useState({ key: 'productName', dir: 'asc' });


    const formatQty = (qty) => {
        return Number(qty || 0).toLocaleString('en-IN', {
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
        if (!fromDate || !toDate) {
            setError('Please select date range.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const companyId = secureStorage.getPlain('companyId') || 10001;
            const response = await getStockSummaryReport(companyId, fromDate, toDate);
            const data = Array.isArray(response) ? response : (response?.data || []);
            setReportData(data);
        } catch (err) {
            console.error('Stock Summary Error:', err);
            setError('Failed to load Stock Summary. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const rows = useMemo(() => {
        return (reportData || []).map(row => ({
            productId: row.productId || row.ProductId,
            productName: (row.productName || row.ProductName || '').toString().trim(),
            unitName: (row.unitName || row.UnitName || '').toString().trim(),
            openingQty: Number(row.openingQty || row.OpeningQty || 0),
            inwardQty: Number(row.inwardQty || row.InwardQty || 0),
            costPrice: Number(row.costPrice || row.CostPrice || 0),
            inwardAmount: Number(row.inwardAmount || row.InwardAmount || 0),
            outwardQty: Number(row.outwardQty || row.OutwardQty || 0),
            sellingPrice: Number(row.sellingPrice || row.SellingPrice || 0),
            outwardAmount: Number(row.outwardAmount || row.OutwardAmount || 0),
            closingQty: Number(row.closingQty || row.ClosingQty || 0),
            closingAmount: Number(row.closingAmount || row.ClosingAmount || 0)
        }));
    }, [reportData]);

    const shownRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        let data = rows;
        if (hideZero) {
            data = data.filter(r =>
                Math.abs(r.openingQty) > 0.001 ||
                Math.abs(r.inwardQty) > 0.001 ||
                Math.abs(r.outwardQty) > 0.001 ||
                Math.abs(r.closingQty) > 0.001
            );
        }
        if (q) {
            data = data.filter(r => r.productName.toLowerCase().includes(q));
        }

        const dir = sortBy.dir === 'asc' ? 1 : -1;
        return [...data].sort((a, b) => {
            if (sortBy.key === 'productName' || sortBy.key === 'unitName') {
                return dir * a[sortBy.key].localeCompare(b[sortBy.key]);
            }
            return dir * (a[sortBy.key] - b[sortBy.key]);
        });
    }, [rows, query, hideZero, sortBy]);

    const totals = useMemo(() => {
        return shownRows.reduce((acc, r) => ({
            opening: acc.opening + r.openingQty,
            inward: acc.inward + r.inwardQty,
            inwardAmount: acc.inwardAmount + r.inwardAmount,
            outward: acc.outward + r.outwardQty,
            outwardAmount: acc.outwardAmount + r.outwardAmount,
            closing: acc.closing + r.closingQty,
            closingAmount: acc.closingAmount + r.closingAmount
        }), { opening: 0, inward: 0, inwardAmount: 0, outward: 0, outwardAmount: 0, closing: 0, closingAmount: 0 });
    }, [shownRows]);

    const handleSort = (key) => {
        setSortBy(prev => ({
            key,
            dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortIcon = (key) => {
        if (sortBy.key !== key) return 'ri-arrow-up-down-line';
        return sortBy.dir === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
    };

    const handleExcel = () => {
        if (!shownRows.length) return;

        const aoa = [
            ["STOCK SUMMARY REPORT", "", "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["Company Name:", companyName, "", "", "", "", "", "", "", "", ""],
            ["Period:", `${formatDate(fromDate)} to ${formatDate(toDate)}`, "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["Product Name", "Unit", "Opening Qty", "Inward Qty", "Cost Price", "Inward Amt", "Outward Qty", "Sale Price", "Outward Amt", "Closing Qty", "Closing Amt"]
        ];

        shownRows.forEach(r => {
            aoa.push([r.productName, r.unitName, r.openingQty, r.inwardQty, r.costPrice, r.inwardAmount, r.outwardQty, r.sellingPrice, r.outwardAmount, r.closingQty, r.closingAmount]);
        });

        aoa.push(["GRAND TOTAL", "", totals.opening, totals.inward, "", totals.inwardAmount, totals.outward, "", totals.outwardAmount, totals.closing, totals.closingAmount]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = [
            { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
            { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }
        ];

        const border = {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } }
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

                if (R === 0) {
                    cell.s = { font: { bold: true, sz: 16 }, alignment: { horizontal: "center" } };
                } else if (R === 5) {
                    cell.s = headerStyle;
                } else if (R > 5) {
                    const isTotal = R === range.e.r;
                    cell.s = isTotal ? totalStyle : { border };
                    if (C >= 2) {
                        cell.t = "n";
                        cell.s.alignment = { horizontal: "right" };
                        cell.z = "#,##0.00";
                    }
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock Summary");
        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buffer]), `Stock_Summary_${fromDate}_to_${toDate}.xlsx`);
    };

    const handlePrint = () => {
        const content = document.getElementById('reportViewContainer');
        if (!content) return;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Stock Summary Report</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
                @page { size: A4 portrait; margin: 10mm; }
                body { font-family: sans-serif; padding: 20px; }
                .table thead th { background-color: #f3f6f9 !important; border-bottom: 2px solid #dee2e6 !important; }
                .text-end { text-align: right !important; }
                .fw-bold { font-weight: bold !important; }
                .mb-4 { margin-bottom: 1.5rem !important; }
                .header-info { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #405189; padding-bottom: 10px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: 800; color: #405189; margin: 0; }
                .report-title { font-size: 18px; font-weight: 600; margin: 0; color: #666; }
            </style>
            </head><body>
                <div class="header-info">
                    <div>
                        <h1 class="company-name">${companyName}</h1>
                        <p class="report-title">Stock Summary Report</p>
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
                    <BreadCrumb title="Stock Summary" pageTitle="Reports" />

                    <Row>
                        <Col lg={12}>
                            <Card className="mb-2">
                                <CardBody className="py-2">
                                    <Row className="g-3 align-items-end">
                                        <Col md={3}>
                                            <Label className="text-muted text-uppercase fw-semibold mb-1">From Date</Label>
                                            <Input
                                                type="date"
                                                className="form-control"
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                            />
                                        </Col>
                                        <Col md={3}>
                                            <Label className="text-muted text-uppercase fw-semibold mb-1">To Date</Label>
                                            <Input
                                                type="date"
                                                className="form-control"
                                                value={toDate}
                                                onChange={(e) => setToDate(e.target.value)}
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <Button color="primary" className="w-100" onClick={fetchReport} disabled={loading}>
                                                {loading ? <Spinner size="sm" /> : "Generate"}
                                            </Button>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex gap-2">
                                                <Input
                                                    placeholder="Search product..."
                                                    value={query}
                                                    onChange={(e) => setQuery(e.target.value)}
                                                />
                                                <Button color="success" outline onClick={handleExcel} title="Export Excel">
                                                    <i className="ri-file-excel-2-line" />
                                                </Button>
                                                <Button color="secondary" outline onClick={handlePrint} title="Print">
                                                    <i className="ri-printer-line" />
                                                </Button>
                                            </div>
                                        </Col>
                                    </Row>
                                    <div className="mt-2">
                                        <div className="form-check form-switch">
                                            <Input
                                                type="switch"
                                                id="hideZeroSwitch"
                                                checked={hideZero}
                                                onChange={(e) => setHideZero(e.target.checked)}
                                            />
                                            <Label className="form-check-label" htmlFor="hideZeroSwitch">Hide Zero Balances</Label>
                                        </div>
                                    </div>
                                    {error && <div className="alert alert-danger mt-3">{error}</div>}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {reportData && (
                        <Row>
                            <Col lg={12}>
                                <Card id="reportViewContainer" className="report-card-compact">
                                    <HeaderForAllRpt reportName='Stock Summary Report' />

                                    <CardBody className="py-1">

                                        <Row className="g-1 d-print-none">

                                            <Col md={3}>
                                                <Card className="ssr-summary-card opening">
                                                    <CardBody className="py-1 px-2 text-center">
                                                        <div className="text-muted text-uppercase fw-semibold ssr-summary-label">Opening</div>
                                                        <h4 className="ssr-summary-value mb-0 text-primary">{formatQty(totals.opening)}</h4>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                            <Col md={3}>
                                                <Card className="ssr-summary-card inward">
                                                    <CardBody className="py-1 px-2 text-center">
                                                        <div className="text-muted text-uppercase fw-semibold ssr-summary-label">Inward (+)</div>
                                                        <h4 className="ssr-summary-value mb-0 text-success">{formatQty(totals.inward)}</h4>
                                                        <div className="text-muted fs-11 mt-1">Val: {formatQty(totals.inwardAmount)}</div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                            <Col md={3}>
                                                <Card className="ssr-summary-card outward">
                                                    <CardBody className="py-1 px-2 text-center">
                                                        <div className="text-muted text-uppercase fw-semibold ssr-summary-label">Outward (-)</div>
                                                        <h4 className="ssr-summary-value mb-0 text-danger">{formatQty(totals.outward)}</h4>
                                                        <div className="text-muted fs-11 mt-1">Val: {formatQty(totals.outwardAmount)}</div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                            <Col md={3}>
                                                <Card className="ssr-summary-card closing mb-0">
                                                    <CardBody className="py-1 px-2 text-center">
                                                        <div className="text-muted text-uppercase fw-semibold ssr-summary-label">Closing</div>
                                                        <h4 className="ssr-summary-value mb-0 ssr-closing-value">{formatQty(totals.closing)}</h4>
                                                        <div className="text-muted fs-11 mt-1">Val: {formatQty(totals.closingAmount)}</div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                        </Row>
                                        <div className="ssr-table-wrap">
                                            <div className="ssr-table-container">
                                                <Table className="align-middle ssr-table table-hover">
                                                    <thead className="sticky-top">
                                                        <tr>
                                                            <th style={{ width: '22%' }}>
                                                                <button className="ssr-th-btn" onClick={() => handleSort('productName')}>
                                                                    Product <i className={sortIcon('productName')} />
                                                                </button>
                                                            </th>
                                                            <th style={{ width: '6%' }}>Unit</th>
                                                            <th style={{ width: '8%' }} className="text-end">
                                                                <button className="ssr-th-btn ssr-th-btn-end" onClick={() => handleSort('openingQty')}>
                                                                    Opening <i className={sortIcon('openingQty')} />
                                                                </button>
                                                            </th>
                                                            <th style={{ width: '8%' }} className="text-end">
                                                                <button className="ssr-th-btn ssr-th-btn-end" onClick={() => handleSort('inwardQty')}>
                                                                    Inward <i className={sortIcon('inwardQty')} />
                                                                </button>
                                                            </th>
                                                            <th style={{ width: '8%' }} className="text-end">Cost</th>
                                                            <th style={{ width: '10%' }} className="text-end">Inward Amt</th>
                                                            <th style={{ width: '8%' }} className="text-end">
                                                                <button className="ssr-th-btn ssr-th-btn-end" onClick={() => handleSort('outwardQty')}>
                                                                    Outward <i className={sortIcon('outwardQty')} />
                                                                </button>
                                                            </th>
                                                            <th style={{ width: '8%' }} className="text-end">Sale Price</th>
                                                            <th style={{ width: '10%' }} className="text-end">Outward Amt</th>
                                                            <th style={{ width: '8%' }} className="text-end">
                                                                <button className="ssr-th-btn ssr-th-btn-end" onClick={() => handleSort('closingQty')}>
                                                                    Closing <i className={sortIcon('closingQty')} />
                                                                </button>
                                                            </th>
                                                            <th style={{ width: '10%' }} className="text-end">Closing Amt</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {shownRows.map((r, i) => (
                                                            <tr key={r.productId || i}>
                                                                <td className="fw-medium">{r.productName}</td>
                                                                <td className="text-muted">{r.unitName}</td>
                                                                <td className="text-end">{formatQty(r.openingQty)}</td>
                                                                <td className="text-end text-success">+{formatQty(r.inwardQty)}</td>
                                                                <td className="text-end text-muted">{formatQty(r.costPrice)}</td>
                                                                <td className="text-end text-success">{formatQty(r.inwardAmount)}</td>
                                                                <td className="text-end text-danger">-{formatQty(r.outwardQty)}</td>
                                                                <td className="text-end text-muted">{formatQty(r.sellingPrice)}</td>
                                                                <td className="text-end text-danger">{formatQty(r.outwardAmount)}</td>
                                                                <td className="text-end fw-bold">{formatQty(r.closingQty)}</td>
                                                                <td className="text-end fw-bold text-primary">{formatQty(r.closingAmount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>
                                            <div className="ssr-total-strip d-flex align-items-center py-2 px-3">
                                                <div style={{ width: '22%' }} className="text-start ps-3 text-uppercase fw-bold">Grand Total</div>
                                                <div style={{ width: '6%' }} className="text-muted fs-11">({shownRows.length})</div>
                                                <div style={{ width: '8%' }} className="text-end">{formatQty(totals.opening)}</div>
                                                <div style={{ width: '8%' }} className="text-end text-success">{formatQty(totals.inward)}</div>
                                                <div style={{ width: '8%' }} className="text-end"></div>
                                                <div style={{ width: '10%' }} className="text-end text-success fw-bold">{formatQty(totals.inwardAmount)}</div>
                                                <div style={{ width: '8%' }} className="text-end text-danger">{formatQty(totals.outward)}</div>
                                                <div style={{ width: '8%' }} className="text-end"></div>
                                                <div style={{ width: '10%' }} className="text-end text-danger fw-bold">{formatQty(totals.outwardAmount)}</div>
                                                <div style={{ width: '8%' }} className="text-end ssr-closing-value">{formatQty(totals.closing)}</div>
                                                <div style={{ width: '10%' }} className="text-end ssr-closing-value fw-bold">{formatQty(totals.closingAmount)}</div>
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
        </React.Fragment >
    );
};

export default StockSummaryReport;
