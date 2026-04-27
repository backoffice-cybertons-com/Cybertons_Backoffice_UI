import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Normalize columns to a simple [{ header, accessor }] shape.
 */
const normalizeColumns = (columns, sampleRow) => {
    if (Array.isArray(columns) && columns.length > 0) {
        return columns.map(col => ({
            header: col.label || col.name || col.header || col.accessor || 'Column',
            accessor: col.accessor || col.field || col.key || col.name
        })).filter(c => !!c.accessor);
    }

    if (sampleRow && typeof sampleRow === 'object') {
        return Object.keys(sampleRow).map(key => ({
            header: key,
            accessor: key
        }));
    }

    return [];
};

/**
 * Convert raw row value to a Cell Object { v, t, z } for SheetJS.
 * - Numbers -> type 'n'
 * - Booleans -> "Yes"/"No" (type 's')
 * - Dates -> type 'd' (if valid) or type 's'
 * - null/undefined -> ""
 */
const prepareCell = (value) => {
    if (value === null || value === undefined) return { v: "", t: "s" };
    
    if (typeof value === "number") {
        return { v: value, t: "n" };
    }
    
    if (typeof value === "boolean") {
        return { v: value ? "Yes" : "No", t: "s" };
    }

    // Check if it's a date or a valid date string
    if (value instanceof Date) {
        return { v: value, t: "d" };
    }

    // If it looks like a number in a string, try to parse it
    // But be careful with invoice numbers/codes!
    // We only auto-convert if it's clearly a decimal/integer or passed as number
    
    return { v: String(value), t: "s" };
};

/**
 * Compute Excel column widths based on content length.
 */
const buildColumnWidths = (rowsAOA) => {
    if (!rowsAOA || rowsAOA.length === 0) return [];

    const numCols = rowsAOA[0].length;
    const widths = Array(numCols).fill(10);

    rowsAOA.forEach(row => {
        row.forEach((cell, i) => {
            const val = cell && typeof cell === 'object' ? String(cell.v || "") : String(cell || "");
            const len = val.length;
            if (len > widths[i]) widths[i] = len;
        });
    });

    return widths.map(w => ({ wch: Math.min(Math.max(w + 2, 10), 80) }));
};

/**
 * Core Excel export utility.
 * Supports header rows (e.g. Company Info), footer rows (e.g. Totals), 
 * and proper numeric/date types.
 *
 * @param {Object} params
 * @param {Array} params.data - Array of row objects.
 * @param {Array} params.columns - Array of { label, accessor } or compatible.
 * @param {string} params.fileName - File name.
 * @param {string} [params.sheetName] - Sheet name.
 * @param {Array} [params.headerRows] - Optional 2D array of rows to prepended.
 * @param {Array} [params.footerRows] - Optional 2D array of rows to appended.
 */
export const exportToExcel = ({ 
    data, 
    columns, 
    fileName, 
    sheetName = 'Sheet1',
    headerRows = [],
    footerRows = []
}) => {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn('[excelExport] No rows to export.');
        // If we have headerRows or footerRows, we might still want to export
        if (headerRows.length === 0 && footerRows.length === 0) return;
    }

    const normalizedColumns = normalizeColumns(columns, data[0]);
    if (normalizedColumns.length === 0 && data.length > 0) {
        console.warn('[excelExport] No columns to export.');
        return;
    }

    // Build the Grid (Array of Arrays)
    const aoa = [];

    // 1. Add Custom Headers (e.g. Company Name, Address)
    headerRows.forEach(row => aoa.push(row));

    // 2. Add Table Headers
    const tableHeader = normalizedColumns.map(col => col.header);
    aoa.push(tableHeader);

    // 3. Add Data Rows
    data.forEach(row => {
        const rowArr = normalizedColumns.map(col => {
            let rawValue;
            if (typeof col.accessor === 'function') {
                rawValue = col.accessor(row);
            } else {
                rawValue = row ? row[col.accessor] : undefined;
            }
            return prepareCell(rawValue);
        });
        aoa.push(rowArr);
    });

    // 4. Add Footer Rows (e.g. Totals)
    footerRows.forEach(row => {
        // Convert footer values to cells too
        const footerRowCells = row.map(val => prepareCell(val));
        aoa.push(footerRowCells);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Handle Merges if they were specified in headerRows or if we want automatic ones
    // For now, let's just do widths
    worksheet['!cols'] = buildColumnWidths(aoa);

    // If there were header rows, we might want to merge them across the table width
    if (headerRows.length > 0 && normalizedColumns.length > 1) {
        const merges = headerRows.map((_, idx) => ({
            s: { r: idx, c: 0 },
            e: { r: idx, c: normalizedColumns.length - 1 }
        }));
        worksheet['!merges'] = (worksheet['!merges'] || []).concat(merges);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    saveAs(blob, `${fileName || 'export'}.xlsx`);
};

/**
 * Small wrapper for future-proofing.
 */
export const exportToExcelFrontend = (params) => {
    return exportToExcel(params);
};



