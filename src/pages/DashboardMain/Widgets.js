import React from 'react';
import CountUp from "react-countup";
import { Link } from 'react-router-dom';
import { Card, CardBody, Col, Row, UncontrolledTooltip } from 'reactstrap';

const Widgets = ({ kpiData, loading }) => {

    const formatNumber = (num) => {
        const absNum = Math.abs(num);
        if (absNum >= 10000000) {
            return (num / 10000000).toFixed(2) + " Cr";
        } else if (absNum >= 100000) {
            return (num / 100000).toFixed(2) + " L";
        } else if (absNum >= 1000) {
            return (num / 1000).toFixed(2) + " K";
        }
        return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatAmount2 = (num) =>
        Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const parseKpiNumber = (val) => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
        const cleaned = String(val).replace(/%/g, '').replace(/,/g, '').trim();
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : 0;
    };

    const formatPercent = (num) =>
        parseKpiNumber(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const profitPercent = parseKpiNumber(
        kpiData?.profit_percentage
        ?? kpiData?.profit_percent
        ?? kpiData?.profitPercentage
        ?? kpiData?.c_profit_percentage
        ?? kpiData?.c_profit_percent
        ?? kpiData?.ProfitPercentage
        ?? 0
    );

    const widgetsData = [
        {
            id: 1,
            label: "Total Purchase",
            badgeClass: (kpiData?.purchase_change >= 0) ? "success" : "danger",
            badge: (kpiData?.purchase_change >= 0) ? "ri-arrow-right-up-line" : "ri-arrow-right-down-line",
            percentage: Math.abs(kpiData?.purchase_change || 0).toFixed(2),
            counter: kpiData?.total_purchase || 0,
            link: "View Bills",
            url: "/purchase-transaction/list",
            bgcolor: "info",
            icon: "ri-exchange-dollar-line",
            decimals: 2,
            prefix: "₹",
            separator: ",",
            extras: [
                {
                    label: "Qty Sold",
                    displayValue: Number(kpiData?.total_qty_sold ?? kpiData?.totalQtySold ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
                    prefix: "",
                },
            ],
        },
        {
            id: 2,
            label: "Total Sales",
            badgeClass: (kpiData?.sales_change >= 0) ? "success" : "danger",
            badge: (kpiData?.sales_change >= 0) ? "ri-arrow-right-up-line" : "ri-arrow-right-down-line",
            percentage: Math.abs(kpiData?.sales_change || 0).toFixed(2),
            counter: kpiData?.total_sales || 0,
            link: "View Invoices",
            url: "/sales-order",
            bgcolor: "success",
            icon: "ri-rocket-line",
            decimals: 2,
            prefix: "₹",
            separator: ",",
            extras: [
                {
                    label: "COGS",
                    displayValue: formatAmount2(kpiData?.total_cogs_amount ?? kpiData?.totalCogsAmount ?? 0),
                    prefix: "₹",
                },
            ],
        },
        {
            id: 3,
            label: "Gross Profit",
            badgeClass: (kpiData?.gross_profit_change >= 0) ? "success" : "danger",
            badge: (kpiData?.gross_profit_change >= 0) ? "ri-arrow-right-up-line" : "ri-arrow-right-down-line",
            percentage: Math.abs(kpiData?.gross_profit_change || 0).toFixed(2),
            counter: kpiData?.gross_profit || 0,
            link: "Profit Details",
            url: "#",
            bgcolor: "primary",
            icon: "ri-hand-coin-line",
            decimals: 2,
            prefix: "₹",
            separator: ","
        },
        {
            id: 4,
            label: "Total Income",
            badgeClass: (kpiData?.income_change >= 0) ? "success" : "danger",
            badge: (kpiData?.income_change >= 0) ? "ri-arrow-right-up-line" : "ri-arrow-right-down-line",
            percentage: Math.abs(kpiData?.income_change || 0).toFixed(2),
            counter: kpiData?.total_income
                ?? kpiData?.c_other_income
                ?? kpiData?.other_income
                ?? kpiData?.cOtherIncome
                ?? kpiData?.otherIncome
                ?? 0,
            link: "View Income",
            url: "/purchases/expense?vType=Income",
            bgcolor: "success",
            icon: "ri-arrow-up-circle-line",
            decimals: 2,
            prefix: "₹",
            separator: ","
        },
        {
            id: 5,
            label: "Total Expense",
            badgeClass: (kpiData?.expense_change >= 0) ? "danger" : "success",
            badge: (kpiData?.expense_change >= 0) ? "ri-arrow-right-up-line" : "ri-arrow-right-down-line",
            percentage: Math.abs(kpiData?.expense_change || 0).toFixed(2),
            counter: kpiData?.total_expense || 0,
            link: "View Expenses",
            url: "/purchases/expense?vType=Expense",
            bgcolor: "warning",
            icon: "ri-arrow-down-circle-line",
            decimals: 2,
            prefix: "₹",
            separator: ","
        },
        {
            id: 6,
            label: "Net Profit",
            badgeClass: (kpiData?.net_profit_change >= 0) ? "success" : "danger",
            badge: (kpiData?.net_profit_change >= 0) ? "ri-arrow-right-up-line" : "ri-arrow-right-down-line",
            percentage: Math.abs(kpiData?.net_profit_change || 0).toFixed(2),
            counter: kpiData?.net_profit || 0,
            link: "Profit Details",
            url: "#",
            bgcolor: "secondary",
            icon: "ri-wallet-3-line",
            decimals: 2,
            prefix: "₹",
            separator: ",",
        },
        {
            id: 7,
            label: "Profit %",
            badgeClass: "primary",
            badge: null,
            percentage: null,
            counter: profitPercent,
            link: "View Report",
            url: "#",
            bgcolor: "info",
            icon: "ri-pulse-line",
            decimals: 2,
            suffix: "%",
            separator: ",",
            formatFn: formatPercent,
        }
    ];

    return (
        <React.Fragment>
            <Col xl={12}>
                <Card className="crm-widget">
                <CardBody className="p-0" style={{ position: 'relative' }}>
                    {loading && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}
                    <Row className="g-0 flex-nowrap">
                            {widgetsData.map((item, key) => (
                                <Col key={key} className={key !== widgetsData.length - 1 ? "border-end-dashed" : ""} style={{ minWidth: 0, flex: '1 1 0' }}>
                                    <div className="py-4 px-3">
                                        <h5 className="text-muted text-uppercase fs-13">
                                            {item.label}
                                        </h5>
                                        <div className="d-flex align-items-center">
                                            <div className="flex-shrink-0">
                                                <i className={`${item.icon} display-6 text-muted`}></i>
                                            </div>
                                            <div className="flex-grow-1 ms-3">
                                                <h2 className={`mb-0 fs-20 ${(item.label.includes("Profit") && item.counter < 0) ? "text-danger" :
                                                    (item.label.includes("Profit") && item.counter > 0) ? "text-success" : ""
                                                    }`} id={`kpi-tooltip-${key}`} title={`${item.prefix || ""}${(item.formatFn || formatNumber)(item.counter)} ${item.suffix || ""}`.trim()}>
                                                    <span className="counter-value">
                                                        {item.prefix}
                                                        <CountUp
                                                            start={0}
                                                            end={Number(item.counter) || 0}
                                                            decimals={item.decimals ?? 0}
                                                            duration={3}
                                                            formattingFn={item.formatFn || formatNumber}
                                                        />
                                                        {item.suffix}
                                                    </span>
                                                </h2>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mt-3">
                                            {item.extras?.length > 0 ? (
                                                <>
                                                    <span className="text-truncate" id={`kpi-extras-${key}`}>
                                                        {item.extras.map((extra, extraIdx) => (
                                                            <span key={extra.label}>
                                                                {extraIdx > 0 ? ' · ' : ''}
                                                                <span className="text-muted fs-12">{extra.label}</span>{' '}
                                                                <span className="fw-bold fs-13 text-body">{extra.prefix}{extra.displayValue}</span>
                                                            </span>
                                                        ))}
                                                    </span>
                                                    <UncontrolledTooltip placement="top" target={`kpi-extras-${key}`}>
                                                        {item.extras.map((extra) => `${extra.label} ${extra.prefix}${extra.displayValue}`).join(' | ')}
                                                    </UncontrolledTooltip>
                                                    {item.percentage !== null && (
                                                        <span className="text-muted fs-11 text-nowrap ms-1">
                                                            <i className={`${item.badge} text-${item.badgeClass} align-middle me-1`}></i>
                                                            <span className={`fw-bold text-${item.badgeClass}`}>{item.percentage}%</span>
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <Link to={item.url} className="text-decoration-underline text-muted fs-12">{item.link}</Link>
                                                    {item.percentage !== null && (
                                                        <span className="text-muted fs-11">
                                                            <i className={`${item.badge} text-${item.badgeClass} align-middle me-1`}></i>
                                                            <span className={`fw-bold text-${item.badgeClass}`}>{item.percentage}%</span> vs. prev mo
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </CardBody>
                </Card>
            </Col>
        </React.Fragment>
    );
};

export default Widgets;
