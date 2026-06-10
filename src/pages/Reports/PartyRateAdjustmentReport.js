import React, { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
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
import {
    getPartyRateAdjustmentSummary,
    getPartyRateAdjustmentInvoiceMismatches,
    getPartyRateAdjustmentChanges
} from '../../helpers/fakebackend_helper';
import secureStorage from '../../utils/secureStorage';

const formatLocalYMD = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatAmt = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDays = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const normalizeSummaryRow = (row) => ({
    partyId: row.partyId ?? row.PartyId,
    displayName: row.displayName ?? row.DisplayName ?? '',
    partyType: row.partyType ?? row.PartyType ?? '',
    paymentTermName: row.paymentTermName ?? row.PaymentTermName ?? '',
    paymentTermDays: row.paymentTermDays ?? row.PaymentTermDays,
    last7DaysSalesTotal: Number(row.last7DaysSalesTotal ?? row.Last7DaysSalesTotal ?? 0),
    avgSalePerDay: Number(row.avgSalePerDay ?? row.AvgSalePerDay ?? 0),
    totalOutstanding: Number(row.totalOutstanding ?? row.TotalOutstanding ?? 0),
    avgOutstandingDays: Number(row.avgOutstandingDays ?? row.AvgOutstandingDays ?? 0),
    fromDue: Number(row.fromDue ?? row.FromDue ?? 0),
    toDue: Number(row.toDue ?? row.ToDue ?? 0),
    addPrice: Number(row.addPrice ?? row.AddPrice ?? 0),
    storedRateDiff: Number(row.storedRateDiff ?? row.StoredRateDiff ?? 0),
});

const normalizeChangeRow = (row) => ({
    partyId: row.partyId ?? row.PartyId,
    displayName: row.displayName ?? row.DisplayName ?? '',
    partyType: row.partyType ?? row.PartyType ?? '',
    paymentTermName: row.paymentTermName ?? row.PaymentTermName ?? '',
    paymentTermDays: row.paymentTermDays ?? row.PaymentTermDays,
    last7DaysSalesTotal: Number(row.last7DaysSalesTotal ?? row.Last7DaysSalesTotal ?? 0),
    avgSalePerDay: Number(row.avgSalePerDay ?? row.AvgSalePerDay ?? 0),
    totalOutstanding: Number(row.totalOutstanding ?? row.TotalOutstanding ?? 0),
    avgOutstandingDays: Number(row.avgOutstandingDays ?? row.AvgOutstandingDays ?? 0),
    fromDue: Number(row.fromDue ?? row.FromDue ?? 0),
    toDue: Number(row.toDue ?? row.ToDue ?? 0),
    previousAddPrice: Number(row.previousAddPrice ?? row.PreviousAddPrice ?? 0),
    newAddPrice: Number(row.newAddPrice ?? row.NewAddPrice ?? 0),
    changeAmount: Number(row.changeAmount ?? row.ChangeAmount ?? 0),
    changeType: row.changeType ?? row.ChangeType ?? '',
});

const normalizeMismatchRow = (row) => ({
    spUniqueCode: row.spUniqueCode ?? row.SpUniqueCode,
    invNo: row.invNo ?? row.InvNo ?? '',
    invDate: row.invDate ?? row.InvDate,
    dueDate: row.dueDate ?? row.DueDate,
    partyId: row.partyId ?? row.PartyId,
    displayName: row.displayName ?? row.DisplayName ?? '',
    partyType: row.partyType ?? row.PartyType ?? '',
    expectedAddPrice: Number(row.expectedAddPrice ?? row.ExpectedAddPrice ?? 0),
    actualAddPrice: Number(row.actualAddPrice ?? row.ActualAddPrice ?? 0),
    difference: Number(row.difference ?? row.Difference ?? 0),
    totalOutstanding: Number(row.totalOutstanding ?? row.TotalOutstanding ?? 0),
    last7DaysSalesTotal: Number(row.last7DaysSalesTotal ?? row.Last7DaysSalesTotal ?? 0),
    avgSalePerDay: Number(row.avgSalePerDay ?? row.AvgSalePerDay ?? 0),
    avgOutstandingDays: Number(row.avgOutstandingDays ?? row.AvgOutstandingDays ?? 0),
    fromDue: Number(row.fromDue ?? row.FromDue ?? 0),
    toDue: Number(row.toDue ?? row.ToDue ?? 0),
});

const PartyRateAdjustmentReport = () => {
    document.title = 'Party Add Price Report | SoftBook';

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [reportData, setReportData] = useState([]);
    const [mismatchData, setMismatchData] = useState([]);
    const [changeData, setChangeData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mismatchLoading, setMismatchLoading] = useState(false);
    const [changeLoading, setChangeLoading] = useState(false);
    const [error, setError] = useState('');
    const [mismatchError, setMismatchError] = useState('');
    const [changeError, setChangeError] = useState('');
    const [query, setQuery] = useState('');
    const [mismatchQuery, setMismatchQuery] = useState('');
    const [changeQuery, setChangeQuery] = useState('');
    const [changeTypeFilter, setChangeTypeFilter] = useState('');
    const [onlyWithAddPrice, setOnlyWithAddPrice] = useState(true);
    const [partyType, setPartyType] = useState('Customer,Trader');
    const [fromDate, setFromDate] = useState(formatLocalYMD(thirtyDaysAgo));
    const [toDate, setToDate] = useState(formatLocalYMD(today));

    const companyName = secureStorage.getPlain('companyName') || secureStorage.getPlain('CompanyName') || 'SoftBook';

    const fetchSummary = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getPartyRateAdjustmentSummary(partyType, onlyWithAddPrice);
            const data = Array.isArray(response) ? response : (response?.data || []);
            setReportData(data);
        } catch (err) {
            console.error('Party Add Price Report Error:', err);
            setError('Failed to load party summary. Please try again.');
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMismatches = async () => {
        setMismatchLoading(true);
        setMismatchError('');
        try {
            const response = await getPartyRateAdjustmentInvoiceMismatches(fromDate, toDate, partyType);
            const data = Array.isArray(response) ? response : (response?.data || []);
            setMismatchData(data);
        } catch (err) {
            console.error('Invoice Add Price Mismatch Error:', err);
            setMismatchError('Failed to load invoice mismatch list. Please try again.');
            setMismatchData([]);
        } finally {
            setMismatchLoading(false);
        }
    };

    const fetchChanges = async () => {
        setChangeLoading(true);
        setChangeError('');
        try {
            const response = await getPartyRateAdjustmentChanges(partyType);
            const data = Array.isArray(response) ? response : (response?.data || []);
            setChangeData(data);
        } catch (err) {
            console.error('Party Add Price Change Error:', err);
            setChangeError('Failed to load upgrade/downgrade list. Please try again.');
            setChangeData([]);
        } finally {
            setChangeLoading(false);
        }
    };

    const fetchAll = async () => {
        await Promise.all([fetchSummary(), fetchMismatches(), fetchChanges()]);
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const rows = useMemo(() => (reportData || []).map(normalizeSummaryRow), [reportData]);
    const mismatchRows = useMemo(() => (mismatchData || []).map(normalizeMismatchRow), [mismatchData]);
    const changeRows = useMemo(() => (changeData || []).map(normalizeChangeRow), [changeData]);

    const shownRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            r.displayName.toLowerCase().includes(q) ||
            r.partyType.toLowerCase().includes(q) ||
            String(r.paymentTermName || '').toLowerCase().includes(q)
        );
    }, [rows, query]);

    const storedRateDiffMismatches = useMemo(
        () => shownRows.filter((r) => r.addPrice !== r.storedRateDiff),
        [shownRows]
    );

    const shownMismatchRows = useMemo(() => {
        const q = mismatchQuery.trim().toLowerCase();
        if (!q) return mismatchRows;
        return mismatchRows.filter((r) =>
            r.displayName.toLowerCase().includes(q) ||
            r.invNo.toLowerCase().includes(q) ||
            r.partyType.toLowerCase().includes(q)
        );
    }, [mismatchRows, mismatchQuery]);

    const summaryTotals = useMemo(() => ({
        parties: shownRows.length,
        withAddPrice: shownRows.filter((r) => r.addPrice > 0).length,
        totalOutstanding: shownRows.reduce((a, r) => a + r.totalOutstanding, 0),
    }), [shownRows]);

    const mismatchTotals = useMemo(() => ({
        invoices: shownMismatchRows.length,
        parties: new Set(shownMismatchRows.map((r) => r.partyId)).size,
        higherThanExpected: shownMismatchRows.filter((r) => r.difference > 0).length,
        lowerThanExpected: shownMismatchRows.filter((r) => r.difference < 0).length,
    }), [shownMismatchRows]);

    const shownChangeRows = useMemo(() => {
        const q = changeQuery.trim().toLowerCase();
        const filtered = changeTypeFilter
            ? changeRows.filter((r) => r.changeType.toLowerCase() === changeTypeFilter.toLowerCase())
            : changeRows;
        if (!q) return filtered;
        return filtered.filter((r) =>
            r.displayName.toLowerCase().includes(q) ||
            r.partyType.toLowerCase().includes(q) ||
            r.changeType.toLowerCase().includes(q)
        );
    }, [changeRows, changeQuery, changeTypeFilter]);

    const changeTotals = useMemo(() => ({
        total: shownChangeRows.length,
        upgraded: shownChangeRows.filter((r) => r.changeType === 'Upgraded').length,
        downgraded: shownChangeRows.filter((r) => r.changeType === 'Downgraded').length,
    }), [shownChangeRows]);

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Party Add Price Report" pageTitle="Reports" />

                <Card className="mb-4">
                    <CardBody>
                        <Row className="g-3 align-items-end mb-3">
                            <Col md={3}>
                                <Label className="form-label">Party Type</Label>
                                <Input type="select" value={partyType} onChange={(e) => setPartyType(e.target.value)}>
                                    <option value="Customer,Trader">Customer & Trader</option>
                                    <option value="Customer">Customer</option>
                                    <option value="Trader">Trader</option>
                                    <option value="Vendor">Vendor</option>
                                </Input>
                            </Col>
                            <Col md={3}>
                                <Label className="form-label">From Date (for invoice check)</Label>
                                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                            </Col>
                            <Col md={3}>
                                <Label className="form-label">To Date (for invoice check)</Label>
                                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                            </Col>
                            <Col md={3}>
                                <Button color="primary" className="w-100" onClick={fetchAll} disabled={loading || mismatchLoading || changeLoading}>
                                    {(loading || mismatchLoading || changeLoading) ? <Spinner size="sm" /> : 'Show Report'}
                                </Button>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>

                <Card className="mb-4 border-success border-opacity-25">
                    <CardHeader className="bg-success bg-opacity-10">
                        <h5 className="card-title mb-0">Card 1 — Party Add Price (Current Calculation)</h5>
                    </CardHeader>
                    <CardBody>
                        <p className="text-muted small mb-3">
                            Current add price from outstanding and last 7 days sales using <code>tab_add_price</code>.
                        </p>

                        <Row className="g-3 align-items-end mb-3">
                            <Col md={4}>
                                <Label className="form-label">Filter</Label>
                                <Input
                                    type="select"
                                    value={onlyWithAddPrice ? 'with_add_price' : 'all'}
                                    onChange={(e) => setOnlyWithAddPrice(e.target.value === 'with_add_price')}
                                >
                                    <option value="with_add_price">Only parties with Add Price &gt; 0</option>
                                    <option value="all">All parties</option>
                                </Input>
                            </Col>
                            <Col md={6}>
                                <Label className="form-label">Search</Label>
                                <Input
                                    type="text"
                                    placeholder="Party name, type, payment term..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </Col>
                            <Col md={2}>
                                <Button color="soft-success" className="w-100" onClick={fetchSummary} disabled={loading}>
                                    {loading ? <Spinner size="sm" /> : 'Refresh'}
                                </Button>
                            </Col>
                        </Row>

                        {error && <div className="alert alert-danger py-2">{error}</div>}

                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge color="soft-primary" className="fs-12">Parties: {summaryTotals.parties}</Badge>
                            <Badge color="soft-success" className="fs-12">With Add Price: {summaryTotals.withAddPrice}</Badge>
                            <Badge color="soft-warning" className="fs-12">Total Outstanding: {formatAmt(summaryTotals.totalOutstanding)}</Badge>
                            <Badge color="soft-danger" className="fs-12">Stored Rate Diff Mismatch: {storedRateDiffMismatches.length}</Badge>
                        </div>

                        <div className="table-responsive">
                            <Table className="table-bordered table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Party</th>
                                        <th>Type</th>
                                        <th>Payment Term</th>
                                        <th className="text-end">Outstanding</th>
                                        <th className="text-end">7 Days Sales</th>
                                        <th className="text-end">Avg Sale/Day</th>
                                        <th className="text-end">Avg O/S Days</th>
                                        <th>Due Range</th>
                                        <th className="text-end">Calculated Add Price</th>
                                        <th className="text-end">Stored Rate Diff</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownRows.length > 0 ? shownRows.map((row) => {
                                        const reason = row.avgSalePerDay <= 0
                                            ? 'No sales in last 7 days — Avg O/S Days = 0, lowest add price range applies.'
                                            : `Outstanding ${formatAmt(row.totalOutstanding)} ÷ Avg Sale/Day ${formatAmt(row.avgSalePerDay)} = ${formatDays(row.avgOutstandingDays)} days → range ${formatDays(row.fromDue)} to ${formatDays(row.toDue)} → Add Price ${formatAmt(row.addPrice)}`;
                                        const storedMismatch = row.addPrice !== row.storedRateDiff;

                                        return (
                                            <tr key={row.partyId} className={storedMismatch ? 'table-warning' : ''}>
                                                <td>{row.displayName || '—'}</td>
                                                <td>{row.partyType || '—'}</td>
                                                <td>
                                                    {row.paymentTermName || '—'}
                                                    {row.paymentTermDays != null ? ` (${row.paymentTermDays} days)` : ''}
                                                </td>
                                                <td className="text-end">{formatAmt(row.totalOutstanding)}</td>
                                                <td className="text-end">{formatAmt(row.last7DaysSalesTotal)}</td>
                                                <td className="text-end">{formatAmt(row.avgSalePerDay)}</td>
                                                <td className="text-end fw-semibold">{formatDays(row.avgOutstandingDays)}</td>
                                                <td>{formatDays(row.fromDue)} – {formatDays(row.toDue)}</td>
                                                <td className={`text-end fw-semibold ${row.addPrice > 0 ? 'text-success' : ''}`}>
                                                    {formatAmt(row.addPrice)}
                                                </td>
                                                <td className={`text-end ${storedMismatch ? 'text-danger fw-semibold' : ''}`}>
                                                    {formatAmt(row.storedRateDiff)}
                                                </td>
                                                <td className="small text-muted" style={{ minWidth: '260px' }}>{reason}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="11" className="text-center text-muted py-4">
                                                {loading ? 'Loading...' : 'No parties found for the selected filter.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>

                <Card className="mb-4 border-danger border-opacity-25">
                    <CardHeader className="bg-danger bg-opacity-10">
                        <h5 className="card-title mb-0">Card 2 — Invoice Add Price Mismatch</h5>
                    </CardHeader>
                    <CardBody>
                        <p className="text-muted small mb-3">
                            Sales invoices where the <strong>actual add price used on the invoice</strong> differs from the
                            <strong> expected add price</strong> calculated on the invoice date from outstanding and 7-day sales.
                        </p>

                        <Row className="g-3 align-items-end mb-3">
                            <Col md={8}>
                                <Label className="form-label">Search invoices</Label>
                                <Input
                                    type="text"
                                    placeholder="Invoice no, party name..."
                                    value={mismatchQuery}
                                    onChange={(e) => setMismatchQuery(e.target.value)}
                                />
                            </Col>
                            <Col md={4}>
                                <Button color="soft-danger" className="w-100" onClick={fetchMismatches} disabled={mismatchLoading}>
                                    {mismatchLoading ? <Spinner size="sm" /> : 'Refresh Mismatches'}
                                </Button>
                            </Col>
                        </Row>

                        {mismatchError && <div className="alert alert-danger py-2">{mismatchError}</div>}

                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge color="soft-danger" className="fs-12">Mismatch Invoices: {mismatchTotals.invoices}</Badge>
                            <Badge color="soft-primary" className="fs-12">Parties Affected: {mismatchTotals.parties}</Badge>
                            <Badge color="soft-warning" className="fs-12">Higher Than Expected: {mismatchTotals.higherThanExpected}</Badge>
                            <Badge color="soft-info" className="fs-12">Lower Than Expected: {mismatchTotals.lowerThanExpected}</Badge>
                        </div>

                        <div className="table-responsive">
                            <Table className="table-bordered table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Invoice Date</th>
                                        <th>Invoice No</th>
                                        <th>Party</th>
                                        <th className="text-end">Outstanding (on inv date)</th>
                                        <th className="text-end">7 Days Sales</th>
                                        <th className="text-end">Avg O/S Days</th>
                                        <th>Due Range</th>
                                        <th className="text-end">Expected Add Price</th>
                                        <th className="text-end">Actual Add Price</th>
                                        <th className="text-end">Difference</th>
                                        <th>Why Mismatch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownMismatchRows.length > 0 ? shownMismatchRows.map((row) => {
                                        const why = row.avgSalePerDay <= 0
                                            ? `On ${formatDate(row.invDate)}, no sales in prior 7 days. Expected ${formatAmt(row.expectedAddPrice)}, but invoice used ${formatAmt(row.actualAddPrice)}.`
                                            : `On ${formatDate(row.invDate)}: O/S ${formatAmt(row.totalOutstanding)} ÷ Avg Sale ${formatAmt(row.avgSalePerDay)} = ${formatDays(row.avgOutstandingDays)} days → expected ${formatAmt(row.expectedAddPrice)}, invoice used ${formatAmt(row.actualAddPrice)}.`;

                                        return (
                                            <tr key={row.spUniqueCode}>
                                                <td>{formatDate(row.invDate)}</td>
                                                <td>
                                                    <a
                                                        href={`/sales-order/edit/${row.spUniqueCode}?view=true`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary"
                                                    >
                                                        {row.invNo || row.spUniqueCode}
                                                    </a>
                                                </td>
                                                <td>{row.displayName || '—'}</td>
                                                <td className="text-end">{formatAmt(row.totalOutstanding)}</td>
                                                <td className="text-end">{formatAmt(row.last7DaysSalesTotal)}</td>
                                                <td className="text-end">{formatDays(row.avgOutstandingDays)}</td>
                                                <td>{formatDays(row.fromDue)} – {formatDays(row.toDue)}</td>
                                                <td className="text-end fw-semibold text-success">{formatAmt(row.expectedAddPrice)}</td>
                                                <td className="text-end fw-semibold text-danger">{formatAmt(row.actualAddPrice)}</td>
                                                <td className={`text-end fw-semibold ${row.difference > 0 ? 'text-warning' : 'text-info'}`}>
                                                    {row.difference > 0 ? '+' : ''}{formatAmt(row.difference)}
                                                </td>
                                                <td className="small text-muted" style={{ minWidth: '280px' }}>{why}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="11" className="text-center text-muted py-4">
                                                {mismatchLoading
                                                    ? 'Loading...'
                                                    : 'No invoice add price mismatches found for the selected date range.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>

                <Card className="mb-4 border-warning border-opacity-25">
                    <CardHeader className="bg-warning bg-opacity-10">
                        <h5 className="card-title mb-0">Card 3 — Party Upgraded / Downgraded (Add Price Change)</h5>
                    </CardHeader>
                    <CardBody>
                        <p className="text-muted small mb-3">
                            Parties where the <strong>current calculated add price</strong> differs from the
                            <strong> stored rate diff</strong> on party master.
                            <br />
                            <strong>Upgraded</strong> = payment improved, outstanding reduced → add price should <strong>decrease</strong> (e.g. 7 → 5).
                            <strong> Downgraded</strong> = outstanding increased → add price should <strong>increase</strong> (e.g. 5 → 7).
                        </p>

                        <Row className="g-3 align-items-end mb-3">
                            <Col md={4}>
                                <Label className="form-label">Change Type</Label>
                                <Input
                                    type="select"
                                    value={changeTypeFilter}
                                    onChange={(e) => setChangeTypeFilter(e.target.value)}
                                >
                                    <option value="">All Changes</option>
                                    <option value="Upgraded">Upgraded (Add Price Decreased)</option>
                                    <option value="Downgraded">Downgraded (Add Price Increased)</option>
                                </Input>
                            </Col>
                            <Col md={5}>
                                <Label className="form-label">Search</Label>
                                <Input
                                    type="text"
                                    placeholder="Party name, type..."
                                    value={changeQuery}
                                    onChange={(e) => setChangeQuery(e.target.value)}
                                />
                            </Col>
                            <Col md={3}>
                                <Button color="soft-warning" className="w-100" onClick={fetchChanges} disabled={changeLoading}>
                                    {changeLoading ? <Spinner size="sm" /> : 'Refresh Changes'}
                                </Button>
                            </Col>
                        </Row>

                        {changeError && <div className="alert alert-danger py-2">{changeError}</div>}

                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge color="soft-warning" className="fs-12">Total Changes: {changeTotals.total}</Badge>
                            <Badge color="soft-success" className="fs-12">Upgraded: {changeTotals.upgraded}</Badge>
                            <Badge color="soft-danger" className="fs-12">Downgraded: {changeTotals.downgraded}</Badge>
                        </div>

                        <div className="table-responsive">
                            <Table className="table-bordered table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Status</th>
                                        <th>Party</th>
                                        <th>Type</th>
                                        <th className="text-end">Outstanding</th>
                                        <th className="text-end">7 Days Sales</th>
                                        <th className="text-end">Avg O/S Days</th>
                                        <th>Due Range</th>
                                        <th className="text-end">Previous Add Price</th>
                                        <th className="text-end">New Add Price</th>
                                        <th className="text-end">Change</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownChangeRows.length > 0 ? shownChangeRows.map((row) => {
                                        const isUpgraded = row.changeType === 'Upgraded';
                                        const reason = isUpgraded
                                            ? `Payment improved — outstanding is now ${formatAmt(row.totalOutstanding)}. Avg O/S Days ${formatDays(row.avgOutstandingDays)} → add price reduced from ${formatAmt(row.previousAddPrice)} to ${formatAmt(row.newAddPrice)}.`
                                            : `Outstanding increased to ${formatAmt(row.totalOutstanding)}. Avg O/S Days ${formatDays(row.avgOutstandingDays)} → add price increased from ${formatAmt(row.previousAddPrice)} to ${formatAmt(row.newAddPrice)}.`;

                                        return (
                                            <tr key={row.partyId} className={isUpgraded ? 'table-success' : 'table-danger'}>
                                                <td>
                                                    <Badge color={isUpgraded ? 'success' : 'danger'}>
                                                        {row.changeType}
                                                    </Badge>
                                                </td>
                                                <td>{row.displayName || '—'}</td>
                                                <td>{row.partyType || '—'}</td>
                                                <td className="text-end">{formatAmt(row.totalOutstanding)}</td>
                                                <td className="text-end">{formatAmt(row.last7DaysSalesTotal)}</td>
                                                <td className="text-end">{formatDays(row.avgOutstandingDays)}</td>
                                                <td>{formatDays(row.fromDue)} – {formatDays(row.toDue)}</td>
                                                <td className="text-end fw-semibold">{formatAmt(row.previousAddPrice)}</td>
                                                <td className={`text-end fw-semibold ${isUpgraded ? 'text-success' : 'text-danger'}`}>
                                                    {formatAmt(row.newAddPrice)}
                                                </td>
                                                <td className={`text-end fw-semibold ${isUpgraded ? 'text-success' : 'text-danger'}`}>
                                                    {isUpgraded ? '−' : '+'}{formatAmt(row.changeAmount)}
                                                </td>
                                                <td className="small text-muted" style={{ minWidth: '280px' }}>{reason}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="11" className="text-center text-muted py-4">
                                                {changeLoading
                                                    ? 'Loading...'
                                                    : 'No upgraded or downgraded parties found. Stored rate diff matches current calculation.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>

                <HeaderForAllRpt companyName={companyName} reportTitle="Party Add Price Report" />
                <FooterForAllRpt />
            </Container>
        </div>
    );
};

export default PartyRateAdjustmentReport;
