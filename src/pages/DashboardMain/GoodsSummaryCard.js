import React from 'react';
import CountUp from "react-countup";
import { Link } from 'react-router-dom';
import { Card, CardBody, Col, Row, UncontrolledTooltip } from 'reactstrap';

const formatQty = (num) =>
    Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const GoodsSummaryCard = ({ goodsSummary, periodLabel, loading }) => {
    const purchaseQty = Number(goodsSummary?.total_purchase_qty ?? goodsSummary?.totalPurchaseQty ?? 0);
    const salesQty = Number(goodsSummary?.total_sales_qty ?? goodsSummary?.totalSalesQty ?? 0);
    const diff = purchaseQty - salesQty;
    const diffColor = diff < 0 ? 'danger' : diff > 0 ? 'success' : 'secondary';
    const diffIcon = diff < 0 ? 'ri-arrow-down-line' : 'ri-arrow-up-line';

    return (
        <Col xl={4}>
            <Card className="card-height-100">
                <CardBody style={{ position: 'relative' }}>
                    {loading && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}
                    <div className="d-flex align-items-center mb-3">
                        <div className="flex-grow-1">
                            <h4 className="card-title mb-1">Goods Purchased / Sold</h4>
                            <p className="text-muted mb-0 fs-12">{periodLabel}</p>
                        </div>
                        <div className="avatar-sm flex-shrink-0">
                            <span className="avatar-title bg-soft-primary rounded fs-3">
                                <i className="ri-stack-line text-primary"></i>
                            </span>
                        </div>
                    </div>

                    <Row className="g-3">
                        <Col sm={6}>
                            <div className="border border-dashed rounded p-3 h-100">
                                <p className="text-muted text-uppercase fs-12 mb-2">Total Goods Purchased</p>
                                <h3 className="mb-1 text-info" id="goods-purchase-qty">
                                    <CountUp start={0} end={purchaseQty} duration={2} formattingFn={formatQty} />
                                </h3>
                                <UncontrolledTooltip placement="top" target="goods-purchase-qty">
                                    {formatQty(purchaseQty)} Qty
                                </UncontrolledTooltip>
                                <Link to="/purchase-transaction/list" className="text-decoration-underline text-muted fs-12">
                                    View Purchase Bills
                                </Link>
                            </div>
                        </Col>
                        <Col sm={6}>
                            <div className="border border-dashed rounded p-3 h-100">
                                <p className="text-muted text-uppercase fs-12 mb-2">Total Goods Sold</p>
                                <h3 className="mb-1 text-success" id="goods-sales-qty">
                                    <CountUp start={0} end={salesQty} duration={2} formattingFn={formatQty} />
                                </h3>
                                <UncontrolledTooltip placement="top" target="goods-sales-qty">
                                    {formatQty(salesQty)} Qty
                                </UncontrolledTooltip>
                                <Link to="/sales-order" className="text-decoration-underline text-muted fs-12">
                                    View Sales Invoices
                                </Link>
                            </div>
                        </Col>
                    </Row>

                    <div className="mt-3">
                        <p className="text-muted text-uppercase fs-12 fw-semibold mb-2">Qty Difference (Purchase − Sale)</p>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: diff < 0
                                    ? 'linear-gradient(135deg,#f0654822,#f0654844)'
                                    : diff > 0
                                    ? 'linear-gradient(135deg,#0ab39c22,#0ab39c44)'
                                    : 'linear-gradient(135deg,#adb5bd22,#adb5bd44)',
                                border: `1.5px solid ${diff < 0 ? '#f06548' : diff > 0 ? '#0ab39c' : '#adb5bd'}`,
                                borderRadius: '10px',
                                padding: '8px 16px',
                            }}
                        >
                            <i
                                className={diffIcon}
                                style={{
                                    fontSize: '22px',
                                    color: diff < 0 ? '#f06548' : diff > 0 ? '#0ab39c' : '#adb5bd',
                                }}
                            />
                            <div>
                                <h4
                                    className="mb-0"
                                    style={{
                                        fontSize: '20px',
                                        fontWeight: 700,
                                        color: diff < 0 ? '#f06548' : diff > 0 ? '#0ab39c' : '#6c757d',
                                    }}
                                >
                                    {formatQty(Math.abs(diff))}
                                </h4>
                                {diff < 0 && (
                                    <p className="mb-0 fs-11 text-danger">Sold more than purchased</p>
                                )}
                                {diff > 0 && (
                                    <p className="mb-0 fs-11 text-success">More purchased than sold</p>
                                )}
                                {diff === 0 && (
                                    <p className="mb-0 fs-11 text-muted">Purchase = Sale</p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default GoodsSummaryCard;
