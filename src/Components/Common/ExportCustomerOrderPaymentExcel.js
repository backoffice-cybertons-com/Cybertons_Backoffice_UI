/**
 * Excel export for Customer Order Limit Report.
 * Term Days  (D) = IF(C=0,0,B/C)
 * Today Order(F) = IF(E>C,E,E+(E-C))
 */

import React, { useState } from "react";
import { Button, Spinner } from "reactstrap";

const COLOR = {
  headerBg: "FF465E80",
  termDaysHeader: "FFFFFF00",
  white: "FFFFFFFF",
  altRow: "FFFAFBFD",
  totalRow: "FFEEF2F7",
  borderColor: "FFD6DEEB",
  headerText: "FFFFFFFF",
  termDaysHeaderText: "FF1E3A6E",
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

const buildWorkbook = (rawData, dateStr, companyInfo) => {
  const ExcelJS = window.ExcelJS;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SoftBook";
  wb.created = new Date();

  // Drop any totals row already injected by CommonTable.getExportData()
  const data = (rawData || []).filter((r) => {
    if (r?._style) return false;
    const label = String(r?.customerName ?? r?.srNo ?? "").toLowerCase();
    return !label.includes("total");
  });

  const ws = wb.addWorksheet("Customer Order Limit", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 3 }],
  });

  ws.columns = [
    { width: 32 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
  ];

  const titleRow = ws.addRow([`Customer Order Limit Report - ${dateStr || ""}`]);
  titleRow.height = 24;
  titleRow.getCell(1).font = font({ bold: true, size: 14 });
  titleRow.getCell(1).alignment = align("center");
  ws.mergeCells(1, 1, 1, 6);

  const compRow = ws.addRow([companyInfo?.companyName || "SoftBook"]);
  compRow.height = 20;
  compRow.getCell(1).font = font({ bold: true, size: 11 });
  compRow.getCell(1).alignment = align("center");
  ws.mergeCells(2, 1, 2, 6);

  const hdr = ws.addRow([
    "Customer",
    "Yesterday OS",
    "Yesterday Order",
    "Term Days",
    "Today Payment",
    "Today Order",
  ]);
  hdr.height = 18;
  hdr.eachCell((cell, colNum) => {
    const isTermDays = colNum === 4;
    cell.fill = fill(isTermDays ? COLOR.termDaysHeader : COLOR.headerBg);
    cell.font = font({
      bold: true,
      color: { argb: isTermDays ? COLOR.termDaysHeaderText : COLOR.headerText },
    });
    cell.alignment = align(colNum === 1 ? "left" : "right");
    cell.border = border();
  });

  let totalOs = 0;
  let totalOrder = 0;
  let totalPay = 0;

  data.forEach((record, idx) => {
    const excelRowNum = idx + 4;
    const yesterdayOs = safeNum(record.yesterdayOs);
    const yesterdayOrder = safeNum(record.yesterdayOrder);
    const todayPayment = safeNum(record.todayPayment);
    totalOs += yesterdayOs;
    totalOrder += yesterdayOrder;
    totalPay += todayPayment;

    const row = ws.addRow([
      record.customerName || "",
      yesterdayOs,
      yesterdayOrder,
      null,
      todayPayment,
      null,
    ]);
    row.height = 16;
    row.getCell(4).value = {
      formula: `IF(C${excelRowNum}=0,0,B${excelRowNum}/C${excelRowNum})`,
    };
    row.getCell(6).value = {
      formula: `IF(E${excelRowNum}>C${excelRowNum},E${excelRowNum},E${excelRowNum}+(E${excelRowNum}-C${excelRowNum}))`,
    };

    const isAlt = idx % 2 === 1;
    row.eachCell((cell, colNum) => {
      cell.fill = isAlt ? fill(COLOR.altRow) : fill(COLOR.white);
      cell.font = font({ bold: true, color: { argb: COLOR.bodyText } });
      cell.alignment = align(colNum === 1 ? "left" : "right");
      cell.border = border();
      if (colNum >= 2) cell.numFmt = "#,##0.00";
    });
  });

  const firstDataRow = 4;
  const lastDataRow = 3 + data.length;
  const totalRow = ws.addRow([
    `Total (${data.length} customers)`,
    totalOs,
    totalOrder,
    null,
    totalPay,
    null,
  ]);
  totalRow.height = 18;
  if (data.length > 0) {
    // Avg Term Days — same logic as UI: average of Term Days where Yesterday Order > 0
    totalRow.getCell(4).value = {
      formula: `IFERROR(AVERAGEIF(C${firstDataRow}:C${lastDataRow},">0",D${firstDataRow}:D${lastDataRow}),0)`,
    };
    totalRow.getCell(6).value = {
      formula: `SUM(F${firstDataRow}:F${lastDataRow})`,
    };
  } else {
    totalRow.getCell(4).value = 0;
    totalRow.getCell(6).value = 0;
  }
  totalRow.eachCell((cell, colNum) => {
    cell.fill = fill(COLOR.totalRow);
    cell.font = font({ bold: true, color: { argb: COLOR.totalText } });
    cell.alignment = align(colNum === 1 ? "left" : "right");
    cell.border = {
      ...border(),
      top: { style: "medium", color: { argb: "FF4A7AB5" } },
    };
    if (colNum >= 2) cell.numFmt = "#,##0.00";
  });

  return wb;
};

const ExportCustomerOrderPaymentExcel = ({ data = [], date = "", companyInfo = null }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    const rows = typeof data === "function" ? data() : data;
    if (!rows?.length) return;
    try {
      setLoading(true);
      await loadExcelJS();
      const wb = buildWorkbook(rows, date, companyInfo);
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Customer_Order_Limit_${date || "report"}.xlsx`;
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

export default ExportCustomerOrderPaymentExcel;
