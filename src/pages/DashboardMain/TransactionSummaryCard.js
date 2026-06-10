import React from 'react';
import CountUp from 'react-countup';
import { Link } from 'react-router-dom';
import { Card, CardBody, Col, Row, Spinner } from 'reactstrap';

const TransactionSummaryCard = ({ transactionSummary, periodLabel, loading }) => {
    const purchase = Number(transactionSummary?.total_purchase ?? transactionSummary?.totalPurchase ?? 0);
    const sales = Number(transactionSummary?.total_sales ?? transactionSummary?.totalSales ?? 0);
    const income = Number(transactionSummary?.total_income ?? transactionSummary?.totalIncome ?? 0);
    const expense = Number(transactionSummary?.total_expense ?? transactionSummary?.totalExpense ?? 0);
    const totalJv = Number(transactionSummary?.total_jv ?? transactionSummary?.totalJv ?? 0);

    const items = [
        {
            key: 'purchase',
            label: 'Purchase Entries',
            count: purchase,
            color: 'info',
            icon: 'ri-shopping-cart-line',
            link: '/purchase-transaction/list',
            linkText: 'View Purchases',
        },
        {
            key: 'sales',
            label: 'Sale Entries',
            count: sales,
            color: 'success',
            icon: 'ri-file-list-3-line',
            link: '/sales-order',
            linkText: 'View Sales',
        },
        {
            key: 'income',
            label: 'Income Entries',
            count: income,
            color: 'primary',
            icon: 'ri-arrow-down-circle-line',
            link: '/purchases/expense?vType=Income',
            linkText: 'View Income',
        },
        {
            key: 'expense',
            label: 'Expense Entries',
            count: expense,
            color: 'warning',
            icon: 'ri-arrow-up-circle-line',
            link: '/purchases/expense?vType=Expense',
            linkText: 'View Expenses',
        },
        {
            key: 'jv',
            label: 'Total JV Entries',
            count: totalJv,
            color: 'secondary',
            icon: 'ri-book-2-line',
            link: '/reports/day-book',
            linkText: 'Day Book',
        },
    ];

    return (
        <Col xl={8}>
            <Card className="card-height-100">
                <CardBody style={{ position: 'relative' }}>
                    {loading && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                            <Spinner color="primary" size="sm" />
                        </div>
                    )}
                    <div className="d-flex align-items-center mb-3">
                        <div className="flex-grow-1">
                            <h4 className="card-title mb-1">Transaction Summary</h4>
                            <p className="text-muted mb-0 fs-12">{periodLabel} — entry counts by type</p>
                        </div>
                        <div className="avatar-sm flex-shrink-0">
                            <span className="avatar-title bg-soft-info rounded fs-3">
                                <i className="ri-exchange-line text-info"></i>
                            </span>
                        </div>
                    </div>

                    <Row className="g-3">
                        {items.map((item) => (
                            <Col key={item.key} sm={6} lg={4} xl={4}>
                                <div className="border border-dashed rounded p-3 h-100">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <span className={`avatar-xs flex-shrink-0`}>
                                            <span className={`avatar-title bg-soft-${item.color} rounded fs-16`}>
                                                <i className={`${item.icon} text-${item.color}`}></i>
                                            </span>
                                        </span>
                                        <p className="text-muted text-uppercase fs-11 mb-0">{item.label}</p>
                                    </div>
                                    <h3 className={`mb-1 text-${item.color}`}>
                                        <CountUp start={0} end={item.count} duration={1.5} />
                                    </h3>
                                    <Link to={item.link} className="text-decoration-underline text-muted fs-12">
                                        {item.linkText}
                                    </Link>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </CardBody>
            </Card>
        </Col>
    );
};

export default TransactionSummaryCard;
