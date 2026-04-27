import React, { useEffect, useState, useMemo, useCallback } from "react";
import moment from "moment";
import {
    CardBody, Row, Col, Card, Container, Form, Input, Label, Table, Button, Badge, CardHeader
} from "reactstrap";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import {
    addNewPaymentReceipt as onAddNewPaymentReceipt,
    updatePaymentReceipt as onUpdatePaymentReceipt,
    getPendingInvoices as onGetPendingInvoices
} from "../../slices/thunks";
import { resetPaymentReceiptCreated } from "../../slices/paymentReceipt/reducer";
import { getVendors, getPartyCustomers, getAccounts, getPaymentReceiptDetails } from "../../helpers/fakebackend_helper";
import { getSelectedFiscalYearId } from "../../utils/fiscalYearStorage";
import { toast, ToastContainer } from 'react-toastify';
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";

const api = new APIClient();

const PaymentReceiptCreate = () => {
    const dispatch = useDispatch();
    const history = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isView = queryParams.get('view') === 'true';
    const isEdit = !!id;

    const { isPaymentReceiptCreated, pendingInvoices: apiPendingInvoices } = useSelector(state => state.PaymentReceipt);

    const [parties, setParties] = useState([]);
    const [banks, setBanks] = useState([]);
    const [vchType, setVchType] = useState("RECEIPT"); 
    
    // Search thresholds
    const [mainSearch, setMainSearch] = useState("");
    const [trnSearch, setTrnSearch] = useState("");
    const [showInvoices, setShowInvoices] = useState(false);
    const [editAllocations, setEditAllocations] = useState([]);

    const today = useMemo(() => new Date(), []);

    useEffect(() => {
        dispatch(resetPaymentReceiptCreated());

        const fetchInitialData = async () => {
            try {
                // 1. Fetch Accounts & Parties combined
                const [bankRes, partyRes] = await Promise.all([getAccounts(), api.get(url.GET_PARTIES)]);
                
                const extractData = (res) => Array.isArray(res) ? res : (res?.data || []);
                const bankData = extractData(bankRes);
                const partyData = extractData(partyRes);
                
                const combined = [
                    ...bankData.map(b => ({
                        label: b.DisplayName || b.displayName || b.partyName || b.name || "Unknown Account",
                        value: b.AccountCode || b.PartyId || b.partyId || b.id
                    })),
                    ...partyData.map(p => ({
                        label: p.displayName || p.DisplayName || p.partyName || p.PartyName,
                        value: p.partyId || p.PartyId || p.id
                    }))
                ];
                
                const uniqueBanks = Array.from(new Map(combined.map(item => [item.value, item])).values());
                setBanks(uniqueBanks);


                // 2. Load Edit Data if applicable
                if (isEdit) {
                    const rawData = await getPaymentReceiptDetails(id);
                    // Ensure it is an array
                    const editDataArr = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);
                    
                    if (editDataArr.length > 0) {
                        const primary = editDataArr[0];
                        setVchType(primary.vchType || "RECEIPT");
                        
                        // Sum up total amount from all allocations
                        const totalAmount = editDataArr.reduce((sum, item) => sum + (item.amount || 0), 0);
                        
                        setEditAllocations(editDataArr);

                        validation.setValues({
                           ...primary,
                           amount: totalAmount,
                           lines: [],  // reset lines — pending invoices load via dispatch below
                           receivedDr: primary.vchType === "RECEIPT" ? totalAmount : 0,
                           paidCr: primary.vchType === "PAYMENT" ? totalAmount : 0,
                           date: new Date(primary.date || today)
                        });
                        dispatch(onGetPendingInvoices({ 
                            partyId: primary.partyId, 
                            trnType: (primary.vchType === "RECEIPT" ? "Sales" : "Purchase") 
                        }));
                        setShowInvoices(true);
                    }
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
                alert("Error fetching transaction data: " + error);
            }
        };
        fetchInitialData();
    }, [id, isEdit, dispatch]);

    // Load ALL accounts for Transaction Account dropdown (no party type filter)
    useEffect(() => {
        const fetchParties = async () => {
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
                setParties(uniqueTrn);
            } catch (e) {
                console.error("Failed to fetch accounts:", e);
            }
        };
        fetchParties();
    }, []);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues: {
            date: today,
            partyId: "",
            accountId: "",
            receivedDr: "0.00",
            paidCr: "0.00",
            amount: "0.00", // Hidden total amount
            invCode: null,
            discountAmount: "0.00",
            disc: "",
            lines: [],
            autoAdjust: false
        },
        validationSchema: Yup.object({
            partyId: Yup.mixed().required("Party is required"),
            accountId: Yup.mixed().required("Main Account is required"),
        }),
        onSubmit: async (values) => {
            const fiscalYearId = getSelectedFiscalYearId();
            const actualAmount = values.receivedDr > 0 ? values.receivedDr : values.paidCr;
            
            // Strict Validation: Total Allocated must equal the entered amount
            const currentAllocated = values.lines.reduce((s, l) => s + (parseFloat(l.allocatedAmount) || 0), 0);
            if (Math.abs(currentAllocated - parseFloat(actualAmount)) > 0.01) {
                toast.error(`Total allocated (${currentAllocated.toFixed(2)}) must exactly match the ${vchType === "RECEIPT" ? "Received" : "Paid"} amount (${actualAmount})`);
                return;
            }

            // Map allocations to entities
            const entities = values.lines.filter(l => l.allocatedAmount > 0 || l.discountAmount > 0).map(l => ({
                date: values.date,
                partyId: values.partyId,
                accountId: values.accountId,
                amount: l.allocatedAmount,
                discountAmount: l.discountAmount,
                invCode: l.inv_code,
                vchType: vchType,
                disc: values.disc,
                yearCode: fiscalYearId,
                branchCode: 1, 
                gCode: isEdit ? values.gCode : ""
            }));

            if (entities.length === 0) {
                entities.push({
                    date: values.date,
                    partyId: values.partyId,
                    accountId: values.accountId,
                    amount: actualAmount,
                    discountAmount: 0,
                    invCode: null,
                    vchType: vchType,
                    disc: values.disc,
                    yearCode: fiscalYearId,
                    branchCode: 1,
                    gCode: isEdit ? values.gCode : ""
                });
            }

            if (isEdit) {
                dispatch(onUpdatePaymentReceipt(entities));
            } else {
                dispatch(onAddNewPaymentReceipt(entities));
            }
        }
    });

    useEffect(() => {
        if (isPaymentReceiptCreated) {
            toast.success("Transaction saved successfully!");
            history("/payment-receipt");
        }
    }, [isPaymentReceiptCreated, history]);

    // Auto-detect vchType logic
    const handleReceivedChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        validation.setFieldValue("receivedDr", val);
        if (val > 0) {
            setVchType("RECEIPT");
            validation.setFieldValue("paidCr", 0);
            validation.setFieldValue("amount", val);
        }
    };

    const handlePaidChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        validation.setFieldValue("paidCr", val);
        if (val > 0) {
            setVchType("PAYMENT");
            validation.setFieldValue("receivedDr", 0);
            validation.setFieldValue("amount", val);
        }
    };

    // Handle Party Change
    const handlePartyChange = (opt) => {
        validation.setFieldValue("partyId", opt ? opt.value : "");
        setShowInvoices(false);
        validation.setFieldValue("lines", []);
    };

    const toggleInvoices = () => {
        if (!showInvoices) {
            if (!validation.values.partyId) {
                toast.warning("Please select a Transaction Account first.");
                return;
            }
            if (!validation.values.amount || validation.values.amount <= 0) {
                toast.warning("Please enter an amount.");
                return;
            }
            dispatch(onGetPendingInvoices({ 
                partyId: validation.values.partyId, 
                trnType: (vchType === "RECEIPT" ? "Sales" : "Purchase") 
            }));
        }
        setShowInvoices(!showInvoices);
    };

    useEffect(() => {
        if (apiPendingInvoices && apiPendingInvoices.length > 0) {
            const lines = apiPendingInvoices.map(inv => {
                let allocated = 0;
                let discAmt = 0;

                // When editing, find if this invoice has an allocation in the fetched data
                if (isEdit && editAllocations.length > 0) {
                    const match = editAllocations.find(a => a.invCode === inv.inv_code || a.InvCode === inv.inv_code);
                    if (match) {
                        allocated = match.amount || 0;
                        discAmt = match.discountAmount || match.DiscountAmount || 0;
                    }
                }

                return {
                    ...inv,
                    allocatedAmount: allocated,
                    discountAmount: discAmt,
                    balance: inv.pending_amount - (allocated + discAmt),
                    carats: inv.carats || 0,
                    invCur: inv.currency || "INR"
                };
            });
            validation.setFieldValue("lines", lines);
        }
    }, [apiPendingInvoices, isEdit, editAllocations]);

    const handleAllocationChange = (index, field, value) => {
        const lines = [...validation.values.lines];
        const val = parseFloat(value) || 0;
        
        // Ensure total allocated across all lines doesn't exceed total amount
        const otherLinesTotal = lines.reduce((s, l, i) => i === index ? s : s + (parseFloat(l.allocatedAmount) || 0), 0);
        const maxAllowed = parseFloat(validation.values.amount) - otherLinesTotal;
        
        if (field === "allocatedAmount" && val > maxAllowed) {
            toast.warning(`Cannot exceed total amount of ${validation.values.amount}`);
            lines[index][field] = maxAllowed;
        } else {
            lines[index][field] = val;
        }
        
        const inv = lines[index];
        lines[index].balance = inv.pending_amount - (lines[index].allocatedAmount + inv.discountAmount);
        
        validation.setFieldValue("lines", lines);
    };

    const autoAllocate = () => {
        let remaining = parseFloat(validation.values.amount) || 0;
        const lines = validation.values.lines.map(line => {
            const toAllocate = Math.min(remaining, line.pending_amount);
            remaining -= toAllocate;
            return {
                ...line,
                allocatedAmount: toAllocate,
                balance: line.pending_amount - toAllocate
            };
        });
        validation.setFieldValue("lines", lines);
    };

    const totalBillAmount    = useMemo(() => (validation.values.lines || []).reduce((s, l) => s + (l.total_amount || 0), 0),    [validation.values.lines]);
    const totalPendingAmount  = useMemo(() => (validation.values.lines || []).reduce((s, l) => s + (l.pending_amount || 0), 0),  [validation.values.lines]);
    const totalAllocated      = useMemo(() => (validation.values.lines || []).reduce((s, l) => s + (l.allocatedAmount || 0), 0), [validation.values.lines]);

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={isView ? "View Payment & Receipts" : "Add Payment & Receipts"} pageTitle="Payment" />
                    <Row>
                        <Col lg={12}>
                            <Card className="shadow-none border">
                                <CardHeader className="bg-light-subtle">
                                    <h5 className="card-title mb-0">Transaction Detail</h5>
                                </CardHeader>
                                <CardBody>
                                    <Form onSubmit={validation.handleSubmit}>
                                        <Row className="mb-3">
                                            <Col md={12}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Main Account</Label>
                                                <Select 
                                                    isDisabled={isView}
                                                    options={mainSearch.length >= 2 ? banks : []} 
                                                    placeholder="Select Account"
                                                    value={banks.find(b => b.value === validation.values.accountId)} 
                                                    onChange={opt => validation.setFieldValue("accountId", opt?.value)}
                                                    onInputChange={(val) => setMainSearch(val)}
                                                    noOptionsMessage={() => mainSearch.length < 2 ? "Please enter 2 or more characters" : "No results found"}
                                                />
                                                {validation.errors.accountId && <small className="text-danger">{validation.errors.accountId}</small>}
                                            </Col>

                                        </Row>

                                        <Row className="mb-4 align-items-start">
                                            <Col md={3}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Transaction Date</Label>
                                                <Flatpickr className="form-control" options={{ dateFormat: "d/m/Y", clickOpens: !isView }} value={validation.values.date} onChange={d => !isView && validation.setFieldValue("date", d[0])} />
                                            </Col>
                                            <Col md={3}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Transaction Account</Label>
                                                <Select 
                                                    isDisabled={isView}
                                                    options={trnSearch.length >= 2 ? parties : []} 
                                                    placeholder="Search Account"
                                                    value={parties.find(p => p.value === validation.values.partyId)} 
                                                    onChange={handlePartyChange}
                                                    onInputChange={(val) => setTrnSearch(val)}
                                                    noOptionsMessage={() => trnSearch.length < 2 ? "Please enter 2 or more characters" : "No results found"}
                                                />
                                                {validation.errors.partyId && <small className="text-danger">{validation.errors.partyId}</small>}
                                            </Col>

                                            <Col md={2}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Received [DR.]</Label>
                                                <Input 
                                                    type="number" 
                                                    step="any"
                                                    placeholder="0.00" 
                                                    value={validation.values.receivedDr} 
                                                    onChange={handleReceivedChange} 
                                                    onBlur={(e) => {
                                                        const val = formatToTwoDecimals(e.target.value);
                                                        validation.setFieldValue("receivedDr", val);
                                                        validation.setFieldValue("amount", val);
                                                    }}
                                                    disabled={isView} 
                                                />
                                            </Col>
                                            <Col md={2}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Paid [CR.]</Label>
                                                <Input 
                                                    type="number" 
                                                    step="any"
                                                    placeholder="0.00" 
                                                    value={validation.values.paidCr} 
                                                    onChange={handlePaidChange} 
                                                    onBlur={(e) => {
                                                        const val = formatToTwoDecimals(e.target.value);
                                                        validation.setFieldValue("paidCr", val);
                                                        validation.setFieldValue("amount", val);
                                                    }}
                                                    disabled={isView} 
                                                />
                                            </Col>
                                            <Col md={2}>
                                                {/* Hidden or removed based on user request */}
                                            </Col>
                                        </Row>

                                        <Row className="mb-3">
                                            <Col md={4}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Description</Label>
                                                <Input type="textarea" placeholder="Description" rows="4" value={validation.values.disc} onChange={validation.handleChange} name="disc" disabled={isView} />
                                            </Col>
                                            <Col md={8} className="d-flex align-items-end gap-2 pb-1">
                                                <div className="form-check mb-2">
                                                    <Input className="form-check-input" type="checkbox" id="autoAdjust" checked={validation.values.autoAdjust} disabled={isView} onChange={e => {
                                                        validation.setFieldValue("autoAdjust", e.target.checked);
                                                        if(e.target.checked) autoAllocate();
                                                    }} />
                                                    <Label className="form-check-label" htmlFor="autoAdjust">Auto Adjust</Label>
                                                </div>
                                                {!isView && <Button color="primary" type="button" className="btn-sm px-3" onClick={toggleInvoices}>{showInvoices ? "Close Invoice" : "On Invoice"}</Button>}
                                                {!isView ? (
                                                    <Button color="primary" type="submit" className="btn-sm px-4">Save</Button>
                                                ) : (
                                                    <Button color="secondary" type="button" className="btn-sm px-4" onClick={() => history(-1)}>Back</Button>
                                                )}
                                            </Col>
                                        </Row>

                                        {showInvoices && (
                                        <div className="table-responsive border-top pt-3">
                                            <Table className="table-sm table-bordered align-middle mb-0 text-center" style={{ fontSize: '12px' }}>
                                                <thead>
                                                    <tr className="bg-light">
                                                        <th colSpan="4"></th>
                                                        <th className="text-info text-end">Total:</th>
                                                        <th></th>
                                                        <th></th>
                                                        <th className="text-primary">{totalAllocated.toFixed(2)}</th>
                                                        <th className="text-primary">{(validation.values.lines || []).reduce((s, l) => s + (l.paid_amount || 0), 0).toFixed(2)}</th>
                                                        <th className="text-primary">{totalPendingAmount.toFixed(2)}</th>
                                                    </tr>
                                                    <tr className="table-light text-uppercase" style={{ fontSize: '10px' }}>
                                                        <th>Date</th>
                                                        <th>InvCode</th>
                                                        <th>InvType</th>
                                                        <th>DueDate</th>
                                                        <th>tot_sku_in_invoice</th>
                                                        <th>BillNo</th>
                                                        <th>InvNo</th>
                                                        <th className="bg-success-subtle">FinalPayRecAmount</th>
                                                        <th>InvoicePaidAmount</th>
                                                        <th>InvoiceRemainAmount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {validation.values.lines.length > 0 ? (
                                                        validation.values.lines.map((line, idx) => (
                                                            <tr key={idx}>
                                                                <td>{line.inv_date ? moment(line.inv_date).format("DD-MMM-YYYY") : '-'}</td>
                                                                <td>{line.inv_code}</td>
                                                                <td>{line.inv_type}</td>
                                                                <td>{line.due_date ? moment(line.due_date).format("DD-MMM-YYYY") : '-'}</td>
                                                                <td>{line.tot_sku_in_invoice}</td>
                                                                <td>{line.bill_id || line.bill_no || '-'}</td>
                                                                <td>{line.inv_no}</td>
                                                                <td className="bg-success-subtle">
                                                                    <Input 
                                                                        type="number" 
                                                                        step="any"
                                                                        className="form-control-sm text-center border-0 bg-transparent fw-bold" 
                                                                        value={line.allocatedAmount} 
                                                                        disabled={isView}
                                                                        onChange={e => handleAllocationChange(idx, "allocatedAmount", e.target.value)} 
                                                                        onBlur={e => handleAllocationChange(idx, "allocatedAmount", formatToTwoDecimals(e.target.value))}
                                                                    />
                                                                </td>
                                                                <td>{(line.paid_amount || 0).toLocaleString()}</td>
                                                                <td className={`fw-bold ${line.balance > 0 ? 'text-danger' : 'text-success'}`}>
                                                                    {(line.balance || 0).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="10" className="py-4 text-muted">No pending invoices available</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                        )}
                                    </Form>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    <ToastContainer />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default PaymentReceiptCreate;
