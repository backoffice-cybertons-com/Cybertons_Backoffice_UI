import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card, CardHeader, CardBody, Col, Container, Row,
  Input, Button, Label, Spinner
} from 'reactstrap';
import Select from 'react-select';
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import CommonTable from "../../Components/Common/CommonTable";
import ExportButton from "../../Components/Common/ExportButton";
import "../../Components/Common/CommonTable.css";
import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";

const api = new APIClient();

const PayebleReceivableReport = () => {
  const companyId = localStorage.getItem("companyId");
  const [companyInfo, setCompanyInfo] = useState(null);

  const [partys, setPartys] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  const partyTypeOptions = [
    { value: "Customer", label: "Customer" },
    { value: "Vendor", label: "Vendor" }
  ];

  const [selectedPartyType, setSelectedPartyType] = useState(
    partyTypeOptions[0] // default Customer
  );

  const [generated, setGenerated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  const groupByOptions = useMemo(() => [
    { value: "none", label: "None (Party Wise)" },
    { value: "zone", label: "Zone Wise" },
    { value: "kam", label: "KAM Wise" },
    { value: "recovery_agent", label: "Recovery Agent Wise" },
    { value: "sales_person", label: "Sales Person Wise" },
    { value: "transporter", label: "Transporter Wise" },
    { value: "sumul_incharge", label: "Sumul Area Incharge Wise" }
  ], []);

  const [selectedGroupBy, setSelectedGroupBy] = useState(groupByOptions[0]);

  const processedData = useMemo(() => {
    if (!selectedGroupBy || selectedGroupBy.value === "none") {
      return reportData;
    }

    const groupKey = selectedGroupBy.value;
    const propMap = {
      zone: "zoneName",
      kam: "kam",
      recovery_agent: "recoveryAgent",
      sales_person: "salespersonName",
      transporter: "transporterName",
      sumul_incharge: "sumulIncharge"
    };

    const targetProp = propMap[groupKey];
    const groups = {};

    reportData.forEach(row => {
      const rawVal = row[targetProp] || row[targetProp.charAt(0).toUpperCase() + targetProp.slice(1)];
      const groupVal = rawVal ? rawVal.toString().trim() : "Unassigned";

      if (!groups[groupVal]) {
        groups[groupVal] = {
          displayName: groupVal,
          contact: "",
          openingBalance: 0,
          invAmt: 0,
          paidAmt: 0,
          outstanding: 0,
          weekly: 0,
          monthly: 0,
          count: 0
        };
      }

      const g = groups[groupVal];
      g.openingBalance += Number(row.openingBalance || row.OpeningBalance || 0);
      g.invAmt += Number(row.invAmt || row.InvAmt || 0);
      g.paidAmt += Number(row.paidAmt || row.PaidAmt || 0);
      g.outstanding += Number(row.outstanding || row.Outstanding || 0);
      g.weekly += Number(row.weekly || row.Weekly || 0);
      g.monthly += Number(row.monthly || row.Monthly || 0);
      g.count += 1;
    });

    return Object.values(groups).map(g => {
      g.contact = `${g.count} Parties`;
      
      if (selectedPartyType?.value === "Customer") {
        g.creditDebit = g.outstanding >= 0 ? "D" : "C";
      } else {
        g.creditDebit = g.outstanding <= 0 ? "C" : "D";
      }

      g.terms = g.weekly > 0 ? g.outstanding / g.weekly : 0;
      g.monthlyTerm = g.monthly > 0 ? (g.outstanding / g.monthly) / 30.0 : 0;

      g.outstanding = Math.round(g.outstanding * 100) / 100;
      g.weekly = Math.round(g.weekly * 100) / 100;
      g.monthly = Math.round(g.monthly * 100) / 100;
      g.terms = Math.round(g.terms * 1000) / 1000;
      g.monthlyTerm = Math.round(g.monthlyTerm * 1000) / 1000;

      return g;
    });
  }, [reportData, selectedGroupBy, selectedPartyType]);

  useEffect(() => {
    setTotalEntries(processedData.length);
    setCurrentPage(1);
  }, [processedData]);

  // Lifted Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalEntries, setTotalEntries] = useState(0);


  useEffect(() => {
    const loadParties = async () => {
      try {
        const res = await api.get(url.GET_PARTIES);

        const partyList = Array.isArray(res) ? res : res?.data || [];

        setPartys(
          partyList
            .filter(
              p => (p.partyType || p.PartyType) === selectedPartyType?.value
            )
            .map((p) => ({
              value: p.partyId || p.PartyId,
              label: p.displayName || p.DisplayName,
            })),
        );
      } catch (err) {
        console.error(err);
      }
    };

    const loadCompanyInfo = async () => {
      try {
        const res = await api.get(url.GET_COMPANY_PROFILE);
        setCompanyInfo(res?.data || res);
      } catch (err) {
        console.error(err);
      }
    };

    loadParties();
    loadCompanyInfo();
  }, [selectedPartyType]);


  /* ── excel export ── */

  const exportColumns = useMemo(() => [
    { 
      accessor: "displayName", 
      label: !selectedGroupBy || selectedGroupBy.value === "none" 
        ? "Party" 
        : selectedGroupBy.label.replace(" Wise", "") 
    },
    { 
      accessor: "contact", 
      label: !selectedGroupBy || selectedGroupBy.value === "none" 
        ? "Contact" 
        : "Party Count" 
    },
    { accessor: "outstanding", label: "Outstanding Amount" },
    { accessor: "creditDebit", label: "D/C" },
    { accessor: "weekly", label: "Weekly Avg" },
    { accessor: "terms", label: "Weekly Term" },
    { accessor: "monthly", label: "Monthly Avg" },
    { accessor: "monthlyTerm", label: "Monthly Term" }
  ], [selectedGroupBy]);

  const headerRows = useMemo(() => [
    [{ v: "Payable Receivable Report", s: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } } }],
    [{ v: companyInfo?.companyName || "SoftBook", s: { font: { bold: true }, alignment: { horizontal: "center" } } }],
    [""] // spacing
  ], [companyInfo]);

  const tableRef = useRef(null);
  const fetchExportData = async () => {
    return tableRef.current?.getExportData() || processedData || [];
  };
  const handleClear = () => {
    setSelectedParty(null);
    setAsOfDate(new Date().toISOString().split("T")[0]);
    setReportData([]);
    setGenerated(false);
    setSelectedGroupBy(groupByOptions[0]);
    setTotalEntries(0);
    setCurrentPage(1);
  };

  const columns = useMemo(() => [
    {
      key: "displayName",
      label: !selectedGroupBy || selectedGroupBy.value === "none"
        ? "Party"
        : selectedGroupBy.label.replace(" Wise", ""),
      width: "280px",
      align: "left",
      sortType: "string",
      cell: (row) => {
        if (!selectedGroupBy || selectedGroupBy.value === "none") {
          return (
            <span 
              className="text-primary" 
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => {
                const date = new Date(asOfDate);
                const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                
                const fromStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
                const toStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
                
                const url = `/report/daily-outstanding-report?viewMode=calendar&partyId=${row.partyId || row.PartyId}&fromDate=${fromStr}&toDate=${toStr}`;
                window.open(url, "_blank");
              }}
            >
              {row.displayName}
            </span>
          );
        }
        return <span>{row.displayName}</span>;
      }
    },

    {
      key: "contact",
      label: !selectedGroupBy || selectedGroupBy.value === "none" ? "Contact" : "Party Count",
      width: "130px",
      align: "center",
      sortType: "string",
    },

    {
      key: "outstanding",
      label: "Outstanding Amount",
      width: "150px",
      align: "right",
      sortType: "number",
      totalType: "sum",
    },
    {
      key: "creditDebit",
      label: "D/C",
      width: "80px",
      align: "right",
      sortType: "string",
    },
    {
      key: "weekly",
      label: "Weekly Avg",
      width: "140px",
      align: "right",
      sortType: "number",
      totalType: "avg",
    },
    {
      key: "terms",
      label: "Weekly Term",
      width: "110px",
      align: "right",
      sortType: "number",
      totalFn: (t) => t.weekly > 0
        ? t.outstanding / t.weekly
        : 0
    },
    {
      key: "monthly",
      label: "Monthly Avg",
      width: "140px",
      align: "right",
      sortType: "number",
      totalType: "avg",
    },
    {
      key: "monthlyTerm",
      label: "Monthly Term",
      width: "110px",
      align: "right",
      sortType: "number",
      totalFn: (t) => t.monthly > 0
        ? t.outstanding / t.monthly
        : 0
    },
  ], [selectedGroupBy, asOfDate, selectedPartyType]);

  const handleGenerate = async () => {

    if (!asOfDate) {
      alert("Select As Of Date");
      return;
    }

    try {
      setLoading(true);
      debugger
      const response = await api.get(url.GET_PAYRECRPT_REPORT, {
        params: {
          companyId: companyId,
          partyId:
            selectedParty && selectedParty.value > 0
              ? selectedParty.value
              : null,
          pAsOfDate: asOfDate || null,
          partyType: selectedPartyType ? selectedPartyType.value : null,
        },
      });
      const rows = Array.isArray(response)
        ? response
        : response?.data || [];

      console.log(rows.length); // should show 41
      setGenerated(true);
      setReportData(rows);
    } catch (error) {
      console.error("Payable Receivable report error", error);
    } finally {
      setLoading(false);
    }
  };

  document.title = "Payable Receivable Report | SoftBook";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 className="mb-sm-0">Payable Receivable Report</h4>
              </div>
            </Col>
          </Row>

          <Card className="mb-3">

            <CardBody>
              <Row className="g-3">

                <Col xs={12} md={6} xl={3}>
                  <Label>Party Type</Label>
                  <Select
                    value={selectedPartyType}
                    onChange={setSelectedPartyType}
                    options={partyTypeOptions}
                    placeholder="Select Type..."
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      menuPortal: base => ({
                        ...base,
                        zIndex: 999999
                      }),
                      menu: base => ({
                        ...base,
                        zIndex: 999999
                      })
                    }}
                  />
                </Col>

                <Col xs={12} md={6} xl={3}>
                  <Label>Party</Label>
                  <Select
                    value={selectedParty}
                    onChange={setSelectedParty}
                    options={partys}
                    isClearable
                    placeholder="Select Party..."
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      menuPortal: base => ({
                        ...base,
                        zIndex: 999999
                      }),
                      menu: base => ({
                        ...base,
                        zIndex: 999999
                      })
                    }}
                  />
                </Col>

                <Col xs={12} md={6} xl={3}>
                  <Label>As Of Date</Label>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                  />
                </Col>

                <Col xs={12} md={6} xl={3}>
                  <Label>Group By</Label>
                  <Select
                    value={selectedGroupBy}
                    onChange={setSelectedGroupBy}
                    options={groupByOptions}
                    placeholder="Select Grouping..."
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      menuPortal: base => ({
                        ...base,
                        zIndex: 999999
                      }),
                      menu: base => ({
                        ...base,
                        zIndex: 999999
                      })
                    }}
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
                  <Button
                    color="soft-secondary"
                    onClick={handleClear}
                  >
                    Clear
                  </Button>

                  <Button
                    color="primary"
                    onClick={handleGenerate}
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : "Generate"}
                  </Button>

                  <ExportButton
                    data={fetchExportData}
                    columns={exportColumns}
                    headerRows={headerRows}
                    fileName={`Payable_Receivable_Report${
                      selectedGroupBy && selectedGroupBy.value !== "none" 
                        ? `_Grouped_By_${selectedGroupBy.value}` 
                        : ""
                    }`}
                    iconOnly
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>
          {(processedData.length > 0 || loading || generated) && (
            <Card>

              {/*COMMON HEADER */}
              <div className="text-start">
                <HeaderForAllReport reportName="Payable Receivable Report" />
              </div>


              <CardBody className="pt-3 pl-3 pr-3 pb-3">
                <CommonTable
                  ref={tableRef}
                  columns={columns}
                  data={processedData}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  loading={loading}
                  autoHeight={true}
                  minWidth="1600px"
                  showTotals
                />
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

export default PayebleReceivableReport;
