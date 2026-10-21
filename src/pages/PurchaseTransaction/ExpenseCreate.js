import React, { useEffect, useState, useMemo, useCallback } from "react";
import moment from "moment";
import {
    CardBody, Row, Col, Card, Container, Form, Input, Label, Button, CardHeader, Table, Spinner
} from "reactstrap";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getAccounts, addNewDirectJournal, getDirectJournals, getJournalsByDateAndAccount, deleteDirectJournal } from "../../helpers/fakebackend_helper";
import { getSelectedFiscalYearId } from "../../utils/fiscalYearStorage";
import { formatToTwoDecimals } from "../../utils/numberUtils";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";

const api = new APIClient();

const ExpenseCreate = () => {
    const history = useNavigate();
    const { gCode } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isView = queryParams.get('view') === 'true';
    const isEdit = !!gCode;

    const [mainAccounts, setMainAccounts] = useState([]);
    const [trnAccounts, setTrnAccounts] = useState([]);
    const [vchType, setVchType] = useState("Income");
    const [relatedJvs, setRelatedJvs] = useState([]);
    const [relatedLoading, setRelatedLoading] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [deleteModal, setDeleteModal] = useState(false);

    const today = useMemo(() => new Date(), []);

    const parseAmount = (value) => {
        const raw = String(value ?? "").replace(/,/g, "").trim();
        const n = parseFloat(raw);
        return Number.isFinite(n) ? n : 0;
    };

    const formatIndianAmount = (value) => {
        const raw = String(value ?? "").replace(/,/g, "").trim();
        if (!raw) return "";
        const n = Number(raw);
        if (!Number.isFinite(n)) return "";
        const hasDecimal = raw.includes(".");
        return n.toLocaleString("en-IN", {
            minimumFractionDigits: hasDecimal ? 2 : 0,
            maximumFractionDigits: 2,
        });
    };

    const sanitizeAmountInput = (value) => {
        // Keep digits and at most one decimal point.
        const raw = String(value ?? "").replace(/,/g, "");
        const cleaned = raw.replace(/[^\d.]/g, "");
        const firstDot = cleaned.indexOf(".");
        if (firstDot === -1) return cleaned;
        return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch Main Accounts and Parties combined
                const [accRes, partyRes] = await Promise.all([getAccounts(), api.get(url.GET_PARTIES)]);
                
                const extractData = (res) => Array.isArray(res) ? res : (res?.data || []);
                const accData = extractData(accRes);
                const partyData = extractData(partyRes);
                
                const combined = [
                    ...accData.map(a => ({
                        label: a.DisplayName || a.displayName || a.partyName || a.name || "Unknown Account",
                        value: a.AccountCode || a.PartyId || a.partyId || a.id
                    })),
                    ...partyData.map(p => ({
                        label: p.displayName || p.DisplayName || p.partyName || p.PartyName,
                        value: p.partyId || p.PartyId || p.id
                    }))
                ];
                
                const uniqueMain = Array.from(new Map(combined.map(item => [item.value, item])).values());
                setMainAccounts(uniqueMain);

                if (isEdit) {
                    const res = await getDirectJournals("Expense");
                    const incomeRes = await getDirectJournals("Income");
                    
                    const data = [...(res?.data || res || []), ...(incomeRes?.data || incomeRes || [])];
                    const editData = data.find(d => d.gCode === gCode || d.GCode === gCode);
                    
                    if (editData) {
                        const type = editData.vType || editData.VType || "Income";
                        setVchType(type);
                        validation.setValues({
                           gCode: editData.gCode || editData.GCode,
                           date: new Date(editData.jvDate || editData.JvDate || today),
                           mainAccountId: type === "Income" ? (editData.drAccountCode || editData.DrAccountCode) : (editData.crAccountCode || editData.CrAccountCode),
                           trnAccountId: type === "Income" ? (editData.crAccountCode || editData.CrAccountCode) : (editData.drAccountCode || editData.DrAccountCode),
                           receivedDr: type === "Income" ? (editData.amount || editData.Amount || 0) : 0,
                           paidCr: type === "Expense" ? (editData.amount || editData.Amount || 0) : 0,
                           description: editData.description || editData.Description || ""
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast.error("Error fetching transaction data");
            }
        };
        fetchInitialData();
    }, [gCode, isEdit]);

    // Load Transaction Accounts - ALL accounts, no filtering
    useEffect(() => {
        const fetchTrnAccounts = async () => {
            try {
                const [accRes, partyRes] = await Promise.all([getAccounts(), api.get(url.GET_PARTIES)]);
                
                const extractData = (res) => Array.isArray(res) ? res : (res?.data || []);
                const accData = extractData(accRes);
                const partyData = extractData(partyRes);
                
                const combined = [
                    ...accData.map(a => ({
                        label: a.DisplayName || a.displayName || a.partyName || a.name || "Unknown Account",
                        value: a.AccountCode || a.PartyId || a.partyId || a.id
                    })),
                    ...partyData.map(p => ({
                        label: p.displayName || p.DisplayName || p.partyName || p.PartyName,
                        value: p.partyId || p.PartyId || p.id
                    }))
                ];
                
                const uniqueTrn = Array.from(new Map(combined.map(item => [item.value, item])).values());
                setTrnAccounts(uniqueTrn);
            } catch (e) {
                console.error("Failed to fetch accounts:", e);
            }
        };
        fetchTrnAccounts();
    }, []);

    const fetchRelatedJvs = useCallback(async (dateValue, accountCode) => {
        if (!dateValue || !accountCode) {
            setRelatedJvs([]);
            return;
        }
        try {
            setRelatedLoading(true);
            const jvDate = moment(dateValue).format("YYYY-MM-DD");
            const res = await getJournalsByDateAndAccount(jvDate, accountCode);
            const data = Array.isArray(res) ? res : (res?.data || []);
            setRelatedJvs(data);
        } catch (e) {
            console.error("Failed to fetch related journals:", e);
            setRelatedJvs([]);
        } finally {
            setRelatedLoading(false);
        }
    }, []);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues: {
            date: today,
            mainAccountId: "",
            trnAccountId: "",
            receivedDr: "0.00",
            paidCr: "0.00",
            description: "",
            gCode: gCode || ""
        },
        validationSchema: Yup.object({
            mainAccountId: Yup.mixed().required("Main Account is required"),
            trnAccountId: Yup.mixed().required("Transaction Account is required"),
        }),
        onSubmit: async (values) => {
            const fiscalYearId = getSelectedFiscalYearId();
            const received = parseAmount(values.receivedDr);
            const paid = parseAmount(values.paidCr);
            const actualAmount = received > 0 ? received : paid;
            const finalVType = received > 0 ? "Income" : "Expense";
            
            if (actualAmount <= 0) {
                toast.error("Please enter a valid amount in Received or Paid!");
                return;
            }

            // Dr = Received (Income/Receipt) ? Main Account : Transaction Account
            // Cr = Paid (Expense/Payment) ? Main Account : Transaction Account
            const entries = [
                {
                    jvDate: values.date,
                    drAccountCode: finalVType === "Income" ? values.mainAccountId : values.trnAccountId,
                    crAccountCode: finalVType === "Income" ? values.trnAccountId : values.mainAccountId,
                    amount: actualAmount,
                    vType: finalVType,
                    description: values.description,
                    gCode: isEdit ? values.gCode : "",
                    yearCode: fiscalYearId,
                    branchCode: 1, 
                    isOutstanding: false
                }
            ];

            try {
                const response = await addNewDirectJournal(entries);
                if (response && (response.success || response.Success || response.data?.success)) {
                    toast.success("Transaction saved successfully!");
                    // Keep Main Account / Date / Transaction Account as-is; only clear amount fields for next entry
                    setVchType("Income");
                    validation.setFieldValue("receivedDr", "0.00");
                    validation.setFieldValue("paidCr", "0.00");
                    validation.setFieldValue("description", "");
                    validation.setFieldValue("gCode", "");
                    await fetchRelatedJvs(values.date, values.trnAccountId);
                } else {
                    toast.error("Failed to save transaction");
                }
            } catch (error) {
                toast.error("Error saving transaction");
            }
        }
    });

    // Load existing JVs when Transaction Date + Transaction Account change
    useEffect(() => {
        fetchRelatedJvs(validation.values.date, validation.values.trnAccountId);
    }, [validation.values.date, validation.values.trnAccountId, fetchRelatedJvs]);

    const handleReceivedChange = (e) => {
        const raw = sanitizeAmountInput(e.target.value);
        const val = parseAmount(raw);
        validation.setFieldValue("receivedDr", raw === "" ? "" : String(Math.abs(val)));
        if (Math.abs(val) > 0) {
            setVchType("Income");
            validation.setFieldValue("paidCr", 0);
        }
    };

    const handlePaidChange = (e) => {
        const raw = sanitizeAmountInput(e.target.value);
        const val = parseAmount(raw);
        validation.setFieldValue("paidCr", raw === "" ? "" : String(Math.abs(val)));
        if (Math.abs(val) > 0) {
            setVchType("Expense");
            validation.setFieldValue("receivedDr", 0);
        }
    };

    const onClickDelete = (transaction) => {
        setSelectedTransaction(transaction);
        setDeleteModal(true);
    };

    const handleDeleteTransaction = async () => {
        if (!selectedTransaction) return;
        const rowGCode = selectedTransaction.gCode || selectedTransaction.GCode || selectedTransaction.g_code;
        try {
            await deleteDirectJournal(rowGCode);
            toast.success("Transaction deleted successfully");
            await fetchRelatedJvs(validation.values.date, validation.values.trnAccountId);
        } catch (err) {
            toast.error("Failed to delete transaction");
        } finally {
            setDeleteModal(false);
            setSelectedTransaction(null);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <DeleteModal
                    show={deleteModal}
                    onDeleteClick={handleDeleteTransaction}
                    onCloseClick={() => { setDeleteModal(false); setSelectedTransaction(null); }}
                />
                <Container fluid>
                    <BreadCrumb title={isView ? "View Income & Expenses" : isEdit ? "Edit Income & Expenses" : "Add Income & Expenses"} pageTitle="Income/Expense" />
                    <Row>
                        <Col lg={12}>
                            <Card className="shadow-none border">
                                <CardHeader className="bg-light-subtle">
                                    <h5 className="card-title mb-0">Transaction Detail</h5>
                                </CardHeader>
                                <CardBody>
                                    <Form onSubmit={validation.handleSubmit}>
                                        
                                        {/* Main Account Row - Full Width */}
                                        <Row className="mb-4">
                                            <Col md={12}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Main Account</Label>
                                                <Select 
                                                    isDisabled={isView}
                                                    options={mainAccounts} 
                                                    placeholder="Select Account"
                                                    value={mainAccounts.find(a => a.value === validation.values.mainAccountId) || null} 
                                                    onChange={opt => validation.setFieldValue("mainAccountId", opt?.value)}
                                                    isSearchable={true}
                                                />
                                                {validation.errors.mainAccountId && <small className="text-danger">{validation.errors.mainAccountId}</small>}
                                            </Col>
                                        </Row>

                                        {/* Exact Payment/Receipt Row Layout */}
                                        <Row className="mb-4 align-items-end">
                                            <Col md={3}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Transaction Date</Label>
                                                <Flatpickr className="form-control" options={{ dateFormat: "d/m/Y", clickOpens: !isView }} value={validation.values.date} onChange={d => !isView && validation.setFieldValue("date", d[0])} />
                                            </Col>

                                            <Col md={4}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Transaction Account</Label>
                                                <Select 
                                                    isDisabled={isView}
                                                    options={trnAccounts} 
                                                    placeholder="Search Account"
                                                    value={trnAccounts.find(a => a.value === validation.values.trnAccountId) || null} 
                                                    onChange={opt => validation.setFieldValue("trnAccountId", opt?.value)}
                                                    isSearchable={true}
                                                />
                                                {validation.errors.trnAccountId && <small className="text-danger">{validation.errors.trnAccountId}</small>}
                                            </Col>

                                            <Col md={2}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Received [Dr.]</Label>
                                                <Input 
                                                    type="text"
                                                    inputMode="decimal"
                                                    min="0" 
                                                    step="any"
                                                    placeholder="0.00"
                                                    value={formatIndianAmount(validation.values.receivedDr)} 
                                                    onChange={handleReceivedChange} 
                                                    onBlur={(e) => validation.setFieldValue("receivedDr", formatToTwoDecimals(parseAmount(e.target.value)))}
                                                    disabled={isView || parseAmount(validation.values.paidCr) > 0} 
                                                    className="w-100 text-center no-spin-input" 
                                                />
                                            </Col>

                                            <Col md={2}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Paid [Cr.]</Label>
                                                <Input 
                                                    type="text"
                                                    inputMode="decimal"
                                                    min="0" 
                                                    step="any"
                                                    placeholder="0.00"
                                                    value={formatIndianAmount(validation.values.paidCr)} 
                                                    onChange={handlePaidChange} 
                                                    onBlur={(e) => validation.setFieldValue("paidCr", formatToTwoDecimals(parseAmount(e.target.value)))}
                                                    disabled={isView || parseAmount(validation.values.receivedDr) > 0} 
                                                    className="w-100 text-center no-spin-input" 
                                                />
                                            </Col>
                                        </Row>

                                        {/* Description & Save Button */}
                                        <Row className="mb-3 align-items-end">
                                            <Col md={5}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Description</Label>
                                                <Input type="textarea" placeholder="Description" rows="3" value={validation.values.description} onChange={validation.handleChange} name="description" disabled={isView} style={{ resize: 'none' }} />
                                            </Col>
                                            
                                            <Col md={7} className="d-flex align-items-center gap-2 pb-1">
                                                {!isView && (
                                                    <Button color="primary" type="submit" className="btn-sm px-4">Save</Button>
                                                )}
                                                <Button color="secondary" type="button" className="btn-sm px-4" onClick={() => history(-1)}>{isView ? "Back" : "Cancel"}</Button>
                                            </Col>
                                        </Row>

                                    </Form>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {/* Existing JVs for selected Transaction Date + Transaction Account */}
                    {validation.values.trnAccountId && (
                        <Row>
                            <Col lg={12}>
                                <Card className="shadow-none border">
                                    <CardHeader className="bg-light-subtle d-flex align-items-center justify-content-between">
                                        <h5 className="card-title mb-0">Existing Transactions</h5>
                                        {relatedLoading && <Spinner size="sm" color="primary" />}
                                    </CardHeader>
                                    <CardBody className="p-0">
                                        <div className="table-responsive">
                                            <Table className="table table-bordered table-nowrap align-middle mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th style={{ width: "90px" }}>Action</th>
                                                        <th>Date</th>
                                                        <th>Type</th>
                                                        <th>Debit Account</th>
                                                        <th>Credit Account</th>
                                                        <th className="text-end">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {!relatedLoading && relatedJvs.length === 0 && (
                                                        <tr>
                                                            <td colSpan="6" className="text-center text-muted py-3">
                                                                No transactions found for selected date and account.
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {relatedJvs.map((row, idx) => {
                                                        const dateVal = row.jvDate || row.JvDate;
                                                        const vType = row.vType || row.VType || "";
                                                        const drName = row.drAccountName || row.DrAccountName || "-";
                                                        const crName = row.crAccountName || row.CrAccountName || "-";
                                                        const amount = row.amount ?? row.Amount ?? 0;
                                                        const rowGCode = row.gCode || row.GCode || row.g_code;
                                                        const key = row.jvCode || row.JvCode || rowGCode || idx;
                                                        return (
                                                            <tr key={key}>
                                                                <td>
                                                                    <div className="d-flex align-items-center gap-1">
                                                                        {rowGCode && (
                                                                            <Link
                                                                                to={`/purchases/expense/edit/${rowGCode}`}
                                                                                className="btn btn-sm btn-soft-info"
                                                                                title="Edit"
                                                                            >
                                                                                <i className="ri-pencil-fill" />
                                                                            </Link>
                                                                        )}
                                                                        {rowGCode && (
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-soft-danger"
                                                                                onClick={() => onClickDelete(row)}
                                                                                title="Delete"
                                                                            >
                                                                                <i className="ri-delete-bin-fill" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>{dateVal ? moment(dateVal).format("DD/MM/YYYY") : "-"}</td>
                                                                <td>
                                                                    <span className={`badge ${String(vType).toLowerCase() === "income" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>
                                                                        {vType || "-"}
                                                                    </span>
                                                                </td>
                                                                <td>{drName}</td>
                                                                <td>{crName}</td>
                                                                <td className="text-end">{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}
                </Container>
            </div>
        </React.Fragment>
    );
};

export default ExpenseCreate;
