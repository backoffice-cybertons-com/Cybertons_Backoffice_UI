import React, { useState, useEffect, useMemo } from "react";
import {
    CardBody, Row, Col, Card, Container, CardHeader,
} from "reactstrap";
import { Link } from "react-router-dom";
import moment from "moment";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import TableContainer from "../../Components/Common/TableContainer";
import DeleteModal from "../../Components/Common/DeleteModal";
import ExportButton from "../../Components/Common/ExportButton";
import Loader from "../../Components/Common/Loader";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useSelector } from "react-redux";
import { getDirectJournals, deleteDirectJournal } from "../../helpers/fakebackend_helper";

const ExpenseList = () => {
    const [expenses, setExpenses] = useState([]);
    const [visibleRows, setVisibleRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [deleteModal, setDeleteModal] = useState(false);

    // Permissions
    const permissions = useSelector(state => state.auth.permissions || []);
    // const pagePermissions = useMemo(() => {
    //     const p = permissions.find(x => x.tabId === 16);
    //     return p || { canAdd: false, canEdit: false, canDelete: false, canView: true };
    // }, [permissions]);

        const pagePermissions = useMemo(() => {
        //--changes made on 27/04/2026 
        const p = permissions.find(x => x.tabId === 1013);
        return p || { canAdd: false, canEdit: false, canDelete: false, canView: true };
    }, [permissions]);


    const fetchExpenses = async () => {
        try {
            setIsLoading(true);
            const expenseRes = await getDirectJournals("Expense");
            const incomeRes = await getDirectJournals("Income");
            const combinedData = [...(expenseRes?.data || expenseRes || []), ...(incomeRes?.data || incomeRes || [])];

            // Sort by Date DESC
            combinedData.sort((a, b) => new Date(b.jvDate || b.JvDate) - new Date(a.jvDate || a.JvDate));
            setExpenses(combinedData);
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const onClickDelete = (transaction) => {
        setSelectedTransaction(transaction);
        setDeleteModal(true);
    };

    const handleDeleteTransaction = async () => {
        if (selectedTransaction) {
            try {
                await deleteDirectJournal(selectedTransaction.gCode || selectedTransaction.GCode);
                toast.success("Expense deleted successfully");
                fetchExpenses();
            } catch (err) {
                toast.error("Failed to delete expense");
            } finally {
                setDeleteModal(false);
            }
        }
    };

    const handleValidDate = date => {
        return moment(new Date(date)).format("DD MMM Y");
    };

    const columns = useMemo(
        () => [
            {
                header: "Action",
                enableColumnFilter: false,
                enableSorting: false,
                cell: (cellProps) => {
                    const gCode = cellProps.row.original.gCode || cellProps.row.original.GCode || cellProps.row.original.g_code;
                    return (
                        <div className="d-flex align-items-center gap-1">
                            {pagePermissions.canEdit && (
                                <Link to={`/purchases/expense/edit/${gCode}`} className="btn btn-sm btn-soft-info" title="Edit">
                                    <i className="ri-pencil-fill" />
                                </Link>
                            )}
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
                header: "GCode",
                accessorKey: "gCode",
                enableColumnFilter: true,
                cell: (cell) => {
                    const val = cell.getValue() || cell.row.original.GCode || cell.row.original.g_code;
                    return <Link to={`/purchases/expense/edit/${val}`} className="fw-medium link-primary">{val || "N/A"}</Link>;
                },
            },
            {
                header: "Date",
                accessorKey: "jvDate",
                enableColumnFilter: true,
                cell: (cell) => handleValidDate(cell.getValue() || cell.row.original.JvDate || cell.row.original.jv_date),
            },
            {
                header: "Description",
                accessorKey: "description",
                enableColumnFilter: true,
                cell: (cell) => cell.getValue() || cell.row.original.Description || cell.row.original.description || "-",
            },
            {
                header: "Debit Account",
                accessorKey: "drAccountName",
                enableColumnFilter: true,
                right: true,
                cell: (cell) => cell.getValue() || cell.row.original.DrAccountName || cell.row.original.drAccountName || "-",
            },
            {
                header: "Credit Account",
                accessorKey: "crAccountName",
                enableColumnFilter: true,
                right: true,
                cell: (cell) => cell.getValue() || cell.row.original.CrAccountName || cell.row.original.crAccountName || "-",
            },
            {
                header: "Type",
                accessorKey: "vType",
                enableColumnFilter: true,
                filterFn: (row, columnId, filterValue) => {
                    const type = row.getValue(columnId) || row.original.VType || row.original.vType || "";
                    return String(type).toLowerCase().includes(String(filterValue).toLowerCase());
                },
                cell: (cell) => {
                    const type = cell.getValue() || cell.row.original.VType || cell.row.original.vType || "";
                    const isIncome = type === "Income";
                    return (
                        <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: isIncome ? '#d1fae5' : '#fee2e2',
                            color: isIncome ? '#065f46' : '#991b1b',
                            border: `1px solid ${isIncome ? '#6ee7b7' : '#fca5a5'}`
                        }}>
                            {type || "-"}
                        </span>
                    );
                }
            },
            {
                header: "Amount",
                accessorKey: "amount",
                enableColumnFilter: true,
                right: true,
                filterFn: (row, columnId, filterValue) => {
                    const amt = row.getValue(columnId) || row.original.Amount || row.original.amount || 0;
                    // Match against standard unformatted number to bypass Indian comma placement
                    const rawStr = Number(amt).toFixed(2);
                    const formattedStr = Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    const searchStr = String(filterValue).toLowerCase().replace(/,/g, '');

                    return rawStr.includes(searchStr) || formattedStr.includes(searchStr);
                },
                cell: (cell) => {
                    const amt = cell.getValue() || cell.row.original.Amount || cell.row.original.amount || 0;
                    return Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                }
            },
        ],
        [pagePermissions]
    );

    const exportColumns = useMemo(() => ([
        { label: "GCode", accessor: "gCode" },
        { label: "Date", accessor: "jvDate" },
        { label: "Description", accessor: "description" },
        { label: "Debit Account", accessor: "drAccountName" },
        { label: "Credit Account", accessor: "crAccountName" },
        { label: "Type", accessor: "vType" },
        { label: "Amount", accessor: "amount" },
    ]), []);

    const exportRows = useMemo(() => {
        const sourceRows = (visibleRows && visibleRows.length >= 0) ? visibleRows : (expenses || []);
        return sourceRows.map((row) => ({
            gCode: row.gCode || row.GCode || row.g_code || "",
            jvDate: handleValidDate(row.jvDate || row.JvDate || row.jv_date),
            description: row.description || row.Description || "-",
            drAccountName: row.drAccountName || row.DrAccountName || "-",
            crAccountName: row.crAccountName || row.CrAccountName || "-",
            vType: row.vType || row.VType || "",
            amount: Number(row.amount || row.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        }));
    }, [visibleRows, expenses]);

    document.title = "Income & Expenses | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content">
                <DeleteModal
                    show={deleteModal}
                    onDeleteClick={handleDeleteTransaction}
                    onCloseClick={() => setDeleteModal(false)}
                />
                <Container fluid>
                    <BreadCrumb title="Income/Expense List" pageTitle="Purchases" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="border-0">
                                    <div className="d-flex align-items-center">
                                        <h5 className="card-title mb-0 flex-grow-1">Transactions</h5>
                                        <div className="flex-shrink-0 hstack gap-2">
                                            <ExportButton
                                                data={exportRows}
                                                columns={exportColumns}
                                                fileName={`Income_Expense_Transactions_${new Date().toISOString().slice(0, 10)}`}
                                                iconOnly
                                            />
                                            {pagePermissions.canAdd && (
                                                <Link to="/purchases/expense/create" className="btn btn-danger">
                                                    <i className="ri-add-line align-bottom me-1"></i> New Income/Expense
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody className="pt-0">
                                    <div>
                                        {!isLoading ? (
                                            <TableContainer
                                                columns={columns}
                                                data={expenses}
                                                isGlobalFilter={true}
                                                onVisibleDataChange={setVisibleRows}
                                                customPageSize={100}
                                                className="custom-header-css"
                                                theadClass="text-muted text-uppercase"
                                                SearchPlaceholder='Search for GCode, description...'
                                            />
                                        ) : (<Loader error={error} />)}
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

export default ExpenseList;
