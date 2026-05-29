// Code developed by Hetak Modi 290526
import React, { useState } from "react";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Input,
    Label,
    Row,
    Spinner,
    Table
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";
import { getBankBook } from "../../helpers/fakebackend_helper";
import secureStorage from "../../utils/secureStorage";

const BankBookReport = () => {
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    document.title = "Bank Book | SoftBook";
    const companyName = secureStorage.getPlain("companyName") || secureStorage.getPlain("CompanyName") || "SoftBook";

    const formatLocalYMD = (value) => {
        if (!value) return "";
        const date = value instanceof Date ? value : new Date(value);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const formatDate = (value) => {
        if (!value) return "";
        return new Date(value).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const formatMoney = (amount) => Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const fetchReport = async () => {
        if (!fromDate || !toDate) {
            setError("Please select both dates.");
            return;
        }

        setLoading(true);
        setError("");
        setReportData(null);

        try {
            const companyId = secureStorage.getPlain("companyId") || 10001;
            const from = formatLocalYMD(fromDate);
            const to = formatLocalYMD(toDate);
            const response = await getBankBook(companyId, from, to);
            const data = Array.isArray(response) ? response : (response?.data || []);
            setReportData(data);
        } catch (err) {
            console.error("Bank Book Error:", err);
            setError(typeof err === "string" ? err : "Failed to load Bank Book. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleExcel = () => {
        if (!reportData || !reportData.length) return;

        const aoa = [
            ["Bank Book", "", "", "", "", "", ""],
            ["Company Name:", companyName, "", "", "", "", ""],
            ["Period:", `${formatDate(fromDate)} to ${formatDate(toDate)}`, "", "", "", "", ""],
            ["", "", "", "", "", "", ""],
            ["Date", "Voucher No", "Voucher Type", "Particulars", "Receipt", "Payment", "Balance"]
        ];

        reportData.forEach(row => {
            aoa.push([
                formatDate(row.transactionDate || row.TransactionDate),
                row.voucherNo || row.VoucherNo || "",
                row.voucherType || row.VoucherType || "",
                row.particulars || row.Particulars || "",
                row.receiptAmount || row.ReceiptAmount || 0,
                row.paymentAmount || row.PaymentAmount || 0,
                row.balance || row.Balance || 0
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bank Book");
        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buffer], { type: "application/octet-stream" }), `Bank_Book_${formatLocalYMD(fromDate)}.xlsx`);
    };

    const handlePrint = () => {
        const content = document.getElementById("reportPrintArea");
        if (!content) return;

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`<html><head><title>Bank Book</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { background: #fff; font-family: sans-serif; -webkit-print-color-adjust: exact !important; }
                .no-print { display: none !important; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #dee2e6; padding: 6px; font-size: 11px; }
                th { background-color: #f8f9fa !important; }
                .text-end { text-align: right; }
            </style>
            </head><body>${content.innerHTML}
            <script>window.onload=function(){setTimeout(()=>{window.print();window.close();},400);};</script>
            </body></html>`);
        printWindow.document.close();
    };

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Bank Book" pageTitle="Reports" />

                <Card className="mb-2">
                    <CardBody className="py-2">
                        <Row className="g-3 align-items-end">
                            <Col xxl={2} lg={3} md={4}>
                                <Label className="form-label mb-1">From Date</Label>
                                <Flatpickr
                                    className="form-control"
                                    value={fromDate}
                                    onChange={([date]) => setFromDate(date)}
                                    options={{ dateFormat: "d M Y" }}
                                />
                            </Col>
                            <Col xxl={2} lg={3} md={4}>
                                <Label className="form-label mb-1">To Date</Label>
                                <Flatpickr
                                    className="form-control"
                                    value={toDate}
                                    onChange={([date]) => setToDate(date)}
                                    options={{ dateFormat: "d M Y" }}
                                />
                            </Col>
                            <Col xxl={2} lg={3} md={4}>
                                <Button color="primary" className="w-100" onClick={fetchReport} disabled={loading}>
                                    {loading ? <Spinner size="sm" /> : "Generate"}
                                </Button>
                            </Col>
                            <Col xxl={2} lg={3} md={4} className="d-flex gap-2">
                                <Button color="success" outline onClick={handleExcel} disabled={!reportData?.length}>Export</Button>
                                <Button color="secondary" outline onClick={handlePrint} disabled={!reportData?.length}>Print</Button>
                            </Col>
                        </Row>
                        {error && <div className="text-danger mt-2">{error}</div>}
                    </CardBody>
                </Card>

                {reportData && (
                    <Card id="reportPrintArea">
                        <HeaderForAllReport reportName="Bank Book" />
                        <CardBody>
                            <div className="mb-3">
                                <h6>Period: {formatDate(fromDate)} to {formatDate(toDate)}</h6>
                            </div>
                            <div className="table-responsive">
                                <Table className="table-bordered table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Date</th>
                                            <th>Voucher No</th>
                                            <th>Voucher Type</th>
                                            <th>Particulars</th>
                                            <th className="text-end">Receipt</th>
                                            <th className="text-end">Payment</th>
                                            <th className="text-end">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center">No records found.</td></tr>
                                        ) : (
                                            reportData.map((row, idx) => {
                                                const dt = row.transactionDate || row.TransactionDate;
                                                const vNo = row.voucherNo || row.VoucherNo;
                                                const isOpening = !vNo && !row.voucherType && !row.VoucherType;
                                                
                                                return (
                                                <tr key={idx} className={isOpening ? "table-light fw-bold" : ""}>
                                                    <td>{dt ? formatDate(dt) : ""}</td>
                                                    <td>{vNo || ""}</td>
                                                    <td>{row.voucherType || row.VoucherType || ""}</td>
                                                    <td>{row.particulars || row.Particulars}</td>
                                                    <td className="text-end">{formatMoney(row.receiptAmount || row.ReceiptAmount)}</td>
                                                    <td className="text-end">{formatMoney(row.paymentAmount || row.PaymentAmount)}</td>
                                                    <td className="text-end">{formatMoney(row.balance || row.Balance)}</td>
                                                </tr>
                                            )})
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </CardBody>
                        <FooterForAllRpt />
                    </Card>
                )}
            </Container>
        </div>
    );
};

export default BankBookReport;
