import React, { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Row,
    Input,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    FormFeedback,
    DropdownItem
} from 'reactstrap';
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
import { formatToTwoDecimals } from '../../utils/numberUtils';
import {
    SOFTBOOK_RDT_ROWS_PER_PAGE_OPTIONS,
    SOFTBOOK_RDT_PAGINATION_COMPONENT_OPTIONS,
} from '../../Components/Common/reactDataTableSoftBookDefaults';

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
    const [rolesMap, setRolesMap] = useState({});

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

    // --- PERMISSION ENFORCEMENT ---
    const { permissions } = useSelector(state => state.auth || { permissions: [] });
    const [pagePermissions, setPagePermissions] = useState({
        canAdd: true,
        canEdit: true,
        canDelete: true
    });

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
    const isProductMaster = name === "products";

    // Capitalize and format name for display
    useEffect(() => {
        if (name) {
            // 1. Format Display Name
            const formattedName = currentConfig?.label || name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2');
            setMasterName(formattedName);

            // 2. Identify Permissions for this Master
            if (permissions && permissions.length > 0) {
                // Find permission matching current master name or URL
                let perm = permissions.find(p =>
                    p.tabUrl?.toLowerCase().includes(name.toLowerCase()) ||
                    p.TabUrl?.toLowerCase().includes(name.toLowerCase()) ||
                    p.tabName?.toLowerCase() === formattedName.toLowerCase() ||
                    p.TabName?.toLowerCase() === formattedName.toLowerCase()
                );

                // Fallback to "Masters" (Tab 1011) if specific tab not found
                if (!perm) {
                    perm = permissions.find(p => p.tabId === 1011 || p.TabId === 1011);
                    if (perm) {
                        console.log(`[GenericMasterList] Fallback permissions (Tab 1011) applied for ${name}:`, perm);
                    }
                }

                if (perm) {
                    setPagePermissions({
                        canAdd: perm.canAdd ?? perm.CanAdd ?? false,
                        canEdit: perm.canEdit ?? perm.CanEdit ?? false,
                        canDelete: perm.canDelete ?? perm.CanDelete ?? false
                    });
                } else {
                    console.warn(`[GenericMasterList] No matching or fallback permissions found for ${name}. Denying actions.`);
                    setPagePermissions({ canAdd: false, canEdit: false, canDelete: false });
                }
            }

            fetchData();
        }
    }, [name, currentConfig, permissions]);

    useEffect(() => {
        if (name === 'users') {
            apiClient.get('/api/Master/roles').then(res => {
                const map = {};
                (res?.data || res || []).forEach(r => {
                    // Support both camelCase and PascalCase keys
                    const id = r.roleId ?? r.RoleId ?? r.id ?? r.Id;
                    const label = r.roleName ?? r.RoleName ?? r.name ?? r.Name;
                    if (id !== undefined) map[id] = label;
                });
                setRolesMap(map);
            }).catch(console.error);
        }
    }, [name]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Use custom fetchUrl if defined in masterConfig, otherwise default to generic Master API
            const fetchUrl = currentConfig.fetchUrl ? currentConfig.fetchUrl : `/api/Master/${name}`;
            const response = await apiClient.get(fetchUrl);

            if (response && Array.isArray(response)) {
                setData(response);
            } else {
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
            return currentConfig.fields
                .filter(field => !field.virtual && field.type !== 'password')
                .map(field => ({
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

    const toSnakeCase = (value) =>
        String(value || "")
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .replace(/[\s-]+/g, "_")
            .toLowerCase();

    const getRowValue = (row, accessor) => {
        if (!row || !accessor) return undefined;
        if (row[accessor] !== undefined) return row[accessor];

        const accessorLower = String(accessor).toLowerCase();
        const accessorSnake = toSnakeCase(accessor);

        for (const rowKey of Object.keys(row)) {
            const rowKeyLower = rowKey.toLowerCase();
            const rowKeySnake = toSnakeCase(rowKey);
            if (rowKeyLower === accessorLower || rowKeySnake === accessorSnake) {
                return row[rowKey];
            }
        }

        return undefined;
    };

    const getCellText = (row, accessor) => {
        const val = getRowValue(row, accessor);
        if (val === null || val === undefined) return "";
        if (typeof val === "boolean") return val ? "Yes" : "No";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
    };

    const getProductNameAndShortName = (row) => {
        const productName = getCellText(row, "name");
        const shortName = getCellText(row, "shortName");
        return { productName, shortName };
    };

    const isNumericColumn = (col) => {
        if (col?.type === "number") return true;
        const sampleValue = data?.[0]?.[col?.accessor];
        return typeof sampleValue === "number";
    };

    // Apply global search + per-column filters on the fly
    const filteredData = useMemo(() => {
        const gs = globalSearch.trim().toLowerCase();
        const activeColumnFilters = Object.entries(columnFilters)
            .filter(([, v]) => (v ?? "").toString().trim() !== "");

        return (data || []).filter(row => {
            if (gs) {
                let anyMatch = columnMeta.some(col =>
                    getCellText(row, col.accessor).toLowerCase().includes(gs)
                );
                if (!anyMatch && isProductMaster) {
                    const { productName, shortName } = getProductNameAndShortName(row);
                    anyMatch = `${productName} ${shortName}`.toLowerCase().includes(gs);
                }
                if (!anyMatch) return false;
            }

            for (const [accessor, value] of activeColumnFilters) {
                const fv = value.toString().toLowerCase();
                if (isProductMaster && accessor.toLowerCase() === "name") {
                    const { productName, shortName } = getProductNameAndShortName(row);
                    const combined = `${productName} ${shortName}`.toLowerCase();
                    if (!combined.includes(fv)) return false;
                    continue;
                }
                if (!getCellText(row, accessor).toLowerCase().includes(fv)) return false;
            }

            return true;
        });
    }, [data, globalSearch, columnFilters, columnMeta, isProductMaster]);

    const exportColumns = columnMeta.map(col => ({
        label: col.label,
        accessor: (row) => getCellText(row, col.accessor),
    }));

    // DataTable column definitions with in-column filters (inputs under headers)
    const dataTableColumns = useMemo(() => {
        const cols = columnMeta.map(col => {
            const isNumeric = isNumericColumn(col);
            return {
            name: (
                <div className={`d-flex flex-column ${isNumeric ? 'w-100 text-end' : ''}`}>
                    <span>{col.label}</span>
                    <Input
                        bsSize="sm"
                        className={`mt-1 ${isNumeric ? 'text-end' : ''}`}
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
            wrap: false,
            minWidth: col.accessor.toLowerCase() === "description" ? "350px" : undefined,
            cell: row => {
                const raw = row?.[col.accessor];
                if (isProductMaster && col.accessor.toLowerCase() === "name") {
                    const { productName, shortName } = getProductNameAndShortName(row);
                    return (
                        <div>
                            <div>{productName}</div>
                        </div>
                    );
                }
                if (col.accessor.toLowerCase() === "description") {
                    return (
                        <div style={{ whiteSpace: 'nowrap' }}>
                            {raw}
                        </div>
                    );
                }
                if (name === 'users' && (col.accessor === 'RoleId' || col.accessor === 'roleId')) {
                    return <div style={{ whiteSpace: 'nowrap' }}>{rolesMap[raw] || raw}</div>;
                }
                if (col.type === "number") {
                    return <div className="w-100 text-end">{formatToTwoDecimals(raw)}</div>;
                }
                if (typeof raw === "number") {
                    return <div className="w-100 text-end">{raw}</div>;
                }
                if (typeof raw === "boolean") return raw ? "Yes" : "No";
                if (raw === null || raw === undefined) return "";
                return <div style={{ whiteSpace: 'nowrap' }}>{String(raw)}</div>;
            },
        };
        });

        const actionCol = {
            name: "Actions",
            cell: (row) => (
                <div className="d-flex align-items-center gap-1 flex-nowrap">
                    {pagePermissions.canEdit && (
                        <button
                            type="button"
                            className="btn btn-sm btn-soft-info"
                            onClick={() => handleEdit(row)}
                            title="Edit"
                        >
                            <i className="ri-pencil-fill" />
                        </button>
                    )}
                    {pagePermissions.canDelete && (
                        <button
                            type="button"
                            className="btn btn-sm btn-soft-danger"
                            onClick={() => handleDelete(row)}
                            title="Delete"
                        >
                            <i className="ri-delete-bin-fill" />
                        </button>
                    )}
                    {!pagePermissions.canEdit && !pagePermissions.canDelete && (
                        <DropdownItem disabled>No Actions Allowed</DropdownItem>
                    )}
                </div>
            ),
            width: '110px',
            minWidth: '110px',
            grow: 0
        };

        return [actionCol, ...cols];
    }, [columnMeta, columnFilters, data, isProductMaster]);

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

    document.title = `${masterName} | SoftBook`;

    return (
        <React.Fragment>
            <div className="page-content">
                <ToastContainer closeButton={false} limit={1} />
                <Container fluid>
                    <BreadCrumb title={masterName} pageTitle="Masters" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="border-0">
                                    <Row className="g-4 align-items-center">
                                        <Col sm={3}>
                                            <div className="search-box">
                                                <Input
                                                    type="text"
                                                    className="form-control search"
                                                    placeholder="Global Search..."
                                                    value={globalSearch}
                                                    onChange={(e) => setGlobalSearch(e.target.value)}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </Col>
                                        <Col className="col-sm-auto ms-auto">
                                            <div className="hstack gap-2">
                                                <ExportButton
                                                    data={filteredData}
                                                    columns={exportColumns}
                                                    fileName={`${masterName || 'Master'}_${new Date().toISOString().slice(0, 10)}`}
                                                    iconOnly
                                                />
                                                {pagePermissions.canAdd && (
                                                    <Button color="success" onClick={toggle}>
                                                        <i className="ri-add-line align-bottom me-1"></i> Add {masterName}
                                                    </Button>
                                                )}
                                            </div>
                                        </Col>
                                    </Row>
                                </CardHeader>

                                <CardBody className="pt-0">
                                    <div className="listjs-table" id="customerList">

                                        <DataTable
                                            columns={dataTableColumns}
                                            data={filteredData}
                                            progressPending={loading}
                                            customStyles={customStyles}
                                            theme={isDarkMode ? "solarized" : "default"}
                                            sortIcon={<span className="ri-arrow-up-down-line ms-1 text-muted" />}
                                            pagination
                                            paginationPerPage={100}
                                            paginationRowsPerPageOptions={SOFTBOOK_RDT_ROWS_PER_PAGE_OPTIONS}
                                            paginationComponentOptions={SOFTBOOK_RDT_PAGINATION_COMPONENT_OPTIONS}
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

