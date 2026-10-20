import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Input, Modal, ModalHeader, ModalBody } from 'reactstrap';
import BreadCrumb from '../../../Components/Common/BreadCrumb';
import { useLocation } from 'react-router-dom';
import { APIClient } from '../../../helpers/api_helper';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DataTable, { createTheme } from 'react-data-table-component';
import ExportButton from '../../../Components/Common/ExportButton';
import ResultModal from '../../../Components/Common/ResultModal';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import PartyMasterModal from './PartyMasterModal';
import {
    SOFTBOOK_RDT_ROWS_PER_PAGE_OPTIONS,
    SOFTBOOK_RDT_PAGINATION_COMPONENT_OPTIONS,
} from '../../../Components/Common/reactDataTableSoftBookDefaults';

const apiClient = new APIClient();

// Define custom dark theme for data table
createTheme('solarized', {
    text: { primary: '#ced4da', secondary: '#adb5bd' },
    background: { default: 'transparent' },
    context: { background: '#cb4b16', text: '#FFFFFF' },
    divider: { default: '#32383e' },
    action: {
        button: 'rgba(255, 255, 255, 0.7)',
        hover: 'rgba(255, 255, 255, 0.08)',
        disabled: 'rgba(255, 255, 255, 0.3)',
    },
});

const PartyMasterList = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const typeFilter = queryParams.get('type'); // "Customer", "Vendor", "Trader" or null

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [globalSearch, setGlobalSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState({});

    // Result Modal State
    const [resultModal, setResultModal] = useState({ show: false, title: "", message: "", type: "error" });
    const toggleResultModal = () => setResultModal(prev => ({ ...prev, show: !prev.show }));

    // Layout theme handling
    const selectLayoutState = (state) => state.Layout;
    const selectLayoutProperties = createSelector(
        selectLayoutState,
        (layout) => ({ layoutModeType: layout.layoutModeType })
    );
    const { layoutModeType } = useSelector(selectLayoutProperties);
    const isDarkMode = layoutModeType === "dark";

    // Permissions
    const permissions = useSelector(state => state.auth.permissions || []);
    // const pagePermissions = useMemo(() => {
    //     const p = permissions.find(x => x.tabId === 13);
    //     return p || { canAdd: false, canEdit: false, canDelete: false, canView: true };
    // }, [permissions]);

        const pagePermissions = useMemo(() => {
        //--changes made on 27/04/2026 
        let targetTabId = 12; // Default to Customer
        if (typeFilter === 'Vendor') targetTabId = 22;
        const p = permissions.find(x => x.tabId === targetTabId);
        return p || { canAdd: false, canEdit: false, canDelete: false, canView: true };
    }, [permissions, typeFilter]);


    const customStyles = useMemo(() => ({
        headRow: {
            style: {
                borderTopStyle: 'solid',
                borderTopWidth: '1px',
                borderTopColor: isDarkMode ? '#32383e' : '#e9ebec',
                backgroundColor: isDarkMode ? '#212529' : '#f3f6f9',
            },
        },
        headCells: {
            style: {
                paddingTop: '8px',
                paddingBottom: '12px',
                color: isDarkMode ? '#ced4da' : '#495057',
                fontWeight: '600',
            },
        },
        rows: {
            style: {
                minHeight: '48px',
                backgroundColor: isDarkMode ? '#212529' : '#ffffff',
                color: isDarkMode ? '#ced4da' : '#495057',
            },
        },
    }), [isDarkMode]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // If typeFilter exists, we fetch only that type, else we fetch all
            const endpoint = typeFilter ? `/api/party/type/${typeFilter}` : '/api/party';
            const response = await apiClient.get(endpoint);
            setData(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error("Error fetching parties:", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [typeFilter]);

    const renderHeader = (label, key) => (
        <div className="d-flex flex-column w-100 py-2">
            <span>{label}</span>
            <Input
                bsSize="sm"
                className="mt-1"
                value={columnFilters[key] || ""}
                onChange={e => setColumnFilters(prev => ({ ...prev, [key]: e.target.value }))}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                placeholder={`Filter ${label}...`}
                style={{ fontWeight: 'normal' }}
            />
        </div>
    );

    const pickField = (row, ...keys) => {
        for (const k of keys) {
            if (row?.[k] !== undefined && row?.[k] !== null) return row[k];
        }
        return "";
    };

    const partyExportColumns = [
        { label: "Display Name", accessor: row => pickField(row, "display_name", "displayName", "DisplayName") },
        { label: "Company Name", accessor: row => pickField(row, "company_name", "companyName", "CompanyName") },
        { label: "Party Type", accessor: row => pickField(row, "party_type", "partyType", "PartyType") },
        { label: "Email", accessor: row => pickField(row, "email", "Email") },
        { label: "Phone Mobile", accessor: row => pickField(row, "phone_mobile", "phoneMobile", "PhoneMobile", "phone_work", "phoneWork", "PhoneWork") },
        { label: "Opening Balance", accessor: row => pickField(row, "opening_balance", "openingBalance", "OpeningBalance") },
        {
            label: "Opening Balance Type",
            accessor: (row) => {
                const raw = String(pickField(row, "opening_balance_type", "openingBalanceType", "OpeningBalanceType") || "").trim().toUpperCase();
                if (raw === "DEBIT") return "Dr";
                if (raw === "CREDIT") return "Cr";
                return raw || "";
            }
        }
    ];

    const columns = [
        {
            name: "Actions",
            ignoreRowClick: true,
            width: "120px",
            cell: row => {
                const id = row.PartyId || row.partyId;
                return (
                    <div className="d-flex gap-2">
                        {pagePermissions.canEdit && (
                            <button className="btn btn-sm btn-soft-info" onClick={() => handleEdit(id)}><i className="ri-pencil-fill"></i></button>
                        )}
                        {pagePermissions.canDelete && (
                            <button className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(id)}><i className="ri-delete-bin-fill"></i></button>
                        )}
                    </div>
                );
            }
        },
        {
            name: renderHeader("Display Name", "display_name"),
            selector: row => pickField(row, "display_name", "displayName", "DisplayName"),
            sortable: true,
        },
        {
            name: renderHeader("Company Name", "company_name"),
            selector: row => pickField(row, "company_name", "companyName", "CompanyName"),
            sortable: true,
        },
        {
            name: renderHeader("Party Type", "party_type"),
            selector: row => pickField(row, "party_type", "partyType", "PartyType"),
            sortable: true,
            width: "140px"
        },
        {
            name: "Status",
            selector: row => {
                const active = row.isActive ?? row.IsActive;
                return active === false || active === 0 ? "Inactive" : "Active";
            },
            sortable: true,
            width: "100px",
            cell: row => {
                const active = row.isActive ?? row.IsActive;
                const isActive = !(active === false || active === 0);
                return (
                    <span className={`badge ${isActive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                        {isActive ? "Active" : "Inactive"}
                    </span>
                );
            }
        },
        {
            name: renderHeader("Email", "email"),
            selector: row => pickField(row, "email", "Email"),
            sortable: true,
        },
        {
            name: renderHeader("Phone Mobile", "phone_mobile"),
            selector: row => pickField(row, "phone_mobile", "phoneMobile", "PhoneMobile", "phone_work", "phoneWork", "PhoneWork"),
            sortable: true,
        },
        {
            name: renderHeader("Opening Balance", "opening_balance"),
            selector: row => pickField(row, "opening_balance", "openingBalance", "OpeningBalance"),
            sortable: true,
            // right: true,
            width: "140px",
            cell: row => {
                const val = parseFloat(pickField(row, "opening_balance", "openingBalance", "OpeningBalance")) || 0;
                return <div className="w-100 text-end">{val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
            }
        },
        {
            name: renderHeader("Opening Balance Type", "opening_balance_type"),
            selector: row => pickField(row, "opening_balance_type", "openingBalanceType", "OpeningBalanceType"),
            sortable: true,
            width: "170px",
            cell: row => {
                const raw = String(pickField(row, "opening_balance_type", "openingBalanceType", "OpeningBalanceType") || "").trim().toUpperCase();
                if (raw === "DEBIT") return "Dr";
                if (raw === "CREDIT") return "Cr";
                return raw || "";
            }
        }
    ];

    const toSnakeCase = (value) =>
        String(value || "")
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .replace(/[\s-]+/g, "_")
            .toLowerCase();

    const getVal = (row, key) => {
        if (!row || !key) return "";
        if (row[key] !== undefined && row[key] !== null) return String(row[key]);

        const keyLower = String(key).toLowerCase();
        const keySnake = toSnakeCase(key);

        for (const rowKey of Object.keys(row)) {
            const rowKeyLower = rowKey.toLowerCase();
            const rowKeySnake = toSnakeCase(rowKey);
            if (rowKeyLower === keyLower || rowKeySnake === keySnake) {
                const val = row[rowKey];
                return val === null || val === undefined ? "" : String(val);
            }
        }
        return "";
    };

    const filteredData = data.filter(row => {
        // 1. Global Search
        const gs = globalSearch.toLowerCase();
        if (gs) {
            const matchesGlobal = Object.values(row).some(val => {
                if (val === null || val === undefined) return false;
                if (typeof val === 'object') return false; // Skip nested objects for global search performance
                return String(val).toLowerCase().includes(gs);
            });
            if (!matchesGlobal) return false;
        }

        // 2. Column-Specific Filters
        for (const [key, filterValue] of Object.entries(columnFilters)) {
            if (!filterValue) continue;
            const rowValue = getVal(row, key).toLowerCase();
            if (!rowValue.includes(filterValue.toLowerCase())) return false;
        }

        return true;
    });

    const toggle = () => setModal(!modal);

    const handleEdit = (id) => {
        setSelectedId(id);
        setIsEdit(true);
        setModal(true);
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await apiClient.delete(`/api/party/${deleteId}`);
            setDeleteModal(false);
            fetchData();
        } catch (error) {
            setDeleteModal(false);
            setResultModal({
                show: true,
                title: "Delete Failed",
                message: error?.message || "This record cannot be deleted because it is being used by another process.",
                type: "error"
            });
        }
    };

    const pageTitle = typeFilter ? `${typeFilter} Master` : "Party Master";

    return (
        <React.Fragment>
            <div className="page-content">
                <ToastContainer closeButton={false} limit={1} />
                <Container fluid>
                    <BreadCrumb title={pageTitle} pageTitle="Masters" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="d-flex align-items-center">
                                    <h4 className="card-title mb-0 flex-grow-1">{pageTitle} List</h4>
                                    <div className="flex-shrink-0 d-flex gap-3 align-items-center">
                                        <div className="search-box">
                                            <Input type="text" placeholder="Search..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
                                            <i className="ri-search-line search-icon"></i>
                                        </div>
                                        <div className="hstack gap-2">
                                            <ExportButton
                                                data={filteredData}
                                                columns={partyExportColumns}
                                                fileName={`${typeFilter || "Party"}_Master`}
                                                iconOnly
                                            />
                                            {pagePermissions.canAdd && (
                                                <Button color="success" onClick={() => { setSelectedId(null); setIsEdit(false); setModal(true); }}>
                                                    <i className="ri-add-line align-bottom me-1"></i> Add {typeFilter || "Party"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <DataTable
                                        columns={columns}
                                        data={filteredData}
                                        pagination
                                        paginationPerPage={100}
                                        paginationRowsPerPageOptions={SOFTBOOK_RDT_ROWS_PER_PAGE_OPTIONS}
                                        paginationComponentOptions={SOFTBOOK_RDT_PAGINATION_COMPONENT_OPTIONS}
                                        sortIcon={<span className="ri-arrow-up-down-line ms-1 text-muted" />}
                                        progressPending={loading}
                                        customStyles={customStyles}
                                        theme={isDarkMode ? "solarized" : "default"}
                                        highlightOnHover
                                        striped
                                        dense
                                        persistTableHead
                                    />
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <PartyMasterModal
                isOpen={modal}
                toggle={toggle}
                partyId={selectedId}
                isEdit={isEdit}
                onSuccess={fetchData}
                defaultType={typeFilter}
            />

            <Modal isOpen={deleteModal} toggle={() => setDeleteModal(!deleteModal)} centered>
                <ModalHeader toggle={() => setDeleteModal(!deleteModal)}>Confirm Deletion</ModalHeader>
                <ModalBody className="text-center">
                    <lord-icon src="https://cdn.lordicon.com/gsqxdxog.json" trigger="loop" colors="primary:#f7b84b,secondary:#f06548" style={{ width: "100px", height: "100px" }}></lord-icon>
                    <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
                        <h4>Are you sure ?</h4>
                        <p className="text-muted mx-4 mb-0">Are you sure you want to remove this record ?</p>
                    </div>
                    <div className="d-flex gap-2 justify-content-center mt-4">
                        <Button color="light" onClick={() => setDeleteModal(false)}>Close</Button>
                        <Button color="danger" onClick={confirmDelete}>Yes, Delete It!</Button>
                    </div>
                </ModalBody>
            </Modal>

            <ResultModal
                show={resultModal.show}
                onCloseClick={toggleResultModal}
                title={resultModal.title}
                message={resultModal.message}
                type={resultModal.type}
            />
        </React.Fragment>
    );
};

export default PartyMasterList;
