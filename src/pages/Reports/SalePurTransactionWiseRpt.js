import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Input,
  Button,
  Label,
  Table,
  Spinner,
} from "reactstrap";
import { useSelector } from "react-redux";
import { createSelector } from "reselect";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import HeaderForAllRpt from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";
import CommonTable from "../../Components/Common/CommonTable";
import "../../Components/Common/CommonTable.css";

/* ── helpers ───────────────────────────────────────────────── */
const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

/* ── column definitions ─────────────────────────────────────── */
const DEFAULT_COLUMNS = [
  { key: "invDate", label: "Date", width: "100px", align: "left", sortType: "date" },
  { key: "invNo", label: "Inv No", width: "120px", align: "left", sortType: "string" },
  { key: "partyName", label: "Party / Product", align: "left", sortType: "string" },
  { key: "qty", label: "Qty", width: "80px", align: "right", sortType: "number" },
  { key: "cogs", label: "COGS", width: "100px", align: "right", sortType: "number", totalFn: (t) => t.qty > 0 ? t.cogs / t.qty : 0 },
  {
    key: "rate",
    label: "Rate",
    width: "100px",
    align: "right",
    sortType: "number",
    totalFn: (t) => t.qty > 0 ? t.itemTaxableAmount / t.qty : 0
  },
  { key: "itemTaxableAmount", label: "Taxable", width: "110px", align: "right", sortType: "number" },
  { key: "itemIgstAmount", label: "IGST", width: "90px", align: "right", sortType: "number" },
  { key: "itemCgstAmount", label: "CGST", width: "90px", align: "right", sortType: "number" },
  { key: "itemSgstAmount", label: "SGST", width: "90px", align: "right", sortType: "number" },
  { key: "itemTaxAmount", label: "Tax", width: "90px", align: "right", sortType: "number" },
  { key: "itemTotalAmount", label: "Amount", width: "120px", align: "right", sortType: "number" },
];

const SalePurTransactionWiseRpt = ({
  forcedInvType,
  showFilters = true,
  globalFilters,
  refreshKey,
  currentPage,
  setCurrentPage,
  rowsPerPage,
  onTotalChange,
}) => {
  const api = new APIClient();
  const fromRef = useRef(null);
  const toRef = useRef(null);

  /* ── state ── */
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  const isSale = forcedInvType === "Sales";

  const columns = useMemo(() => {
    if (isSale) return DEFAULT_COLUMNS;
    return DEFAULT_COLUMNS.filter(col => col.key !== "cogs");
  }, [isSale]);

  /* ── dark mode ── */
  const selectLayoutState = (state) => state.Layout;
  const selectLayoutProperties = createSelector(selectLayoutState, (layout) => ({
    layoutModeType: layout.layoutModeType,
  }));
  const { layoutModeType } = useSelector(selectLayoutProperties);
  const isDarkMode = layoutModeType === "dark";

  /* ── fetch report ── */
  const fetchReport = async () => {
    const companyId = parseInt(localStorage.getItem("companyId"));
    if (!companyId) { setError("Company ID is required"); return; }

    setLoading(true);
    setError("");
    setGenerated(false);

    try {
      const activeFromDate = showFilters ? fromRef.current?.value : globalFilters?.fromDate;
      const activeToDate = showFilters ? toRef.current?.value : globalFilters?.toDate;
      const activeCustomer = showFilters ? "" : globalFilters?.selectedParty?.value || "";
      const activeProduct = showFilters ? "" : globalFilters?.selectedProduct?.value || "";
      const activeInvoice = showFilters ? "" : globalFilters?.invoiceNo || "";

      const escapeSql = (s) => (s ? s.replace(/'/g, "''") : "");
      const conditions = [];
      if (activeFromDate && activeToDate) conditions.push(`tsp.inv_date BETWEEN '${activeFromDate}' AND '${activeToDate}'`);
      if (activeCustomer) conditions.push(`pm.display_name = '${escapeSql(activeCustomer)}'`);
      if (activeProduct) conditions.push(`prod.product_name = '${escapeSql(activeProduct)}'`);
      if (activeInvoice) conditions.push(`tsp.inv_no = '${escapeSql(activeInvoice)}'`);

      const whereClause = conditions.length > 0 ? conditions.join(" AND ") : "1=1";
      const currentInvType = forcedInvType || "";

      const response = await api.get(url.GET_SALE_PURCHASE_REGISTER_TRANSACTIONWISE, {
        params: { companyId, invType: currentInvType || null, where: whereClause },
      });

      console.log(response);

      const rawResponse = Array.isArray(response) ? response : response?.data || [];

      // Filter out summary rows to prevent double counting in totals
      // Summary rows typically have no product name
      const raw = rawResponse.filter(item =>
        item.productName || item.ProductName || item.product_name || item.item_name || item.itemName
      );

      // Normalize raw data for CommonTable sorting/filtering
      const normalized = raw.map(item => ({
        ...item,
        invDate: item.invDate || item.InvDate || item.inv_date,
        invNo: item.invNo || item.InvNo || item.inv_no,
        partyName: `${(item.partyName || item.PartyName || item.customerName || item.customer_name || item.display_name || item.Party_Name || item.Party_name || "").trim()} ${(item.productName || item.ProductName || item.product_name || item.item_name || item.itemName || "").trim()}`.trim(),
        displayPartyName: (item.partyName || item.PartyName || item.customerName || item.customer_name || item.display_name || item.Party_Name || item.Party_name || "").trim(),
        qty: Number(item.qty || item.Qty || 0),
        cogs: Number(item.itemCogs || item.cogs || 0) * Number(item.qty || 0),
        unitCogs: Number(item.itemCogs || item.cogs || 0),
        rate: Number(item.avgPrice || item.AvgPrice || item.Rate || item.rate || 0),
        taxableAmount: Number(item.taxableAmount || item.TaxableAmount || 0),
        igstAmount: Number(item.igstAmount || item.IgstAmount || 0),
        cgstAmount: Number(item.cgstAmount || item.CgstAmount || 0),
        sgstAmount: Number(item.sgstAmount || item.SgstAmount || 0),
        taxAmount: Number(item.taxAmount || item.TaxAmount || 0),
        finalAmount: Number(item.finalAmount || item.FinalAmount || 0),
        productName: (item.productName || item.ProductName || item.product_name || item.item_name || item.itemName || "").trim(),
        itemTaxableAmount: Number(item.itemTaxableAmount || item.ItemTaxableAmount || item.item_taxable_amount || item.taxableAmount || item.TaxableAmount || 0),
        itemCogs: Number(item.itemCogs || item.ItemCogs || item.item_cogs || item.cogs || item.Cogs || item.COGS || item.costPrice || 0),
        itemIgstAmount: Number(item.itemIgstAmount || item.ItemIgstAmount || item.item_igst_amount || item.igstAmount || item.IgstAmount || 0),
        itemCgstAmount: Number(item.itemCgstAmount || item.ItemCgstAmount || item.item_cgst_amount || item.cgstAmount || item.CgstAmount || 0),
        itemSgstAmount: Number(item.itemSgstAmount || item.ItemSgstAmount || item.item_sgst_amount || item.sgstAmount || item.SgstAmount || 0),
        itemTaxAmount: Number(item.itemTaxAmount || item.ItemTaxAmount || item.item_tax_amount || item.taxAmount || item.TaxAmount || 0),
        itemTotalAmount: Number(item.itemTotalAmount || item.ItemTotalAmount || item.item_total_amount || item.totalAmount || item.TotalAmount || 0),
      }));

      setReportData(normalized);
      setGenerated(true);
      if (setCurrentPage) setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showFilters && refreshKey > 0) fetchReport();
  }, [refreshKey, showFilters]);

  /* ── grouping logic for customRowRender ── */
  const customRowRender = (sortedData) => {
    const groups = [];
    let currentGroup = null;

    sortedData.forEach((item) => {
      const invNo = item.invNo;
      if (!currentGroup || currentGroup.invNo !== invNo) {
        currentGroup = {
          invNo,
          invDate: item.invDate,
          partyName: item.displayPartyName,
          qty: 0,
          cogs: 0,
          taxableAmount: 0,
          igstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          taxAmount: 0,
          finalAmount: 0,
          items: [],
        };
        groups.push(currentGroup);
      }

      currentGroup.items.push(item);
      // Summing item values for the header row
      currentGroup.qty += item.qty;
      currentGroup.cogs += (item.itemCogs * item.qty); // Weighting cogs to get avg later
      currentGroup.taxableAmount += item.itemTaxableAmount;
      currentGroup.igstAmount += item.itemIgstAmount;
      currentGroup.cgstAmount += item.itemCgstAmount;
      currentGroup.sgstAmount += item.itemSgstAmount;
      currentGroup.taxAmount += item.itemTaxAmount;
      currentGroup.finalAmount += item.itemTotalAmount;
    });

    return groups.map((g, idx) => (
      <React.Fragment key={idx}>
        {/* Header Row */}
        <tr className="fw-bold" style={{ borderTop: "1px solid #ddd", backgroundColor: "#f8f9fa" }}>
          <td>{fmtDate(g.invDate)}</td>
          <td>{g.invNo}</td>
          <td>{g.partyName}</td>
          <td className="text-end">{g.qty}</td>
          {isSale && (
            <td className="text-end">
              {fmtMoney(g.qty ? g.cogs / g.qty : 0)}
            </td>
          )}

          <td className="text-end">
            {fmtMoney(g.qty ? g.taxableAmount / g.qty : 0)}
          </td>
          <td className="text-end">{fmtMoney(g.taxableAmount)}</td>
          <td className="text-end">{fmtMoney(g.igstAmount)}</td>
          <td className="text-end">{fmtMoney(g.cgstAmount)}</td>
          <td className="text-end">{fmtMoney(g.sgstAmount)}</td>
          <td className="text-end">{fmtMoney(g.taxAmount)}</td>
          <td className="text-end">{fmtMoney(g.finalAmount)}</td>
        </tr>
        {/* Item Rows */}
        {g.items.map((item, iIdx) => (
          <tr key={`${idx}-${iIdx}`}>
            <td></td>
            <td></td>
            <td className="ps-4 text-muted fs-11">{item.productName}</td>
            <td className="text-end text-muted fs-11">{item.qty}</td>
            {isSale && <td className="text-end text-muted fs-11">{fmtMoney(item.unitCogs)}</td>}
            <td
              className={`text-end fs-11 ${isSale && item.rate < item.unitCogs
                ? "text-danger fw-bold bg-danger-subtle"
                : "text-muted"
                }`}
            >
              {fmtMoney(item.rate)}
            </td>
            <td className="text-end text-muted fs-11">{fmtMoney(item.itemTaxableAmount)}</td>
            <td className="text-end text-muted fs-11">{fmtMoney(item.itemIgstAmount)}</td>
            <td className="text-end text-muted fs-11">{fmtMoney(item.itemCgstAmount)}</td>
            <td className="text-end text-muted fs-11">{fmtMoney(item.itemSgstAmount)}</td>
            <td className="text-end text-muted fs-11">{fmtMoney(item.itemTaxAmount)}</td>
            <td className="text-end text-muted fs-11">{fmtMoney(item.itemTotalAmount)}</td>
          </tr>
        ))}
      </React.Fragment>
    ));
  };

  /* ── render ── */
  return (
    <Card className="mt-3">
      <HeaderForAllRpt reportName="Transaction Wise Report" />
      <CardBody className="p-0">
        <CommonTable
          columns={columns}
          data={reportData}
          loading={loading}
          isDark={isDarkMode}
          maxHeight="calc(100vh - 350px)"
          minWidth="1300px"
          showTotals={true}
          customRowRender={customRowRender}
        />
      </CardBody>
      <FooterForAllRpt />
    </Card>
  );
};

export default SalePurTransactionWiseRpt;
