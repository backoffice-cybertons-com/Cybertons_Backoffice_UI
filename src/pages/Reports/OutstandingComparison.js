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
    const d = Array.isArray(data) ? data[0] : data;

    const yQty = Number(d.y_qty ?? 0);
    const yAmount = Number(d.y_amount ?? 0);
    const yOs = Number(d.y_os ?? 0);
    const tQty = Number(d.t_qty ?? 0);
    const tAmount = Number(d.t_amount ?? 0);
    const tOs = Number(d.t_os ?? 0);
    const plQty = tQty - yQty;
    const plAmount = tAmount - yAmount;   // or use d.diff if backend sends it
    const plOs = tOs - yOs;

    const base = { border: "1px solid #ccc", padding: "7px 14px", fontSize: "13px" };
    const labelCell = { ...base, fontWeight: "bold", whiteSpace: "nowrap", textAlign: "left", background: "#f8f9fa" };
    const headCell = { ...base, textAlign: "right", fontWeight: "bold", background: "#e9ecef", minWidth: "140px" };
    const numCell = { ...base, textAlign: "right" };
    const plCell = { ...base, textAlign: "right", background: "#ffff00", fontWeight: "bold" };
    const plLabel = { ...labelCell, background: "#ffff00" };

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th style={{ ...headCell, textAlign: "left", minWidth: "140px" }}></th>
                        <th style={headCell}>Qty</th>
                        <th style={headCell}>Amount</th>
                        <th style={headCell}>O/S</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={labelCell}>Yesterday</td>
                        <td style={numCell}>{fmt(yQty, 2)}</td>
                        <td style={numCell}>{fmt(yAmount, 2)}</td>
                        <td style={numCell}>{fmt(yOs, 2)}</td>
                    </tr>
                    <tr>
                        <td style={labelCell}>Today</td>
                        <td style={numCell}>{fmt(tQty, 2)}</td>
                        <td style={numCell}>{fmt(tAmount, 2)}</td>
                        <td style={numCell}>{fmt(tOs, 2)}</td>
                    </tr>
                    <tr>
                        <td style={plLabel}>Profit &amp; Loss</td>
                        <td style={plCell}>{fmt(plQty, 2)}</td>
                        <td style={plCell}>{fmt(plAmount, 2)}</td>
                        <td style={plCell}>{fmt(plOs, 2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const OutstandingComparison = () => {
    const companyId = localStorage.getItem("companyId") || 10001;

    const [date1, setDate1] = useState([new Date()]);

    const [generated, setGenerated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedParty, setSelectedParty] = useState(null);
    const [parties, setParties] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [isSummary, setIsSummary] = useState(false);

    // Lifted Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [totalEntries, setTotalEntries] = useState(0);

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
            group: "\u00A0",
            width: "60px",
            align: "center",
            cell: (_, index) => {
                if (rowsPerPage === "all") return index + 1;

                return (currentPage - 1) * Number(rowsPerPage) + index + 1;
            },
        },
        {
            key: "customerName",
            label: "Customer",
            group: "\u00A0\u00A0",
            width: "250px",
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
                Date: formatDateForApi(date1[0]),
                where: whereClause,
                mode: isSummary ? "SUMMARY" : "DETAIL",
            });
            const rows = Array.isArray(response) ? response : response?.data || [];

            setGenerated(true);
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
                                    <Flatpickr
                                        className="form-control"
                                        options={{ dateFormat: "Y-m-d" }}
                                        value={date1}
                                        onChange={setDate1}
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
                                    <ExportButton
                                        data={fetchExportData}
                                        columns={exportColumns}
                                        fileName={`Outstanding_Comparison`}
                                        iconOnly
                                    />
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {(reportData.length > 0 || loading || generated) && (
                        <Card>
                            <CardBody className="pt-3 pl-3 pr-3 pb-3">
                                {isSummary ? (
                                    loading ? (
                                        <div className="text-center py-4">
                                            <Spinner />
                                        </div>
                                    ) : (
                                        <SummaryTable data={reportData} />
                                    )
                                ) : (
                                    <CommonTable
                                        columns={columns}
                                        data={paginatedData}
                                        loading={loading}
                                        maxHeight="calc(100vh - 350px)"
                                        minWidth="1000px"
                                        showTotals
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
