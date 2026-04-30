import React, { useState, useMemo } from 'react';
import { Card, CardBody, CardHeader, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Table, Pagination, PaginationItem, PaginationLink } from 'reactstrap';

const TopClients = ({ topClientsData, topLimit, onLimitChange }) => {
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [isCustomLimit, setIsCustomLimit] = useState(false);
    const [customValue, setCustomValue] = useState(topLimit);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

    // Pagination logic
    const totalItems = topClientsData?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const paginatedData = useMemo(() => {
        if (!topClientsData) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return topClientsData.slice(startIndex, startIndex + itemsPerPage);
    }, [topClientsData, currentPage, itemsPerPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleLimitClick = (limit) => {
        setIsCustomLimit(false);
        onLimitChange(limit);
        setCurrentPage(1); 
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        const val = parseInt(customValue);
        if (val > 0) {
            onLimitChange(val);
            setCurrentPage(1);
            setIsCustomLimit(false);
        }
    };

    return (
        <Col xl={8}>
            <Card className="card-height-100">
                <CardHeader className="align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">Top Clients</h4>
                    <div className="flex-shrink-0 d-flex align-items-center gap-2">
                        {isCustomLimit ? (
                            <form onSubmit={handleCustomSubmit} className="d-flex gap-1 align-items-center">
                                <input 
                                    type="number" 
                                    className="form-control form-control-sm" 
                                    style={{ width: '60px' }}
                                    value={customValue}
                                    onChange={(e) => setCustomValue(e.target.value)}
                                    autoFocus
                                />
                                <button type="submit" className="btn btn-sm btn-soft-primary px-1 py-0">
                                    <i className="ri-check-line"></i>
                                </button>
                                <button type="button" className="btn btn-sm btn-soft-danger px-1 py-0" onClick={() => setIsCustomLimit(false)}>
                                    <i className="ri-close-line"></i>
                                </button>
                            </form>
                        ) : (
                            <span className="text-muted fs-12">Limit: {topLimit}</span>
                        )}
                        <Dropdown isOpen={isDropdownOpen} toggle={toggleDropdown} className="card-header-dropdown">
                            <DropdownToggle tag="a" className="text-reset dropdown-btn" role="button">
                                <span className="text-muted fs-16"><i className="mdi mdi-dots-vertical align-middle"></i></span>
                            </DropdownToggle>
                            <DropdownMenu className="dropdown-menu-end">
                                <DropdownItem onClick={() => handleLimitClick(5)} active={topLimit === 5}>Top 5</DropdownItem>
                                <DropdownItem onClick={() => handleLimitClick(50)} active={topLimit === 50}>Top 50</DropdownItem>
                                <DropdownItem onClick={() => handleLimitClick(100)} active={topLimit === 100}>Top 100</DropdownItem>
                                <DropdownItem onClick={() => setIsCustomLimit(true)}>Custom...</DropdownItem>
                                <DropdownItem divider />
                                <DropdownItem onClick={() => handleLimitClick(1000)} active={topLimit === 1000}>Show All</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </CardHeader>
                <CardBody className="d-flex flex-column">
                    <div className="table-responsive table-card flex-grow-1" style={{ minHeight: '345px' }}>
                        <Table className="table align-middle table-nowrap mb-0">
                            <thead className="table-light text-muted">
                                <tr>
                                    <th scope="col">Client Name</th>
                                    <th scope="col" className="text-end">Total Sales</th>
                                    <th scope="col" className="text-end">Contribution</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(paginatedData || []).map((item, index) => (
                                    <tr key={index}>
                                        <td className="fw-medium">{item.client_name || item.party_name || 'N/A'}</td>
                                        <td className="text-end">
                                            ₹{(item.total_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end">
                                            <span className="badge bg-success-subtle text-success">
                                                {(item.contribution_percent || 0).toFixed(2)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!paginatedData || paginatedData.length === 0) && (
                                    <tr>
                                        <td colSpan="3" className="text-center p-4">No data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {topLimit > itemsPerPage && totalItems > itemsPerPage && (
                        <div className="align-items-center mt-3 pt-1 justify-content-between d-flex">
                            <div className="flex-shrink-0">
                                <div className="text-muted fs-12">
                                    Showing <span className="fw-semibold">{paginatedData.length}</span> of <span className="fw-semibold">{totalItems}</span> Results
                                </div>
                            </div>
                            <Pagination className="pagination-separated pagination-sm mb-0">
                                <PaginationItem disabled={currentPage === 1}>
                                    <PaginationLink previous onClick={() => handlePageChange(currentPage - 1)} />
                                </PaginationItem>
                                
                                {(() => {
                                    const maxVisiblePages = 5;
                                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                    
                                    if (endPage - startPage + 1 < maxVisiblePages) {
                                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                    }

                                    const pages = [];
                                    for (let i = startPage; i <= endPage; i++) {
                                        pages.push(i);
                                    }
                                    return pages.map(page => (
                                        <PaginationItem key={page} active={currentPage === page}>
                                            <PaginationLink onClick={() => handlePageChange(page)}>
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ));
                                })()}

                                <PaginationItem disabled={currentPage === totalPages}>
                                    <PaginationLink next onClick={() => handlePageChange(currentPage + 1)} />
                                </PaginationItem>
                            </Pagination>
                        </div>
                    )}
                </CardBody>
            </Card>
        </Col>
    );
};

export default TopClients;
