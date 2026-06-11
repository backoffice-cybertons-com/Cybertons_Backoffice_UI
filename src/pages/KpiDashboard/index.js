import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import NewMastersCard from '../DashboardMain/NewMastersCard';
import TransactionSummaryCard from '../DashboardMain/TransactionSummaryCard';
import SalesProfitCard from '../DashboardMain/SalesProfitCard';
import SystemLogDatewiseCard from '../DashboardMain/SystemLogDatewiseCard';
import GoodsSummaryCard from '../DashboardMain/GoodsSummaryCard';
import ItemWiseGoodsCard from '../DashboardMain/ItemWiseGoodsCard';
import OutstandingNoInvoiceList from '../DashboardMain/OutstandingNoInvoiceList';
import BelowPriceSalesList from '../DashboardMain/BelowPriceSalesList';
import PartyAddPriceDashboardCards from '../DashboardMain/PartyAddPriceDashboardCards';
import { useSelector, useDispatch } from 'react-redux';
import { getDashboardData } from '../../slices/dashboard/thunk';
import secureStorage from '../../utils/secureStorage';
import { getDashboardDateRange } from '../../utils/dashboardDateRange';

const KpiDashboard = () => {
    document.title = 'KPI Dashboard | SoftBook';

    const dispatch = useDispatch();
    const [filter, setFilter] = useState('THIS_MONTH');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [customFromDate, setCustomFromDate] = useState('');
    const [customToDate, setCustomToDate] = useState('');
    const [dateError, setDateError] = useState('');

    const { dashboardData, loading } = useSelector((state) => state.Dashboard);
    const companyId = secureStorage.getPlain('companyId');

    const toggleDropdown = () => setDropdownOpen((prevState) => !prevState);

    useEffect(() => {
        if (!companyId) return;

        const requestParams = {
            companyId: parseInt(companyId),
            topLimit: 5,
            expensePartyTypes: null,
            invStatusPartyType: 'Customer',
        };

        if (filter === 'CUSTOM') {
            if (!customFromDate || !customToDate) return;
            if (new Date(customFromDate) > new Date(customToDate)) return;
        }

        const { fromDate, toDate } = getDashboardDateRange(filter, customFromDate, customToDate);

        dispatch(getDashboardData({
            ...requestParams,
            filterType: filter === 'CUSTOM' ? null : filter,
            fromDate,
            toDate,
        }));
    }, [dispatch, filter, companyId, customFromDate, customToDate]);

    const handleFilterChange = (selectedFilter) => {
        setDateError('');
        setFilter(selectedFilter);
    };

    const handleCustomFromDate = (e) => {
        const val = e.target.value;
        setCustomFromDate(val);
        setDateError('');
        if (customToDate && val && new Date(val) > new Date(customToDate)) {
            setDateError('From date cannot be after To date.');
        }
    };

    const handleCustomToDate = (e) => {
        const val = e.target.value;
        setCustomToDate(val);
        setDateError('');
        if (customFromDate && val && new Date(customFromDate) > new Date(val)) {
            setDateError('To date cannot be before From date.');
        }
    };

    const filterLabels = {
        YESTERDAY: 'Yesterday',
        TODAY: 'Today',
        THIS_WEEK: 'This Week',
        THIS_MONTH: 'This Month',
        PREV_MONTH: 'Previous Month',
        THIS_YEAR: 'Current Year',
        CUSTOM: 'Custom Date',
    };

    const filterSubtitles = {
        YESTERDAY: 'KPI metrics for yesterday.',
        TODAY: 'KPI metrics for today.',
        THIS_WEEK: 'KPI metrics for this week.',
        THIS_MONTH: 'KPI metrics for this month.',
        PREV_MONTH: 'KPI metrics for the previous month.',
        THIS_YEAR: 'KPI metrics for the current year.',
        CUSTOM: 'KPI metrics for the selected period.',
    };

    const getPeriodLabel = () => {
        if (filter === 'CUSTOM' && customFromDate && customToDate) {
            const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            return `${fmt(customFromDate)} – ${fmt(customToDate)}`;
        }
        return filterLabels[filter] || filter;
    };

    const getToggleLabel = () => {
        if (filter === 'CUSTOM' && customFromDate && customToDate) {
            const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            return `${fmt(customFromDate)} – ${fmt(customToDate)}`;
        }
        return filterLabels[filter] || filter;
    };

    const cardLoading = loading;

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="KPI Dashboard" pageTitle="Dashboards" />

                    <Row className="mb-3 pb-1">
                        <Col xs={12}>
                            <div className="d-flex align-items-lg-center flex-lg-row flex-column">
                                <div className="flex-grow-1">
                                    <h4 className="fs-16 mb-1">KPI Overview</h4>
                                    <p className="text-muted mb-0">{filterSubtitles[filter] || filterSubtitles.CUSTOM}</p>
                                </div>
                                <div className="mt-3 mt-lg-0">
                                    <div className="d-flex align-items-center hstack gap-2 flex-wrap">
                                        <span className="text-muted fw-bold text-uppercase fs-12">Period:</span>
                                        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                                            <DropdownToggle caret color="soft-primary" className="btn-md fw-bold fs-14 shadow-none">
                                                {getToggleLabel()}
                                            </DropdownToggle>
                                            <DropdownMenu end>
                                                {Object.keys(filterLabels).map((key) => (
                                                    <DropdownItem
                                                        key={key}
                                                        onClick={() => handleFilterChange(key)}
                                                        active={filter === key}
                                                        className="py-2 fs-15"
                                                    >
                                                        {filterLabels[key]}
                                                    </DropdownItem>
                                                ))}
                                            </DropdownMenu>
                                        </Dropdown>

                                        {filter === 'CUSTOM' && (
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <div className="d-flex align-items-center gap-1">
                                                    <label className="text-muted fs-12 mb-0 fw-semibold">From:</label>
                                                    <input
                                                        type="date"
                                                        className={`form-control form-control-sm shadow-none ${dateError && !customFromDate ? 'is-invalid' : ''}`}
                                                        value={customFromDate}
                                                        onChange={handleCustomFromDate}
                                                        max={customToDate || undefined}
                                                        style={{ width: '150px' }}
                                                    />
                                                </div>
                                                <div className="d-flex align-items-center gap-1">
                                                    <label className="text-muted fs-12 mb-0 fw-semibold">To:</label>
                                                    <input
                                                        type="date"
                                                        className={`form-control form-control-sm shadow-none ${dateError && !customToDate ? 'is-invalid' : ''}`}
                                                        value={customToDate}
                                                        onChange={handleCustomToDate}
                                                        min={customFromDate || undefined}
                                                        style={{ width: '150px' }}
                                                    />
                                                </div>
                                                {dateError && (
                                                    <small className="text-danger">{dateError}</small>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mt-2">
                        <NewMastersCard
                            newMastersData={dashboardData?.new_masters_today}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                        <TransactionSummaryCard
                            transactionSummary={dashboardData?.transaction_summary}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                    </Row>

                    <Row className="mt-4">
                        <SalesProfitCard
                            salesProfitSummary={dashboardData?.sales_profit_summary}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                        <SystemLogDatewiseCard
                            filterType={filter}
                            customFromDate={customFromDate}
                            customToDate={customToDate}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                    </Row>

                    <Row className="mt-4">
                        <GoodsSummaryCard
                            goodsSummary={dashboardData?.goods_summary}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                        <ItemWiseGoodsCard
                            itemWiseGoods={dashboardData?.item_wise_goods}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                    </Row>

                    <div className="kpi-dashboard-linewise">
                    <Row className="mt-4">
                        <OutstandingNoInvoiceList
                            outstandingData={dashboardData?.outstanding_no_invoice}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                    </Row>

                    <Row className="mt-4">
                        <BelowPriceSalesList
                            belowPriceData={dashboardData?.below_price_sales}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                    </Row>

                    <Row className="mt-4">
                        <PartyAddPriceDashboardCards
                            partyAddPriceData={dashboardData?.party_add_price ?? dashboardData?.partyAddPrice}
                            periodLabel={getPeriodLabel()}
                            loading={cardLoading}
                        />
                    </Row>
                    </div>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default KpiDashboard;
