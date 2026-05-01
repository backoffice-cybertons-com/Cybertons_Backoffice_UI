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
import { getPartyCustomers, getSalesTransactionDetails } from "../../helpers/fakebackend_helper";

//Import actions
import {
    getSalesTransactions as onGetSalesTransactions,
    deleteSalesTransaction as onDeleteSalesTransaction,
} from "../../slices/thunks";

//redux
import { useSelector, useDispatch } from "react-redux";

import Loader from "../../Components/Common/Loader";

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createSelector } from "reselect";

const SalesTransactionList = () => {
    const dispatch = useDispatch();
    const [vendors, setVendors] = useState([]);
    const [visibleRows, setVisibleRows] = useState([]);

    const [qtyByCode, setQtyByCode] = useState({});
    const inFlightRef = React.useRef(new Set());
    const persistTimerRef = React.useRef(null);
    const QTY_CACHE_KEY = "sb_sales_qty_cache_v1";

    const computeInvoiceQtyFromDetails = useCallback((tx) => {
        const lines = tx?.lines || tx?.Lines || [];
        if (!Array.isArray(lines)) return 0;
        return lines.reduce((sum, line) => sum + Number(line?.crt ?? line?.Crt ?? 0), 0);
    }, []);
    const getTotalQuantity = useCallback((row) => {
        const numeric = (value) => {
            if (value === null || value === undefined) return 0;
            const parsed = parseFloat(String(value).replace(/,/g, ""));
            return Number.isFinite(parsed) ? parsed : 0;
        };

        const codeKey = String(row?.spUniqueCode ?? row?.SpUniqueCode ?? "").trim();
        if (codeKey && qtyByCode && Object.prototype.hasOwnProperty.call(qtyByCode, codeKey)) {
            return numeric(qtyByCode[codeKey]);
        }

        // Preferred source: MapSalePurTran line rows from tab_sal_pur_tran
        // Sum only lines that belong to the current invoice.
        const mapLines = row?.MapSalePurTran || row?.mapSalePurTran || row?.mapSalePurTranList || row?.mapSalePurTranData;
        if (Array.isArray(mapLines) && mapLines.length > 0) {
            const rowInvoiceNo = String(row?.invNo ?? row?.InvNo ?? "").trim().toLowerCase();
            const rowUniqueCode = String(row?.spUniqueCode ?? row?.SpUniqueCode ?? "").trim();

            const lineBelongsToInvoice = (line) => {
                const lineInvNo = String(line?.invNo ?? line?.InvNo ?? line?.invoiceNo ?? line?.InvoiceNo ?? "").trim().toLowerCase();
                const lineUniqueCode = String(line?.spUniqueCode ?? line?.SpUniqueCode ?? line?.headerId ?? line?.HeaderId ?? "").trim();

                if (rowUniqueCode && lineUniqueCode) return lineUniqueCode === rowUniqueCode;
                if (rowInvoiceNo && lineInvNo) return lineInvNo === rowInvoiceNo;
                return true;
            };

            const sumFromMap = mapLines.reduce((sum, line) => {
                if (!lineBelongsToInvoice(line)) return sum;
                const lineQty = line?.quantity ?? line?.Quantity ?? line?.qty ?? line?.Qty ?? line?.crt ?? line?.Crt ?? 0;
                return sum + numeric(lineQty);
            }, 0);

            if (sumFromMap > 0) return sumFromMap;
        }

        const directKeys = [
            "qty", "Qty",
            "quantity", "Quantity",
            "totalQty", "TotalQty", "totalqty", "TotalQTY",
            "totalQuantity", "TotalQuantity",
            "crt", "Crt", "totalCrt", "TotalCrt", "totCrt", "TotCrt",
            "totQty", "TotQty"
        ];
        for (const key of directKeys) {
            if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
                return numeric(row[key]);
            }
        }

        const lineKeys = ["lines", "lineItems", "items", "details"];
        for (const key of lineKeys) {
            if (Array.isArray(row?.[key])) {
                return row[key].reduce((sum, line) => {
                    const lineQty = line?.crt ?? line?.quantity ?? line?.qty ?? line?.totalQty ?? 0;
                    return sum + numeric(lineQty);
                }, 0);
            }
        }
        return 0;
    }, [qtyByCode]);

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

    // Hydrate cached quantities for instant display
    useEffect(() => {
        try {
            const raw = localStorage.getItem(QTY_CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                setQtyByCode(prev => ({ ...parsed, ...prev }));
            }
        } catch { }
    }, []);

    // Persist quantities (debounced)
    useEffect(() => {
        if (!qtyByCode || typeof qtyByCode !== "object") return;
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(QTY_CACHE_KEY, JSON.stringify(qtyByCode));
            } catch { }
        }, 600);
        return () => {
            if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        };
    }, [qtyByCode]);

    useEffect(() => {
        const rows = (visibleRows && visibleRows.length >= 0) ? visibleRows : (SalesTransactions || []);
        const target = (rows || []).slice(0, 200);

        const toFetch = target
            .map(r => String(r?.spUniqueCode ?? r?.SpUniqueCode ?? "").trim())
            .filter(code => code && !Object.prototype.hasOwnProperty.call(qtyByCode, code) && !inFlightRef.current.has(code));

        if (toFetch.length === 0) return;

        let cancelled = false;
        const concurrency = 10;
        const firstWaveCount = 30; // show top rows quickly

        const worker = async (codes) => {
            const updates = {};
            for (const code of codes) {
                if (cancelled) break;
                inFlightRef.current.add(code);
                try {
                    const raw = await getSalesTransactionDetails(code);
                    const tx = raw?.data || raw;
                    updates[code] = computeInvoiceQtyFromDetails(tx);
                } catch (e) {
                    updates[code] = 0;
                } finally {
                    inFlightRef.current.delete(code);
                }
            }
            if (!cancelled && Object.keys(updates).length) {
                setQtyByCode(prev => ({ ...prev, ...updates }));
            }
        };

        const firstWave = toFetch.slice(0, firstWaveCount);
        const restWave = toFetch.slice(firstWaveCount);

        const runWithConcurrency = (codes) => {
            const chunks = Array.from({ length: Math.min(concurrency, codes.length) }, (_, i) =>
                codes.filter((_, idx) => idx % concurrency === i)
            );
            return Promise.all(chunks.map(worker));
        };

        runWithConcurrency(firstWave).then(() => {
            if (cancelled || restWave.length === 0) return;
            // let UI paint first, then continue in background
            setTimeout(() => { if (!cancelled) runWithConcurrency(restWave); }, 0);
        });
        return () => { cancelled = true; };
    }, [visibleRows, SalesTransactions, qtyByCode, computeInvoiceQtyFromDetails]);

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
                    return (
                        <div className="d-flex align-items-center gap-1 flex-nowrap">
                            {pagePermissions.canEdit && (
                                <Link to={`/sales-order/edit/${code}`} className="btn btn-sm btn-soft-info" title="Edit">
                                    <i className="ri-pencil-fill" />
                                </Link>
                            )}
                            {pagePermissions.canAdd && (
                                <Link to={`/sales-order/create?copyId=${code}`} className="btn btn-sm btn-soft-warning" title="Copy Invoice">
                                    <i className="ri-file-copy-line" />
                                </Link>
                            )}
                            <Link to={`/sales-order/invoice/${code}`} className="btn btn-sm btn-soft-success" title="Invoice">
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
                    return <Link to={`/sales-order/edit/${cell.row.original.spUniqueCode}`} className="fw-medium link-primary">{cell.getValue() || "N/A"}</Link>;
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
            },
            {
                header: "Total Quantity",
                id: "totalQuantity",
                accessorFn: (row) => getTotalQuantity(row),
                enableColumnFilter: true,
                right: true,
                filterFn: (row, columnId, filterValue) => {
                    const val = (row.getValue(columnId) || 0).toFixed(2);
                    return String(val).toLowerCase().includes(String(filterValue).toLowerCase());
                },
                cell: (cell) => Number(cell.getValue() || 0).toFixed(2),
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
        [vendors, pagePermissions, getTotalQuantity]
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
                totalQuantity: Number(getTotalQuantity(row) || 0).toFixed(2),
                grandTotal: Number(row.grandTotal || 0).toFixed(2),
            };
        });
    }, [visibleRows, SalesTransactions, vendors, getTotalQuantity]);

    const listTotals = useMemo(() => {
        const sourceRows = (visibleRows && visibleRows.length >= 0) ? visibleRows : (SalesTransactions || []);
        return sourceRows.reduce((acc, row) => {
            acc.totalQuantity += Number(getTotalQuantity(row) || 0);
            acc.grandTotal += Number(row?.grandTotal || 0);
            return acc;
        }, { totalQuantity: 0, grandTotal: 0 });
    }, [visibleRows, SalesTransactions, getTotalQuantity]);

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
                                            {pagePermissions.canAdd && (
                                                <Link
                                                    to="/sales-order/create"
                                                    className="btn btn-danger"
                                                >
                                                    <i className="ri-add-line align-bottom me-1"></i> New Sales Order
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
                                        <ToastContainer closeButton={false} limit={1} />
                                        <div className="mt-2 border rounded bg-light p-2">
                                            <div className="d-flex justify-content-end gap-4 fw-semibold">
                                                <span>Total Quantity: {listTotals.totalQuantity.toFixed(2)}</span>
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
