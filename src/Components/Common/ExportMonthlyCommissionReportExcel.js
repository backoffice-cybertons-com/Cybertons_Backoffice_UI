import React, { useState } from "react";
import { Button, Spinner } from "reactstrap";

const COLOR = {
  headerBg: "FF465E80",
  white: "FFFFFFFF",
  altRow: "FFFAFBFD",
  totalRow: "FFEEF2F7",
  borderColor: "FFD6DEEB",
  headerText: "FFFFFFFF",
  bodyText: "FF1F2937",
  totalText: "FF1E3A6E",
};

const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const font = (opts) => ({ name: "Arial", size: 10, ...opts });
const align = (h, v = "middle") => ({ horizontal: h, vertical: v });
const border = () => ({
  top: { style: "thin", color: { argb: COLOR.borderColor } },
  bottom: { style: "thin", color: { argb: COLOR.borderColor } },
  left: { style: "thin", color: { argb: COLOR.borderColor } },
  right: { style: "thin", color: { argb: COLOR.borderColor } },
});

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

let excelJSPromise = null;
const loadExcelJS = () => {
  if (excelJSPromise) return excelJSPromise;
  excelJSPromise = new Promise((resolve, reject) => {
    if (window.ExcelJS) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return excelJSPromise;
};

const buildWorkbook = (rawData, dateStr, companyInfo, isAllParties, groupBy = "date") => {
  const ExcelJS = window.ExcelJS;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SoftBook";
  wb.created = new Date();

  const data = (rawData || []).filter((r) => {
    if (r?._style) return false;
    const label = String(r?.dateOrParty ?? r?.srNo ?? "").toLowerCase();
    return !label.includes("total");
  });

  const hasInvoice = groupBy === "invoice" || groupBy === "item";
  const hasItem = groupBy === "item";

  const ws = wb.addWorksheet("Monthly Commission", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 3 }],
  });

  // Dynamic columns
  const cols = [
    { width: 20 }, // dateOrParty
  ];
  if (hasInvoice) cols.push({ width: 14 }); // invNo
  if (hasItem) cols.push({ width: 24 }); // productName
  
  cols.push(
    { width: 14 }, // crateOrdered
    { width: 14 }, // totalMrpOrderAmount
    { width: 14 }, // avgMrp
    { width: 16 }, // sevenDaysAvgOrder
    { width: 14 }, // avgDepoPrice
    { width: 14 }, // avgDistAmount
    { width: 14 }, // totComm
    { width: 16 }, // avgCommPerCrate
    { width: 14 }, // osAsOn
    { width: 14 }, // payment
    { width: 14 }, // avgTerm
    { width: 16 }, // adjustCommission
    { width: 14 }, // netCommission
    { width: 14 }  // commAmount
  );
  ws.columns = cols;
  
  const totalCols = cols.length;

  const titleRow = ws.addRow([`Monthly Commission Report - ${dateStr || ""}`]);
  titleRow.height = 24;
  titleRow.getCell(1).font = font({ bold: true, size: 14 });
  titleRow.getCell(1).alignment = align("center");
  ws.mergeCells(1, 1, 1, totalCols);

  const compRow = ws.addRow([companyInfo?.companyName || "SoftBook"]);
  compRow.height = 20;
  compRow.getCell(1).font = font({ bold: true, size: 11 });
  compRow.getCell(1).alignment = align("center");
  ws.mergeCells(2, 1, 2, totalCols);

  const headers = [
    isAllParties ? "Party" : "Date",
  ];
  if (hasInvoice) headers.push("Invoice No");
  if (hasItem) headers.push("Product Name");
  
  headers.push(
    "Crate Ordered",
    "Order MRP Amt",
    "Avg MRP",
    "7 Days Avg Order",
    "Avg Depo Price",
    "Total Depo Amt",
    "Total Comm",
    "Avg Comm / Crate",
    "OS As On",
    "Payment",
    "Avg Term",
    "Adjust Comm",
    "Net Comm",
    "Comm Amount"
  );

  const hdr = ws.addRow(headers);
  hdr.height = 18;
  hdr.eachCell((cell, colNum) => {
    cell.fill = fill(COLOR.headerBg);
    cell.font = font({
      bold: true,
      color: { argb: COLOR.headerText },
    });
    cell.alignment = align(colNum === 1 ? "left" : "right");
    cell.border = border();
  });

  let t_crate = 0, t_mrp = 0, t_dist = 0, t_totComm = 0, t_pay = 0, t_comm = 0;

  data.forEach((record, idx) => {
    t_crate += safeNum(record.crateOrdered);
    t_mrp += safeNum(record.totalMrpOrderAmount);
    t_dist += safeNum(record.avgDistAmount);
    t_totComm += safeNum(record.totComm);
    t_pay += safeNum(record.payment);
    t_comm += safeNum(record.commAmount);

    const rowData = [record.dateOrParty || ""];
    if (hasInvoice) rowData.push(record.invNo || "");
    if (hasItem) rowData.push(record.productName || "");
    
    rowData.push(
      safeNum(record.crateOrdered),
      safeNum(record.totalMrpOrderAmount),
      safeNum(record.avgMrp),
      safeNum(record.sevenDaysAvgOrder),
      safeNum(record.avgDepoPrice),
      safeNum(record.avgDistAmount),
      safeNum(record.totComm),
      safeNum(record.avgCommPerCrate),
      safeNum(record.osAsOn),
      safeNum(record.payment),
      safeNum(record.avgTerm),
      safeNum(record.adjustCommission),
      safeNum(record.netCommission),
      safeNum(record.commAmount)
    );

    const row = ws.addRow(rowData);
    row.height = 16;

    const isAlt = idx % 2 === 1;
    row.eachCell((cell, colNum) => {
      cell.fill = isAlt ? fill(COLOR.altRow) : fill(COLOR.white);
      cell.font = font({ bold: true, color: { argb: COLOR.bodyText } });
      cell.alignment = align(colNum === 1 ? "left" : "right");
      cell.border = border();
      
      const numFmtStart = 2 + (hasInvoice ? 1 : 0) + (hasItem ? 1 : 0);
      if (colNum >= numFmtStart) cell.numFmt = "#,##0.00";
    });
  });

  const totalRowData = [`Total (${data.length} records)`];
  if (hasInvoice) totalRowData.push(null);
  if (hasItem) totalRowData.push(null);
  
  totalRowData.push(
    t_crate,
    t_mrp,
    null,
    null,
    null,
    t_dist,
    t_totComm,
    null,
    null,
    t_pay,
    null,
    null,
    null,
    t_comm
  );

  const totalRow = ws.addRow(totalRowData);
  totalRow.height = 18;
  
  totalRow.eachCell((cell, colNum) => {
    cell.fill = fill(COLOR.totalRow);
    cell.font = font({ bold: true, color: { argb: COLOR.totalText } });
    cell.alignment = align(colNum === 1 ? "left" : "right");
    cell.border = {
      ...border(),
      top: { style: "medium", color: { argb: "FF4A7AB5" } },
    };
    const numFmtStart = 2 + (hasInvoice ? 1 : 0) + (hasItem ? 1 : 0);
    if (colNum >= numFmtStart) cell.numFmt = "#,##0.00";
  });

  return wb;
};

const ExportMonthlyCommissionReportExcel = ({ data = [], date = "", companyInfo = null, isAllParties = false, groupBy = "date" }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    const rows = typeof data === "function" ? data() : data;
    if (!rows?.length) return;
    try {
      setLoading(true);
      await loadExcelJS();
      const wb = buildWorkbook(rows, date, companyInfo, isAllParties, groupBy);
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Monthly_Commission_${date || "report"}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Excel export error", err);
    } finally {
      setLoading(false);
    }
  };

  const resolvedCount = typeof data === "function" ? (data()?.length || 0) : (data?.length || 0);

  return (
    <Button
      color="success"
      size="sm"
      onClick={handleExport}
      disabled={loading || resolvedCount === 0}
      title="Export to Excel"
      style={{ minWidth: 36, padding: "4px 10px" }}
    >
      {loading ? <Spinner size="sm" /> : <i className="ri-file-excel-2-line" style={{ fontSize: 16 }} />}
    </Button>
  );
};

export default ExportMonthlyCommissionReportExcel;
