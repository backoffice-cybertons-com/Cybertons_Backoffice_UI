import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
    CardBody, Row, Col, Card, Container, Form, Input, Label, Table, FormFeedback, Button,
    Modal, ModalHeader, ModalBody, ModalFooter, Badge
} from "reactstrap";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { useFormik } from "formik";
import { formatToFourDecimals, formatToTwoDecimals } from "../../utils/numberUtils";
import * as Yup from "yup";
import secureStorage from "../../utils/secureStorage";
import { useDispatch, useSelector } from "react-redux";
import {
    addNewSalesTransaction as onAddNewSalesTransaction,
    updateSalesTransaction as onUpdateSalesTransaction,
} from "../../slices/thunks";
import { resetSalesTransactionCreated } from "../../slices/salesTransaction/reducer";
import { getVendors, getPartyCustomers, getProductsForSales, getPartyDetails, getTransporters, getUnits, getSalesTransactionDetails, getDeliveryChallans, getSalesTransactions, getBanks, getCompanies, getPartyOutstanding, getVehicles, getStockSummaryReport } from "../../helpers/fakebackend_helper";
import { getSelectedFiscalYearId } from "../../utils/fiscalYearStorage";
import { APIClient } from "../../helpers/api_helper";
import { validateCustomerSalesLimits, showSalesLimitBlockedToast } from "../../utils/customerSalesLimitValidation";

const apiClient = new APIClient();

const calcLineProfitFields = (line) => {
    const qty = parseFloat(line.crt ?? line.quantity) || 0;
    const rate = parseFloat(line.rate) || 0;
    const rateDiff = parseFloat(line.rateDiff) || 0;
    const mrp = parseFloat(line.mrp) || 0;
    const dealerPrice = parseFloat(line.dealerPrice) || (rate - rateDiff);
    const spCommUnit = parseFloat(line.spCommUnit ?? line.spCommUnit) || 0;
    const companyCommUnit = mrp - rate - spCommUnit;
    return {
        dealerPrice,
        spCommUnit,
        companyCommUnit,
        invAmountMrp: qty * mrp,
        spCommTotal: qty * spCommUnit,
        companyCommTotal: qty * companyCommUnit
    };
};

const isSalesRecord = (order) => {
    const invType = (order.invType || order.InvType || "").toString().trim().toLowerCase();
    return !invType || invType === "sales";
};

/** Map DB line to UI grid: Sub Qty = 1, Qty (crt) = actual ordered quantity. */
const normalizeSalesOrderLine = (line, { isCopy = false, today = null, parseDate = null } = {}) => {
    const dbQty = parseFloat(line.quantity ?? line.Quantity) || 0;
    const dbCrt = parseFloat(line.crt ?? line.Crt) || 0;
    const crt = dbCrt > 0 ? dbCrt : dbQty;
    const subUnitQuantity = parseFloat(line.subUnitQuantity ?? line.SubUnitQuantity) || 1;
    const packing = parseFloat(line.packing ?? line.Packing) || (crt * subUnitQuantity);
    const rawBatchDate = line.batchDate ?? line.BatchDate;
    const batchDate = isCopy
        ? today
        : (parseDate ? parseDate(rawBatchDate) : rawBatchDate);

    return {
        ...line,
        spUniqueCode: isCopy ? 0 : (line.spUniqueCode || line.SpUniqueCode || 0),
        productId: line.productId || line.ProductId || "",
        batchNo: line.batchNo || line.BatchNo || "",
        batchDate,
        unit: line.unit || line.Unit || "",
        subUnit: line.subUnit || line.SubUnit || "",
        subUnitQuantity,
        crt,
        quantity: crt,
        packing,
        rate: line.rate || line.Rate || 0,
        mrp: line.mrp || line.Mrp || 0,
        cgstPercent: line.cgstPercent || line.CgstPercent || 0,
        sgstPercent: line.sgstPercent || line.SgstPercent || 0,
        amount: line.amount || line.Amount || 0,
        totalAmount: line.totalAmount || line.TotalAmount || 0,
        originalRate: (line.dealerPrice ?? line.DealerPrice) || ((line.rate || line.Rate || 0) - (line.rateDiff || line.RateDiff || 0)),
        rateDiff: line.rateDiff || line.RateDiff || 0,
        dealerPrice: line.dealerPrice ?? line.DealerPrice ?? ((line.rate || line.Rate || 0) - (line.rateDiff || line.RateDiff || 0)),
        spCommUnit: line.spCommUnit ?? line.SpCommUnit ?? 0,
        cogs: line.cogs || line.Cogs || 0
    };
};

const getNextSalesOrderNumber = (orders = []) => {
    const prefixStats = new Map();

    orders.forEach(order => {
        if (!isSalesRecord(order)) return;

        const rawInvNo = (order.invNo || order.InvNo || "").toString().trim();
        const match = rawInvNo.match(/^(.*?)(\d+)$/);
        if (!match) return;

        const numberValue = parseInt(match[2], 10);
        if (!Number.isFinite(numberValue)) return;

        const prefix = match[1];
        const current = prefixStats.get(prefix) || {
            prefix,
            count: 0,
            numberValue: 0,
            width: match[2].length
        };

        current.count += 1;
        if (numberValue > current.numberValue) {
            current.numberValue = numberValue;
            current.width = match[2].length;
        }
        prefixStats.set(prefix, current);
    });

    const latest = [...prefixStats.values()].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.numberValue - a.numberValue;
    })[0];

    if (!latest) return "";

    const nextNumber = String(latest.numberValue + 1).padStart(latest.width, "0");
    return `${latest.prefix}${nextNumber}`;
};

const SalesTransactionCreate = () => {
    const dispatch = useDispatch();
    const history = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isView = queryParams.get('view') === 'true';
    const copyId = queryParams.get('copyId');
    const isEdit = !!id;
    const isCopy = !!copyId;

    const { isSalesTransactionCreated } = useSelector(state => state.SalesTransaction);

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [transporters, setTransporters] = useState([]);
    const [units, setUnits] = useState([]);
    const [banks, setBanks] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [deliveryChallanOptions, setDeliveryChallanOptions] = useState([]);
    const [vehicleOptions, setVehicleOptions] = useState([]);
    const [salespersons, setSalespersons] = useState([]);
    const [allSalesOrders, setAllSalesOrders] = useState([]);
    const [customerRateDiff, setCustomerRateDiff] = useState(0);
    const itemTableScrollRef = useRef(null);
    const partyPreselectedRef = useRef(false);

    // Helper: extract crt value from a unit object regardless of key casing
    const getCrtFromUnit = (unit) => {
        if (!unit) return null;
        const entry = Object.entries(unit).find(([k]) => k.toLowerCase() === "crt");
        return entry ? Number(entry[1]) : null;
    };

    const unitById = useMemo(() => {
        const map = new Map();
        if (Array.isArray(units)) {
            units.forEach(u => {
                const id = u.unit_id ?? u.unitId ?? u.UnitId ?? u.unitMasterId ?? u.UnitMasterId ?? u.unit_master_id ?? u.id ?? u.value;
                if (id !== null && id !== undefined && id !== "") {
                    map.set(Number(id), u);
                }
            });
        }
        return map;
    }, [units]);

    const unitOptions = useMemo(() => {
        return (units || []).map(u => ({
            label: u.unitName || u.UnitName || u.unit_name || u.label,
            value: u.unit_id || u.unitId || u.UnitId || u.unitMasterId || u.UnitMasterId || u.unit_master_id || u.id,
        }));
    }, [units]);
    const [touchedSelects, setTouchedSelects] = useState({});
    const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
    const [isCopyPreviousModalOpen, setIsCopyPreviousModalOpen] = useState(false);
    const [previousInvoices, setPreviousInvoices] = useState([]);
    const [qtyByCode, setQtyByCode] = useState({});
    // stockMap: { [productId]: closingQty } — populated lazily when a product is selected
    const [stockMap, setStockMap] = useState({});

    // Stabilize constant values outside or with useMemo
    const today = useMemo(() => new Date(), []);

    useEffect(() => {
        // Clear any stale success flag from a previous session on mount
        dispatch(resetSalesTransactionCreated());

        const fetchInitialData = async () => {
            try {
                console.log("[SalesOrder] Fetching initial data...");

                // Fetch Customers + Vendors and merge into a single grouped dropdown
                try {
                    console.log("[SalesOrder] Fetching customers and vendors...");
                    const [custRaw, vendRaw] = await Promise.allSettled([
                        getPartyCustomers(),
                        getVendors()
                    ]);

                    const custArr = custRaw.status === 'fulfilled'
                        ? (Array.isArray(custRaw.value) ? custRaw.value
                            : (custRaw.value?.data && Array.isArray(custRaw.value.data)) ? custRaw.value.data : [])
                        : [];

                    const vendArr = vendRaw.status === 'fulfilled'
                        ? (Array.isArray(vendRaw.value) ? vendRaw.value
                            : (vendRaw.value?.data && Array.isArray(vendRaw.value.data)) ? vendRaw.value.data : [])
                        : [];

                    const mapParty = (v, fallback) => ({
                        label: v.displayName || v.DisplayName || v.partyName || v.PartyName || v.name || v.Name || v.CompanyName || v.companyName || fallback,
                        value: v.partyId || v.PartyId
                    });

                    const isActive = v => {
                        const a = v.isActive ?? v.IsActive;
                        return a !== false && a !== 0 && a !== 'false';
                    };

                    const mappedCustomers = custArr.filter(isActive).map(v => mapParty(v, "Unknown Customer"));
                    const mappedVendors   = vendArr.filter(isActive).map(v => mapParty(v, "Unknown Vendor"));

                    // Build grouped options so the dropdown shows two sections
                    const grouped = [];
                    if (mappedCustomers.length > 0) grouped.push({ label: "── Customers ──", options: mappedCustomers });
                    if (mappedVendors.length > 0)   grouped.push({ label: "── Vendors ──",   options: mappedVendors });

                    console.log(`[SalesOrder] Mapped ${mappedCustomers.length} customers + ${mappedVendors.length} vendors.`);
                    setCustomers(grouped);
                } catch (custErr) {
                    console.error("[SalesOrder] ERROR fetching customers/vendors:", custErr);
                    setCustomers([]);
                }

                // 2. Fetch Products
                try {
                    const prodRes = await getProductsForSales();
                    const productData = prodRes?.data || prodRes || [];
                    if (Array.isArray(productData)) {
                        setProducts(productData.map(p => ({
                            label: p.name || p.Name || p.product_name || p.DisplayName || "Unknown Product",
                            value: p.productId || p.ProductId || p.product_id || p.id,
                            shortName: p.shortName || p.ShortName || p.short_name || "",
                            rate: p.sellingPrice || p.SellingPrice || p.SellingPrice1 || 0,
                            mrp: p.mrp || p.MRP || 0,
                            hsnCode: p.hsnCode || p.HsnCode || p.hsn_code || p.hsnOrSACCode || "",
                            unitId: p.unitId || p.UnitId || 0,
                            productPackingUnit: p.productPackingUnit || p.ProductPackingUnit || 0,
                            cgstPercent: p.cgstPer || p.CGSTPer || p.cgstPercent || 0,
                            sgstPercent: p.sgstPer || p.SGSTPer || p.sgstPercent || 0,
                            crt: p.crt ?? p.Crt ?? null,
                            type: p.productType || p.ProductType || p.type || "Goods"
                        })));
                    }
                } catch (e) { console.error("[SalesOrder] Product fetch failed:", e); }

                // 3. Fetch Transporters
                try {
                    const transRes = await getTransporters();
                    const transporterData = transRes?.data || transRes || [];
                    if (Array.isArray(transporterData)) {
                        setTransporters(transporterData.map(t => ({
                            label: t.displayName || t.DisplayName || t.transporterName || t.TransporterName || t.name || t.Name,
                            value: t.transporterId || t.TransporterId || t.transporter_id || t.id
                        })));
                    }
                } catch (e) { console.error("[SalesOrder] Transporter fetch failed:", e); }

                // 4. Fetch Units
                try {
                    const unitRes = await getUnits();
                    const unitData = unitRes?.data || unitRes || [];
                    if (Array.isArray(unitData)) {
                        console.log("[SalesOrder] Raw unit data sample:", unitData[0]);
                        setUnits(unitData);
                    }
                } catch (e) { console.error("[SalesOrder] Unit fetch failed:", e); }

                // 5. Fetch Delivery Challans
                try {
                    const dcRes = await getDeliveryChallans();
                    const deliveryChallanData = dcRes?.data || dcRes || [];
                    if (Array.isArray(deliveryChallanData)) {
                        setDeliveryChallanOptions(deliveryChallanData.map(dc => ({
                            label: dc.challanNumber || dc.ChallanNumber || dc.challan_number || `DC-${dc.deliveryChallanId || dc.id}`,
                            value: dc.deliveryChallanId || dc.DeliveryChallanId || dc.delivery_challan_id || dc.id
                        })));
                    }
                } catch (e) { console.error("[SalesOrder] Delivery Challan fetch failed:", e); }

                // 6. Fetch Banks
                try {
                    const bankRes = await getBanks();
                    const bankData = bankRes?.data || bankRes || [];
                    if (Array.isArray(bankData)) {
                        setBanks(bankData.map(b => ({
                            label: b.bankName || b.BankName || b.name || b.Name,
                            value: b.bankMasterId || b.BankMasterId || b.bank_master_id || b.id
                        })));
                    }
                } catch (e) { console.error("[SalesOrder] Bank fetch failed:", e); }

                // 7. Fetch All Sales Orders (Optional/Background)
                try {
                    const soRes = await getSalesTransactions();
                    const soData = Array.isArray(soRes) ? soRes : (soRes?.data || []);
                    if (Array.isArray(soData)) setAllSalesOrders(soData);
                } catch (e) { console.warn("[SalesOrder] Sales Transactions fetch failed (non-critical):", e); }

                // 8. Fetch Companies
                try {
                    const compRes = await getCompanies();
                    const companyData = compRes?.data || compRes || [];
                    if (Array.isArray(companyData)) {
                        setCompanies(companyData.map(c => ({
                            label: c.companyName || c.CompanyName || c.name || c.Name,
                            value: c.companyId || c.CompanyId || c.company_id || c.id
                        })));
                    }
                } catch (e) { console.error("[SalesOrder] Company fetch failed:", e); }

                // Salespersons
                try {
                    const spRes = await apiClient.get('/api/salesperson');
                    const spData = Array.isArray(spRes) ? spRes : (spRes?.data || []);
                    if (Array.isArray(spData)) {
                        setSalespersons(spData.map(s => ({
                            label: s.salespersonName || s.SalespersonName || s.salesperson_name || s.name || "Salesperson",
                            value: s.salespersonId || s.SalespersonId || s.salesperson_id || s.id
                        })));
                    }
                } catch (e) { console.error("[SalesOrder] Salesperson fetch failed:", e); }

                if (isEdit || isCopy) {
                    const fetchId = isEdit ? id : copyId;
                    const editData = await getSalesTransactionDetails(fetchId);
                    console.log(isEdit ? "Edit data fetched:" : "Copy data fetched:", editData);
                    if (editData && editData.header) {
                        const header = editData.header;
                        const category = (header.invCategory || header.InvCategory || "").toLowerCase();
                        if (category === "other_sale") {
                            history(`/sales-transaction/other/edit/${isEdit ? id : copyId}${isView ? "?view=true" : ""}`);
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
                            partyId: header.partyId || header.PartyId || "",
                            deliveryNo: isCopy ? "" : (header.deliveryNo || header.DeliveryNo || ""),
                            invNo: isCopy ? "" : (header.invNo || header.InvNo || ""),
                            invDate: isCopy ? today : (parseDate(header.invDate || header.InvDate) || today),
                            salesOrderNo: isCopy ? "" : (header.salesOrderNo || header.SalesOrderNo || ""),
                            salesOrderDate: isCopy ? today : (parseDate(header.salesOrderDate || header.SalesOrderDate) || ""),
                            poOrderNo: isCopy ? "" : (header.poOrderNo || header.PoOrderNo || ""),
                            poOrderDate: isCopy ? today : (parseDate(header.poOrderDate || header.PoOrderDate) || ""),
                            deliveryDate: isCopy ? today : (parseDate(header.deliveryDate || header.DeliveryDate) || ""),
                            spUniqueCode: isCopy ? 0 : (header.spUniqueCode || header.SpUniqueCode || 0),
                            lines: (editData.lines || editData.Lines || []).map(line =>
                                normalizeSalesOrderLine(line, { isCopy, today: isCopy ? today : null, parseDate })
                            )
                        });
                        validation.setFieldValue("salespersonId", header.salespersonId || header.SalespersonId || "");
                        handleCustomerChange({ value: header.partyId || header.PartyId }, true);
                    }
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };
        fetchInitialData();
    }, [id, isEdit, isCopy, copyId]);

    const initialValues = useMemo(() => ({
        companyId: parseInt(secureStorage.getPlain('companyId')) || 1,
        invType: "Sales",
        invoiceSeries: "",
        invoiceSeriesIncrementNumber: 1,
        invNo: "",
        invDate: today,
        bankId: "",
        salesOrderNo: "",
        salesOrderDate: today,
        poOrderNo: "",
        poOrderDate: today,
        deliveryNo: "",
        deliveryDate: today,
        vehicleNo: "",
        transporterId: "",
        salespersonId: "",
        partyId: "",
        billingAddress: "",
        billingAddress1: "",
        billingAddress2: "",
        shippingAddress: "",
        shippingAddress1: "",
        shippingAddress2: "",
        taxableAmount: "0.00",
        cgstPercent: "0.00",
        cgstAmount: "0.00",
        sgstPercent: "0.00",
        sgstAmount: "0.00",
        roundOff: "0.00",
        isRoundOffManual: false,
        totDiscount: "0.00",
        previousOutstanding: "0.00",
        currentBillAmount: "0.00",
        finalOutstanding: "0.00",
        jurisdiction: "SURAT",
        grandTotal: "0.00",
        netInvoiceAmount: "0.00",
        description: "",
        totSkuInInvoice: 0,
        lines: [
            {
                spUniqueCode: 0,
                productId: "",
                productDetails: "",
                hsnCode: "",
                description: "",
                crt: 1,
                packing: 0,
                batchNo: "",
                batchDate: today,
                mrp: "0.00",
                subUnit: "",
                subUnitQuantity: 0,
                unit: "",
                quantity: 1,
                rate: "0.00",
                amount: "0.00",
                cgstPercent: "0.00",
                cgstAmount: "0.00",
                sgstPercent: "0.00",
                sgstAmount: "0.00",
                totalAmount: "0.00",
                originalRate: "0.00",
                rateDiff: "0.00",
                dealerPrice: "0.00",
                spCommUnit: "0.00",
                cogs: "0.00"
            }
        ]
    }), [today]);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues: initialValues,
        validationSchema: Yup.object({
            partyId: Yup.mixed().required("Customer Name is required").test('not-empty', 'Customer Name is required', v => !!v && v !== ''),
            invNo: Yup.string().required("Sales Order# is required"),
            salesOrderNo: Yup.string().required("Reference SO# is required"),
            poOrderNo: Yup.string().required("Purchase Order is required"),
            deliveryNo: Yup.mixed().required("Delivery Challan No is required").test('not-empty', 'Delivery Challan No is required', v => !!v && v !== ''),
            transporterId: Yup.mixed().required("Transporter Name is required").test('not-empty', 'Transporter Name is required', v => !!v && v !== ''),
            lines: Yup.array().of(
                Yup.object({
                    productId: Yup.mixed().required("Product is required").test('not-empty', 'Product is required', v => !!v && v !== ''),
                    unit: Yup.mixed().required("Unit is required").test('not-empty', 'Unit is required', v => !!v && v !== ''),
                    subUnit: Yup.mixed().required("Sub Unit is required").test('not-empty', 'Sub Unit is required', v => !!v && v !== ''),
                    crt: Yup.number().typeError("Must be a number").required("CRT is required").min(1, "CRT must be >= 1"),
                    rate: Yup.number().typeError("Must be a number").required("Rate is required").min(0.01, "Rate must be > 0"),
                    cgstPercent: Yup.number().typeError("Must be a number").required("CGST % is required").min(0, "Cannot be negative"),
                    sgstPercent: Yup.number().typeError("Must be a number").required("SGST % is required").min(0, "Cannot be negative"),
                })
            ),
        }),
        onSubmit: async (values) => {
            // ---- Duplicate invNo check ----
            if (!isEdit) {
                const duplicateSO = allSalesOrders.find(
                    po => isSalesRecord(po) && (po.invNo || po.InvNo || '').toString().trim().toLowerCase() === values.invNo.trim().toLowerCase()
                );
                if (duplicateSO) {
                    validation.setFieldError('invNo', 'This Sales Order# already exists. Please use a unique number.');
                    return;
                }

                // ---- Duplicate PO Order check ----
                const duplicatePO = allSalesOrders.find(
                    po => isSalesRecord(po) && (po.poOrderNo || po.PoOrderNo || '').toString().trim().toLowerCase() === values.poOrderNo.trim().toLowerCase() && values.poOrderNo.trim() !== ''
                );
                if (duplicatePO) {
                    validation.setFieldError('poOrderNo', 'This Purchase Order number already exists. Please use a unique number.');
                    return;
                }
            }

            // ---- Customer daily sale / credit limit checks ----
            let party = selectedCustomerDetails;
            if (values.partyId) {
                try {
                    const response = await getPartyDetails(values.partyId);
                    const fetchedParty = response.party || response.Party || {};
                    party = { ...fetchedParty, ...(party || {}) };
                } catch (limitErr) {
                    console.warn("Failed to load customer limits:", limitErr);
                }
            }

            const limitCheck = validateCustomerSalesLimits({
                party: party || {},
                partyId: values.partyId,
                grandTotal: values.grandTotal,
                previousOutstanding: values.previousOutstanding,
                invDate: values.invDate,
                allSalesOrders,
                excludeSpUniqueCode: id ? parseInt(id) : 0,
                isSalesRecord,
            });
            if (!limitCheck.allowed) {
                showSalesLimitBlockedToast(limitCheck);
                return;
            }

            // ---- Stock quantity check ----
            const stockViolations = values.lines
                .filter(line => line.productId)
                .map(line => {
                    const pid = String(line.productId);
                    const available = stockMap[pid] ?? null;
                    const ordered = parseFloat(line.crt) || 0;
                    if (available !== null && ordered > available) {
                        const prodLabel = products.find(p => String(p.value) === pid)?.label || `Product #${pid}`;
                        return { prodLabel, ordered, available };
                    }
                    return null;
                })
                .filter(Boolean);

            if (stockViolations.length > 0) {
                const msgs = stockViolations.map(
                    v => `• ${v.prodLabel}: ordered ${v.ordered}, available ${v.available}`
                ).join('\n');
                alert(`⚠️ Stock insufficient for the following product(s):\n\n${msgs}\n\nPlease reduce the quantity.`);
                return;
            }

            const { lines, ...headerValues } = values;
            const selectedFiscalYearId = getSelectedFiscalYearId();

            const formatDate = (date) => {
                if (!date) return null;
                const d = Array.isArray(date) ? date[0] : date;
                const dt = d instanceof Date ? d : new Date(d);
                if (isNaN(dt.getTime())) return null;
                // Return YYYY-MM-DD string (local date) to avoid UTC offset shifting date by -1 day
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const day = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            const payload = {
                header: {
                    ...headerValues,
                    invDate: formatDate(values.invDate) || new Date(),
                    salesOrderDate: formatDate(values.salesOrderDate),
                    poOrderDate: formatDate(values.poOrderDate),
                    deliveryDate: formatDate(values.deliveryDate),
                    deliveryNo: values.deliveryNo ? parseInt(values.deliveryNo) : null,
                    transporterId: values.transporterId ? parseInt(values.transporterId) : null,
                    salespersonId: values.salespersonId ? parseInt(values.salespersonId) : null,
                    bankId: values.bankId ? parseInt(values.bankId) : null,
                    invoiceSeriesIncrementNumber: values.invoiceSeriesIncrementNumber ? parseInt(values.invoiceSeriesIncrementNumber) : null,
                    spUniqueCode: id ? parseInt(id) : 0,
                    partyId: values.partyId ? parseInt(values.partyId) : 0,
                    companyId: values.companyId ? parseInt(values.companyId) : 1,
                    fiscalYearId: selectedFiscalYearId ?? (values.fiscalYearId ? parseInt(values.fiscalYearId) : null) ?? (values.FiscalYearId ? parseInt(values.FiscalYearId) : null),
                    branchId: values.branchId ? parseInt(values.branchId) : (values.BranchId ? parseInt(values.BranchId) : null)
                },
                lines: lines.map(line => ({
                    ...line,
                    productDetails: line.description ? `${line.productDetails}\n${line.description}` : line.productDetails,
                    batchDate: formatDate(line.batchDate),
                    spUniqueCode: id ? parseInt(id) : 0,
                    productId: line.productId ? parseInt(line.productId) : null,
                    unit: line.unit ? parseInt(line.unit) : null,
                    subUnit: line.subUnit ? parseInt(line.subUnit) : null,
                    subUnitQuantity: line.subUnitQuantity ? parseFloat(line.subUnitQuantity) : 0,
                    quantity: line.quantity ? parseFloat(line.quantity) : 0,
                    packing: line.packing ? line.packing.toString() : null,
                    rate: line.rate ? parseFloat(line.rate) : 0,
                    amount: line.amount ? parseFloat(line.amount) : 0,
                    totalAmount: line.totalAmount ? parseFloat(line.totalAmount) : 0,
                    rateDiff: line.rateDiff ? parseFloat(line.rateDiff) : 0,
                    dealerPrice: line.dealerPrice ? parseFloat(line.dealerPrice) : (parseFloat(line.rate || 0) - parseFloat(line.rateDiff || 0)),
                    spCommUnit: line.spCommUnit ? parseFloat(line.spCommUnit) : 0,
                    cogs: line.cogs ? parseFloat(line.cogs) : 0
                }))
            };

            console.log("Submitting Sales Transaction Payload:", payload);

            if (isEdit) {
                dispatch(onUpdateSalesTransaction(payload));
            } else {
                dispatch(onAddNewSalesTransaction(payload));
            }
        }
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

        const duplicateSO = (allSalesOrders || []).find((po) => {
            if (!isSalesRecord(po)) return false;
            const poInvNo = (po.invNo || po.InvNo || "").toString().trim().toLowerCase();
            const sameCurrentRecord = id && String(po.spUniqueCode || po.SpUniqueCode || po.id || "") === String(id);
            return poInvNo === invNo && !sameCurrentRecord;
        });

        if (duplicateSO) {
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
        if (isEdit || isView || validation.values.invNo || allSalesOrders.length === 0) return;

        const nextInvNo = getNextSalesOrderNumber(allSalesOrders);
        if (nextInvNo) {
            validation.setFieldValue("invNo", nextInvNo, false);
        }
    }, [allSalesOrders, isEdit, isView, validation.values.invNo, validation.setFieldValue]);

    useEffect(() => {
        if (isSalesTransactionCreated) {
            history("/sales-order");
        }
    }, [isSalesTransactionCreated, history]);

    const calculateTotals = useCallback((lines, overrides = {}) => {
        let taxableAmount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let grandTotal = 0;

        const updatedLines = lines.map(line => {
            const crt = parseFloat(line.crt) || 0;
            const subQty = parseFloat(line.subUnitQuantity) || 0;
            const rate = parseFloat(line.rate) || 0;

            const packing = crt * subQty;
            const amount = crt * rate;

            const cgstP = parseFloat(line.cgstPercent) || 0;
            const sgstP = parseFloat(line.sgstPercent) || 0;

            const lineCgst = amount * (cgstP / 100);
            const lineSgst = amount * (sgstP / 100);

            taxableAmount += amount;
            cgstAmount += lineCgst;
            sgstAmount += lineSgst;
            grandTotal += (amount + lineCgst + lineSgst);

            return {
                ...line,
                packing: packing,
                quantity: crt,
                amount: amount,
                cgstAmount: lineCgst,
                sgstAmount: lineSgst,
                totalAmount: amount + lineCgst + lineSgst,
                dealerPrice: parseFloat(line.dealerPrice) || (rate - (parseFloat(line.rateDiff) || 0)),
                ...calcLineProfitFields({ ...line, rate, dealerPrice: parseFloat(line.dealerPrice) || (rate - (parseFloat(line.rateDiff) || 0)) })
            };
        });

        const rawTotalWithTax = taxableAmount + cgstAmount + sgstAmount;
        
        // Handle partial inputs like "-" or "." by using 0 for calculation but not overwriting the string
        const discountInput = overrides.hasOwnProperty('totDiscount') ? overrides.totDiscount : validation.values.totDiscount;
        const discountAmount = isNaN(parseFloat(discountInput)) ? 0 : parseFloat(discountInput);
        
        const netAmountBeforeRound = rawTotalWithTax - discountAmount;
        
        let finalGrandTotal = 0;
        let finalRoundOff = 0;

        // Check if manual mode is enabled via the persistent flag or a direct override
        const isManual = overrides.hasOwnProperty('isRoundOffManual') ? overrides.isRoundOffManual : validation.values.isRoundOffManual;
        const roundOffInput = overrides.hasOwnProperty('roundOff') ? overrides.roundOff : validation.values.roundOff;
        const manualVal = isNaN(parseFloat(roundOffInput)) ? 0 : parseFloat(roundOffInput);

        if (isManual) {
            finalRoundOff = manualVal;
            finalGrandTotal = netAmountBeforeRound + finalRoundOff;
        } else {
            // Auto-calculate Round Off
            finalGrandTotal = Math.round(netAmountBeforeRound);
            finalRoundOff = finalGrandTotal - netAmountBeforeRound;
        }

        validation.setFieldValue("taxableAmount", taxableAmount);
        validation.setFieldValue("cgstAmount", cgstAmount);
        validation.setFieldValue("sgstAmount", sgstAmount);
        
        // Only update the form field if it's NOT the one the user is currently typing in
        if (!overrides.hasOwnProperty('totDiscount')) {
            validation.setFieldValue("totDiscount", discountInput);
        }

        if (!isManual) {
            validation.setFieldValue("roundOff", finalRoundOff);
        } else {
            // If manual, keep the string as the user typed it (handle "-" etc)
            if (!overrides.hasOwnProperty('roundOff')) {
                validation.setFieldValue("roundOff", roundOffInput);
            }
        }

        validation.setFieldValue("isRoundOffManual", isManual);
        validation.setFieldValue("grandTotal", finalGrandTotal);
        validation.setFieldValue("netInvoiceAmount", finalGrandTotal);
        validation.setFieldValue("currentBillAmount", finalGrandTotal);

        const prevOS = parseFloat(validation.values.previousOutstanding) || 0;
        validation.setFieldValue("finalOutstanding", prevOS + finalGrandTotal);

        validation.setFieldValue("totSkuInInvoice", updatedLines.length);
        validation.setFieldValue("lines", updatedLines);
    }, [validation.setFieldValue, validation.values.previousOutstanding]);

    const handleAddLine = () => {
        const newLines = [
            ...validation.values.lines,
            {
                spUniqueCode: id ? parseInt(id) : 0,
                productId: "", productDetails: "", description: "", batchNo: "", batchDate: today, mrp: 0,
                subUnit: "", subUnitQuantity: 0, unit: "",
                crt: 1, packing: 0, rate: 0, amount: 0, cgstPercent: 0, cgstAmount: 0, sgstPercent: 0, sgstAmount: 0, totalAmount: 0,
                originalRate: 0, dealerPrice: 0, spCommUnit: 0,
                rateDiff: customerRateDiff
            }
        ];
        validation.setFieldValue("lines", newLines);
        // Keep the new blank row immediately visible
        setTimeout(() => {
            if (itemTableScrollRef.current) {
                itemTableScrollRef.current.scrollTop = itemTableScrollRef.current.scrollHeight;
            }
        }, 0);
    };

    const handleRemoveLine = (index) => {
        const lines = [...validation.values.lines];
        lines.splice(index, 1);
        calculateTotals(lines);
    };

    const handleLineChange = async (index, field, value) => {
        const lines = [...validation.values.lines];
        lines[index][field] = value;

        // Auto-fill logic for Product selection
        // ---- Fetch live closing stock when a product is selected ----
        if (field === "productId" && value && !(value in stockMap)) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;
            const companyId = parseInt(secureStorage.getPlain('companyId') || secureStorage.getPlain('CompanyId') || 1);
            try {
                const raw = await getStockSummaryReport(companyId, '2000-01-01', todayStr);
                const rows = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
                const updated = { ...stockMap };
                rows.forEach(r => {
                    const pid = r.ProductId ?? r.productId;
                    const closing = parseFloat(r.ClosingQty ?? r.closingQty ?? 0);
                    if (pid != null) updated[String(pid)] = closing;
                });
                setStockMap(updated);
            } catch (e) {
                console.warn('[SalesOrder] Could not fetch stock:', e);
            }
        }

        if (field === "productId" && value) {
            const selectedProd = products.find(p => p.value == value);
            if (selectedProd) {
                const baseUnitId = Number(selectedProd.unitId) || 0;
                const packingUnitId = Number(selectedProd.productPackingUnit) || baseUnitId || 0;

                // DIAGNOSTIC: dump the map keys and the IDs being looked up
                console.log("[SalesOrder] unitById keys:", [...unitById.keys()]);
                console.log("[SalesOrder] looking up baseUnitId:", baseUnitId, "packingUnitId:", packingUnitId);
                console.log("[SalesOrder] selectedProd raw:", JSON.stringify(selectedProd));

                const baseUnit = unitById.get(baseUnitId);
                const packingUnit = unitById.get(packingUnitId);

                console.log("[SalesOrder] Product selected:", selectedProd);
                console.log("[SalesOrder] Units found:", { baseUnit, packingUnit });

                // Sub Qty should be derived from the Sub/Base unit's CRT conversion
                const crtValue =
                    getCrtFromUnit(baseUnit) ||
                    getCrtFromUnit(packingUnit) ||
                    1;
                
                console.log("[SalesOrder] Calculated crtValue:", crtValue);

                lines[index].productDetails = selectedProd.label;
                lines[index].unit = packingUnitId || "";
                lines[index].subUnit = baseUnitId || "";
                lines[index].subUnitQuantity = crtValue || 1;
                lines[index].originalRate = selectedProd.rate; // Store the master selling price (dealer price)
                lines[index].dealerPrice = selectedProd.rate;
                lines[index].rate = selectedProd.rate;
                lines[index].mrp = selectedProd.mrp || 0;
                lines[index].hsnCode = selectedProd.hsnCode;
                lines[index].cgstPercent = selectedProd.cgstPercent || 0;
                lines[index].sgstPercent = selectedProd.sgstPercent || 0;
                lines[index].crt = lines[index].crt || 1;
                lines[index].packing = (lines[index].crt || 1) * (crtValue || 1);
                
                // Apply customer rate adjustment logic
                const baseRate = selectedProd.rate || 0;
                lines[index].rate = baseRate + customerRateDiff;
                lines[index].rateDiff = customerRateDiff;
            }
        } else if ((field === "unit" || field === "subUnit") && value) {
            const currentLine = lines[index];
            const baseUnitId = Number(field === "subUnit" ? value : currentLine.subUnit) || 0;
            const packingUnitId = Number(field === "unit" ? value : currentLine.unit) || 0;
            const baseUnit = unitById.get(baseUnitId);
            const packingUnit = unitById.get(packingUnitId);

            const crtValue =
                getCrtFromUnit(baseUnit) ||
                getCrtFromUnit(packingUnit) ||
                1;
            lines[index].subUnitQuantity = crtValue || 1;
            lines[index].packing = (lines[index].crt || 0) * (crtValue || 1);
        } else if (field === "crt") {
            const crt = parseFloat(value) || 0;
            const subQty = parseFloat(lines[index].subUnitQuantity) || 0;
            lines[index].packing = crt * subQty;
        }

        calculateTotals(lines);
    };

    const handleCustomerChange = async (opt, skipLineRecalculation = false) => {
        if (!opt) return;
        validation.setFieldValue("partyId", opt.value);
        try {
            const response = await getPartyDetails(opt.value);
            const party = response.party || response.Party || {};
            const addresses = response.addresses || response.Addresses || [];

            // Robustly find billing and shipping addresses
            const billing = addresses.find(a => {
                const type = (a.addressType || a.AddressType || "").toString();
                return type === "Billing" || type === "1";
            }) || {};

            const shipping = addresses.find(a => {
                const type = (a.addressType || a.AddressType || "").toString();
                return type === "Shipping" || type === "2";
            }) || {};

            const formatAddress = (addr) => {
                if (!addr || typeof addr !== 'object') return "...";
                const attention = addr.attention || addr.Attention || addr.attention_name || "";
                const parts = [
                    attention,
                    addr.street1 || addr.Street1 || addr.addressLine1 || addr.address_line1 || "",
                    addr.street2 || addr.Street2 || addr.addressLine2 || addr.address_line2 || "",
                    addr.city || addr.City || "",
                    addr.state || addr.State || "",
                    addr.pinCode || addr.PinCode || addr.pincode || addr.pin_code || ""
                ].filter(p => p && p !== "").join(", ");
                return parts || "...";
            };

            validation.setFieldValue("billingAddress", formatAddress(billing));
            validation.setFieldValue("shippingAddress", formatAddress(shipping));

            // Also update the sub-fields for the modal
            validation.setFieldValue("billingAddress1", billing.addressLine1 || billing.street1 || "");
            validation.setFieldValue("billingAddress2", billing.city || "");
            validation.setFieldValue("shippingAddress1", shipping.addressLine1 || shipping.street1 || "");
            validation.setFieldValue("shippingAddress2", shipping.city || "");

            // Comprehensive fallbacks for GST and Treatment
            const gstTreatment = party.GSTTreatment || party.gstTreatment || party.gst_treatment || "Unregistered Business";
            const gstNo = party.GSTNO || party.gstNo || party.gstno || party.gst_no || "";

            validation.setFieldValue("gstTreatment", gstTreatment);
            validation.setFieldValue("gstNo", gstNo);
            validation.setFieldValue("placeOfSupply", party.placeOfSupply || party.PlaceOfSupply || party.place_of_supply || "");

            // Fetch Outstanding Balance
            try {
                const outstandingRaw = await getPartyOutstanding(opt.value);
                const outstanding = parseFloat(outstandingRaw) || 0;
                
                validation.setFieldValue("previousOutstanding", outstanding);
                const currentBill = parseFloat(validation.values.grandTotal) || 0;
                validation.setFieldValue("finalOutstanding", outstanding + currentBill);
            } catch (osErr) {
                console.warn("Failed to fetch outstanding:", osErr);
                validation.setFieldValue("previousOutstanding", 0);
            }

            // Use stored rate_diff from party master (not auto-calculated / not persisted on open).
            const rateDiff = parseFloat(party.rateDiff || party.RateDiff) || 0;
            setCustomerRateDiff(rateDiff);
            setSelectedCustomerDetails({ ...party, billing, shipping });

            if (skipLineRecalculation) return;

            // Automatically apply new RateDiff to all existing lines
            const updatedLines = (validation.values.lines || []).map(line => {
                const baseRate = parseFloat(line.originalRate) || parseFloat(line.dealerPrice) || (parseFloat(line.rate) - (parseFloat(line.rateDiff) || 0)) || 0;
                const newRate = baseRate + rateDiff;
                return {
                    ...line,
                    rateDiff: rateDiff,
                    dealerPrice: baseRate,
                    rate: newRate,
                    originalRate: baseRate,
                    cgstPercent: line.cgstPercent || 0,
                    sgstPercent: line.sgstPercent || 0
                };
            });
            
            // Note: calculateTotals also updates validation.values.lines, so we pass our updated lines to it
            calculateTotals(updatedLines);
        } catch (error) {
            console.error("Error fetching customer details:", error);
        }
    };

    useEffect(() => {
        const preselectedPartyId = location.state?.partyId;
        if (partyPreselectedRef.current || isEdit || isCopy || !preselectedPartyId || customers.length === 0) return;
        const allOptions = customers.flatMap(g => g.options ?? [g]);
        const customer = allOptions.find((c) => String(c.value) === String(preselectedPartyId));
        if (customer) {
            partyPreselectedRef.current = true;
            handleCustomerChange(customer, true);
        }
    }, [customers, isEdit, isCopy, location.state?.partyId]);

    const formatProductOption = (option) => (
        <div className="d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center">
                <span className="fw-medium">
                    {option.label}
                    {option.shortName && <span className="text-muted ms-2 small">({option.shortName})</span>}
                </span>
                <Badge color={option.type === "Goods" ? "info" : "success"} className="ms-2">{option.type}</Badge>
            </div>
            <small className="text-muted">HSN Code: {option.hsnCode}</small>
        </div>
    );

    const itemTotals = useMemo(() => {
        return (validation.values.lines || []).reduce((acc, line) => {
            acc.subUnitQuantity += Number(line?.subUnitQuantity || 0);
            acc.crt += Number(line?.crt || 0);
            acc.packing += Number(line?.packing || 0);
            acc.rateDiff += Number(line?.rateDiff || 0);
            acc.rate += Number(line?.rate || 0);
            acc.mrp += Number(line?.mrp || 0);
            acc.cgstPercent += Number(line?.cgstPercent || 0);
            acc.sgstPercent += Number(line?.sgstPercent || 0);
            acc.totalAmount += Number(line?.totalAmount || 0);
            const profit = calcLineProfitFields(line);
            acc.dealerPrice += profit.dealerPrice;
            acc.spCommUnit += profit.spCommUnit;
            acc.companyCommUnit += profit.companyCommUnit;
            acc.invAmountMrp += profit.invAmountMrp;
            acc.spCommTotal += profit.spCommTotal;
            acc.companyCommTotal += profit.companyCommTotal;
            return acc;
        }, {
            subUnitQuantity: 0,
            crt: 0,
            packing: 0,
            rateDiff: 0,
            rate: 0,
            mrp: 0,
            cgstPercent: 0,
            sgstPercent: 0,
            totalAmount: 0,
            dealerPrice: 0,
            spCommUnit: 0,
            companyCommUnit: 0,
            invAmountMrp: 0,
            spCommTotal: 0,
            companyCommTotal: 0
        });
    }, [validation.values.lines]);

    const stickyFooterCellStyle = {
        position: "sticky",
        bottom: 0,
        background: "#f3f6f9",
        zIndex: 2
    };

    const handleCopyFromPrevious = useCallback(() => {
        if (!validation.values.partyId) return;
        const customerInvoices = allSalesOrders.filter(tx => (tx.partyId === validation.values.partyId || tx.PartyId === validation.values.partyId));
        // Sort by date descending
        const sorted = [...customerInvoices].sort((a, b) => new Date(b.invDate || b.InvDate) - new Date(a.invDate || a.InvDate));
        setPreviousInvoices(sorted);
        setIsCopyPreviousModalOpen(true);

        // Fetch quantities in background
        sorted.forEach(async (inv) => {
            const code = inv.spUniqueCode || inv.SpUniqueCode;
            if (code && !qtyByCode[code]) {
                try {
                    const res = await getSalesTransactionDetails(code);
                    const details = res?.data || res;
                    const lines = details?.lines || details?.Lines || [];
                    const totalQty = lines.reduce((acc, l) => acc + Number(l.quantity || l.Quantity || 0), 0);
                    setQtyByCode(prev => ({ ...prev, [code]: totalQty }));
                } catch (e) {
                    console.error("Error fetching qty for", code, e);
                }
            }
        });
    }, [validation.values.partyId, allSalesOrders, qtyByCode]);

    const selectPreviousInvoice = async (copyId) => {
        try {
            const editData = await getSalesTransactionDetails(copyId);
            if (editData && editData.header) {
                const header = editData.header;
                const parseDate = (val) => {
                    if (!val) return null;
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? null : d;
                };
                validation.setValues({
                    ...initialValues,
                    ...header,
                    partyId: header.partyId || header.PartyId || "",
                    deliveryNo: "",
                    invNo: "",
                    invDate: today,
                    salesOrderNo: "",
                    salesOrderDate: today,
                    poOrderNo: "",
                    poOrderDate: today,
                    deliveryDate: today,
                    spUniqueCode: 0,
                    lines: (editData.lines || editData.Lines || []).map(line =>
                        normalizeSalesOrderLine(line, { isCopy: true, today })
                    )
                });
                validation.setFieldValue("salespersonId", header.salespersonId || header.SalespersonId || "");
                handleCustomerChange({ value: header.partyId || header.PartyId }, true);
                setIsCopyPreviousModalOpen(false);
            }
        } catch (error) {
            console.error("Error copying invoice:", error);
        }
    };

    document.title = isView ? "View Sales Transaction | SoftBook" : (isCopy ? "Copy Sales Transaction | SoftBook" : (isEdit ? "Edit Sales Transaction | SoftBook" : "Create Sales Transaction | SoftBook"));

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={isView ? "View Sales Order" : (isCopy ? "Copy Sales Order" : (isEdit ? "Edit Sales Order" : "New Sales Order"))} pageTitle="Sales Transactions" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <Form onSubmit={validation.handleSubmit}>
                                        <Row className="mb-4">
                                            <Col md={6}>
                                                <Label className="text-danger fw-medium">Customer / Vendor*</Label>
                                                <div className="d-flex gap-2">
                                                    <div className="flex-grow-1">
                                                        <Select
                                                            options={customers}
                                                            isDisabled={isView}
                                                            onChange={(opt) => { handleCustomerChange(opt); setTouchedSelects(p => ({ ...p, partyId: true })); }}
                                                            onBlur={() => setTouchedSelects(p => ({ ...p, partyId: true }))}
                                                            placeholder="Select Customer / Vendor"
                                                            classNamePrefix="select"
                                                            noOptionsMessage={() => "No customers or vendors found"}
                                                            value={customers.flatMap(g => g.options ?? [g]).find(v => v.value === validation.values.partyId) || null}
                                                            styles={{ control: base => ({ ...base, borderColor: (touchedSelects.partyId && !validation.values.partyId) ? '#f06548' : base.borderColor }) }}
                                                        />
                                                    </div>
                                                    <Button color="info" onClick={handleCopyFromPrevious} disabled={!validation.values.partyId || isView} title="Copy from Previous Invoice">
                                                        <i className="ri-file-copy-line"></i>
                                                    </Button>
                                                </div>
                                                {(touchedSelects.partyId || validation.submitCount > 0) && validation.errors.partyId && <div className="text-danger mt-1 small">{validation.errors.partyId}</div>}

                                                <div className="mt-3 p-3 bg-light rounded shadow-sm border">
                                                    <Row>
                                                        <Col md={6}>
                                                            <small className="text-uppercase text-muted fw-bold d-block mb-1">Billing Address</small>
                                                            <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{validation.values.billingAddress || "\u00A0"}</p>
                                                        </Col>
                                                        <Col md={6}>
                                                            <small className="text-uppercase text-muted fw-bold d-block mb-1">Shipping Address</small>
                                                            <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{validation.values.shippingAddress || "\u00A0"}</p>
                                                        </Col>
                                                    </Row>
                                                    <hr className="my-2" />
                                                    <Row>
                                                        <Col md={4}>
                                                            <small className="text-muted d-block">GST Treatment</small>
                                                            <span className="small">{validation.values.gstTreatment || "\u00A0"}</span>
                                                        </Col>
                                                        <Col md={4}>
                                                            <small className="text-muted d-block">GST No</small>
                                                            <span className="small">{validation.values.gstNo || "N/A"}</span>
                                                        </Col>
                                                        <Col md={4}>
                                                            <small className="text-muted d-block">Place of Supply</small>
                                                            <span className="small">{validation.values.placeOfSupply || "\u00A0"}</span>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            </Col>

                                            <Col md={6}>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <Label className="text-danger fw-medium">Invoice No#*</Label>
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
                                                            placeholder="SO-00001"
                                                            disabled={isView}
                                                            invalid={(validation.touched.invNo || !!validation.values.invNo) && !!validation.errors.invNo}
                                                        />
                                                        {(validation.touched.invNo || !!validation.values.invNo) && validation.errors.invNo && <div className="text-danger small mt-1">{validation.errors.invNo}</div>}
                                                    </Col>
                                                    <Col md={6}>
                                                        <Label className="text-danger fw-medium">SO Order#*</Label>
                                                        <Input name="salesOrderNo" value={validation.values.salesOrderNo} onBlur={validation.handleBlur} onChange={validation.handleChange}
                                                            disabled={isView}
                                                            invalid={validation.touched.salesOrderNo && !!validation.errors.salesOrderNo} />
                                                        {validation.touched.salesOrderNo && validation.errors.salesOrderNo && <div className="text-danger small mt-1">{validation.errors.salesOrderNo}</div>}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <Label>Invoice Series</Label>
                                                        <Input name="invoiceSeries" value={validation.values.invoiceSeries} onChange={validation.handleChange} placeholder="Series (e.g. GST)" disabled={isView} />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Label>Starting #</Label>
                                                        <Input type="number" name="invoiceSeriesIncrementNumber" value={validation.values.invoiceSeriesIncrementNumber} onChange={validation.handleChange} disabled={isView} />
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <Label>Date</Label>
                                                        <Flatpickr className="form-control" options={{ dateFormat: "d/m/Y", clickOpens: !isView }} value={validation.values.invDate} onChange={date => !isView && validation.setFieldValue("invDate", date)} />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Label>SO Date</Label>
                                                        <Flatpickr className="form-control" options={{ dateFormat: "d/m/Y", clickOpens: !isView }} value={validation.values.salesOrderDate} onChange={date => !isView && validation.setFieldValue("salesOrderDate", date)} />
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <Label className="text-danger fw-medium">Reference PO Order#*</Label>
                                                        <Input name="poOrderNo" value={validation.values.poOrderNo} onBlur={validation.handleBlur} onChange={validation.handleChange}
                                                            disabled={isView}
                                                            invalid={validation.touched.poOrderNo && !!validation.errors.poOrderNo} />
                                                        {validation.touched.poOrderNo && validation.errors.poOrderNo && <div className="text-danger small mt-1">{validation.errors.poOrderNo}</div>}
                                                    </Col>
                                                    <Col md={6}>
                                                        <Label>PO Date</Label>
                                                        <Flatpickr className="form-control" options={{ dateFormat: "d/m/Y", clickOpens: !isView }} value={validation.values.poOrderDate} onChange={date => !isView && validation.setFieldValue("poOrderDate", date)} />
                                                    </Col>
                                                </Row>
                                            </Col>
                                        </Row>
                                        <Row className="mb-4">
                                            <Col md={3}>
                                                <Label className="text-danger fw-medium">Delivery Challan No*</Label>
                                                <Select
                                                    options={deliveryChallanOptions}
                                                    isClearable={!isView}
                                                    isDisabled={isView}
                                                    placeholder="Select Delivery Challan"
                                                    value={deliveryChallanOptions.find(
                                                        dc => dc.value === (validation.values.deliveryNo ? parseInt(validation.values.deliveryNo) : null)
                                                    ) || null}
                                                    onChange={async (opt) => {
                                                        validation.setFieldValue("deliveryNo", opt ? opt.value : "");
                                                        setTouchedSelects(p => ({ ...p, deliveryNo: true }));
                                                    }}
                                                    onBlur={() => setTouchedSelects(p => ({ ...p, deliveryNo: true }))}
                                                    styles={{ control: base => ({ ...base, borderColor: (touchedSelects.deliveryNo && !validation.values.deliveryNo) ? '#f06548' : base.borderColor }) }}
                                                />
                                                {(touchedSelects.deliveryNo || validation.submitCount > 0) && validation.errors.deliveryNo && <div className="text-danger small mt-1">{validation.errors.deliveryNo}</div>}
                                            </Col>
                                            <Col md={3}>
                                                <Label>Delivery Date</Label>
                                                <Flatpickr className="form-control" options={{ dateFormat: "d/m/Y", clickOpens: !isView }} value={validation.values.deliveryDate} onChange={date => !isView && validation.setFieldValue("deliveryDate", date)} />
                                            </Col>
                                            <Col md={3}>
                                                <Label className="fw-medium">Selecting Bank</Label>
                                                <Select
                                                    options={banks}
                                                    isClearable={!isView}
                                                    isDisabled={isView}
                                                    onChange={(opt) => validation.setFieldValue("bankId", opt ? opt.value : "")}
                                                    placeholder="Select Bank"
                                                    value={banks.find(b => b.value === validation.values.bankId) || null}
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <Label className="text-danger fw-medium">Transporter Name*</Label>
                                                <Select
                                                    options={transporters}
                                                    isClearable={!isView}
                                                    isDisabled={isView}
                                                    onChange={async (opt) => {
                                                        validation.setFieldValue("transporterId", opt ? opt.value : "");
                                                        setTouchedSelects(p => ({ ...p, transporterId: true }));

                                                        // Reset Vehicle
                                                        validation.setFieldValue("vehicleNo", "");
                                                        setVehicleOptions([]);

                                                        if (opt && opt.value) {
                                                            try {
                                                                const vehRes = await getVehicles(opt.value);
                                                                const vehicles = vehRes?.data || vehRes || [];
                                                                if (Array.isArray(vehicles)) {
                                                                    setVehicleOptions(vehicles.map(v => ({
                                                                        label: v.vehicleNo || v.VehicleNo || v.vehicle_no,
                                                                        value: v.vehicleNo || v.VehicleNo || v.vehicle_no
                                                                    })));
                                                                }
                                                            } catch (err) {
                                                                console.warn("Failed to fetch vehicles:", err);
                                                            }
                                                        }
                                                    }}
                                                    onBlur={() => setTouchedSelects(p => ({ ...p, transporterId: true }))}
                                                    placeholder="Select Transporter"
                                                    value={transporters.find(t => t.value === validation.values.transporterId) || null}
                                                    styles={{ control: base => ({ ...base, borderColor: (touchedSelects.transporterId && !validation.values.transporterId) ? '#f06548' : base.borderColor }) }}
                                                />
                                                {(touchedSelects.transporterId || validation.submitCount > 0) && validation.errors.transporterId && <div className="text-danger small mt-1">{validation.errors.transporterId}</div>}
                                            </Col>
                                        </Row>
                                        <Row className="mb-4">
                                            <Col md={3}>
                                                <Label>Vehicle No</Label>
                                                <Select
                                                    options={vehicleOptions}
                                                    isClearable={!isView}
                                                    isDisabled={isView}
                                                    placeholder="Select or Enter Vehicle"
                                                    noOptionsMessage={() => "No vehicles found for this transporter"}
                                                    value={vehicleOptions.find(v => v.value === validation.values.vehicleNo) || (validation.values.vehicleNo ? { label: validation.values.vehicleNo, value: validation.values.vehicleNo } : null)}
                                                    onChange={(opt) => validation.setFieldValue("vehicleNo", opt ? opt.value : "")}
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </Col>
                                        </Row>

                                        <div
                                            className="table-responsive mt-4"
                                            ref={itemTableScrollRef}
                                            style={{ maxHeight: "600px", overflowY: "auto", overflowX: "auto" }}
                                        >
                                            <Table className="table-nowrap align-middle mb-0 border" style={{ minWidth: "1200px" }}>
                                                <thead className="table-light">
                                                    <tr>
                                                        <th scope="col" style={{ minWidth: '250px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Item Details</th>
                                                        <th scope="col" style={{ minWidth: '120px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Batch No</th>
                                                        <th scope="col" style={{ minWidth: '150px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Batch Date</th>
                                                        <th scope="col" style={{ minWidth: '100px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Unit</th>
                                                        <th scope="col" style={{ minWidth: '120px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Sub Unit</th>
                                                        <th scope="col" style={{ minWidth: '100px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Sub Qty</th>
                                                        <th scope="col" style={{ minWidth: '80px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Qty</th>
                                                        <th scope="col" style={{ minWidth: '100px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Packing</th>
                                                        <th scope="col" style={{ minWidth: '120px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Rate</th>
                                                        <th scope="col" style={{ minWidth: '80px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>CGST %</th>
                                                        <th scope="col" style={{ minWidth: '80px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>SGST %</th>
                                                        <th scope="col" style={{ minWidth: '120px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Amount</th>
                                                        <th scope="col" style={{ position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {validation.values.lines.map((line, index) => {
                                                        const lineErrors = (validation.errors.lines && validation.errors.lines[index]) || {};
                                                        const lineTouched = (validation.touched.lines && validation.touched.lines[index]) || {};
                                                        const showErr = (field) => (lineTouched[field] || validation.submitCount > 0) && lineErrors[field];
                                                        const profit = calcLineProfitFields(line);
                                                        return (
                                                            <tr key={index}>
                                                                <td>
                                                                    <Select
                                                                        options={products}
                                                                        isDisabled={isView}
                                                                        formatOptionLabel={formatProductOption}
                                                                        filterOption={(option, inputValue) => {
                                                                            const search = inputValue.toLowerCase().trim();
                                                                            if (!search) return true;
                                                                            const label = (option.label || "").toLowerCase();
                                                                            const data = option.data || {};
                                                                            const shortName = (data.shortName || data.ShortName || data.short_name || "").toLowerCase();
                                                                            const name = (data.name || data.Name || data.productName || "").toLowerCase();
                                                                            return label.includes(search) || shortName.includes(search) || name.includes(search);
                                                                        }}
                                                                        value={products.find(p => p.value === line.productId) || null}
                                                                        className="mb-1"
                                                                        onChange={(opt) => {
                                                                            handleLineChange(index, "productId", opt ? opt.value : "");
                                                                            handleLineChange(index, "batchNo", opt ? (opt.batchNo || "") : "");
                                                                            handleLineChange(index, "batchDate", opt ? (opt.batchDate || "") : "");
                                                                            validation.setFieldTouched(`lines[${index}].productId`, true);
                                                                        }}
                                                                        menuPortalTarget={document.body}
                                                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, borderColor: showErr('productId') ? '#f06548' : base.borderColor }) }}
                                                                    />
                                                                    {showErr('productId') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.productId}</div>}
                                                                    <Input type="textarea" rows="1" placeholder="Description" className="form-control-sm mt-1" value={line.description} onChange={(e) => handleLineChange(index, "description", e.target.value)} disabled={isView} />
                                                                </td>
                                                                <td><Input value={line.batchNo} onChange={(e) => handleLineChange(index, "batchNo", e.target.value)} disabled={isView} /></td>
                                                                <td><Flatpickr className="form-control form-control-sm" options={{ dateFormat: "d/m/Y", clickOpens: !isView }} value={line.batchDate} onChange={date => !isView && handleLineChange(index, "batchDate", date)} /></td>
                                                                <td>
                                                                    <Select
                                                                        options={unitOptions}
                                                                        isDisabled={isView}
                                                                        value={unitOptions.find(u => u.value === line.unit) || null}
                                                                        onChange={(opt) => { handleLineChange(index, "unit", opt ? opt.value : ''); validation.setFieldTouched(`lines[${index}].unit`, true); }}
                                                                        classNamePrefix="select"
                                                                        placeholder="Unit*"
                                                                        menuPortalTarget={document.body}
                                                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, borderColor: showErr('unit') ? '#f06548' : base.borderColor }) }}
                                                                    />
                                                                    {showErr('unit') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.unit}</div>}
                                                                </td>
                                                                <td>
                                                                    <Select
                                                                        options={unitOptions}
                                                                        isDisabled={isView}
                                                                        value={unitOptions.find(u => u.value === line.subUnit) || null}
                                                                        onChange={(opt) => { handleLineChange(index, "subUnit", opt ? opt.value : ''); validation.setFieldTouched(`lines[${index}].subUnit`, true); }}
                                                                        classNamePrefix="select"
                                                                        placeholder="SubUnit*"
                                                                        menuPortalTarget={document.body}
                                                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, borderColor: showErr('subUnit') ? '#f06548' : base.borderColor }) }}
                                                                    />
                                                                    {showErr('subUnit') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.subUnit}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input readOnly value={formatToFourDecimals(line.subUnitQuantity)} className="bg-light" />
                                                                </td>
                                                                <td>
                                                                    <Input type="number" step="0.0001" value={line.crt}
                                                                        className="no-spin-input"
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "crt", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "crt", formatToFourDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].crt`, true);
                                                                        }}
                                                                        style={{ borderColor: (showErr('crt') || (stockMap[String(line.productId)] != null && parseFloat(line.crt) > stockMap[String(line.productId)])) ? '#f06548' : '' }} />
                                                                    {showErr('crt') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.crt}</div>}
                                                                    {!showErr('crt') && line.productId && stockMap[String(line.productId)] != null && (
                                                                        parseFloat(line.crt) > stockMap[String(line.productId)]
                                                                            ? <div className="text-danger" style={{ fontSize: '11px' }}>⚠️ Exceeds stock ({stockMap[String(line.productId)].toFixed(3)} available)</div>
                                                                            : <div className="text-success" style={{ fontSize: '11px' }}>✔ In stock ({stockMap[String(line.productId)].toFixed(3)} available)</div>
                                                                    )}
                                                                </td>
                                                                <td><Input type="number" value={formatToFourDecimals(line.packing)} readOnly className="bg-light no-spin-input" /></td>
                                                                <td>
                                                                    <Input type="number" value={line.rate}
                                                                        disabled={isView}
                                                                        className="no-spin-input"
                                                                        onChange={(e) => handleLineChange(index, "rate", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "rate", formatToTwoDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].rate`, true);
                                                                        }}
                                                                        style={{ borderColor: showErr('rate') ? '#f06548' : '' }} />
                                                                    {showErr('rate') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.rate}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input type="number" value={line.cgstPercent}
                                                                        disabled={isView}
                                                                        className="no-spin-input"
                                                                        onChange={(e) => handleLineChange(index, "cgstPercent", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "cgstPercent", formatToTwoDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].cgstPercent`, true);
                                                                        }}
                                                                        style={{ borderColor: showErr('cgstPercent') ? '#f06548' : '' }} />
                                                                    {showErr('cgstPercent') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.cgstPercent}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input type="number" value={line.sgstPercent}
                                                                        disabled={isView}
                                                                        className="no-spin-input"
                                                                        onChange={(e) => handleLineChange(index, "sgstPercent", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "sgstPercent", formatToTwoDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].sgstPercent`, true);
                                                                        }}
                                                                        style={{ borderColor: showErr('sgstPercent') ? '#f06548' : '' }} />
                                                                    {showErr('sgstPercent') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.sgstPercent}</div>}
                                                                </td>
                                                                <td><Input readOnly value={formatToTwoDecimals(line.totalAmount || 0)} className="bg-light no-spin-input" style={{ width: '100px' }} /></td>
                                                                <td>
                                                                    {!isView && (
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
                                                            <td colSpan={13} className="py-2" style={{ background: "#fff" }}>
                                                                <Button
                                                                    type="button"
                                                                    color="link"
                                                                    className="text-primary p-0 fw-medium"
                                                                    onClick={handleAddLine}
                                                                >
                                                                    <i className="ri-add-line align-bottom"></i> Add New Row
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr className="table-light fw-semibold">
                                                        <td style={stickyFooterCellStyle}>Total</td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                        <td style={stickyFooterCellStyle}>{formatToFourDecimals(itemTotals.subUnitQuantity)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToFourDecimals(itemTotals.crt)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToFourDecimals(itemTotals.packing)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.rate)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.cgstPercent)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.sgstPercent)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.totalAmount)}</td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </div>

                                        <Row className="mt-4">
                                            <Col md={8}>
                                                <Label>General Description / Notes</Label>
                                                <Input type="textarea" rows="4" name="description" value={validation.values.description} onChange={validation.handleChange} placeholder="Notes to display on PO" disabled={isView} />
                                            </Col>
                                            <Col md={4}>
                                                <div className="p-3 bg-light rounded shadow-sm border border-2 border-primary border-opacity-10">
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span className="text-muted">Sub Total</span>
                                                        <span>{formatToTwoDecimals(validation.values.taxableAmount)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2 text-info">
                                                        <span>CGST Amount</span>
                                                        <span>{formatToTwoDecimals(validation.values.cgstAmount)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2 text-info">
                                                        <span>SGST Amount</span>
                                                        <span>{formatToTwoDecimals(validation.values.sgstAmount)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>Discount</span>
                                                        <Input 
                                                            type="number" 
                                                            name="totDiscount" 
                                                            className="form-control-sm text-end no-spin-input" 
                                                            style={{ width: '100px' }}
                                                            value={validation.values.totDiscount} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                validation.setFieldValue("totDiscount", val);
                                                                calculateTotals(validation.values.lines, { totDiscount: val });
                                                            }}
                                                            disabled={isView}
                                                        />
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <span>Round Off</span>
                                                        <Input 
                                                            type="number" 
                                                            name="roundOff" 
                                                            className="form-control-sm text-end no-spin-input" 
                                                            style={{ width: '100px' }}
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
                                                    <hr />
                                                    <div className="d-flex justify-content-between fw-bold h5 mb-2">
                                                        <span>Grand Total ( ₹ )</span>
                                                        <span className="text-success">{formatToTwoDecimals(validation.values.grandTotal)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-1 small">
                                                        <span className="text-muted">Previous Outstanding</span>
                                                        <span>{formatToTwoDecimals(validation.values.previousOutstanding)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between fw-bold border-top pt-2">
                                                        <span>Final Balance</span>
                                                        <span className="text-primary">{formatToTwoDecimals(validation.values.finalOutstanding)}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <Label>Jurisdiction</Label>
                                                    <Input name="jurisdiction" value={validation.values.jurisdiction} onChange={validation.handleChange} disabled={isView} />
                                                </div>
                                            </Col>
                                        </Row>

                                        <div className="hstack gap-2 justify-content-end mt-4">
                                            <Button type="button" color="light" onClick={() => history("/sales-order")}>{isView ? "Back" : "Cancel"}</Button>
                                            {!isView && <Button type="submit" color="primary" className="px-4">Save and Send</Button>}
                                        </div>
                                    </Form>

                                    <Modal isOpen={isCopyPreviousModalOpen} toggle={() => setIsCopyPreviousModalOpen(!isCopyPreviousModalOpen)} size="lg" centered modalClassName="zoomIn">
                                        <ModalHeader toggle={() => setIsCopyPreviousModalOpen(false)}>Copy from Previous Invoice</ModalHeader>
                                        <ModalBody>
                                            <div className="table-responsive" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                                                <Table className="align-middle table-nowrap mb-0">
                                                    <thead className="table-light text-muted">
                                                        <tr>
                                                            <th scope="col">Inv No</th>
                                                            <th scope="col">Date</th>
                                                            <th scope="col" className="text-end">Total Qty</th>
                                                            <th scope="col" className="text-end">Amount</th>
                                                            <th scope="col" className="text-center">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {previousInvoices.length > 0 ? (
                                                            previousInvoices.map((inv, idx) => {
                                                                const code = inv.spUniqueCode || inv.SpUniqueCode;
                                                                return (
                                                                    <tr key={idx}>
                                                                        <td>{inv.invNo || inv.InvNo}</td>
                                                                        <td>{new Date(inv.invDate || inv.InvDate).toLocaleDateString('en-GB')}</td>
                                                                        <td className="text-end">{qtyByCode[code] !== undefined ? formatToFourDecimals(qtyByCode[code]) : <span className="text-muted small italic">Loading...</span>}</td>
                                                                        <td className="text-end">{formatToTwoDecimals(inv.grandTotal || inv.GrandTotal)}</td>
                                                                        <td className="text-center">
                                                                            <Button color="soft-info" size="sm" onClick={() => selectPreviousInvoice(code)}>
                                                                                Select & Copy
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="4" className="text-center">No previous invoices found for this customer</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </ModalBody>
                                        <ModalFooter>
                                            <Button color="secondary" onClick={() => setIsCopyPreviousModalOpen(false)}>Close</Button>
                                        </ModalFooter>
                                    </Modal>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default SalesTransactionCreate;
