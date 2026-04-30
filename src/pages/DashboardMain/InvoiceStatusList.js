import React, { useState, useMemo } from 'react';
import { Card, CardBody, CardHeader, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Table, Pagination, PaginationItem, PaginationLink } from 'reactstrap';

const InvoiceStatusList = ({ invoiceStatusData }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Pagination logic
    const totalItems = invoiceStatusData?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const paginatedData = useMemo(() => {
        if (!invoiceStatusData) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return invoiceStatusData.slice(startIndex, startIndex + itemsPerPage);
    }, [invoiceStatusData, currentPage, itemsPerPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <Col xl={8}>
            <Card className="card-height-100">
                <CardHeader className="align-items-center d-flex">
                    <h4 className="card-title mb-0 flex-grow-1">Invoice Status</h4>
                </CardHeader>
                <CardBody className="d-flex flex-column">
                    <div className="table-responsive table-card flex-grow-1" style={{ minHeight: '345px' }}>
                        <Table className="table align-middle table-nowrap mb-0">
                            <thead className="table-light text-muted">
                                <tr>
                                    <th scope="col">Party Name</th>
                                    <th scope="col" className="text-end">Outstanding</th>
                                    <th scope="col" className="text-end">Avg. Daily Sale</th>
                                    <th scope="col" className="text-end">Pending Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(paginatedData || []).map((item, index) => (
                                    <tr key={index}>
                                        <td className="fw-medium">{item.party_name || 'N/A'}</td>
                                        <td className="text-end text-danger fw-semibold">
                                            ₹{(item.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end">
                                            ₹{(item.avg_daily_sale || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end text-danger fw-semibold">
                                            ₹{(item.terms_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {(!paginatedData || paginatedData.length === 0) && (
                                    <tr>
                                        <td colSpan="4" className="text-center p-4">No data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {totalItems > itemsPerPage && (
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

export default InvoiceStatusList;
