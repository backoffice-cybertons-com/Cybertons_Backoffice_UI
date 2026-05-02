// import React, { useState, useEffect, useMemo, useRef } from "react";
// import {
//   Card,
//   CardHeader,
//   CardBody,
//   Col,
//   Container,
//   Row,
//   Input,
//   Button,
//   Label,
//   Spinner,
//   Form,
// } from "reactstrap";
// import Select from "react-select";
// import Flatpickr from "react-flatpickr";
// import { APIClient } from "../../helpers/api_helper";
// import * as url from "../../helpers/url_helper";
// import GSTR3BExcelExport from "../../Components/Common/GSTR3BExcelExport";

// const api = new APIClient();

// const GSTR3BReport = () => {
//   // For Date
//   const fromRef = useRef(null);
//   const toRef = useRef(null);
//   const [fromDate, setFromDate] = useState("2026-01-01");
//   const [toDate, setToDate] = useState("2026-12-31");
//   // For Data From DB
//   const [section31, setSection31] = useState([]);
//   const [section32, setSection32] = useState([]);
//   const [section4, setSection4] = useState([]);
//   const [section5, setSection5] = useState([]);

//   const [loading, setLoading] = useState(false);
//   const [generated, setGenerated] = useState(false);
//   const [companyInfo, setCompanyInfo] = useState(null);

//   useEffect(() => {
//     const fetchCompanyProfile = async () => {
//       try {
//         const response = await api.get(url.GET_COMPANY_PROFILE, {
//           params: {
//             companyId: localStorage.getItem("companyId"),
//           },
//         });
//         const data = response?.data || response;
//         setCompanyInfo(data);
//         console.log("GSTR3BReport: Company Profile fetched:", data);
//       } catch (err) {
//         console.error("GSTR3BReport: Error fetching company profile:", err);
//       }
//     };
//     fetchCompanyProfile();
//   }, []);

//   const fetchReport = async () => {
//     setLoading(true);
//     try {
//       const whereClause = [];

//       if (fromDate && toDate)
//         whereClause.push(
//           `tsp.inv_date BETWEEN '${fromRef.current.value}' AND '${toRef.current.value}'`,
//         );

//       console.log(whereClause);
//       const section31 = await api.get(url.GET_GSTR3B, {
//         params: {
//           companyId: localStorage.getItem("companyId"),
//           where: whereClause,
//           Type: "3.1",
//         },
//       });

//       const section32 = await api.get(url.GET_GSTR3B, {
//         params: {
//           companyId: localStorage.getItem("companyId"),
//           where: whereClause,
//           Type: "3.2",
//         },
//       });

//       const section4 = await api.get(url.GET_GSTR3B, {
//         params: {
//           companyId: localStorage.getItem("companyId"),
//           where: whereClause,
//           Type: "4",
//         },
//       });

//       const section5 = await api.get(url.GET_GSTR3B, {
//         params: {
//           companyId: localStorage.getItem("companyId"),
//           where: whereClause,
//           Type: "5",
//         },
//       });
//       console.log(section31);
//       console.log(section32);
//       console.log(section4);
//       console.log(section5);

//       const raw1 = Array.isArray(section31) ? section31 : section31?.data || [];

//       const raw2 = Array.isArray(section32) ? section32 : section32?.data || [];

//       const raw3 = Array.isArray(section4) ? section4 : section4?.data || [];

//       const raw4 = Array.isArray(section5) ? section5 : section5?.data || [];

//       setSection31(raw1);
//       setSection32(raw2);
//       setSection4(raw3);
//       setSection5(raw4);

//       setGenerated(true);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const exportColumns = [
//     { label: "Section", key: "Section" },
//     { label: "Nature / Details", key: "Nature" },
//     { label: "Taxable Value", key: "TaxableValue" },
//     { label: "IGST", key: "IGST" },
//     { label: "CGST", key: "CGST" },
//     { label: "SGST", key: "SGST" },
//     { label: "Cess", key: "Cess" },
//     { label: "Inter-State", key: "InterState" },
//     { label: "Intra-State", key: "IntraState" },
//   ];

//   const fetchExportData = () => {
//     let data = [];

//     section31.forEach((r) => {
//       data.push({
//         Section: "3.1",
//         Nature: r.section,
//         TaxableValue: r.taxableAmt,
//         IGST: r.igstAmt,
//         CGST: r.cgstAmt,
//         SGST: r.sgstAmt,
//         Cess: r.cess,
//       });
//     });

//     section32.forEach((r) => {
//       data.push({
//         Section: "3.2",
//         Nature: r.section,
//         TaxableValue: r.taxableAmt,
//         IGST: r.igstAmt,
//       });
//     });

//     section4.forEach((r) => {
//       data.push({
//         Section: "4",
//         Nature: r.section,
//         IGST: r.igstAmt,
//         CGST: r.cgstAmt,
//         SGST: r.sgstAmt,
//         Cess: r.cess,
//       });
//     });

//     section5.forEach((r) => {
//       data.push({
//         Section: "5",
//         Nature: r.section,
//         InterState: r.interStateSupplies,
//         IntraState: r.intraStateSupplies,
//       });
//     });

//     return data;
//   };

//   // for multiple excel
//   const downloadExcel = async () => {
//     try {
//       const response = await api.get(url.EXPORT_GSTR1_EXCEL, {
//         companyId: localStorage.getItem("companyId"),
//         fromDate: fromRef.current.value,
//         toDate: toRef.current.value,
//         responseType: "blob",
//       });

//       // In this project, 'response' IS the blob because of the axios interceptor
//       const blob = response;

//       const downloadUrl = window.URL.createObjectURL(blob);

//       const a = document.createElement("a");
//       a.href = downloadUrl;
//       a.download = "GSTR-1.xlsx";
//       a.click();

//       window.URL.revokeObjectURL(downloadUrl);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return (
//     <React.Fragment>
//       <div className="page-content">
//         <Container fluid>
//           <Row>
//             <Col xs={12}>
//               <div className="page-title-box d-sm-flex align-items-center justify-content-between">
//                 <h4 className="mb-sm-0">GSTR-3B Report</h4>
//               </div>
//             </Col>
//           </Row>

//           {/* All FILTERS */}

//           <Card>
//             <CardBody>
//               <Row>
//                 <Col lg={2}>
//                   <div className="mb-3 mb-lg-0">
//                     <Label>From Date</Label>
//                     <Input
//                       type="date"
//                       defaultValue={fromDate}
//                       innerRef={fromRef}
//                     />
//                   </div>
//                 </Col>

//                 <Col lg={2}>
//                   <div className="mb-3 mb-lg-0">
//                     <Label>To Date</Label>

//                     <Input type="date" defaultValue={toDate} innerRef={toRef} />
//                   </div>
//                 </Col>

//                 <Col lg={8}></Col>
//               </Row>

//               <Row className="mt-2">
//                 <Col lg={8}></Col>
//                 <Col
//                   lg={4}
//                   className="d-flex justify-content-end gap-2 text-end"
//                 >
//                   <Button
//                     color="primary"
//                     onClick={fetchReport}
//                   //  disabled={loading}
//                   >
//                     Generate
//                     {/* {loading ? <Spinner size="sm" /> : "Generate"} */}
//                   </Button>
//                   <Button
//                     onClick={() => {
//                       console.log("Before export:", companyInfo); // add this
//                       GSTR3BExcelExport(
//                         section31,
//                         section32,
//                         section4,
//                         section5,
//                         companyInfo,
//                         fromRef.current.value,
//                         toRef.current.value,
//                       )
//                     }}
//                   >
//                     GSTR-3B Excel
//                   </Button>

//                   <Button color="success" onClick={downloadExcel}>
//                     GSTR-1 Excel
//                   </Button>
//                 </Col>
//               </Row>
//             </CardBody>
//           </Card>

//           {generated && (
//             <Card className="mx-auto" style={{ width: "80%" }}>
//               <CardBody>
//                 <Row className="mb-4">
//                   <Col lg={12} className="text-center">
//                     <h5 className="mb-2">
//                       GSTIN No : {companyInfo?.gstin || ""}
//                     </h5>
//                     <h5 className="mb-2">
//                       Legal Name Of Registered Person :{" "}
//                       {companyInfo?.companyName || ""}
//                     </h5>
//                     <h5 className="mb-0">
//                       GSTR-3B Of :{" "}
//                       {fromRef.current?.value
//                         ? new Date(fromRef.current.value).toLocaleDateString(
//                           "en-GB",
//                           { month: "long" },
//                         ) +
//                         "-" +
//                         new Date(fromRef.current.value).getFullYear()
//                         : ""}{" "}
//                       -{" "}
//                       {toRef.current?.value
//                         ? new Date(toRef.current.value).getFullYear()
//                         : ""}
//                     </h5>
//                   </Col>
//                 </Row>
//                 {/* TABLE */}
//                 {(section31.length > 0 || generated || loading) && (
//                   <Row>
//                     <Col lg={12}>
//                       <div className="table-responsive">
//                         <table
//                           className="table table-bordered align-middle text-end table-sm mx-auto"
//                           style={{ width: "98%" }}
//                         >
//                           <thead style={{ background: "lightgray" }}>
//                             <tr>
//                               <th colSpan="6" className="text-center">
//                                 3.1 Details of Outward Supplies and inward
//                                 supplies liable to reverse charge
//                               </th>
//                             </tr>

//                             <tr className="text-center">
//                               <th>Nature Of Supplies</th>
//                               <th>Total Taxable Value</th>
//                               <th>Integrated Tax</th>
//                               <th>Central Tax</th>
//                               <th>State / UT Tax</th>
//                               <th>Cess</th>
//                             </tr>

//                             <tr className="text-center">
//                               <th>1</th>
//                               <th>2</th>
//                               <th>3</th>
//                               <th>4</th>
//                               <th>5</th>
//                               <th>6</th>
//                             </tr>
//                           </thead>

//                           <tbody>
//                             {loading ? (
//                               <tr>
//                                 <td colSpan="6" className="text-center">
//                                   <Spinner size="sm" /> Loading...
//                                 </td>
//                               </tr>
//                             ) : (
//                               section31.map((row, index) => (
//                                 <tr key={index}>
//                                   <td className="text-start">{row.section}</td>
//                                   <td>
//                                     {Number(row.taxableAmt).toLocaleString()}
//                                   </td>
//                                   <td>
//                                     {Number(row.igstAmt).toLocaleString()}
//                                   </td>
//                                   <td>
//                                     {Number(row.cgstAmt).toLocaleString()}
//                                   </td>
//                                   <td>
//                                     {Number(row.sgstAmt).toLocaleString()}
//                                   </td>
//                                   <td>{Number(row.cess).toLocaleString()}</td>
//                                 </tr>
//                               ))
//                             )}
//                           </tbody>
//                         </table>
//                       </div>
//                     </Col>
//                   </Row>
//                 )}

//                 {(section32.length > 0 || generated || loading) && (
//                   <table
//                     className="table table-bordered table-sm mx-auto"
//                     style={{ width: "98%" }}
//                   >
//                     <thead
//                       style={{ background: "lightgray" }}
//                       className="text-center"
//                     >
//                       <tr>
//                         <th colSpan="4" className="text-center">
//                           3.2 Details of Inter-State Supplies
//                         </th>
//                       </tr>

//                       <tr>
//                         <th></th>
//                         <th>Place Of Supply (State / UT)</th>
//                         <th>Total Taxable Value</th>
//                         <th>Amount Of Integrated Tax</th>
//                       </tr>
//                     </thead>

//                     <tbody>
//                       {section32.map((r, i) => (
//                         <tr key={i}>
//                           <td>{r.section}</td>
//                           <td></td>
//                           <td className="text-end">
//                             {Number(r.taxableAmt).toLocaleString()}
//                           </td>
//                           <td className="txet-end">
//                             {Number(r.igstAmt).toLocaleString()}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 )}

//                 {(section4.length > 0 || generated || loading) && (
//                   <table
//                     className="table table-bordered table-sm gst-table mx-auto"
//                     style={{ width: "98%" }}
//                   >
//                     <thead
//                       style={{ background: "lightgray" }}
//                       className="text-center"
//                     >
//                       <tr>
//                         <th colSpan="5">4 Eligible ITC</th>
//                       </tr>

//                       <tr>
//                         <th style={{ width: "58%" }}>Details</th>
//                         <th>Integrated Tax</th>
//                         <th>Central Tax</th>
//                         <th>State / UT Tax</th>
//                         <th>Cess</th>
//                       </tr>
//                     </thead>

//                     <tbody>
//                       {section4.map((r, i) => (
//                         <tr key={i}>
//                           <td style={{ whiteSpace: "pre" }}>{r.section}</td>
//                           <td className="text-end">
//                             {Number(r.igstAmt).toLocaleString()}
//                           </td>

//                           <td className="text-end">
//                             {Number(r.cgstAmt).toLocaleString()}
//                           </td>

//                           <td className="text-end">
//                             {Number(r.sgstAmt).toLocaleString()}
//                           </td>

//                           <td className="text-end">
//                             {Number(r.cess).toLocaleString()}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 )}

//                 {(section5.length > 0 || generated || loading) && (
//                   <table
//                     className="table table-bordered table-sm mx-auto"
//                     style={{ width: "98%" }}
//                   >
//                     <thead
//                       style={{ background: "lightgray" }}
//                       className="text-center"
//                     >
//                       <tr>
//                         <th colSpan="3" className="text-center">
//                           5 Values of exempt, nil-rated and non-GST inward
//                           supplies
//                         </th>
//                       </tr>

//                       <tr>
//                         <th>Nature Of Supplies</th>
//                         <th>Inter-State Supplies</th>
//                         <th>Intra-State Supplies</th>
//                       </tr>
//                     </thead>

//                     <tbody>
//                       {section5.map((r, i) => (
//                         <tr key={i}>
//                           <td>{r.section}</td>
//                           <td className="text-end">
//                             {Number(r.interStateSupplies).toLocaleString()}
//                           </td>
//                           <td className="text-end">
//                             {Number(r.intraStateSupplies).toLocaleString()}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 )}
//               </CardBody>
//             </Card>
//           )}
//         </Container>
//       </div>
//     </React.Fragment>
//   );
// };

// export default GSTR3BReport;
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Col,
  Container,
  Row,
  Input,
  Button,
  Label,
  Spinner,
  Form,
} from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import GSTR3BExcelExport from "../../Components/Common/GSTR3BExcelExport";

const api = new APIClient();

const GSTR3BReport = () => {
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");
  const [section31, setSection31] = useState([]);
  const [section32, setSection32] = useState([]);
  const [section4, setSection4] = useState([]);
  const [section5, setSection5] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);

  const formatCurrency = (val) => {
    const n = parseFloat(val);
    const value = isNaN(n) ? 0 : n;
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const response = await api.get(url.GET_COMPANY_PROFILE, {
          params: { companyId: localStorage.getItem("companyId") },
        });
        const data = response?.data || response;
        setCompanyInfo(data);
      } catch (err) {
        console.error("GSTR3BReport: Error fetching company profile:", err);
      }
    };
    fetchCompanyProfile();
  }, []);

  // Core fetch logic — returns the 4 sections directly so callers can use the data immediately
  const fetchSections = async () => {
    const conditions = [];
    if (fromDate && toDate)
      conditions.push(
        `tsp.inv_date BETWEEN '${fromDate}' AND '${toDate}'`,
      );
    const where = conditions.length ? conditions.join(" AND ") : "1=1";
    console.log(where);
    const companyId = localStorage.getItem("companyId");

    const [res1, res2, res3, res4] = await Promise.all([
      api.get(url.GET_GSTR3B, { params: { companyId, where, Type: "3.1" } }),
      api.get(url.GET_GSTR3B, { params: { companyId, where, Type: "3.2" } }),
      api.get(url.GET_GSTR3B, { params: { companyId, where, Type: "4" } }),
      api.get(url.GET_GSTR3B, { params: { companyId, where, Type: "5" } }),
    ]);

    const raw1 = Array.isArray(res1) ? res1 : res1?.data || [];
    const raw2 = Array.isArray(res2) ? res2 : res2?.data || [];
    const raw3 = Array.isArray(res3) ? res3 : res3?.data || [];
    const raw4 = Array.isArray(res4) ? res4 : res4?.data || [];

    return { raw1, raw2, raw3, raw4 };
  };

  const totals31 = useMemo(() => {
    return section31.reduce(
      (acc, curr) => ({
        taxableAmt: acc.taxableAmt + (Number(curr.taxableAmt) || 0),
        igstAmt: acc.igstAmt + (Number(curr.igstAmt) || 0),
        cgstAmt: acc.cgstAmt + (Number(curr.cgstAmt) || 0),
        sgstAmt: acc.sgstAmt + (Number(curr.sgstAmt) || 0),
        cess: acc.cess + (Number(curr.cess) || 0),
      }),
      { taxableAmt: 0, igstAmt: 0, cgstAmt: 0, sgstAmt: 0, cess: 0 },
    );
  }, [section31]);

  const totals32 = useMemo(() => {
    return section32.reduce(
      (acc, curr) => ({
        taxableAmt: acc.taxableAmt + (Number(curr.taxableAmt) || 0),
        igstAmt: acc.igstAmt + (Number(curr.igstAmt) || 0),
      }),
      { taxableAmt: 0, igstAmt: 0 },
    );
  }, [section32]);

  const totals4 = useMemo(() => {
    return section4.reduce(
      (acc, curr) => {
        const isMinus =
          curr.section?.toLowerCase().includes("(b) itc reversed") ||
          curr.section?.toLowerCase().includes("4.b");
        const multiplier = isMinus ? -1 : 1;
        return {
          igstAmt: acc.igstAmt + (Number(curr.igstAmt) * multiplier || 0),
          cgstAmt: acc.cgstAmt + (Number(curr.cgstAmt) * multiplier || 0),
          sgstAmt: acc.sgstAmt + (Number(curr.sgstAmt) * multiplier || 0),
          cess: acc.cess + (Number(curr.cess) * multiplier || 0),
        };
      },
      { igstAmt: 0, cgstAmt: 0, sgstAmt: 0, cess: 0 },
    );
  }, [section4]);

  const totals5 = useMemo(() => {
    return section5.reduce(
      (acc, curr) => ({
        interStateSupplies:
          acc.interStateSupplies + (Number(curr.interStateSupplies) || 0),
        intraStateSupplies:
          acc.intraStateSupplies + (Number(curr.intraStateSupplies) || 0),
      }),
      { interStateSupplies: 0, intraStateSupplies: 0 },
    );
  }, [section5]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { raw1, raw2, raw3, raw4 } = await fetchSections();
      setSection31(raw1);
      setSection32(raw2);
      setSection4(raw3);
      setSection5(raw4);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelExport = async () => {
    setLoading(true);
    try {
      const { raw1, raw2, raw3, raw4 } = await fetchSections();
      setSection31(raw1);
      setSection32(raw2);
      setSection4(raw3);
      setSection5(raw4);
      setGenerated(true);

      GSTR3BExcelExport(
        raw1,
        raw2,
        raw3,
        raw4,
        companyInfo,
        fromDate,
        toDate,
      );
    } catch (err) {
      console.error("Excel export error:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      const response = await api.get(url.EXPORT_GSTR1_EXCEL, {
        companyId: localStorage.getItem("companyId"),
        fromDate: fromDate,
        toDate: toDate,
        responseType: "blob",
      });
      const blob = response;
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "GSTR-1.xlsx";
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
    }
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

          <Card>
            <CardBody>
              <Row>
                <Col lg={2}>
                  <div className="mb-3 mb-lg-0">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                </Col>
                <Col lg={2}>
                  <div className="mb-3 mb-lg-0">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                </Col>
                <Col lg={8}></Col>
              </Row>

              <Row className="mt-2">
                <Col lg={8}></Col>
                <Col
                  lg={4}
                  className="d-flex justify-content-end gap-2 text-end"
                >
                  <Button
                    color="primary"
                    onClick={fetchReport}
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : "Generate"}
                  </Button>

                  <Button onClick={handleExcelExport} disabled={loading}>
                    {loading ? <Spinner size="sm" /> : "GSTR-3B Excel"}
                  </Button>

                  <Button color="success" onClick={downloadExcel}>
                    GSTR-1 Excel
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {generated && (
            <Card className="mx-auto" style={{ width: "80%" }}>
              <CardBody>
                <Row className="mb-4">
                  <Col lg={12} className="text-center">
                    <h5 className="mb-2">
                      GSTIN No : {companyInfo?.gstin || ""}
                    </h5>
                    <h5 className="mb-2">
                      Legal Name Of Registered Person :{" "}
                      {companyInfo?.companyName || ""}
                    </h5>
                    <h5 className="mb-0">
                      GSTR-3B Of :{" "}
                      {(() => {
                        if (!fromDate || !toDate) return "";
                        const [yF, mF, dF] = fromDate.split("-");
                        const [yT, mT, dT] = toDate.split("-");
                        const f = new Date(yF, mF - 1, dF);
                        const t = new Date(yT, mT - 1, dT);
                        const month = f.toLocaleDateString("en-GB", { month: "long" });
                        return `${month}-${f.getFullYear()} - ${t.getFullYear()}`;
                      })()}
                    </h5>
                  </Col>
                </Row>

                {(section31.length > 0 || generated || loading) && (
                  <Row>
                    <Col lg={12}>
                      <div className="table-responsive">
                        <table
                          className="table table-bordered align-middle text-end table-sm mx-auto"
                          style={{ width: "98%" }}
                        >
                          <thead style={{ background: "lightgray" }}>
                            <tr>
                              <th colSpan="6" className="text-center">
                                3.1 Details of Outward Supplies and inward
                                supplies liable to reverse charge
                              </th>
                            </tr>
                            <tr className="text-center">
                              <th>Nature Of Supplies</th>
                              <th>Total Taxable Value</th>
                              <th>Integrated Tax</th>
                              <th>Central Tax</th>
                              <th>State / UT Tax</th>
                              <th>Cess</th>
                            </tr>
                            <tr className="text-center">
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
                                  <td className="text-start" style={{ whiteSpace: "pre" }}>{row.section}</td>
                                  <td>{formatCurrency(row.taxableAmt)}</td>
                                  <td>{formatCurrency(row.igstAmt)}</td>
                                  <td>{formatCurrency(row.cgstAmt)}</td>
                                  <td>{formatCurrency(row.sgstAmt)}</td>
                                  <td>{formatCurrency(row.cess)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          <tfoot
                            style={{
                              background: "lightgray",
                              fontWeight: "bold",
                            }}
                          >
                            <tr>
                              <td className="text-start">
                                <div className="d-flex justify-content-between">
                                  <span>Total</span>
                                  <span>{section31.length}</span>
                                </div>
                              </td>
                              <td>{formatCurrency(totals31.taxableAmt)}</td>
                              <td>{formatCurrency(totals31.igstAmt)}</td>
                              <td>{formatCurrency(totals31.cgstAmt)}</td>
                              <td>{formatCurrency(totals31.sgstAmt)}</td>
                              <td>{formatCurrency(totals31.cess)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </Col>
                  </Row>
                )}

                {(section32.length > 0 || generated || loading) && (
                  <table
                    className="table table-bordered table-sm mx-auto"
                    style={{ width: "98%" }}
                  >
                    <thead
                      style={{ background: "lightgray" }}
                      className="text-center"
                    >
                      <tr>
                        <th colSpan="4" className="text-center">
                          3.2 Of The Supplies Shown In 3.1 (a) Above, Details Of
                          Inter-State Supplies Made To Unregistered
                          Persons,Composition Taxable Persons And UIN Holders
                        </th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>Place Of Supply (State / UT)</th>
                        <th>Total Taxable Value</th>
                        <th>Amount Of Integrated Tax</th>
                      </tr>
                      <tr className="text-center">
                        <th>1</th>
                        <th>2</th>
                        <th>3</th>
                        <th>4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section32.map((r, i) => (
                        <tr key={i}>
                          <td>{r.section}</td>
                          <td></td>
                          <td className="text-end">
                            {formatCurrency(r.taxableAmt)}
                          </td>
                          <td className="text-end">
                            {formatCurrency(r.igstAmt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot
                      style={{ background: "lightgray", fontWeight: "bold" }}
                    >
                      <tr>
                        <td className="text-start">
                          <div className="d-flex justify-content-between">
                            <span>Total</span>
                            <span>{section32.length}</span>
                          </div>
                        </td>
                        <td></td>
                        <td className="text-end">
                          {formatCurrency(totals32.taxableAmt)}
                        </td>
                        <td className="text-end">
                          {formatCurrency(totals32.igstAmt)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {(section4.length > 0 || generated || loading) && (
                  <table
                    className="table table-bordered table-sm gst-table mx-auto"
                    style={{ width: "98%" }}
                  >
                    <thead
                      style={{ background: "lightgray" }}
                      className="text-center"
                    >
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
                      <tr className="text-center">
                        <th>1</th>
                        <th>2</th>
                        <th>3</th>
                        <th>4</th>
                        <th>5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section4.map((r, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: "pre" }}>{r.section}</td>
                          <td className="text-end">
                            {formatCurrency(r.igstAmt)}
                          </td>
                          <td className="text-end">
                            {formatCurrency(r.cgstAmt)}
                          </td>
                          <td className="text-end">
                            {formatCurrency(r.sgstAmt)}
                          </td>
                          <td className="text-end">
                            {formatCurrency(r.cess)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* <tfoot
                      style={{ background: "lightgray", fontWeight: "bold" }}
                    >
                      <tr>
                        <td className="text-start">
                          <div className="d-flex justify-content-between">
                            <span>Total</span>
                            <span>{section4.length}</span>
                          </div>
                        </td>
                        <td className="text-end">
                          {formatCurrency(totals4.igstAmt)}
                        </td>
                        <td className="text-end">
                          {formatCurrency(totals4.cgstAmt)}
                        </td>
                        <td className="text-end">
                          {formatCurrency(totals4.sgstAmt)}
                        </td>
                        <td className="text-end">
                          {formatCurrency(totals4.cess)}
                        </td>
                      </tr>
                    </tfoot> */}
                  </table>
                )}

                {(section5.length > 0 || generated || loading) && (
                  <table
                    className="table table-bordered table-sm mx-auto"
                    style={{ width: "98%" }}
                  >
                    <thead
                      style={{ background: "lightgray" }}
                      className="text-center"
                    >
                      <tr>
                        <th colSpan="3" className="text-center">
                          5 Values of exempt, nil-rated and non-GST inward
                          supplies
                        </th>
                      </tr>
                      <tr>
                        <th>Nature Of Supplies</th>
                        <th>Inter-State Supplies</th>
                        <th>Intra-State Supplies</th>
                      </tr>
                      <tr className="text-center">
                        <th>1</th>
                        <th>2</th>
                        <th>3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section5.map((r, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: "pre" }}>{r.section}</td>
                          <td className="text-end">
                            {formatCurrency(r.interStateSupplies)}
                          </td>
                          <td className="text-end">
                            {formatCurrency(r.intraStateSupplies)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot
                      style={{ background: "lightgray", fontWeight: "bold" }}
                    >
                      <tr>
                        <td className="text-start">
                          <div className="d-flex justify-content-between">
                            <span>Total</span>
                            <span>{section5.length}</span>
                          </div>
                        </td>
                        <td className="text-end">
                          {formatCurrency(totals5.interStateSupplies)}
                        </td>
                        <td className="text-end">
                          {formatCurrency(totals5.intraStateSupplies)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardBody>
            </Card>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default GSTR3BReport;
