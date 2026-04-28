import * as XLSX from "xlsx";

const GSTR3BExcelExport = (section31, section32, section4, section5) => {

    let data = [];

    // ---------------- 3.1 ----------------
    data.push(
        ["3.1 Details of Outward Supplies and inward supplies liable to reverse charge"],
        ["Nature Of Supplies", "Total Taxable Value", "Integrated Tax", "Central Tax", "State / UT Tax", "Cess"]
    );

    section31.forEach(r => {
        data.push([
            r.section,
            r.taxableAmt,
            r.igstAmt,
            r.cgstAmt,
            r.sgstAmt,
            r.cess
        ]);
    });

    data.push([]);

    // store dynamic row for merge
    let sec32TitleRow = data.length;

    // ---------------- 3.2 ----------------
    data.push(
        ["3.2 Details of Inter-State Supplies"],
        ["Nature", "Place Of Supply", "Total Taxable Value", "Amount Of Integrated Tax"]
    );

    section32.forEach(r => {
        data.push([
            r.section,
            "",
            r.taxableAmt,
            r.igstAmt
        ]);
    });

    data.push([]);

    let sec4TitleRow = data.length;

    // ---------------- 4 ----------------
    data.push(
        ["4 Eligible ITC"],
        ["Details", "Integrated Tax", "Central Tax", "State / UT Tax", "Cess"]
    );

    section4.forEach(r => {
        data.push([
            r.section,
            r.igstAmt,
            r.cgstAmt,
            r.sgstAmt,
            r.cess
        ]);
    });

    data.push([]);

    let sec5TitleRow = data.length;

    // ---------------- 5 ----------------
    data.push(
        ["5 Values of exempt, nil-rated and non-GST inward supplies"],
        ["Nature Of Supplies", "Inter-State Supplies", "Intra-State Supplies"]
    );

    section5.forEach(r => {
        data.push([
            r.section,
            r.interStateSupplies,
            r.intraStateSupplies
        ]);
    });


    // Sheet creation
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Dynamic merged headings
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: sec32TitleRow, c: 0 }, e: { r: sec32TitleRow, c: 3 } },
        { s: { r: sec4TitleRow, c: 0 }, e: { r: sec4TitleRow, c: 4 } },
        { s: { r: sec5TitleRow, c: 0 }, e: { r: sec5TitleRow, c: 2 } },
    ];

    // Column widths
    ws["!cols"] = [
        { wch: 50 },
        { wch: 22 },
        { wch: 22 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "GSTR3B");

    XLSX.writeFile(wb, "GSTR3B_Report.xlsx");
};

export default GSTR3BExcelExport;