import React, { useMemo, useState } from 'react';
import {
    Badge,
    Card,
    CardBody,
    CardHeader,
    Col,
    Input,
    Pagination,
    PaginationItem,
    PaginationLink,
    Spinner,
    Table
} from 'reactstrap';

const formatAmt = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const OutstandingNoInvoiceList = ({ outstandingData, periodLabel, loading }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const itemsPerPage = 10;

    const rows = useMemo(() => {
        return (outstandingData?.parties ?? outstandingData?.Parties ?? [])
            .map((row) => ({
                partyId: row.party_id ?? row.partyId,
                partyName: row.party_name ?? row.partyName ?? '',
                phone: row.phone ?? row.Phone ?? '—',
                outstanding: Number(row.outstanding ?? row.Outstanding ?? 0),
            }))
            .filter((row) => Math.round(row.outstanding * 100) > 0);
    }, [outstandingData]);

    const partyCount = rows.length;
    const totalOutstanding = rows.reduce((sum, row) => sum + row.outstanding, 0);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            r.partyName.toLowerCase().includes(q) ||
            r.phone.toLowerCase().includes(q)
        );
    }, [rows, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
    const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    return (
        <Col xl={12}>
            <Card className="card-height-100 overflow-hidden">
                <CardHeader className="align-items-center d-flex border-bottom-dashed py-2">
                    <div className="flex-grow-1">
                        <h4 className="card-title mb-0 fs-14">Outstanding — No Sales Invoice</h4>
                        <p className="text-muted mb-0 fs-11">
                            {periodLabel} — customers who owe us (debit) but have no sales invoice in this period
                        </p>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        <Badge color="soft-danger" className="fs-11">Parties: {partyCount}</Badge>
                        <Badge color="soft-warning" className="fs-11">Total OS: ₹{formatAmt(totalOutstanding)}</Badge>
                    </div>
                </CardHeader>
                <CardBody className="p-3 d-flex flex-column">
                    <div className="mb-2">
                        <Input
                            type="text"
                            size="sm"
                            className="form-control-sm shadow-none fs-12"
                            placeholder="Search party or phone..."
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
                                    <th>Party Name</th>
                                    <th>Phone</th>
                                    <th className="text-end">Outstanding</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRows.length > 0 ? paginatedRows.map((row) => (
                                    <tr key={row.partyId}>
                                        <td className="fw-medium">{row.partyName || '—'}</td>
                                        <td>{row.phone || '—'}</td>
                                        <td className="text-end fw-semibold text-danger">
                                            ₹{formatAmt(row.outstanding)}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="text-center py-5 text-muted fs-12">
                                            {loading
                                                ? 'Fetching data...'
                                                : 'No customers with receivable outstanding and missing sales invoice for this period.'}
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
                                <span className="fw-semibold">{filteredRows.length}</span> parties
                            </div>
                            <Pagination className="pagination-separated pagination-sm mb-0">
                                <PaginationItem disabled={currentPage === 1}>
                                    <PaginationLink previous onClick={() => setCurrentPage((p) => p - 1)} style={{ padding: '0.2rem 0.4rem' }} />
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
                                    <PaginationLink next onClick={() => setCurrentPage((p) => p + 1)} style={{ padding: '0.2rem 0.4rem' }} />
                                </PaginationItem>
                            </Pagination>
                        </div>
                    )}
                </CardBody>
            </Card>
        </Col>
    );
};

export default OutstandingNoInvoiceList;
