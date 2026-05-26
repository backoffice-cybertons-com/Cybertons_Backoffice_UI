import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Input,
  Button,
  Label,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import { createSelector } from "reselect";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import MergedHeaderTable from "../../Components/Common/MergedHeaderTable";
import ExportOutstandingExcel from "../../Components/Common/ExportOutstandingExcel";
import "../../Components/Common/CommonTable.css";
import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";
import "./OutstandingComparison.css";

const selectLayoutState = (state) => state.Layout;
const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
  layoutModeType: layout.layoutModeType,
}));

const formatDateForApi = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const api = new APIClient();

const fmt = (v, dec = 2) =>
  isNaN(Number(v)) || v === null || v === undefined
    ? ""
    : Number(v).toLocaleString("en-IN", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });

const plClass = (val) =>
  val >= 0 ? "oc-summary-pl oc-pl-profit" : "oc-summary-pl oc-pl-loss";

/* ── Summary vertical table ─────────────────────────────── */
const SummaryTable = ({ data }) => {
  if (!data || data.length === 0) return null;
  const safeDiv = (a, b) => (b ? a / b : 0);
  const d = Array.isArray(data) ? data[0] : data;

  const yQty = Number(d.yQty ?? 0);
  const yAmount = Number(d.yAmount ?? 0);

  const tQty = Number(d.tQty ?? 0);
  const tAmount = Number(d.tAmount ?? 0);

  const yPrice = safeDiv(yAmount, yQty);
  const tPrice = safeDiv(tAmount, tQty);

  const plPctAmount =
    yAmount > 0 ? (tAmount / yAmount - 1) * 100 : tAmount > 0 ? 100 : 0;

  const plAmount = tAmount - yAmount;
  const plPrice = tPrice - yPrice;

  return (
    <div className="oc-summary-wrap">
      <table className="oc-summary-table">
        <thead>
          <tr>
            <th></th>
            <th>Qty</th>
            <th>Amount</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="oc-summary-label">Yesterday Purchase</td>
            <td className="oc-summary-num">{fmt(yQty, 2)}</td>
            <td className="oc-summary-num">{fmt(yAmount, 2)}</td>
            <td className="oc-summary-num">{fmt(yPrice, 2)}</td>
          </tr>
          <tr>
            <td className="oc-summary-label">Today Sale</td>
            <td className="oc-summary-num">{fmt(tQty, 2)}</td>
            <td className="oc-summary-num">{fmt(tAmount, 2)}</td>
            <td className="oc-summary-num">{fmt(tPrice, 2)}</td>
          </tr>
          <tr>
            <td className="oc-summary-label">Today PL</td>
            <td className="oc-summary-num"></td>
            <td className={plClass(plAmount)}>{fmt(plAmount, 2)}</td>
            <td className={plClass(plPrice)}>{fmt(plPrice, 2)}</td>
          </tr>
          <tr>
            <td className="oc-summary-label">Today PL %</td>
            <td className="oc-summary-num"></td>
            <td className={plClass(plPctAmount)}>{fmt(plPctAmount, 2)}%</td>
            <td className="oc-summary-num"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const buildSelectStyles = (isDark) => ({
  menuPortal: (base) => ({ ...base, zIndex: 999999 }),
  menu: (base) => ({
    ...base,
    zIndex: 999999,
    backgroundColor: isDark ? "#292e33" : base.backgroundColor,
    border: isDark ? "1px solid #32383e" : base.border,
  }),
  control: (base, state) => ({
    ...base,
    backgroundColor: isDark ? "#262a2f" : base.backgroundColor,
    borderColor: isDark
      ? state.isFocused
        ? "#405189"
        : "#32383e"
      : base.borderColor,
    color: isDark ? "#ced4da" : base.color,
    minHeight: 38,
  }),
  singleValue: (base) => ({
    ...base,
    color: isDark ? "#ced4da" : base.color,
  }),
  input: (base) => ({
    ...base,
    color: isDark ? "#ced4da" : base.color,
  }),
  placeholder: (base) => ({
    ...base,
    color: isDark ? "#878a99" : base.color,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#405189"
      : state.isFocused
        ? isDark
          ? "#2f343a"
          : base.backgroundColor
        : isDark
          ? "#292e33"
          : base.backgroundColor,
    color: state.isSelected ? "#fff" : isDark ? "#ced4da" : base.color,
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: isDark ? "#3d4449" : base.backgroundColor,
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: isDark ? "#adb5bd" : base.color,
  }),
  clearIndicator: (base) => ({
    ...base,
    color: isDark ? "#adb5bd" : base.color,
  }),
});

const OutstandingComparison = () => {
  const { layoutModeType } = useSelector(selectLayoutProperties);
  const isDarkMode = layoutModeType === "dark";

  const companyId = localStorage.getItem("companyId") || 10001;

  const [date1, setDate1] = useState(new Date().toISOString().split("T")[0]);
  const [generated, setGenerated] = useState(false);
  const [appliedSummary, setAppliedSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);
  const [parties, setParties] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isSummary, setIsSummary] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);

  // Lifted Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [filteredData, setFilteredData] = useState(null);
  const [totalEntries, setTotalEntries] = useState(0);

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-GB", { month: "short" });
    const year = String(d.getFullYear()).slice(-2);

    return `${day}-${month}-${year}`;
  };
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        let res = await api.get(url.GET_PARTIES);
        let list = Array.isArray(res) ? res : res?.data || [];
        setParties(
          list.map((x) => ({
            value: x.displayName || x.display_name || x.DisplayName,
            label: x.displayName || x.display_name || x.DisplayName,
          })),
        );
      } catch (e) {
        console.error("Initial load error", e);
      }
    };

    const fetchCompanyProfile = async () => {
      try {
        const res = await api.get(url.GET_COMPANY_PROFILE);
        setCompanyInfo(res?.data || res);
      } catch (e) {
        console.error("Company profile error", e);
      }
    };

    fetchInitialData();
    fetchCompanyProfile();
  }, []);
  const columns = [
    {
      key: "srNo",
      label: "Sr No",
      group: "Date :",
      width: "50px",
      align: "center",
      disableFilter: true,
      cell: (_, index) => {
        if (rowsPerPage === "all") return index + 1;

        return (currentPage - 1) * Number(rowsPerPage) + index + 1;
      },
    },
    {
      key: "customerName",
      label: "Customer",
      group: formatDate(date1),
      width: "auto",
      align: "left",
      sortType: "string",
    },
    // Yesterday group
    {
      key: "yQty",
      label: "Qty",
      group: "Yesterday",
      width: "80px",
      align: "right",
      sortType: "number",
      totalType: "sum",
    },
    {
      key: "yAmount",
      label: "Amount",
      group: "Yesterday",
      width: "100px",
      align: "right",
      sortType: "number",
      totalType: "sum",
    },
    {
      key: "yOs",
      label: "O/S",
      group: "Yesterday",
      width: "100px",
      align: "right",
      sortType: "number",
      totalType: "sum",
    },
    // Today group
    {
      key: "tQty",
      label: "Qty",
      group: "Today",
      width: "80px",
      align: "right",
      sortType: "number",
      totalType: "sum",
    },
    {
      key: "tAmount",
      label: "Amount",
      group: "Today",
      width: "100px",
      align: "right",
      sortType: "number",
      totalType: "sum",
    },
    {
      key: "receipt",
      label: "Receipt",
      group: "Today",
      width: "100px",
      align: "right",
      sortType: "number",
      totalType: "sum",
    },
    {
      key: "tOs",
      label: "O/S",
      group: "Today",
      width: "100px",
      align: "right",
      sortType: "number",
      totalType: "sum",
    },
    {
      key: "diff",
      label: "Diff",
      group: "\u00A0",
      width: "100px",
      align: "right",
      sortType: "number",
      totalType: "sum",
      cell: (r) => {
        const val = r.diff || 0;
        const cls =
          val > 0
            ? "oc-diff-positive"
            : val < 0
              ? "oc-diff-negative"
              : "";
        return (
          <span className={cls}>
            {Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
  ];

  const exportColumns = useMemo(
    () => [
      { accessor: "customerName", label: "Customer" },
      { accessor: "yQty", label: "Yesterday Qty" },
      { accessor: "yAmount", label: "Yesterday Amount" },
      { accessor: "yOs", label: "Yesterday O/S" },
      { accessor: "tQty", label: "Today Qty" },
      { accessor: "tAmount", label: "Today Amount" },
      { accessor: "receipt", label: "Today Receipt" },
      { accessor: "tOs", label: "Today O/S" },
      { accessor: "diff", label: "Diff" },
    ],
    [],
  );

  const handleGenerate = async () => {
    if (!date1?.[0]) {
      alert("Please select both dates");
      return;
    }

    try {
      setLoading(true);

      const conditions = [];
      if (selectedParty?.value) {
        conditions.push(
          `party.display_name='${selectedParty.value.replace(/'/g, "''")}'`,
        );
      }
      const whereClause = conditions.length ? conditions.join(" AND ") : "";

      console.log("whereClause  = ", whereClause);

      const response = await api.get(url.GET_OUTSTANDING_COMPARISION, {
        companyId: companyId,
        Date: date1,
        where: whereClause,
        mode: isSummary ? "SUMMARY" : "DETAIL",
      });

      console.log("response  ", response);
      const rows = Array.isArray(response) ? response : response?.data || [];

      setGenerated(true);
      setAppliedSummary(isSummary);
      setReportData(rows);
      setTotalEntries(rows.length);
      setCurrentPage(1);
    } catch (error) {
      console.error("Outstanding Comparison report error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDate1([new Date()]);
    setSelectedParty(null);
    setIsSummary(false);
    setReportData([]);
    setGenerated(false);
    setTotalEntries(0);
    setCurrentPage(1);
  };

  const paginatedData = useMemo(() => {
    if (rowsPerPage === "all") return reportData;
    const start = (currentPage - 1) * Number(rowsPerPage);
    return reportData.slice(start, start + Number(rowsPerPage));
  }, [reportData, currentPage, rowsPerPage]);

  const fetchExportData = async () => {
    return reportData || [];
  };

  const handlePrint = () => {
    const content = document.getElementById("outstandingPrintArea");
    if (!content) return;
    const w = window.open("", "_blank");

    const tableCSS = appliedSummary
      ? `
      .tb-a4 table { 
        margin: 0 auto; 
        border-collapse: collapse; 
      }
      .tb-a4 th, .tb-a4 td { 
        font-size: 13px !important; 
        padding: 7px 14px !important; 
        white-space: nowrap !important;
      }
      `
      : `
      .tb-a4 table { 
        page-break-inside:auto; 
        width: 100% !important; 
        min-width: 0 !important;
        table-layout: fixed !important;
      }
      .tb-a4 col {
        width: auto !important; /* let browser balance columns */
      }
      .tb-a4 th, .tb-a4 td { 
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        font-size: 11px !important;
        padding: 4px 6px !important;
        position: static !important;
      }
      /* Hide the filter row during print */
      .tb-a4 thead tr:last-child {
        display: none !important;
      }
      /* Customer column */
      .tb-a4 th:nth-child(2),
      .tb-a4 td:nth-child(2){
        width: 240px !important;
        min-width: 240px !important;
        max-width: 240px !important;
      }
      `;

    w.document.write(`<html><head><title>Outstanding Comparison</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <link href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css" rel="stylesheet">
            <style>
              /* Force A4 landscape when printing / saving PDF for wide tables */
              @page { size: A4 landscape; margin: 12mm; }
              html, body { height: auto; }
              body{
                padding:0;
                font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* A4 page canvas */
              .tb-a4{
                width: 100%;
                margin: 0 auto;
                background: #fff;
              }

              /* Overrides for inline styles */
              .tb-a4 * {
                overflow: visible !important;
                max-height: none !important;
              }
              
              ${tableCSS}
              
              thead{ display: table-header-group; }
              tfoot{ display: table-row-group; }
              tr{ page-break-inside: avoid; page-break-after:auto; }
            </style>
            </head><body><div class="tb-a4">${content.innerHTML}</div>
            <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},400);};</script>
            </body></html>`);
    w.document.close();
  };

  document.title = "Outstanding Comparison | SoftBook";

  const selectStyles = useMemo(
    () => buildSelectStyles(isDarkMode),
    [isDarkMode],
  );

  return (
    <React.Fragment>
      <div
        className={`page-content oc-page${isDarkMode ? " oc-page--dark" : ""}`}
      >
        <Container fluid>
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <div>
                  <h4 className="mb-sm-0">Outstanding Comparison Report</h4>
                  
                </div>
              </div>
            </Col>
          </Row>

          <Card className="mb-3 oc-filter-card">
            <CardBody>
              <Row className="g-3 align-items-end">
                <Col xs={12} sm={6} md={4} lg={3} xl={2}>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date1}
                    onChange={(e) => setDate1(e.target.value)}
                  />
                </Col>
                <Col xs={12} sm={6} md={5} lg={4} xl={4}>
                  <Label>Party</Label>
                  <Select
                    value={selectedParty}
                    onChange={setSelectedParty}
                    options={parties}
                    isClearable
                    isSearchable
                    placeholder="Select Party..."
                    classNamePrefix="oc-select"
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={selectStyles}
                  />
                </Col>
                <Col xs="auto" className="d-flex align-items-end pb-1">
                  <div className="form-check mb-0">
                    <Input
                      type="checkbox"
                      id="chkSummary"
                      className="form-check-input"
                      checked={isSummary}
                      onChange={(e) => setIsSummary(e.target.checked)}
                    />
                    <Label
                      className="form-check-label mb-0"
                      htmlFor="chkSummary"
                    >
                      Summary
                    </Label>
                  </div>
                </Col>
              </Row>
              <Row className="mt-3 g-2 align-items-center">
                <Col xs={12} lg={7}>
                  <div className="oc-toolbar">
                    <div className="oc-pagination">
                      <Label className="mb-0 small text-nowrap">Rows:</Label>
                      <Input
                        type="select"
                        bsSize="sm"
                        className="form-select-sm"
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
                      <Button
                        color="light"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                      >
                        <i className="ri-arrow-left-s-line"></i>
                      </Button>
                      <Button
                        color="primary"
                        size="sm"
                        style={{ minWidth: "30px" }}
                      >
                        {currentPage}
                      </Button>
                      <Button
                        color="light"
                        size="sm"
                        disabled={
                          totalEntries === 0 ||
                          (rowsPerPage !== "all" &&
                            currentPage >=
                              Math.ceil(totalEntries / Number(rowsPerPage)))
                        }
                        onClick={() => setCurrentPage((prev) => prev + 1)}
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
                <Col xs={12} lg={5} className="oc-filter-actions">
                  <Button color="soft-secondary" onClick={handleClear}>
                    Clear
                  </Button>
                  <Button
                    color="primary"
                    onClick={handleGenerate}
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : "Generate"}
                  </Button>
                  {/* <ExportOutstandingExcel
                    data={filteredData !== null ? filteredData : paginatedData}
                    date={date1}
                    isSummary={appliedSummary} // ← add this
                  /> */}
                  <ExportOutstandingExcel
                    data={
                      appliedSummary
                        ? reportData
                        : (filteredData !== null ? filteredData : paginatedData)
                    }
                    date={date1}
                    isSummary={appliedSummary}
                    companyInfo={companyInfo}
                  />
                  <Button
                    color="secondary"
                    outline
                    onClick={handlePrint}
                    title="Print"
                    disabled={!reportData || reportData.length === 0}
                    className="btn btn-soft-secondary"
                  >
                    <i className="ri-printer-line fs-5" />
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {(reportData.length > 0 || loading || generated) && (
            <Card id="outstandingPrintArea" className="oc-report-card">
              <div className="text-start">
                <HeaderForAllReport reportName="Outstanding Comparison Report" />
              </div>

              <CardBody className="oc-report-body">
                {appliedSummary ? (
                  loading ? (
                    <div className="px-3 py-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="oc-skeleton" />
                      ))}
                    </div>
                  ) : reportData.length === 0 ? (
                    <p className="oc-empty-hint mb-0">
                      No summary data for the selected filters.
                    </p>
                  ) : (
                    <SummaryTable data={reportData} />
                  )
                ) : (
                  <div className="oc-table-panel">
                    <MergedHeaderTable
                      columns={columns}
                      data={paginatedData}
                      loading={loading}
                      isDark={isDarkMode}
                      autoHeight={true}
                      minWidth="min(100%, 1000px)"
                      showTotals
                      onDataChange={setFilteredData}
                    />
                  </div>
                )}
              </CardBody>
              {/* COMMON FOOTER */}
              <FooterForAllRpt />
            </Card>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default OutstandingComparison;
