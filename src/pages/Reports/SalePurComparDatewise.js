import React, { useState, useMemo, useRef } from "react";
import {
    Card, CardHeader, CardBody, Row, Col,
    Button, Label, Container, Spinner, Input, ButtonGroup
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import Select from "react-select";

import CommonTable from "../../Components/Common/CommonTable";
import ExportButton from "../../Components/Common/ExportButton";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";

const api = new APIClient();

const formatDateForApi = (d) => {
    if (!d) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatDateExcel = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const columns = [
    {
        key: "pInvDate",
        label: "Date",
        cell: (r) => formatDate(r.pInvDate),
        totalType: "none",
        align: "center",
        sortType: "date",
        group: "Purchase",
    },

    {
        key: "purQty",
        label: "Qty",
        group: "Purchase",
        align: "right",
        sortType: "number"
    },
    {
        key: "purAvgPrice",
        label: "Avg Price",
        group: "Purchase",
        align: "right",
        sortType: "number",
        totalFn: (t) => t.purQty > 0
            ? t.purAmount / t.purQty
            : 0
    },
    {
        key: "purAmount",
        label: "Amount",
        group: "Purchase",
        align: "right",
        sortType: "number"
    },
    {
        key: "purTax",
        label: "Tax Amount",
        group: "Purchase",
        align: "right",
        sortType: "number"
    },
    {
        key: "purExpDisRound",
        label: "Exp/Dis/Round",
        group: "Purchase",
        align: "right",
        sortType: "number"
    },
    {
        key: "purFinal",
        label: "Final Amount",
        group: "Purchase",
        align: "right",
        sortType: "number",
        cellClassName: "bg-warning-subtle"
    },
    /* Sale Group */
    {
        key: "sInvDate",
        label: "Date",
        align: "center",
        cell: (r) => formatDate(r.sInvDate),
        totalType: "none",
        sortType: "date",
        group: "Sale",
    },
    {
        key: "saleQty",
        label: "Qty",
        group: "Sale",
        align: "right",
        sortType: "number"
    },
    {
        key: "saleAvgPrice",
        label: "Avg Price",
        group: "Sale",
        align: "right",
        sortType: "number",
        totalFn: (t) => t.saleQty > 0
            ? t.saleAmount / t.saleQty
            : 0
    },
    {
        key: "saleAmount",
        label: "Amount",
        group: "Sale",
        align: "right",
        sortType: "number"
    },
    {
        key: "saleTax",
        label: "Tax Amount",
        group: "Sale",
        align: "right",
        sortType: "number"
    },
    {
        key: "saleExpDisRound",
        label: "Exp/Dis/Round",
        group: "Sale",
        align: "right",
        sortType: "number"
    },
    {
        key: "saleFinal",
        label: "Final Amount",
        group: "Sale",
        align: "right",
        sortType: "number",
        cellClassName: "bg-warning-subtle"
    },

    /* Profit */
    {
        key: "pl",
        label: "P/L",
        align: "right",
        sortType: "number",
        group: "Sale"
    }
];

export default function SalePurComparDatewise() {

    const [dateRange, setDateRange] = useState(() => {

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return [firstDay, lastDay];
    });
    const [selectedParty, setSelectedParty] = useState(null);
    const [partys, setPartys] = useState([]);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);


    const [selectedProduct, setSelectedProduct] = useState(null);
    const [products, setProducts] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");

    const [generated, setGenerated] = useState(false);

    // Lifted Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [totalEntries, setTotalEntries] = useState(0);
    const [compareMode, setCompareMode] = useState("sameDate");



    const fromRef = useRef(null);
    const toRef = useRef(null);

    const [fromDate, setFromDate] = useState("2026-01-01");
    const [toDate, setToDate] = useState("2026-12-31");

    React.useEffect(() => {
        loadParties();
        loadProducts();
    }, []);

    const loadParties = async () => {
        let res = await api.get(url.GET_PARTIES);

        let list = Array.isArray(res) ? res : (res?.data || []);

        setPartys(
            list.map(x => ({
                value: x.displayName || x.DisplayName,
                label: x.displayName || x.DisplayName
            }))
        );
    };
    const loadProducts = async () => {
        let res = await api.get(url.GET_PRODUCTS_DETAILS);

        let list = Array.isArray(res) ? res : (res?.data || []);

        setProducts(
            list.map(x => ({
                value: x.name || x.Name,
                label: x.name || x.Name
            }))
        );
    };


    const handleClear = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateRange([firstDay, lastDay]);
        setSelectedParty(null);
        setTotalEntries(0);
        setCurrentPage(1);
        setSelectedProduct(null);
        setInvoiceNo("");
        setData([]);
        setGenerated(false);
    };

    const exportColumns = useMemo(() => [

        // Purchase
        { accessor: (r) => formatDateExcel(r.pInvDate), label: "Pur Date" },
        { accessor: "purQty", label: "Purchase Qty" },
        { accessor: "purAvgPrice", label: "Purchase Avg Price" },
        { accessor: "purAmount", label: "Purchase Amount" },
        { accessor: "purTax", label: "Purchase Tax Amount" },
        { accessor: "purExpDisRound", label: "Purchase Exp/Dis/Round Off" },
        { accessor: "purFinal", label: "Purchase Final Amount" },

        // Sale
        { accessor: (r) => formatDateExcel(r.sInvDate), label: "Sale Date" },
        { accessor: "saleQty", label: "Sale Qty" },
        { accessor: "saleAvgPrice", label: "Sale Avg Price" },
        { accessor: "saleAmount", label: "Sale Amount" },
        { accessor: "saleTax", label: "Sale Tax Amount" },
        { accessor: "saleExpDisRound", label: "Sale Exp/Dis/Round Off" },
        { accessor: "saleFinal", label: "Sale Final Amount" },

        // Profit
        { accessor: "pl", label: "Profit / Loss" }

    ], []);

    const fetchExportData = async () => {
        return data || [];
    };
    const fetchReport = async () => {

        setLoading(true);

        try {

            const fromDate = dateRange?.[0]
                ? formatDateForApi(dateRange[0])
                : null;

            const toDate = dateRange?.[1]
                ? formatDateForApi(dateRange[1])
                : fromDate;

            const escapeSql = (s) => s?.replace(/'/g, "''");

            const conditions = [];

            if (fromDate && toDate)
                conditions.push(
                    `inv_date BETWEEN '${fromRef.current.value}' AND '${toRef.current.value}'`
                );

            if (selectedParty?.value)
                conditions.push(
                    `display_name='${escapeSql(selectedParty.value)}'`
                );
            if (selectedProduct?.value)
                conditions.push(
                    `product_name ='${escapeSql(selectedProduct.value)}'`
                );

            if (invoiceNo)
                conditions.push(
                    `tsp.inv_no='${escapeSql(invoiceNo)}'`
                );

            /* only two params */
            const whereClause =
                conditions.length
                    ? conditions.join(" AND ")
                    : "1=1";
            console.log(whereClause);
            const response = await api.get(
                url.GET_SALE_PUR_COMPAR_DATEWISE,
                {
                    params: {
                        companyId: localStorage.getItem("companyId"),
                        where: whereClause,
                        compareMode: compareMode
                    }
                }
            );
            console.log(response);

            const raw = Array.isArray(response)
                ? response
                : (response?.data || []);


            setData(
                raw.map(r => ({
                    pInvDate: r.pInvDate,
                    sInvDate: r.sInvDate,

                    purQty: r.purQty || 0,
                    purAvgPrice: r.purAvgPrice || 0,
                    purAmount: r.purAmount || 0,
                    purTax: r.purTax || 0,
                    purExpDisRound: r.purExpDisRound || 0,
                    purFinal: r.purFinal || 0,
                    //purFinal: (r.purAmount || 0) + (r.purTax || 0),


                    saleQty: r.saleQty || 0,
                    saleAvgPrice: r.saleAvgPrice || 0,
                    saleAmount: r.saleAmount || 0,
                    saleTax: r.saleTax || 0,
                    saleExpDisRound: r.saleExpDisRound || 0,
                    saleFinal: r.saleFinal || 0,
                    // saleFinal: (r.saleAmount || 0) + (r.saleTax || 0),


                    pl: r.pl || 0,


                }))
            );
            setGenerated(true);
            setCurrentPage(1);
            setTotalEntries(raw.length);
        }
        finally {
            setLoading(false);
        }

    };
    const paginatedData = useMemo(() => {

        if (rowsPerPage === "all") {
            return data;
        }

        const start = (currentPage - 1) * Number(rowsPerPage);

        return data.slice(
            start,
            start + Number(rowsPerPage)
        );

    }, [data, currentPage, rowsPerPage]);

    document.title = "DateWise Comparative Report | SoftBook";
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Row>
                        <Col xs={12}>
                            <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                                <h4 className="mb-sm-0">Datewise Comparative Report</h4>
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col lg={12}>
                            <Card>

                                <CardBody>

                                    <Row className="g-3">

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

                                        <Col md={2}>
                                            <Label>Customer</Label>
                                            <Select
                                                value={selectedParty}
                                                onChange={setSelectedParty}
                                                options={partys}
                                                isClearable
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                                styles={{
                                                    menuPortal: base => ({ ...base, zIndex: 999999 }),
                                                    menu: base => ({ ...base, zIndex: 999999 })
                                                }}
                                            />
                                        </Col>

                                        <Col md={2}>
                                            <Label>Product</Label>
                                            <Select
                                                value={selectedProduct}
                                                onChange={setSelectedProduct}
                                                options={products}
                                                isClearable
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                                styles={{
                                                    menuPortal: base => ({ ...base, zIndex: 999999 }),
                                                    menu: base => ({ ...base, zIndex: 999999 })
                                                }}
                                            />
                                        </Col>

                                        <Col md={2}>
                                            <Label>Invoice No</Label>
                                            <input
                                                className="form-control"
                                                value={invoiceNo}
                                                onChange={(e) => setInvoiceNo(e.target.value)}
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <Label>Compare Mode</Label>

                                            <Input
                                                type="select"
                                                value={compareMode}
                                                onChange={(e) => setCompareMode(e.target.value)}
                                            >
                                                <option value="sameDate">
                                                    Same Date Compare
                                                </option>

                                                <option value="sequential">
                                                    Sequential Compare
                                                </option>
                                            </Input>
                                        </Col>

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
                                                onClick={fetchReport}
                                                disabled={loading}
                                            >
                                                {loading ? <Spinner size="sm" /> : "Generate"}
                                            </Button>

                                            <ExportButton
                                                data={fetchExportData}
                                                columns={exportColumns}
                                                fileName={"DateWise Comparison"}
                                                iconOnly

                                            />

                                        </Col>

                                    </Row>

                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    {(data.length > 0 || loading || generated) && (
                        <Row>
                            <Col lg={12}>
                                <Card>
                                    <CardBody>

                                        <CommonTable
                                            columns={columns}
                                            data={paginatedData}
                                            showTotals
                                            minWidth="1800px"
                                        />

                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}
                </Container>
            </div>
        </React.Fragment>
    );

}