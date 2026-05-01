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

const DashboardMain = () => {
    document.title = "Dashboard | SoftBook";

    const dispatch = useDispatch();
    const [filter, setFilter] = useState("THIS_MONTH");
    const [topLimit, setTopLimit] = useState(5);
    const [voucherType, setVoucherType] = useState("Expense");
    const [selectedPartyTypes, setSelectedPartyTypes] = useState([]);
    const [partyTypesList, setPartyTypesList] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const toggleDropdown = () => setDropdownOpen((prevState) => !prevState);

    const { dashboardData, loading } = useSelector((state) => state.Dashboard);
    const companyId = secureStorage.getPlain('companyId');

    useEffect(() => {
        const fetchPartyTypes = async () => {
            try {
                const response = await getPartyTypeMaster();
                setPartyTypesList(response || []);
            } catch (error) {
                console.error("Error fetching party types:", error);
            }
        };
        fetchPartyTypes();
    }, []);

    useEffect(() => {
        if (companyId) {
            const pTypes = selectedPartyTypes.length > 0 ? selectedPartyTypes.map(pt => pt.value) : null;
            const vTypes = voucherType ? [voucherType] : null;

            dispatch(getDashboardData({
                companyId: parseInt(companyId),
                filterType: filter,
                topLimit: topLimit,
                expenseVTypes: vTypes,
                expensePartyTypes: pTypes
            }));
        }
    }, [dispatch, filter, companyId, topLimit, voucherType, selectedPartyTypes]);

    const handleFilterChange = (selectedFilter) => {
        setFilter(selectedFilter);
    };

    const filterLabels = {
        "TODAY": "Today",
        "THIS_WEEK": "This Week",
        "THIS_MONTH": "This Month",
        "THIS_YEAR": "Current Year"
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
                                    <h4 className="fs-16 mb-1">Overview & Statistics</h4>
                                    <p className="text-muted mb-0">Here's what's happening with your business today.</p>
                                </div>
                                <div className="mt-3 mt-lg-0">
                                    <div className="d-flex align-items-center hstack gap-2">
                                        <span className="text-muted fw-bold text-uppercase fs-12">Period:</span>
                                        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                                            <DropdownToggle caret color="soft-primary" className="btn-md fw-bold fs-16 shadow-none">
                                                {filterLabels[filter]}
                                            </DropdownToggle>
                                            <DropdownMenu end>
                                                {Object.keys(filterLabels).map((key) => (
                                                    <DropdownItem key={key} onClick={() => handleFilterChange(key)} className="py-2 fs-15">
                                                        {filterLabels[key]}
                                                    </DropdownItem>
                                                ))}
                                            </DropdownMenu>
                                        </Dropdown>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Widgets kpiData={dashboardData?.kpi_cards} />
                    </Row>

                    <Row className="mt-4">
                        <BarLineChart
                            seriesData={dashboardData?.bar_line_graph}
                            dataColors='["--vz-primary", "--vz-info", "--vz-warning", "--vz-success"]'
                            filter={filter}
                        />
                        <SalesTrendChart 
                            seriesData={dashboardData?.sales_trend} 
                            dataColors='["--vz-success", "--vz-warning", "--vz-danger"]'
                            filter={filter}
                        />
                    </Row>

                    <Row className="mt-4">
                        <TopClients 
                            topClientsData={dashboardData?.top_clients}
                            topLimit={topLimit}
                            onLimitChange={setTopLimit}
                        />
                        <ExpenseBreakdownDonut 
                            expenseData={dashboardData?.expense_breakdown}
                            partyTypesList={partyTypesList}
                            selectedPartyTypes={selectedPartyTypes}
                            onPartyTypesChange={setSelectedPartyTypes}
                            selectedVoucherType={voucherType}
                            onVoucherTypeChange={setVoucherType}
                            loading={loading}
                            dataColors='["--vz-primary", "--vz-success", "--vz-warning", "--vz-danger", "--vz-info", "--vz-secondary"]'
                        />
                    </Row>

                    <Row className="mt-4">
                        <InvoiceStatusList 
                            invoiceStatusData={dashboardData?.invoice_status}
                        />
                        <ZoneWiseBarChart 
                            zoneWiseData={dashboardData?.zone_wise}
                            dataColors='["--vz-primary", "--vz-info", "--vz-success", "--vz-warning", "--vz-danger"]'
                        />
                    </Row>

                    {loading && (
                        <div className="text-center mt-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardMain;
