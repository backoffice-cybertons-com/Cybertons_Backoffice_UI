import React from 'react';
import CountUp from "react-countup";
import { Link } from 'react-router-dom';
import { Card, CardBody, Col, Row, UncontrolledTooltip } from 'reactstrap';

const Widgets = ({ kpiData }) => {

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

    const widgetsData = [
        {
            id: 1,
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
            separator: ","
        },
        {
            id: 2,
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
            separator: ","
        },
        {
            id: 3,
            label: "Total Expense",
            badgeClass: (kpiData?.expense_change >= 0) ? "danger" : "success",
            badge: (kpiData?.expense_change >= 0) ? "ri-arrow-right-up-line" : "ri-arrow-right-down-line",
            percentage: Math.abs(kpiData?.expense_change || 0).toFixed(2),
            counter: kpiData?.total_expense || 0,
            link: "View Expenses",
            url: "/purchases/expense?vType=Expense",
            bgcolor: "warning",
            icon: "ri-money-dollar-circle-line",
            decimals: 2,
            prefix: "₹",
            separator: ","
        },
        {
            id: 4,
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
            id: 5,
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
            separator: ","
        },
        {
            id: 6,
            label: "Profit %",
            badgeClass: "primary",
            badge: null,
            percentage: null,
            counter: kpiData?.profit_percentage || 0,
            link: "View Report",
            url: "#",
            bgcolor: "info",
            icon: "ri-pulse-line",
            decimals: 2,
            suffix: "%",
            separator: ","
        }
    ];

    return (
        <React.Fragment>
            <Col xl={12}>
                <Card className="crm-widget">
                    <CardBody className="p-0">
                        <Row className="row-cols-xxl-6 row-cols-md-3 row-cols-1 g-0">
                            {widgetsData.map((item, key) => (
                                <Col key={key} className={key !== widgetsData.length - 1 ? "border-end-dashed" : ""}>
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
                                                    }`} id={`kpi-tooltip-${key}`}>
                                                    <span className="counter-value">
                                                        {item.prefix}
                                                        <CountUp
                                                            start={0}
                                                            end={item.counter}
                                                            decimals={0}
                                                            duration={3}
                                                            formattingFn={formatNumber}
                                                        />
                                                        {item.suffix}
                                                    </span>
                                                </h2>
                                                <UncontrolledTooltip placement="top" target={`kpi-tooltip-${key}`}>
                                                    {item.prefix}{item.counter.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {item.suffix}
                                                </UncontrolledTooltip>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mt-3">
                                            <Link to={item.url} className="text-decoration-underline text-muted fs-12">{item.link}</Link>
                                            {item.percentage !== null && (
                                                <span className="text-muted fs-11">
                                                    <i className={`${item.badge} text-${item.badgeClass} align-middle me-1`}></i>
                                                    <span className={`fw-bold text-${item.badgeClass}`}>{item.percentage}%</span> vs. prev mo
                                                </span>
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
