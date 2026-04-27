import React, { useState, useEffect, useMemo } from "react";
import {
    CardBody,
    Row,
    Col,
    Card,
    Container,
    CardHeader,
    UncontrolledDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
} from "reactstrap";
import { Link } from "react-router-dom";
import moment from "moment";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import TableContainer from "../../Components/Common/TableContainer";
import DeleteModal from "../../Components/Common/DeleteModal";

//redux
import { useSelector, useDispatch } from "react-redux";
import { getPaymentReceipts, deletePaymentReceipt } from "../../slices/thunks";
import { createSelector } from "reselect";

import Loader from "../../Components/Common/Loader";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PaymentReceiptList = () => {
    const dispatch = useDispatch();

    const selectLayoutState = (state) => state.PaymentReceipt;
    const selectProperties = createSelector(
        selectLayoutState,
        (state) => ({
            paymentReceipts: state.paymentReceipts,
            isPaymentReceiptSuccess: state.isPaymentReceiptSuccess,
            error: state.error,
        })
    );

    const {
        paymentReceipts, isPaymentReceiptSuccess, error
    } = useSelector(selectProperties);

    // Permissions
    const permissions = useSelector(state => state.auth.permissions || []);
    // const receiptPerms = useMemo(() => permissions.find(x => x.tabId === 41) || { canAdd: false, canEdit: false, canDelete: false }, [permissions]);
    // const paymentPerms = useMemo(() => permissions.find(x => x.tabId === 42) || { canAdd: false, canEdit: false, canDelete: false }, [permissions]);
        //--changes made on 27/04/2026 
    const receiptPerms = useMemo(() => permissions.find(x => x.tabId === 23) || { canAdd: false, canEdit: false, canDelete: false }, [permissions]);
    const paymentPerms = useMemo(() => permissions.find(x => x.tabId === 23) || { canAdd: false, canEdit: false, canDelete: false }, [permissions]);


    const canAddAny = receiptPerms.canAdd || paymentPerms.canAdd;

    //delete 
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
        dispatch(getPaymentReceipts({ pageNo: 1, pageSize: 500 }));
    }, [dispatch]);

    // Delete Data
    const onClickDelete = (transaction) => {
        setSelectedTransaction(transaction);
        setDeleteModal(true);
    };

    const handleDeleteTransaction = () => {
        if (selectedTransaction) {
            dispatch(deletePaymentReceipt(selectedTransaction.jv_code));
            setDeleteModal(false);
            toast.success("Transaction deleted successfully");
        }
    };

    const handleValidDate = date => {
        return moment(new Date(date)).format("DD MMM Y");
    };

    //Column
    const columns = useMemo(
        () => [
            {
                header: "GCode",
                accessorKey: "jv_code",
                enableColumnFilter: true,
                cell: (cell) => {
                    return <Link to={`/payment-receipt/edit/${cell.getValue()}`} className="fw-medium link-primary">{cell.getValue() || "N/A"}</Link>;
                },
            },
            {
                header: "Date",
                accessorKey: "jv_date",
                enableColumnFilter: true,
                cell: (cell) => handleValidDate(cell.getValue()),
            },
            {
                header: "Type",
                accessorKey: "v_type",
                enableColumnFilter: true,
                cell: (cell) => {
                    const val = cell.getValue();
                    return <span className={`badge ${val === 'RECEIPT' || val === 'Receipt' ? 'bg-success' : 'bg-primary'}`}>{val}</span>;
                }
            },
            {
                header: "Main Account",
                accessorKey: "account_name",
                enableColumnFilter: true,
            },
            {
                header: "Party Account",
                accessorKey: "party_name",
                enableColumnFilter: true,
            },
            {
                header: "Amount",
                accessorKey: "amount",
                enableColumnFilter: true,
                right: true,
                filterFn: (row, columnId, filterValue) => {
                    const amt = row.getValue(columnId) || 0;
                    // Match against both standard unformatted number and formatted one
                    const rawStr = Number(amt).toFixed(2);
                    const formattedStr = Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    const searchStr = String(filterValue).toLowerCase().replace(/,/g, ''); // strip commas user might type

                    return rawStr.includes(searchStr) || formattedStr.includes(searchStr);
                },
                cell: (cell) => (cell.getValue() || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            },
            {
                header: "Action",
                enableColumnFilter: false,
                enableSorting: false,
                cell: (cellProps) => {
                    return (
                        <UncontrolledDropdown >
                            <DropdownToggle
                                href="#"
                                className="btn btn-soft-secondary btn-sm dropdown"
                                tag="button"
                            >
                                <i className="ri-more-fill align-middle"></i>
                            </DropdownToggle>
                            <DropdownMenu className="dropdown-menu-end">
                                {((cellProps.row.original.v_type === 'RECEIPT' && receiptPerms.canEdit) ||
                                    (cellProps.row.original.v_type === 'PAYMENT' && paymentPerms.canEdit)) && (
                                        <DropdownItem href={`/payment-receipt/edit/${cellProps.row.original.jv_code}`}>
                                            <i className="ri-pencil-fill align-bottom me-2 text-muted"></i>{" "}
                                            Edit
                                        </DropdownItem>
                                    )}
                                {((cellProps.row.original.v_type === 'RECEIPT' && receiptPerms.canDelete) ||
                                    (cellProps.row.original.v_type === 'PAYMENT' && paymentPerms.canDelete)) && (
                                        <DropdownItem
                                            href="#"
                                            onClick={() => onClickDelete(cellProps.row.original)}
                                        >
                                            <i className="ri-delete-bin-fill align-bottom me-2 text-muted"></i>{" "}
                                            Delete
                                        </DropdownItem>
                                    )}
                            </DropdownMenu>
                        </UncontrolledDropdown>
                    );
                },
            },
        ],
        []
    );

    document.title = "Payment & Receipt | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content">
                <DeleteModal
                    show={deleteModal}
                    onDeleteClick={() => handleDeleteTransaction()}
                    onCloseClick={() => setDeleteModal(false)}
                />
                <Container fluid>
                    <BreadCrumb title="Payment & Receipt List" pageTitle="Transactions" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="border-0">
                                    <div className="d-flex align-items-center">
                                        <h5 className="card-title mb-0 flex-grow-1">Transactions</h5>
                                        <div className="flex-shrink-0">
                                            {canAddAny && (
                                                <Link
                                                    to="/payment-receipt/create"
                                                    className="btn btn-danger"
                                                >
                                                    <i className="ri-add-line align-bottom me-1"></i> New Transaction
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody className="pt-0">
                                    <div>
                                        {isPaymentReceiptSuccess ? (
                                            <TableContainer
                                                columns={columns}
                                                data={(paymentReceipts || [])}
                                                isGlobalFilter={true}
                                                customPageSize={100}
                                                className="custom-header-css"
                                                theadClass="text-muted text-uppercase"
                                                SearchPlaceholder='Search for ID, account, party...'
                                            />
                                        ) : (<Loader error={error} />)
                                        }
                                        <ToastContainer closeButton={false} limit={1} />
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

export default PaymentReceiptList;
