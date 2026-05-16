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

  const [generated, setGenerated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Lifted Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalEntries, setTotalEntries] = useState(0);


  const partyTypeOptions = [
    { value: "Customer", label: "Customer" },
    { value: "Vendor", label: "Vendor" }
  ];

  const [selectedPartyType, setSelectedPartyType] = useState(
    partyTypeOptions[0] // default Customer
  );


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
    { accessor: "displayName", label: "Party" },
    { accessor: "contact", label: "Contact" },
    { accessor: "outstanding", label: "Outstanding Amount" },
    { accessor: "creditDebit", label: "D/C" },
    { accessor: "terms", label: "Terms" },
    { accessor: "weekly", label: "Weekly Avg" },
    { accessor: "monthly", label: "Monthly Avg" }
  ], []);

  const headerRows = useMemo(() => [
    [{ v: "Payable Receivable Report", s: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } } }],
    [{ v: companyInfo?.companyName || "SoftBook", s: { font: { bold: true }, alignment: { horizontal: "center" } } }],
    [""] // spacing
  ], [companyInfo]);

  const tableRef = useRef(null);
  const fetchExportData = async () => {
    return tableRef.current?.getExportData() || reportData || [];
  };
  const handleClear = () => {
    setSelectedParty(null);
    setAsOfDate(new Date().toISOString().split("T")[0]);
    setReportData([]);
    setGenerated(false);
    setTotalEntries(0);
    setCurrentPage(1);
  };

  const columns = [

    {
      key: "displayName",
      label: "Party",
      width: "280px",
      align: "left",
      sortType: "string",
    },

    {
      key: "contact",
      label: "Contact",
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
      key: "terms",
      label: "Terms",
      width: "110px",
      align: "right",
      sortType: "number",
      totalFn: (t) => t.weekly > 0
        ? t.outstanding / t.weekly
        : 0
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
      key: "monthly",
      label: "Monthly Avg",
      width: "140px",
      align: "right",
      sortType: "number",
      totalType: "avg",
    },
  ];

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
      setTotalEntries(rows.length);
      setCurrentPage(1);
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

                <Col xs={12} md={6} xl={4}>
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

                <Col xs={12} md={6} xl={4}>
                  <Label>As Of Date</Label>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
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
                    fileName={`Payable_Receivable_Report`}
                    iconOnly
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>
          {(reportData.length > 0 || loading || generated) && (
            <Card>

              {/*COMMON HEADER */}
              <div className="text-start">
                <HeaderForAllReport reportName="Payable Receivable Report" />
              </div>


              <CardBody className="pt-3 pl-3 pr-3 pb-3">
                <CommonTable
                  ref={tableRef}
                  columns={columns}
                  data={reportData}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  loading={loading}
                  maxHeight="calc(100vh - 350px)"
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
