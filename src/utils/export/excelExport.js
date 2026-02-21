import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Normalize columns to a simple [{ header, accessor }] shape.
 * Expects incoming columns like { label, accessor } (preferred),
 * but gracefully falls back to 'name'/'header' when needed.
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
 * Convert raw row value to a safe, export-friendly representation.
 * - Booleans -> "Yes"/"No"
 * - null/undefined -> ""
 * - objects -> JSON string
 */
const normalizeCellValue = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

/**
 * Compute Excel column widths based on content length.
 */
const buildColumnWidths = (rows, columns) => {
    return columns.map(col => {
        const header = col.header || col.accessor;
        const headerLen = header ? header.toString().length : 10;

        const maxDataLen = rows.reduce((max, row) => {
            const cell = row[header];
            const len = cell ? cell.toString().length : 0;
            return Math.max(max, len);
        }, headerLen);

        const width = Math.min(Math.max(maxDataLen + 2, 10), 60); // clamp width
        return { wch: width };
    });
};

/**
 * Core Excel export utility.
 *
 * @param {Object} params
 * @param {Array} params.data - Array of row objects (already filtered).
 * @param {Array} params.columns - Array of { label, accessor } or compatible objects.
 * @param {string} params.fileName - File name without extension.
 * @param {string} [params.sheetName] - Optional sheet name.
 */
export const exportToExcel = ({ data, columns, fileName, sheetName = 'Sheet1' }) => {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn('[excelExport] No data to export.');
        return;
    }

    const normalizedColumns = normalizeColumns(columns, data[0]);
    if (normalizedColumns.length === 0) {
        console.warn('[excelExport] No columns to export.');
        return;
    }

    // Build flat objects: { HeaderLabel: value }
    const rowsForExport = data.map(row => {
        const output = {};
        normalizedColumns.forEach(col => {
            const header = col.header || col.accessor;
            const rawValue = row ? row[col.accessor] : undefined;
            output[header] = normalizeCellValue(rawValue);
        });
        return output;
    });

    const worksheet = XLSX.utils.json_to_sheet(rowsForExport);
    worksheet['!cols'] = buildColumnWidths(rowsForExport, normalizedColumns);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    saveAs(blob, `${fileName || 'export'}.xlsx`);
};

/**
 * Small wrapper to keep API future-proof:
 * easy to plug a backend export without changing call sites.
 */
export const exportToExcelFrontend = (params) => {
    // In future, route large exports to backend here.
    return exportToExcel(params);
};


