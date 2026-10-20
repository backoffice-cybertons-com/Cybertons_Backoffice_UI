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
import ExportCustomerOrderPaymentExcel from "../../Components/Common/ExportCustomerOrderPaymentExcel";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import { getCustomerOrderPaymentReport } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";
import "./CustomerOrderPaymentReport.css";

const api = new APIClient();

const selectLayoutState = (state) => state.Layout;
const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
  layoutModeType: layout.layoutModeType,
}));

const formatLocalYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatAmt = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

const CustomerOrderPaymentReport = () => {
  document.title = "Customer Order Limit Report | SoftBook";

  const { layoutModeType } = useSelector(selectLayoutProperties);
  const isDarkMode = layoutModeType === "dark";
  const tableRef = useRef(null);

  const [reportDate, setReportDate] = useState(formatLocalYMD(new Date()));
  const [selectedParty, setSelectedParty] = useState(null);
  const [parties, setParties] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");
  const [companyInfo, setCompanyInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(url.GET_PARTIES);
        const list = Array.isArray(res) ? res : res?.data || [];
        setParties(
          list.map((x) => ({
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
    if (!reportDate) {
      setError("Please select report date.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const companyId = secureStorage.getPlain("companyId") || 0;
      const response = await getCustomerOrderPaymentReport(
        companyId,
        reportDate,
        selectedParty?.value || null
      );
      const data = Array.isArray(response) ? response : response?.data || [];
      const rows = data.map((row, idx) => ({
        srNo: idx + 1,
        partyId: row.partyId ?? row.PartyId,
        customerName: row.customerName ?? row.CustomerName ?? "",
        yesterdayOs: Number(row.yesterdayOs ?? row.YesterdayOs ?? 0),
        yesterdayOrder: Number(row.yesterdayOrder ?? row.YesterdayOrder ?? 0),
        termDays: Number(row.termDays ?? row.TermDays ?? 0),
        todayPayment: Number(row.todayPayment ?? row.TodayPayment ?? 0),
        todayOrder: Number(row.todayOrder ?? row.TodayOrder ?? 0),
      }));
      setReportData(rows);
      setGenerated(true);
      setCurrentPage(1);
    } catch (err) {
      console.error("Customer Order Limit Report Error:", err);
      setError("Failed to load report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(
    () => ({
      yesterdayOs: reportData.reduce((a, r) => a + r.yesterdayOs, 0),
      yesterdayOrder: reportData.reduce((a, r) => a + r.yesterdayOrder, 0),
      todayPayment: reportData.reduce((a, r) => a + r.todayPayment, 0),
      todayOrder: reportData.reduce((a, r) => a + r.todayOrder, 0),
    }),
    [reportData]
  );

  const yesterdayLabel = useMemo(() => {
    const d = new Date(reportDate);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() - 1);
    return formatDisplayDate(d);
  }, [reportDate]);

  const avgTermDays = useMemo(() => {
    const withOrder = reportData.filter((r) => r.yesterdayOrder > 0);
    if (!withOrder.length) return 0;
    return withOrder.reduce((a, r) => a + r.termDays, 0) / withOrder.length;
  }, [reportData]);

  const columns = useMemo(
    () => [
      {
        key: "srNo",
        label: "Sr",
        width: "70px",
        align: "center",
        sortType: "number",
        totalType: "none",
        decimals: 0,
        cell: (row) => <span className="colr-td-sr">{row.srNo}</span>,
      },
      {
        key: "customerName",
        label: "Customer",
        width: "240px",
        align: "left",
        sortType: "string",
        totalType: "none",
        cell: (row) => (
          <span className="colr-td-customer">{row.customerName || "—"}</span>
        ),
      },
      {
        key: "yesterdayOs",
        label: "Yesterday OS",
        width: "140px",
        align: "right",
        sortType: "number",
        totalType: "sum",
      },
      {
        key: "yesterdayOrder",
        label: "Yesterday Order",
        width: "140px",
        align: "right",
        sortType: "number",
        totalType: "sum",
      },
      {
        key: "termDays",
        label: "Term Days",
        width: "120px",
        align: "right",
        sortType: "number",
        totalType: "none",
        // Same as stats card / Excel: avg of Term Days where Yesterday Order > 0
        totalFn: () => avgTermDays,
        cell: (row) => (
          <span className="colr-td-term">{formatAmt(row.termDays)}</span>
        ),
      },
      {
        key: "todayPayment",
        label: "Today Payment",
        width: "140px",
        align: "right",
        sortType: "number",
        totalType: "sum",
      },
      {
        key: "todayOrder",
        label: "Today Order",
        width: "140px",
        align: "right",
        sortType: "number",
        totalType: "sum",
        cell: (row) => (
          <span className="colr-td-order">{formatAmt(row.todayOrder)}</span>
        ),
      },
    ],
    [avgTermDays]
  );

  return (
    <div className={`page-content colr-page${isDarkMode ? " colr-page--dark" : ""}`}>
      <Container fluid>
        <BreadCrumb title="Customer Order Limit Report" pageTitle="Reports" />

        <Card className="mb-3 colr-filter-card">
          <CardBody>
            <Row className="g-3 align-items-end">
              <Col md={2}>
                <Label className="form-label">Report Date</Label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Label className="form-label">Customer</Label>
                <Select
                  isClearable
                  options={parties}
                  value={selectedParty}
                  onChange={setSelectedParty}
                  placeholder="All customers"
                />
              </Col>
              <Col md={2}>
                <Label className="form-label">Rows</Label>
                <Input
                  type="select"
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
              <Col md={5} className="d-flex gap-2 justify-content-end align-items-end">
                <Button color="primary" onClick={fetchReport} disabled={loading}>
                  {loading ? <Spinner size="sm" /> : "Show Report"}
                </Button>
                <ExportCustomerOrderPaymentExcel
                  data={() => tableRef.current?.getSortedData?.() || reportData}
                  date={reportDate}
                  companyInfo={companyInfo}
                />
              </Col>
            </Row>
            {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}
          </CardBody>
        </Card>

        {(generated || loading) && (
          <Card id="customerOrderPaymentPrintArea" className="colr-report-card">
            <div className="text-start">
              <HeaderForAllRpt reportName="Customer Order Limit Report" />
            </div>

            <CardBody className="colr-report-body">
              {reportData.length > 0 && (
                <div className="colr-stats">
                  <div className="colr-stat">
                    <div className="colr-stat-label">Customers</div>
                    <div className="colr-stat-value">{reportData.length}</div>
                    <div className="colr-stat-meta">
                      As on {formatDisplayDate(reportDate)}
                    </div>
                  </div>
                  <div className="colr-stat">
                    <div className="colr-stat-label">Yesterday OS</div>
                    <div className="colr-stat-value">{formatAmt(totals.yesterdayOs)}</div>
                    <div className="colr-stat-meta">{yesterdayLabel}</div>
                  </div>
                  <div className="colr-stat">
                    <div className="colr-stat-label">Yesterday Order</div>
                    <div className="colr-stat-value">{formatAmt(totals.yesterdayOrder)}</div>
                    <div className="colr-stat-meta">{yesterdayLabel}</div>
                  </div>
                  <div className="colr-stat colr-stat--term">
                    <div className="colr-stat-label">Avg Term Days</div>
                    <div className="colr-stat-value">{formatAmt(avgTermDays)}</div>
                    <div className="colr-stat-meta">OS ÷ Order</div>
                  </div>
                  <div className="colr-stat colr-stat--payment">
                    <div className="colr-stat-label">Today Payment</div>
                    <div className="colr-stat-value">{formatAmt(totals.todayPayment)}</div>
                    <div className="colr-stat-meta">Income JV</div>
                  </div>
                  <div className="colr-stat colr-stat--order">
                    <div className="colr-stat-label">Today Order</div>
                    <div className="colr-stat-value">{formatAmt(totals.todayOrder)}</div>
                    <div className="colr-stat-meta">Calculated</div>
                  </div>
                </div>
              )}

              <CommonTable
                ref={tableRef}
                columns={columns}
                data={reportData}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                loading={loading}
                isDark={isDarkMode}
                autoHeight={true}
                minWidth="1100px"
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

export default CustomerOrderPaymentReport;
