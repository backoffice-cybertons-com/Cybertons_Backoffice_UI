import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Input,
  Button,
  Label,
} from "reactstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import { createSelector } from "reselect";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import ExportButton from "../../Components/Common/ExportButton";
import CommonTable from "../../Components/Common/CommonTable";    // ← new
import "../../Components/Common/CommonTable.css";                 // ← new
import HeaderForAllRpt from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";

/* ── helpers ───────────────────────────────────────────────── */
const getCurrentMonthRange = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
};

const toDateObj = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return (y && m && d) ? new Date(y, m - 1, d) : null;
};

const getInvLink = (row) => {
  const id = row.spUniqueCode || row.invId || row.id;
  if (!id) return null;
  const type = (row.invType || "").toLowerCase();
  if (type.includes("sale")) return `/sales-order/edit/${id}?view=true`;
  if (type.includes("purchase")) return `/purchase-transaction/edit/${id}?view=true`;
  return null;
};

/* ── column definitions ─────────────────────────────────────── */
const buildColumns = () => [
  {
    key: "invDate", label: "Date", width: "120px", align: "left", sortType: "date",
    totalType: "none",
  },
  {
    key: "invNo", label: "Invoice No", width: "140px", align: "left", sortType: "string",
    totalType: "none",
    cell: (row) => {
      const link = getInvLink(row);
      return link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="ct-inv-link">
          {row.invNo}
          <i className="ri-external-link-line" />
        </a>
      ) : (
        <span className="text-muted">{row.invNo || "–"}</span>
      );
    },
  },
  {
    key: "invType", label: "Type", width: "120px", align: "left", sortType: "string",
    totalType: "none",
  },
  {
    key: "partyName", label: "Customer", width: "220px", align: "left", sortType: "string",
    totalType: "none",
  },
  {
    key: "qty", label: "Qty", width: "100px", align: "right", sortType: "number",
    decimals: 0,
  },
  {
    key: "avgPrice", label: "Avg Price", width: "110px", align: "right", sortType: "number",
    totalType: "none",   // derived below
    totalFn: (t) => t.qty > 0 ? t.taxableAmount / t.qty : 0,
  },
  {
    key: "taxableAmount", label: "Taxable", width: "120px", align: "right", sortType: "number",
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
    key: "taxAmount", label: "Tax Amt", width: "110px", align: "right", sortType: "number",
  },
  {
    key: "totalAmount", label: "Total Amt", width: "120px", align: "right", sortType: "number",
  },
  {
    key: "totDiscount", label: "Discount", width: "100px", align: "right", sortType: "number",
  },
  {
    key: "roundOff", label: "Round Off", width: "100px", align: "right", sortType: "number",
  },
  {
    key: "finalAmount", label: "Final Amt", width: "120px", align: "right", sortType: "number",
  },
  {
    key: "addPrice", label: "Add Price", width: "100px", align: "right", sortType: "number",
    totalType: "none",
    totalFn: (t) => t.qty > 0 ? t.addAmount / t.qty : 0,
  },
  {
    key: "addAmount", label: "Add Amt", width: "110px", align: "right", sortType: "number",
  },
];

/* ── component ──────────────────────────────────────────────── */
const SalePurInvWiseRpt = ({
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
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const defaultDates = getCurrentMonthRange();

  /* ── filter state ── */
  const [fromDate, setFromDate] = useState(defaultDates.from);
  const [toDate, setToDate] = useState(defaultDates.to);
  const [dateRange, setDateRange] = useState([toDateObj(defaultDates.from), toDateObj(defaultDates.to)]);
  const [productName, setProductName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invType, setInvType] = useState(forcedInvType || "");
  const [companyInfo, setCompanyInfo] = useState(null);
  useEffect(() => { if (forcedInvType) setInvType(forcedInvType); }, [forcedInvType]);

  /* ── dropdown options ── */
  const [customerOptions, setCustomerOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);

  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const partiesRes = await api.get(url.GET_PARTIES);
        const partiesData = Array.isArray(partiesRes) ? partiesRes : partiesRes?.data || [];
        setCustomerOptions(
          partiesData.map((p) => {
            const name = p.displayName || p.DisplayName || p.partyName || p.PartyName || p.name || p.Name || "Unknown";
            return { value: name, label: name };
          }),
        );

        const prodRes = await api.get(url.GET_PRODUCTS_DETAILS);
        const prodData = Array.isArray(prodRes) ? prodRes : prodRes?.data || [];
        setProductOptions(prodData.map((p) => ({ value: p.name, label: p.name })));
      } catch (err) {
        console.error("Failed to fetch dropdown options", err);
      }
    };
    fetchDropdownOptions();
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const compRes = await api.get(url.GET_COMPANY_PROFILE);
      setCompanyInfo(compRes?.data || compRes);
    } catch (err) {
      console.error("Failed to fetch company info", err);
    }
  };

  /* ── report data ── */
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  /* ── dark mode ── */
  const selectLayoutState = (state) => state.Layout;
  const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
    layoutModeType: layout.layoutModeType,
  }));
  const { layoutModeType } = useSelector(selectLayoutProperties);
  const isDarkMode = layoutModeType === "dark";

  /* ── columns (memoised; stable) ── */
  const columns = useMemo(() => buildColumns(), []);

  /* ── pagination ── */
  const totalEntries = reportData.length;
  useEffect(() => { if (onTotalChange) onTotalChange(totalEntries); }, [totalEntries, onTotalChange]);

  const effectiveRowsPerPage = rowsPerPage === "all"
    ? Math.max(totalEntries, 1)
    : Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(totalEntries / effectiveRowsPerPage));
  const safeCurrentPage = Math.min(currentPage || 1, totalPages);
  const startIndex = (safeCurrentPage - 1) * effectiveRowsPerPage;
  const endIndex = Math.min(startIndex + effectiveRowsPerPage, totalEntries);
  const paginatedData = rowsPerPage === "all" ? reportData : reportData.slice(startIndex, endIndex);

  /* ── fetch ── */
  const fetchReport = async () => {
    const companyId = parseInt(localStorage.getItem("companyId"));
    if (!companyId) { setError("Company ID is required"); return; }

    setLoading(true);
    setError("");

    try {
      const activeFromDate = showFilters ? fromRef.current?.value : (globalFilters?.fromDate || fromDate);
      const activeToDate = showFilters ? toRef.current?.value : (globalFilters?.toDate || toDate);
      const activeCustomer = showFilters ? customerName : (globalFilters?.selectedParty?.value || "");
      const activeProduct = showFilters ? productName : (globalFilters?.selectedProduct?.value || "");
      const activeInvoice = showFilters ? invoiceNo : (globalFilters?.invoiceNo || "");

      const escapeSql = (s) => (s ? s.replace(/'/g, "''") : "");
      const conditions = [];
      if (activeFromDate && activeToDate)
        conditions.push(`tsp.inv_date BETWEEN '${activeFromDate}' AND '${activeToDate}'`);
      if (activeCustomer)
        conditions.push(`pm.display_name = '${escapeSql(activeCustomer)}'`);
      if (activeProduct)
        conditions.push(`prod.product_name = '${escapeSql(activeProduct)}'`);
      if (activeInvoice)
        conditions.push(`tsp.inv_no = '${escapeSql(activeInvoice)}'`);

      const whereClause = conditions.length > 0 ? conditions.join(" AND ") : "1=1";
      const currentInvType = forcedInvType || invType;

      const response = await api.get(url.GET_SALE_PUR_INVWISE, {
        params: { companyId, invType: currentInvType || null, reportType: "INV", where: whereClause },
      });

      const raw = Array.isArray(response) ? response : response?.data || [];

      const processedData = raw.map((item) => ({
        ...item,
        invDate: item.invDate || item.InvDate,
        invNo: item.invNo || item.InvNo,
        invType: item.invType || item.InvType,
        partyName: item.partyName || item.PartyName || item.customerName || item.customer_name || item.display_name || item.Party_Name,
        qty: item.qty || item.Qty || 0,
        avgPrice: item.avgPrice || item.AvgPrice || 0,
        taxableAmount: item.taxableAmount || item.TaxableAmount || item.Taxable_Amount || 0,
        igstAmount: item.igstAmount || item.IgstAmount || item.Igst_Amount || 0,
        cgstAmount: item.cgstAmount || item.CgstAmount || item.Cgst_Amount || 0,
        sgstAmount: item.sgstAmount || item.SgstAmount || item.Sgst_Amount || 0,
        taxAmount: item.taxAmount || item.TaxAmount || item.Tax_Amount || 0,
        totalAmount: item.totalAmount || item.TotalAmount || item.Total_Amount || 0,
        totDiscount: item.totDiscount || item.TotDiscount || item.Tot_Discount || 0,
        roundOff: item.roundOff || item.RoundOff || item.Round_Off || 0,
        finalAmount: item.finalAmount || item.FinalAmount || item.Final_Amount || 0,
        addPrice: item.addPrice || item.AddPrice || 0,
        addAmount: item.addAmount || item.AddAmount || 0,
      }));

      setReportData(processedData);
      setGenerated(true);
      if (setCurrentPage) setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showFilters && refreshKey > 0) fetchReport();
  }, [refreshKey, showFilters]);

  /* ── clear filters ── */
  const handleClear = () => {
    if (fromRef.current) fromRef.current.value = defaultDates.from;
    if (toRef.current) toRef.current.value = defaultDates.to;
    setProductName("");
    setCustomerName("");
    setInvoiceNo("");
    if (!forcedInvType) setInvType("");
  };

  /* ── export columns ── */
  const exportColumns = [
    { label: "Date", accessor: "invDate" },
    { label: "Invoice No", accessor: "invNo" },
    { label: "Type", accessor: "invType" },
    { label: "Customer", accessor: "partyName" },
    { label: "Total Qty", accessor: "qty" },
    { label: "Avg Price", accessor: "avgPrice" },
    { label: "Taxable Amount", accessor: "taxableAmount" },
    { label: "IGST", accessor: "igstAmount" },
    { label: "CGST", accessor: "cgstAmount" },
    { label: "SGST", accessor: "sgstAmount" },
    { label: "Tax Amount", accessor: "taxAmount" },
    { label: "Total Amount", accessor: "totalAmount" },
    { label: "Discount", accessor: "totDiscount" },
    { label: "Round Off", accessor: "roundOff" },
    { label: "Final Amount", accessor: "finalAmount" },
    { label: "Add Price", accessor: "addPrice" },
    { label: "Add Amount", accessor: "addAmount" },
  ];

  const headerRows = useMemo(() => {
    return [
      [{ v: `${invType || 'Sales Purchase'} Register Report - Invoice Wise`, s: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } } }],
      [{ v: companyInfo?.companyName || "SoftBook", s: { font: { bold: true }, alignment: { horizontal: "center" } } }],
      [""] // Spacing
    ];
  }, [invType, companyInfo]);

  /* ── render ── */
  return (
    <div className={showFilters ? "page-content" : "page-content p-0"}>
      <Container fluid className={showFilters ? "" : "px-0"}>

        {/* Page header */}
        {showFilters && (
          <Row className="mb-3 pb-1">
            <Col xs={12}>
              <div className="d-flex align-items-lg-center flex-lg-row flex-column">
                <div className="flex-grow-1">
                  <h4 className="fs-16 mb-1">Sale Purchase Invoice Report</h4>
                  <p className="text-muted mb-0">View invoice-wise sale &amp; purchase data.</p>
                </div>
              </div>
            </Col>
          </Row>
        )}

        {/* Filters card */}
        {showFilters && (
          <Row>
            <Col lg={12}>
              <Card>
                <CardBody>
                  <h5 className="mb-3">Filters</h5>
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
                    <Col lg={3}>
                      <Label className="form-label">Customer</Label>
                      <Select
                        classNamePrefix="select2-selection"
                        placeholder="Select Customer…"
                        value={customerName ? { label: customerName, value: customerName } : null}
                        options={customerOptions}
                        onChange={(opt) => setCustomerName(opt ? opt.value : "")}
                        isClearable
                      />
                    </Col>
                    <Col lg={2}>
                      <Label className="form-label">Product</Label>
                      <Select
                        classNamePrefix="select2-selection"
                        placeholder="Select Product…"
                        value={productName ? { label: productName, value: productName } : null}
                        options={productOptions}
                        onChange={(opt) => setProductName(opt ? opt.value : "")}
                        isClearable
                      />
                    </Col>
                    <Col lg={2}>
                      <Label className="form-label">Invoice No</Label>
                      <Input
                        type="text"
                        placeholder="Invoice #"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                      />
                    </Col>
                    {!forcedInvType && (
                      <Col lg={2}>
                        <Label className="form-label">Type</Label>
                        <Input type="select" value={invType} onChange={(e) => setInvType(e.target.value)}>
                          <option value="">All</option>
                          <option value="Sales">Sale</option>
                          <option value="Purchase">Purchase</option>
                        </Input>
                      </Col>
                    )}
                  </Row>

                  <Row className="mt-3">
                    <Col className="d-flex justify-content-end gap-2">
                      <Button color="light" className="btn-sm px-3 btn btn-soft-secondary" onClick={handleClear}>
                        Clear
                      </Button>
                      <Button color="primary" onClick={fetchReport}>
                        Generate
                      </Button>
                      <ExportButton
                        color="success"
                        data={reportData}
                        columns={exportColumns}
                        headerRows={headerRows}
                        fileName="Sale_Purchase_Register_InvoiceWise"
                      >
                        Export Excel
                      </ExportButton>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}

        {/* Error */}
        {error && (
          <Row>
            <Col>
              <div className="alert alert-danger">{error}</div>
            </Col>
          </Row>
        )}

        {/* Data card — always visible once generated OR when loading */}
        {(generated || loading) && (
          <Row>
            <Col lg={12}>
              <Card>
                <HeaderForAllRpt reportName="Invoice Wise Report" />
                <CardBody className="pt-3 pl-3 pr-3 pb-3">
                  {/* ── CommonTable ── */}
                  <CommonTable
                    columns={columns}
                    data={paginatedData}
                    loading={loading}
                    isDark={isDarkMode}
                    autoHeight={true}
                    minWidth="1910px"
                    showTotals
                    paginatedData={paginatedData}
                  />
                </CardBody>
                <FooterForAllRpt />
              </Card>
            </Col>
          </Row>
        )}

      </Container>
    </div>
  );
};

export default SalePurInvWiseRpt;
