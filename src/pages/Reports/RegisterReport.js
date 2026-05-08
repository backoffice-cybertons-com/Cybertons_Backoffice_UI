import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardBody, Col, Container, Row, Input, Label, Button } from "reactstrap";
import Select from "react-select";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import ExportButton from "../../Components/Common/ExportButton";
import SalePurInvWiseRpt from "./SalePurInvWiseRpt";
import SalePurchaseRegisterItemwise from "./SalePurchaseRegisterItemwise";
import SalePurchaseRegisterPartywise from "./SalePurchaseRegisterPartywise";
import SalePurchaseRegisterDatewise from "./SalePurchaseRegisterDatewise";
import SalePurchaseRegisterMonthwise from "./SalePurchaseRegisterMonthWise";

const REPORT_TYPE_OPTIONS = [
  { value: "date", label: "Date Wise" },
  { value: "inv", label: "Invoice Wise" },
  { value: "item", label: "Item Wise" },
  { value: "party", label: "Party Wise" },
  { value: "month", label: "Month Wise" }
];

const REPORT_ENDPOINTS = {
  inv: url.GET_SALE_PUR_INVWISE,
  item: url.GET_SALE_PURCHASE_REGISTER_ITEMWISE,
  party: url.GET_SALE_PURCHASE_REGISTER_PARTYWISE,
  date: url.GET_SALE_PURCHASE_REGISTER_DATEWISE,
  month: url.GET_SALE_PURCHASE_REGISTER_MONTHWISE,
};

const EXPORT_COLUMNS = {
  inv: [
    "invDate", "invNo", "invType", "customerName", "qty", "avgPrice", "taxableAmount",
    "igst", "cgst", "sgst", "taxAmount", "totalAmount", "expDiscount", "roundOff",
    "finalAmount", "addPrice", "addAmount",
  ],
  item: [
    "itemName", "qty", "avgPrice", "taxableAmount",
    "sgst", "cgst", "igst", "taxAmount", "totalAmount",
    "addPrice", "addAmount",
  ],
  party: [
    "customerName", "invType", "totalQty", "avgPrice", "taxableAmount", "igst",
    "cgst", "sgst", "taxAmount", "totalAmount", "expDiscount", "roundOff", "finalAmount", "addPrice", "addAmount",
  ],
  date: [
    "invDate", "invType", "totalQty", "avgPrice", "taxableAmount", "igst", "cgst",
    "sgst", "taxAmount", "totalAmount", "expDiscount", "roundOff", "finalAmount", "addPrice", "addAmount",
  ],
  month: [
    "invNo", "invType", "totalQty", "avgPrice", "taxableAmount", "igst",
    "cgst", "sgst", "taxAmount", "totalAmount", "expDiscount", "roundOff", "finalAmount", "addPrice", "addAmount",
  ],
};

const normalizeData = (data) => {
  return (data || []).map(item => ({
    ...item,
    invDate: formatDateExcel(item.invDate || item.InvDate || item.inv_date || ""),
    invNo: item.invNo || item.InvNo || item.inv_no || "",
    invType: item.invType || item.InvType || item.inv_type || "",
    customerName: item.customerName || item.customer_name || item.partyName || item.PartyName || item.display_name || item.Party_Name || item.Party_name || "",
    itemName: item.itemName || item.item_name || item.productName || item.product_name || item.ProductName || "",
    qty: Number(item.qty || item.Qty || item.quantity || 0),
    totalQty: Number(item.totalQty || item.total_qty || item.qty || 0),
    avgPrice: Number(item.avgPrice || item.AvgPrice || item.avg_price || 0),
    taxableAmount: Number(item.taxableAmount || item.TaxableAmount || item.Taxable_Amount || item.taxable_amount || 0),
    igst: Number(item.igst || item.igst_amount || item.igstAmount || item.IgstAmount || item.Igst_Amount || 0),
    cgst: Number(item.cgst || item.cgst_amount || item.cgstAmount || item.CgstAmount || item.Cgst_Amount || 0),
    sgst: Number(item.sgst || item.sgst_amount || item.sgstAmount || item.SgstAmount || item.Sgst_Amount || 0),
    taxAmount: Number(item.taxAmount || item.TaxAmount || item.Tax_Amount || item.tax_amount || 0),
    totalAmount: Number(item.totalAmount || item.TotalAmount || item.Total_Amount || item.total_amount || 0),
    expDiscount: Number(item.expDiscount || item.exp_discount || item.totDiscount || item.TotDiscount || item.Tot_Discount || 0),
    roundOff: Number(item.roundOff || item.RoundOff || item.Round_Off || item.round_off || 0),
    finalAmount: Number(item.finalAmount || item.FinalAmount || item.Final_Amount || item.final_amount || 0),
    addPrice: Number(item.addPrice || item.AddPrice || item.Add_Price || item.add_price || 0),
    addAmount: Number(item.addAmount || item.AddAmount || item.Add_Amount || item.add_amount || 0),
  }));
};

const formatDateForApi = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateExcel = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const RegisterReport = ({ type }) => {
  const invTypeValue = type === "SALE" ? "Sales" : "Purchase";
  const api = useMemo(() => new APIClient(), []);
  const [reportType, setReportType] = useState("date");
  const [appliedReportType, setAppliedReportType] = useState("date");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return [firstDay, lastDay];
  });
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [partyOptions, setPartyOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [fromDate, setFromDate] = useState("2026-04-01");

  // Lifted Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalEntries, setTotalEntries] = useState(0);


  const fromRef = useRef(null);
  const toRef = useRef(null);

  const [toDate, setToDate] = useState("2026-12-31");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [partiesRes, productsRes, compRes] = await Promise.all([
          api.get(url.GET_PARTIES),
          api.get(url.GET_PRODUCTS_DETAILS),
          api.get(url.GET_COMPANY_PROFILE),
        ]);
        const parties = Array.isArray(partiesRes) ? partiesRes : partiesRes?.data || [];
        const products = Array.isArray(productsRes) ? productsRes : productsRes?.data || [];
        setCompanyInfo(compRes?.data || compRes);
        setPartyOptions(
          parties.map((p) => {
            const name =
              p.displayName ||
              p.DisplayName ||
              p.partyName ||
              p.PartyName ||
              p.name ||
              p.Name;
            return { value: name, label: name };
          }),
        );
        setProductOptions(
          products.map((p) => {
            const name = p.name || p.Name;
            return { value: name, label: name };
          }),
        );
      } catch (error) {
        console.error("Failed loading register filter options", error);
      }
    };
    loadData();
  }, [api]);

  const globalFilters = {
    fromDate: fromRef.current?.value,
    toDate: toRef.current?.value,
    selectedParty,
    selectedProduct,
    invoiceNo,
  };

  const triggerGenerate = () => {
    setAppliedReportType(reportType);
    setRefreshKey((prev) => prev + 1);
  };
  const clearFilters = () => {
    if (fromRef.current) fromRef.current.value = "2026-04-01";
    if (toRef.current) toRef.current.value = "2026-04-30";
    setSelectedParty(null);
    setSelectedProduct(null);
    setInvoiceNo("");
    setRefreshKey((prev) => prev + 1);
  };

  const selectedReportComponent = useMemo(() => {
    const commonProps = {
      forcedInvType: invTypeValue,
      showFilters: false,
      globalFilters,
      refreshKey,
      currentPage,
      setCurrentPage,
      rowsPerPage,
      onTotalChange: setTotalEntries,
      key: `${appliedReportType}-${invTypeValue}`,
    };
    if (appliedReportType === "item") return <SalePurchaseRegisterItemwise {...commonProps} />;
    if (appliedReportType === "party") return <SalePurchaseRegisterPartywise {...commonProps} />;
    if (appliedReportType === "date") return <SalePurchaseRegisterDatewise {...commonProps} />;
    if (appliedReportType === "month") return <SalePurchaseRegisterMonthwise {...commonProps} />;
    return <SalePurInvWiseRpt {...commonProps} />;
  }, [appliedReportType, invTypeValue, globalFilters, refreshKey, currentPage, rowsPerPage]);

  const titlePrefix = type === "SALE" ? "Sale" : "Purchase";
  const exportColumns = useMemo(
    () =>
      (EXPORT_COLUMNS[appliedReportType] || []).map((key) => ({
        accessor: key,
        label: key
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/^./, (c) => c.toUpperCase()),
      })),
    [appliedReportType],
  );

  const headerRows = useMemo(() => {
    const reportLabel = REPORT_TYPE_OPTIONS.find(opt => opt.value === appliedReportType)?.label || appliedReportType;
    const excelHeader = `${titlePrefix} Register Report - ${reportLabel}`;
    return [
      [{ v: excelHeader, s: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } } }],
      [{ v: companyInfo?.companyName || "SoftBook", s: { font: { bold: true }, alignment: { horizontal: "center" } } }],
      [""] // Spacing
    ];
  }, [titlePrefix, appliedReportType, companyInfo]);

  const fetchExportData = async () => {
    const endpoint = REPORT_ENDPOINTS[appliedReportType];
    const companyId = localStorage.getItem("companyId");

    const conditions = [];
    const fromD = fromRef.current?.value;
    const toD = toRef.current?.value;

    if (fromD && toD) conditions.push(`tsp.inv_date BETWEEN '${fromD}' AND '${toD}'`);
    if (selectedParty?.value) conditions.push(`pm.display_name = '${selectedParty.value.replace(/'/g, "''")}'`);
    if (selectedProduct?.value) conditions.push(`prod.product_name = '${selectedProduct.value.replace(/'/g, "''")}'`);
    if (invoiceNo) conditions.push(`tsp.inv_no = '${invoiceNo.replace(/'/g, "''")}'`);

    const where = conditions.length ? conditions.join(" AND ") : "1=1";

    const params = {
      companyId: companyId || null,
      invType: invTypeValue,
      reportType: appliedReportType.toUpperCase(),
      where: where
    };

    const response = await api.get(endpoint, { params });
    const data = Array.isArray(response) ? response : response?.data || [];
    return normalizeData(data);
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Row>
          <Col xs={12}>
            <div className="page-title-box d-sm-flex align-items-center justify-content-between">
              <h4 className="mb-sm-0">{titlePrefix} Register Report</h4>
            </div>
          </Col>
        </Row>

        <Row>
          <Col lg={12}>
            <Card>
              <CardBody>
                <Row className="g-3">
                  <Col md={2}>
                    <Label>Report Type</Label>
                    <Input
                      type="select"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                    >
                      {REPORT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Input>
                  </Col>

                  <Col lg={2}>
                    <div className="mb-3 mb-lg-0">
                      <Label>
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
                      <Label >
                        To Date
                      </Label>

                      <Input
                        type="date"
                        defaultValue={toDate}
                        innerRef={toRef}
                      />
                    </div>
                  </Col>
                  <Col md={2}>
                    <Label>Customer</Label>
                    <Select
                      value={selectedParty}
                      onChange={setSelectedParty}
                      options={partyOptions}
                      isClearable
                      placeholder="Select..."
                      menuPlacement="auto" // or "top"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 })
                      }}
                    />
                  </Col>
                  <Col md={2}>
                    <Label>Product</Label>
                    <Select
                      value={selectedProduct}
                      onChange={setSelectedProduct}
                      options={productOptions}
                      isClearable
                      placeholder="Select..."
                      menuPlacement="auto"   // opens up/down automatically
                      menuPortalTarget={document.body}  // renders outside container
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 })
                      }}
                    />
                  </Col>
                  <Col md={2}>
                    <Label>Invoice No</Label>
                    <Input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="Invoice #"
                    />
                  </Col>
                </Row>
                <Row className="mt-3 align-items-center">
                  <Col md={8}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <Label className="mb-0 small" style={{ whiteSpace: "nowrap" }}>Rows:</Label>
                        <Input
                          type="select"
                          bsSize="sm"
                          style={{ width: "95px" }}
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="100">100</option>
                          <option value="500">500</option>
                          <option value="1000">1000</option>
                          <option value="all">All</option>
                        </Input>
                      </div>

                      <div className="d-flex align-items-center gap-1">
                        <Button
                          color="light"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        >
                          <i className="ri-arrow-left-s-line"></i>
                        </Button>
                        <Button color="primary" size="sm" style={{ minWidth: "30px" }}>
                          {currentPage}
                        </Button>
                        <Button
                          color="light"
                          size="sm"
                          disabled={totalEntries === 0 || (rowsPerPage !== 'all' && currentPage >= Math.ceil(totalEntries / Number(rowsPerPage)))}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                        >
                          <i className="ri-arrow-right-s-line"></i>
                        </Button>
                      </div>

                      {totalEntries > 0 && (
                        <span className="text-muted small">
                          Total: <strong>{totalEntries}</strong> records
                        </span>
                      )}
                    </div>
                  </Col>
                  <Col md={4} className="d-flex justify-content-end gap-2 text-end">
                    <Button color="soft-secondary" onClick={clearFilters}>
                      Clear
                    </Button>
                    <Button color="primary" onClick={triggerGenerate}>
                      Generate
                    </Button>
                    <ExportButton
                      data={fetchExportData}
                      columns={exportColumns}
                      headerRows={headerRows}
                      fileName={`${titlePrefix}_Register_${appliedReportType}`}
                      iconOnly
                    />
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {selectedReportComponent}
      </Container>
    </div>
  );
};

export default RegisterReport;
