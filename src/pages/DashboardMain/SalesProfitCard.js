import React from 'react';
import CountUp from 'react-countup';
import { Link } from 'react-router-dom';
import { Card, CardBody, Col, Row, Spinner, UncontrolledTooltip } from 'reactstrap';

const formatAmt = (num) =>
    Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompact = (num) => {
    const n = Number(num || 0);
    const abs = Math.abs(n);
    if (abs >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${(n / 100000).toFixed(2)} L`;
    if (abs >= 1000) return `${(n / 1000).toFixed(2)} K`;
    return formatAmt(n);
};

const SalesProfitCard = ({ salesProfitSummary, periodLabel, loading }) => {
    const saleAtPrice = Number(
        salesProfitSummary?.total_sale_at_sale_price ?? salesProfitSummary?.totalSaleAtSalePrice ?? 0
    );
    const saleAtCog = Number(
        salesProfitSummary?.total_sale_at_cog ?? salesProfitSummary?.totalSaleAtCog ?? 0
    );
    const grossProfit = Number(
        salesProfitSummary?.gross_profit ?? salesProfitSummary?.grossProfit ?? 0
    );

    const profitColor = grossProfit > 0 ? 'success' : grossProfit < 0 ? 'danger' : 'muted';
    const profitPct = saleAtCog > 0 ? ((grossProfit / saleAtCog) * 100).toFixed(2) : null;

    const items = [
        {
            key: 'sale-price',
            label: 'Sale Amount (Sale Price)',
            value: saleAtPrice,
            color: 'success',
            icon: 'ri-price-tag-3-line',
            tooltipId: 'sales-at-price-tip',
        },
        {
            key: 'sale-cog',
            label: 'Sale Amount (COG)',
            value: saleAtCog,
            color: 'warning',
            icon: 'ri-scales-3-line',
            tooltipId: 'sales-at-cog-tip',
        },
        {
            key: 'gross-profit',
            label: 'Gross Profit',
            value: grossProfit,
            color: profitColor,
            icon: 'ri-hand-coin-line',
            tooltipId: 'gross-profit-tip',
        },
    ];

    return (
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
                            <h4 className="card-title mb-1">Sales &amp; Gross Profit</h4>
                            <p className="text-muted mb-0 fs-12">{periodLabel} — qty × rate vs qty × COGS</p>
                        </div>
                        <div className="avatar-sm flex-shrink-0">
                            <span className="avatar-title bg-soft-success rounded fs-3">
                                <i className="ri-line-chart-line text-success"></i>
                            </span>
                        </div>
                    </div>

                    <Row className="g-3">
                        {items.map((item) => (
                            <Col xs={12} key={item.key}>
                                <div className="border border-dashed rounded p-3">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <span className="avatar-xs flex-shrink-0">
                                            <span className={`avatar-title bg-soft-${item.color} rounded fs-16`}>
                                                <i className={`${item.icon} text-${item.color}`}></i>
                                            </span>
                                        </span>
                                        <p className="text-muted text-uppercase fs-11 mb-0">{item.label}</p>
                                    </div>
                                    <h4 className={`mb-0 text-${item.color}`} id={item.tooltipId}>
                                        ₹<CountUp start={0} end={item.value} duration={1.5} formattingFn={formatCompact} />
                                    </h4>
                                    <UncontrolledTooltip placement="top" target={item.tooltipId}>
                                        ₹{formatAmt(item.value)}
                                    </UncontrolledTooltip>
                                    {item.key === 'gross-profit' && profitPct !== null && (
                                        <div className="mt-3">
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: grossProfit >= 0
                                                        ? 'linear-gradient(135deg,#0ab39c22,#0ab39c44)'
                                                        : 'linear-gradient(135deg,#f0654822,#f0654844)',
                                                    border: `1.5px solid ${grossProfit >= 0 ? '#0ab39c' : '#f06548'}`,
                                                    borderRadius: '10px',
                                                    padding: '6px 16px',
                                                    fontSize: '15px',
                                                    fontWeight: 700,
                                                    color: grossProfit >= 0 ? '#0ab39c' : '#f06548',
                                                    letterSpacing: '0.3px',
                                                }}
                                            >
                                                <i className={`ri-${grossProfit >= 0 ? 'arrow-up' : 'arrow-down'}-line`} style={{ fontSize: '16px' }}></i>
                                                {profitPct}% Profit Margin
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Col>
                        ))}
                    </Row>

                    <div className="mt-3 text-end">
                        <Link to="/sales-order" className="text-decoration-underline text-muted fs-12">
                            View Sales Invoices
                        </Link>
                    </div>
                </CardBody>
            </Card>
        </Col>
    );
};

export default SalesProfitCard;
