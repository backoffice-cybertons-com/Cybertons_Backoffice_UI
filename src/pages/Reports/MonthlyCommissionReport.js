import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import { createSelector } from "reselect";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import HeaderForAllRpt from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";
import CommonTable from "../../Components/Common/CommonTable";
import "../../Components/Common/CommonTable.css";
import ExportMonthlyCommissionReportExcel from "../../Components/Common/ExportMonthlyCommissionReportExcel";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import { getMonthlyCommissionReport } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import "./MonthlyCommissionReport.css";

const api = new APIClient();

const selectLayoutState = (state) => state.Layout;
const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
  layoutModeType: layout.layoutModeType,
}));

const formatLocalYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const firstDayOfMonth = () => {
  const d = new Date();
  return formatLocalYMD(new Date(d.getFullYear(), d.getMonth(), 1));
};

const formatAmt = (v, decimals = 2) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const formatDisplayDate = (d) => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const MonthlyCommissionReport = () => {
  document.title = "Monthly Commission Report | SoftBook";

  const { layoutModeType } = useSelector(selectLayoutProperties);
  const isDarkMode = layoutModeType === "dark";
  const tableRef = useRef(null);

  const [fromDate, setFromDate] = useState(firstDayOfMonth());
  const [toDate, setToDate] = useState(formatLocalYMD(new Date()));
  const [selectedParty, setSelectedParty] = useState(null);
  const [parties, setParties] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");
  const [companyInfo, setCompanyInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [groupBy, setGroupBy] = useState("date");

  const isAllParties = !selectedParty;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(url.GET_PARTIES);
        const list = Array.isArray(res) ? res : res?.data || [];
        setParties(
          list
            .filter((x) => {
              const pType = x.partyType || x.party_type || x.PartyType || "";
              return pType.toLowerCase() === "customer";
            })
            .map((x) => ({
              value: x.partyId ?? x.party_id ?? x.PartyId,
              label:
                x.displayName ||
                x.display_name ||
                x.DisplayName ||
                String(x.partyId),
            }))
        );
      } catch (e) {
        console.error("Party load error", e);
      }

      try {
        const res = await api.get(url.GET_COMPANY_PROFILE);
        setCompanyInfo(res?.data || res);
      } catch (e) {
        console.error("Company profile error", e);
      }
    };
    load();
  }, []);

  const fetchReport = async () => {
    if (!fromDate || !toDate) {
      setError("Please select from and to date.");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      setError("From date cannot be after to date.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const companyId = secureStorage.getPlain("companyId") || 0;
      const response = await getMonthlyCommissionReport(
        companyId,
        fromDate,
        toDate,
        selectedParty?.value || null,
        groupBy
      );
      const data = Array.isArray(response) ? response : response?.data || [];
      const rows = data.map((row, idx) => ({
        srNo: idx + 1,
        dateOrParty: row.dateOrParty ?? row.DateOrParty ?? "",
        invNo: row.invNo ?? row.InvNo ?? "",
        productName: row.productName ?? row.ProductName ?? "",
        crateOrdered: Number(row.crateOrdered ?? row.CrateOrdered ?? 0),
        totalMrpOrderAmount: Number(row.totalMrpOrderAmount ?? row.TotalMrpOrderAmount ?? 0),
        avgMrp: Number(row.avgMrp ?? row.AvgMrp ?? 0),
        sevenDaysAvgOrder: Number(row.sevenDaysAvgOrder ?? row.SevenDaysAvgOrder ?? 0),
        avgDepoPrice: Number(row.avgDepoPrice ?? row.AvgDepoPrice ?? 0),
        avgDistAmount: Number(row.avgDistAmount ?? row.AvgDistAmount ?? 0),
        totComm: Number(row.totComm ?? row.TotComm ?? 0),
        avgCommPerCrate: Number(row.avgCommPerCrate ?? row.AvgCommPerCrate ?? 0),
        osAsOn: Number(row.osAsOn ?? row.OsAsOn ?? 0),
        payment: Number(row.payment ?? row.Payment ?? 0),
        avgTerm: Number(row.avgTerm ?? row.AvgTerm ?? 0),
        adjustCommission: Number(row.adjustCommission ?? row.AdjustCommission ?? 0),
        netCommission: Number(row.netCommission ?? row.NetCommission ?? 0),
        commAmount: Number(row.commAmount ?? row.CommAmount ?? 0),
      }));
      setReportData(rows);
      setGenerated(true);
      setCurrentPage(1);
    } catch (err) {
      console.error("Monthly Commission Report Error:", err);
      setError("Failed to load report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(
    () => ({
      crateOrdered: reportData.reduce((a, r) => a + r.crateOrdered, 0),
      totalMrpOrderAmount: reportData.reduce((a, r) => a + r.totalMrpOrderAmount, 0),
      avgDistAmount: reportData.reduce((a, r) => a + r.avgDistAmount, 0),
      totComm: reportData.reduce((a, r) => a + r.totComm, 0),
      payment: reportData.reduce((a, r) => a + r.payment, 0),
      commAmount: reportData.reduce((a, r) => a + r.commAmount, 0),
    }),
    [reportData]
  );

  const avgTerm = useMemo(() => {
    const nonZero = reportData.filter((r) => r.sevenDaysAvgOrder > 0);
    if (!nonZero.length) return 0;
    return nonZero.reduce((a, r) => a + r.avgTerm, 0) / nonZero.length;
  }, [reportData]);

  // Columns A–O
  const columns = useMemo(
    () => [
      {
        key: "srNo",
        label: "Sr",
        width: "55px",
        align: "center",
        sortType: "number",
        totalType: "none",
        decimals: 0,
        cell: (row) => <span className="mcr-td-sr">{row.srNo}</span>,
      },
      {
        // A
        key: "dateOrParty",
        label: isAllParties ? "Party" : "Date",
        width: "130px",
        align: "left",
        sortType: "string",
        totalType: "none",
        cell: (row) => <span className="mcr-td-date">{row.dateOrParty || "—"}</span>,
      },
      ...(groupBy !== "date"
        ? [
            {
              key: "invNo",
              label: "Invoice No",
              width: "120px",
              align: "left",
              sortType: "string",
              totalType: "none",
            },
          ]
        : []),
      ...(groupBy === "item"
        ? [
            {
              key: "productName",
              label: "Product Name",
              width: "200px",
              align: "left",
              sortType: "string",
              totalType: "none",
            },
          ]
        : []),
      {
        // B
        key: "crateOrdered",
        label: "Crate Ordered",
        width: "120px",
        align: "right",
        sortType: "number",
        totalType: "sum",
        decimals: 2,
        cell: (row) => <span className="mcr-td-crate">{formatAmt(row.crateOrdered)}</span>,
      },
      {
        // D
        key: "totalMrpOrderAmount",
        label: "Order MRP Amt",
        width: "130px",
        align: "right",
        sortType: "number",
        totalType: "sum",
        decimals: 2,
        cell: (row) => <span className="mcr-td-mrp">{formatAmt(row.totalMrpOrderAmount)}</span>,
      },
      {
        // C = D/B
        key: "avgMrp",
        label: "Avg MRP",
        width: "110px",
        align: "right",
        sortType: "number",
        totalType: "none",
        decimals: 2,
      },
      {
        // E — last 7 days avg
        key: "sevenDaysAvgOrder",
        label: "7 Days Avg Order",
        width: "130px",
        align: "right",
        sortType: "number",
        totalType: "none",
        decimals: 2,
      },
      {
        // F — avg depo price
        key: "avgDepoPrice",
        label: "Avg Depo Price",
        width: "125px",
        align: "right",
        sortType: "number",
        totalType: "none",
        decimals: 2,
      },
      {
        // G = B*F
        key: "avgDistAmount",
        label: "Avg Dist Amount",
        width: "130px",
        align: "right",
        sortType: "number",
        totalType: "sum",
        decimals: 2,
      },
      {
        // I = D - G
        key: "totComm",
        label: "Tot. Comm.",
        width: "110px",
        align: "right",
        sortType: "number",
        totalType: "sum",
        decimals: 2,
      },
      {
        // H = I/B
        key: "avgCommPerCrate",
        label: "Avg Comm/Crate",
        width: "130px",
        align: "right",
        sortType: "number",
        totalType: "none",
        decimals: 2,
      },
      {
        // J — OS as on date
        key: "osAsOn",
        label: "O/S as on",
        width: "120px",
        align: "right",
        sortType: "number",
        totalType: "none",
        decimals: 2,
        cell: (row) => <span className="mcr-td-os">{formatAmt(row.osAsOn)}</span>,
      },
      {
        // K — payment
        key: "payment",
        label: "Payment",
        width: "115px",
        align: "right",
        sortType: "number",
        totalType: "sum",
        decimals: 2,
        cell: (row) => <span className="mcr-td-payment">{formatAmt(row.payment)}</span>,
      },
      {
        // L = J/E
        key: "avgTerm",
        label: "Avg Term",
        width: "100px",
        align: "right",
        sortType: "number",
        totalType: "none",
        decimals: 2,
      },
      {
        // M — adjust commission from add_price master
        key: "adjustCommission",
        label: "Adjust Commission",
        width: "140px",
        align: "right",
        sortType: "number",
        totalType: "none",
        decimals: 2,
      },
      {
        // N = H - M
        key: "netCommission",
        label: "Net Commission",
        width: "130px",
        align: "right",
        sortType: "number",
        totalType: "none",
        decimals: 2,
        cell: (row) => <span className="mcr-td-comm">{formatAmt(row.netCommission)}</span>,
      },
      {
        // O = N * B
        key: "commAmount",
        label: "Comm. Amount",
        width: "125px",
        align: "right",
        sortType: "number",
        totalType: "sum",
        decimals: 2,
        cell: (row) => <span className="mcr-td-comm">{formatAmt(row.commAmount)}</span>,
      },
    ],
    [isAllParties, avgTerm, groupBy]
  );

  return (
    <div className={`page-content mcr-page${isDarkMode ? " mcr-page--dark" : ""}`}>
      <Container fluid>
        <BreadCrumb title="Monthly Commission Report" pageTitle="Reports" />

        {/* ── Filters ─────────────────────────────────────────────── */}
        <Card className="mb-3 mcr-filter-card">
          <CardBody>
            <Row className="g-3 align-items-end">
              <Col md={2}>
                <Label className="form-label">From Date</Label>
                <Input
                  type="date"
                  id="mcr-from-date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Col>
              <Col md={2}>
                <Label className="form-label">To Date</Label>
                <Input
                  type="date"
                  id="mcr-to-date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Label className="form-label">Party</Label>
                <Select
                  isClearable
                  options={parties}
                  value={selectedParty}
                  onChange={setSelectedParty}
                  placeholder="All Parties (Summary)"
                  inputId="mcr-party-select"
                />
              </Col>
              <Col md={2}>
                <Label className="form-label">Group By</Label>
                <Input
                  type="select"
                  value={groupBy}
                  onChange={(e) => {
                    setGroupBy(e.target.value);
                    setGenerated(false); // Reset report on group change
                  }}
                >
                  <option value="date">Date-wise</option>
                  <option value="invoice">Invoice-wise</option>
                  <option value="item">Item-wise</option>
                </Input>
              </Col>
              <Col md={2}>
                <Label className="form-label">Rows</Label>
                <Input
                  type="select"
                  id="mcr-rows-per-page"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                  <option value="all">All</option>
                </Input>
              </Col>
              <Col md={2} className="d-flex gap-2 justify-content-end align-items-end">
                <Button
                  color="primary"
                  id="mcr-show-report-btn"
                  onClick={fetchReport}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : "Show Report"}
                </Button>
                <ExportMonthlyCommissionReportExcel
                  data={() => tableRef.current?.getSortedData?.() || reportData}
                  date={fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`}
                  companyInfo={companyInfo}
                  isAllParties={isAllParties}
                  groupBy={groupBy}
                />
              </Col>
            </Row>
            {error && (
              <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>
            )}
          </CardBody>
        </Card>

        {/* ── Report Card ─────────────────────────────────────────── */}
        {(generated || loading) && (
          <Card id="monthlyCommissionPrintArea" className="mcr-report-card">
            <div className="text-start">
              <HeaderForAllRpt
                reportName={`Monthly Commission Report${
                  selectedParty ? ` — ${selectedParty.label}` : " — All Parties"
                }`}
              />
            </div>

            <CardBody className="mcr-report-body">
              {/* Summary Stats */}
              {reportData.length > 0 && (
                <div className="mcr-stats">
                  <div className="mcr-stat">
                    <div className="mcr-stat-label">
                      {isAllParties ? "Parties" : "Days"}
                    </div>
                    <div className="mcr-stat-value">{reportData.length}</div>
                    <div className="mcr-stat-meta">
                      {formatDisplayDate(fromDate)} – {formatDisplayDate(toDate)}
                    </div>
                  </div>

                  <div className="mcr-stat mcr-stat--order">
                    <div className="mcr-stat-label">Total Crates</div>
                    <div className="mcr-stat-value">{formatAmt(totals.crateOrdered)}</div>
                    <div className="mcr-stat-meta">All Invoices</div>
                  </div>

                  <div className="mcr-stat mcr-stat--mrp">
                    <div className="mcr-stat-label">Total MRP Amt</div>
                    <div className="mcr-stat-value">{formatAmt(totals.totalMrpOrderAmount)}</div>
                    <div className="mcr-stat-meta">Order Value</div>
                  </div>

                  <div className="mcr-stat mcr-stat--depo">
                    <div className="mcr-stat-label">Total Dist Amt</div>
                    <div className="mcr-stat-value">{formatAmt(totals.avgDistAmount)}</div>
                    <div className="mcr-stat-meta">Depo Price × Crates</div>
                  </div>

                  <div className="mcr-stat mcr-stat--payment">
                    <div className="mcr-stat-label">Total Payment</div>
                    <div className="mcr-stat-value">{formatAmt(totals.payment)}</div>
                    <div className="mcr-stat-meta">Received</div>
                  </div>

                  <div className="mcr-stat mcr-stat--os">
                    <div className="mcr-stat-label">Avg Term</div>
                    <div className="mcr-stat-value">{formatAmt(avgTerm)}</div>
                    <div className="mcr-stat-meta">OS ÷ 7-Day Avg</div>
                  </div>

                  <div className="mcr-stat mcr-stat--comm">
                    <div className="mcr-stat-label">Total Comm.</div>
                    <div className="mcr-stat-value">{formatAmt(totals.totComm)}</div>
                    <div className="mcr-stat-meta">MRP – Dist</div>
                  </div>

                  <div className="mcr-stat mcr-stat--comm">
                    <div className="mcr-stat-label">Net Comm. Amt</div>
                    <div className="mcr-stat-value">{formatAmt(totals.commAmount)}</div>
                    <div className="mcr-stat-meta">(H – M) × Crates</div>
                  </div>
                </div>
              )}

              {/* Table */}
              <CommonTable
                ref={tableRef}
                columns={columns}
                data={reportData}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                loading={loading}
                isDark={isDarkMode}
                autoHeight={true}
                minWidth="1900px"
                showTotals
              />
            </CardBody>

            <FooterForAllRpt />
          </Card>
        )}
      </Container>
    </div>
  );
};

export default MonthlyCommissionReport;
