import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    CardBody, Row, Col, Card, Container, Form, Input, Label, Table, FormFeedback, Button,
    Modal, ModalHeader, ModalBody, ModalFooter, Badge, UncontrolledTooltip
} from "reactstrap";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import { formatToTwoDecimals } from "../../utils/numberUtils";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";
import secureStorage from "../../utils/secureStorage";
import { useDispatch, useSelector } from "react-redux";
import {
    addNewPurchaseTransaction as onAddNewPurchaseTransaction,
    updatePurchaseTransaction as onUpdatePurchaseTransaction,
} from "../../slices/thunks";
import { resetPurchaseTransactionCreated } from "../../slices/purchaseTransaction/reducer";
import { getVendors, getProductsForPurchase, getPartyDetails, getTransporters, getUnits, getPurchaseTransactionDetails, getDeliveryChallans, getPurchaseTransactions, getBanks, getVehicles } from "../../helpers/fakebackend_helper";
import { getSelectedFiscalYearId } from "../../utils/fiscalYearStorage";

const PurchaseTransactionCreate = () => {
    const dispatch = useDispatch();
    const history = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isView = queryParams.get('view') === 'true';
    const isEdit = !!id;

    const { isPurchaseTransactionCreated } = useSelector(state => state.PurchaseTransaction);

    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [transporters, setTransporters] = useState([]);
    const [units, setUnits] = useState([]);
    const [deliveryChallanOptions, setDeliveryChallanOptions] = useState([]);
    const [allPurchaseOrders, setAllPurchaseOrders] = useState([]);
    const [banks, setBanks] = useState([]);
    const [vehicleOptions, setVehicleOptions] = useState([]);
    const [touchedSelects, setTouchedSelects] = useState({});
    const [selectedVendorDetails, setSelectedVendorDetails] = useState(null);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [discountType, setDiscountType] = useState('percent'); // 'percent' or 'amount'

    // Stabilize constant values outside or with useMemo
    const today = useMemo(() => new Date(), []);

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
                const id = u.unit_id ?? u.unitId ?? u.UnitId ?? u.unitMasterId ?? u.UnitMasterId ?? u.id ?? u.value;
                if (id !== null && id !== undefined && id !== "") {
                    map.set(Number(id), u);
                }
            });
        }
        return map;
    }, [units]);

    const unitOptions = useMemo(() => {
        return (units || []).map(u => ({
            label: u.unitName || u.UnitName || u.label,
            value: u.unitId || u.UnitId || u.value,
        }));
    }, [units]);

    useEffect(() => {
        // Clear any stale success flag from a previous session on mount
        dispatch(resetPurchaseTransactionCreated());

        const fetchInitialData = async () => {
            try {
                console.log("Fetching initial data for Purchase Transaction...");
                const [vendorData, productData, transporterData, unitData, deliveryChallanData, allPOs, bankData] = await Promise.all([
                    getVendors(),
                    getProductsForPurchase(),
                    getTransporters(),
                    getUnits(),
                    getDeliveryChallans(),
                    getPurchaseTransactions(),
                    getBanks()
                ]);
                const allPOData = Array.isArray(allPOs) ? allPOs : (allPOs?.data || []);
                if (Array.isArray(allPOData)) setAllPurchaseOrders(allPOData);

                console.log("Data fetched:", { vendorData, productData, transporterData, unitData, bankData });

                if (Array.isArray(vendorData)) {
                    setVendors(vendorData.map(v => ({ label: v.displayName || v.DisplayName || v.name || v.Name, value: v.partyId || v.PartyId })));
                } else {
                    console.warn("vendorData is not an array:", vendorData);
                }

                const productArray = Array.isArray(productData)
                    ? productData
                    : (Array.isArray(productData?.data) ? productData.data : []);

                if (Array.isArray(productArray)) {
                    setProducts(productArray.map(p => ({
                        label: p.name || p.Name,
                        value: p.productId || p.ProductId,
                        rate: p.costPrice || p.CostPrice || 0,
                        mrp: p.mrp || p.MRP || p.Mrp || 0,
                        type: p.type || p.Type,
                        hsnCode: p.hsnOrSACCode || p.HSNCode || p.SACCode || "N/A",
                        taxGroupId: p.taxGroupId || 0,
                        unitId: p.unitId ?? p.UnitId ?? 0,
                        productPackingUnit: p.productPackingUnit ?? p.ProductPackingUnit ?? null,
                        batchNo: p.batchNo || p.BatchNo || "",
                        batchDate: p.batchDate || p.BatchDate || "",
                        cgstPer: p.cgstPer || p.CGSTPer || 0,
                        sgstPer: p.sgstPer || p.SGSTPer || 0,
                        crt: p.crt ?? p.Crt ?? null,
                        packingUnits: p.packingUnits ?? p.PackingUnits ?? null,
                        baseUnit: p.baseUnit ?? p.BaseUnit ?? null,
                        packingUnit: p.packingUnit ?? p.PackingUnit ?? null,
                    })));
                } else {
                    console.warn("productData is not an array:", productData);
                }

                if (Array.isArray(transporterData)) {
                    setTransporters(transporterData.map(t => ({ label: t.transporterName || t.TransporterName, value: t.transporterId || t.TransporterId })));
                } else {
                    console.warn("transporterData is not an array:", transporterData);
                }

                const unitArray = Array.isArray(unitData)
                    ? unitData
                    : (Array.isArray(unitData?.data) ? unitData.data : []);

                if (Array.isArray(unitArray)) {
                    // Keep full unit objects to access crt/packing_units for conversion logic
                    console.log("[PurchaseOrder] Raw unit data sample:", unitArray[0]);
                    setUnits(unitArray);
                } else {
                    console.warn("unitData is not an array:", unitData);
                }

                if (Array.isArray(deliveryChallanData)) {
                    setDeliveryChallanOptions(
                        deliveryChallanData.map(dc => ({
                            label: dc.challanNumber || dc.challan_number || `DC-${dc.deliveryChallanId || dc.delivery_challan_id}`,
                            value: dc.deliveryChallanId || dc.delivery_challan_id
                        }))
                    );
                } else {
                    console.warn("deliveryChallanData is not an array:", deliveryChallanData);
                }

                if (Array.isArray(bankData)) {
                    setBanks(
                        bankData.map(b => ({
                            label: b.bankName || b.BankName || b.name || b.Name,
                            value: b.bankMasterId || b.BankMasterId || b.bank_master_id || b.id
                        }))
                    );
                } else {
                    console.warn("bankData is not an array:", bankData);
                }

                if (isEdit) {
                    const editData = await getPurchaseTransactionDetails(id);
                    console.log("Edit data fetched:", editData);
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
                            invDate: parseDate(header.invDate || header.InvDate) || today,
                            salesOrderDate: parseDate(header.salesOrderDate || header.SalesOrderDate) || "",
                            poOrderDate: parseDate(header.poOrderDate || header.PoOrderDate) || "",
                            deliveryDate: parseDate(header.deliveryDate || header.DeliveryDate) || "",
                            deliveryNo: header.deliveryNo || header.DeliveryNo || "",
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
                            lines: (editData.lines || []).map(l => ({
                                ...l,
                                batchDate: parseDate(l.batchDate || l.BatchDate) || "",
                                discountPer: parseFloat(l.discountPer ?? l.DiscountPer ?? 0)
                            }))
                        });
                        handleVendorChange({ value: header.partyId || header.PartyId });
                    }
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };
        fetchInitialData();
    }, [id, isEdit]);

    const initialValues = useMemo(() => ({
        companyId: parseInt(secureStorage.getPlain('companyId')) || 1,
        invType: "Purchase",
        invNo: "",
        invoiceSeries: "",
        invoiceSeriesIncrementNumber: 1,
        invDate: today,
        salesOrderNo: "",
        salesOrderDate: today,
        poOrderNo: "",
        poOrderDate: today,
        deliveryNo: "",
        deliveryDate: today,
        vehicleNo: "",
        bankId: "",
        transporterId: "",
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
        grandTotal: "0.00",
        netInvoiceAmount: "0.00",
        description: "",
        totSkuInInvoice: 0,
        lines: [
            {
                spUniqueCode: 0,
                productId: "",
                productDetails: "",
                description: "",
                batchNo: "",
                batchDate: today,
                mrp: "0.00",
                subUnit: "",
                subUnitQuantity: 0,
                unit: "",
                quantity: 1,
                crt: 1,
                packing: "",
                rate: "0.00",
                discountPer: "0.00",
                amount: "0.00",
                cgstPercent: "0.00",
                cgstAmount: "0.00",
                sgstPercent: "0.00",
                sgstAmount: "0.00",
                totalAmount: "0.00"
            }
        ]
    }), [today]);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues: initialValues,
        validationSchema: Yup.object({
            partyId: Yup.mixed().required("Vendor Name is required").test('not-empty', 'Vendor Name is required', v => !!v && v !== ''),
            invNo: Yup.string().required("Purchase Order# is required"),
            salesOrderNo: Yup.string().required("Reference SO# is required"),
            deliveryNo: Yup.mixed().required("Delivery Challan No is required").test('not-empty', 'Delivery Challan No is required', v => !!v && v !== ''),
            transporterId: Yup.mixed().required("Transporter Name is required").test('not-empty', 'Transporter Name is required', v => !!v && v !== ''),
            lines: Yup.array().of(
                Yup.object({
                    productId: Yup.mixed().required("Product is required").test('not-empty', 'Product is required', v => !!v && v !== ''),
                    unit: Yup.mixed().required("Unit is required").test('not-empty', 'Unit is required', v => !!v && v !== ''),
                    subUnit: Yup.mixed().required("Sub Unit is required").test('not-empty', 'Sub Unit is required', v => !!v && v !== ''),
                    quantity: Yup.number().typeError("Must be a number").required("Quantity is required").min(0.01, "Quantity must be > 0"),
                    rate: Yup.number().typeError("Must be a number").required("Rate is required").min(0.01, "Rate must be > 0"),
                    cgstPercent: Yup.number().typeError("Must be a number").required("CGST % is required").min(0, "Cannot be negative"),
                    sgstPercent: Yup.number().typeError("Must be a number").required("SGST % is required").min(0, "Cannot be negative"),
                })
            ),
        }),
        onSubmit: async (values) => {
            // ---- Duplicate invNo check ----
            if (!isEdit) {
                const duplicate = allPurchaseOrders.find(
                    po => (po.invNo || po.InvNo || '').toString().trim().toLowerCase() === values.invNo.trim().toLowerCase()
                );
                if (duplicate) {
                    validation.setFieldError('invNo', 'This Purchase Order# already exists. Please use a unique number.');
                    return;
                }
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
                    bankId: values.bankId ? parseInt(values.bankId) : null,
                    invoiceSeriesIncrementNumber: values.invoiceSeriesIncrementNumber
                        ? parseInt(values.invoiceSeriesIncrementNumber)
                        : null,
                    spUniqueCode: id ? parseInt(id) : 0,
                    partyId: values.partyId ? parseInt(values.partyId) : 0,
                    roundOff: parseFloat(values.roundOff) || 0,
                    totDiscount: parseFloat(values.totDiscount) || 0,
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
                    crt: line.crt ? parseFloat(line.crt) : 1,
                    packing: line.packing ? line.packing.toString() : null,
                    rate: line.rate ? parseFloat(line.rate) : 0,
                    discountPer: line.discountPer ? parseFloat(line.discountPer) : 0,
                    amount: line.amount ? parseFloat(line.amount) : 0,
                    totalAmount: line.totalAmount ? parseFloat(line.totalAmount) : 0
                }))
            };

            console.log("Submitting Purchase Transaction Payload:", payload);

            if (isEdit) {
                dispatch(onUpdatePurchaseTransaction(payload));
            } else {
                dispatch(onAddNewPurchaseTransaction(payload));
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

        const duplicate = (allPurchaseOrders || []).find((po) => {
            const poInvNo = (po.invNo || po.InvNo || "").toString().trim().toLowerCase();
            const sameCurrentRecord = id && String(po.spUniqueCode || po.SpUniqueCode || po.id || "") === String(id);
            return poInvNo === invNo && !sameCurrentRecord;
        });

        if (duplicate) {
            validation.setFieldError("invNo", "This Purchase Order# already exists. Please use a unique number.");
        } else if (validation.errors.invNo && validation.errors.invNo.includes("already exists")) {
            validation.setFieldError("invNo", undefined);
        }
    }, [allPurchaseOrders, id, isEdit, isView, validation.errors.invNo]);

    useEffect(() => {
        if (isEdit || isView) return;
        checkDuplicateInvNo(validation.values.invNo);
    }, [validation.values.invNo, checkDuplicateInvNo, isEdit, isView]);

    useEffect(() => {
        if (isPurchaseTransactionCreated) {
            history("/purchase-transaction/list");
        }
    }, [isPurchaseTransactionCreated, history]);

    const calculateTotals = useCallback((lines, overrides = {}) => {
        let taxableAmount = 0;
        let cgstAmount = 0;
        let sgstAmount = 0;
        let grandTotal = 0;

        let lineTotalWithTax = 0;
        const updatedLines = lines.map(line => {
            const qty = parseFloat(line.quantity) || 0;
            const rate = parseFloat(line.rate) || 0;
            const discP = parseFloat(line.discountPer) || 0;

            const gross = qty * rate;
            const discAmount = gross * (discP / 100);
            const amount = gross - discAmount;

            const crt = parseFloat(line.crt) || 1;
            const subUnitQuantity = crt;
            const packing = qty * subUnitQuantity;

            const cgstP = parseFloat(line.cgstPercent) || 0;
            const sgstP = parseFloat(line.sgstPercent) || 0;

            const lineCgst = amount * (cgstP / 100);
            const lineSgst = amount * (sgstP / 100);

            taxableAmount += amount;
            cgstAmount += lineCgst;
            sgstAmount += lineSgst;
            lineTotalWithTax += (amount + lineCgst + lineSgst);

            return {
                ...line,
                amount: amount,
                cgstAmount: lineCgst,
                sgstAmount: lineSgst,
                totalAmount: amount + lineCgst + lineSgst,
                subUnitQuantity: subUnitQuantity,
                packing: packing
            };
        });


        const discPercentInput = overrides.hasOwnProperty('discountPercent') ? overrides.discountPercent : validation.values.discountPercent;
        const discAmountInput = overrides.hasOwnProperty('totDiscount') ? overrides.totDiscount : validation.values.totDiscount;

        let discPercent = isNaN(parseFloat(discPercentInput)) ? 0 : parseFloat(discPercentInput);
        let discAmount = isNaN(parseFloat(discAmountInput)) ? 0 : parseFloat(discAmountInput);

        const currentDiscountType = overrides.discountType || discountType;

        if (currentDiscountType === 'percent') {
            if (overrides.hasOwnProperty('discountPercent')) {
                discAmount = taxableAmount * (discPercent / 100);
            } else if (!overrides.hasOwnProperty('totDiscount')) {
                discAmount = taxableAmount * (discPercent / 100);
            }
        } else {
            // Amount mode
            if (overrides.hasOwnProperty('totDiscount')) {
                discPercent = taxableAmount > 0 ? parseFloat(((discAmount / taxableAmount) * 100).toFixed(2)) : 0;
            } else if (discAmount > 0 && taxableAmount > 0) {
                discPercent = parseFloat(((discAmount / taxableAmount) * 100).toFixed(2));
            }
        }

        const netAmountBeforeRound = lineTotalWithTax - discAmount;
        let finalGrandTotal = 0;
        let finalRoundOff = 0;

        // Check if manual mode is enabled
        const isManual = overrides.hasOwnProperty('isRoundOffManual') ? overrides.isRoundOffManual : validation.values.isRoundOffManual;
        const roundOffInput = overrides.hasOwnProperty('roundOff') ? overrides.roundOff : validation.values.roundOff;
        const manualVal = isNaN(parseFloat(roundOffInput)) ? 0 : parseFloat(roundOffInput);

        if (isManual) {
            finalRoundOff = manualVal;
            finalGrandTotal = netAmountBeforeRound + finalRoundOff;
        } else {
            finalGrandTotal = Math.round(netAmountBeforeRound);
            finalRoundOff = finalGrandTotal - netAmountBeforeRound;
        }

        grandTotal = finalGrandTotal;
        const roundOff = finalRoundOff;

        validation.setFieldValue("taxableAmount", taxableAmount);
        
        // Only update discount fields if the user isn't currently typing in them
        if (!overrides.hasOwnProperty('totDiscount')) {
            validation.setFieldValue("totDiscount", currentDiscountType === 'percent' ? discAmount : discAmountInput);
        }
        if (!overrides.hasOwnProperty('discountPercent')) {
            validation.setFieldValue("discountPercent", currentDiscountType === 'amount' ? discPercent : discPercentInput);
        }

        if (!isManual) {
            validation.setFieldValue("roundOff", roundOff);
        } else if (!overrides.hasOwnProperty('roundOff')) {
            validation.setFieldValue("roundOff", roundOffInput);
        }

        validation.setFieldValue("isRoundOffManual", isManual);
        validation.setFieldValue("cgstAmount", cgstAmount);
        validation.setFieldValue("sgstAmount", sgstAmount);
        validation.setFieldValue("cgstPercent", taxableAmount > 0 ? (cgstAmount / taxableAmount) * 100 : 0);
        validation.setFieldValue("sgstPercent", taxableAmount > 0 ? (sgstAmount / taxableAmount) * 100 : 0);
        validation.setFieldValue("grandTotal", grandTotal);
        validation.setFieldValue("netInvoiceAmount", grandTotal);
        validation.setFieldValue("totSkuInInvoice", updatedLines.length);
        validation.setFieldValue("lines", updatedLines);
    }, [validation.values, validation.setFieldValue, discountType]);

    const handleAddLine = () => {
        const newLines = [
            ...validation.values.lines,
            {
                spUniqueCode: id ? parseInt(id) : 0,
                productId: "", productDetails: "", description: "", batchNo: "", batchDate: today, mrp: 0,
                subUnit: "", subUnitQuantity: 0, unit: "",
                quantity: 1, crt: 1, packing: "",
                rate: 0, discountPer: 0, amount: 0, cgstPercent: 0, cgstAmount: 0, sgstPercent: 0, sgstAmount: 0, totalAmount: 0
            }
        ];
        validation.setFieldValue("lines", newLines);
    };

    const handleRemoveLine = (index) => {
        const lines = [...validation.values.lines];
        lines.splice(index, 1);
        calculateTotals(lines);
    };

    const handleLineChange = (index, field, value) => {
        const lines = [...validation.values.lines];
        lines[index][field] = value;

        // Auto-fill logic for Product selection
        if (field === "productId" && value) {
            const selectedProd = products.find(p => p.value == value);
            if (selectedProd) {
                const baseUnitId = Number(selectedProd.unitId) || 0;
                const packingUnitId = Number(selectedProd.productPackingUnit) || baseUnitId || 0;

                // DIAGNOSTIC: dump the map keys and the IDs being looked up
                console.log("[PurchaseOrder] unitById keys:", [...unitById.keys()]);
                console.log("[PurchaseOrder] looking up baseUnitId:", baseUnitId, "packingUnitId:", packingUnitId);
                console.log("[PurchaseOrder] selectedProd raw:", JSON.stringify(selectedProd));

                const baseUnit = unitById.get(baseUnitId);
                const packingUnit = unitById.get(packingUnitId);

                console.log("[PurchaseOrder] Product selected:", selectedProd);
                console.log("[PurchaseOrder] Units found:", { baseUnit, packingUnit });

                const crtValue =                 
                    getCrtFromUnit(packingUnit) ||
                    //getCrtFromUnit(baseUnit) ||
                    1;
                
                console.log("[PurchaseOrder] Calculated crtValue:", crtValue);

                lines[index].productDetails = selectedProd.label;
                lines[index].rate = selectedProd.rate;
                lines[index].mrp = selectedProd.mrp || 0;
                lines[index].unit = packingUnitId || "";
                lines[index].subUnit = baseUnitId || "";
                lines[index].batchNo = selectedProd.batchNo || "";
                lines[index].batchDate = selectedProd.batchDate || "";
                lines[index].cgstPercent = selectedProd.cgstPer || 0;
                lines[index].sgstPercent = selectedProd.sgstPer || 0;
                lines[index].crt = crtValue;
                lines[index].subUnitQuantity = crtValue;
                lines[index].packing = (parseFloat(lines[index].quantity) || 1) * crtValue;
            }
        } else if ((field === "unit" || field === "subUnit") && value) {
            const currentLine = lines[index];
            const baseUnitId = Number(field === "subUnit" ? value : currentLine.subUnit) || 0;
            const packingUnitId = Number(field === "unit" ? value : currentLine.unit) || 0;
            const baseUnit = unitById.get(baseUnitId);
            const packingUnit = unitById.get(packingUnitId);
            
            const crtValue = 
                getCrtFromUnit(packingUnit) ||
                getCrtFromUnit(baseUnit) ||
                1;
            lines[index].crt = crtValue;
            lines[index].subUnitQuantity = crtValue;
            lines[index].packing = (parseFloat(lines[index].quantity) || 0) * crtValue;
        }

        calculateTotals(lines);
    };

    const handleVendorChange = async (opt) => {
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

            // Comprehensive fallbacks for GST and Treatment
            const gstTreatment = party.GSTTreatment || party.gstTreatment || party.gst_treatment || "Unregistered Business";
            const gstNo = party.GSTNO || party.gstNo || party.gstno || party.gst_no || "";

            validation.setFieldValue("gstTreatment", gstTreatment);
            validation.setFieldValue("gstNo", gstNo);
            validation.setFieldValue("placeOfSupply", party.placeOfSupply || party.PlaceOfSupply || party.place_of_supply || "");

            setSelectedVendorDetails({ ...party, billing, shipping });
        } catch (error) {
            console.error("Error fetching vendor details:", error);
        }
    };

    const formatProductOption = (option) => (
        <div className="d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center">
                <span className="fw-medium">{option.label}</span>
                <Badge color={option.type === "Goods" ? "info" : "success"} className="ms-2">{option.type}</Badge>
            </div>
            <small className="text-muted">HSN Code: {option.hsnCode}</small>
        </div>
    );

    const itemTotals = useMemo(() => {
        return (validation.values.lines || []).reduce((acc, line) => {
            acc.quantity += Number(line?.quantity || 0);
            acc.subUnitQuantity += Number(line?.subUnitQuantity || 0);
            acc.rate += Number(line?.rate || 0);
            acc.mrp += Number(line?.mrp || 0);
            acc.cgstPercent += Number(line?.cgstPercent || 0);
            acc.sgstPercent += Number(line?.sgstPercent || 0);
            acc.totalAmount += Number(line?.totalAmount || 0);
            return acc;
        }, {
            quantity: 0,
            subUnitQuantity: 0,
            rate: 0,
            mrp: 0,
            cgstPercent: 0,
            sgstPercent: 0,
            totalAmount: 0
        });
    }, [validation.values.lines]);

    const stickyFooterCellStyle = {
        position: "sticky",
        bottom: 0,
        background: "#f3f6f9",
        zIndex: 2
    };

    document.title = isView ? "View Purchase Transaction | SoftBook" : (isEdit ? "Edit Purchase Transaction | SoftBook" : "Create Purchase Transaction | SoftBook");

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={isView ? "View Purchase Order" : (isEdit ? "Edit Purchase Order" : "New Purchase Order")} pageTitle="Purchase Transactions" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <Form onSubmit={validation.handleSubmit}>
                                        <Row className="mb-4">
                                            <Col md={6}>
                                                <Label className="text-danger fw-medium">Vendor Name*</Label>
                                                <div className="d-flex gap-2">
                                                    <div className="flex-grow-1">
                                                        <Select
                                                            options={vendors}
                                                            isDisabled={isView}
                                                            onChange={(opt) => { handleVendorChange(opt); setTouchedSelects(p => ({ ...p, partyId: true })); }}
                                                            onBlur={() => setTouchedSelects(p => ({ ...p, partyId: true }))}
                                                            placeholder="Select Vendor"
                                                            classNamePrefix="select"
                                                            value={vendors.find(v => v.value === validation.values.partyId) || null}
                                                            styles={{ control: base => ({ ...base, borderColor: (touchedSelects.partyId && !validation.values.partyId) ? '#f06548' : base.borderColor }) }}
                                                        />
                                                    </div>
                                                    <Button color="primary" onClick={() => setIsAddressModalOpen(true)} disabled={!validation.values.partyId || isView}>
                                                        <i className="ri-edit-2-line"></i>
                                                    </Button>
                                                </div>
                                                {(touchedSelects.partyId || validation.submitCount > 0) && validation.errors.partyId && <div className="text-danger mt-1 small">{validation.errors.partyId}</div>}

                                                {selectedVendorDetails && (
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
                                                        <hr className="my-2" />
                                                        <Row>
                                                            <Col md={4}>
                                                                <small className="text-muted d-block">GST Treatment</small>
                                                                <span className="small">{validation.values.gstTreatment}</span>
                                                            </Col>
                                                            <Col md={4}>
                                                                <small className="text-muted d-block">GST No</small>
                                                                <span className="small">{validation.values.gstNo || "N/A"}</span>
                                                            </Col>
                                                            <Col md={4}>
                                                                <small className="text-muted d-block">Place of Supply</small>
                                                                <span className="small">{validation.values.placeOfSupply}</span>
                                                            </Col>
                                                        </Row>
                                                    </div>
                                                )}
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
                                                            placeholder="PO-00001"
                                                            disabled={isView}
                                                            invalid={(validation.touched.invNo || !!validation.values.invNo) && !!validation.errors.invNo}
                                                        />
                                                        {(validation.touched.invNo || !!validation.values.invNo) && validation.errors.invNo && <div className="text-danger small mt-1">{validation.errors.invNo}</div>}
                                                    </Col>
                                                    <Col md={6}>
                                                        <Label className="text-danger fw-medium">Reference SO#*</Label>
                                                        <Input name="salesOrderNo" value={validation.values.salesOrderNo} onBlur={validation.handleBlur} onChange={validation.handleChange}
                                                            disabled={isView}
                                                            invalid={validation.touched.salesOrderNo && !!validation.errors.salesOrderNo} />
                                                        {validation.touched.salesOrderNo && validation.errors.salesOrderNo && <div className="text-danger small mt-1">{validation.errors.salesOrderNo}</div>}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3">
                                                    <Col md={6}>
                                                        <Label>Invoice Series</Label>
                                                        <Input
                                                            name="invoiceSeries"
                                                            value={validation.values.invoiceSeries}
                                                            onChange={validation.handleChange}
                                                            placeholder="Series (e.g. GST)"
                                                            disabled={isView}
                                                        />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Label>Starting #</Label>
                                                        <Input
                                                            type="number"
                                                            name="invoiceSeriesIncrementNumber"
                                                            value={validation.values.invoiceSeriesIncrementNumber}
                                                            onChange={validation.handleChange}
                                                            disabled={isView}
                                                        />
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
                                                        <Label>PO Order#</Label>
                                                        <Input name="poOrderNo" value={validation.values.poOrderNo} onChange={validation.handleChange} disabled={isView} />
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
                                                    isClearable
                                                    placeholder="Select Delivery Challan"
                                                    value={deliveryChallanOptions.find(
                                                        dc => dc.value === (validation.values.deliveryNo ? parseInt(validation.values.deliveryNo) : null)
                                                    ) || null}
                                                    onChange={(opt) => { validation.setFieldValue("deliveryNo", opt ? opt.value : ""); setTouchedSelects(p => ({ ...p, deliveryNo: true })); }}
                                                    onBlur={() => setTouchedSelects(p => ({ ...p, deliveryNo: true }))}
                                                    styles={{ control: base => ({ ...base, borderColor: (touchedSelects.deliveryNo && !validation.values.deliveryNo) ? '#f06548' : base.borderColor }) }}
                                                />
                                                {(touchedSelects.deliveryNo || validation.submitCount > 0) && validation.errors.deliveryNo && <div className="text-danger small mt-1">{validation.errors.deliveryNo}</div>}
                                            </Col>
                                            <Col md={3}>
                                                <Label>Delivery Date</Label>
                                                <Flatpickr className="form-control" options={{ dateFormat: "d/m/Y" }} value={validation.values.deliveryDate} onChange={date => validation.setFieldValue("deliveryDate", date)} />
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

                                                        // Reset vehicle when transporter changes
                                                        validation.setFieldValue("vehicleNo", "");
                                                        setVehicleOptions([]);

                                                        if (opt && opt.value) {
                                                            try {
                                                                const vehRes = await getVehicles(opt.value);
                                                                const vehicles = vehRes?.data || vehRes || [];
                                                                if (Array.isArray(vehicles)) {
                                                                    setVehicleOptions(
                                                                        vehicles.map(v => ({
                                                                            label: v.vehicleNo || v.VehicleNo || v.vehicle_no,
                                                                            value: v.vehicleNo || v.VehicleNo || v.vehicle_no
                                                                        }))
                                                                    );
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
                                            {validation.values.transporterId && (
                                                <Col md={3}>
                                                    <Label>Vehicle No</Label>
                                                    <Select
                                                        options={vehicleOptions}
                                                        isClearable={!isView}
                                                        isDisabled={isView}
                                                        placeholder="Select or Enter Vehicle"
                                                        noOptionsMessage={() => "No vehicles found for this transporter"}
                                                        value={
                                                            vehicleOptions.find(v => v.value === validation.values.vehicleNo) ||
                                                            (validation.values.vehicleNo
                                                                ? { label: validation.values.vehicleNo, value: validation.values.vehicleNo }
                                                                : null)
                                                        }
                                                        onChange={(opt) => validation.setFieldValue("vehicleNo", opt ? opt.value : "")}
                                                    />
                                                </Col>
                                            )}
                                        </Row>

                                        <div className="table-responsive mt-4" style={{ maxHeight: "380px", overflowY: "auto", overflowX: "auto" }}>
                                            <Table className="table-nowrap align-middle mb-0 border" style={{ minWidth: "1500px" }}>
                                                <thead className="table-light">
                                                    <tr>
                                                        <th scope="col" style={{ minWidth: '250px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Item Details</th>
                                                        <th scope="col" style={{ minWidth: '120px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Batch No</th>
                                                        <th scope="col" style={{ minWidth: '150px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Batch Date</th>
                                                        <th scope="col" style={{ minWidth: '100px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Unit</th>
                                                        <th scope="col" style={{ minWidth: '100px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Quantity</th>
                                                        <th scope="col" style={{ minWidth: '120px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Sub Unit</th>
                                                        <th scope="col" style={{ minWidth: '100px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Sub Qty</th>
                                                        <th scope="col" style={{ minWidth: '120px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>Rate</th>
                                                        <th scope="col" style={{ minWidth: '100px', position: "sticky", top: 0, zIndex: 2, background: "#f3f6f9" }}>MRP</th>
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
                                                        return (
                                                            <tr key={index}>
                                                                <td>
                                                                    <Select
                                                                        options={products}
                                                                        isDisabled={isView}
                                                                        formatOptionLabel={formatProductOption}
                                                                        value={products.find(p => p.value === line.productId) || null}
                                                                        className="mb-1"
                                                                        onChange={(opt) => {
                                                                         if (!opt) return;
                                                                         handleLineChange(index, "productId", opt.value);
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
                                                                        value={unitOptions.find(u => u.value === line.unit) || null}
                                                                        onChange={(opt) => { handleLineChange(index, "unit", opt ? opt.value : ''); validation.setFieldTouched(`lines[${index}].unit`, true); }}
                                                                        classNamePrefix="select"
                                                                        placeholder="Unit*"
                                                                        isDisabled={isView || !!line.productId}
                                                                        menuPortalTarget={document.body}
                                                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, borderColor: showErr('unit') ? '#f06548' : base.borderColor }) }}
                                                                    />
                                                                    {showErr('unit') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.unit}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input type="number" value={line.quantity}
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "quantity", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "quantity", formatToTwoDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].quantity`, true);
                                                                        }}
                                                                        style={{ borderColor: showErr('quantity') ? '#f06548' : '' }} />
                                                                    {showErr('quantity') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.quantity}</div>}
                                                                </td>
                                                                <td>
                                                                    <Select
                                                                        options={unitOptions}
                                                                        value={unitOptions.find(u => u.value === line.subUnit) || null}
                                                                        onChange={(opt) => { handleLineChange(index, "subUnit", opt ? opt.value : ''); validation.setFieldTouched(`lines[${index}].subUnit`, true); }}
                                                                        classNamePrefix="select"
                                                                        placeholder="SubUnit*"
                                                                        isDisabled={isView || !!line.productId}
                                                                        menuPortalTarget={document.body}
                                                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, borderColor: showErr('subUnit') ? '#f06548' : base.borderColor }) }}
                                                                    />
                                                                    {showErr('subUnit') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.subUnit}</div>}
                                                                </td>
                                                                <td>
                                                                    <Input readOnly value={formatToTwoDecimals(line.subUnitQuantity || 0)} className="bg-light" />
                                                                </td>
                                                                <td>
                                                                    <Input type="number" value={line.rate}
                                                                        disabled={isView}
                                                                        onChange={(e) => handleLineChange(index, "rate", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "rate", formatToTwoDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].rate`, true);
                                                                        }}
                                                                        style={{ borderColor: showErr('rate') ? '#f06548' : '' }} />
                                                                    {showErr('rate') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.rate}</div>}
                                                                </td>
                                                                <td><Input type="number" value={line.mrp} onChange={(e) => handleLineChange(index, "mrp", e.target.value)} disabled={isView} /></td>
                                                                <td>
                                                                    <Input type="number" value={line.cgstPercent}
                                                                        disabled={isView}
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
                                                                        onChange={(e) => handleLineChange(index, "sgstPercent", e.target.value)}
                                                                        onBlur={(e) => {
                                                                            handleLineChange(index, "sgstPercent", formatToTwoDecimals(e.target.value));
                                                                            validation.setFieldTouched(`lines[${index}].sgstPercent`, true);
                                                                        }}
                                                                        style={{ borderColor: showErr('sgstPercent') ? '#f06548' : '' }} />
                                                                    {showErr('sgstPercent') && <div className="text-danger" style={{ fontSize: '11px' }}>{lineErrors.sgstPercent}</div>}
                                                                </td>
                                                                <td><Input readOnly value={formatToTwoDecimals(line.totalAmount || 0)} className="bg-light" style={{ width: '100px' }} /></td>
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
                                                </tbody>
                                                <tfoot>
                                                    <tr className="table-light fw-semibold">
                                                        <td style={stickyFooterCellStyle}>Total</td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.quantity)}</td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.subUnitQuantity)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.rate)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.mrp)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.cgstPercent)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.sgstPercent)}</td>
                                                        <td style={stickyFooterCellStyle}>{formatToTwoDecimals(itemTotals.totalAmount)}</td>
                                                        <td style={stickyFooterCellStyle}></td>
                                                    </tr>
                                                </tfoot>
                                            </Table>
                                        </div>
                                        {!isView && (
                                            <Button color="link" className="mt-3 text-primary p-0 fw-medium" onClick={handleAddLine}>
                                                <i className="ri-add-line align-bottom"></i> Add New Row
                                            </Button>
                                        )}

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

                                                    <div className="d-flex justify-content-between mb-3 align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <span className="text-muted fw-medium">Discount</span>
                                                            <div className="ms-2 d-flex align-items-center border rounded p-1 bg-white">
                                                                <Button 
                                                                    type="button" 
                                                                    color={discountType === 'percent' ? "primary" : "light"} 
                                                                    size="sm" 
                                                                    className="py-0 px-2 border-0"
                                                                    onClick={() => {
                                                                        setDiscountType('percent');
                                                                        calculateTotals(validation.values.lines, { discountType: 'percent' });
                                                                    }}
                                                                >
                                                                    %
                                                                </Button>
                                                                <Button 
                                                                    type="button" 
                                                                    color={discountType === 'amount' ? "primary" : "light"} 
                                                                    size="sm" 
                                                                    className="py-0 px-2 border-0"
                                                                    onClick={() => {
                                                                        setDiscountType('amount');
                                                                        calculateTotals(validation.values.lines, { discountType: 'amount' });
                                                                    }}
                                                                >
                                                                    ₹
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div style={{ width: '120px' }}>
                                                            {discountType === 'percent' ? (
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

                                                    {discountType === 'percent' && (
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

                                                    <div className="d-flex justify-content-between mb-2 align-items-center">
                                                        <span className="text-muted fw-medium">Round Off</span>
                                                        <div style={{ width: '120px' }}>
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
                                            <Button type="button" color="light" onClick={() => history("/purchase-transaction/list")}>{isView ? "Back" : "Cancel"}</Button>
                                            {!isView && <Button type="submit" color="primary" className="px-4">Save and Send</Button>}
                                        </div>
                                    </Form>

                                    {/* Address/Details Modal */}
                                    <Modal isOpen={isAddressModalOpen} toggle={() => setIsAddressModalOpen(!isAddressModalOpen)} size="lg">
                                        <ModalHeader toggle={() => setIsAddressModalOpen(false)}>Edit Vendor Details</ModalHeader>
                                        <ModalBody>
                                            <Row>
                                                <Col md={6} className="mb-3">
                                                    <Label>Billing Address</Label>
                                                    <Input type="textarea" rows="3" value={validation.values.billingAddress} onChange={(e) => validation.setFieldValue("billingAddress", e.target.value)} disabled={isView} />
                                                </Col>
                                                <Col md={6} className="mb-3">
                                                    <Label>Shipping Address</Label>
                                                    <Input type="textarea" rows="3" value={validation.values.shippingAddress} onChange={(e) => validation.setFieldValue("shippingAddress", e.target.value)} disabled={isView} />
                                                </Col>
                                                <Col md={4} className="mb-3">
                                                    <Label>GST Treatment</Label>
                                                    <Input type="select" value={validation.values.gstTreatment} onChange={(e) => validation.setFieldValue("gstTreatment", e.target.value)} disabled={isView}>
                                                        <option>Registered Business</option>
                                                        <option>Unregistered Business</option>
                                                        <option>Consumer</option>
                                                        <option>Overseas</option>
                                                    </Input>
                                                </Col>
                                                <Col md={4} className="mb-3">
                                                    <Label>GST No</Label>
                                                    <Input value={validation.values.gstNo} onChange={(e) => validation.setFieldValue("gstNo", e.target.value)} />
                                                </Col>
                                                <Col md={4} className="mb-3">
                                                    <Label>Place of Supply</Label>
                                                    <Input value={validation.values.placeOfSupply} onChange={(e) => validation.setFieldValue("placeOfSupply", e.target.value)} />
                                                </Col>
                                            </Row>
                                        </ModalBody>
                                        <ModalFooter>
                                            <Button color="secondary" onClick={() => setIsAddressModalOpen(false)}>Close</Button>
                                            <Button color="primary" onClick={() => setIsAddressModalOpen(false)}>Done</Button>
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

export default PurchaseTransactionCreate;
