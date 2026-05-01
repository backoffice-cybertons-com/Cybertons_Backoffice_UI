// import * as XLSX from "xlsx";

// const GSTR3BExcelExport = (
//   section31,
//   section32,
//   section4,
//   section5,
//   companyInfo,
//   fromDate,
//   toDate,
// ) => {
//   console.log("GSTR3BExcelExport: Received Data:", {
//     section31Count: section31?.length,
//     section32Count: section32?.length,
//     section4Count: section4?.length,
//     section5Count: section5?.length,
//     companyInfo,
//   });

//   let data = [];

//   const fromDateFormatted = fromDate
//     ? new Date(fromDate).toLocaleDateString("en-GB", {
//         month: "long",
//       }) +
//       "-" +
//       new Date(fromDate).getFullYear()
//     : "";
//   const toYear = toDate ? new Date(toDate).getFullYear() : "";

//   // ---------------- Header ----------------
//   data.push([`GSTIN No : ${companyInfo?.gstin || ""}`]);
//   data.push([
//     `Legal Name Of Registered Person : ${companyInfo?.companyName || ""}`,
//   ]);
//   data.push([`GSTR-3B Of : ${fromDateFormatted} - ${toYear}`]);
//   data.push([]); // empty row

//   // ---------------- 3.1 ----------------
//   data.push(
//     [
//       "3.1 Details of Outward Supplies and inward supplies liable to reverse charge",
//     ],
//     [
//       "Nature Of Supplies",
//       "Total Taxable Value",
//       "Integrated Tax",
//       "Central Tax",
//       "State / UT Tax",
//       "Cess",
//     ],
//   );

//   section31.forEach((r) => {
//     data.push([
//       r.section,
//       r.taxableAmt,
//       r.igstAmt,
//       r.cgstAmt,
//       r.sgstAmt,
//       r.cess,
//     ]);
//   });

//   data.push([]);

//   // store dynamic row for merge
//   let sec32TitleRow = data.length;

//   // ---------------- 3.2 ----------------
//   data.push(
//     ["3.2 Details of Inter-State Supplies"],
//     [
//       "Nature",
//       "Place Of Supply",
//       "Total Taxable Value",
//       "Amount Of Integrated Tax",
//     ],
//   );

//   section32.forEach((r) => {
//     data.push([r.section, "", r.taxableAmt, r.igstAmt]);
//   });

//   data.push([]);

//   let sec4TitleRow = data.length;

//   // ---------------- 4 ----------------
//   data.push(
//     ["4 Eligible ITC"],
//     ["Details", "Integrated Tax", "Central Tax", "State / UT Tax", "Cess"],
//   );

//   section4.forEach((r) => {
//     data.push([r.section, r.igstAmt, r.cgstAmt, r.sgstAmt, r.cess]);
//   });

//   data.push([]);

//   let sec5TitleRow = data.length;

//   // ---------------- 5 ----------------
//   data.push(
//     ["5 Values of exempt, nil-rated and non-GST inward supplies"],
//     ["Nature Of Supplies", "Inter-State Supplies", "Intra-State Supplies"],
//   );

//   section5.forEach((r) => {
//     data.push([r.section, r.interStateSupplies, r.intraStateSupplies]);
//   });

//   // Sheet creation
//   const ws = XLSX.utils.aoa_to_sheet(data);

//   // Dynamic merged headings
//   ws["!merges"] = [
//     { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
//     { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
//     { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
//     { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
//     { s: { r: sec32TitleRow, c: 0 }, e: { r: sec32TitleRow, c: 3 } },
//     { s: { r: sec4TitleRow, c: 0 }, e: { r: sec4TitleRow, c: 4 } },
//     { s: { r: sec5TitleRow, c: 0 }, e: { r: sec5TitleRow, c: 2 } },
//   ];

//   // Column widths
//   ws["!cols"] = [
//     { wch: 50 },
//     { wch: 22 },
//     { wch: 22 },
//     { wch: 20 },
//     { wch: 20 },
//     { wch: 12 },
//   ];

//   const wb = XLSX.utils.book_new();

//   XLSX.utils.book_append_sheet(wb, ws, "GSTR3B");

//   XLSX.writeFile(wb, "GSTR3B_Report.xlsx");
// };

// export default GSTR3BExcelExport;
const GSTR3BExcelExport = (
  section31,
  section32,
  section4,
  section5,
  companyInfo,
  fromDate,
  toDate,
) => {
  const num = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  const sum = (arr, key) => arr.reduce((acc, r) => acc + num(r[key]), 0);

  const fmt = (v) => {
    const n = parseFloat(v);
    const val = isNaN(n) ? 0 : n;
    return val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseDate = (ds) => {
    if (!ds) return null;
    const [y, m, d] = ds.split("-");
    return new Date(y, m - 1, d);
  };
  const f = parseDate(fromDate);
  const t = parseDate(toDate);
  const fromDateFormatted = f
    ? f.toLocaleDateString("en-GB", { month: "long" }) + "-" + f.getFullYear()
    : "";
  const toYear = t ? t.getFullYear() : "";

  // company info rows - white bg, no border, no wrap
  const tinfo = (val, colspan = 1) =>
    `<td style="border:none;background:#ffffff;white-space:nowrap;"${colspan > 1 ? ` colspan="${colspan}"` : ""}>${val ?? ""}</td>`;

  // spacer rows - no border
  const tspacer = (colspan = 1) =>
    `<td style="border:none;"${colspan > 1 ? ` colspan="${colspan}"` : ""}></td>`;

  // header cell - grey bg, no wrap, taller via line-height, customizable alignment
  const th = (val, bg, colspan = 1, align = "left") =>
    `<td style="background:${bg};text-align:${align};white-space:nowrap;height:30px;line-height:30px;border:1px solid #D3D3D3;border-bottom:1px solid #BDBDBD;"${colspan > 1 ? ` colspan="${colspan}"` : ""}>${val ?? ""}</td>`;

  // title cell - customizable alignment, normal weight, smaller font, grey bg, no wrap, grey bottom border
  const tc = (val, bg, colspan = 1, align = "left") =>
    `<td style="background:${bg};text-align:${align};${align === "left" ? "padding-left:6px;" : ""}white-space:nowrap;height:30px;line-height:30px;font-size:10pt;border:1px solid #D3D3D3;border-bottom:1px solid #BDBDBD;"${colspan > 1 ? ` colspan="${colspan}"` : ""}>${val ?? ""}</td>`;

  // column number cell - centered, grey bg, black bottom border
  const tcn = (val, bg, colspan = 1) =>
    `<td style="background:${bg};text-align:center;white-space:nowrap;border:1px solid #D3D3D3;border-bottom:1px solid #BDBDBD;"${colspan > 1 ? ` colspan="${colspan}"` : ""}>${val ?? ""}</td>`;

  // normal text cell - replaces spaces with &nbsp; for reliable Excel indentation, customizable alignment
  const td = (val, colspan = 1, align = "left") => {
    const formattedVal = (val ?? "").toString().replace(/ /g, "&nbsp;");
    return `<td style="text-align:${align};white-space:nowrap;border:1px solid #D3D3D3;"${colspan > 1 ? ` colspan="${colspan}"` : ""}>${formattedVal}</td>`;
  };

  // numeric cell - right aligned, no wrap, forced 2 decimals in Excel
  const tn = (val, colspan = 1) =>
    `<td style="text-align:right;white-space:nowrap;border:1px solid #D3D3D3;mso-number-format:'\\#\\,\\#\\#0\\.00';"${colspan > 1 ? ` colspan="${colspan}"` : ""}>${val ?? ""}</td>`;

  // total text cell
  const tt = (val, colspan = 1) =>
    `<td style="background:#A9A9A9;white-space:nowrap;font-weight:bold;border:1px solid #D3D3D3;"${colspan > 1 ? ` colspan="${colspan}"` : ""}>${val ?? ""}</td>`;

  // total numeric cell - right aligned, forced 2 decimals in Excel
  const ttn = (val, colspan = 1) =>
    `<td style="background:#A9A9A9;text-align:right;white-space:nowrap;font-weight:bold;border:1px solid #D3D3D3;mso-number-format:'\\#\\,\\#\\#0\\.00';"${colspan > 1 ? ` colspan="${colspan}"` : ""}>${val ?? ""}</td>`;

  const tr = (cells) => `<tr>${cells}</tr>`;

  const H = "#D3D3D3";

  let rows = "";

  // Company info - white bg, no border
  rows += tr(tinfo(`GSTIN No : ${companyInfo?.gstin || ""}`, 6));
  rows += tr(
    tinfo(
      `Legal Name Of Registered Person : ${companyInfo?.companyName || ""}`,
      6,
    ),
  );
  rows += tr(tinfo(`GSTR-3B Of : ${fromDateFormatted} - ${toYear}`, 6));
  rows += tr(tspacer(6));

  // 3.1
  rows += tr(
    tc(
      "3.1 Details of Outward Supplies and inward supplies liable to reverse charge",
      H,
      6,
      "center",
    ),
  );
  rows += tr(
    th("Nature Of Supplies", H, 1, "center") +
    th("Total Taxable Value", H, 1, "center") +
    th("Integrated Tax", H, 1, "center") +
    th("Central Tax", H, 1, "center") +
    th("State / UT   Tax", H, 1, "center") +
    th("Cess", H, 1, "center"),
  );
  rows += tr(
    tcn("1", H) + tcn("2", H) + tcn("3", H) + tcn("4", H) + tcn("5", H) + tcn("6", H)
  );
  section31.forEach((r) => {
    rows += tr(
      td(r.section) +
      tn(fmt(r.taxableAmt)) +
      tn(fmt(r.igstAmt)) +
      tn(fmt(r.cgstAmt)) +
      tn(fmt(r.sgstAmt)) +
      tn(fmt(r.cess)),
    );
  });
  rows += tr(
    tt(`<table width="100%" style="border:none;background:transparent;"><tr><td style="border:none;background:transparent;text-align:left;font-weight:bold;padding:0;">Total</td><td style="border:none;background:transparent;text-align:right;font-weight:bold;padding:0;">${section31.length}</td></tr></table>`) +
    ttn(fmt(sum(section31, "taxableAmt"))) +
    ttn(fmt(sum(section31, "igstAmt"))) +
    ttn(fmt(sum(section31, "cgstAmt"))) +
    ttn(fmt(sum(section31, "sgstAmt"))) +
    ttn(fmt(sum(section31, "cess"))),
  );
  rows += tr(tspacer(6));

  // 3.2
  rows += tr(
    tc(
      "3.2 Of The Supplies Shown In 3.1 (a) Above, Details Of Inter-State Supplies Made To Unregistered Persons, Composition Taxable Persons And UIN Holders",
      H,
      4,
    ),
  );
  rows += tr(
    th("", H) +
    th("Place Of Supply", H, 1, "center") +
    th("Total Taxable Value", H, 1, "center") +
    th("Amount Of Integrated Tax", H, 1, "center"),
  );
  rows += tr(
    tcn("1", H) + tcn("2", H) + tcn("3", H) + tcn("4", H)
  );
  section32.forEach((r) => {
    rows += tr(
      td(r.section) + td("", 1, "center") + tn(fmt(r.taxableAmt)) + tn(fmt(r.igstAmt)),
    );
  });
  rows += tr(
    tt(`<table width="100%" style="border:none;background:transparent;"><tr><td style="border:none;background:transparent;text-align:left;font-weight:bold;padding:0;">Total</td><td style="border:none;background:transparent;text-align:right;font-weight:bold;padding:0;">${section32.length}</td></tr></table>`) +
    tt("") +
    ttn(fmt(sum(section32, "taxableAmt"))) +
    ttn(fmt(sum(section32, "igstAmt"))),
  );
  rows += tr(tspacer(6));

  // 4
  rows += tr(tc("4 Eligible ITC", H, 5, "center"));
  rows += tr(
    th("Details", H, 1, "center") +
    th("Integrated Tax", H, 1, "center") +
    th("Central Tax", H, 1, "center") +
    th("State / UT Tax", H, 1, "center") +
    th("Cess", H, 1, "center"),
  );
  rows += tr(
    tcn("1", H) + tcn("2", H) + tcn("3", H) + tcn("4", H) + tcn("5", H)
  );
  section4.forEach((r) => {
    rows += tr(
      td(r.section) +
      tn(fmt(r.igstAmt)) +
      tn(fmt(r.cgstAmt)) +
      tn(fmt(r.sgstAmt)) +
      tn(fmt(r.cess)),
    );
  });
  rows += tr(
    tt("Total") +
    ttn(fmt(sum(section4, "igstAmt"))) +
    ttn(fmt(sum(section4, "cgstAmt"))) +
    ttn(fmt(sum(section4, "sgstAmt"))) +
    ttn(fmt(sum(section4, "cess"))),
  );
  rows += tr(tspacer(6));

  // 5
  rows += tr(
    tc("5 Values of exempt, nil-rated and non-GST inward supplies", H, 3, "center"),
  );
  rows += tr(
    th("Nature Of Supplies", H, 1, "center") +
    th("Inter-State Supplies", H, 1, "center") +
    th("Intra-State Supplies", H, 1, "center"),
  );
  rows += tr(
    tcn("1", H) + tcn("2", H) + tcn("3", H)
  );
  section5.forEach((r) => {
    rows += tr(
      td(r.section) +
      tn(fmt(r.interStateSupplies)) +
      tn(fmt(r.intraStateSupplies)),
    );
  });
  rows += tr(
    tt(`<table width="100%" style="border:none;background:transparent;"><tr><td style="border:none;background:transparent;text-align:left;font-weight:bold;padding:0;">Total</td><td style="border:none;background:transparent;text-align:right;font-weight:bold;padding:0;">${section5.length}</td></tr></table>`) +
    ttn(fmt(sum(section5, "interStateSupplies"))) +
    ttn(fmt(sum(section5, "intraStateSupplies"))),
  );

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
        <x:ExcelWorksheet><x:Name>GSTR3B</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head>
    <body>
      <table cellspacing="0" cellpadding="2" style="border-collapse:collapse;">
        <colgroup>
          <col width="400">
          <col width="150">
          <col width="150">
          <col width="150">
          <col width="150">
          <col width="100">
        </colgroup>
        ${rows}
      </table>
    </body>
    </html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GSTR3B_Report.xls";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default GSTR3BExcelExport;
