/**
 * CommonTable.js
 * ──────────────────────────────────────────────────────────
 * A fully-featured, reusable data table component with:
 *  • Column-level filter inputs (in a sticky header row)
 *  • Click-to-sort (asc / desc) on every column
 *  • Frozen / sticky thead (top) & tfoot totals row (bottom)
 *  • Light + Dark mode via `isDark` prop
 *  • Zero external dependencies beyond React & prop-types
 *
 * Props
 * ──────────────────────────────────────────────────────────
 *  columns       Array<ColumnDef>   Column definitions (see below)
 *  data          Array<Object>      Row data
 *  loading       boolean            Show spinner overlay
 *  isDark        boolean            Dark-mode toggle
 *  maxHeight     string             CSS max-height for scroll area  (default "calc(100vh - 280px)")
 *  minWidth      string             Minimum table width             (default "100%")
 *  showTotals    boolean            Show footer totals row          (default true)
 *  paginatedData Array<Object>      Rows for current page (used for footer totals; falls back to `data`)
 *
 * ColumnDef shape
 * ──────────────────────────────────────────────────────────
 *  key           string             Data key on row object
 *  label         string             Column header text
 *  width         string             CSS column width (e.g. "120px")
 *  align         "left"|"right"     Cell text alignment
 *  sortType      "string"|"number"|"date"
 *  cell          (row) => ReactNode Optional custom cell renderer
 *  totalType     "sum"|"avg"|"none" How to aggregate in footer (default "sum" for numbers, "none" for strings)
 *  totalDeps     string[]           Keys this total depends on (for derived totals like avgPrice)
 *  totalFn       (totals) => number Custom total function (receives running totals object)
 *  decimals      number             Decimal places for number formatting (default 2)
 */

import React, { useState, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import "./CommonTable.css";

/* ── helpers ──────────────────────────────────────────────── */
const safeNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
//const fmt = (v, dec = 2) => safeNum(v).toFixed(dec);
const fmt = (v, dec = 2) =>
    safeNum(v).toLocaleString("en-IN", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
    });

const getSortValue = (row, col) => {
    if (col.sortType === "date") {
        const d = row[col.key] ? new Date(row[col.key]).getTime() : 0;
        return Number.isFinite(d) ? d : 0;
    }
    if (col.sortType === "number") return safeNum(row[col.key]);
    return (row[col.key] ?? "").toString().toLowerCase();
};

const SortIcon = ({ colKey, sortConfig }) => {
    const active = sortConfig.key === colKey;
    const arrow = active ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅";
    return (
        <i className={`ct-sort-icon${active ? " active" : ""}`} aria-hidden="true">
            {arrow}
        </i>
    );
};

/* ── main component ───────────────────────────────────────── */
const CommonTable = forwardRef(({
    columns = [],
    data = [],
    loading = false,
    isDark = false,
    maxHeight = "calc(100vh - 280px)",
    minWidth = "100%",
    showTotals = true,
    paginatedData, // Deprecated: use data=fullData and currentPage/rowsPerPage instead
    currentPage = 1,
    rowsPerPage = "all",
    customRowRender,
}, ref) => {
    /* ── state ── */
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    /* ── filter handler ── */
    const handleFilterChange = useCallback((key, value) => {
        setColumnFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    /* ── sort handler ── */
    const handleSort = useCallback((key) => {
        setSortConfig((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    }, []);

    /* ── filtered rows ── */
    const filteredData = useMemo(() => {
        return data.filter((row) => {
            for (const [key, value] of Object.entries(columnFilters)) {
                if (!value) continue;
                const searchVal = value.toLowerCase();
                const col = columns.find((c) => c.key === key);

                if (col?.sortType === "date") {
                    if (!row[key]) return false;
                    const d = new Date(row[key]);
                    const formatted =
                        `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-GB", { month: "short" })} ${String(d.getFullYear()).slice(-2)}`.toLowerCase();
                    if (!formatted.includes(searchVal)) return false;
                } else {
                    const itemVal = (row[key] ?? "").toString().toLowerCase();
                    if (!itemVal.includes(searchVal)) return false;
                }
            }
            return true;
        });
    }, [data, columnFilters, columns]);

    /* ── sorted rows ── */
    /* ── sorted rows ── */
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;
        const col = columns.find((c) => c.key === sortConfig.key);
        if (!col) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = getSortValue(a, col);
            const bVal = getSortValue(b, col);
            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig, columns]);

    /* ── data for display (sliced if paginated) ── */
    const displayData = useMemo(() => {
        if (rowsPerPage === "all") return sortedData;
        const rpp = Number(rowsPerPage);
        const start = (currentPage - 1) * rpp;
        return sortedData.slice(start, start + rpp);
    }, [sortedData, currentPage, rowsPerPage]);

    /* expose sorted+filtered data up via ref */
    useImperativeHandle(ref, () => ({
        getSortedData: () => sortedData,
        getExportData: () => {
            if (!showTotals || sortedData.length === 0) return sortedData;

            const totalRow = {
                _style: { font: { bold: true }, fill: { fgColor: { rgb: "EEEEEE" } } }
            };
            // Find first column to place "Total" label
            if (columns.length > 0) {
                totalRow[columns[0].key] = "Overall Total";
            }

            // Fill in the numeric totals
            Object.keys(totals).forEach((key) => {
                totalRow[key] = totals[key];
            });

            return [...sortedData, totalRow];
        },
        getFilters: () => columnFilters,
        getTotals: () => totals
    }));

    /* ── totals ── */
    //const rowsForTotals = paginatedData ?? sortedData;
    const rowsForTotals = sortedData;
    const totals = useMemo(() => {
        const acc = {};
        columns.forEach((col) => {
            if (col.sortType === "number" && col.totalType !== "none") {
                acc[col.key] = 0;
            }
        });

        rowsForTotals.forEach((row) => {
            columns.forEach((col) => {
                if (col.sortType === "number" && col.totalType !== "none") {
                    acc[col.key] += safeNum(row[col.key]);
                }
            });
        });

        // Run derived / custom total functions
        columns.forEach((col) => {
            if (typeof col.totalFn === "function") {
                acc[col.key] = col.totalFn(acc);
            }
        });

        return acc;
    }, [rowsForTotals, columns]);

    /* ── number columns (indices for footer label span) ── */
    const firstNumColIdx = columns.findIndex((c) => c.sortType === "number");
    const hasGroupedHeaders = columns.some(c => c.group);

    const groupedColumns = [];
    if (hasGroupedHeaders) {
        let currentGroup = null;

        columns.forEach(col => {
            if (!col.group) {
                groupedColumns.push({
                    label: col.label,
                    span: 1,
                    standalone: true
                });
                return;
            }

            if (
                currentGroup &&
                currentGroup.label === col.group
            ) {
                currentGroup.span += 1;
            } else {
                currentGroup = {
                    label: col.group,
                    span: 1,
                    standalone: false
                };
                groupedColumns.push(currentGroup);
            }
        });
    }
    /* ── render ── */
    return (
        <div className={`ct-dark-wrapper${isDark ? " ct-dark" : ""}`}>
            <div className="ct-wrapper">
                <div
                    className="ct-scroll-container"
                    style={{ maxHeight }}
                >
                    <table className="ct-table" style={{ minWidth }}>
                        {/* col widths */}
                        <colgroup>
                            {columns.map((col) => (
                                <col key={col.key} style={{ width: col.width || "auto" }} />
                            ))}
                        </colgroup>

                        {/* ── THEAD ── */}
                        <thead>

                            {/* group row only if group exists */}
                            {hasGroupedHeaders && (
                                <tr className="ct-head-group">
                                    {groupedColumns.map((g, i) => (
                                        <th
                                            key={i}
                                            colSpan={g.span}
                                            rowSpan={g.rowSpan || 1}
                                            className="text-center fw-bold"
                                        >
                                            {g.label}
                                        </th>
                                    ))}
                                </tr>
                            )}

                            {/* normal label row */}
                            <tr className="ct-head-label">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={col.align === "right"
                                            ? "ct-num"
                                            : "ct-text-start"}
                                        onClick={() => handleSort(col.key)}
                                    >
                                        {col.label}
                                        <SortIcon
                                            colKey={col.key}
                                            sortConfig={sortConfig}
                                        />
                                    </th>
                                ))}
                            </tr>

                            <tr className="ct-head-filter">
                                {columns.map((col) => (
                                    <th key={col.key}>
                                        <input
                                            className="ct-filter-input"
                                            type="text"
                                            placeholder="Filter..."
                                            value={columnFilters[col.key] || ""}
                                            onChange={(e) =>
                                                handleFilterChange(
                                                    col.key,
                                                    e.target.value
                                                )}
                                        />
                                    </th>
                                ))}
                            </tr>

                        </thead>

                        {/* ── TBODY ── */}
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length}>
                                        <div className="ct-loading">
                                            <div className="ct-spinner" />
                                            Loading data…
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length}>
                                        <div className="ct-empty">
                                            <span className="ct-empty-icon">📋</span>
                                            No data matching the current filters
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                customRowRender
                                    ? customRowRender(displayData, columns)
                                    : displayData.map((row, rowIdx) => (
                                        <tr key={row.id ?? row.spUniqueCode ?? rowIdx}>
                                            {columns.map((col) => {
                                                const cellValue = row[col.key] ?? "";
                                                const isSimple = !col.cell;
                                                let titleText = "";

                                                if (isSimple) {
                                                    if (col.sortType === "number") {
                                                        titleText = fmt(cellValue, col.decimals ?? 2);
                                                    } else if (col.sortType === "date" && cellValue) {
                                                        titleText = new Date(cellValue).toLocaleDateString("en-GB", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                        });
                                                    } else {
                                                        titleText = cellValue.toString();
                                                    }
                                                }

                                                const cellClassName = typeof col.cellClassName === 'function'
                                                    ? col.cellClassName(row)
                                                    : (col.cellClassName || "");

                                                return (
                                                    <td
                                                        key={col.key}
                                                        className={`${col.align === "right" ? "ct-num" : "ct-text-start"} ${cellClassName}`}
                                                        title={titleText || undefined}
                                                    >
                                                        {col.cell
                                                            ? col.cell(row, rowIdx)
                                                            : col.sortType === "number"
                                                                ? fmt(cellValue, col.decimals ?? 2)
                                                                : col.sortType === "date" && cellValue
                                                                    ? new Date(cellValue).toLocaleDateString("en-GB", {
                                                                        day: "2-digit",
                                                                        month: "short",
                                                                        year: "2-digit",
                                                                    })
                                                                    : cellValue}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                            )}
                        </tbody>

                        {/* ── TFOOT ── */}
                        {showTotals && !loading && sortedData.length > 0 && (
                            <tfoot>
                                <tr>
                                    {/* 👇 merged label cell */}
                                    <td colSpan={Math.max(firstNumColIdx, 1)} className="ct-text-start">
                                        <span className="ct-footer-label">
                                            <span className="ct-footer-badge">Overall Total</span>
                                            <span style={{ fontSize: "11px" }}>
                                                {sortedData.length} records
                                            </span>
                                        </span>
                                    </td>

                                    {/* 👇 numeric totals */}
                                    {columns.slice(Math.max(firstNumColIdx, 1)).map((col) => {
                                        const hasTotal = col.sortType === "number" && (col.totalType !== "none" || typeof col.totalFn === "function");
                                        if (hasTotal) {
                                            return (
                                                <td key={col.key} className="ct-num">
                                                    {fmt(totals[col.key], col.decimals ?? 2)}
                                                </td>
                                            );
                                        }
                                        return <td key={col.key} />;
                                    })}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
});

export default CommonTable;
