import React, { useMemo, useState } from 'react';
import CountUp from 'react-countup';
import { Link } from 'react-router-dom';
import {
    Card,
    CardBody,
    Col,
    Modal,
    ModalBody,
    ModalHeader,
    Row,
    Spinner,
    Table
} from 'reactstrap';

const formatAmt = (v) =>
    Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const normalizeProducts = (items) =>
    (items || []).map((row) => ({
        productId: row.product_id ?? row.productId,
        productName: row.product_name ?? row.productName ?? '',
        productType: row.product_type ?? row.productType ?? '—',
        sellingPrice: Number(row.selling_price ?? row.sellingPrice ?? 0),
        costPrice: Number(row.cost_price ?? row.costPrice ?? 0),
        createdOn: row.created_on ?? row.createdOn,
    }));

const normalizeParties = (items) =>
    (items || []).map((row) => ({
        partyId: row.party_id ?? row.partyId,
        displayName: row.display_name ?? row.displayName ?? '',
        partyType: row.party_type ?? row.partyType ?? '—',
        phone: row.phone ?? row.phoneMobile ?? row.PhoneMobile ?? '—',
        email: row.email ?? row.Email ?? '—',
        createdOn: row.created_on ?? row.createdOn,
    }));

const NewMastersCard = ({ newMastersData, loading }) => {
    const [modalType, setModalType] = useState(null);

    const productCount = Number(newMastersData?.product_count ?? newMastersData?.productCount ?? 0);
    const partyCount = Number(newMastersData?.party_count ?? newMastersData?.partyCount ?? 0);

    const products = useMemo(
        () => normalizeProducts(newMastersData?.products ?? newMastersData?.Products),
        [newMastersData]
    );

    const parties = useMemo(
        () => normalizeParties(newMastersData?.parties ?? newMastersData?.Parties),
        [newMastersData]
    );

    const toggleModal = (type) => {
        setModalType((prev) => (prev === type ? null : type));
    };

    const todayLabel = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    return (
        <>
            <Col xl={4}>
                <Card className="card-height-100">
                    <CardBody style={{ position: 'relative' }}>
                        {loading && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                                <Spinner color="primary" size="sm" />
                            </div>
                        )}
                        <div className="d-flex align-items-center mb-3">
                            <div className="flex-grow-1">
                                <h4 className="card-title mb-1">New Masters Added Today</h4>
                                <p className="text-muted mb-0 fs-12">{todayLabel}</p>
                            </div>
                            <div className="avatar-sm flex-shrink-0">
                                <span className="avatar-title bg-soft-success rounded fs-3">
                                    <i className="ri-user-add-line text-success"></i>
                                </span>
                            </div>
                        </div>

                        <Row className="g-3">
                            <Col sm={6}>
                                <button
                                    type="button"
                                    className="border border-dashed rounded p-3 h-100 w-100 text-start bg-transparent"
                                    onClick={() => productCount > 0 && toggleModal('products')}
                                    disabled={productCount === 0}
                                    style={{ cursor: productCount > 0 ? 'pointer' : 'default' }}
                                >
                                    <p className="text-muted text-uppercase fs-12 mb-2">New Products</p>
                                    <h3 className={`mb-1 ${productCount > 0 ? 'text-primary' : 'text-muted'}`}>
                                        <CountUp start={0} end={productCount} duration={1.5} />
                                    </h3>
                                    <span className={`fs-12 ${productCount > 0 ? 'text-primary text-decoration-underline' : 'text-muted'}`}>
                                        {productCount > 0 ? 'Click to view details' : 'No products added today'}
                                    </span>
                                </button>
                            </Col>
                            <Col sm={6}>
                                <button
                                    type="button"
                                    className="border border-dashed rounded p-3 h-100 w-100 text-start bg-transparent"
                                    onClick={() => partyCount > 0 && toggleModal('parties')}
                                    disabled={partyCount === 0}
                                    style={{ cursor: partyCount > 0 ? 'pointer' : 'default' }}
                                >
                                    <p className="text-muted text-uppercase fs-12 mb-2">New Parties</p>
                                    <h3 className={`mb-1 ${partyCount > 0 ? 'text-success' : 'text-muted'}`}>
                                        <CountUp start={0} end={partyCount} duration={1.5} />
                                    </h3>
                                    <span className={`fs-12 ${partyCount > 0 ? 'text-success text-decoration-underline' : 'text-muted'}`}>
                                        {partyCount > 0 ? 'Click to view details' : 'No parties added today'}
                                    </span>
                                </button>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
            </Col>

            <Modal isOpen={modalType === 'products'} toggle={() => toggleModal('products')} size="lg" scrollable>
                <ModalHeader toggle={() => toggleModal('products')}>
                    New Products Added Today ({productCount})
                </ModalHeader>
                <ModalBody>
                    <div className="table-responsive">
                        <Table className="table-sm table-bordered align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Product Name</th>
                                    <th>Type</th>
                                    <th className="text-end">Sale Price</th>
                                    <th className="text-end">Cost Price</th>
                                    <th>Added At</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length > 0 ? products.map((row) => (
                                    <tr key={row.productId}>
                                        <td className="fw-medium">{row.productName}</td>
                                        <td>{row.productType}</td>
                                        <td className="text-end">{formatAmt(row.sellingPrice)}</td>
                                        <td className="text-end">{formatAmt(row.costPrice)}</td>
                                        <td className="text-muted fs-12">{formatDateTime(row.createdOn)}</td>
                                        <td>
                                            {row.productId && (
                                                <Link
                                                    to={`/apps-product-master/edit/${row.productId}`}
                                                    className="btn btn-soft-primary btn-sm"
                                                    target="_blank"
                                                >
                                                    Open
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted py-4">
                                            No products added today.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                    <div className="mt-3 text-end">
                        <Link to="/apps-product-master" className="text-primary fs-12 text-decoration-underline">
                            View All Products
                        </Link>
                    </div>
                </ModalBody>
            </Modal>

            <Modal isOpen={modalType === 'parties'} toggle={() => toggleModal('parties')} size="lg" scrollable>
                <ModalHeader toggle={() => toggleModal('parties')}>
                    New Parties Added Today ({partyCount})
                </ModalHeader>
                <ModalBody>
                    <div className="table-responsive">
                        <Table className="table-sm table-bordered align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Party Name</th>
                                    <th>Type</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Added At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parties.length > 0 ? parties.map((row) => (
                                    <tr key={row.partyId}>
                                        <td className="fw-medium">{row.displayName}</td>
                                        <td>{row.partyType}</td>
                                        <td>{row.phone}</td>
                                        <td>{row.email}</td>
                                        <td className="text-muted fs-12">{formatDateTime(row.createdOn)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted py-4">
                                            No parties added today.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                    <div className="mt-3 text-end">
                        <Link to="/party" className="text-primary fs-12 text-decoration-underline">
                            View All Parties
                        </Link>
                    </div>
                </ModalBody>
            </Modal>
        </>
    );
};

export default NewMastersCard;
