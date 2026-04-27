import React, { useEffect, useState, useMemo } from "react";
import moment from "moment";
import {
    CardBody, Row, Col, Card, Container, Form, Input, Label, Button, CardHeader
} from "reactstrap";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getAccounts, addNewDirectJournal, getDirectJournals } from "../../helpers/fakebackend_helper";
import { getSelectedFiscalYearId } from "../../utils/fiscalYearStorage";
import { formatToTwoDecimals } from "../../utils/numberUtils";
import { toast, ToastContainer } from 'react-toastify';
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

    const today = useMemo(() => new Date(), []);

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
            const actualAmount = values.receivedDr > 0 ? values.receivedDr : values.paidCr;
            const finalVType = values.receivedDr > 0 ? "Income" : "Expense";
            
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
                    history("/purchases/expense");
                } else {
                    toast.error("Failed to save transaction");
                }
            } catch (error) {
                toast.error("Error saving transaction");
            }
        }
    });

    const handleReceivedChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        validation.setFieldValue("receivedDr", Math.abs(val));
        if (Math.abs(val) > 0) {
            setVchType("Income");
            validation.setFieldValue("paidCr", 0);
        }
    };

    const handlePaidChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        validation.setFieldValue("paidCr", Math.abs(val));
        if (Math.abs(val) > 0) {
            setVchType("Expense");
            validation.setFieldValue("receivedDr", 0);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
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
                                                    type="number" 
                                                    min="0" 
                                                    step="any"
                                                    placeholder="0.00"
                                                    value={validation.values.receivedDr} 
                                                    onChange={handleReceivedChange} 
                                                    onBlur={(e) => validation.setFieldValue("receivedDr", formatToTwoDecimals(e.target.value))}
                                                    disabled={isView || validation.values.paidCr > 0} 
                                                    className="w-100 text-center no-spin-input" 
                                                />
                                            </Col>

                                            <Col md={2}>
                                                <Label className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>Paid [Cr.]</Label>
                                                <Input 
                                                    type="number" 
                                                    min="0" 
                                                    step="any"
                                                    placeholder="0.00"
                                                    value={validation.values.paidCr} 
                                                    onChange={handlePaidChange} 
                                                    onBlur={(e) => validation.setFieldValue("paidCr", formatToTwoDecimals(e.target.value))}
                                                    disabled={isView || validation.values.receivedDr > 0} 
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
                    <ToastContainer />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default ExpenseCreate;
