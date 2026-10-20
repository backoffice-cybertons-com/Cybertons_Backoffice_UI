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
import * as moment from "moment";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import TableContainer from "../../Components/Common/TableContainer";
import DeleteModal from "../../Components/Common/DeleteModal";
import ExportButton from "../../Components/Common/ExportButton";
import { getVendors, getPurchaseTransactionDetails } from "../../helpers/fakebackend_helper";

//Import actions
import {
    getPurchaseTransactions as onGetPurchaseTransactions,
    deletePurchaseTransaction as onDeletePurchaseTransaction,
} from "../../slices/thunks";

//redux
import { useSelector, useDispatch } from "react-redux";

import Loader from "../../Components/Common/Loader";

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createSelector } from "reselect";
import { formatToFourDecimals } from "../../utils/numberUtils";
import { isOtherPurchaseRecord } from "./OtherPurchaseCreate";

const normalizePerm = (p) => ({
    canAdd: !!(p?.canAdd ?? p?.CanAdd),
    canEdit: !!(p?.canEdit ?? p?.CanEdit),
    canDelete: !!(p?.canDelete ?? p?.CanDelete),
    canView: !!(p?.canView ?? p?.CanView ?? true),
});

const PurchaseTransactionList = () => {
    const dispatch = useDispatch();
    const [vendors, setVendors] = useState([]);
    const [visibleRows, setVisibleRows] = useState([]);

    const selectLayoutState = (state) => state.PurchaseTransaction;
    const selectPurchaseProperties = createSelector(
        selectLayoutState,
        (state) => ({
            purchaseTransactions: state.purchaseTransactions,
            isPurchaseTransactionSuccess: state.isPurchaseTransactionSuccess,
            error: state.error,
        })
    );

    const {
        purchaseTransactions, isPurchaseTransactionSuccess, error
    } = useSelector(selectPurchaseProperties);

    // Permissions — resolve by URL/name first (tab IDs differ across tenants)
    const permissions = useSelector(state => state.auth.permissions || []);
    const pagePermissions = useMemo(() => {
        const match = permissions.find((x) => {
            const url = (x.tabUrl || x.TabUrl || "").toString().trim().toLowerCase();
            const name = (x.tabName || x.TabName || "").toString().trim().toLowerCase();
            const tabId = x.tabId ?? x.TabId;
            return (
                url.includes("purchase-transaction") ||
                name === "bills" ||
                name === "bill" ||
                name === "purchase order" ||
                name.includes("purchase transaction") ||
                tabId === 26 ||
                tabId === 15
            );
        });
        return normalizePerm(match || { canAdd: false, canEdit: false, canDelete: false, canView: true });
    }, [permissions]);


    //delete 
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
        dispatch(onGetPurchaseTransactions());

        // Load vendors to resolve partyId -> vendor name
        const fetchVendors = async () => {
            try {
                const raw = await getVendors();
                // Axios may return { data: [...] } or the array directly
                const vendorData = Array.isArray(raw) ? raw
                    : (raw?.data && Array.isArray(raw.data)) ? raw.data
                        : [];
                setVendors(
                    vendorData.map(v => ({
                        id: v.partyId ?? v.PartyId ?? v.party_id,
                        name: v.displayName ?? v.DisplayName ?? v.display_name
                            ?? v.name ?? v.Name ?? ("Party " + (v.partyId ?? v.PartyId))
                    }))
                );
            } catch (e) {
                console.error("Failed to load vendors for PurchaseTransaction list", e);
            }
        };

        fetchVendors();
    }, [dispatch]);

    // Delete Data
    const onClickDelete = (transaction) => {
        setSelectedTransaction(transaction);
        setDeleteModal(true);
    };

    const handleDeleteTransaction = () => {
        if (selectedTransaction) {
            dispatch(onDeletePurchaseTransaction(selectedTransaction.spUniqueCode));
            setDeleteModal(false);
        }
    };

    const handleValidDate = date => {
        return moment(new Date(date)).format("DD MMM Y");
    };

    //Column
    const columns = useMemo(
        () => [
            {
                header: "Action",
                enableColumnFilter: false,
                enableSorting: false,
                width: "140px",
                minWidth: "140px",
                grow: 0,
                cell: (cellProps) => {
                    const code = cellProps.row.original.spUniqueCode;
                    const editPath = isOtherPurchaseRecord(cellProps.row.original)
                        ? `/purchase-transaction/other/edit/${code}`
                        : `/purchase-transaction/edit/${code}`;
                    return (
                        <div className="d-flex align-items-center gap-1 flex-nowrap">
                            {pagePermissions.canEdit && (
                                <Link to={editPath} className="btn btn-sm btn-soft-info" title="Edit">
                                    <i className="ri-pencil-fill" />
                                </Link>
                            )}
                            {pagePermissions.canAdd && (
                                <Link to={`/purchase-transaction/create?copyId=${code}`} className="btn btn-sm btn-soft-warning" title="Copy Invoice">
                                    <i className="ri-file-copy-line" />
                                </Link>
                            )}
                            <Link to={`/purchase-transaction/invoice/${code}`} className="btn btn-sm btn-soft-success" title="Invoice">
                                <i className="ri-printer-line" />
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
                    const editPath = isOtherPurchaseRecord(cell.row.original)
                        ? `/purchase-transaction/other/edit/${cell.row.original.spUniqueCode}`
                        : `/purchase-transaction/edit/${cell.row.original.spUniqueCode}`;
                    return <Link to={editPath} className="fw-medium link-primary">{cell.getValue() || "N/A"}</Link>;
                },
            },
            {
                header: "Date",
                accessorKey: "invDate",
                enableColumnFilter: true,
                cell: (cell) => handleValidDate(cell.getValue()),
            },
            {
                header: "Vendor",
                accessorKey: "partyId",
                enableColumnFilter: true,
                filterFn: (row, columnId, filterValue) => {
                    const partyId = row.getValue(columnId);
                    const vendor = vendors.find(v => String(v.id) === String(partyId));
                    const searchStr = vendor ? vendor.name : String(partyId || "");
                    return searchStr.toLowerCase().includes(String(filterValue).toLowerCase());
                },
                cell: (cell) => {
                    const partyId = cell.getValue();
                    const vendor = vendors.find(v => String(v.id) === String(partyId));
                    return vendor ? vendor.name : String(partyId || "");
                },
            },
            {
                header: "Type",
                accessorKey: "invType",
                enableColumnFilter: true,
            },
            {
                header: "Category",
                accessorKey: "invCategory",
                enableColumnFilter: true,
                cell: (cell) => {
                    const val = cell.getValue() || cell.row.original.InvCategory || "";
                    return val === "other_purchase" ? "Other Purchase" : (val || "Purchase Order");
                },
            },
            {
                header: "Total Quantity",
                accessorKey: "totalQuantity",
                enableColumnFilter: true,
                right: true,
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
        { label: "Vendor", accessor: "vendorName" },
        { label: "Type", accessor: "invType" },
        { label: "Total Quantity", accessor: "totalQuantity" },
        { label: "Grand Total", accessor: "grandTotal" },
    ]), []);

    const exportRows = useMemo(() => {
        const sourceRows = (visibleRows && visibleRows.length >= 0) ? visibleRows : (purchaseTransactions || []);
        return sourceRows.map((row) => {
            const partyId = row.partyId;
            const vendor = vendors.find(v => String(v.id) === String(partyId));
            return {
                invNo: row.invNo || "",
                invDate: row.invDate ? handleValidDate(row.invDate) : "",
                vendorName: vendor ? vendor.name : String(partyId || ""),
                invType: row.invType || "",
                totalQuantity: formatToFourDecimals(row.totalQuantity),
                grandTotal: Number(row.grandTotal || 0).toFixed(2),
            };
        });
    }, [visibleRows, purchaseTransactions, vendors]);

    const listTotals = useMemo(() => {
        const sourceRows = (visibleRows && visibleRows.length >= 0) ? visibleRows : (purchaseTransactions || []);
        return sourceRows.reduce((acc, row) => {
            acc.totalQuantity += Number(row.totalQuantity || 0);
            acc.grandTotal += Number(row?.grandTotal || 0);
            return acc;
        }, { totalQuantity: 0, grandTotal: 0 });
    }, [visibleRows, purchaseTransactions]);

    document.title = "Purchase Transactions | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content">
                <DeleteModal
                    show={deleteModal}
                    onDeleteClick={() => handleDeleteTransaction()}
                    onCloseClick={() => setDeleteModal(false)}
                />
                <Container fluid>
                    <BreadCrumb title="Purchase Transaction List" pageTitle="Transactions" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="border-0">
                                    <div className="d-flex align-items-center">
                                        <h5 className="card-title mb-0 flex-grow-1">Purchase Transactions</h5>
                                        <div className="flex-shrink-0 hstack gap-2">
                                            <ExportButton
                                                data={exportRows}
                                                columns={exportColumns}
                                                fileName={`Purchase_Transactions_${new Date().toISOString().slice(0, 10)}`}
                                                iconOnly
                                            />
                                            {pagePermissions.canAdd && (
                                                <>
                                                    <Link
                                                        to="/purchase-transaction/other/create"
                                                        className="btn btn-soft-primary"
                                                    >
                                                        <i className="ri-add-line align-bottom me-1"></i> Other Purchase
                                                    </Link>
                                                    <Link
                                                        to="/purchase-transaction/create"
                                                        className="btn btn-danger"
                                                    >
                                                        <i className="ri-add-line align-bottom me-1"></i> New Purchase Order
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody className="pt-0">
                                    <div>
                                        {isPurchaseTransactionSuccess ? (
                                            <TableContainer
                                                columns={columns}
                                                data={(purchaseTransactions || [])}
                                                isGlobalFilter={true}
                                                onVisibleDataChange={setVisibleRows}
                                                customPageSize={100}
                                                className="custom-header-css"
                                                theadClass="text-muted text-uppercase"
                                                SearchPlaceholder='Search for invoice, vendor...'
                                            />
                                        ) : (<Loader error={error} />)
                                        }
                                        <ToastContainer closeButton={false} limit={1} />
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

export default PurchaseTransactionList;
