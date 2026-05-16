import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Card, CardHeader, CardBody, Col, Container, Row,
    Input, Button, Label, Spinner
} from 'reactstrap';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import CommonTable from "../../Components/Common/CommonTable";
import "../../Components/Common/CommonTable.css";
import HeaderForAllRpt from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";

/* ── helpers ──────────────────────────────────────────────── */
const formatDateForApi = (date) => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

/* ── column definitions ────────────────────────────────────── */
const buildColumns = () => [
    {
        key: "invDate", label: "Date", width: "120px", align: "left", sortType: "date",
        totalType: "none",
        cell: (row) => formatDate(row.invDate),
    },
    {
        key: "invType", label: "Type", width: "110px", align: "left", sortType: "string",
        totalType: "none",
    },
    {
        key: "qty", label: "Total Qty", width: "100px", align: "right", sortType: "number",
        decimals: 2,
    },
    {
        key: "avgPrice",
        label: "Avg Price",
        sortType: "number",
        align: "right",
        totalType: "none",
        totalFn: (totals) => {
            const qty = totals.qty || 0;
            return qty ? totals.taxableAmount / qty : 0;
        },
        decimals: 2
    },
    {
        key: "taxableAmount", label: "Taxable Amt", width: "130px", align: "right", sortType: "number",
    },
    {
        key: "igstAmount", label: "IGST", width: "100px", align: "right", sortType: "number",
    },
    {
        key: "cgstAmount", label: "CGST", width: "100px", align: "right", sortType: "number",
    },
    {
        key: "sgstAmount", label: "SGST", width: "100px", align: "right", sortType: "number",
    },
    {
        key: "taxAmount", label: "Tax Amount", width: "110px", align: "right", sortType: "number",
    },
    {
        key: "totalAmount", label: "Total Amount", width: "120px", align: "right", sortType: "number",
    },
    {
        key: "totDiscount", label: "Exp Discount", width: "110px", align: "right", sortType: "number",
    },
    {
        key: "roundOff", label: "Round Off", width: "100px", align: "right", sortType: "number",
    },
    {
        key: "finalAmount", label: "Final Amount", width: "120px", align: "right", sortType: "number",
    },
    {
        key: "addPrice", label: "Add Price", width: "100px", align: "right", sortType: "number",
        totalType: "none",
        totalFn: (t) => t.qty > 0 ? t.addAmount / t.qty : 0,
    },
    {
        key: "addAmount", label: "Add Amount", width: "110px", align: "right", sortType: "number",
    },
];

/* ── component ─────────────────────────────────────────────── */
const SalePurchaseRegisterDatewise = ({
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
    const [partys, setPartys] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invType, setInvType] = useState(forcedInvType || "");
    const [fromDate, setFromDate] = useState("2026-04-01");
    const [toDate, setToDate] = useState("2026-04-30");
    const [dateRange, setDateRange] = useState([]);
    useEffect(() => { if (forcedInvType) setInvType(forcedInvType); }, [forcedInvType]);

    /* ── data state ── */
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [generated, setGenerated] = useState(false);
    const [companyInfo, setCompanyInfo] = useState(null);

    /* ── stable columns ── */
    const columns = useMemo(() => buildColumns(), []);

    /* ── load dropdowns + company info ── */
    useEffect(() => {
        const fetchData = async () => {
            try {
                const partyRes = await api.get(url.GET_PARTIES);
                const partyList = Array.isArray(partyRes) ? partyRes : (partyRes?.data || []);
                setPartys(
                    partyList
                        .filter(p => ["Vendor", "Customer", "Trader"].includes(p.partyType || p.PartyType))
                        .map(p => ({ value: p.displayName || p.DisplayName, label: p.displayName || p.DisplayName }))
                );

                const prodRes = await api.get(url.GET_PRODUCTS_DETAILS);
                const prodList = Array.isArray(prodRes) ? prodRes : (prodRes?.data || []);
                setProducts(prodList.map(p => ({ value: p.name || p.Name, label: p.name || p.Name })));

                const compRes = await api.get(url.GET_COMPANY_PROFILE);
                setCompanyInfo(compRes?.data || compRes);
            } catch (err) {
                console.error("Error fetching initial data:", err);
            }
        };
        fetchData();
    }, []);
    const fromRef = useRef(null);
    const toRef = useRef(null);

    /* ── fetch report ── */
    const fetchReport = async () => {
        debugger;
        setLoading(true);
        setError("");
        setGenerated(false);

        try {
            const fromDate = showFilters
                ? fromRef.current?.value
                : globalFilters?.fromDate;

            const toDate = showFilters
                ? toRef.current?.value
                : globalFilters?.toDate;
            const activeParty = showFilters ? selectedParty : (globalFilters?.selectedParty || null);
            const activeProduct = showFilters ? selectedProduct : (globalFilters?.selectedProduct || null);
            const activeInvoice = showFilters ? invoiceNo : (globalFilters?.invoiceNo || "");


            const escapeSql = (s) => (s ? s.toString().replace(/'/g, "''") : "");
            const conditions = [];
            if (fromDate && toDate) conditions.push(`tsp.inv_date BETWEEN '${fromDate}' AND '${toDate}'`);
            if (activeParty?.value) conditions.push(`pm.display_name = '${escapeSql(activeParty.value)}'`);
            if (activeProduct?.value) conditions.push(`prod.product_name = '${escapeSql(activeProduct.value)}'`);
            if (activeInvoice) conditions.push(`tsp.inv_no = '${escapeSql(activeInvoice)}'`);

            const whereClause = conditions.length ? conditions.join(" AND ") : "1=1";
            const currentInvType = forcedInvType || invType;
            console.log(whereClause);
            const response = await api.get(url.GET_SALE_PURCHASE_REGISTER_DATEWISE, {
                params: {
                    companyId: localStorage.getItem("companyId") || null,
                    invType: currentInvType || null,
                    reportType: "DATE",
                    where: whereClause,
                },
            });

            const raw = Array.isArray(response) ? response : (response?.data || []);

            const processedData = raw.map(item => ({
                ...item,
                invDate: item.invDate || item.InvDate || item.inv_date || "",
                invType: item.invType || item.InvType || item.inv_type || "",
                qty: item.qty || item.Qty || 0,
                avgPrice: item.avgPrice || item.AvgPrice || 0,
                taxableAmount: item.taxableAmount || item.TaxableAmount || item.Taxable_Amount || item.taxable_amount || 0,
                igstAmount: item.igstAmount || item.IgstAmount || item.Igst_Amount || item.igst_amount || 0,
                cgstAmount: item.cgstAmount || item.CgstAmount || item.Cgst_Amount || item.cgst_amount || 0,
                sgstAmount: item.sgstAmount || item.SgstAmount || item.Sgst_Amount || item.sgst_amount || 0,
                taxAmount: item.taxAmount || item.TaxAmount || item.Tax_Amount || item.tax_amount || 0,
                totalAmount: item.totalAmount || item.TotalAmount || item.Total_Amount || item.total_amount || 0,
                totDiscount: item.totDiscount || item.TotDiscount || item.Tot_Discount || item.tot_discount || 0,
                roundOff: item.roundOff || item.RoundOff || item.Round_Off || item.round_off || 0,
                finalAmount: item.finalAmount || item.FinalAmount || item.Final_Amount || item.final_amount || 0,
                addPrice: item.addPrice || item.AddPrice || item.Add_Price || item.add_price || 0,
                addAmount: item.addAmount || item.AddAmount || item.Add_Amount || item.add_amount || 0,
            }));

            setReportData(processedData);
            setGenerated(true);
            if (setCurrentPage) setCurrentPage(1);
        } catch (err) {
            console.error("Error fetching report:", err);
            setError(err?.message || "Failed to fetch report.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!showFilters && refreshKey > 0) fetchReport();
    }, [refreshKey, showFilters]);

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
        const sums = reportData.reduce((acc, curr) => ({
            totalQty: acc.totalQty + (Number(curr.qty) || 0),
            taxableAmount: acc.taxableAmount + (Number(curr.taxableAmount) || 0),
            igstAmount: acc.igstAmount + (Number(curr.igstAmount) || 0),
            cgstAmount: acc.cgstAmount + (Number(curr.cgstAmount) || 0),
            sgstAmount: acc.sgstAmount + (Number(curr.sgstAmount) || 0),
            taxAmount: acc.taxAmount + (Number(curr.taxAmount) || 0),
            totalAmount: acc.totalAmount + (Number(curr.totalAmount) || 0),
            totDiscount: acc.totDiscount + (Number(curr.totDiscount) || 0),
            roundOff: acc.roundOff + (Number(curr.roundOff) || 0),
            finalAmount: acc.finalAmount + (Number(curr.finalAmount) || 0),
            addAmount: acc.addAmount + (Number(curr.addAmount) || 0),
        }), { totalQty: 0, taxableAmount: 0, igstAmount: 0, cgstAmount: 0, sgstAmount: 0, taxAmount: 0, totalAmount: 0, totDiscount: 0, roundOff: 0, finalAmount: 0, addAmount: 0 });

        sums.avgPrice = sums.totalQty > 0 ? sums.taxableAmount / sums.totalQty : 0;
        sums.addPrice = sums.totalQty > 0 ? sums.addAmount / sums.totalQty : 0;
        return sums;
    }, [reportData]);

    /* ── excel export ── */
    const handleDownloadExcel = () => {
        if (reportData.length === 0) return;

        const dateStr = dateRange.length > 0
            ? `Period: ${formatDate(dateRange[0])} to ${formatDate(dateRange[1] || dateRange[0])}`
            : "Period: All Time";

        const header = [
            [`${invType || 'Sales Purchase'} Register Report - Datewise`],
            [companyInfo?.companyName || "SoftBook"],
            [dateStr],
            [],
        ];

        const tableHeader = [
            "Date", "Type", "Total Qty", "Avg Price", "Taxable Amount",
            "IGST", "CGST", "SGST", "Tax Amount", "Total Amount",
            "Exp Discount", "Round Off", "Final Amount", "Add Price", "Add Amount",
        ];

        const rows = reportData.map(item => [
            formatDate(item.invDate), item.invType,
            item.qty, item.avgPrice, item.taxableAmount,
            item.igstAmount, item.cgstAmount, item.sgstAmount,
            item.taxAmount, item.totalAmount, item.totDiscount,
            item.roundOff, item.finalAmount, item.addPrice, item.addAmount,
        ]);

        const totalRow = [
            "TOTAL", "",
            totals.totalQty, totals.avgPrice, totals.taxableAmount,
            totals.igstAmount, totals.cgstAmount, totals.sgstAmount,
            totals.taxAmount, totals.totalAmount, totals.totDiscount,
            totals.roundOff, totals.finalAmount, totals.addPrice, totals.addAmount,
        ];

        const worksheet = XLSX.utils.aoa_to_sheet([...header, tableHeader, ...rows, totalRow]);
        worksheet['!merges'] = [0, 1, 2, 3, 4].map(r => ({ s: { r, c: 0 }, e: { r, c: 14 } }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Datewise Report");
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        saveAs(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }),
            "Sales_Purchase_Datewise_Report.xlsx"
        );
    };

    /* ── clear ── */
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

    /* ── render ── */
    return (
        <React.Fragment>
            <div className={showFilters ? "page-content" : "page-content p-0"}>
                <Container fluid className={showFilters ? "" : "px-0"}>

                    {/* Page title */}
                    {showFilters && (
                        <Row>
                            <Col xs={12}>
                                <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                                    <h4 className="mb-sm-0">Sales Purchase Register Datewise</h4>
                                </div>
                            </Col>
                        </Row>
                    )}

                    {/* Filters card */}
                    {showFilters && (
                        <Row>
                            <Col lg={12}>
                                <Card>
                                    <CardHeader>
                                        <h5 className="card-title mb-0">Filters</h5>
                                    </CardHeader>
                                    <CardBody >
                                        <Row className="g-3">
                                            <Col lg={2}>
                                                <div className="mb-3 mb-lg-0">
                                                    <Label className="form-label text-muted text-uppercase fw-semibold mb-1">
                                                        From Date
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        defaultValue={fromDate}
                                                        innerRef={fromRef}
                                                    />
                                                </div>
                                            </Col>

                                            <Col lg={2}>
                                                <div className="mb-3 mb-lg-0">
                                                    <Label className="form-label text-muted text-uppercase fw-semibold mb-1">
                                                        To Date
                                                    </Label>

                                                    <Input
                                                        type="date"
                                                        defaultValue={toDate}
                                                        innerRef={toRef}
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={3}>
                                                <Label>Customer / Vendor</Label>
                                                <Select
                                                    value={selectedParty}
                                                    onChange={setSelectedParty}
                                                    options={partys}
                                                    isClearable
                                                    placeholder="Select Party…"
                                                />
                                            </Col>
                                            {!forcedInvType && (
                                                <Col md={2}>
                                                    <Label>Type</Label>
                                                    <select className="form-select" value={invType} onChange={(e) => setInvType(e.target.value)}>
                                                        <option value="">All</option>
                                                        <option value="Sales">Sales</option>
                                                        <option value="Purchase">Purchase</option>
                                                    </select>
                                                </Col>
                                            )}
                                            <Col md={3}>
                                                <Label>Product</Label>
                                                <Select
                                                    value={selectedProduct}
                                                    onChange={setSelectedProduct}
                                                    options={products}
                                                    isClearable
                                                    placeholder="Select Product…"
                                                />
                                            </Col>
                                            <Col md={2}>
                                                <Label>Invoice No</Label>
                                                <Input
                                                    type="text"
                                                    placeholder="Invoice No…"
                                                    value={invoiceNo}
                                                    onChange={(e) => setInvoiceNo(e.target.value)}
                                                />
                                            </Col>
                                            <Col md={3} className="d-flex align-items-end justify-content-end gap-2">
                                                <Button color="soft-secondary" onClick={handleClear}>
                                                    Clear
                                                </Button>
                                                <Button color="primary" onClick={fetchReport} disabled={loading}>
                                                    {loading ? <Spinner size="sm" /> : "Generate"}
                                                </Button>
                                                <Button color="success" onClick={handleDownloadExcel} disabled={reportData.length === 0}>
                                                    Export Excel
                                                </Button>
                                            </Col>
                                        </Row>

                                        {error && <div className="text-danger mt-2">{error}</div>}
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Data card */}
                    {(generated || loading) && (
                        <Row>
                            <Col lg={12}>
                                <Card>
                                    <HeaderForAllRpt reportName="Datewise Report" />
                                    <CardBody className="pt-3 pl-3 pr-3 pb-3">
                                        <CommonTable
                                            columns={columns}
                                            data={paginatedData}
                                            loading={loading}
                                            autoHeight={true}
                                            minWidth="1600px"
                                            showTotals
                                            paginatedData={paginatedData}
                                        />
                                        <FooterForAllRpt />
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

export default SalePurchaseRegisterDatewise;