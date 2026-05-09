/**
 * ExportOutstandingExcel.jsx
 * ─────────────────────────────────────────────────────────────
 * A dedicated Excel export button for the Outstanding Comparison report.
 * Produces a .xlsx with:
 *  • Row 1  — Merged "YESTERDAY" and "TODAY" group headers (colored)
 *  • Row 2  — Individual column headers
 *  • Row 3+ — Data rows with alternating fill
 *  • Last   — Totals row (bold, colored background)
 *
 * Usage:
 *   <ExportOutstandingExcel
 *     data={reportData}          // full array (not paginated)
 *     date={date1}               // string "YYYY-MM-DD" — shown in filename & sheet
 *   />
 *
 * Dependencies: exceljs  (loaded via CDN/ESM at runtime — no npm install needed)
 * OR falls back to a pure sheetjs approach using the xlsx npm package.
 *
 * ── We use the xlsx (SheetJS community) package which is already
 *    almost always bundled in React projects that export Excel.
 *    If it is NOT installed, run:  npm install xlsx
 */

import React, { useState } from "react";
import { Button, Spinner } from "reactstrap";

/* ── colour constants (match MergedHeaderTable steel-blue palette) ── */
const COLOR = {
  // Group headers (from bgGroup)
  group: "FF465E80", // #465e80

  // Column header (bgLabel)
  labelRow: "FFEEF2F7", // rgb(238,242,247)

  // Table background
  white: "FFFFFFFF",

  // Alternate row (altRow)
  altRow: "FFFAFBFD", // #fafbfd

  // Footer / total row (bgFoot)
  totalRow: "FFEEF2F7",

  // Borders (border)
  borderColor: "FFD6DEEB",

  // Text
  headerText: "FFFFFFFF",
  labelText: "FF1E3A6E",
  bodyText: "FF1F2937",
  totalText: "FF1E3A6E",

  // Diff colors
  diffPos: "FF198754",
  diffNeg: "FFDC3545",
};

/* ── column definitions ── */
const COLS = [
  {
    key: "srNo",
    label: "Sr No",
    group: null,
    width: 8,
    align: "center",
    isNum: false,
  },
  {
    key: "customerName",
    label: "Customer",
    group: null,
    width: 32,
    align: "left",
    isNum: false,
  },
  {
    key: "yQty",
    label: "Qty",
    group: "Yesterday",
    width: 13,
    align: "right",
    isNum: true,
  },
  {
    key: "yAmount",
    label: "Amount",
    group: "Yesterday",
    width: 16,
    align: "right",
    isNum: true,
  },
  {
    key: "yOs",
    label: "O/S",
    group: "Yesterday",
    width: 16,
    align: "right",
    isNum: true,
  },
  {
    key: "tQty",
    label: "Qty",
    group: "Today",
    width: 13,
    align: "right",
    isNum: true,
  },
  {
    key: "tAmount",
    label: "Amount",
    group: "Today",
    width: 16,
    align: "right",
    isNum: true,
  },
  {
    key: "receipt",
    label: "Receipt",
    group: "Today",
    width: 16,
    align: "right",
    isNum: true,
  },
  {
    key: "tOs",
    label: "O/S",
    group: "Today",
    width: 16,
    align: "right",
    isNum: true,
  },
  {
    key: "diff",
    label: "Diff",
    group: null,
    width: 16,
    align: "right",
    isNum: true,
  },
];

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ── style helpers ── */
const fill = (argb) => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});
const font = (opts) => ({ name: "Arial", size: 10, ...opts });
const align = (h, v = "middle") => ({
  horizontal: h,
  vertical: v,
  wrapText: false,
});
const border = () => ({
  top: { style: "thin", color: { argb: COLOR.borderColor } },
  bottom: { style: "thin", color: { argb: COLOR.borderColor } },
  left: { style: "thin", color: { argb: COLOR.borderColor } },
  right: { style: "thin", color: { argb: COLOR.borderColor } },
});

/* ── main export function ── */
const buildWorkbook = (data, dateStr, companyInfo) => {
  const ExcelJS = window.ExcelJS; // loaded below

  const wb = new ExcelJS.Workbook();
  wb.creator = "SoftBook";
  wb.created = new Date();

  const ws = wb.addWorksheet("Outstanding Comparison", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 5 }], // freeze first 4 rows (2 headers + 2 table headers)
  });

  /* ── column widths ── */
  ws.columns = COLS.map((c) => ({ width: c.width }));

  /* ════════════════════════════════════════════
       TOP HEADER — Title & Company
    ════════════════════════════════════════════ */
  const titleRow = ws.addRow([`Outstanding Comparison Report - ${dateStr || ""}`]);
  titleRow.height = 24;
  const titleCell = titleRow.getCell(1);
  titleCell.font = font({ bold: true, size: 14 });
  titleCell.alignment = align("center");
  ws.mergeCells(titleRow.number, 1, titleRow.number, COLS.length);

  const compRow = ws.addRow([companyInfo?.companyName || "SoftBook"]);
  compRow.height = 20;
  const compCell = compRow.getCell(1);
  compCell.font = font({ bold: true, size: 11 });
  compCell.alignment = align("center");
  ws.mergeCells(compRow.number, 1, compRow.number, COLS.length);

  ws.addRow([]); // Spacer

  /* ════════════════════════════════════════════
       ROW 1 — Group headers (merged cells)
    ════════════════════════════════════════════ */
  const row1 = ws.addRow([]);
  row1.height = 22;

  // Build group spans: [colIndex_1based, span, label, colorArgb]
  const groups = [];
  let ci = 1;
  for (const col of COLS) {
    const last = groups[groups.length - 1];
    if (col.group && last && last.label === col.group) {
      last.span++;
    } else {
      const color = COLOR.group;
      groups.push({ start: ci, span: 1, label: col.group || "", color });
    }
    ci++;
  }

  groups.forEach((g) => {
    const endCol = g.start + g.span - 1;
    // set value on first cell of group
    const cell = row1.getCell(g.start);
    cell.value = g.label.toUpperCase();
    cell.fill = fill(g.color);
    cell.font = font({
      bold: true,
      color: { argb: COLOR.headerText },
      size: 11,
    });
    cell.alignment = align("center");
    cell.border = border();

    // fill remaining cells in span + merge
    for (let c = g.start + 1; c <= endCol; c++) {
      const sc = row1.getCell(c);
      sc.fill = fill(g.color);
      sc.border = border();
    }
    if (g.span > 1) {
      ws.mergeCells(row1.number, g.start, row1.number, endCol);
    }
  });

  /* ════════════════════════════════════════════
       ROW 2 — Column label headers
    ════════════════════════════════════════════ */
  const row2 = ws.addRow(COLS.map((c) => c.label));
  row2.height = 18;
  row2.eachCell((cell, colNum) => {
    cell.fill = fill(COLOR.labelRow);
    cell.font = font({ bold: true, color: { argb: COLOR.labelText } });
    cell.alignment = align(COLS[colNum - 1].align);
    cell.border = border();
  });

  /* ════════════════════════════════════════════
       ROW 3+ — Data rows
    ════════════════════════════════════════════ */
  const totals = {};
  COLS.forEach((c) => {
    if (c.isNum) totals[c.key] = 0;
  });

  data.forEach((record, idx) => {
    const rowData = COLS.map((c) => {
      if (c.key === "srNo") return idx + 1;
      if (c.isNum) return safeNum(record[c.key]);
      return record[c.key] ?? "";
    });

    const dataRow = ws.addRow(rowData);
    dataRow.height = 16;

    const isAlt = idx % 2 === 1;
    const rowFill = isAlt ? fill(COLOR.altRow) : fill(COLOR.white);

    dataRow.eachCell((cell, colNum) => {
      const col = COLS[colNum - 1];
      cell.fill = rowFill;
      cell.font = font({ color: { argb: COLOR.bodyText } });
      cell.alignment = align(col.align);
      cell.border = border();

      // Diff column — colour by sign
      if (col.key === "diff") {
        const v = safeNum(record.diff);
        cell.font = font({
          color: {
            argb:
              v > 0 ? COLOR.diffNeg : v < 0 ? COLOR.diffPos : COLOR.bodyText,
          },
          bold: true,
        });
      }

      // Number format
      if (col.isNum) {
        cell.numFmt = "#,##0.00";
      }
    });

    // accumulate totals
    COLS.forEach((c) => {
      if (c.isNum) totals[c.key] += safeNum(record[c.key]);
    });
  });

  /* ════════════════════════════════════════════
       TOTALS ROW
    ════════════════════════════════════════════ */
  const totalData = COLS.map((c, i) => {
    if (i === 0) return "Overall Total";
    if (i === 1) return `${data.length} rows`;
    if (c.isNum) return totals[c.key];
    return "";
  });

  const totalRow = ws.addRow(totalData);
  totalRow.height = 18;
  totalRow.eachCell((cell, colNum) => {
    const col = COLS[colNum - 1];
    cell.fill = fill(COLOR.totalRow);
    cell.font = font({ bold: true, color: { argb: COLOR.totalText } });
    cell.alignment = align(colNum <= 2 ? "left" : col.align);
    cell.border = border();
    if (col.isNum) cell.numFmt = "#,##0.00";

    // Diff column in totals — colour by sign (negative is good/green)
    if (col.key === "diff") {
      const v = totals[col.key];
      cell.font = font({
        bold: true,
        color: {
          argb: v > 0 ? COLOR.diffNeg : v < 0 ? COLOR.diffPos : COLOR.totalText,
        },
      });
    }
  });

  /* ── top border on totals row (thicker) ── */
  totalRow.eachCell((cell) => {
    cell.border = {
      ...border(),
      top: { style: "medium", color: { argb: "FF4A7AB5" } },
    };
  });

  return wb;
};

/* ════════════════════════════════════════════
   SUMMARY WORKBOOK — mirrors the SummaryTable UI
   4 rows: Yesterday Purchase / Today Sale / Today PL / Today PL %
   4 cols: (label) / Qty / Amount / Price
════════════════════════════════════════════ */
const buildSummaryWorkbook = (data, dateStr, companyInfo) => {
  const ExcelJS = window.ExcelJS;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SoftBook";
  wb.created = new Date();

  const ws = wb.addWorksheet("Summary", {
    views: [{ state: "normal" }],
  });

  const d = Array.isArray(data) ? data[0] : data;
  if (!d) return wb;

  const safeDiv = (a, b) => (b ? a / b : 0);
  const yQty = Number(d.yQty ?? 0);
  const yAmount = Number(d.yAmount ?? 0);
  const tQty = Number(d.tQty ?? 0);
  const tAmount = Number(d.tAmount ?? 0);

  const plAmount = tAmount - yAmount;
  const yPrice = safeDiv(yAmount, yQty);
  const tPrice = safeDiv(tAmount, tQty);
  const plPrice = tPrice - yPrice;

  const plPctAmount = yAmount > 0 ? (tAmount / yAmount - 1) * 100 : (tAmount > 0 ? 100 : 0);
  const plPctPrice = yPrice > 0 ? (tPrice / yPrice - 1) * 100 : (tPrice > 0 ? 100 : 0);

  /* ── column widths ── */
  ws.columns = [
    { width: 26 }, // A — row label
    { width: 16 }, // B — Qty
    { width: 18 }, // C — Amount
    { width: 18 }, // D — Price
  ];

  /* ── helpers ── */
  const hFill = (argb) => ({
    type: "pattern",
    pattern: "solid",
    fgColor: { argb },
  });
  const hFont = (opts) => ({ name: "Arial", size: 10, ...opts });
  const hAlign = (h) => ({ horizontal: h, vertical: "middle" });
  const hBorder = () => ({
    top: { style: "thin", color: { argb: COLOR.borderColor } },
    bottom: { style: "thin", color: { argb: COLOR.borderColor } },
    left: { style: "thin", color: { argb: COLOR.borderColor } },
    right: { style: "thin", color: { argb: COLOR.borderColor } },
  });
  const numFmt = "#,##0.00";
  const pctFmt = '0.00"%"';

  /* ── Row 1: title header (merged A1:D1) ── */
  const titleRow = ws.addRow([`Outstanding Comparison Summary - ${dateStr || ""}`]);
  titleRow.height = 24;
  const titleCell = titleRow.getCell(1);
  titleCell.font = hFont({ bold: true, size: 14 });
  titleCell.alignment = hAlign("center");
  ws.mergeCells(titleRow.number, 1, titleRow.number, 4);

  const compRow = ws.addRow([companyInfo?.companyName || "SoftBook"]);
  compRow.height = 20;
  const compCell = compRow.getCell(1);
  compCell.font = hFont({ bold: true, size: 11 });
  compCell.alignment = hAlign("center");
  ws.mergeCells(compRow.number, 1, compRow.number, 4);

  ws.addRow([]); // Spacer

  /* ── Row 4: table headers ── */
  const hdrRow = ws.addRow(["", "Qty", "Amount", "Price"]);
  hdrRow.height = 18;
  hdrRow.eachCell((cell, ci) => {
    cell.fill = hFill(COLOR.labelRow);
    cell.font = hFont({ bold: true, color: { argb: COLOR.labelText } });
    cell.alignment = hAlign(ci === 1 ? "left" : "right");
    cell.border = hBorder();
  });

  /* ── data rows ── */
  const dataRows = [
    {
      label: "Yesterday Purchase",
      qty: yQty,
      amount: yAmount,
      price: safeDiv(yAmount, yQty),
      isPlRow: false,
      isPct: false,
      fillArgb: COLOR.white,
    },
    {
      label: "Today Sale",
      qty: tQty,
      amount: tAmount,
      price: safeDiv(tAmount, tQty),
      isPlRow: false,
      isPct: false,
      fillArgb: COLOR.altRow,
    },
    {
      label: "Today PL",
      qty: null,
      amount: plAmount,
      price: plPrice,
      isPlRow: true,
      isPct: false,
      fillArgb: COLOR.white,
    },
    {
      label: "Today PL %",
      qty: null,
      amount: plPctAmount,
      price: null,
      isPlRow: true,
      isPct: true,
      fillArgb: COLOR.totalRow,
    },
  ];

  dataRows.forEach((r) => {
    const row = ws.addRow([
      r.label,
      r.qty !== null ? r.qty : "",
      r.amount !== null ? r.amount : "",
      r.price !== null ? r.price : "",
    ]);
    row.height = 17;

    row.eachCell((cell, ci) => {
      cell.fill = hFill(r.fillArgb);
      cell.border = hBorder();

      if (ci === 1) {
        // label column
        cell.font = hFont({ bold: r.isPlRow, color: { argb: COLOR.bodyText } });
        cell.alignment = hAlign("left");
      } else {
        // numeric columns
        const val = cell.value;
        if (val === "") {
          cell.alignment = hAlign("right");
          return;
        }

        // colour P&L values by sign
        let textArgb = COLOR.bodyText;
        if (r.isPlRow && typeof val === "number") {
          textArgb =
            val > 0 ? COLOR.diffPos : val < 0 ? COLOR.diffNeg : COLOR.bodyText;
        }
        cell.font = hFont({ bold: r.isPlRow, color: { argb: textArgb } });
        cell.alignment = hAlign("right");

        if (r.isPct && (ci === 3 || ci === 4)) {
          // PL % column — show as percentage string
          cell.numFmt = pctFmt;
        } else {
          cell.numFmt = numFmt;
        }
      }
    });

    // stronger top border on PL rows
  });

  return wb;
};

/* ── load ExcelJS from CDN once ── */
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

/* ── component ── */
const ExportOutstandingExcel = ({
  data = [],
  date = "",
  isSummary = false,
  companyInfo = null,
}) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!data.length) return;
    try {
      setLoading(true);
      await loadExcelJS();

      const wb = isSummary
        ? buildSummaryWorkbook(data, date, companyInfo)
        : buildWorkbook(data, date, companyInfo);

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const dateTag = date ? `_${date}` : "";
      const modeTag = isSummary ? "_Summary" : "";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Outstanding_Comparison${modeTag}${dateTag}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Excel export error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      color="success"
      size="sm"
      onClick={handleExport}
      disabled={loading || !data.length}
      title="Export to Excel"
      style={{ minWidth: 36, padding: "4px 10px" }}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <i className="ri-file-excel-2-line" style={{ fontSize: 16 }} />
      )}
    </Button>
  );
};

export default ExportOutstandingExcel;
