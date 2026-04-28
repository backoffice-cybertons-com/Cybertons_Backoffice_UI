import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Card, CardHeader, CardBody, Col, Container, Row,
    Input, Button, Label, Spinner, Form
} from 'reactstrap';
import Select from 'react-select';
import Flatpickr from "react-flatpickr";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import GSTR3BExcelExport from "../../Components/Common/GSTR3BExcelExport";


const api = new APIClient();


const GSTR3BReport = () => {

    // For Date
    const fromRef = useRef(null);
    const toRef = useRef(null);
    const [fromDate, setFromDate] = useState("2026-01-01");
    const [toDate, setToDate] = useState("2026-12-31");
    // For Data From DB
    const [section31, setSection31] = useState([]);
    const [section32, setSection32] = useState([]);
    const [section4, setSection4] = useState([]);
    const [section5, setSection5] = useState([]);


    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);


    const fetchReport = async () => {
        setLoading(true);
        try {

            const whereClause = [];

            if (fromDate && toDate)
                whereClause.push(
                    `tsp.inv_date BETWEEN '${fromRef.current.value}' AND '${toRef.current.value}'`
                );

            console.log(whereClause);
            const section31 = await api.get(url.GET_GSTR3B, {
                params: {
                    companyId: localStorage.getItem("companyId"),
                    where: whereClause,
                    Type: '3.1'
                }
            });

            const section32 = await api.get(url.GET_GSTR3B, {
                params: {
                    companyId: localStorage.getItem("companyId"),
                    where: whereClause,
                    Type: '3.2'
                }
            });

            const section4 = await api.get(url.GET_GSTR3B, {
                params: {
                    companyId: localStorage.getItem("companyId"),
                    where: whereClause,
                    Type: '4'
                }
            });

            const section5 = await api.get(url.GET_GSTR3B, {
                params: {
                    companyId: localStorage.getItem("companyId"),
                    where: whereClause,
                    Type: '5'
                }
            });
            console.log(section31);
            console.log(section32);
            console.log(section4);
            console.log(section5);

            const raw1 = Array.isArray(section31)
                ? section31
                : (section31?.data || []);

            const raw2 = Array.isArray(section32)
                ? section32
                : (section32?.data || []);

            const raw3 = Array.isArray(section4)
                ? section4
                : (section4?.data || []);

            const raw4 = Array.isArray(section5)
                ? section5
                : (section5?.data || []);

            setSection31(raw1);
            setSection32(raw2);
            setSection4(raw3);
            setSection5(raw4);

            setGenerated(true);

        }
        finally {
            setLoading(false);
        }
    }

    const exportColumns = [
        { label: "Section", key: "Section" },
        { label: "Nature / Details", key: "Nature" },
        { label: "Taxable Value", key: "TaxableValue" },
        { label: "IGST", key: "IGST" },
        { label: "CGST", key: "CGST" },
        { label: "SGST", key: "SGST" },
        { label: "Cess", key: "Cess" },
        { label: "Inter-State", key: "InterState" },
        { label: "Intra-State", key: "IntraState" }
    ];

    const fetchExportData = () => {
        let data = [];

        section31.forEach(r => {
            data.push({
                Section: "3.1",
                Nature: r.section,
                TaxableValue: r.taxableAmt,
                IGST: r.igstAmt,
                CGST: r.cgstAmt,
                SGST: r.sgstAmt,
                Cess: r.cess
            });
        });

        section32.forEach(r => {
            data.push({
                Section: "3.2",
                Nature: r.section,
                TaxableValue: r.taxableAmt,
                IGST: r.igstAmt
            });
        });

        section4.forEach(r => {
            data.push({
                Section: "4",
                Nature: r.section,
                IGST: r.igstAmt,
                CGST: r.cgstAmt,
                SGST: r.sgstAmt,
                Cess: r.cess
            });
        });

        section5.forEach(r => {
            data.push({
                Section: "5",
                Nature: r.section,
                InterState: r.interStateSupplies,
                IntraState: r.intraStateSupplies
            });
        });

        return data;
    };



    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Row>
                        <Col xs={12}>
                            <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                                <h4 className="mb-sm-0">GSTR-3B Report</h4>
                            </div>
                        </Col>
                    </Row>

                    {/* All FILTERS */}

                    <Card>
                        <CardBody>
                            <Row>
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

                                <Col lg={8}></Col>
                            </Row>



                            <Row className='mt-2'>

                                <Col lg={8}>

                                </Col>
                                <Col lg={4} className="d-flex justify-content-end gap-2 text-end">

                                    <Button
                                        color="soft-secondary"
                                    //   onClick={handleClear}
                                    >
                                        Clear
                                    </Button>

                                    <Button
                                        color="primary"
                                        onClick={fetchReport}
                                    //  disabled={loading}
                                    >Generate
                                        {/* {loading ? <Spinner size="sm" /> : "Generate"} */}
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            GSTR3BExcelExport(section31, section32, section4, section5)
                                        }
                                    >
                                        Export Excel
                                    </Button>

                                </Col>

                            </Row>

                        </CardBody>
                    </Card>
                    <Card className='mx-auto' style={{ width: "80%" }}>
                        <CardBody>

                            {/* TABLE */}
                            {(section31.length > 0 || generated || loading) && (
                                <Row>
                                    <Col lg={12}>

                                        <div className="table-responsive">
                                            <table className="table table-bordered align-middle text-end table-sm mx-auto" style={{ width: "80%" }}>
                                                <thead style={{ background: 'lightgray' }}>
                                                    <tr>
                                                        <th colSpan="6" className="text-center">
                                                            3.1 Details of Outward Supplies and inward supplies liable to reverse charge
                                                        </th>
                                                    </tr>

                                                    <tr className="text-center">
                                                        <th >Nature Of Supplies</th>
                                                        <th>Total Taxable Value</th>
                                                        <th>Integrated Tax</th>
                                                        <th>Central Tax</th>
                                                        <th>State / UT Tax</th>
                                                        <th>Cess</th>
                                                    </tr>

                                                    <tr className='text-center'>
                                                        <th>1</th>
                                                        <th>2</th>
                                                        <th>3</th>
                                                        <th>4</th>
                                                        <th>5</th>
                                                        <th>6</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {loading ? (
                                                        <tr>
                                                            <td colSpan="6" className="text-center">
                                                                <Spinner size="sm" /> Loading...
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        section31.map((row, index) => (
                                                            <tr key={index}>
                                                                <td className="text-start">{row.section}</td>
                                                                <td>{Number(row.taxableAmt).toLocaleString()}</td>
                                                                <td>{Number(row.igstAmt).toLocaleString()}</td>
                                                                <td>{Number(row.cgstAmt).toLocaleString()}</td>
                                                                <td>{Number(row.sgstAmt).toLocaleString()}</td>
                                                                <td>{Number(row.cess).toLocaleString()}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                    </Col>
                                </Row>

                            )}

                            {(section32.length > 0 || generated || loading) && (

                                <table className="table table-bordered table-sm mx-auto" style={{ width: "80%" }}>
                                    <thead style={{ background: 'lightgray' }} className="text-center">
                                        <tr>
                                            <th colSpan="4" className="text-center">
                                                3.2 Details of Inter-State Supplies
                                            </th>
                                        </tr>

                                        <tr>
                                            <th></th>
                                            <th>Place Of Supply (State / UT)</th>
                                            <th>Total Taxable Value</th>
                                            <th>Amount Of Integrated Tax</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {section32.map((r, i) => (
                                            <tr key={i}>
                                                <td>{r.section}</td>
                                                <td></td>
                                                <td className='text-end'>{Number(r.taxableAmt).toLocaleString()}</td>
                                                <td className='txet-end'>{Number(r.igstAmt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>


                            )}
                            {(section4.length > 0 || generated || loading) && (

                                <table className="table table-bordered table-sm gst-table mx-auto" style={{ width: "80%" }}>

                                    <thead style={{ background: 'lightgray' }} className="text-center">
                                        <tr>
                                            <th colSpan="5">4 Eligible ITC</th>
                                        </tr>

                                        <tr>
                                            <th style={{ width: "58%" }}>Details</th>
                                            <th>Integrated Tax</th>
                                            <th>Central Tax</th>
                                            <th>State / UT Tax</th>
                                            <th>Cess</th>
                                        </tr>

                                    </thead>

                                    <tbody>
                                        {section4.map((r, i) => (
                                            <tr key={i}>
                                                <td style={{ whiteSpace: "pre" }}>
                                                    {r.section}
                                                </td>
                                                <td className="text-end">
                                                    {Number(r.igstAmt).toLocaleString()}
                                                </td>

                                                <td className="text-end">
                                                    {Number(r.cgstAmt).toLocaleString()}
                                                </td>

                                                <td className="text-end">
                                                    {Number(r.sgstAmt).toLocaleString()}
                                                </td>

                                                <td className="text-end">
                                                    {Number(r.cess).toLocaleString()}
                                                </td>

                                            </tr>
                                        ))}
                                    </tbody>

                                </table>


                            )}
                            {(section5.length > 0 || generated || loading) && (


                                <table className="table table-bordered table-sm mx-auto" >
                                    <thead style={{ background: 'lightgray' }} className='text-center'>
                                        <tr>
                                            <th colSpan="3" className="text-center">
                                                5 Values of exempt, nil-rated and non-GST inward supplies
                                            </th>
                                        </tr>

                                        <tr>
                                            <th>Nature Of Supplies</th>
                                            <th>Inter-State Supplies</th>
                                            <th>Intra-State Supplies</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {section5.map((r, i) => (
                                            <tr key={i}>
                                                <td>{r.section}</td>
                                                <td className='text-end'>{Number(r.interStateSupplies).toLocaleString()}</td>
                                                <td className='text-end'>{Number(r.intraStateSupplies).toLocaleString()}</td>

                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                            )
                            }
                        </CardBody>
                    </Card>
                </Container >
            </div >
        </React.Fragment >
    );
};

export default GSTR3BReport;