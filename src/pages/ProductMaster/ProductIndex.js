import React, { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    CardHeader,
    CardBody,
    Button,
    Input,
    InputGroup
} from 'reactstrap';
import DataTable from 'react-data-table-component';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import { APIClient } from '../../helpers/api_helper';
import { getProductColumns, PRODUCT_EXPORT_COLUMNS } from './ProductColumns';
import { useNavigate } from 'react-router-dom';
import DeleteModal from '../../Components/Common/DeleteModal';
import ExportButton from '../../Components/Common/ExportButton';
import { toast, ToastContainer } from 'react-toastify';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import {
    SOFTBOOK_RDT_ROWS_PER_PAGE_OPTIONS,
    SOFTBOOK_RDT_PAGINATION_COMPONENT_OPTIONS,
} from '../../Components/Common/reactDataTableSoftBookDefaults';

const apiClient = new APIClient();

const ProductIndex = () => {
    document.title = "Product Master | SoftBook";

    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");
    const [columnFilters, setColumnFilters] = useState({});
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

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

    // Permissions
    const permissions = useSelector(state => state.auth.permissions || []);
    const pagePermissions = useMemo(() => {
        const p = permissions.find(x => x.tabId === 1010);
        return p || { canAdd: false, canEdit: false, canDelete: false, canView: true };
    }, [permissions]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/Product/details');
            const productList = response?.data || response || [];
            const mappedData = productList.map(p => ({
                ...p,
                productId: p.productId ?? p.ProductId,
                name: p.name ?? p.Name ?? p.productName ?? p.ProductName,
                shortName: p.shortName ?? p.ShortName ?? "",
                type: p.type ?? p.Type,
                productGroupName: p.productGroupName ?? p.ProductGroupName,
                taxGroupName: p.taxGroupName ?? p.TaxGroupName,
                hsnCode: p.hsnCode ?? p.HsnCode,
                sacCode: p.sacCode ?? p.SacCode,
                costPrice: p.costPrice ?? p.CostPrice,
                sellingPrice: p.sellingPrice ?? p.SellingPrice,
                mrp: p.mrp ?? p.MRP
            }));
            setData(mappedData);
        } catch (error) {
            console.error("Failed to fetch products:", error);
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (row) => {
        navigate(`/apps-product-master/edit/${row.productId}`);
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await apiClient.delete(`/api/Product/${deleteId}`);
            toast.success("Product deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Failed to delete product:", error);
            toast.error(error.message || "Failed to delete product");
        } finally {
            setDeleteModal(false);
        }
    };

    const filteredItems = useMemo(() => {
        return data.filter(item => {
            // Global search
            const globalMatch = !filterText || [
                item.name,
                item.Name,
                item.productName,
                item.shortName,
                item.ShortName,
                item.short_name,
                item.type,
                item.productGroupName,
                item.taxGroupName,
                item.productId?.toString()
            ].some(val => val?.toString().toLowerCase().includes(filterText.toLowerCase()));

            if (!globalMatch) return false;

            // Column filters
            for (const [key, value] of Object.entries(columnFilters)) {
                if (!value) continue;
                const searchVal = value.toLowerCase();

                if (key === 'hsnSac') {
                    const hsnSac = (item.type === 'Goods' ? item.hsnCode : item.sacCode) || '';
                    if (!hsnSac.toLowerCase().includes(searchVal)) return false;
                } else if (key === 'sellingPrice') {
                    if (!item.sellingPrice?.toString().includes(searchVal)) return false;
                } else if (key === 'productId') {
                    if (!item.productId?.toString().includes(searchVal)) return false;
                } else if (key === 'name') {
                    const name = (item.name || item.Name || item.productName || "").toString().toLowerCase();
                    const shortName = (item.shortName || item.ShortName || item.short_name || "").toString().toLowerCase();
                    if (!name.includes(searchVal) && !shortName.includes(searchVal)) return false;
                } else {
                    const itemVal = item[key]?.toString().toLowerCase() || '';
                    if (!itemVal.includes(searchVal)) return false;
                }
            }

            return true;
        });
    }, [data, filterText, columnFilters]);

    const columns = useMemo(() => getProductColumns(handleEdit, handleDelete, columnFilters, setColumnFilters, pagePermissions),
        [handleEdit, handleDelete, columnFilters, pagePermissions]);

    const customStyles = useMemo(() => ({
        headRow: {
            style: {
                backgroundColor: isDarkMode ? '#212529' : '#f3f6f9',
                borderTopStyle: 'solid',
                borderTopWidth: '1px',
                borderTopColor: isDarkMode ? '#32383e' : '#e9ebec',
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
            },
        },
        pagination: {
            style: {
                backgroundColor: isDarkMode ? '#212529' : '#ffffff',
                color: isDarkMode ? '#ced4da' : '#495057',
            },
        },
    }), [isDarkMode]);

    return (
        <div className="page-content">
            <ToastContainer autoClose={2000} limit={3} />
            <DeleteModal
                show={deleteModal}
                onDeleteClick={confirmDelete}
                onCloseClick={() => setDeleteModal(false)}
            />
            <Container fluid>
                <BreadCrumb title="Product Master" pageTitle="Masters" />
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
                                                value={filterText}
                                                onChange={(e) => setFilterText(e.target.value)}
                                            />
                                            <i className="ri-search-line search-icon"></i>
                                        </div>
                                    </Col>
                                    <Col className="col-sm-auto ms-auto">
                                        <div className="hstack gap-2">
                                            <ExportButton
                                                data={filteredItems}
                                                columns={PRODUCT_EXPORT_COLUMNS}
                                                fileName="ProductMaster"
                                                iconOnly
                                            />
                                            {pagePermissions.canAdd && (
                                                <Button
                                                    color="success"
                                                    onClick={() => navigate('/apps-product-master/create')}
                                                >
                                                    <i className="ri-add-line align-bottom me-1"></i> Add Product
                                                </Button>
                                            )}
                                        </div>
                                    </Col>
                                </Row>
                            </CardHeader>
                            <CardBody>
                                <DataTable
                                    columns={columns}
                                    data={filteredItems}
                                    pagination
                                    paginationPerPage={100}
                                    paginationRowsPerPageOptions={SOFTBOOK_RDT_ROWS_PER_PAGE_OPTIONS}
                                    paginationComponentOptions={SOFTBOOK_RDT_PAGINATION_COMPONENT_OPTIONS}
                                    sortIcon={<span className="ri-arrow-up-down-line ms-1 text-muted" />}
                                    progressPending={loading}
                                    noDataComponent={<div className="p-4 text-muted text-center">No products found.</div>}
                                    customStyles={customStyles}
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
    );
};

export default ProductIndex;
