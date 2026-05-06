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
import Flatpickr from "react-flatpickr";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import CommonTable from "../../Components/Common/CommonTable";
import MergedHeaderTable from "../../Components/Common/MergedHeaderTable";
import ExportOutstandingExcel from "../../Components/Common/ExportOutstandingExcel";

import ExportButton from "../../Components/Common/ExportButton";
import "../../Components/Common/CommonTable.css";

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

/* ── Summary vertical table ─────────────────────────────── */
const SummaryTable = ({ data }) => {

    console.log("data", data);

    if (!data || data.length === 0) return null;
    const safeDiv = (a, b) => (b ? a / b : 0);
    const d = Array.isArray(data) ? data[0] : data;

    const yQty = Number(d.yQty ?? 0);
    const yAmount = Number(d.yAmount ?? 0);
    const yOs = Number(d.yOs ?? 0);

    const tQty = Number(d.tQty ?? 0);
    const tAmount = Number(d.tAmount ?? 0);
    const tOs = Number(d.tOs ?? 0);

    const base = { border: "1px solid #ccc", padding: "7px 14px", fontSize: "13px" };
    const labelCell = { ...base, fontWeight: "bold", whiteSpace: "nowrap", textAlign: "left", background: "#f8f9fa" };
    const headCell = { ...base, textAlign: "right", fontWeight: "bold", background: "#e9ecef", minWidth: "140px" };
    const numCell = { ...base, textAlign: "right" };
    const plCell = { ...base, textAlign: "right", fontWeight: "bold" };
    const plLabel = { ...labelCell, };
    const profitColor = "#16a34a";  // green-600
    const lossColor = "#dc2626";    // red-600
    const getPLColor = (val) => (val >= 0 ? profitColor : lossColor);

    return (
        <div style={{ overflowX: "auto", display: "flex", justifyContent: "center" }}>
            <table style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th style={{ ...headCell, textAlign: "left", minWidth: "140px" }}></th>
                        <th style={headCell}>Qty</th>
                        <th style={headCell}>Amount</th>
                        <th style={headCell}>Price</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={labelCell}>Yesterday Purchase</td>
                        <td style={numCell}>{fmt(yQty, 2)}</td>
                        <td style={numCell}>{fmt(yAmount, 2)}</td>
                        <td style={numCell}>{fmt(safeDiv(yAmount, yQty), 2)}</td>
                    </tr>
                    <tr>
                        <td style={labelCell}>Today Sale</td>
                        <td style={numCell}>{fmt(tQty, 2)}</td>
                        <td style={numCell}>{fmt(tAmount, 2)}</td>
                        <td style={numCell}>{fmt(safeDiv(tAmount, tQty), 2)}</td>
                    </tr>
                    <tr>
                        <td style={plLabel}>Today PL</td>
                        <td style={plCell}></td>
                        <td
                            style={{
                                ...plCell,
                                color: getPLColor(tAmount - yAmount),
                            }}
                        >
                            {fmt(tAmount - yAmount, 2)}
                        </td>

                        <td
                            style={{
                                ...plCell,
                                color: getPLColor(safeDiv(tAmount, tQty) - safeDiv(yAmount, yQty)),
                            }}
                        >
                            {fmt(safeDiv(tAmount, tQty) - safeDiv(yAmount, yQty), 2)}
                        </td>
                    </tr>
                    <tr>
                        <td style={plLabel}>Today PL %</td>
                        <td style={plCell}></td>
                        <td
                            style={{
                                ...plCell,
                                color: getPLColor(safeDiv(tAmount, yAmount) - 1),
                            }}
                        >
                            {fmt(safeDiv(tAmount, yAmount) - 1, 2)}%
                        </td>
                        <td style={plCell}> </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const OutstandingComparison = () => {
    const companyId = localStorage.getItem("companyId") || 10001;

    const [date1, setDate1] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [generated, setGenerated] = useState(false);
    const [appliedSummary, setAppliedSummary] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedParty, setSelectedParty] = useState(null);
    const [parties, setParties] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [isSummary, setIsSummary] = useState(false);

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
        const fetchParties = async () => {
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
                console.error("Party load error", e);
            }
        };

        fetchParties();
    }, []);
    const columns = [
        {
            key: "srNo",
            label: "Sr No",
            group: "Date :",
            width: "70px",
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
            width: "100px",
            align: "right",
            sortType: "number",
            totalType: "sum",
        },
        {
            key: "yAmount",
            label: "Amount",
            group: "Yesterday",
            width: "120px",
            align: "right",
            sortType: "number",
            totalType: "sum",
        },
        {
            key: "yOs",
            label: "O/S",
            group: "Yesterday",
            width: "120px",
            align: "right",
            sortType: "number",
            totalType: "sum",
        },
        // Today group
        {
            key: "tQty",
            label: "Qty",
            group: "Today",
            width: "100px",
            align: "right",
            sortType: "number",
            totalType: "sum",
        },
        {
            key: "tAmount",
            label: "Amount",
            group: "Today",
            width: "120px",
            align: "right",
            sortType: "number",
            totalType: "sum",
        },
        {
            key: "receipt",
            label: "Receipt",
            group: "Today",
            width: "120px",
            align: "right",
            sortType: "number",
            totalType: "sum",
        },
        {
            key: "tOs",
            label: "O/S",
            group: "Today",
            width: "120px",
            align: "right",
            sortType: "number",
            totalType: "sum",
        },
        {
            key: "diff",
            label: "Diff",
            group: "\u00A0",
            width: "120px",
            align: "right",
            sortType: "number",
            totalType: "sum",
            cell: (r) => {
                const val = r.diff || 0;
                return (
                    <span
                        className={val > 0 ? "text-success" : val < 0 ? "text-danger" : ""}
                    >
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
        const content = document.getElementById('outstandingPrintArea');
        if (!content) return;
        const w = window.open('', '_blank');
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
              
              .tb-a4 table { 
                page-break-inside:auto; 
                width: 100% !important; 
                min-width: 0 !important;
              }
              
              .tb-a4 col {
                width: auto !important; /* let browser balance columns */
              }

              .tb-a4 th, .tb-a4 td { 
                white-space: normal !important; /* allow text wrapping instead of scrolling */
                word-wrap: break-word;
                font-size: 11px !important;
                padding: 4px 6px !important;
                position: static !important;
              }
              
              /* Hide the filter row during print */
              .tb-a4 thead tr:last-child {
                display: none !important;
              }
              
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

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Row>
                        <Col xs={12}>
                            <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                                <h4 className="mb-sm-0">Outstanding Comparison Report</h4>
                            </div>
                        </Col>
                    </Row>

                    <Card className="mb-3">
                        <CardBody>
                            <Row className="g-3">
                                <Col xs={12} md={6} xl={2}>
                                    <Label>Date</Label>
                                    {/* <Flatpickr
                                        className="form-control"
                                        options={{ dateFormat: "Y-m-d" }}
                                        value={date1}
                                        onChange={setDate1}
                                    /> */}
                                    <Input
                                        type="date"
                                        value={date1}
                                        onChange={(e) => setDate1(e.target.value)}
                                    />
                                </Col>
                                <Col xs={12} md={6} xl={4}>
                                    <Label>Party</Label>
                                    <Select
                                        value={selectedParty}
                                        onChange={setSelectedParty}
                                        options={parties}
                                        isClearable
                                        placeholder="Select Party..."
                                        menuPortalTarget={document.body}
                                        menuPosition="fixed"
                                        styles={{
                                            menuPortal: (base) => ({ ...base, zIndex: 999999 }),
                                            menu: (base) => ({ ...base, zIndex: 999999 }),
                                        }}
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
                                        <Label className="form-check-label mb-0" htmlFor="chkSummary">
                                            Summary
                                        </Label>
                                    </div>
                                </Col>
                            </Row>
                            <Row className="mt-3 align-items-center">
                                <Col md={8}>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <Label
                                                className="mb-0 small"
                                                style={{ whiteSpace: "nowrap" }}
                                            >
                                                Rows:
                                            </Label>
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
                                <Col
                                    md={4}
                                    className="d-flex justify-content-end gap-2 text-end"
                                >
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
                                    <ExportOutstandingExcel
                                        data={filteredData !== null ? filteredData : paginatedData}
                                        date={date1}
                                        isSummary={appliedSummary}   // ← add this
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
                        <Card id="outstandingPrintArea">
                            {/* Print-only title */}
                            <div className="d-none d-print-block p-3 border-bottom mb-2 text-center">
                                <h3 className="mb-1">Outstanding Comparison Report</h3>
                                <div className="text-muted">
                                    Date: <strong>{date1}</strong>
                                    {appliedSummary ? " (Summary View)" : ""}
                                </div>
                            </div>
                            <CardBody className="pt-3 pl-3 pr-3 pb-3">
                                {appliedSummary ? (
                                    loading ? (
                                        <div className="text-center py-4">
                                            <Spinner />
                                        </div>
                                    ) : (
                                        <SummaryTable data={reportData} />
                                    )
                                ) : (
                                    <MergedHeaderTable
                                        columns={columns}
                                        data={paginatedData}
                                        loading={loading}
                                        maxHeight="calc(100vh - 350px)"
                                        minWidth="1000px"
                                        showTotals
                                        onDataChange={setFilteredData}
                                    />
                                )}
                            </CardBody>
                        </Card>
                    )}
                </Container>
            </div>
        </React.Fragment>
    );
};

export default OutstandingComparison;
