import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, Col, Pagination, PaginationItem, PaginationLink, Table } from 'reactstrap';

const formatQty = (qty) =>
    Number(qty || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const ItemWiseGoodsCard = ({ itemWiseGoods, periodLabel, loading }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const normalizedItems = useMemo(() => {
        return (itemWiseGoods || []).map((item) => ({
            product_id: item.product_id ?? item.productId,
            product_name: item.product_name ?? item.productName ?? 'Unknown Item',
            purchase_qty: Number(item.purchase_qty ?? item.purchaseQty ?? 0),
            sales_qty: Number(item.sales_qty ?? item.salesQty ?? 0),
        }));
    }, [itemWiseGoods]);

    useEffect(() => {
        setCurrentPage(1);
    }, [normalizedItems, periodLabel]);

    const totalItems = normalizedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return normalizedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [normalizedItems, currentPage]);

    const totals = useMemo(() => {
        return normalizedItems.reduce(
            (acc, item) => ({
                purchase: acc.purchase + item.purchase_qty,
                sales: acc.sales + item.sales_qty,
            }),
            { purchase: 0, sales: 0 }
        );
    }, [normalizedItems]);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <Col xl={8}>
            <Card className="card-height-100">
                <CardHeader className="align-items-center d-flex">
                    <div className="flex-grow-1">
                        <h4 className="card-title mb-1">Item-wise Purchase / Sales</h4>
                        <p className="text-muted mb-0 fs-12">{periodLabel}</p>
                    </div>
                    <div className="flex-shrink-0 text-muted fs-12">
                        {totalItems} item{totalItems === 1 ? '' : 's'}
                    </div>
                </CardHeader>
                <CardBody className="p-0" style={{ position: 'relative' }}>
                    {loading && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}
                    <div className="table-responsive" style={{ maxHeight: '320px' }}>
                        <Table className="table-hover table-nowrap align-middle mb-0">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{ width: '8%' }}>#</th>
                                    <th>Item Name</th>
                                    <th className="text-end" style={{ width: '18%' }}>Purchase Qty</th>
                                    <th className="text-end" style={{ width: '18%' }}>Sales Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((item, index) => (
                                        <tr key={`${item.product_id}-${index}`}>
                                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="fw-medium">{item.product_name || 'Unknown Item'}</td>
                                            <td className="text-end text-info">{formatQty(item.purchase_qty)}</td>
                                            <td className="text-end text-success">{formatQty(item.sales_qty)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center text-muted py-4">
                                            No item transactions found for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {paginatedData.length > 0 && (
                                <tfoot className="table-light">
                                    <tr>
                                        <th colSpan="2" className="text-end">Total</th>
                                        <th className="text-end text-info">{formatQty(totals.purchase)}</th>
                                        <th className="text-end text-success">{formatQty(totals.sales)}</th>
                                    </tr>
                                </tfoot>
                            )}
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="d-flex justify-content-end p-3 border-top">
                            <Pagination className="pagination-sm mb-0">
                                <PaginationItem disabled={currentPage === 1}>
                                    <PaginationLink previous onClick={() => handlePageChange(currentPage - 1)} />
                                </PaginationItem>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page} active={page === currentPage}>
                                        <PaginationLink onClick={() => handlePageChange(page)}>
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
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

export default ItemWiseGoodsCard;
