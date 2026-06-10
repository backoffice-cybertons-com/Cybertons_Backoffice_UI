import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Badge,
    Card,
    CardBody,
    CardHeader,
    Col,
    Input,
    Row,
    Spinner,
    Table
} from 'reactstrap';

const formatAmt = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDays = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const PartyAddPriceDashboardCards = ({ partyAddPriceData, periodLabel, loading }) => {
    const [summaryQuery, setSummaryQuery] = useState('');
    const [mismatchQuery, setMismatchQuery] = useState('');
    const [changeQuery, setChangeQuery] = useState('');
    const [changeFilter, setChangeFilter] = useState('');

    const summaryBlock = partyAddPriceData?.summary ?? partyAddPriceData?.Summary ?? {};
    const mismatchBlock = partyAddPriceData?.invoice_mismatches ?? partyAddPriceData?.invoiceMismatches ?? {};
    const changesBlock = partyAddPriceData?.changes ?? partyAddPriceData?.Changes ?? {};

    const summaryRows = useMemo(() => {
        const items = summaryBlock?.items ?? summaryBlock?.Items ?? [];
        return (items || []).map((row) => ({
            partyId: row.party_id ?? row.partyId,
            displayName: row.display_name ?? row.displayName ?? '',
            totalOutstanding: Number(row.total_outstanding ?? row.totalOutstanding ?? 0),
            last7DaysSales: Number(row.last_7_days_sales_total ?? row.last7DaysSalesTotal ?? 0),
            avgSalePerDay: Number(row.avg_sale_per_day ?? row.avgSalePerDay ?? 0),
            avgOutstandingDays: Number(row.avg_outstanding_days ?? row.avgOutstandingDays ?? 0),
            addPrice: Number(row.add_price ?? row.addPrice ?? 0),
            storedRateDiff: Number(row.stored_rate_diff ?? row.storedRateDiff ?? 0),
        }));
    }, [summaryBlock]);

    const mismatchRows = useMemo(() => {
        const items = mismatchBlock?.items ?? mismatchBlock?.Items ?? [];
        return (items || []).map((row) => ({
            spUniqueCode: row.sp_unique_code ?? row.spUniqueCode,
            invNo: row.inv_no ?? row.invNo ?? '',
            invDate: row.inv_date ?? row.invDate,
            displayName: row.display_name ?? row.displayName ?? '',
            expectedAddPrice: Number(row.expected_add_price ?? row.expectedAddPrice ?? 0),
            actualAddPrice: Number(row.actual_add_price ?? row.actualAddPrice ?? 0),
            difference: Number(row.difference ?? row.Difference ?? 0),
            avgOutstandingDays: Number(row.avg_outstanding_days ?? row.avgOutstandingDays ?? 0),
        }));
    }, [mismatchBlock]);

    const changeRows = useMemo(() => {
        const items = changesBlock?.items ?? changesBlock?.Items ?? [];
        return (items || []).map((row) => ({
            partyId: row.party_id ?? row.partyId,
            displayName: row.display_name ?? row.displayName ?? '',
            totalOutstanding: Number(row.total_outstanding ?? row.totalOutstanding ?? 0),
            avgOutstandingDays: Number(row.avg_outstanding_days ?? row.avgOutstandingDays ?? 0),
            previousAddPrice: Number(row.previous_add_price ?? row.previousAddPrice ?? 0),
            newAddPrice: Number(row.new_add_price ?? row.newAddPrice ?? 0),
            changeAmount: Number(row.change_amount ?? row.changeAmount ?? 0),
            changeType: row.change_type ?? row.changeType ?? '',
        }));
    }, [changesBlock]);

    const filterRows = (rows, query, fields) => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => fields.some((f) => String(r[f] || '').toLowerCase().includes(q)));
    };

    const shownSummary = filterRows(summaryRows, summaryQuery, ['displayName']);
    const shownMismatches = filterRows(mismatchRows, mismatchQuery, ['displayName', 'invNo']);
    const shownChanges = useMemo(() => {
        let rows = changeFilter
            ? changeRows.filter((r) => r.changeType.toLowerCase() === changeFilter.toLowerCase())
            : changeRows;
        return filterRows(rows, changeQuery, ['displayName', 'changeType']);
    }, [changeRows, changeFilter, changeQuery]);

    const summaryCounts = {
        total: Number(summaryBlock?.total_count ?? summaryBlock?.totalCount ?? 0),
        withAddPrice: Number(summaryBlock?.with_add_price_count ?? summaryBlock?.withAddPriceCount ?? 0),
    };
    const mismatchCount = Number(mismatchBlock?.total_count ?? mismatchBlock?.totalCount ?? 0);
    const changeCounts = {
        total: Number(changesBlock?.total_count ?? changesBlock?.totalCount ?? 0),
        upgraded: Number(changesBlock?.upgraded_count ?? changesBlock?.upgradedCount ?? 0),
        downgraded: Number(changesBlock?.downgraded_count ?? changesBlock?.downgradedCount ?? 0),
    };

    const LoadingOverlay = () => loading ? (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
            <Spinner color="primary" size="sm" />
        </div>
    ) : null;

    return (
        <>
            <Col xl={12} className="mb-4">
                <Card className="card-height-100 overflow-hidden border-success border-opacity-25">
                    <CardHeader className="align-items-center d-flex border-bottom-dashed py-2 bg-success bg-opacity-10">
                        <div className="flex-grow-1">
                            <h4 className="card-title mb-0 fs-14">Party Add Price (Current)</h4>
                            <p className="text-muted mb-0 fs-11">Parties with calculated add price based on outstanding and 7-day sales</p>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            <Badge color="soft-primary" className="fs-11">Parties: {summaryCounts.total}</Badge>
                            <Badge color="soft-success" className="fs-11">With Add Price: {summaryCounts.withAddPrice}</Badge>
                            <Link to="/reports/party-rate-adjustment" className="text-primary fs-11 text-decoration-underline">Full Report</Link>
                        </div>
                    </CardHeader>
                    <CardBody className="p-3">
                        <Input
                            type="text"
                            size="sm"
                            className="form-control-sm shadow-none fs-12 mb-2"
                            placeholder="Search party..."
                            value={summaryQuery}
                            onChange={(e) => setSummaryQuery(e.target.value)}
                            style={{ maxWidth: '320px' }}
                        />
                        <div className="table-responsive table-card" style={{ position: 'relative' }}>
                            <LoadingOverlay />
                            <Table className="table-sm table-nowrap align-middle mb-0" style={{ fontSize: '12px' }}>
                                <thead className="table-light text-muted fs-11">
                                    <tr>
                                        <th>Party</th>
                                        <th className="text-end">Outstanding</th>
                                        <th className="text-end">7 Days Sales</th>
                                        <th className="text-end">Avg O/S Days</th>
                                        <th className="text-end">Add Price</th>
                                        <th className="text-end">Stored</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownSummary.length > 0 ? shownSummary.map((row) => (
                                        <tr key={row.partyId}>
                                            <td className="text-truncate" style={{ maxWidth: '160px' }} title={row.displayName}>{row.displayName}</td>
                                            <td className="text-end">{formatAmt(row.totalOutstanding)}</td>
                                            <td className="text-end">{formatAmt(row.last7DaysSales)}</td>
                                            <td className="text-end">{formatDays(row.avgOutstandingDays)}</td>
                                            <td className="text-end fw-semibold text-success">{formatAmt(row.addPrice)}</td>
                                            <td className={`text-end ${row.addPrice !== row.storedRateDiff ? 'text-danger fw-semibold' : ''}`}>
                                                {formatAmt(row.storedRateDiff)}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 text-muted fs-12">
                                                {loading ? 'Fetching data...' : 'No parties with add price found.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            </Col>

            <Col xl={12} className="mb-4">
                <Card className="card-height-100 overflow-hidden border-danger border-opacity-25">
                    <CardHeader className="align-items-center d-flex border-bottom-dashed py-2 bg-danger bg-opacity-10">
                        <div className="flex-grow-1">
                            <h4 className="card-title mb-0 fs-14">Invoice Add Price Mismatch</h4>
                            <p className="text-muted mb-0 fs-11">{periodLabel} — invoices where actual add price differs from expected</p>
                        </div>
                        <Badge color="soft-danger" className="fs-11">Mismatches: {mismatchCount}</Badge>
                    </CardHeader>
                    <CardBody className="p-3">
                        <Input
                            type="text"
                            size="sm"
                            className="form-control-sm shadow-none fs-12 mb-2"
                            placeholder="Search invoice or party..."
                            value={mismatchQuery}
                            onChange={(e) => setMismatchQuery(e.target.value)}
                            style={{ maxWidth: '320px' }}
                        />
                        <div className="table-responsive table-card" style={{ position: 'relative' }}>
                            <LoadingOverlay />
                            <Table className="table-sm table-nowrap align-middle mb-0" style={{ fontSize: '12px' }}>
                                <thead className="table-light text-muted fs-11">
                                    <tr>
                                        <th>Date</th>
                                        <th>Invoice</th>
                                        <th>Party</th>
                                        <th className="text-end">Expected</th>
                                        <th className="text-end">Actual</th>
                                        <th className="text-end">Diff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownMismatches.length > 0 ? shownMismatches.map((row) => (
                                        <tr key={row.spUniqueCode}>
                                            <td>{formatDate(row.invDate)}</td>
                                            <td>
                                                <Link to={`/sales-order/edit/${row.spUniqueCode}?view=true`} target="_blank" className="text-primary fw-medium">
                                                    {row.invNo || row.spUniqueCode}
                                                </Link>
                                            </td>
                                            <td className="text-truncate" style={{ maxWidth: '140px' }} title={row.displayName}>{row.displayName}</td>
                                            <td className="text-end text-success">{formatAmt(row.expectedAddPrice)}</td>
                                            <td className="text-end text-danger">{formatAmt(row.actualAddPrice)}</td>
                                            <td className="text-end fw-semibold">{row.difference > 0 ? '+' : ''}{formatAmt(row.difference)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 text-muted fs-12">
                                                {loading ? 'Fetching data...' : 'No invoice add price mismatches in this period.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            </Col>

            <Col xl={12}>
                <Card className="card-height-100 overflow-hidden border-warning border-opacity-25">
                    <CardHeader className="align-items-center d-flex border-bottom-dashed py-2 bg-warning bg-opacity-10">
                        <div className="flex-grow-1">
                            <h4 className="card-title mb-0 fs-14">Party Upgraded / Downgraded</h4>
                            <p className="text-muted mb-0 fs-11">Stored rate diff differs from current calculated add price</p>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            <Badge color="soft-success" className="fs-11">Upgraded: {changeCounts.upgraded}</Badge>
                            <Badge color="soft-danger" className="fs-11">Downgraded: {changeCounts.downgraded}</Badge>
                        </div>
                    </CardHeader>
                    <CardBody className="p-3">
                        <Row className="g-2 mb-2">
                            <Col md={4}>
                                <Input
                                    type="select"
                                    bsSize="sm"
                                    className="form-control-sm shadow-none fs-12"
                                    value={changeFilter}
                                    onChange={(e) => setChangeFilter(e.target.value)}
                                >
                                    <option value="">All Changes</option>
                                    <option value="Upgraded">Upgraded (Price Decreased)</option>
                                    <option value="Downgraded">Downgraded (Price Increased)</option>
                                </Input>
                            </Col>
                            <Col md={4}>
                                <Input
                                    type="text"
                                    size="sm"
                                    className="form-control-sm shadow-none fs-12"
                                    placeholder="Search party..."
                                    value={changeQuery}
                                    onChange={(e) => setChangeQuery(e.target.value)}
                                />
                            </Col>
                        </Row>
                        <div className="table-responsive table-card" style={{ position: 'relative' }}>
                            <LoadingOverlay />
                            <Table className="table-sm table-nowrap align-middle mb-0" style={{ fontSize: '12px' }}>
                                <thead className="table-light text-muted fs-11">
                                    <tr>
                                        <th>Status</th>
                                        <th>Party</th>
                                        <th className="text-end">Outstanding</th>
                                        <th className="text-end">Avg O/S Days</th>
                                        <th className="text-end">Previous</th>
                                        <th className="text-end">New</th>
                                        <th className="text-end">Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownChanges.length > 0 ? shownChanges.map((row) => {
                                        const isUpgraded = row.changeType === 'Upgraded';
                                        return (
                                            <tr key={row.partyId}>
                                                <td>
                                                    <Badge color={isUpgraded ? 'success' : 'danger'} className="fs-10">
                                                        {row.changeType}
                                                    </Badge>
                                                </td>
                                                <td className="text-truncate" style={{ maxWidth: '160px' }} title={row.displayName}>{row.displayName}</td>
                                                <td className="text-end">{formatAmt(row.totalOutstanding)}</td>
                                                <td className="text-end">{formatDays(row.avgOutstandingDays)}</td>
                                                <td className="text-end">{formatAmt(row.previousAddPrice)}</td>
                                                <td className={`text-end fw-semibold ${isUpgraded ? 'text-success' : 'text-danger'}`}>
                                                    {formatAmt(row.newAddPrice)}
                                                </td>
                                                <td className={`text-end fw-semibold ${isUpgraded ? 'text-success' : 'text-danger'}`}>
                                                    {isUpgraded ? '−' : '+'}{formatAmt(row.changeAmount)}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4 text-muted fs-12">
                                                {loading ? 'Fetching data...' : 'No upgraded or downgraded parties found.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            </Col>
        </>
    );
};

export default PartyAddPriceDashboardCards;
