import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardBody, CardHeader, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Table, Pagination, PaginationItem, PaginationLink, Input, Spinner } from 'reactstrap';

const InvoiceStatusList = ({ invoiceStatusData, selectedPartyType, onPartyTypeChange, loading }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'total_outstanding', direction: 'desc' });
    
    // In-column filters state
    const [filters, setFilters] = useState({
        party_name: '',
        total_outstanding: '',
        avg_daily_sale: '',
        avg_monthly_sale: '',
        terms: ''
    });

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter, Sort, and Paginate Data
    const processedData = useMemo(() => {
        let data = [...(invoiceStatusData || [])];

        // 1. Apply Filters
        if (filters.party_name) {
            data = data.filter(item => (item.party_name || "").toLowerCase().includes(filters.party_name.toLowerCase()));
        }
        if (filters.total_outstanding) {
            data = data.filter(item => (item.total_outstanding || 0).toString().includes(filters.total_outstanding));
        }
        if (filters.avg_daily_sale) {
            data = data.filter(item => (item.avg_daily_sale || 0).toString().includes(filters.avg_daily_sale));
        }
        if (filters.avg_monthly_sale) {
            data = data.filter(item => (item.avg_monthly_sale || 0).toString().includes(filters.avg_monthly_sale));
        }
        if (filters.terms) {
            data = data.filter(item => (item.terms || 0).toString().includes(filters.terms));
        }

        // 2. Apply Sorting
        if (sortConfig.key) {
            data.sort((a, b) => {
                let aVal = a[sortConfig.key] ?? 0;
                let bVal = b[sortConfig.key] ?? 0;
                
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [invoiceStatusData, filters, sortConfig]);

    const totalItems = processedData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <i className="ri-expand-up-down-fill ms-1 text-muted" style={{ fontSize: '10px' }}></i>;
        return sortConfig.direction === 'asc' ? <i className="ri-arrow-up-s-fill ms-1"></i> : <i className="ri-arrow-down-s-fill ms-1"></i>;
    };

    return (
        <Col xl={8}>
            <Card className="card-height-100 overflow-hidden" style={{ minHeight: '540px' }}>
                <CardHeader className="align-items-center d-flex border-bottom-dashed py-2">
                    <h4 className="card-title mb-0 flex-grow-1 fs-14">Outstanding Status ({selectedPartyType})</h4>
                    <div className="flex-shrink-0">
                        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                            <DropdownToggle tag="button" className="btn btn-soft-primary btn-sm shadow-none fw-bold fs-12 py-1">
                                {selectedPartyType} <i className="mdi mdi-chevron-down align-middle ms-1"></i>
                            </DropdownToggle>
                            <DropdownMenu className="dropdown-menu-end">
                                <DropdownItem onClick={() => onPartyTypeChange("Customer")} active={selectedPartyType === "Customer"}>Customer</DropdownItem>
                                <DropdownItem onClick={() => onPartyTypeChange("Vendor")} active={selectedPartyType === "Vendor"}>Vendor</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </CardHeader>
                <CardBody className="p-3 d-flex flex-column">
                    <div className="table-responsive table-card flex-grow-1" style={{ position: 'relative' }}>
                        {loading && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                                <Spinner color="primary" size="sm" />
                            </div>
                        )}
                        <Table className="table-sm table-nowrap align-middle mb-0" style={{ fontSize: '12px', tableLayout: 'fixed', width: '100%' }}>
                            <thead className="table-light text-muted fs-11">
                                <tr>
                                    <th style={{ width: '30%', cursor: 'pointer' }} onClick={() => handleSort('party_name')}>
                                        Party Name {getSortIcon('party_name')}
                                    </th>
                                    <th className="text-end" style={{ width: '20%', cursor: 'pointer' }} onClick={() => handleSort('total_outstanding')}>
                                        {selectedPartyType === "Customer" ? "Receipt" : "Payment"} {getSortIcon('total_outstanding')}
                                    </th>
                                    <th className="text-end" style={{ width: '17%', cursor: 'pointer' }} onClick={() => handleSort('avg_daily_sale')}>
                                        Daily Avg {getSortIcon('avg_daily_sale')}
                                    </th>
                                    <th className="text-end" style={{ width: '18%', cursor: 'pointer' }} onClick={() => handleSort('avg_monthly_sale')}>
                                        Monthly Avg {getSortIcon('avg_monthly_sale')}
                                    </th>
                                    <th className="text-end" style={{ width: '15%', cursor: 'pointer' }} onClick={() => handleSort('terms')}>
                                        Terms {getSortIcon('terms')}
                                    </th>
                                </tr>
                                <tr className="bg-soft-light border-bottom border-light">
                                    <th className="px-1 py-1">
                                        <Input type="text" bsSize="sm" className="form-control-sm shadow-none fs-10 p-1" placeholder="Filter..." value={filters.party_name} onChange={(e) => handleFilterChange('party_name', e.target.value)} />
                                    </th>
                                    <th className="px-1 py-1">
                                        <Input type="text" bsSize="sm" className="form-control-sm shadow-none fs-10 p-1 text-end" placeholder="Filter..." value={filters.total_outstanding} onChange={(e) => handleFilterChange('total_outstanding', e.target.value)} />
                                    </th>
                                    <th className="px-1 py-1">
                                        <Input type="text" bsSize="sm" className="form-control-sm shadow-none fs-10 p-1 text-end" placeholder="Filter..." value={filters.avg_daily_sale} onChange={(e) => handleFilterChange('avg_daily_sale', e.target.value)} />
                                    </th>
                                    <th className="px-1 py-1">
                                        <Input type="text" bsSize="sm" className="form-control-sm shadow-none fs-10 p-1 text-end" placeholder="Filter..." value={filters.avg_monthly_sale} onChange={(e) => handleFilterChange('avg_monthly_sale', e.target.value)} />
                                    </th>
                                    <th className="px-1 py-1">
                                        <Input type="text" bsSize="sm" className="form-control-sm shadow-none fs-10 p-1 text-end" placeholder="Filter..." value={filters.terms} onChange={(e) => handleFilterChange('terms', e.target.value)} />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length > 0 ? paginatedData.map((item, index) => (
                                    <tr key={index}>
                                        <td className="fw-medium text-truncate" title={item.party_name}>
                                            {item.party_name || 'N/A'}
                                        </td>
                                        <td className="text-end">
                                            {item.credit_debit === 'C' ? '-' : ''}₹{Math.abs(item.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                        </td>
                                        <td className="text-end">
                                            ₹{(item.avg_daily_sale || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                        </td>
                                        <td className="text-end">
                                            ₹{(item.avg_monthly_sale || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                        </td>
                                        <td className="text-end">
                                            <span className="text-info">{parseFloat(item.terms || 0).toFixed(0)}</span> <small className="text-muted fs-10">d</small>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5 text-muted fs-12">
                                            {loading ? 'Fetching data...' : 'No records found matching the criteria'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <div className="d-flex align-items-center justify-content-between p-2 border-top border-top-dashed mt-auto">
                            <div className="text-muted fs-11">
                                Showing <span className="fw-semibold">{paginatedData.length}</span> of <span className="fw-semibold">{totalItems}</span> Results
                            </div>
                            <Pagination className="pagination-separated pagination-sm mb-0">
                                <PaginationItem disabled={currentPage === 1}>
                                    <PaginationLink previous onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '0.2rem 0.4rem' }} />
                                </PaginationItem>
                                {(() => {
                                    const pages = [];
                                    const maxPages = 5;
                                    let start = Math.max(1, currentPage - 2);
                                    let end = Math.min(totalPages, start + maxPages - 1);
                                    if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);

                                    for (let i = start; i <= end; i++) {
                                        pages.push(
                                            <PaginationItem key={i} active={currentPage === i}>
                                                <PaginationLink onClick={() => setCurrentPage(i)} style={{ padding: '0.2rem 0.4rem' }}>
                                                    {i}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    }
                                    return pages;
                                })()}
                                <PaginationItem disabled={currentPage === totalPages}>
                                    <PaginationLink next onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '0.2rem 0.4rem' }} />
                                </PaginationItem>
                            </Pagination>
                        </div>
                    )}
                </CardBody>
            </Card>
        </Col>
    );
};

export default InvoiceStatusList;
