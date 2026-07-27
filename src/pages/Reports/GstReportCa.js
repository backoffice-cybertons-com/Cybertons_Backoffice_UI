import React, { useState } from "react";
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Label } from "reactstrap";
import Flatpickr from "react-flatpickr";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import secureStorage from "../../utils/secureStorage";

const GstReportCa = () => {
    document.title = "GST Report for CA | SoftBook";

    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        try {
            setIsLoading(true);
            const companyId = secureStorage.getPlain("companyId");
            
            // Format dates as YYYY-MM-DD
            const formattedFromDate = new Date(fromDate.getTime() - (fromDate.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
            const formattedToDate = new Date(toDate.getTime() - (toDate.getTimezoneOffset() * 60000)).toISOString().split("T")[0];

            const token = secureStorage.getSecure("authToken");

            const apiUrl = process.env.REACT_APP_API_URL || "https://localhost:7067";
            const response = await fetch(
                `${apiUrl}/api/Report/gst-report-ca-export?companyId=${companyId}&fromDate=${formattedFromDate}&toDate=${formattedToDate}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `GST_REPORT_CA_${formattedFromDate}_${formattedToDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error("Error downloading report:", error);
            alert("Failed to download report. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="GST Report for CA" pageTitle="Reports" />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h5 className="card-title mb-0">Generate GST Report for CA</h5>
                                </CardHeader>
                                <CardBody>
                                    <Row className="gy-4">
                                        <Col lg={4} md={6}>
                                            <div>
                                                <Label htmlFor="fromDate" className="form-label">From Date</Label>
                                                <Flatpickr
                                                    className="form-control"
                                                    options={{
                                                        dateFormat: "d M, Y"
                                                    }}
                                                    value={fromDate}
                                                    onChange={([date]) => setFromDate(date)}
                                                />
                                            </div>
                                        </Col>
                                        <Col lg={4} md={6}>
                                            <div>
                                                <Label htmlFor="toDate" className="form-label">To Date</Label>
                                                <Flatpickr
                                                    className="form-control"
                                                    options={{
                                                        dateFormat: "d M, Y"
                                                    }}
                                                    value={toDate}
                                                    onChange={([date]) => setToDate(date)}
                                                />
                                            </div>
                                        </Col>
                                        <Col lg={4} md={12} className="d-flex align-items-end">
                                            <Button 
                                                color="primary" 
                                                onClick={handleDownload} 
                                                disabled={isLoading}
                                                className="w-100"
                                            >
                                                {isLoading ? "Downloading..." : "Download Excel"}
                                            </Button>
                                        </Col>
                                    </Row>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default GstReportCa;
