import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardBody, Col, Container, Row, Button, Input, Label } from 'reactstrap';
import Select from "react-select";
import { APIClient } from "../../helpers/api_helper";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import * as url from "../../helpers/url_helper";
import CommonTable from "../../Components/Common/CommonTable";
import "../../Components/Common/CommonTable.css";
import HeaderForAllRpt from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";

/* ── helpers ──────────────────────────────────────────────── */
const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : null;

/* ── column definitions ────────────────────────────────────── */
const buildColumns = (isSale) => {
    const cols = [
        {
            key: "productName", label: "Item", width: "180px", align: "left", sortType: "string",
            totalType: "none",
        },
        {
            key: "qty", label: "Total Qty", width: "100px", align: "right", sortType: "number",
            decimals: 2,
        }
    ];

    if (isSale) {
        cols.push({
            key: "totalCogs", label: "COGS", width: "110px", align: "right", sortType: "number",
            cell: (row) => row.unitCogs,
            totalFn: (t) => t.qty > 0 ? t.totalCogs / t.qty : 0,
        });
    }

    cols.push({
        key: "avgPrice", label: "Avg Price", width: "110px", align: "right", sortType: "number",
        totalType: "none",
        totalFn: (t) => t.qty > 0 ? t.taxableAmount / t.qty : 0,
        cellClassName: (row) => (isSale && row.unitCogs > row.avgPrice) ? "text-danger fw-bold bg-danger-subtle" : "",
    });

    cols.push(
        { key: "taxableAmount", label: "Taxable Amt", width: "130px", align: "right", sortType: "number" },
        { key: "igstAmount", label: "IGST", width: "100px", align: "right", sortType: "number" },
        { key: "cgstAmount", label: "CGST", width: "100px", align: "right", sortType: "number" },
        { key: "sgstAmount", label: "SGST", width: "100px", align: "right", sortType: "number" },
        { key: "taxAmount", label: "Tax Amount", width: "110px", align: "right", sortType: "number" },
        { key: "totalAmount", label: "Total Amount", width: "120px", align: "right", sortType: "number" },
        {
            key: "addPrice", label: "Add Price", width: "100px", align: "right", sortType: "number",
            totalType: "none",
            totalFn: (t) => t.qty > 0 ? t.addAmount / t.qty : 0,
        },
        { key: "addAmount", label: "Add Amount", width: "110px", align: "right", sortType: "number" }
    );

    return cols;
};

/* ── component ─────────────────────────────────────────────── */
const SalePurchaseRegisterItemwise = ({
    forcedInvType,
    showFilters = true,
    globalFilters,
    refreshKey,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    onTotalChange,
}) => {
    const api = new APIClient();

    /* ── filter state ── */
    const [fromDate, setFromDate] = useState("2026-04-01");
    const [toDate, setToDate] = useState("2026-04-30");
    const [selectedParty, setSelectedParty] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invType, setInvType] = useState(forcedInvType || "");

    const fromRef = useRef(null);
    const toRef = useRef(null);

    /* ── data state ── */
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [companyInfo, setCompanyInfo] = useState(null);

    const isSale = forcedInvType === "Sales";
    const columns = useMemo(() => buildColumns(isSale), [isSale]);

    /* ── dropdown options ── */
    const [partyOptions, setPartyOptions] = useState([]);
    const [productOptions, setProductOptions] = useState([]);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [partiesRes, productsRes] = await Promise.all([
                    api.get(url.GET_PARTIES),
                    api.get(url.GET_PRODUCTS_DETAILS),
                ]);
                const parties = Array.isArray(partiesRes) ? partiesRes : partiesRes?.data || [];
                const products = Array.isArray(productsRes) ? productsRes : productsRes?.data || [];
                setPartyOptions(parties.map(p => ({ value: p.displayName || p.partyName || p.name, label: p.displayName || p.partyName || p.name })));
                setProductOptions(products.map(p => ({ value: p.name || p.Name, label: p.name || p.Name })));
            } catch (error) {
                console.error("Failed loading options", error);
            }
        };
        loadOptions();
    }, []);

    /* ── load company info ── */
    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const res = await api.get(url.GET_COMPANY_PROFILE);
                setCompanyInfo(res?.data || res);
            } catch (e) {
                console.error("Company fetch failed", e);
            }
        };
        fetchCompany();
    }, []);

    /* ── fetch report ── */
    const fetchReport = async () => {
        setLoading(true);
        setGenerated(false);
        try {
            const activeFromDate = showFilters ? fromRef.current?.value : (globalFilters?.fromDate || fromDate);
            const activeToDate = showFilters ? toRef.current?.value : (globalFilters?.toDate || toDate);
            const activeParty = showFilters ? selectedParty : globalFilters?.selectedParty;
            const activeProduct = showFilters ? selectedProduct : globalFilters?.selectedProduct;
            const activeInvoice = showFilters ? invoiceNo : (globalFilters?.invoiceNo || "");

            const conditions = [];
            if (activeFromDate && activeToDate) conditions.push(`tsp.inv_date BETWEEN '${activeFromDate}' AND '${activeToDate}'`);
            if (activeParty?.value) conditions.push(`pm.display_name = '${activeParty.value}'`);
            if (activeProduct?.value) conditions.push(`prod.product_name = '${activeProduct.value}'`);
            if (activeInvoice) conditions.push(`tsp.inv_no = '${activeInvoice}'`);

            const where = conditions.length ? conditions.join(" AND ") : "1=1";

            const res = await api.get(url.GET_SALE_PURCHASE_REGISTER_ITEMWISE, {
                params: {
                    companyId: localStorage.getItem("companyId"),
                    invType: forcedInvType || invType || null,
                    reportType: "ITEM",
                    where,
                },
            });

            const raw = res?.data || res || [];
            const data = raw.map(x => ({
                productName: x.productName || x.ProductName || x.product_name || "",
                qty: Number(x.qty || x.Qty || 0),
                unitCogs: Number(x.cogs || x.Cogs || x.COGS || x.costPrice || 0),
                totalCogs: Number(x.cogs || x.Cogs || x.COGS || x.costPrice || 0) * Number(x.qty || 0),
                avgPrice: Number(x.avgPrice || x.AvgPrice || 0),
                taxableAmount: Number(x.taxableAmount || x.TaxableAmount || x.Taxable_Amount || x.taxable_amount || 0),
                sgstAmount: Number(x.sgstAmount || x.SgstAmount || x.Sgst_Amount || x.sgst_amount || 0),
                cgstAmount: Number(x.cgstAmount || x.CgstAmount || x.Cgst_Amount || x.cgst_amount || 0),
                igstAmount: Number(x.igstAmount || x.IgstAmount || x.Igst_Amount || x.igst_amount || 0),
                taxAmount: Number(x.taxAmount || x.TaxAmount || x.Tax_Amount || x.tax_amount || 0),
                totalAmount: Number(x.totalAmount || x.TotalAmount || x.Total_Amount || x.total_amount || 0),
                finalAmount: Number(x.finalAmount || x.FinalAmount || x.Final_Amount || x.final_amount || 0),
                addPrice: Number(x.addPrice || x.AddPrice || x.Add_Price || x.add_price || 0),
                addAmount: Number(x.addAmount || x.AddAmount || x.Add_Amount || x.add_amount || 0),
            }));

            setReportData(data);
            setGenerated(true);
            if (setCurrentPage) setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if ((!showFilters && refreshKey > 0)) fetchReport();
    }, [refreshKey, showFilters]);

    const handleClear = () => {
        if (fromRef.current) fromRef.current.value = "2026-04-01";
        if (toRef.current) toRef.current.value = "2026-04-30";
        setSelectedParty(null);
        setSelectedProduct(null);
        setInvoiceNo("");
        if (!forcedInvType) setInvType("");
        setReportData([]);
        setGenerated(false);
    };

    /* ── pagination ── */
    const totalEntries = reportData.length;
    useEffect(() => { if (onTotalChange) onTotalChange(totalEntries); }, [totalEntries, onTotalChange]);

    const effectiveRowsPerPage = rowsPerPage === "all" ? Math.max(totalEntries, 1) : Number(rowsPerPage);
    const safeCurrentPage = Math.min(currentPage || 1, Math.max(1, Math.ceil(totalEntries / effectiveRowsPerPage)));
    const startIndex = (safeCurrentPage - 1) * effectiveRowsPerPage;
    const paginatedData = useMemo(
        () => rowsPerPage === "all" ? reportData : reportData.slice(startIndex, startIndex + effectiveRowsPerPage),
        [reportData, startIndex, effectiveRowsPerPage, rowsPerPage]
    );

    /* ── totals for excel ── */
    const totals = useMemo(() => {
        const sums = reportData.reduce((a, b) => ({
            qty: a.qty + b.qty,
            cogsSum: a.cogsSum + b.totalCogs,
            taxableAmount: a.taxableAmount + b.taxableAmount,
            sgstAmount: a.sgstAmount + b.sgstAmount,
            cgstAmount: a.cgstAmount + b.cgstAmount,
            igstAmount: a.igstAmount + b.igstAmount,
            taxAmount: a.taxAmount + b.taxAmount,
            totalAmount: a.totalAmount + b.totalAmount,
            finalAmount: a.finalAmount + b.finalAmount,
            addAmount: a.addAmount + b.addAmount,
        }), { qty: 0, cogsSum: 0, taxableAmount: 0, sgstAmount: 0, cgstAmount: 0, igstAmount: 0, taxAmount: 0, totalAmount: 0, finalAmount: 0, addAmount: 0 });
 
        sums.avgCogs = Number((sums.qty > 0 ? sums.cogsSum / sums.qty : 0).toFixed(2));
        sums.avgPrice = Number((sums.qty > 0 ? sums.taxableAmount / sums.qty : 0).toFixed(2));
        sums.addPrice = Number((sums.qty > 0 ? sums.addAmount / sums.qty : 0).toFixed(2));
        return sums;
    }, [reportData]);

    /* ── excel export ── */
    const handleDownloadExcel = () => {
        if (reportData.length === 0) return;

        const dateStr = `Period: ${fromRef.current?.value} to ${toRef.current?.value}`;

        const header = [
            [`${invType || 'Sales Purchase'} Register Report - Itemwise`],
            [companyInfo?.companyName || "SoftBook"],
            [dateStr],
            [],
        ];

        const tableHeader = [
            "Item", "Total Qty", ...(isSale ? ["COGS"] : []), "Avg Price", "Taxable Amount",
            "IGST", "CGST", "SGST", "Tax Amount", "Total Amount",
            "Add Price", "Add Amount",
        ];
 
        const rows = reportData.map(item => [
            item.productName, item.qty, ...(isSale ? [item.unitCogs] : []), item.avgPrice, item.taxableAmount,
            item.igstAmount, item.cgstAmount, item.sgstAmount,
            item.taxAmount, item.totalAmount, item.addPrice, item.addAmount,
        ]);
 
        const totalRow = [
            "TOTAL", totals.qty, ...(isSale ? [totals.avgCogs] : []), totals.avgPrice, totals.taxableAmount,
            totals.igstAmount, totals.cgstAmount, totals.sgstAmount,
            totals.taxAmount, totals.totalAmount, totals.addPrice, totals.addAmount,
        ];

        const worksheet = XLSX.utils.aoa_to_sheet([...header, tableHeader, ...rows, totalRow]);
        worksheet['!merges'] = [0, 1, 2, 3, 4].map(r => ({ s: { r, c: 0 }, e: { r, c: 10 } }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Itemwise Report");
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        saveAs(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }),
            "Sales_Purchase_Itemwise_Report.xlsx"
        );
    };

    /* ── render ── */
    return (
        <React.Fragment>
            <div className={showFilters ? "page-content" : "page-content p-0"}>
                <Container fluid className={showFilters ? "" : "px-0"}>
                    {showFilters && (
                        <Row>
                            <Col lg={12}>
                                <Card>
                                    <CardBody>
                                        <h5 className="mb-3">Filters</h5>
                                        <Row className="g-3">
                                            <Col lg={2}>
                                                <Label className="form-label text-muted text-uppercase fw-semibold mb-1">From Date</Label>
                                                <Input type="date" defaultValue={fromDate} innerRef={fromRef} />
                                            </Col>
                                            <Col lg={2}>
                                                <Label className="form-label text-muted text-uppercase fw-semibold mb-1">To Date</Label>
                                                <Input type="date" defaultValue={toDate} innerRef={toRef} />
                                            </Col>
                                            <Col lg={3}>
                                                <Label>Customer</Label>
                                                <Select
                                                    value={selectedParty}
                                                    onChange={setSelectedParty}
                                                    options={partyOptions}
                                                    isClearable
                                                    placeholder="Select Party…"
                                                />
                                            </Col>
                                            <Col lg={3}>
                                                <Label>Product</Label>
                                                <Select
                                                    value={selectedProduct}
                                                    onChange={setSelectedProduct}
                                                    options={productOptions}
                                                    isClearable
                                                    placeholder="Select Product…"
                                                />
                                            </Col>
                                            {!forcedInvType && (
                                                <Col lg={2}>
                                                    <Label>Type</Label>
                                                    <Input type="select" value={invType} onChange={(e) => setInvType(e.target.value)}>
                                                        <option value="">All</option>
                                                        <option value="Sales">Sales</option>
                                                        <option value="Purchase">Purchase</option>
                                                    </Input>
                                                </Col>
                                            )}
                                        </Row>
                                        <Row className="mt-3">
                                            <Col className="d-flex justify-content-end gap-2">
                                                <Button color="soft-secondary" onClick={handleClear}>Clear</Button>
                                                <Button color="primary" onClick={fetchReport} disabled={loading}>
                                                    {loading ? "Generating..." : "Generate"}
                                                </Button>
                                                <Button color="success" onClick={handleDownloadExcel} disabled={reportData.length === 0}>
                                                    Export Excel
                                                </Button>
                                            </Col>
                                        </Row>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    <Card>
                        <HeaderForAllRpt reportName="Itemwise Report" />
                        <CardBody className="pt-3 pl-3 pr-3 pb-3">
                            <CommonTable
                                columns={columns}
                                data={paginatedData}
                                loading={loading}
                                maxHeight="calc(100vh - 280px)"
                                minWidth="1360px"
                                showTotals
                                paginatedData={paginatedData}
                            />
                        </CardBody>
                        <FooterForAllRpt />
                    </Card>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default SalePurchaseRegisterItemwise;

