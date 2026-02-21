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
import { getProductColumns } from './ProductColumns';
import { useNavigate } from 'react-router-dom';
import DeleteModal from '../../Components/Common/DeleteModal';
import ExportButton from '../../Components/Common/ExportButton';
import { toast, ToastContainer } from 'react-toastify';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

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

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/Product/details');
            setData(response || []);
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
                } else {
                    const itemVal = item[key]?.toString().toLowerCase() || '';
                    if (!itemVal.includes(searchVal)) return false;
                }
            }

            return true;
        });
    }, [data, filterText, columnFilters]);

    const columns = useMemo(() => getProductColumns(handleEdit, handleDelete, columnFilters, setColumnFilters),
        [handleEdit, handleDelete, columnFilters]);

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
                                                columns={[
                                                    { label: "Product ID", accessor: "productId" },
                                                    { label: "Type", accessor: "type" },
                                                    { label: "Name", accessor: "name" },
                                                    { label: "Product Group", accessor: "productGroupName" },
                                                    { label: "Base Unit", accessor: "baseUnit" },
                                                    { label: "Packing Unit", accessor: "packingUnit" },
                                                    { label: "Tax Group", accessor: "taxGroupName" },
                                                    { label: "Selling Price", accessor: "sellingPrice" },
                                                    { label: "Cost Price", accessor: "costPrice" },
                                                    { label: "HSN Code", accessor: "hsnCode" },
                                                    { label: "SAC Code", accessor: "sacCode" }
                                                ]}
                                                fileName="ProductMaster"
                                                iconOnly
                                            />
                                            <Button
                                                color="success"
                                                onClick={() => navigate('/apps-product-master/create')}
                                            >
                                                <i className="ri-add-line align-bottom me-1"></i> Add Product
                                            </Button>
                                        </div>
                                    </Col>
                                </Row>
                            </CardHeader>
                            <CardBody>
                                <DataTable
                                    columns={columns}
                                    data={filteredItems}
                                    pagination
                                    loading={loading}
                                    noDataComponent={<div className="p-4 text-muted text-center">No products found.</div>}
                                    customStyles={customStyles}
                                    highlightOnHover
                                    striped
                                    dense
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
