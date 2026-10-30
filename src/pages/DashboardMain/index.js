import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import Widgets from './Widgets';
import SalesTrendChart from './SalesTrendChart';
import BarLineChart from './BarLineChart';
import TopClients from './TopClients';
import ExpenseBreakdownDonut from './ExpenseBreakdownDonut';
import InvoiceStatusList from './InvoiceStatusList';
import ZoneWiseBarChart from './ZoneWiseBarChart';
import { useSelector, useDispatch } from "react-redux";
import { getDashboardData } from "../../slices/dashboard/thunk";
import { getPartyTypeMaster } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import { getDashboardDateRange } from "../../utils/dashboardDateRange";
const DashboardMain = () => {
    document.title = "Dashboard | SoftBook";

    const dispatch = useDispatch();
    const [filter, setFilter] = useState("THIS_MONTH");
    const [topLimit, setTopLimit] = useState(5);
    const [selectedPartyTypes, setSelectedPartyTypes] = useState([{ label: "Expense", value: "Expense" }]);
    const [invStatusPartyType, setInvStatusPartyType] = useState("Customer");
    const [partyTypesList, setPartyTypesList] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [customFromDate, setCustomFromDate] = useState("");
    const [customToDate, setCustomToDate] = useState("");
    const [dateError, setDateError] = useState("");
    const [invStatusChanging, setInvStatusChanging] = useState(false);
    const [expenseChanging, setExpenseChanging] = useState(false);

    const toggleDropdown = () => setDropdownOpen((prevState) => !prevState);

    const { dashboardData, loading } = useSelector((state) => state.Dashboard);
    const companyId = secureStorage.getPlain('companyId');

    useEffect(() => {
        const fetchPartyTypes = async () => {
            try {
                const response = await getPartyTypeMaster();
                const list = response || [];
                setPartyTypesList(list);

                // Find "Expense" and map it to the format expected by react-select in the child component
                const expenseItem = list.find(pt => {
                    const name = (pt.partyTypeName || pt.PartyTypeName || pt.label || pt.PartyType || "").toLowerCase();
                    return name === "expense";
                });

                if (expenseItem) {
                    const label = expenseItem.partyTypeName || expenseItem.PartyTypeName || expenseItem.label || "Expense";
                    setSelectedPartyTypes([{ label: label, value: label }]);
                }
            } catch (error) {
                console.error("Error fetching party types:", error);
            }
        };
        fetchPartyTypes();
    }, []);

    useEffect(() => {
        if (!companyId) return;

        const pTypes = selectedPartyTypes.length > 0 ? selectedPartyTypes.map(pt => pt.value) : null;
        const requestParams = {
            companyId: parseInt(companyId),
            topLimit: topLimit,
            expensePartyTypes: pTypes,
            invStatusPartyType: invStatusPartyType
        };

        if (filter === "CUSTOM") {
            if (!customFromDate || !customToDate) return;
            if (new Date(customFromDate) > new Date(customToDate)) return;
        }

        const { fromDate, toDate } = getDashboardDateRange(filter, customFromDate, customToDate);

        dispatch(getDashboardData({
            ...requestParams,
            filterType: filter === "CUSTOM" ? null : filter,
            fromDate,
            toDate,
        }));
    }, [dispatch, filter, companyId, topLimit, selectedPartyTypes, customFromDate, customToDate, invStatusPartyType]);

    const isIndependentUpdate = invStatusChanging || expenseChanging;

    // Reset invStatusChanging flag when loading finishes
    useEffect(() => {
        if (!loading) {
            setInvStatusChanging(false);
            setExpenseChanging(false);
        }
    }, [loading]);

    const handleFilterChange = (selectedFilter) => {
        setDateError("");
        setFilter(selectedFilter);
        setInvStatusChanging(false);
        setExpenseChanging(false);
    };

    const handleExpensePartyTypesChange = (val) => {
        setExpenseChanging(true);
        setSelectedPartyTypes(val);
    };

    const handleInvStatusPartyTypeChange = (val) => {
        setInvStatusChanging(true);
        setInvStatusPartyType(val);
    };

    const handleCustomFromDate = (e) => {
        const val = e.target.value;
        setCustomFromDate(val);
        setDateError("");
        setInvStatusChanging(false);
        setExpenseChanging(false);
        if (customToDate && val && new Date(val) > new Date(customToDate)) {
            setDateError("From date cannot be after To date.");
        }
    };

    const handleCustomToDate = (e) => {
        const val = e.target.value;
        setCustomToDate(val);
        setDateError("");
        setInvStatusChanging(false);
        setExpenseChanging(false);
        if (customFromDate && val && new Date(customFromDate) > new Date(val)) {
            setDateError("To date cannot be before From date.");
        }
    };

    const filterLabels = {
        "YESTERDAY": "Yesterday",
        "TODAY": "Today",
        "THIS_WEEK": "This Week",
        "THIS_MONTH": "This Month",
        "PREV_MONTH": "Previous Month",
        "THIS_YEAR": "Current Year",
        "CUSTOM": "Custom Date"
    };

    const filterSubtitles = {
        "YESTERDAY": "Here's your business performance for yesterday.",
        "TODAY": "Here's what's happening with your business today.",
        "THIS_WEEK": "Here's your business performance for this week.",
        "THIS_MONTH": "Here's your business performance for this month.",
        "PREV_MONTH": "Here's your business performance for the previous month.",
        "THIS_YEAR": "Here's your business performance for the current year.",
        "CUSTOM": "Here's your business performance for the selected period.",
    };

    const getPeriodLabel = () => {
        if (filter === "CUSTOM" && customFromDate && customToDate) {
            const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            return `${fmt(customFromDate)} – ${fmt(customToDate)}`;
        }
        return filterLabels[filter] || filter;
    };

    // Build label for dropdown toggle button
    const getToggleLabel = () => {
        if (filter === "CUSTOM" && customFromDate && customToDate) {
            const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            return `${fmt(customFromDate)} – ${fmt(customToDate)}`;
        }
        return filterLabels[filter] || filter;
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Dashboard" pageTitle="Dashboards" />

                    <Row className="mb-3 pb-1">
                        <Col xs={12}>
                            <div className="d-flex align-items-lg-center flex-lg-row flex-column">
                                <div className="flex-grow-1">
                                    <h4 className="fs-16 mb-1">Overview &amp; Statistics</h4>
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

                                        {/* Custom date range pickers */}
                                        {filter === "CUSTOM" && (
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

                    <Row>
                        <Widgets 
                            kpiData={{
                                ...(dashboardData?.kpi_cards || {}),
                                total_qty_sold:
                                    dashboardData?.kpi_cards?.total_qty_sold
                                    ?? dashboardData?.total_qty_sold
                                    ?? dashboardData?.kpi_cards?.totalQtySold
                                    ?? dashboardData?.totalQtySold,
                                total_cogs_amount:
                                    dashboardData?.kpi_cards?.total_cogs_amount
                                    ?? dashboardData?.total_cogs_amount
                                    ?? dashboardData?.kpi_cards?.totalCogsAmount
                                    ?? dashboardData?.totalCogsAmount,
                                c_other_income:
                                    dashboardData?.kpi_cards?.c_other_income
                                    ?? dashboardData?.kpi_cards?.other_income
                                    ?? dashboardData?.c_other_income
                                    ?? dashboardData?.other_income
                                    ?? dashboardData?.kpi_cards?.cOtherIncome
                                    ?? dashboardData?.kpi_cards?.otherIncome,
                                total_income:
                                    dashboardData?.kpi_cards?.total_income
                                    ?? dashboardData?.total_income
                                    ?? dashboardData?.kpi_cards?.c_other_income
                                    ?? dashboardData?.kpi_cards?.other_income
                                    ?? dashboardData?.c_other_income
                                    ?? dashboardData?.other_income,
                            }}
                            loading={loading && !isIndependentUpdate}
                        />
                    </Row>

                    <Row className="mt-4">
                        <BarLineChart
                            seriesData={dashboardData?.bar_line_graph}
                            dataColors='["--vz-primary", "--vz-info", "--vz-warning", "--vz-success"]'
                            filter={filter}
                            loading={loading && !isIndependentUpdate}
                        />
                        <SalesTrendChart
                            seriesData={dashboardData?.sales_trend}
                            dataColors='["--vz-success", "--vz-warning", "--vz-danger"]'
                            filter={filter}
                            loading={loading && !isIndependentUpdate}
                        />
                    </Row>

                    <Row className="mt-4">
                        <TopClients
                            topClientsData={dashboardData?.top_clients}
                            topLimit={topLimit}
                            onLimitChange={setTopLimit}
                            loading={loading && !isIndependentUpdate}
                        />
                        <ExpenseBreakdownDonut
                            expenseData={dashboardData?.expense_breakdown}
                            partyTypesList={partyTypesList}
                            selectedPartyTypes={selectedPartyTypes}
                            onPartyTypesChange={handleExpensePartyTypesChange}
                            loading={loading}
                            dataColors='["--vz-primary", "--vz-success", "--vz-warning", "--vz-danger", "--vz-info", "--vz-secondary"]'
                        />
                    </Row>

                    <Row className="mt-4">
                        <InvoiceStatusList
                            invoiceStatusData={dashboardData?.invoice_status}
                            selectedPartyType={invStatusPartyType}
                            onPartyTypeChange={handleInvStatusPartyTypeChange}
                            loading={loading}
                        />
                        <ZoneWiseBarChart
                            zoneWiseData={dashboardData?.zone_wise}
                            dataColors='["--vz-primary", "--vz-info", "--vz-success", "--vz-warning", "--vz-danger"]'
                            loading={loading && !isIndependentUpdate}
                        />
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardMain;
