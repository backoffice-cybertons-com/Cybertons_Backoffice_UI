import React, { useMemo, useState } from 'react';
import {
    Badge,
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
} from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import HeaderForAllRpt from '../../Components/Common/HeaderForAllRpt';
import FooterForAllRpt from '../../Components/Common/FooterForAllRpt';
import { getBelowPriceSalesReport } from '../../helpers/fakebackend_helper';
import secureStorage from '../../utils/secureStorage';

const formatLocalYMD = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatAmt = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQty = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const getAlertBadge = (row) => {
    if (row.isBelowCost && row.isBelowSellingPrice) {
        return <Badge color="danger">Below Cost & Sale Price</Badge>;
    }
    if (row.isBelowCost) {
        return <Badge color="danger">Below Cost Price</Badge>;
    }
    if (row.isBelowSellingPrice) {
        return <Badge color="warning">Below Sale Price</Badge>;
    }
    return <Badge color="secondary">{row.alertType || 'Alert'}</Badge>;
};

const BelowPriceSalesReport = () => {
    document.title = 'Below Price Sales Report | SoftBook';

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [fromDate, setFromDate] = useState(formatLocalYMD(firstOfMonth));
    const [toDate, setToDate] = useState(formatLocalYMD(today));
    const [filterType, setFilterType] = useState('all');
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');

    const companyName = secureStorage.getPlain('companyName') || secureStorage.getPlain('CompanyName') || 'SoftBook';

    const fetchReport = async () => {
        if (!fromDate || !toDate) {
            setError('Please select date range.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const companyId = secureStorage.getPlain('companyId') || 0;
            const response = await getBelowPriceSalesReport(companyId, fromDate, toDate, filterType);
            const data = Array.isArray(response) ? response : (response?.data || []);
            setReportData(data);
        } catch (err) {
            console.error('Below Price Sales Report Error:', err);
            setError('Failed to load report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const rows = useMemo(() => {
        return (reportData || []).map((row) => ({
            spUniqueCode: row.spUniqueCode ?? row.SpUniqueCode,
            invDate: row.invDate ?? row.InvDate,
            invNo: row.invNo ?? row.InvNo ?? '',
            partyName: row.partyName ?? row.PartyName ?? '',
            productName: row.productName ?? row.ProductName ?? '',
            qty: Number(row.qty ?? row.Qty ?? 0),
            invoiceRate: Number(row.invoiceRate ?? row.InvoiceRate ?? 0),
            costPrice: Number(row.costPrice ?? row.CostPrice ?? 0),
            sellingPrice: Number(row.sellingPrice ?? row.SellingPrice ?? 0),
            lossVsCost: Number(row.lossVsCost ?? row.LossVsCost ?? 0),
            diffVsSellingPrice: Number(row.diffVsSellingPrice ?? row.DiffVsSellingPrice ?? 0),
            isBelowCost: row.isBelowCost ?? row.IsBelowCost ?? false,
            isBelowSellingPrice: row.isBelowSellingPrice ?? row.IsBelowSellingPrice ?? false,
            alertType: row.alertType ?? row.AlertType ?? '',
        }));
    }, [reportData]);

    const shownRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            r.invNo.toLowerCase().includes(q) ||
            r.partyName.toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q)
        );
    }, [rows, query]);

    const totals = useMemo(() => ({
        qty: shownRows.reduce((a, r) => a + r.qty, 0),
        belowCost: shownRows.filter((r) => r.isBelowCost).length,
        belowSale: shownRows.filter((r) => r.isBelowSellingPrice).length,
    }), [shownRows]);

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Below Price Sales Report" pageTitle="Reports" />

                <Card>
                    <CardBody>
                        <Row className="g-3 align-items-end mb-3">
                            <Col md={2}>
                                <Label className="form-label">From Date</Label>
                                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                            </Col>
                            <Col md={2}>
                                <Label className="form-label">To Date</Label>
                                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                            </Col>
                            <Col md={3}>
                                <Label className="form-label">Filter</Label>
                                <Input type="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                    <option value="all">Below Cost or Sale Price</option>
                                    <option value="below_cost">Below Cost Price Only</option>
                                    <option value="below_sale_price">Below Sale Price Only</option>
                                </Input>
                            </Col>
                            <Col md={3}>
                                <Label className="form-label">Search</Label>
                                <Input
                                    type="text"
                                    placeholder="Invoice, party, product..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </Col>
                            <Col md={2}>
                                <Button color="primary" className="w-100" onClick={fetchReport} disabled={loading}>
                                    {loading ? <Spinner size="sm" /> : 'Show Report'}
                                </Button>
                            </Col>
                        </Row>

                        {error && <div className="alert alert-danger py-2">{error}</div>}

                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge color="soft-danger" className="fs-12">Below Cost Lines: {totals.belowCost}</Badge>
                            <Badge color="soft-warning" className="fs-12">Below Sale Price Lines: {totals.belowSale}</Badge>
                            <Badge color="soft-primary" className="fs-12">Total Lines: {shownRows.length}</Badge>
                        </div>

                        <div className="table-responsive">
                            <Table className="table-bordered table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date</th>
                                        <th>Invoice No</th>
                                        <th>Customer</th>
                                        <th>Product</th>
                                        <th className="text-end">Qty</th>
                                        <th className="text-end">Invoice Rate</th>
                                        <th className="text-end">Cost Price</th>
                                        <th className="text-end">Sale Price</th>
                                        <th className="text-end">Loss vs Cost</th>
                                        <th className="text-end">Diff vs Sale Price</th>
                                        <th>Alert</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownRows.length > 0 ? shownRows.map((row, idx) => (
                                        <tr key={`${row.spUniqueCode}-${idx}`}>
                                            <td>{formatDate(row.invDate)}</td>
                                            <td>
                                                {row.spUniqueCode ? (
                                                    <a
                                                        href={`/sales-order/edit/${row.spUniqueCode}?view=true`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary"
                                                    >
                                                        {row.invNo || 'View'}
                                                    </a>
                                                ) : (
                                                    row.invNo || '—'
                                                )}
                                            </td>
                                            <td>{row.partyName || '—'}</td>
                                            <td>{row.productName || '—'}</td>
                                            <td className="text-end">{formatQty(row.qty)}</td>
                                            <td className="text-end fw-semibold">{formatAmt(row.invoiceRate)}</td>
                                            <td className="text-end">{formatAmt(row.costPrice)}</td>
                                            <td className="text-end">{formatAmt(row.sellingPrice)}</td>
                                            <td className={`text-end ${row.lossVsCost > 0 ? 'text-danger fw-semibold' : ''}`}>
                                                {formatAmt(row.lossVsCost)}
                                            </td>
                                            <td className={`text-end ${row.diffVsSellingPrice > 0 ? 'text-warning fw-semibold' : ''}`}>
                                                {formatAmt(row.diffVsSellingPrice)}
                                            </td>
                                            <td>{getAlertBadge(row)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="11" className="text-center text-muted py-4">
                                                {loading ? 'Loading...' : 'No invoices found where sale rate is below cost or standard sale price.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {shownRows.length > 0 && (
                                    <tfoot className="table-light">
                                        <tr>
                                            <th colSpan="4" className="text-end">Total</th>
                                            <th className="text-end">{formatQty(totals.qty)}</th>
                                            <th colSpan="6"></th>
                                        </tr>
                                    </tfoot>
                                )}
                            </Table>
                        </div>
                    </CardBody>
                </Card>

                <HeaderForAllRpt companyName={companyName} reportTitle="Below Price Sales Report" />
                <FooterForAllRpt />
            </Container>
        </div>
    );
};

export default BelowPriceSalesReport;
