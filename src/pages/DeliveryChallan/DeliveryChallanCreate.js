import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    CardBody, Row, Col, Card, Container, Form, Input, Label, Table, FormFeedback, Button,
    Modal, ModalHeader, ModalBody, ModalFooter, Badge, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem
} from "reactstrap";
import { useNavigate, useParams } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import {
    addNewDeliveryChallan as onAddNewDeliveryChallan,
    updateDeliveryChallan as onUpdateDeliveryChallan,
    getDeliveryChallanDetails as onGetDeliveryChallanDetails
} from "../../slices/thunks";
import { getCustomersSale, getProductsForPurchase, getPartyDetails, getDeliveryChallanDetails, getDeliveryChallans, getUnits, getTaxGroups } from "../../helpers/fakebackend_helper";
import { formatToFourDecimals } from "../../utils/numberUtils";

const DeliveryChallanCreate = () => {
    const dispatch = useDispatch();
    const history = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [existingChallanNumbers, setExistingChallanNumbers] = useState([]);

    const { isDeliveryChallanCreated } = useSelector(state => state.DeliveryChallan);

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [units, setUnits] = useState([]);
    const [taxGroups, setTaxGroups] = useState([]);
    const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);

    const today = useMemo(() => new Date(), []);

    const defaultInitialValues = {
        deliveryChallanId: 0,
        companyId: 1,
        customerId: "",
        locationId: 1, // Mock
        challanNumber: "",
        referenceNo: "",
        challanDate: today,
        challanType: "", // Default empty to show placeholder
        otherChallanType: "",
        customerNotes: "",
        warehouseLocation: "Head Office",
        items: [
            {
                itemId: 0,
                deliveryChallanId: 0,
                productId: "",
                description: "",
                quantity: 1,
                rate: 0,
                taxId: 0,
                amount: 0
            }
        ],
        subTotal: 0,
        discount: 0,
        adjustment: 0,
        total: 0
    };

    const [formInitialValues, setFormInitialValues] = useState(defaultInitialValues);

    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkSearch, setBulkSearch] = useState("");
    const [selectedBulkItems, setSelectedBulkItems] = useState([]);

    const fetchInitialData = useCallback(async () => {
        try {
            const [customerData, productData, unitData, taxGroupData] = await Promise.all([
                getCustomersSale(),
                getProductsForPurchase(),
                getUnits(),
                getTaxGroups()
            ]);

            if (Array.isArray(customerData)) {
                setCustomers(customerData.map(v => ({ label: v.displayName || v.DisplayName || v.name || v.Name, value: v.partyId || v.PartyId })));
            }

            if (Array.isArray(productData)) {
                setProducts(productData.map(p => ({
                    label: p.name || p.Name,
                    value: p.productId || p.ProductId,
                    rate: p.costPrice || p.CostPrice || 0,
                    type: p.type || p.Type,
                    hsnCode: p.hsnOrSACCode || p.HSNCode || p.SACCode || "N/A",
                    taxId: p.taxGroupId || 0,
                    unitId: p.unitId || 0
                })));
            }

            if (Array.isArray(unitData)) {
                setUnits(unitData.map(u => ({ label: u.unitName || u.UnitName, value: u.unitId || u.UnitId })));
            }

            if (Array.isArray(taxGroupData)) {
                setTaxGroups(taxGroupData.map(tg => ({ label: tg.taxGroupName || tg.TaxGroupName || tg.groupName || tg.GroupName, value: tg.taxGroupId || tg.TaxGroupId, originalData: tg })));
            }

            // Retrieve all existing challan numbers to validate duplicates natively
            try {
                const challansRes = await getDeliveryChallans();
                const challans = challansRes.data || challansRes;
                if (Array.isArray(challans)) {
                    // Filter out the current one so we can edit without clashing with ourselves
                    const others = isEdit ? challans.filter(c => String(c.deliveryChallanId || c.DeliveryChallanId) !== String(id)) : challans;
                    setExistingChallanNumbers(others.map(c => (c.challanNumber || c.ChallanNumber || "").toLowerCase().trim()));
                }
            } catch (e) { console.error("Could not fetch challans for duplicate validation", e); }

            if (isEdit) {
                const response = await getDeliveryChallanDetails(id);
                const editData = response.data || response;
                if (editData && (editData.header || editData.Header)) {
                    const header = editData.header || editData.Header;
                    let isOtherChallanType = false;
                    let cType = header.challanType || header.ChallanType;
                    let oType = "";
                    if (cType && !["Supply of Liquid Gas", "Job Work", "Supply on Approval"].includes(cType)) {
                        isOtherChallanType = true;
                        oType = cType;
                        cType = "Others";
                    }

                    const mapItem = (item) => ({
                        itemId: item.itemId || item.ItemId || 0,
                        deliveryChallanId: item.deliveryChallanId || item.DeliveryChallanId || 0,
                        productId: item.productId || item.ProductId || "",
                        description: item.itemDetails || item.ItemDetails || "",
                        quantity: item.quantity !== undefined ? item.quantity : item.Quantity,
                        rate: item.rate !== undefined ? item.rate : item.Rate,
                        taxId: item.taxId !== undefined ? item.taxId : item.TaxId,
                        amount: item.amount !== undefined ? item.amount : item.Amount
                    });
                    let mappedItems = [];
                    const items = editData.items || editData.Items || [];
                    if (items.length > 0) {
                        mappedItems = items.map(mapItem);
                    }

                    setFormInitialValues({
                        ...defaultInitialValues,
                        deliveryChallanId: header.deliveryChallanId || header.DeliveryChallanId,
                        companyId: header.companyId || header.CompanyId,
                        customerId: header.customerId || header.CustomerId,
                        locationId: header.locationId || header.LocationId,
                        challanNumber: header.challanNumber || header.ChallanNumber,
                        referenceNo: header.referenceNo || header.ReferenceNo,
                        challanDate: header.challanDate || header.ChallanDate,
                        customerNotes: header.customerNotes || header.CustomerNotes,
                        terms: header.terms || header.Terms,
                        warehouseLocation: header.warehouseLocation || header.WarehouseLocation,
                        challanType: cType,
                        otherChallanType: oType,
                        items: mappedItems.length > 0 ? mappedItems : defaultInitialValues.items,
                        // Need adjustment overriding from first loaded item (since stored there)
                        adjustment: items[0] ? (items[0].adjustment || items[0].Adjustment || 0) : 0,
                        discount: items[0] ? (items[0].discountPct || items[0].DiscountPct || 0) : 0
                    });

                    if (header.customerId || header.CustomerId) {
                        handleCustomerChange({ value: header.customerId || header.CustomerId });
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    }, [id, isEdit]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues: formInitialValues,
        validationSchema: Yup.object({
            customerId: Yup.string().required("Please select a customer"),
            challanNumber: Yup.string()
                .required("Please enter challan number")
                .test('is-unique', 'This Challan Number already exists', function (value) {
                    if (!value) return true;
                    return !existingChallanNumbers.includes(value.toLowerCase().trim());
                }),
        }),
        onSubmit: async (values) => {
            const payload = {
                header: {
                    ...values,
                    challanType: values.challanType === "Others" ? values.otherChallanType : values.challanType,
                    challanDate: Array.isArray(values.challanDate) ? values.challanDate[0] : values.challanDate,
                },
                items: values.items.map(item => ({
                    ...item,
                    productId: parseInt(item.productId),
                    itemDetails: item.description || "",
                    quantity: parseFloat(item.quantity),
                    rate: parseFloat(item.rate),
                    taxId: parseInt(item.taxId) || 0,
                    amount: parseFloat(item.amount)
                }))
            };

            if (isEdit) {
                dispatch(onUpdateDeliveryChallan(payload));
            } else {
                dispatch(onAddNewDeliveryChallan(payload));
            }
        }
    });

    useEffect(() => {
        if (isDeliveryChallanCreated) {
            history("/delivery-challan/list");
        }
    }, [isDeliveryChallanCreated, history]);

    const calculateTotals = useCallback((items, currentDiscount, currentAdjustment) => {
        let subTotal = 0;
        const updatedItems = items.map(item => {
            const qty = parseFloat(item.quantity) || 0;
            const rate = parseFloat(item.rate) || 0;
            const baseAmount = qty * rate;

            let taxAmount = 0;
            if (item.taxId) {
                const selectedTax = taxGroups.find(t => t.value === parseInt(item.taxId));
                if (selectedTax && selectedTax.originalData) {
                    const tData = selectedTax.originalData;
                    const cgst = parseFloat(tData.cgstPer ?? tData.cgst_per ?? tData.CgstPer ?? 0);
                    const sgst = parseFloat(tData.sgstPer ?? tData.sgst_per ?? tData.SgstPer ?? 0);
                    const igst = parseFloat(tData.igstPer ?? tData.igst_per ?? tData.IgstPer ?? 0);
                    const totalTaxPer = cgst + sgst + igst;
                    taxAmount = baseAmount * (totalTaxPer / 100);
                }
            }

            const amount = baseAmount + taxAmount;
            subTotal += amount;
            return { ...item, amount };
        });

        const discStr = currentDiscount !== undefined ? currentDiscount : validation.values.discount;
        const adjStr = currentAdjustment !== undefined ? currentAdjustment : validation.values.adjustment;

        const discountPercentage = parseFloat(discStr) || 0;
        const discountAmount = (subTotal * discountPercentage) / 100;
        const adjustment = parseFloat(adjStr) || 0;
        const total = subTotal - discountAmount + adjustment;

        validation.setFieldValue("subTotal", subTotal);
        validation.setFieldValue("total", total);
        validation.setFieldValue("items", updatedItems);
    }, [validation.values.discount, validation.values.adjustment, validation.setFieldValue, taxGroups]);

    const handleAddLine = () => {
        const newItems = [
            ...validation.values.items,
            {
                itemId: 0,
                deliveryChallanId: id ? parseInt(id) : 0,
                productId: "",
                description: "",
                quantity: 1,
                rate: 0,
                taxId: 0,
                amount: 0
            }
        ];
        validation.setFieldValue("items", newItems);
    };

    const handleRemoveLine = (index) => {
        const items = [...validation.values.items];
        items.splice(index, 1);
        calculateTotals(items);
    };

    const handleLineChange = (index, field, value) => {
        const items = [...validation.values.items];
        items[index][field] = value;
        calculateTotals(items);
    };

    const handleCustomerChange = async (opt) => {
        if (!opt) return;
        validation.setFieldValue("customerId", opt.value);
        try {
            const response = await getPartyDetails(opt.value);
            const party = response.party || response.Party || {};
            setSelectedCustomerDetails(party);
        } catch (error) {
            console.error("Error fetching customer details:", error);
        }
    };

    const toggleBulkModal = () => {
        setIsBulkModalOpen(!isBulkModalOpen);
        if (!isBulkModalOpen) {
            setBulkSearch("");
            setSelectedBulkItems([]);
        }
    };

    const handleBulkItemToggle = (product) => {
        const existing = selectedBulkItems.find(item => item.productId === product.value);
        if (existing) {
            setSelectedBulkItems(selectedBulkItems.filter(item => item.productId !== product.value));
        } else {
            setSelectedBulkItems([...selectedBulkItems, {
                productId: product.value,
                quantity: 1,
                rate: product.rate || 0,
                taxId: product.taxId || 0,
                name: product.label
            }]);
        }
    };

    const handleBulkItemQuantityChange = (productId, change) => {
        setSelectedBulkItems(selectedBulkItems.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(1, item.quantity + change);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const handleConfirmBulkAdd = () => {
        let currentItems = [...validation.values.items];
        if (currentItems.length === 1 && !currentItems[0].productId) {
            currentItems = [];
        }
        const newItemsToAdd = selectedBulkItems.map(bItem => ({
            itemId: 0,
            deliveryChallanId: id ? parseInt(id) : 0,
            productId: bItem.productId,
            description: "",
            quantity: bItem.quantity,
            rate: bItem.rate,
            taxId: bItem.taxId,
            amount: 0
        }));
        const finalItems = [...currentItems, ...newItemsToAdd];
        validation.setFieldValue("items", finalItems);
        calculateTotals(finalItems, validation.values.discount, validation.values.adjustment);
        toggleBulkModal();
    };

    const handleCloneLine = (index) => {
        const items = [...validation.values.items];
        const itemToClone = { ...items[index], itemId: 0 };
        items.splice(index + 1, 0, itemToClone);
        calculateTotals(items);
    };

    const handleInsertNewRow = (index) => {
        const items = [...validation.values.items];
        items.splice(index + 1, 0, { itemId: 0, deliveryChallanId: id ? parseInt(id) : 0, productId: "", description: "", quantity: 1, rate: 0, taxId: 0, amount: 0 });
        validation.setFieldValue("items", items);
    };

    const filteredBulkProducts = products.filter(p => p.label.toLowerCase().includes(bulkSearch.toLowerCase()));

    document.title = isEdit ? "Edit Delivery Challan | SoftBook" : "New Delivery Challan | SoftBook";

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title={isEdit ? "Edit Delivery Challan" : "New Delivery Challan"} pageTitle="Sales" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardBody>
                                    <Form onSubmit={validation.handleSubmit}>
                                        <Row className="mb-4">
                                            <Col md={7}>
                                                <Row className="mb-3 align-items-center">
                                                    <Col md={3}><Label className="text-danger fw-medium mb-0">Customer Name*</Label></Col>
                                                    <Col md={8}>
                                                        <div className="d-flex gap-2">
                                                            <div className="flex-grow-1">
                                                                <Select
                                                                    options={customers}
                                                                    onChange={handleCustomerChange}
                                                                    placeholder="Select or add a customer"
                                                                    value={customers.find(c => c.value === validation.values.customerId)}
                                                                />
                                                            </div>
                                                            <Button color="primary" size="sm"><i className="ri-search-line"></i></Button>
                                                        </div>
                                                        {validation.errors.customerId && <div className="text-danger mt-1 small">{validation.errors.customerId}</div>}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3 align-items-center">
                                                    <Col md={3}><Label className="mb-0">Location</Label></Col>
                                                    <Col md={8}>
                                                        <Input type="select" name="locationId" value={validation.values.locationId} onChange={validation.handleChange}>
                                                            <option value="1">Head Office</option>
                                                        </Input>
                                                        {selectedCustomerDetails && <small className="text-muted d-block mt-1">Source of Supply: {selectedCustomerDetails.placeOfSupply || "Gujarat"}</small>}
                                                    </Col>
                                                </Row>
                                            </Col>

                                            <Col md={5}>
                                                <Row className="mb-3 align-items-center">
                                                    <Col md={4}><Label className="text-danger fw-medium mb-0 text-md-end d-block">Delivery Challan#*</Label></Col>
                                                    <Col md={8}>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <Input
                                                                name="challanNumber"
                                                                value={validation.values.challanNumber}
                                                                onChange={validation.handleChange}
                                                                onBlur={validation.handleBlur}
                                                                invalid={validation.errors.challanNumber && validation.touched.challanNumber ? true : false}
                                                                placeholder="DC-00001"
                                                            />
                                                            <i className="ri-settings-4-line text-muted fs-18 cursor-pointer"></i>
                                                        </div>
                                                        {validation.errors.challanNumber && validation.touched.challanNumber ? (
                                                            <FormFeedback type="invalid" className="d-block">{validation.errors.challanNumber}</FormFeedback>
                                                        ) : null}
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3 align-items-center">
                                                    <Col md={4}><Label className="mb-0 text-md-end d-block">Reference#</Label></Col>
                                                    <Col md={8}><Input name="referenceNo" value={validation.values.referenceNo} onChange={validation.handleChange} /></Col>
                                                </Row>
                                                <Row className="mb-3 align-items-center">
                                                    <Col md={4}><Label className="text-danger fw-medium mb-0 text-md-end d-block">Delivery Challan Date*</Label></Col>
                                                    <Col md={8}>
                                                        <Flatpickr className="form-control" options={{ dateFormat: "d/m/Y" }} value={validation.values.challanDate} onChange={date => validation.setFieldValue("challanDate", date)} />
                                                    </Col>
                                                </Row>
                                                <Row className="mb-3 align-items-center">
                                                    <Col md={4}><Label className="text-danger fw-medium mb-0 text-md-end d-block">Challan Type*</Label></Col>
                                                    <Col md={8}>
                                                        <Input type="select" name="challanType" value={validation.values.challanType} onChange={validation.handleChange}>
                                                            <option value="" disabled>Choose a proper challan type.</option>
                                                            <option value="Supply of Liquid Gas">Supply of Liquid Gas</option>
                                                            <option value="Job Work">Job Work</option>
                                                            <option value="Supply on Approval">Supply on Approval</option>
                                                            <option value="Others">Others</option>
                                                        </Input>
                                                    </Col>
                                                </Row>
                                                {validation.values.challanType === "Others" && (
                                                    <Row className="mb-3 align-items-center">
                                                        <Col md={4}><Label className="fw-medium mb-0 text-md-end d-block">Specify Type</Label></Col>
                                                        <Col md={8}>
                                                            <Input name="otherChallanType" value={validation.values.otherChallanType || ""} onChange={validation.handleChange} placeholder="Enter Challan Type" />
                                                        </Col>
                                                    </Row>
                                                )}
                                            </Col>
                                        </Row>
                                        <div className="table-responsive">
                                            <Table className="align-middle table-nowrap mb-0 border custom-table">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th scope="col" style={{ width: '40%' }}>ITEM DETAILS</th>
                                                        <th scope="col" className="text-end">QUANTITY</th>
                                                        <th scope="col" className="text-end">RATE <i className="ri-layout-grid-fill text-muted ml-1"></i></th>
                                                        <th scope="col" style={{ width: '15%' }}>TAX <i className="ri-information-line text-muted ml-1"></i></th>
                                                        <th scope="col" className="text-end" style={{ width: '15%' }}>AMOUNT</th>
                                                        <th scope="col" style={{ width: '40px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {validation.values.items.map((item, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                <div className="d-flex flex-column">
                                                                    <Select
                                                                        options={products}
                                                                        placeholder="Type or click to select an item."
                                                                        value={products.find(p => String(p.value) === String(item.productId)) || null}
                                                                        onChange={(opt) => {
                                                                            const itms = [...validation.values.items];
                                                                            itms[index].productId = opt.value;
                                                                            itms[index].rate = opt.rate;
                                                                            itms[index].taxId = opt.taxId;
                                                                            calculateTotals(itms);
                                                                        }}
                                                                        classNamePrefix="react-select"
                                                                        menuPortalTarget={document.body}
                                                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                                    />
                                                                    {item.productId && (() => {
                                                                        const selectedProduct = products.find(p => p.value === item.productId) || products.find(p => String(p.value) === String(item.productId));
                                                                        if (!selectedProduct) return null;
                                                                        const hsnCode = selectedProduct.hsnCode && selectedProduct.hsnCode !== "N/A" && selectedProduct.hsnCode !== "0" ? selectedProduct.hsnCode : null;
                                                                        const type = selectedProduct.type;
                                                                        return (
                                                                            <div className="d-flex align-items-center gap-2 mt-1 text-muted" style={{ fontSize: '11px' }}>
                                                                                {type && <span className="badge bg-light text-dark border">{type}</span>}
                                                                                {hsnCode && <span>HSN/SAC: {hsnCode}</span>}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </td>
                                                            <td><Input type="number" step="0.0001" className="text-end" value={item.quantity} onChange={(e) => handleLineChange(index, "quantity", e.target.value)} onBlur={(e) => handleLineChange(index, "quantity", formatToFourDecimals(e.target.value))} /></td>
                                                            <td><Input type="number" className="text-end" value={item.rate} onChange={(e) => handleLineChange(index, "rate", e.target.value)} /></td>
                                                            <td>
                                                                <Input type="select" className="form-select mb-2" value={item.taxId || ""} onChange={(e) => handleLineChange(index, "taxId", e.target.value)}>
                                                                    <option value="0" disabled>Select a Tax</option>
                                                                    {taxGroups.map(tg => <option key={tg.value} value={tg.value}>{tg.label}</option>)}
                                                                </Input>
                                                            </td>
                                                            <td className="text-end fw-bold">{(item.amount || 0).toFixed(2)}</td>
                                                            <td>
                                                                <div className="d-flex align-items-center justify-content-end gap-1">
                                                                    <UncontrolledDropdown direction="start">
                                                                        <DropdownToggle tag="a" className="text-muted cursor-pointer px-1"><i className="ri-more-2-fill fs-5"></i></DropdownToggle>
                                                                        <DropdownMenu className="dropdown-menu-end">
                                                                            <DropdownItem onClick={() => handleCloneLine(index)}>Clone</DropdownItem>
                                                                            <DropdownItem onClick={() => handleInsertNewRow(index)}>Insert New Row</DropdownItem>
                                                                            <DropdownItem onClick={() => toggleBulkModal()}>Insert Items in Bulk</DropdownItem>
                                                                        </DropdownMenu>
                                                                    </UncontrolledDropdown>
                                                                    <i className="ri-close-line text-danger cursor-pointer fs-4" onClick={() => handleRemoveLine(index)}></i>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                        <div className="d-flex gap-2 mt-3">
                                            <Button color="primary" size="sm" className="btn-soft-primary" onClick={handleAddLine}><i className="ri-add-line align-bottom me-1"></i> Add New Row</Button>
                                            <Button color="primary" size="sm" className="btn-soft-primary" onClick={toggleBulkModal}><i className="ri-add-line align-bottom me-1"></i> Add Items in Bulk</Button>
                                        </div>
                                        <Row className="mt-4">
                                            <Col md={7}><div className="mb-4"><Label className="fw-medium">Customer Notes</Label><Input type="textarea" rows="4" name="customerNotes" value={validation.values.customerNotes} onChange={validation.handleChange} placeholder="Enter notes" /></div></Col>
                                            <Col md={5}>
                                                <div className="p-4 bg-light bg-opacity-50 rounded">
                                                    <div className="d-flex justify-content-between mb-3 align-items-center"><span className="fw-medium">Sub Total</span><span className="fw-bold">{validation.values.subTotal.toFixed(2)}</span></div>
                                                    <div className="d-flex justify-content-between mb-3 align-items-center"><span className="fw-medium">Discount</span><div className="d-flex align-items-center gap-2" style={{ width: '150px' }}><Input type="number" className="text-end form-control-sm" name="discount" value={validation.values.discount} onChange={(e) => { validation.handleChange(e); calculateTotals(validation.values.items, e.target.value, undefined); }} /><span>%</span></div><span className="fw-bold">{((validation.values.subTotal * (parseFloat(validation.values.discount) || 0)) / 100).toFixed(2)}</span></div>
                                                    <div className="d-flex justify-content-between mb-3 align-items-center"><div className="d-flex align-items-center gap-2"><Input type="text" className="form-control-sm" defaultValue="Adjustment" style={{ width: '100px', border: '1px dashed #ccc' }} /><i className="ri-question-line text-muted"></i></div><Input type="number" className="text-end form-control-sm" name="adjustment" value={validation.values.adjustment} onChange={(e) => { validation.handleChange(e); calculateTotals(validation.values.items, undefined, e.target.value); }} style={{ width: '100px' }} /><span className="fw-bold">{parseFloat(validation.values.adjustment || 0).toFixed(2)}</span></div>
                                                    <hr /><div className="d-flex justify-content-between align-items-center mt-2"><span className="fw-bold fs-16">Total ( ₹ )</span><span className="fw-bold fs-18">{validation.values.total.toFixed(2)}</span></div>
                                                </div>
                                            </Col>
                                        </Row>
                                        <div className="hstack gap-2 justify-content-start mt-4"><Button type="submit" color="success" className="px-4">Save</Button><Button type="button" color="light" className="px-4" onClick={() => history("/delivery-challan/list")}>Cancel</Button></div>
                                    </Form>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Modal isOpen={isBulkModalOpen} toggle={toggleBulkModal} size="lg" centered><ModalHeader toggle={toggleBulkModal} className="bg-light pb-2"><h5 className="modal-title mb-0">Add Items in Bulk</h5></ModalHeader><ModalBody className="p-0"><Row className="g-0 h-100"><Col md={5} className="border-end d-flex flex-column" style={{ minHeight: '400px' }}><div className="p-3 border-bottom"><Input type="text" placeholder="Search..." value={bulkSearch} onChange={(e) => setBulkSearch(e.target.value)} className="form-control-sm" /></div><div className="flex-grow-1 overflow-auto p-0" style={{ maxHeight: '350px' }}>{filteredBulkProducts.map(product => { const isSelected = selectedBulkItems.some(i => i.productId === product.value); return ( <div key={product.value} className={`p-3 border-bottom cursor-pointer d-flex justify-content-between align-items-center ${isSelected ? 'bg-light' : ''}`} onClick={() => handleBulkItemToggle(product)} > <div><h6 className="mb-1">{product.label}</h6><div className="text-primary small">Rate: ₹{parseFloat(product.rate || 0).toFixed(2)}</div></div>{isSelected && <i className="ri-checkbox-circle-fill text-success fs-20"></i>}</div> ); })}</div></Col><Col md={7} className="d-flex flex-column h-100"><div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light bg-opacity-50"><h6 className="mb-0">Selected Items <Badge color="secondary" className="ms-1 px-2 rounded-pill bg-white text-dark border">{selectedBulkItems.length}</Badge></h6><span className="small text-muted">Total Qty: {formatToFourDecimals(selectedBulkItems.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0))}</span></div><div className="flex-grow-1 overflow-auto p-3" style={{ maxHeight: '350px' }}>{selectedBulkItems.map(item => ( <div key={item.productId} className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom"><div className="fw-medium">{item.name}</div><div className="d-flex align-items-center border rounded"><Button color="light" size="sm" className="border-0 bg-transparent px-2" onClick={() => handleBulkItemQuantityChange(item.productId, -1)}><i className="ri-subtract-line text-muted"></i></Button><div className="px-3 fw-bold">{formatToFourDecimals(item.quantity)}</div><Button color="light" size="sm" className="border-0 bg-transparent px-2" onClick={() => handleBulkItemQuantityChange(item.productId, 1)}><i className="ri-add-line text-muted"></i></Button></div></div> ))}</div></Col></Row></ModalBody><ModalFooter className="bg-light p-3"><Button color="primary" onClick={handleConfirmBulkAdd} disabled={selectedBulkItems.length === 0}>Add Items</Button><Button color="light" onClick={toggleBulkModal}>Cancel</Button></ModalFooter></Modal>
        </React.Fragment>
    );
};

export default DeliveryChallanCreate;
