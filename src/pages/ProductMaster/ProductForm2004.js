import React, { useState, useEffect } from 'react';
import {
    Row,
    Col,
    Card,
    CardHeader,
    CardBody,
    FormGroup,
    Label,
    Input,
    FormFeedback,
    Button,
    CardTitle,
    Form,
    Table
} from 'reactstrap';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { APIClient } from '../../helpers/api_helper';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import FeatherIcon from 'feather-icons-react';
import { formatToFourDecimals } from '../../utils/numberUtils';

const apiClient = new APIClient();

const ProductForm = ({ isEdit = false, productId = null, onSuccess = null, onCancel = null }) => {
    const navigate = useNavigate();
    const [units, setUnits] = useState([]);
    const [taxGroups, setTaxGroups] = useState([]);
    const [hsnList, setHsnList] = useState([]);
    const [sacList, setSacList] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [productGroups, setProductGroups] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [subTaxes, setSubTaxes] = useState([]);
    const [isTaxRateLocked, setIsTaxRateLocked] = useState(isEdit);

    const initialValues = {
        productId: 0,
        type: 'Goods',
        name: '',
        unitId: '',
        productPackingUnit: '',
        productGroupId: '',
        hsnId: '',
        sacId: '',
        taxPreferenceId: '1',
        sellable: true,
        purchasable: true,
        mrp: 0,
        sellingPrice: 0,
        sellingPrice2: 0,
        sellingPrice3: 0,
        sellingPrice4: 0,
        sellingPrice5: 0,
        salesAccount: '',
        salesDescription: '',
        costPrice: 0,
        purchaseAccount: '',
        purchaseDescription: '',
        taxGroupId: '',
        preferredVendorId: '',
        openingQuantity: "0.0000",
        openingPrice: 0,
        openingAmount: 0,
        purchaseEffectedAccount: '',
        saleEffectedAccount: '',
        minQuantity: "0.0000",
        maxQuantity: "0.0000",
        reOrderQuantity: "0.0000",
        taxExemptionId: ''
    };

    const validationSchema = Yup.object().shape({
        name: Yup.string().required("Product Name is required"),
        type: Yup.string().required("Product Type is required"),
        unitId: Yup.string().required("Base Unit is required"),
        taxPreferenceId: Yup.string().required("Tax Preference is required"),
    });

    const formik = useFormik({
        initialValues,
        validationSchema,
        onSubmit: async (values) => {
            try {
                setLoading(true);
                const payload = {
                    ...values,
                    productId: isEdit ? parseInt(productId) : 0,
                    unitId: values.unitId ? parseInt(values.unitId) : null,
                    productPackingUnit: values.productPackingUnit ? parseInt(values.productPackingUnit) : null,
                    productGroupId: values.productGroupId ? parseInt(values.productGroupId) : null,
                    hsnId: values.hsnId ? parseInt(values.hsnId) : null,
                    sacId: values.sacId ? parseInt(values.sacId) : null,
                    taxGroupId: values.taxGroupId ? parseInt(values.taxGroupId) : null,
                    preferredVendorId: values.preferredVendorId ? parseInt(values.preferredVendorId) : null,
                    taxPreferenceId: values.taxPreferenceId ? parseInt(values.taxPreferenceId) : null,
                    taxExemptionId: values.taxExemptionId ? parseInt(values.taxExemptionId) : null,
                    saleEffectedAccount: values.saleEffectedAccount ? parseInt(values.saleEffectedAccount) : null,
                    purchaseEffectedAccount: values.purchaseEffectedAccount ? parseInt(values.purchaseEffectedAccount) : null,
                    mrp: values.mrp !== "" ? parseFloat(values.mrp) : null,
                    sellingPrice: values.sellingPrice !== "" ? parseFloat(values.sellingPrice) : null,
                    sellingPrice2: values.sellingPrice2 !== "" ? parseFloat(values.sellingPrice2) : null,
                    sellingPrice3: values.sellingPrice3 !== "" ? parseFloat(values.sellingPrice3) : null,
                    sellingPrice4: values.sellingPrice4 !== "" ? parseFloat(values.sellingPrice4) : null,
                    sellingPrice5: values.sellingPrice5 !== "" ? parseFloat(values.sellingPrice5) : null,
                    costPrice: values.costPrice !== "" ? parseFloat(values.costPrice) : null,
                    openingQuantity: values.openingQuantity !== "" ? parseFloat(values.openingQuantity) : null,
                    openingPrice: values.openingPrice !== "" ? parseFloat(values.openingPrice) : null,
                    openingAmount: values.openingAmount !== "" ? parseFloat(values.openingAmount) : null,
                    purchaseAccount: values.purchaseAccount || null,
                    salesAccount: values.salesAccount || null,
                    salesDescription: values.salesDescription || null,
                    purchaseDescription: values.purchaseDescription || null,
                    minQuantity: values.minQuantity !== "" ? parseFloat(values.minQuantity) : null,
                    maxQuantity: values.maxQuantity !== "" ? parseFloat(values.maxQuantity) : null,
                    reOrderQuantity: values.reOrderQuantity !== "" ? parseFloat(values.reOrderQuantity) : null
                };

                if (isEdit) {
                    await apiClient.put(`/api/Product/${productId}`, payload);
                    toast.success("Product updated successfully");
                } else {
                    await apiClient.post('/api/Product', payload);
                    toast.success("Product created successfully");
                }
                if (onSuccess) {
                    onSuccess();
                } else {
                    navigate('/apps-product-master');
                }
            } catch (error) {
                console.error("Save failed:", error);
                toast.error(error.message || "Failed to save product");
            } finally {
                setLoading(false);
            }
        }
    });

    // Fetch dropdown data
    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [u, tg, h, s, a, pg, v] = await Promise.all([
                    apiClient.get('/api/unit'),
                    apiClient.get('/api/taxgroup'),
                    apiClient.get('/api/hsn'),
                    apiClient.get('/api/sac'),
                    apiClient.get('/api/account'),
                    apiClient.get('/api/master/productgroup'),
                    apiClient.get('/api/party/type/Vendor')
                ]);

                console.log("Units Data:", u);
                console.log("Tax Groups Data:", tg);
                console.log("HSN Data:", h);
                console.log("SAC Data:", s);
                console.log("Accounts Data:", a);
                console.log("Product Groups Data:", pg);
                console.log("Vendors Data:", v);

                setUnits(u || []);
                setTaxGroups(tg || []);
                setHsnList(h || []);
                setSacList(s || []);
                setAccounts(a || []);
                setProductGroups(pg || []);
                setVendors(v || []);

                // Default to GST 18% on create
                if (!isEdit && tg && tg.length > 0) {
                    const gst18 = tg.find(t => {
                        const name = t.groupName ?? t.GroupName;
                        return name && name.includes("18%");
                    });
                    if (gst18) {
                        formik.setFieldValue('taxGroupId', gst18.taxGroupId ?? gst18.TaxGroupId);
                    }
                }
            } catch (error) {
                console.error("Lookup fetch failed:", error);
            }
        };
        fetchLookups();

        if (isEdit && productId) {
            const fetchProduct = async () => {
                try {
                    const response = await apiClient.get(`/api/Product/${productId}`);
                    if (response) {
                        const productData = {
                            ...initialValues,
                            ...response,
                            openingQuantity: formatToFourDecimals(response.openingQuantity ?? response.OpeningQuantity ?? 0),
                            minQuantity: formatToFourDecimals(response.minQuantity ?? response.MinQuantity ?? 0),
                            maxQuantity: formatToFourDecimals(response.maxQuantity ?? response.MaxQuantity ?? 0),
                            reOrderQuantity: formatToFourDecimals(response.reOrderQuantity ?? response.ReOrderQuantity ?? 0),
                            sellable: response.sellable ?? true,
                            purchasable: response.purchasable ?? true
                        };
                        formik.setValues(productData);
                        if (response.taxGroupId) {
                            setIsTaxRateLocked(true);
                        }
                    }
                } catch (error) {
                    toast.error("Failed to load product details");
                }
            };
            fetchProduct();
        }
    }, [isEdit, productId]);

    // Fetch sub-taxes when taxGroupId changes
    useEffect(() => {
        const fetchSubTaxes = async () => {
            if (formik.values.taxGroupId) {
                try {
                    const details = await apiClient.get(`/api/master/taxgroupdetail?filterId=${formik.values.taxGroupId}`);
                    setSubTaxes(details || []);
                } catch (error) {
                    console.error("Sub-tax fetch failed:", error);
                    setSubTaxes([]);
                }
            } else {
                setSubTaxes([]);
            }
        };
        fetchSubTaxes();
    }, [formik.values.taxGroupId]);

    // Calculate Opening Amount
    useEffect(() => {
        const qty = parseFloat(formik.values.openingQuantity) || 0;
        const price = parseFloat(formik.values.openingPrice) || 0;
        const amount = (qty * price).toFixed(2);
        if (formik.values.openingAmount !== parseFloat(amount)) {
            formik.setFieldValue('openingAmount', amount);
        }
    }, [formik.values.openingQuantity, formik.values.openingPrice]);

    const isGoods = formik.values.type === 'Goods';
    const isTaxable = formik.values.taxPreferenceId === '1';

    // Show error after blur OR after a submit was attempted
    const showError = (field) => (formik.touched[field] || formik.submitCount > 0) && formik.errors[field];
    const isInvalid = (field) => !!(formik.touched[field] || formik.submitCount > 0) && !!formik.errors[field];

    return (
        <Form onSubmit={formik.handleSubmit}>
            <Row>
                <Col lg={12}>
                    {/* General Item Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle tag="h5" className="mb-0">General Item Details</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <Row>
                                <Col md={3}>
                                    <FormGroup className="mb-3">
                                        <Label>Product Type</Label>
                                        <div className="d-flex gap-3">
                                            <div className="form-check">
                                                <Input
                                                    type="radio"
                                                    id="typeGoods"
                                                    name="type"
                                                    value="Goods"
                                                    checked={formik.values.type === 'Goods'}
                                                    onChange={formik.handleChange}
                                                    className="form-check-input"
                                                />
                                                <Label htmlFor="typeGoods" className="form-check-label">Goods</Label>
                                            </div>
                                            <div className="form-check">
                                                <Input
                                                    type="radio"
                                                    id="typeService"
                                                    name="type"
                                                    value="Service"
                                                    checked={formik.values.type === 'Service'}
                                                    onChange={formik.handleChange}
                                                    className="form-check-input"
                                                />
                                                <Label htmlFor="typeService" className="form-check-label">Service</Label>
                                            </div>
                                        </div>
                                    </FormGroup>
                                </Col>
                                <Col md={3}>
                                    <FormGroup className="mb-3">
                                        <Label htmlFor="name">Product Name <span className="text-danger">*</span></Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Enter product name"
                                            type="text"
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            value={formik.values.name}
                                            invalid={isInvalid('name')}
                                        />
                                        {showError('name') && <FormFeedback>{formik.errors.name}</FormFeedback>}
                                    </FormGroup>
                                </Col>
                                <Col md={3}>
                                    <FormGroup className="mb-3">
                                        <Label htmlFor="productGroupId">Product Group</Label>
                                        <Input
                                            id="productGroupId"
                                            name="productGroupId"
                                            type="select"
                                            onChange={formik.handleChange}
                                            value={formik.values.productGroupId}
                                        >
                                            <option value="">Select Group</option>
                                            {productGroups.map(pg => {
                                                const id = pg.productGroupId ?? pg.ProductGroupId;
                                                const name = pg.productGroupName ?? pg.ProductGroupName;
                                                return <option key={id} value={id}>{name}</option>;
                                            })}
                                        </Input>
                                    </FormGroup>
                                </Col>
                                <Col md={3}>
                                    <FormGroup className="mb-3">
                                        <Label htmlFor="unitId">Base Unit <span className="text-danger">*</span></Label>
                                        <Input
                                            id="unitId"
                                            name="unitId"
                                            type="select"
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            value={formik.values.unitId}
                                            invalid={isInvalid('unitId')}
                                        >
                                            <option value="">Select Unit</option>
                                            {units.map(u => {
                                                const id = u.unitId ?? u.UnitId;
                                                const name = u.unitName ?? u.UnitName;
                                                return <option key={id} value={id}>{name}</option>;
                                            })}
                                        </Input>
                                        {showError('unitId') && <FormFeedback>{formik.errors.unitId}</FormFeedback>}
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={3}>
                                    <FormGroup className="mb-3">
                                        <Label htmlFor="productPackingUnit">Packing Unit</Label>
                                        <Input
                                            id="productPackingUnit"
                                            name="productPackingUnit"
                                            type="select"
                                            onChange={formik.handleChange}
                                            value={formik.values.productPackingUnit}
                                        >
                                            <option value="">Select Unit</option>
                                            {units.map(u => {
                                                const id = u.unitId ?? u.UnitId;
                                                const name = u.unitName ?? u.UnitName;
                                                return <option key={id} value={id}>{name}</option>;
                                            })}
                                        </Input>
                                    </FormGroup>
                                </Col>
                                {isGoods ? (
                                    <Col md={3}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="hsnId">HSN Code</Label>
                                            <Input
                                                id="hsnId"
                                                name="hsnId"
                                                type="select"
                                                onChange={formik.handleChange}
                                                value={formik.values.hsnId}
                                            >
                                                <option value="">Select HSN</option>
                                                {hsnList.map(h => {
                                                    const id = h.hsnId ?? h.HsnId;
                                                    const code = h.hsnCode ?? h.HsnCode;
                                                    const desc = h.description ?? h.Description;
                                                    return <option key={id} value={id}>{code} - {desc}</option>;
                                                })}
                                            </Input>
                                        </FormGroup>
                                    </Col>
                                ) : (
                                    <Col md={3}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="sacId">SAC Code</Label>
                                            <Input
                                                id="sacId"
                                                name="sacId"
                                                type="select"
                                                onChange={formik.handleChange}
                                                value={formik.values.sacId}
                                            >
                                                <option value="">Select SAC</option>
                                                {sacList.map(s => {
                                                    const id = s.sacId ?? s.SacId;
                                                    const code = s.sacCode ?? s.SacCode;
                                                    const desc = s.description ?? s.Description;
                                                    return <option key={id} value={id}>{code} - {desc}</option>;
                                                })}
                                            </Input>
                                        </FormGroup>
                                    </Col>
                                )}
                                <Col md={3}>
                                    <FormGroup className="mb-3">
                                        <Label htmlFor="taxPreferenceId">Tax Preference <span className="text-danger">*</span></Label>
                                        <Input
                                            id="taxPreferenceId"
                                            name="taxPreferenceId"
                                            type="select"
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            value={formik.values.taxPreferenceId}
                                            invalid={isInvalid('taxPreferenceId')}
                                        >
                                            <option value="1">Taxable</option>
                                            <option value="2">Exempt</option>
                                            <option value="3">Non-Taxable</option>
                                        </Input>
                                        {showError('taxPreferenceId') && <FormFeedback>{formik.errors.taxPreferenceId}</FormFeedback>}
                                    </FormGroup>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Default Tax Rates */}
                    {isTaxable && (
                        <Card className="shadow-sm border-0 mb-4">
                            <CardHeader className="bg-light d-flex justify-content-between align-items-center py-2">
                                <CardTitle tag="h6" className="mb-0 text-primary fw-bold">Default Tax Rates</CardTitle>
                                <Button
                                    color="link"
                                    size="sm"
                                    className="p-0 text-primary"
                                    onClick={() => setIsTaxRateLocked(!isTaxRateLocked)}
                                    type="button"
                                >
                                    <FeatherIcon icon={isTaxRateLocked ? "edit" : "lock"} size="16" />
                                </Button>
                            </CardHeader>
                            <CardBody className="py-3">
                                <Row className="align-items-start">
                                    <Col md={2}>
                                        <Label className="text-muted small fw-bold text-uppercase mt-1">Tax Rate</Label>
                                    </Col>
                                    <Col md={10}>
                                        {isTaxRateLocked ? (
                                            <div className="ps-0">
                                                <div className="fs-6 text-dark mb-1">
                                                    {taxGroups.find(t => {
                                                        const id = t.taxGroupId ?? t.TaxGroupId;
                                                        return id === parseInt(formik.values.taxGroupId);
                                                    })?.groupName || taxGroups.find(t => {
                                                        const id = t.taxGroupId ?? t.TaxGroupId;
                                                        return id === parseInt(formik.values.taxGroupId);
                                                    })?.GroupName || "None"}
                                                </div>
                                                <div className="text-muted small">
                                                    {(() => {
                                                        const selected = taxGroups.find(t => {
                                                            const id = t.taxGroupId ?? t.TaxGroupId;
                                                            return id === parseInt(formik.values.taxGroupId);
                                                        });
                                                        if (!selected) return null;
                                                        const cgst = selected.cgstPer ?? selected.cgst_per ?? selected.CgstPer ?? 0;
                                                        const sgst = selected.sgstPer ?? selected.sgst_per ?? selected.SgstPer ?? 0;
                                                        const igst = selected.igstPer ?? selected.igst_per ?? selected.IgstPer ?? 0;
                                                        let parts = [];
                                                        if (cgst > 0) parts.push(`CGST: ${parseFloat(cgst).toFixed(2)}%`);
                                                        if (sgst > 0) parts.push(`SGST: ${parseFloat(sgst).toFixed(2)}%`);
                                                        if (igst > 0) parts.push(`IGST: ${parseFloat(igst).toFixed(2)}%`);
                                                        return parts.join("  ");
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-50">
                                                <Input
                                                    id="taxGroupId"
                                                    name="taxGroupId"
                                                    type="select"
                                                    onChange={formik.handleChange}
                                                    value={formik.values.taxGroupId}
                                                    className="form-select mb-2"
                                                >
                                                    <option value="">Select Tax Rate</option>
                                                    {taxGroups.map(tg => {
                                                        const id = tg.taxGroupId ?? tg.TaxGroupId;
                                                        const name = tg.groupName ?? tg.GroupName;
                                                        return <option key={id} value={id}>{name}</option>;
                                                    })}
                                                </Input>
                                                <div className="text-muted small">
                                                    {(() => {
                                                        const selected = taxGroups.find(t => {
                                                            const id = t.taxGroupId ?? t.TaxGroupId;
                                                            return id === parseInt(formik.values.taxGroupId);
                                                        });
                                                        if (!selected) return null;
                                                        const cgst = selected.cgstPer ?? selected.cgst_per ?? selected.CgstPer ?? 0;
                                                        const sgst = selected.sgstPer ?? selected.sgst_per ?? selected.SgstPer ?? 0;
                                                        const igst = selected.igstPer ?? selected.igst_per ?? selected.IgstPer ?? 0;
                                                        let parts = [];
                                                        if (cgst > 0) parts.push(`CGST: ${parseFloat(cgst).toFixed(2)}%`);
                                                        if (sgst > 0) parts.push(`SGST: ${parseFloat(sgst).toFixed(2)}%`);
                                                        if (igst > 0) parts.push(`IGST: ${parseFloat(igst).toFixed(2)}%`);
                                                        return parts.length > 0 ? (
                                                            <>
                                                                {parts.join("  ")}
                                                                <span className="ms-3 fw-bold text-primary">
                                                                    Total: {(parseFloat(cgst) + parseFloat(sgst) + parseFloat(igst)).toFixed(2)}%
                                                                </span>
                                                            </>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>
                    )}

                    {/* Sales & Purchase Info */}
                    <Row>
                        {/* Sales Information */}
                        <Col md={6}>
                            <Card className="h-100 shadow-sm border-0">
                                <CardHeader className="bg-light d-flex justify-content-between align-items-center">
                                    <div className="form-check mb-0">
                                        <Input
                                            type="checkbox"
                                            id="sellable"
                                            name="sellable"
                                            checked={formik.values.sellable}
                                            onChange={formik.handleChange}
                                            className="form-check-input"
                                        />
                                        <Label htmlFor="sellable" className="form-check-label fw-bold text-primary">Sales Information</Label>
                                    </div>
                                </CardHeader>
                                {formik.values.sellable && (
                                    <CardBody>
                                        <Row>
                                            <Col md={4}>
                                                <FormGroup className="mb-3">
                                                    <Label htmlFor="mrp">MRP</Label>
                                                    <Input
                                                        id="mrp"
                                                        name="mrp"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        value={formik.values.mrp}
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col md={4}>
                                                <FormGroup className="mb-3">
                                                    <Label htmlFor="sellingPrice">Selling Price 1</Label>
                                                    <Input
                                                        id="sellingPrice"
                                                        name="sellingPrice"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        value={formik.values.sellingPrice}
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col md={4}>
                                                <FormGroup className="mb-3">
                                                    <Label htmlFor="sellingPrice2">Selling Price 2</Label>
                                                    <Input
                                                        id="sellingPrice2"
                                                        name="sellingPrice2"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        value={formik.values.sellingPrice2}
                                                    />
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col md={4}>
                                                <FormGroup className="mb-3">
                                                    <Label htmlFor="sellingPrice3">Price 3</Label>
                                                    <Input
                                                        id="sellingPrice3"
                                                        name="sellingPrice3"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        value={formik.values.sellingPrice3}
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col md={4}>
                                                <FormGroup className="mb-3">
                                                    <Label htmlFor="sellingPrice4">Price 4</Label>
                                                    <Input
                                                        id="sellingPrice4"
                                                        name="sellingPrice4"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        value={formik.values.sellingPrice4}
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col md={4}>
                                                <FormGroup className="mb-3">
                                                    <Label htmlFor="sellingPrice5">Price 5</Label>
                                                    <Input
                                                        id="sellingPrice5"
                                                        name="sellingPrice5"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        value={formik.values.sellingPrice5}
                                                    />
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="salesAccount">Account</Label>
                                            <Input
                                                id="salesAccount"
                                                name="salesAccount"
                                                type="select"
                                                onChange={formik.handleChange}
                                                value={formik.values.salesAccount}
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(a => {
                                                    const id = a.accountId ?? a.AccountId;
                                                    const name = a.accountName ?? a.AccountName;
                                                    return <option key={id} value={id}>{name}</option>;
                                                })}
                                            </Input>
                                        </FormGroup>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="saleEffectedAccount">Sale Effected Account</Label>
                                            <Input
                                                id="saleEffectedAccount"
                                                name="saleEffectedAccount"
                                                type="select"
                                                onChange={formik.handleChange}
                                                value={formik.values.saleEffectedAccount}
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(a => {
                                                    const id = a.accountId ?? a.AccountId;
                                                    const name = a.accountName ?? a.AccountName;
                                                    return <option key={id} value={id}>{name}</option>;
                                                })}
                                            </Input>
                                        </FormGroup>
                                        <FormGroup className="mb-0">
                                            <Label htmlFor="salesDescription">Sales Description</Label>
                                            <Input
                                                id="salesDescription"
                                                name="salesDescription"
                                                type="textarea"
                                                rows="2"
                                                onChange={formik.handleChange}
                                                value={formik.values.salesDescription}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                )}
                            </Card>
                        </Col>

                        {/* Purchase Information */}
                        <Col md={6}>
                            <Card className="h-100 shadow-sm border-0">
                                <CardHeader className="bg-light d-flex justify-content-between align-items-center">
                                    <div className="form-check mb-0">
                                        <Input
                                            type="checkbox"
                                            id="purchasable"
                                            name="purchasable"
                                            checked={formik.values.purchasable}
                                            onChange={formik.handleChange}
                                            className="form-check-input"
                                        />
                                        <Label htmlFor="purchasable" className="form-check-label fw-bold text-warning">Purchase Information</Label>
                                    </div>
                                </CardHeader>
                                {formik.values.purchasable && (
                                    <CardBody>
                                        <Row>
                                            <Col md={6}>
                                                <FormGroup className="mb-3">
                                                    <Label htmlFor="costPrice">Cost Price</Label>
                                                    <Input
                                                        id="costPrice"
                                                        name="costPrice"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        value={formik.values.costPrice}
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col md={6}>
                                                <FormGroup className="mb-3">
                                                    <Label htmlFor="preferredVendorId">Preferred Vendor</Label>
                                                    <Input
                                                        id="preferredVendorId"
                                                        name="preferredVendorId"
                                                        type="select"
                                                        onChange={formik.handleChange}
                                                        value={formik.values.preferredVendorId}
                                                    >
                                                        <option value="">Select Vendor</option>
                                                        {vendors.map(v => {
                                                            const id = v.partyId ?? v.PartyId;
                                                            const name = v.displayName ?? v.DisplayName ?? v.display_name;
                                                            return <option key={id} value={id}>{name}</option>;
                                                        })}
                                                    </Input>
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="purchaseAccount">Account</Label>
                                            <Input
                                                id="purchaseAccount"
                                                name="purchaseAccount"
                                                type="select"
                                                onChange={formik.handleChange}
                                                value={formik.values.purchaseAccount}
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(a => {
                                                    const id = a.accountId ?? a.AccountId;
                                                    const name = a.accountName ?? a.AccountName;
                                                    return <option key={id} value={id}>{name}</option>;
                                                })}
                                            </Input>
                                        </FormGroup>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="purchaseEffectedAccount">Purchase Effected Account</Label>
                                            <Input
                                                id="purchaseEffectedAccount"
                                                name="purchaseEffectedAccount"
                                                type="select"
                                                onChange={formik.handleChange}
                                                value={formik.values.purchaseEffectedAccount}
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(a => {
                                                    const id = a.accountId ?? a.AccountId;
                                                    const name = a.accountName ?? a.AccountName;
                                                    return <option key={id} value={id}>{name}</option>;
                                                })}
                                            </Input>
                                        </FormGroup>
                                        <FormGroup className="mb-0">
                                            <Label htmlFor="purchaseDescription">Purchase Description</Label>
                                            <Input
                                                id="purchaseDescription"
                                                name="purchaseDescription"
                                                type="textarea"
                                                rows="2"
                                                onChange={formik.handleChange}
                                                value={formik.values.purchaseDescription}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                )}
                            </Card>
                        </Col>
                    </Row>

                    {/* Opening Detail (Goods Only) */}
                    {isGoods && (
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle tag="h5" className="mb-0">Opening Detail</CardTitle>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    <Col md={3}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="openingQuantity">Opening Quantity</Label>
                                            <Input
                                                id="openingQuantity"
                                                name="openingQuantity"
                                                type="number"
                                                step="0.0001"
                                                onChange={formik.handleChange}
                                                onBlur={(e) => {
                                                    formik.setFieldValue('openingQuantity', formatToFourDecimals(e.target.value));
                                                    formik.handleBlur(e);
                                                }}
                                                value={formik.values.openingQuantity}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={3}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="openingPrice">Opening Price/Unit</Label>
                                            <Input
                                                id="openingPrice"
                                                name="openingPrice"
                                                type="number"
                                                onChange={formik.handleChange}
                                                value={formik.values.openingPrice}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={3}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="openingAmount">Opening Amount</Label>
                                            <Input
                                                id="openingAmount"
                                                name="openingAmount"
                                                type="number"
                                                readOnly
                                                disabled
                                                value={formik.values.openingAmount}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={3}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="purchaseEffectedAccount">Inventory Account</Label>
                                            <Input
                                                id="purchaseEffectedAccount"
                                                name="purchaseEffectedAccount"
                                                type="select"
                                                onChange={formik.handleChange}
                                                value={formik.values.purchaseEffectedAccount}
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(a => {
                                                    const id = a.accountId ?? a.AccountId;
                                                    const name = a.accountName ?? a.AccountName;
                                                    return <option key={id} value={id}>{name}</option>;
                                                })}
                                            </Input>
                                        </FormGroup>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={4}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="minQuantity">Min. Stock To Maintain</Label>
                                            <Input
                                                id="minQuantity"
                                                name="minQuantity"
                                                type="number"
                                                step="0.0001"
                                                onChange={formik.handleChange}
                                                onBlur={(e) => {
                                                    formik.setFieldValue('minQuantity', formatToFourDecimals(e.target.value));
                                                    formik.handleBlur(e);
                                                }}
                                                value={formik.values.minQuantity}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={4}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="maxQuantity">Max. Stock To Maintain</Label>
                                            <Input
                                                id="maxQuantity"
                                                name="maxQuantity"
                                                type="number"
                                                step="0.0001"
                                                onChange={formik.handleChange}
                                                onBlur={(e) => {
                                                    formik.setFieldValue('maxQuantity', formatToFourDecimals(e.target.value));
                                                    formik.handleBlur(e);
                                                }}
                                                value={formik.values.maxQuantity}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={4}>
                                        <FormGroup className="mb-3">
                                            <Label htmlFor="reOrderQuantity">Re-Order Level</Label>
                                            <Input
                                                id="reOrderQuantity"
                                                name="reOrderQuantity"
                                                type="number"
                                                step="0.0001"
                                                onChange={formik.handleChange}
                                                onBlur={(e) => {
                                                    formik.setFieldValue('reOrderQuantity', formatToFourDecimals(e.target.value));
                                                    formik.handleBlur(e);
                                                }}
                                                value={formik.values.reOrderQuantity}
                                            />
                                        </FormGroup>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>
                    )}

                    <div className="text-start mb-4">
                        <Button
                            color="light"
                            className="me-2"
                            onClick={() => onCancel ? onCancel() : navigate('/apps-product-master')}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="success"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Processing..." : (isEdit ? "Update Product" : "Save Product")}
                        </Button>
                    </div>
                </Col>
            </Row>
        </Form>
    );
};

export default ProductForm;
