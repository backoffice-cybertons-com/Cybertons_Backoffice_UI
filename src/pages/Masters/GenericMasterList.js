import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Input, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, FormFeedback } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { Link, useParams } from 'react-router-dom';
import { APIClient } from '../../helpers/api_helper';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { masterConfig } from '../../common/data/masterConfig';
import DataTable, { createTheme } from 'react-data-table-component';
import GenericMasterModal from '../../Components/Common/GenericMasterModal';
import ExportButton from '../../Components/Common/ExportButton';
import ResultModal from '../../Components/Common/ResultModal';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

// Define custom dark theme for data table
createTheme('solarized', {
    text: {
        primary: '#ced4da',
        secondary: '#adb5bd',
    },
    background: {
        default: 'transparent',
    },
    context: {
        background: '#cb4b16',
        text: '#FFFFFF',
    },
    divider: {
        default: '#32383e',
    },
    action: {
        button: 'rgba(255, 255, 255, 0.7)',
        hover: 'rgba(255, 255, 255, 0.08)',
        disabled: 'rgba(255, 255, 255, 0.3)',
    },
});

const dataTableCustomStyles = {
    headCells: {
        style: {
            paddingTop: '4px',
            paddingBottom: '12px', // extra space between filter inputs and rows
        },
    },
};

const apiClient = new APIClient();

const GenericMasterList = () => {
    const { name } = useParams();
    const [masterName, setMasterName] = useState("");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [globalSearch, setGlobalSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState({});

    // State for Result Modal (Centered Popup)
    const [resultModal, setResultModal] = useState({
        show: false,
        title: "",
        message: "",
        type: "error"
    });

    const toggleResultModal = () => setResultModal(prev => ({ ...prev, show: !prev.show }));

    // Layout theme handling
    const selectLayoutState = (state) => state.Layout;
    const selectLayoutProperties = createSelector(
        selectLayoutState,
        (layout) => ({
            layoutModeType: layout.layoutModeType,
        })
    );
    const { layoutModeType } = useSelector(selectLayoutProperties);
    const isDarkMode = layoutModeType === "dark";

    const customStyles = useMemo(() => ({
        header: {
            style: {
                minHeight: '56px',
            },
        },
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
                '&:not(:last-of-type)': {
                    borderBottomStyle: 'solid',
                    borderBottomWidth: '1px',
                    borderBottomColor: isDarkMode ? '#32383e' : '#e9ebec',
                },
            },
            highlightOnHoverStyle: {
                backgroundColor: isDarkMode ? '#2a2f34' : '#f3f6f9',
                borderBottomColor: isDarkMode ? '#32383e' : '#e9ebec',
                outline: '1px solid #ffffff00',
            },
            stripedStyle: {
                backgroundColor: isDarkMode ? '#262a2e' : '#f9f9f9',
                color: isDarkMode ? '#ced4da' : '#495057',
            },
        },
        pagination: {
            style: {
                backgroundColor: isDarkMode ? '#212529' : '#ffffff',
                color: isDarkMode ? '#ced4da' : '#495057',
                borderTopStyle: 'solid',
                borderTopWidth: '1px',
                borderTopColor: isDarkMode ? '#32383e' : '#e9ebec',
            },
            pageButtonsStyle: {
                fill: isDarkMode ? '#ced4da' : '#495057',
                '&:disabled': {
                    fill: isDarkMode ? '#495057' : '#ced4da',
                },
                '&:hover:not(:disabled)': {
                    backgroundColor: isDarkMode ? '#2a2f34' : '#f3f6f9',
                },
            },
        },
    }), [isDarkMode]);

    // Get configuration for the current master
    const currentConfig = masterConfig[name];

    // Capitalize and format name for display
    useEffect(() => {
        if (name) {
            // Converts "fiscal-years" to "Fiscal Year"
            const formattedName = currentConfig?.label || name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2'); // Split camelCase if present
            setMasterName(formattedName);
            fetchData();
        }
    }, [name, currentConfig]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Use the 'name' param directly as the masterName for the API
            const response = await apiClient.get(`/api/Master/${name}`);
            console.log(`[GenericMasterList] Response for ${name}:`, response); // DEBUG LOG
            if (response && Array.isArray(response)) {
                console.log(`[GenericMasterList] Data found: ${response.length} items`); // DEBUG LOG
                setData(response);
            } else {
                console.warn(`[GenericMasterList] Empty or invalid response`, response); // DEBUG LOG
                setData([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
            setData([]); // Fallback
        } finally {
            setLoading(false);
        }
    };

    // Column metadata: from config when available, else inferred from data
    const columnMeta = useMemo(() => {
        if (currentConfig && currentConfig.fields) {
            return currentConfig.fields.map(field => ({
                label: field.label,
                accessor: field.name,
                type: field.type || "text"
            }));
        }

        if (data && data.length > 0) {
            return Object.keys(data[0])
                .filter(key =>
                    !['id', 'createdby', 'createddate', 'modifiedby', 'modifieddate', 'isdeleted', 'companyid']
                        .includes(key.toLowerCase())
                )
                .map(key => ({
                    label: key.replace(/([A-Z])/g, ' $1').trim(),
                    accessor: key,
                    type: "text"
                }));
        }

        return [{ label: 'Name', accessor: 'name', type: 'text' }];
    }, [data, currentConfig]);

    const getCellText = (row, accessor) => {
        const val = row?.[accessor];
        if (val === null || val === undefined) return "";
        if (typeof val === "boolean") return val ? "Yes" : "No";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
    };

    // Apply global search + per-column filters on the fly
    const filteredData = useMemo(() => {
        const gs = globalSearch.trim().toLowerCase();
        const activeColumnFilters = Object.entries(columnFilters)
            .filter(([, v]) => (v ?? "").toString().trim() !== "");

        return (data || []).filter(row => {
            if (gs) {
                const anyMatch = columnMeta.some(col =>
                    getCellText(row, col.accessor).toLowerCase().includes(gs)
                );
                if (!anyMatch) return false;
            }

            for (const [accessor, value] of activeColumnFilters) {
                const fv = value.toString().toLowerCase();
                if (!getCellText(row, accessor).toLowerCase().includes(fv)) return false;
            }

            return true;
        });
    }, [data, globalSearch, columnFilters, columnMeta]);

    // DataTable column definitions with in-column filters (inputs under headers)
    const dataTableColumns = useMemo(() => {
        const cols = columnMeta.map(col => ({
            name: (
                <div className="d-flex flex-column">
                    <span>{col.label}</span>
                    <Input
                        bsSize="sm"
                        className="mt-1"
                        value={columnFilters[col.accessor] || ""}
                        placeholder=""
                        onChange={e =>
                            setColumnFilters(prev => ({ ...prev, [col.accessor]: e.target.value }))
                        }
                        // Prevent header click (sorting) when interacting with filter
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                    />
                </div>
            ),
            selector: row => row?.[col.accessor],
            sortable: true,
            wrap: true,
            cell: row => {
                const raw = row?.[col.accessor];
                if (typeof raw === "boolean") return raw ? "Yes" : "No";
                if (raw === null || raw === undefined) return "";
                return String(raw);
            }
        }));

        cols.push({
            name: "Actions",
            button: true,
            sortable: false,
            width: "170px",
            cell: row => (
                <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-warning" onClick={() => handleEdit(row)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(row)}>Delete</button>
                </div>
            )
        });

        return cols;
    }, [columnMeta, columnFilters]);

    const toggle = () => {
        setModal(!modal);
        if (modal) {
            setSelectedItem(null);
            setIsEdit(false);
        }
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setIsEdit(true);
        setModal(true);
    };

    const handleDelete = (item) => {
        const pkName = currentConfig?.pk || 'id';
        const id = item[pkName] || item.id || item.Id;
        if (id) {
            setDeleteId(id);
            setDeleteModal(true);
        } else {
            toast.error("Could not determine ID for deletion");
        }
    };

    const confirmDelete = async () => {
        if (deleteId) {
            try {
                await apiClient.delete(`/api/Master/${name}/${deleteId}`);
                toast.success("Record deleted successfully");
                setDeleteModal(false);
                fetchData();
            } catch (error) {
                console.error("Error deleting:", error);
                setDeleteModal(false);
                // Trigger centered popup instead of toast
                setResultModal({
                    show: true,
                    title: "Delete Failed",
                    message: error || "This record cannot be deleted because it is being used by another process or record.",
                    type: "error"
                });
            }
        }
    };

    document.title = `${masterName} List | SoftBook`;

    return (
        <React.Fragment>
            <div className="page-content">
                <ToastContainer closeButton={false} limit={1} />
                <Container fluid>
                    <BreadCrumb title={`${masterName}`} pageTitle="Masters" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">{masterName} List</h4>
                                </CardHeader>

                                <CardBody>
                                    <div className="listjs-table" id="customerList">
                                        <Row className="g-2 g-sm-4 mb-3 align-items-center">
                                            <Col className="col-sm-auto d-flex gap-2 mb-2 mb-sm-0 align-items-center">
                                                <Button color="primary" className="add-btn" onClick={toggle}>
                                                    <i className="ri-add-line align-bottom me-1"></i> Create New
                                                </Button>
                                                <ExportButton
                                                    data={filteredData}
                                                    columns={columnMeta}
                                                    fileName={`${masterName || 'Master'}_${new Date().toISOString().slice(0, 10)}`}
                                                    iconOnly
                                                    className="ms-1"
                                                />
                                            </Col>
                                            <Col className="col-sm">
                                                <div className="d-flex justify-content-sm-end">
                                                    <div className="search-box ms-2">
                                                        <Input
                                                            type="text"
                                                            className="form-control search"
                                                            placeholder="Search..."
                                                            value={globalSearch}
                                                            onChange={e => setGlobalSearch(e.target.value)}
                                                        />
                                                        <i className="ri-search-line search-icon"></i>
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>

                                        <DataTable
                                            columns={dataTableColumns}
                                            data={filteredData}
                                            progressPending={loading}
                                            customStyles={customStyles}
                                            theme={isDarkMode ? "solarized" : "default"}
                                            sortIcon={<span className="ri-arrow-up-down-line ms-1 text-muted" />}
                                            pagination
                                            paginationPerPage={10}
                                            paginationRowsPerPageOptions={[10, 25, 50, 100]}
                                            highlightOnHover
                                            striped
                                            dense
                                            persistTableHead
                                            noDataComponent={
                                                <div className={`py-4 text-center ${isDarkMode ? 'text-light' : ''}`}>
                                                    <h5 className="mt-2">Sorry! No Result Found</h5>
                                                </div>
                                            }
                                        />
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Generic Create/Edit Modal */}
            <GenericMasterModal
                isOpen={modal}
                toggle={toggle}
                masterId={name}
                isEdit={isEdit}
                selectedItem={selectedItem}
                onSuccess={fetchData}
            />

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModal} toggle={() => setDeleteModal(!deleteModal)} centered>
                <ModalHeader toggle={() => setDeleteModal(!deleteModal)} />
                <ModalBody>
                    <div className="mt-2 text-center">
                        <lord-icon src="https://cdn.lordicon.com/gsqxdxog.json" trigger="loop"
                            colors="primary:#f7b84b,secondary:#f06548" style={{ width: "100px", height: "100px" }}></lord-icon>
                        <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
                            <h4>Are you sure ?</h4>
                            <p className="text-muted mx-4 mb-0">Are you sure you want to remove this record ?</p>
                        </div>
                    </div>
                    <div className="d-flex gap-2 justify-content-center mt-4 mb-2">
                        <button type="button" className="btn w-sm btn-light" onClick={() => setDeleteModal(false)}>Close</button>
                        <button type="button" className="btn w-sm btn-danger" onClick={confirmDelete}>Yes, Delete It!</button>
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

export default GenericMasterList;
