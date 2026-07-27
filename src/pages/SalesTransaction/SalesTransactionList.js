import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    CardBody,
    Row,
    Col,
    Card,
    Container,
    CardHeader,
} from "reactstrap";
import { Link } from "react-router-dom";
import moment from "moment";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import TableContainer from "../../Components/Common/TableContainer";
import DeleteModal from "../../Components/Common/DeleteModal";
import ExportButton from "../../Components/Common/ExportButton";
import { getPartyCustomers, getSalesTransactionDetails, syncMobileOrders } from "../../helpers/fakebackend_helper";

//Import actions
import {
    getSalesTransactions as onGetSalesTransactions,
    deleteSalesTransaction as onDeleteSalesTransaction,
} from "../../slices/thunks";

//redux
import { useSelector, useDispatch } from "react-redux";

import Loader from "../../Components/Common/Loader";

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createSelector } from "reselect";
import { formatToFourDecimals } from "../../utils/numberUtils";

const SalesTransactionList = () => {
    const dispatch = useDispatch();
    const [vendors, setVendors] = useState([]);
    const [visibleRows, setVisibleRows] = useState([]);

    const selectLayoutState = (state) => state.SalesTransaction;
    const selectSalesProperties = createSelector(
        selectLayoutState,
        (state) => ({
            SalesTransactions: state.SalesTransactions,
            isSalesTransactionSuccess: state.isSalesTransactionSuccess,
            error: state.error,
        })
    );

    const {
        SalesTransactions, isSalesTransactionSuccess, error
    } = useSelector(selectSalesProperties);

    // Permissions
      const permissions = useSelector(state => state.auth.permissions || []);
    // const pagePermissions = useMemo(() => {
    //     const p = permissions.find(x => x.tabId === 14);
    //     return p || { canAdd: false, canEdit: false, canDelete: false, canView: true };
    // }, [permissions]);

        const pagePermissions = useMemo(() => {
        //--changes made on 27/04/2026 
        const p = permissions.find(x => x.tabId === 15);
        return p || { canAdd: false, canEdit: false, canDelete: false, canView: true };
      }, [permissions]);


    //delete 
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
        dispatch(onGetSalesTransactions());

        // Load customers to resolve partyId -> customer name
        const fetchCustomers = async () => {
            try {
                const raw = await getPartyCustomers();
                // Axios may return { data: [...] } or the array directly
                const customerData = Array.isArray(raw) ? raw
                    : (raw?.data && Array.isArray(raw.data)) ? raw.data
                        : [];
                setVendors(
                    customerData.map(v => ({
                        id: v.partyId ?? v.PartyId ?? v.party_id,
                        name: v.displayName ?? v.DisplayName ?? v.display_name
                            ?? v.name ?? v.Name ?? ("Party " + (v.partyId ?? v.PartyId))
                    }))
                );
            } catch (e) {
                console.error("Failed to load customers for SalesTransaction list", e);
            }
        };

        fetchCustomers();
    }, [dispatch]);

    // Delete Data
    const onClickDelete = (transaction) => {
        setSelectedTransaction(transaction);
        setDeleteModal(true);
    };

    const handleDeleteTransaction = () => {
        if (selectedTransaction) {
            dispatch(onDeleteSalesTransaction(selectedTransaction.spUniqueCode));
            setDeleteModal(false);
        }
    };

    const handleValidDate = date => {
        return moment(new Date(date)).format("DD MMM Y");
    };

    const [isSyncing, setIsSyncing] = useState(false);
    const handleSyncMobileOrders = async () => {
        try {
            setIsSyncing(true);
            const res = await syncMobileOrders();
            const result = res.data;  // DbResult: { success, data (message), error }
            if (result?.success) {
                toast.success(result.data || "Mobile orders synced successfully", { autoClose: 4000 });
                dispatch(onGetSalesTransactions());
            } else {
                toast.error(result?.error || "Sync failed. Please check server logs.", { autoClose: 6000 });
            }
        } catch (error) {
            toast.error(
                error?.response?.data?.error || error?.response?.data?.message || "Failed to sync mobile orders. Check network or server.",
                { autoClose: 5000 }
            );
        } finally {
            setIsSyncing(false);
        }
    };

    //Column
    const columns = useMemo(
        () => [
            {
                header: "Action",
                enableColumnFilter: false,
                enableSorting: false,
                width: "290px",
                minWidth: "290px",
                grow: 0,
                cell: (cellProps) => {
                    const code = cellProps.row.original.spUniqueCode;
                    return (
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                            {pagePermissions.canEdit && (
                                <Link to={`/sales-order/edit/${code}`} className="btn btn-sm btn-soft-info" title="Edit (Old Form)">
                                    <i className="ri-pencil-fill" />
                                </Link>
                            )}
                            {pagePermissions.canEdit && (
                                <Link to={`/revised-sales-order/edit/${code}`} className="btn btn-sm btn-soft-dark" title="Edit (Revised Form)">
                                    <i className="ri-edit-2-line" />
                                </Link>
                            )}
                            {pagePermissions.canAdd && (
                                <Link to={`/sales-order/create?copyId=${code}`} className="btn btn-sm btn-soft-warning" title="Copy Invoice">
                                    <i className="ri-file-copy-line" />
                                </Link>
                            )}
                            <Link to={`/sales-order/invoice/${code}`} className="btn btn-sm btn-soft-success" title="Standard Tax Invoice">
                                <i className="ri-printer-line" />
                            </Link>
                            <Link to={`/sales-order/mrp-invoice/${code}`} className="btn btn-sm btn-soft-secondary" title="MRP Tax Invoice">
                                <i className="ri-file-text-line" />
                            </Link>
                            <Link to={`/sales-order/updated-invoice/${code}`} className="btn btn-sm btn-soft-primary" title="MRP Profit Statement (Internal)">
                                <i className="ri-file-chart-line" />
                            </Link>
                            {pagePermissions.canDelete && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-soft-danger"
                                    onClick={() => onClickDelete(cellProps.row.original)}
                                    title="Delete"
                                >
                                    <i className="ri-delete-bin-fill" />
                                </button>
                            )}
                        </div>
                    );
                },
            },
            {
                header: "Invoice No",
                accessorKey: "invNo",
                enableColumnFilter: true,
                cell: (cell) => {
                    return <span className="fw-medium">{cell.getValue() || "N/A"}</span>;
                },
            },
            {
                header: "Date",
                accessorKey: "invDate",
                enableColumnFilter: true,
                cell: (cell) => handleValidDate(cell.getValue()),
            },
            {
                header: "Customer",
                accessorKey: "partyId",
                enableColumnFilter: true,
                filterFn: (row, columnId, filterValue) => {
                    const partyId = row.getValue(columnId);
                    const customer = vendors.find(v => String(v.id) === String(partyId));
                    const searchStr = customer ? customer.name : String(partyId || "");
                    return searchStr.toLowerCase().includes(String(filterValue).toLowerCase());
                },
                cell: (cell) => {
                    const partyId = cell.getValue();
                    const customer = vendors.find(v => String(v.id) === String(partyId));
                    return customer ? customer.name : String(partyId || "");
                },
            },
            {
                header: "Type",
                accessorKey: "invType",
                enableColumnFilter: true,
                width: "70px",
                maxWidth: "80px",
                grow: 0,
            },
            {
                header: "Tot Qty",
                accessorKey: "totalQuantity",
                enableColumnFilter: true,
                right: true,
                width: "90px",
                maxWidth: "100px",
                grow: 0,
                filterFn: (row, columnId, filterValue) => {
                    const val = formatToFourDecimals(row.getValue(columnId));
                    return String(val).toLowerCase().includes(String(filterValue).toLowerCase());
                },
                cell: (cell) => formatToFourDecimals(cell.getValue()),
            },
            {
                header: "Grand Total",
                accessorKey: "grandTotal",
                enableColumnFilter: true,
                right: true,
                filterFn: (row, columnId, filterValue) => {
                    const val = (row.getValue(columnId) || 0).toFixed(2);
                    return String(val).toLowerCase().includes(String(filterValue).toLowerCase());
                },
                cell: (cell) => (cell.getValue() || 0).toFixed(2),
            },
        ],
        [vendors, pagePermissions]
    );

    const exportColumns = useMemo(() => ([
        { label: "Invoice No", accessor: "invNo" },
        { label: "Date", accessor: "invDate" },
        { label: "Customer", accessor: "customerName" },
        { label: "Type", accessor: "invType" },
        { label: "Total Quantity", accessor: "totalQuantity" },
        { label: "Grand Total", accessor: "grandTotal" },
    ]), []);

    const exportRows = useMemo(() => {
        const sourceRows = (visibleRows && visibleRows.length >= 0) ? visibleRows : (SalesTransactions || []);
        return sourceRows.map((row) => {
            const partyId = row.partyId;
            const customer = vendors.find(v => String(v.id) === String(partyId));
            return {
                invNo: row.invNo || "",
                invDate: row.invDate ? handleValidDate(row.invDate) : "",
                customerName: customer ? customer.name : String(partyId || ""),
                invType: row.invType || "",
                totalQuantity: formatToFourDecimals(row.totalQuantity),
                grandTotal: Number(row.grandTotal || 0).toFixed(2),
            };
        });
    }, [visibleRows, SalesTransactions, vendors]);

    const listTotals = useMemo(() => {
        const sourceRows = (visibleRows && visibleRows.length >= 0) ? visibleRows : (SalesTransactions || []);
        return sourceRows.reduce((acc, row) => {
            acc.totalQuantity += Number(row.totalQuantity || 0);
            acc.grandTotal += Number(row?.grandTotal || 0);
            return acc;
        }, { totalQuantity: 0, grandTotal: 0 });
    }, [visibleRows, SalesTransactions]);

    document.title = "Sales Transactions | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content">
                <DeleteModal
                    show={deleteModal}
                    onDeleteClick={() => handleDeleteTransaction()}
                    onCloseClick={() => setDeleteModal(false)}
                />
                <Container fluid>
                    <BreadCrumb title="Sales Transaction List" pageTitle="Transactions" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="border-0">
                                    <div className="d-flex align-items-center">
                                        <h5 className="card-title mb-0 flex-grow-1">Sales Transactions</h5>
                                        <div className="flex-shrink-0 hstack gap-2">
                                            <ExportButton
                                                data={exportRows}
                                                columns={exportColumns}
                                                fileName={`Sales_Transactions_${new Date().toISOString().slice(0, 10)}`}
                                                iconOnly
                                            />
                                            {/* {pagePermissions.canAdd && (
                                                <button type="button" className="btn btn-primary" onClick={handleSyncMobileOrders} disabled={isSyncing} >
                                                    <i className={`ri-refresh-line align-bottom me-1 ${isSyncing ? 'mdi-spin' : ''}`}></i>
                                                    {isSyncing ? 'Syncing...' : 'Sync Mobile Orders'}
                                                </button>
                                            )} */}
                                            {pagePermissions.canAdd && (
                                                <Link
                                                    to="/sales-order/create"
                                                    className="btn btn-danger"
                                                    title="Old Sales Order Form"
                                                >
                                                    <i className="ri-add-line align-bottom me-1"></i> Sales Order
                                                </Link>
                                            )}
                                            {pagePermissions.canAdd && (
                                                <Link
                                                    to="/revised-sales-order/create"
                                                    className="btn btn-success"
                                                    title="New Revised Sales Order Form"
                                                >
                                                    <i className="ri-add-line align-bottom me-1"></i> Revised Sales Order
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody className="pt-0">
                                    <div>
                                        {isSalesTransactionSuccess ? (
                                            <TableContainer
                                                columns={columns}
                                                data={(SalesTransactions || [])}
                                                isGlobalFilter={true}
                                                onVisibleDataChange={setVisibleRows}
                                                customPageSize={100}
                                                className="custom-header-css"
                                                theadClass="text-muted text-uppercase"
                                                SearchPlaceholder='Search for invoice, vendor...'
                                            />
                                        ) : (<Loader error={error} />)
                                        }
                                        <div className="mt-2 border rounded bg-light p-2">
                                            <div className="d-flex justify-content-end gap-4 fw-semibold">
                                                <span>Total Quantity: {formatToFourDecimals(listTotals.totalQuantity)}</span>
                                                <span>Grand Total: {listTotals.grandTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default SalesTransactionList;
