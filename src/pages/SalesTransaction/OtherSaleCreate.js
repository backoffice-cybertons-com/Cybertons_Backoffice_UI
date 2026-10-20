import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
    CardBody, Row, Col, Card, Container, Form, Input, Label, Table, Button,
} from "reactstrap";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import { formatToFourDecimals, formatToTwoDecimals } from "../../utils/numberUtils";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";
import secureStorage from "../../utils/secureStorage";
import { useDispatch, useSelector } from "react-redux";
import {
    addNewSalesTransaction as onAddNewSalesTransaction,
    updateSalesTransaction as onUpdateSalesTransaction,
} from "../../slices/thunks";
import { resetSalesTransactionCreated } from "../../slices/salesTransaction/reducer";
import { getPartyCustomers, getPartyDetails, getPartyOutstanding, getSalesTransactionDetails, getSalesTransactions } from "../../helpers/fakebackend_helper";
import { getSelectedFiscalYearId } from "../../utils/fiscalYearStorage";
import { validateCustomerSalesLimits, showSalesLimitBlockedToast } from "../../utils/customerSalesLimitValidation";

const OTHER_SALE_CATEGORY = "other_sale";

const isOtherSaleRecord = (order) => {
    const category = (order.invCategory || order.InvCategory || "").toString().trim().toLowerCase();
    return category === OTHER_SALE_CATEGORY;
};

const isSalesRecord = (order) => {
    const invType = (order.invType || order.InvType || "").toString().trim().toLowerCase();
    return !invType || invType === "sales";
};

const createEmptyLine = (spUniqueCode = 0) => ({
    spUniqueCode,
    productCode: "",
    description: "",
    quantity: 1,
    rate: "0.00",
    amount: "0.00",
    cgstPercent: "0.00",
    cgstAmount: "0.00",
    sgstPercent: "0.00",
    sgstAmount: "0.00",
    igstPercent: "0.00",
    igstAmount: "0.00",
    totalAmount: "0.00",
});

const OtherSaleCreate = () => {
    const dispatch = useDispatch();
    const history = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isView = queryParams.get("view") === "true";
    const isEdit = !!id;

    const { isSalesTransactionCreated } = useSelector((state) => state.SalesTransaction);

    const [customers, setCustomers] = useState([]);
    const [allSalesOrders, setAllSalesOrders] = useState([]);
    const [touchedSelects, setTouchedSelects] = useState({});
    const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
    const [discountType, setDiscountType] = useState("percent");
    const itemTableScrollRef = useRef(null);

    const today = useMemo(() => new Date(), []);

    useEffect(() => {
        dispatch(resetSalesTransactionCreated());

        const fetchInitialData = async () => {
            try {
                const [customerDataRaw, allSOs] = await Promise.all([
                    getPartyCustomers(),
                    getSalesTransactions(),
                ]);
                const allSOData = Array.isArray(allSOs) ? allSOs : (allSOs?.data || []);
                if (Array.isArray(allSOData)) setAllSalesOrders(allSOData);

                const customerData = Array.isArray(customerDataRaw) ? customerDataRaw
                    : (customerDataRaw?.data && Array.isArray(customerDataRaw.data)) ? customerDataRaw.data
                        : [];
                if (Array.isArray(customerData)) {
                    setCustomers(customerData
                        .filter((v) => {
                            const active = v.isActive ?? v.IsActive;
                            return active !== false && active !== 0 && active !== "false";
                        })
                        .map((v) => ({
                        label: v.displayName || v.DisplayName || v.name || v.Name,
                        value: v.partyId || v.PartyId,
                    })));
                }

                if (isEdit) {
                    const editData = await getSalesTransactionDetails(id);
                    if (editData?.header) {
                        const header = editData.header;
                        const category = (header.invCategory || header.InvCategory || "").toLowerCase();
                        if (category && category !== OTHER_SALE_CATEGORY) {
                            history(`/sales-order/edit/${id}${isView ? "?view=true" : ""}`);
                            return;
                        }

                        const parseDate = (val) => {
                            if (!val) return null;
                            const d = new Date(val);
                            return isNaN(d.getTime()) ? null : d;
                        };

                        validation.setValues({
                            ...initialValues,
                            ...header,
                            invCategory: OTHER_SALE_CATEGORY,
                            invDate: parseDate(header.invDate || header.InvDate) || today,
                            totDiscount: parseFloat(header.totDiscount ?? header.TotDiscount ?? 0),
                            discountPercent: (() => {
                                const dp = parseFloat(header.discountPercent ?? header.DiscountPercent ?? 0);
                                if (dp === 0) {
                                    const ta = parseFloat(header.taxableAmount ?? header.TaxableAmount ?? 0);
                                    const td = parseFloat(header.totDiscount ?? header.TotDiscount ?? 0);
                                    if (ta > 0 && td > 0) return parseFloat(((td / ta) * 100).toFixed(2));
                                }
                                return dp;
                            })(),
                            roundOff: parseFloat(header.roundOff ?? header.RoundOff ?? 0),
                            lines: (editData.lines || []).map((l) => ({
                                spUniqueCode: l.spUniqueCode || l.SpUniqueCode || 0,
                                productCode: l.hsnCode || l.HsnCode || l.productCode || "",
                                description: l.productDetails || l.ProductDetails || l.description || "",
                                quantity: parseFloat(l.quantity ?? l.Quantity ?? 1),
                                rate: parseFloat(l.rate ?? l.Rate ?? 0),
                                amount: parseFloat(l.amount ?? l.Amount ?? 0),
                                cgstPercent: parseFloat(l.cgstPercent ?? l.CgstPercent ?? 0),
                                cgstAmount: parseFloat(l.cgstAmount ?? l.CgstAmount ?? 0),
                                sgstPercent: parseFloat(l.sgstPercent ?? l.SgstPercent ?? 0),
                                sgstAmount: parseFloat(l.sgstAmount ?? l.SgstAmount ?? 0),
                                igstPercent: parseFloat(l.igstPercent ?? l.IgstPercent ?? 0),
                                igstAmount: parseFloat(l.igstAmount ?? l.IgstAmount ?? 0),
                                totalAmount: parseFloat(l.totalAmount ?? l.TotalAmount ?? 0),
                            })),
                        });
                        handleCustomerChange({ value: header.partyId || header.PartyId });
                    }
                }
            } catch (error) {
                console.error("Error fetching other sale data:", error);
            }
        };

        fetchInitialData();
    }, [id, isEdit]); // load when edit id changes

    const initialValues = useMemo(() => ({
        companyId: parseInt(secureStorage.getPlain("companyId")) || 1,
        invType: "Sales",
        invCategory: OTHER_SALE_CATEGORY,
        invNo: "",
        invDate: today,
        partyId: "",
        billingAddress: "",
        shippingAddress: "",
        taxableAmount: "0.00",
        totDiscount: "0.00",
        discountPercent: "0.00",
        roundOff: "0.00",
        isRoundOffManual: false,
        cgstPercent: "0.00",
        cgstAmount: "0.00",
        sgstPercent: "0.00",
        sgstAmount: "0.00",
        igstPercent: "0.00",
        igstAmount: "0.00",
        grandTotal: "0.00",
        netInvoiceAmount: "0.00",
        description: "",
        totSkuInInvoice: 0,
        lines: [createEmptyLine()],
    }), [today]);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues,
        validationSchema: Yup.object({
            partyId: Yup.mixed().required("Customer Name is required").test("not-empty", "Customer Name is required", (v) => !!v && v !== ""),
            invNo: Yup.string().required("Sales Order# is required"),
            lines: Yup.array().of(
                Yup.object({
                    productCode: Yup.string().trim().required("Product ID is required"),
                    description: Yup.string().trim().required("Item Description is required"),
                    quantity: Yup.number().typeError("Must be a number").required("Quantity is required").min(0.01, "Quantity must be > 0"),
                    rate: Yup.number().typeError("Must be a number").required("Rate is required").min(0.01, "Rate must be > 0"),
                    cgstPercent: Yup.number().typeError("Must be a number").min(0, "Cannot be negative"),
                    sgstPercent: Yup.number().typeError("Must be a number").min(0, "Cannot be negative"),
                    igstPercent: Yup.number().typeError("Must be a number").min(0, "Cannot be negative"),
                })
            ),
        }),
        onSubmit: async (values) => {
            if (!isEdit) {
                const duplicate = allSalesOrders.find(
                    (po) => isSalesRecord(po) && (po.invNo || po.InvNo || "").toString().trim().toLowerCase() === values.invNo.trim().toLowerCase()
                );
                if (duplicate) {
                    validation.setFieldError("invNo", "This Sales Order# already exists. Please use a unique number.");
                    return;
                }
            }

            let party = {};
            let previousOutstanding = 0;
            if (values.partyId) {
                try {
                    const response = await getPartyDetails(values.partyId);
                    party = response.party || response.Party || {};
                } catch (limitErr) {
                    console.warn("Failed to load customer limits:", limitErr);
                }
                try {
                    const outstandingRaw = await getPartyOutstanding(values.partyId);
                    previousOutstanding = parseFloat(outstandingRaw) || 0;
                } catch (osErr) {
                    console.warn("Failed to fetch outstanding:", osErr);
                }
            }

            const limitCheck = validateCustomerSalesLimits({
                party,
                partyId: values.partyId,
                grandTotal: values.grandTotal,
                previousOutstanding,
                invDate: values.invDate,
                allSalesOrders,
                excludeSpUniqueCode: id ? parseInt(id) : 0,
                isSalesRecord,
            });
            if (!limitCheck.allowed) {
                showSalesLimitBlockedToast(limitCheck);
                return;
            }

            const { lines, ...headerValues } = values;
            const selectedFiscalYearId = getSelectedFiscalYearId();

            const formatDate = (date) => {
                if (!date) return null;
                const d = Array.isArray(date) ? date[0] : date;
                const dt = d instanceof Date ? d : new Date(d);
                if (isNaN(dt.getTime())) return null;
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, "0");
                const day = String(dt.getDate()).padStart(2, "0");
                return `${y}-${m}-${day}`;
            };

            const payload = {
                header: {
                    ...headerValues,
                    invCategory: OTHER_SALE_CATEGORY,
                    invDate: formatDate(values.invDate) || new Date(),
                    spUniqueCode: id ? parseInt(id) : 0,
                    partyId: values.partyId ? parseInt(values.partyId) : 0,
                    roundOff: parseFloat(values.roundOff) || 0,
                    totDiscount: parseFloat(values.totDiscount) || 0,
                    cgstAmount: parseFloat(values.cgstAmount) || 0,
                    sgstAmount: parseFloat(values.sgstAmount) || 0,
                    igstAmount: parseFloat(values.igstAmount) || 0,
                    companyId: values.companyId ? parseInt(values.companyId) : 1,
                    fiscalYearId: selectedFiscalYearId ?? (values.fiscalYearId ? parseInt(values.fiscalYearId) : null) ?? (values.FiscalYearId ? parseInt(values.FiscalYearId) : null),
                    branchId: values.branchId ? parseInt(values.branchId) : (values.BranchId ? parseInt(values.BranchId) : null),
                },
                lines: lines.map((line) => ({
                    spUniqueCode: id ? parseInt(id) : 0,
                    productId: null,
                    hsnCode: line.productCode || null,
                    productDetails: line.description || "",
                    quantity: line.quantity ? parseFloat(line.quantity) : 0,
                    rate: line.rate ? parseFloat(line.rate) : 0,
                    amount: line.amount ? parseFloat(line.amount) : 0,
                    cgstPercent: line.cgstPercent ? parseFloat(line.cgstPercent) : 0,
                    cgstAmount: line.cgstAmount ? parseFloat(line.cgstAmount) : 0,
                    sgstPercent: line.sgstPercent ? parseFloat(line.sgstPercent) : 0,
                    sgstAmount: line.sgstAmount ? parseFloat(line.sgstAmount) : 0,
                    igstPercent: line.igstPercent ? parseFloat(line.igstPercent) : 0,
                    igstAmount: line.igstAmount ? parseFloat(line.igstAmount) : 0,
                    totalAmount: line.totalAmount ? parseFloat(line.totalAmount) : 0,
                    discountPer: 0,
                    crt: 1,
                })),
            };

            if (isEdit) {
                dispatch(onUpdateSalesTransaction(payload));
            } else {
                dispatch(onAddNewSalesTransaction(payload));
            }
        },
    });

    const checkDuplicateInvNo = useCallback((rawInvNo) => {
        if (isEdit || isView) return;
        const invNo = String(rawInvNo || "").trim().toLowerCase();
        if (!invNo) {
            if (validation.errors.invNo && validation.errors.invNo.includes("already exists")) {
                validation.setFieldError("invNo", undefined);
            }
            return;
        }

        const duplicate = (allSalesOrders || []).find((po) => {
            if (!isSalesRecord(po)) return false;
            const poInvNo = (po.invNo || po.InvNo || "").toString().trim().toLowerCase();
            const sameCurrentRecord = id && String(po.spUniqueCode || po.SpUniqueCode || po.id || "") === String(id);
            return poInvNo === invNo && !sameCurrentRecord;
        });

        if (duplicate) {
            validation.setFieldError("invNo", "This Sales Order# already exists. Please use a unique number.");
        } else if (validation.errors.invNo && validation.errors.invNo.includes("already exists")) {
            validation.setFieldError("invNo", undefined);
        }
    }, [allSalesOrders, id, isEdit, isView, validation.errors.invNo]);

    useEffect(() => {
        if (isEdit || isView) return;
        checkDuplicateInvNo(validation.values.invNo);
    }, [validation.values.invNo, checkDuplicateInvNo, isEdit, isView]);

    useEffect(() => {
        if (isSalesTransactionCreated) {
            history("/sales-order");
        }
    }, [isSalesTransactionCreated, history]);

    const calculateTotals = useCallback((lines, overrides = {}) => {
        let taxableAmount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let lineTotalWithTax = 0;

        const updatedLines = lines.map((line) => {
            const qty = parseFloat(line.quantity) || 0;
            const rate = parseFloat(line.rate) || 0;
            const amount = qty * rate;

            const cgstP = parseFloat(line.cgstPercent) || 0;
            const sgstP = parseFloat(line.sgstPercent) || 0;
            const igstP = parseFloat(line.igstPercent) || 0;

            const lineCgst = amount * (cgstP / 100);
            const lineSgst = amount * (sgstP / 100);
            const lineIgst = amount * (igstP / 100);

            taxableAmount += amount;
            cgstAmount += lineCgst;
            sgstAmount += lineSgst;
            igstAmount += lineIgst;
            lineTotalWithTax += amount + lineCgst + lineSgst + lineIgst;

            return {
                ...line,
                amount,
                cgstAmount: lineCgst,
                sgstAmount: lineSgst,
                igstAmount: lineIgst,
                totalAmount: amount + lineCgst + lineSgst + lineIgst,
            };
        });

        const discPercentInput = overrides.hasOwnProperty("discountPercent") ? overrides.discountPercent : validation.values.discountPercent;
        const discAmountInput = overrides.hasOwnProperty("totDiscount") ? overrides.totDiscount : validation.values.totDiscount;

        let discPercent = isNaN(parseFloat(discPercentInput)) ? 0 : parseFloat(discPercentInput);
        let discAmount = isNaN(parseFloat(discAmountInput)) ? 0 : parseFloat(discAmountInput);

        const currentDiscountType = overrides.discountType || discountType;

        if (currentDiscountType === "percent") {
            if (overrides.hasOwnProperty("discountPercent")) {
                discAmount = taxableAmount * (discPercent / 100);
            } else if (!overrides.hasOwnProperty("totDiscount")) {
                discAmount = taxableAmount * (discPercent / 100);
            }
        } else if (overrides.hasOwnProperty("totDiscount")) {
            discPercent = taxableAmount > 0 ? parseFloat(((discAmount / taxableAmount) * 100).toFixed(2)) : 0;
        } else if (discAmount > 0 && taxableAmount > 0) {
            discPercent = parseFloat(((discAmount / taxableAmount) * 100).toFixed(2));
        }

        const netAmountBeforeRound = lineTotalWithTax - discAmount;
        const isManual = overrides.hasOwnProperty("isRoundOffManual") ? overrides.isRoundOffManual : validation.values.isRoundOffManual;
        const roundOffInput = overrides.hasOwnProperty("roundOff") ? overrides.roundOff : validation.values.roundOff;
        const manualVal = isNaN(parseFloat(roundOffInput)) ? 0 : parseFloat(roundOffInput);

        let finalGrandTotal;
        let finalRoundOff;

        if (isManual) {
            finalRoundOff = manualVal;
            finalGrandTotal = netAmountBeforeRound + finalRoundOff;
        } else {
            finalGrandTotal = Math.round(netAmountBeforeRound);
            finalRoundOff = finalGrandTotal - netAmountBeforeRound;
        }

        validation.setFieldValue("taxableAmount", taxableAmount);

        if (!overrides.hasOwnProperty("totDiscount")) {
            validation.setFieldValue("totDiscount", currentDiscountType === "percent" ? discAmount : discAmountInput);
        }
        if (!overrides.hasOwnProperty("discountPercent")) {
            validation.setFieldValue("discountPercent", currentDiscountType === "amount" ? discPercent : discPercentInput);
        }

        if (!isManual) {
            validation.setFieldValue("roundOff", finalRoundOff);
        } else if (!overrides.hasOwnProperty("roundOff")) {
            validation.setFieldValue("roundOff", roundOffInput);
        }

        validation.setFieldValue("isRoundOffManual", isManual);
        validation.setFieldValue("cgstAmount", cgstAmount);
        validation.setFieldValue("sgstAmount", sgstAmount);
        validation.setFieldValue("igstAmount", igstAmount);
        validation.setFieldValue("cgstPercent", taxableAmount > 0 ? (cgstAmount / taxableAmount) * 100 : 0);
        validation.setFieldValue("sgstPercent", taxableAmount > 0 ? (sgstAmount / taxableAmount) * 100 : 0);
        validation.setFieldValue("igstPercent", taxableAmount > 0 ? (igstAmount / taxableAmount) * 100 : 0);
        validation.setFieldValue("grandTotal", finalGrandTotal);
        validation.setFieldValue("netInvoiceAmount", finalGrandTotal);
        validation.setFieldValue("totSkuInInvoice", updatedLines.length);
        validation.setFieldValue("lines", updatedLines);
    }, [validation.values, validation.setFieldValue, discountType]);

    const handleAddLine = () => {
        const newLines = [...validation.values.lines, createEmptyLine(id ? parseInt(id) : 0)];
        validation.setFieldValue("lines", newLines);
        setTimeout(() => {
            if (itemTableScrollRef.current) {
                itemTableScrollRef.current.scrollTop = itemTableScrollRef.current.scrollHeight;
            }
        }, 0);
    };

    const handleRemoveLine = (index) => {
        const lines = [...validation.values.lines];
        if (lines.length <= 1) return;
        lines.splice(index, 1);
        calculateTotals(lines);
    };

    const handleLineChange = (index, field, value) => {
        const lines = [...validation.values.lines];
        lines[index][field] = value;
        calculateTotals(lines);
    };

    const handleCustomerChange = async (opt) => {
        if (!opt) return;
        validation.setFieldValue("partyId", opt.value);
        try {
            const response = await getPartyDetails(opt.value);
            const party = response.party || response.Party || {};
            const addresses = response.addresses || response.Addresses || [];

            const billing = addresses.find((a) => {
                const type = (a.addressType || a.AddressType || "").toString();
                return type === "Billing" || type === "1";
            }) || {};

            const shipping = addresses.find((a) => {
                const type = (a.addressType || a.AddressType || "").toString();
                return type === "Shipping" || type === "2";
            }) || {};

            const formatAddress = (addr) => {
                const attention = addr.attention || addr.Attention || addr.attention_name || "";
                const parts = [
                    attention,
                    addr.street1 || addr.Street1 || addr.addressLine1 || addr.address_line1 || "",
                    addr.street2 || addr.Street2 || addr.addressLine2 || addr.address_line2 || "",
                    addr.city || addr.City || "",
                    addr.state || addr.State || "",
                    addr.pinCode || addr.PinCode || addr.pincode || addr.pin_code || "",
                ].filter((p) => p && p !== "").join(", ");
                return parts || "...";
            };

            validation.setFieldValue("billingAddress", formatAddress(billing));
            validation.setFieldValue("shippingAddress", formatAddress(shipping));
            validation.setFieldValue("gstTreatment", party.GSTTreatment || party.gstTreatment || party.gst_treatment || "Unregistered Business");
            validation.setFieldValue("gstNo", party.GSTNO || party.gstNo || party.gstno || party.gst_no || "");
            validation.setFieldValue("placeOfSupply", party.placeOfSupply || party.PlaceOfSupply || party.place_of_supply || "");
            setSelectedCustomerDetails({ ...party, billing, shipping });
        } catch (error) {
            console.error("Error fetching customer details:", error);
        }
    };

    const itemTotals = useMemo(() => (
        (validation.values.lines || []).reduce((acc, line) => {
            acc.quantity += Number(line?.quantity || 0);
            acc.rate += Number(line?.rate || 0);
            acc.cgstPercent += Number(line?.cgstPercent || 0);
            acc.sgstPercent += Number(line?.sgstPercent || 0);
            acc.igstPercent += Number(line?.igstPercent || 0);
            acc.totalAmount += Number(line?.totalAmount || 0);
            return acc;
        }, { quantity: 0, rate: 0, cgstPercent: 0, sgstPercent: 0, igstPercent: 0, totalAmount: 0 })
    ), [validation.values.lines]);

    const getSelectStyles = useCallback((hasError = false) => ({
        control: (base, state) => ({
            ...base,
            borderColor: hasError ? "#f06548" : (state.isFocused ? "#405189" : base.borderColor),
            boxShadow: state.isFocused ? "0 0 0 0.1rem rgba(64,81,137,0.15)" : base.boxShadow,
            "&:hover": { borderColor: hasError ? "#f06548" : "#405189" },
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    }), []);

    document.title = isView
        ? "View Other Sale | SoftBook"
        : (isEdit ? "Edit Other Sale | SoftBook" : "Create Other Sale | SoftBook");

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb
                        title={isView ? "View Other Sale" : (isEdit ? "Edit Other Sale" : "New Other Sale")}
                        pageTitle="Purchase Transactions"
                    />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <Form onSubmit={validation.handleSubmit}>
                                        <Row className="mb-4">
                                            <Col md={6}>
                                                <Label className="text-danger fw-medium">Customer Name*</Label>
                                                <Select
                                                    options={customers}
                                                    isDisabled={isView}
                                                    onChange={(opt) => { handleCustomerChange(opt); setTouchedSelects((p) => ({ ...p, partyId: true })); }}
                                                    onBlur={() => setTouchedSelects((p) => ({ ...p, partyId: true }))}
                                                    placeholder="Select Customer"
                                                    classNamePrefix="select"
                                                    value={customers.find((v) => v.value === validation.values.partyId) || null}
                                                    styles={getSelectStyles(touchedSelects.partyId && !validation.values.partyId)}
                                                    menuPortalTarget={document.body}
                                                />
                                                {(touchedSelects.partyId || validation.submitCount > 0) && validation.errors.partyId && (
                                                    <div className="text-danger mt-1 small">{validation.errors.partyId}</div>
                                                )}

                                                {selectedCustomerDetails && (
                                                    <div className="mt-3 p-3 bg-light rounded shadow-sm border">
                                                        <Row>
                                                            <Col md={6}>
                                                                <small className="text-uppercase text-muted fw-bold d-block mb-1">Billing Address</small>
                                                                <p className="mb-0 small">{validation.values.billingAddress}</p>
                                                            </Col>
                                                            <Col md={6}>
                                                                <small className="text-uppercase text-muted fw-bold d-block mb-1">Shipping Address</small>
                                                                <p className="mb-0 small">{validation.values.shippingAddress}</p>
                                                            </Col>
                                                        </Row>
                                                    </div>
                                                )}
                                            </Col>

                                            <Col md={6}>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <Label className="text-danger fw-medium">Sales Order#*</Label>
                                                        <Input
                                                            name="invNo"
                                                            value={validation.values.invNo}
                                                            onChange={(e) => {
                                                                validation.handleChange(e);
                                                                validation.setFieldTouched("invNo", true, false);
                                                                checkDuplicateInvNo(e.target.value);
                                                            }}
                                                            onBlur={(e) => {
                                                                validation.handleBlur(e);
                                                                checkDuplicateInvNo(e.target.value);
                                                            }}
                                                            placeholder="Enter customer bill no"
                                                            disabled={isView}
                                                            invalid={(validation.touched.invNo || !!validation.values.invNo) && !!validation.errors.invNo}
                                                        />
                                                        {(validation.touched.invNo || !!validation.values.invNo) && validation.errors.invNo && (
                                                            <div className="text-danger small mt-1">{validation.errors.invNo}</div>
                                                        )}
                                                    </Col>
                                                    <Col md={6}>
                                                        <Label>Date</Label>
                                                        <Flatpickr
                                                            className="form-control"
                                                            options={{ dateFormat: "d/m/Y", clickOpens: !isView }}
                                                            value={validation.values.invDate}
                                                            onChange={(date) => !isView && validation.setFieldValue("invDate", date)}
                                                        />
                                                    </Col>
                                                </Row>
                                                <div className="alert alert-info py-2 mb-0 small">
                                                    Enter items manually (not from Product Master). All entries are saved as <strong>other_sale</strong>.
                                                </div>
                                            </Col>
                                        </Row>

                                        <div
                                            className="table-responsive mt-4"
                                            ref={itemTableScrollRef}
                                            style={{ maxHeight: "500px", overflowY: "auto", overflowX: "auto" }}
                                        >
                                            <Table className="table-nowrap align-middle mb-0 border" style={{ minWidth: "1100px" }}>
                                                <thead className="table-light">
                                                    <tr>
                                                        <th style={{ minWidth: "140px", position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Product ID*</th>
                                                        <th style={{ minWidth: "220px", position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Item Description*</th>
                                                        <th style={{ minWidth: "100px", position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Qty*</th>
                                                        <th style={{ minWidth: "120px", position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Rate*</th>
                                                        <th style={{ minWidth: "90px", position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>CGST %</th>
                                                        <th style={{ minWidth: "90px", position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>SGST %</th>
                                                        <th style={{ minWidth: "90px", position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>IGST %</th>
                                                        <th style={{ minWidth: "120px", position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Amount</th>
                                                        <th style={{ position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {validation.values.lines.map((line, index) => {
                                                        const lineErrors = (validation.errors.lines && validation.errors.lines[index]) || {};
                                                        const lineTouched = (validation.touched.lines && validation.touched.lines[index]) || {};
                                                        const showErr = (field) => (lineTouched[field] || validation.submitCount > 0) && lineErrors[field];

                                                        return (
                                                            <tr key={index}>
                                                                <td>
                                                                    <Input
                                                                        value={line.productCode}
                                                                        placeholder="e.g. COMP-001"
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "productCode", e.target.value)}
                                                                        onBlur={() => validation.setFieldTouched(`lines[${index}].productCode`, true)}
                                                                        style={{ borderColor: showErr("productCode") ? "#f06548" : "" }}
                                                                    />
                                                                    {showErr("productCode") && <div className="text-danger" style={{ fontSize: "11px" }}>{lineErrors.productCode}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input
                                                                        type="textarea"
                                                                        rows="1"
                                                                        value={line.description}
                                                                        placeholder="e.g. Dell Laptop Computer"
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "description", e.target.value)}
                                                                        onBlur={() => validation.setFieldTouched(`lines[${index}].description`, true)}
                                                                        style={{ borderColor: showErr("description") ? "#f06548" : "" }}
                                                                    />
                                                                    {showErr("description") && <div className="text-danger" style={{ fontSize: "11px" }}>{lineErrors.description}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.0001"
                                                                        value={line.quantity}
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "quantity", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "quantity", formatToFourDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].quantity`, true);
                                                                        }}
                                                                        style={{ borderColor: showErr("quantity") ? "#f06548" : "" }}
                                                                    />
                                                                    {showErr("quantity") && <div className="text-danger" style={{ fontSize: "11px" }}>{lineErrors.quantity}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input
                                                                        type="number"
                                                                        value={line.rate}
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "rate", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "rate", formatToTwoDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].rate`, true);
                                                                        }}
                                                                        style={{ borderColor: showErr("rate") ? "#f06548" : "" }}
                                                                    />
                                                                    {showErr("rate") && <div className="text-danger" style={{ fontSize: "11px" }}>{lineErrors.rate}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input
                                                                        type="number"
                                                                        value={line.cgstPercent}
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "cgstPercent", e.target.value)}
                                                                        onBlur={(e) => handleLineChange(index, "cgstPercent", formatToTwoDecimals(e.target.value))}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Input
                                                                        type="number"
                                                                        value={line.sgstPercent}
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "sgstPercent", e.target.value)}
                                                                        onBlur={(e) => handleLineChange(index, "sgstPercent", formatToTwoDecimals(e.target.value))}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Input
                                                                        type="number"
                                                                        value={line.igstPercent}
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "igstPercent", e.target.value)}
                                                                        onBlur={(e) => handleLineChange(index, "igstPercent", formatToTwoDecimals(e.target.value))}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Input readOnly value={formatToTwoDecimals(line.totalAmount || 0)} className="bg-light" />
                                                                </td>
                                                                <td>
                                                                    {!isView && validation.values.lines.length > 1 && (
                                                                        <Button color="link" className="text-danger p-0" onClick={() => handleRemoveLine(index)}>
                                                                            <i className="ri-delete-bin-fill fs-18"></i>
                                                                        </Button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {!isView && (
                                                        <tr>
                                                            <td colSpan={9} className="py-2" style={{ background: "#fff" }}>
                                                                <Button type="button" color="link" className="text-primary p-0 fw-medium" onClick={handleAddLine}>
                                                                    <i className="ri-add-line align-bottom"></i> Add New Row
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr className="table-light fw-semibold">
                                                        <td>Total</td>
                                                        <td></td>
                                                        <td>{formatToFourDecimals(itemTotals.quantity)}</td>
                                                        <td>{formatToTwoDecimals(itemTotals.rate)}</td>
                                                        <td>{formatToTwoDecimals(itemTotals.cgstPercent)}</td>
                                                        <td>{formatToTwoDecimals(itemTotals.sgstPercent)}</td>
                                                        <td>{formatToTwoDecimals(itemTotals.igstPercent)}</td>
                                                        <td>{formatToTwoDecimals(itemTotals.totalAmount)}</td>
                                                        <td></td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </div>

                                        <Row className="mt-4">
                                            <Col md={8}>
                                                <Label>General Description / Notes</Label>
                                                <Input
                                                    type="textarea"
                                                    rows="4"
                                                    name="description"
                                                    value={validation.values.description}
                                                    onChange={validation.handleChange}
                                                    placeholder="Notes for this sale"
                                                    disabled={isView}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <div className="p-3 bg-light rounded shadow-sm border border-2 border-primary border-opacity-10">
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span className="text-muted">Sub Total</span>
                                                        <span>{formatToTwoDecimals(validation.values.taxableAmount)}</span>
                                                    </div>

                                                    <div className="d-flex justify-content-between mb-3 align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <span className="text-muted fw-medium">Discount</span>
                                                            <div className="ms-2 d-flex align-items-center border rounded p-1 bg-white">
                                                                <Button
                                                                    type="button"
                                                                    color={discountType === "percent" ? "primary" : "light"}
                                                                    size="sm"
                                                                    className="py-0 px-2 border-0"
                                                                    onClick={() => {
                                                                        setDiscountType("percent");
                                                                        calculateTotals(validation.values.lines, { discountType: "percent" });
                                                                    }}
                                                                >
                                                                    %
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    color={discountType === "amount" ? "primary" : "light"}
                                                                    size="sm"
                                                                    className="py-0 px-2 border-0"
                                                                    onClick={() => {
                                                                        setDiscountType("amount");
                                                                        calculateTotals(validation.values.lines, { discountType: "amount" });
                                                                    }}
                                                                >
                                                                    ₹
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div style={{ width: "120px" }}>
                                                            {discountType === "percent" ? (
                                                                <div className="input-group input-group-sm">
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        className="text-end"
                                                                        value={validation.values.discountPercent}
                                                                        disabled={isView}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            validation.setFieldValue("discountPercent", val);
                                                                            calculateTotals(validation.values.lines, { discountPercent: val });
                                                                        }}
                                                                    />
                                                                    <span className="input-group-text bg-light">%</span>
                                                                </div>
                                                            ) : (
                                                                <div className="input-group input-group-sm">
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        className="text-end"
                                                                        value={validation.values.totDiscount}
                                                                        disabled={isView}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            validation.setFieldValue("totDiscount", val);
                                                                            calculateTotals(validation.values.lines, { totDiscount: val });
                                                                        }}
                                                                    />
                                                                    <span className="input-group-text bg-light">₹</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {discountType === "percent" && (
                                                        <div className="d-flex justify-content-between mb-2 small text-muted">
                                                            <span>Discount Amount</span>
                                                            <span>₹ {formatToTwoDecimals(validation.values.totDiscount)}</span>
                                                        </div>
                                                    )}

                                                    <div className="d-flex justify-content-between mb-2 text-info">
                                                        <span>CGST Amount</span>
                                                        <span>₹ {formatToTwoDecimals(validation.values.cgstAmount)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2 text-info">
                                                        <span>SGST Amount</span>
                                                        <span>₹ {formatToTwoDecimals(validation.values.sgstAmount)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2 text-info">
                                                        <span>IGST Amount</span>
                                                        <span>₹ {formatToTwoDecimals(validation.values.igstAmount)}</span>
                                                    </div>

                                                    <div className="d-flex justify-content-between mb-2 align-items-center">
                                                        <span className="text-muted fw-medium">Round Off</span>
                                                        <div style={{ width: "120px" }}>
                                                            <Input
                                                                type="number"
                                                                name="roundOff"
                                                                className="form-control-sm text-end no-spin-input"
                                                                value={validation.values.roundOff}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const isManual = val !== "" && val !== null;
                                                                    validation.setFieldValue("isRoundOffManual", isManual);
                                                                    validation.setFieldValue("roundOff", val);
                                                                    calculateTotals(validation.values.lines, { roundOff: val, isRoundOffManual: isManual });
                                                                }}
                                                                disabled={isView}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="border-top pt-2 mt-2 d-flex justify-content-between align-items-center">
                                                        <h5 className="mb-0 fw-bold">Grand Total ( ₹ )</h5>
                                                        <h4 className="mb-0 text-success fw-bold">{formatToTwoDecimals(validation.values.grandTotal)}</h4>
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>

                                        <div className="hstack gap-2 justify-content-end mt-4">
                                            <Button type="button" color="light" onClick={() => history("/sales-order")}>
                                                {isView ? "Back" : "Cancel"}
                                            </Button>
                                            {!isView && (
                                                <Button type="submit" color="primary" className="px-4">Save</Button>
                                            )}
                                        </div>
                                    </Form>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default OtherSaleCreate;
export { OTHER_SALE_CATEGORY, isOtherSaleRecord };
