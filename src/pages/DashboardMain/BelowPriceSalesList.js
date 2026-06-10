import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Badge,
    Card,
    CardBody,
    CardHeader,
    Col,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Input,
    Pagination,
    PaginationItem,
    PaginationLink,
    Spinner,
    Table
} from 'reactstrap';

const formatAmt = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQty = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const FILTER_OPTIONS = [
    { value: 'all', label: 'All Alerts' },
    { value: 'below_cost', label: 'Below Cost Price' },
    { value: 'below_sale_price', label: 'Below Sale Price' },
];

const getAlertBadge = (row) => {
    if (row.isBelowCost && row.isBelowSellingPrice) {
        return <Badge color="danger" className="fs-10">Below Cost & Sale</Badge>;
    }
    if (row.isBelowCost) {
        return <Badge color="danger" className="fs-10">Below Cost</Badge>;
    }
    if (row.isBelowSellingPrice) {
        return <Badge color="warning" className="fs-10">Below Sale Price</Badge>;
    }
    return <Badge color="secondary" className="fs-10">{row.alertType || 'Alert'}</Badge>;
};

const BelowPriceSalesList = ({ belowPriceData, periodLabel, loading }) => {
    const [filterType, setFilterType] = useState('all');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);

    const summary = useMemo(() => ({
        belowCostCount: Number(belowPriceData?.below_cost_count ?? belowPriceData?.belowCostCount ?? 0),
        belowSalePriceCount: Number(belowPriceData?.below_sale_price_count ?? belowPriceData?.belowSalePriceCount ?? 0),
        totalCount: Number(belowPriceData?.total_count ?? belowPriceData?.totalCount ?? 0),
    }), [belowPriceData]);

    const rows = useMemo(() => {
        const items = belowPriceData?.items ?? belowPriceData?.Items ?? [];
        return (items || []).map((row) => ({
            spUniqueCode: row.sp_unique_code ?? row.spUniqueCode,
            invDate: row.inv_date ?? row.invDate,
            invNo: row.inv_no ?? row.invNo ?? '',
            partyName: row.party_name ?? row.partyName ?? '',
            productName: row.product_name ?? row.productName ?? '',
            qty: Number(row.qty ?? row.Qty ?? 0),
            invoiceRate: Number(row.invoice_rate ?? row.invoiceRate ?? row.InvoiceRate ?? 0),
            costPrice: Number(row.cost_price ?? row.costPrice ?? row.CostPrice ?? 0),
            sellingPrice: Number(row.selling_price ?? row.sellingPrice ?? row.SellingPrice ?? 0),
            lossVsCost: Number(row.loss_vs_cost ?? row.lossVsCost ?? row.LossVsCost ?? 0),
            diffVsSellingPrice: Number(row.diff_vs_selling_price ?? row.diffVsSellingPrice ?? row.DiffVsSellingPrice ?? 0),
            isBelowCost: row.is_below_cost ?? row.isBelowCost ?? row.IsBelowCost ?? false,
            isBelowSellingPrice: row.is_below_selling_price ?? row.isBelowSellingPrice ?? row.IsBelowSellingPrice ?? false,
            alertType: row.alert_type ?? row.alertType ?? row.AlertType ?? '',
        }));
    }, [belowPriceData]);

    const filteredRows = useMemo(() => {
        let data = [...rows];

        if (filterType === 'below_cost') {
            data = data.filter((r) => r.isBelowCost);
        } else if (filterType === 'below_sale_price') {
            data = data.filter((r) => r.isBelowSellingPrice);
        }

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            data = data.filter((r) =>
                r.invNo.toLowerCase().includes(q) ||
                r.partyName.toLowerCase().includes(q) ||
                r.productName.toLowerCase().includes(q)
            );
        }

        return data;
    }, [rows, filterType, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
    const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const activeFilterLabel = FILTER_OPTIONS.find((f) => f.value === filterType)?.label || 'All Alerts';

    const handleFilterChange = (value) => {
        setFilterType(value);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    return (
        <Col xl={12}>
            <Card className="card-height-100 overflow-hidden">
                <CardHeader className="align-items-center d-flex border-bottom-dashed py-2">
                    <div className="flex-grow-1">
                        <h4 className="card-title mb-0 fs-14">Below Price Sales Invoices</h4>
                        <p className="text-muted mb-0 fs-11">{periodLabel} — invoices sold below cost or standard sale price</p>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        <Badge color="soft-danger" className="fs-11">Below Cost: {summary.belowCostCount}</Badge>
                        <Badge color="soft-warning" className="fs-11">Below Sale Price: {summary.belowSalePriceCount}</Badge>
                        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                            <DropdownToggle tag="button" className="btn btn-soft-primary btn-sm shadow-none fw-bold fs-12 py-1">
                                {activeFilterLabel} <i className="mdi mdi-chevron-down align-middle ms-1"></i>
                            </DropdownToggle>
                            <DropdownMenu className="dropdown-menu-end">
                                {FILTER_OPTIONS.map((opt) => (
                                    <DropdownItem
                                        key={opt.value}
                                        onClick={() => handleFilterChange(opt.value)}
                                        active={filterType === opt.value}
                                    >
                                        {opt.label}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </CardHeader>
                <CardBody className="p-3 d-flex flex-column">
                    <div className="mb-2">
                        <Input
                            type="text"
                            size="sm"
                            className="form-control-sm shadow-none fs-12"
                            placeholder="Search invoice, customer, product..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            style={{ maxWidth: '320px' }}
                        />
                    </div>

                    <div className="table-responsive table-card flex-grow-1" style={{ position: 'relative' }}>
                        {loading && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                                <Spinner color="primary" size="sm" />
                            </div>
                        )}
                        <Table className="table-sm table-nowrap align-middle mb-0" style={{ fontSize: '12px' }}>
                            <thead className="table-light text-muted fs-11">
                                <tr>
                                    <th>Date</th>
                                    <th>Invoice No</th>
                                    <th>Customer</th>
                                    <th>Product</th>
                                    <th className="text-end">Qty</th>
                                    <th className="text-end">Invoice Rate</th>
                                    <th className="text-end">Cost Price</th>
                                    <th className="text-end">Sale Price</th>
                                    <th>Alert</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRows.length > 0 ? paginatedRows.map((row, idx) => (
                                    <tr key={`${row.spUniqueCode}-${idx}`}>
                                        <td>{formatDate(row.invDate)}</td>
                                        <td>
                                            {row.spUniqueCode ? (
                                                <Link
                                                    to={`/sales-order/edit/${row.spUniqueCode}?view=true`}
                                                    target="_blank"
                                                    className="text-primary fw-medium"
                                                >
                                                    {row.invNo || 'View'}
                                                </Link>
                                            ) : (
                                                row.invNo || '—'
                                            )}
                                        </td>
                                        <td className="text-truncate" style={{ maxWidth: '140px' }} title={row.partyName}>
                                            {row.partyName || '—'}
                                        </td>
                                        <td className="text-truncate" style={{ maxWidth: '160px' }} title={row.productName}>
                                            {row.productName || '—'}
                                        </td>
                                        <td className="text-end">{formatQty(row.qty)}</td>
                                        <td className="text-end fw-semibold">{formatAmt(row.invoiceRate)}</td>
                                        <td className={`text-end ${row.isBelowCost ? 'text-danger fw-semibold' : ''}`}>
                                            {formatAmt(row.costPrice)}
                                        </td>
                                        <td className={`text-end ${row.isBelowSellingPrice ? 'text-warning fw-semibold' : ''}`}>
                                            {formatAmt(row.sellingPrice)}
                                        </td>
                                        <td>{getAlertBadge(row)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="9" className="text-center py-5 text-muted fs-12">
                                            {loading ? 'Fetching data...' : 'No invoices found where sale rate is below cost or standard sale price.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {filteredRows.length > 0 && (
                        <div className="d-flex align-items-center justify-content-between p-2 border-top border-top-dashed mt-auto">
                            <div className="text-muted fs-11">
                                Showing <span className="fw-semibold">{paginatedRows.length}</span> of{' '}
                                <span className="fw-semibold">{filteredRows.length}</span> line items
                                {summary.totalCount > filteredRows.length && filterType === 'all' && !searchQuery && (
                                    <span> ({summary.totalCount} total)</span>
                                )}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Link to="/reports/below-price-sales" className="text-primary fs-11 text-decoration-underline">
                                    View Full Report
                                </Link>
                                <Pagination className="pagination-separated pagination-sm mb-0">
                                    <PaginationItem disabled={currentPage === 1}>
                                        <PaginationLink previous onClick={() => setCurrentPage((prev) => prev - 1)} style={{ padding: '0.2rem 0.4rem' }} />
                                    </PaginationItem>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                        const page = start + i;
                                        if (page > totalPages) return null;
                                        return (
                                            <PaginationItem key={page} active={currentPage === page}>
                                                <PaginationLink onClick={() => setCurrentPage(page)} style={{ padding: '0.2rem 0.4rem' }}>
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    })}
                                    <PaginationItem disabled={currentPage === totalPages}>
                                        <PaginationLink next onClick={() => setCurrentPage((prev) => prev + 1)} style={{ padding: '0.2rem 0.4rem' }} />
                                    </PaginationItem>
                                </Pagination>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>
        </Col>
    );
};

export default BelowPriceSalesList;
