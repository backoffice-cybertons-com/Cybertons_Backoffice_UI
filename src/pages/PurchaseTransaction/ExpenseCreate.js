import React, { useEffect, useState, useMemo, useCallback } from "react";
import moment from "moment";
import {
    CardBody, Row, Col, Card, Container, Form, Input, Label, Button, CardHeader, Table, Spinner
} from "reactstrap";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getAccounts, addNewDirectJournal, getDirectJournals } from "../../helpers/fakebackend_helper";
import { getSelectedFiscalYearId } from "../../utils/fiscalYearStorage";
import { formatToTwoDecimals } from "../../utils/numberUtils";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import secureStorage from "../../utils/secureStorage";

const api = new APIClient();

const fmtMoney = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const balanceLabel = (bal) => {
    if (bal === null || bal === undefined) return "";
    const abs = Math.abs(bal);
    return `${fmtMoney(abs)} ${bal >= 0 ? "Dr" : "Cr"}`;
};

const balClass = (bal) => {
    if (bal === null || bal === undefined) return "";
    return bal >= 0 ? "text-success" : "text-danger";
};

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
    const [ledgerData, setLedgerData] = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerFromDate, setLedgerFromDate] = useState(() => moment().subtract(5, "days").toDate());
    const [ledgerToDate, setLedgerToDate] = useState(() => new Date());

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

    const fetchMainAccountLedger = useCallback(async (fromDateValue, toDateValue, accountCode) => {
        if (!fromDateValue || !toDateValue || !accountCode) {
            setLedgerData(null);
            return;
        }
        try {
            setLedgerLoading(true);
            const fromDate = moment(fromDateValue).format("YYYY-MM-DD");
            const toDate = moment(toDateValue).format("YYYY-MM-DD");
            const companyId = secureStorage.getPlain("companyId") || 10001;
            const response = await api.get(url.GET_LEDGER_REPORT, {
                companyId,
                accountCode,
                fromDate,
                toDate,
            });
            setLedgerData(response || null);
        } catch (e) {
            console.error("Failed to fetch main account ledger:", e);
            setLedgerData(null);
        } finally {
            setLedgerLoading(false);
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
                    await fetchMainAccountLedger(ledgerFromDate, ledgerToDate, values.mainAccountId);
                } else {
                    toast.error("Failed to save transaction");
                }
            } catch (error) {
                toast.error("Error saving transaction");
            }
        }
    });

    // Load main account ledger when From/To filter or Main Account change
    useEffect(() => {
        fetchMainAccountLedger(ledgerFromDate, ledgerToDate, validation.values.mainAccountId);
    }, [ledgerFromDate, ledgerToDate, validation.values.mainAccountId, fetchMainAccountLedger]);

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

    const getVchLink = (item) => {
        if (!item || !item.vType) return "#";
        const vt = String(item.vType).toUpperCase();
        const vchId = item.vCode || item.id;
        if (!vchId || vchId === 0) return "#";
        if (vt === "SALES" || vt === "SALE") return `/sales-order/edit/${vchId}?view=true`;
        if (vt === "PURCHASE") return `/purchase-transaction/edit/${vchId}?view=true`;
        if (vt === "PAYMENT" || vt === "RECEIPT") return `/payment-receipt/edit/${vchId}?view=true`;
        if (vt === "INCOME" || vt === "EXPENSE") return `/purchases/expense/edit/${vchId}?view=true`;
        return "#";
    };

    const mainAccountLabel = mainAccounts.find(a => a.value === validation.values.mainAccountId)?.label || "Main Account";
    const ledgerEntries = ledgerData?.entries || ledgerData?.Entries || [];
    const openingBalance = ledgerData?.openingBalance ?? ledgerData?.OpeningBalance ?? 0;
    const closingBalance = ledgerData?.closingBalance ?? ledgerData?.ClosingBalance ?? 0;
    const totalDr = ledgerEntries.reduce((sum, e) => sum + Number(e.debit ?? e.Debit ?? 0), 0);
    const totalCr = ledgerEntries.reduce((sum, e) => sum + Number(e.credit ?? e.Credit ?? 0), 0);

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={isView ? "View Income & Expenses" : isEdit ? "Edit Income & Expenses" : "Add Income & Expenses"} pageTitle="Income/Expense" />

                    <Row>
                        <Col lg={12}>
                            <Card className="shadow-none border">
                                <CardHeader className="bg-light-subtle d-flex align-items-center flex-wrap gap-2 py-2">
                                    <h5 className="card-title mb-0 me-2">Transaction Detail</h5>
                                    {validation.submitCount > 0 && (validation.errors.mainAccountId || validation.errors.trnAccountId) && (
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            {validation.errors.mainAccountId && (
                                                <small className="text-danger fw-semibold text-nowrap">
                                                    <i className="ri-error-warning-line me-1 align-middle" />
                                                    {validation.errors.mainAccountId}
                                                </small>
                                            )}
                                            {validation.errors.trnAccountId && (
                                                <small className="text-danger fw-semibold text-nowrap">
                                                    <i className="ri-error-warning-line me-1 align-middle" />
                                                    {validation.errors.trnAccountId}
                                                </small>
                                            )}
                                        </div>
                                    )}
                                    <div className="d-flex align-items-center gap-2 ms-auto flex-wrap">
                                        <div className="d-flex align-items-center gap-2 bg-white border rounded px-2 py-1">
                                            <Label className="text-muted text-uppercase fw-semibold mb-0 text-nowrap" style={{ fontSize: '11px' }}>
                                                <i className="ri-calendar-line me-1 align-middle" />From Date
                                            </Label>
                                            <Flatpickr
                                                className="form-control form-control-sm"
                                                style={{ width: 130, height: 28, paddingTop: 2, paddingBottom: 2 }}
                                                options={{ dateFormat: "d/m/Y" }}
                                                value={ledgerFromDate}
                                                onChange={(d) => d[0] && setLedgerFromDate(d[0])}
                                            />
                                        </div>
                                        <span className="text-muted fw-semibold">—</span>
                                        <div className="d-flex align-items-center gap-2 bg-white border rounded px-2 py-1">
                                            <Label className="text-muted text-uppercase fw-semibold mb-0 text-nowrap" style={{ fontSize: '11px' }}>
                                                <i className="ri-calendar-check-line me-1 align-middle" />To Date
                                            </Label>
                                            <Flatpickr
                                                className="form-control form-control-sm"
                                                style={{ width: 130, height: 28, paddingTop: 2, paddingBottom: 2 }}
                                                options={{ dateFormat: "d/m/Y" }}
                                                value={ledgerToDate}
                                                onChange={(d) => d[0] && setLedgerToDate(d[0])}
                                            />
                                        </div>
                                    </div>
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

                    {/* Main Account Ledger for From–To filter range */}
                    {validation.values.mainAccountId && (
                        <Row>
                            <Col lg={12}>
                                <Card className="shadow-none border">
                                    <CardHeader className="bg-light-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
                                        <div>
                                            <h5 className="card-title mb-0">Ledger — {mainAccountLabel}</h5>
                                            <div className="text-muted fs-12 mt-1">
                                                {moment(ledgerFromDate).format("DD/MM/YYYY")}
                                                {" to "}
                                                {moment(ledgerToDate).format("DD/MM/YYYY")}
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="text-end">
                                                <div className="fs-11 text-muted text-uppercase">Opening</div>
                                                <div className="fw-semibold">{balanceLabel(openingBalance)}</div>
                                            </div>
                                            <div className="text-end border-start ps-3">
                                                <div className="fs-11 text-muted text-uppercase">Closing</div>
                                                <div className={`fw-semibold ${balClass(closingBalance)}`}>{balanceLabel(closingBalance)}</div>
                                            </div>
                                            {ledgerLoading && <Spinner size="sm" color="primary" />}
                                        </div>
                                    </CardHeader>
                                    <CardBody className="p-0">
                                        <div className="table-responsive" style={{ maxHeight: 420, overflowY: "auto" }}>
                                            <Table className="table table-hover table-nowrap align-middle mb-0">
                                                <thead className="table-light text-uppercase fs-11" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Type</th>
                                                        <th>No</th>
                                                        <th>Particulars</th>
                                                        <th className="text-end">Debit (Dr)</th>
                                                        <th className="text-end">Credit (Cr)</th>
                                                        <th className="text-end">Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="fs-12">
                                                    {!ledgerLoading && ledgerEntries.length === 0 && (
                                                        <tr>
                                                            <td colSpan="7" className="text-center text-muted py-3">
                                                                No ledger entries for selected main account and date range.
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {ledgerEntries.map((e, i) => {
                                                        const debit = Number(e.debit ?? e.Debit ?? 0);
                                                        const credit = Number(e.credit ?? e.Credit ?? 0);
                                                        const balance = e.balance ?? e.Balance;
                                                        const vType = e.vType || e.VType || "";
                                                        const vCode = e.vCode ?? e.VCode ?? "";
                                                        const link = getVchLink(e);
                                                        return (
                                                            <tr key={e.id || e.Id || `${vCode}-${i}`}>
                                                                <td>{moment(e.jvDate || e.JvDate).format("DD/MM/YYYY")}</td>
                                                                <td>
                                                                    {link !== "#" ? (
                                                                        <Link to={link} className="badge bg-info-subtle text-info">{vType || "-"}</Link>
                                                                    ) : (
                                                                        <span className="badge bg-secondary-subtle text-secondary">{vType || "-"}</span>
                                                                    )}
                                                                </td>
                                                                <td>{vCode || "-"}</td>
                                                                <td className="text-wrap">{e.description || e.Description || "-"}</td>
                                                                <td className="text-end text-success">{debit > 0 ? fmtMoney(debit) : "-"}</td>
                                                                <td className="text-end text-danger">{credit > 0 ? fmtMoney(credit) : "-"}</td>
                                                                <td className={`text-end fw-semibold ${balClass(balance)}`}>{balanceLabel(balance)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </Table>
                                        </div>
                                        {ledgerData && (
                                            <div className="border-top bg-light bg-opacity-50 px-3 py-2">
                                                <Row className="g-2 align-items-center">
                                                    <Col md={4} className="text-md-end">
                                                        <span className="text-muted text-uppercase fs-11 fw-semibold me-2">Total Debit</span>
                                                        <span className="fw-bold text-success">{fmtMoney(totalDr)}</span>
                                                    </Col>
                                                    <Col md={4} className="text-md-end">
                                                        <span className="text-muted text-uppercase fs-11 fw-semibold me-2">Total Credit</span>
                                                        <span className="fw-bold text-danger">{fmtMoney(totalCr)}</span>
                                                    </Col>
                                                    <Col md={4} className="text-md-end">
                                                        <span className="text-muted text-uppercase fs-11 fw-semibold me-2">Closing</span>
                                                        <span className={`fw-bold ${balClass(closingBalance)}`}>{balanceLabel(closingBalance)}</span>
                                                    </Col>
                                                </Row>
                                            </div>
                                        )}
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
