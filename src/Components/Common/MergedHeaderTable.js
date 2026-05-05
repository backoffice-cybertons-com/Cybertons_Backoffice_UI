/**
 * MergedHeaderTable.jsx
 * ─────────────────────────────────────────────────────────────
 * A specialized table with merged/grouped column headers (colspan),
 * built specifically for reports like Outstanding Comparison.
 *
 * Features:
 *  • Grouped column headers with colspan (e.g. "Yesterday", "Today")
 *  • Per-column filter inputs in a sticky sub-header row
 *  • Click-to-sort (asc / desc) on every column
 *  • Sticky thead + sticky tfoot totals row
 *  • Light + Dark mode via `isDark` prop
 *  • Color-coded diff cells
 *
 * ColumnDef shape (same as CommonTable, plus `group`):
 *  key        string              Data key on row object
 *  label      string              Column header text
 *  group      string              Group label for colspan header (use "\u00A0" for ungrouped)
 *  width      string              CSS column width
 *  align      "left"|"right"      Cell text alignment
 *  sortType   "string"|"number"|"date"
 *  cell       (row, idx) => Node  Optional custom renderer
 *  totalType  "sum"|"none"        Footer aggregation
 *  totalFn    (acc) => number     Custom total function
 *  decimals   number              Decimal places (default 2)
 */

import React, { useState, useMemo, useCallback, useRef, useLayoutEffect } from "react";

/* ── helpers ─────────────────────────────────────────────── */
const safeNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmt = (v, dec = 2) =>
    safeNum(v).toLocaleString("en-IN", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
    });

const getSortValue = (row, col) => {
    if (col.sortType === "date") {
        const d = row[col.key] ? new Date(row[col.key]).getTime() : 0;
        return Number.isFinite(d) ? d : 0;
    }
    if (col.sortType === "number") return safeNum(row[col.key]);
    return (row[col.key] ?? "").toString().toLowerCase();
};

/* ── build group spans ───────────────────────────────────── */
const buildGroupSpans = (columns) => {
    const spans = [];
    let i = 0;
    while (i < columns.length) {
        const col = columns[i];
        const groupLabel = col.group || "\u00A0";
        let span = 1;
        while (
            i + span < columns.length &&
            (columns[i + span].group || "\u00A0") === groupLabel
        ) {
            span++;
        }
        spans.push({ label: groupLabel, span, colIndex: i });
        i += span;
    }
    return spans;
};

/* ── sort icon ───────────────────────────────────────────── */
const SortArrow = ({ colKey, sortConfig }) => {
    const active = sortConfig.key === colKey;
    return (
        <span style={{
            marginLeft: 4,
            fontSize: 10,
            opacity: active ? 1 : 0.35,
            color: active ? "#4f8ef7" : "inherit",
            userSelect: "none",
        }}>
            {active ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅"}
        </span>
    );
};

/* ── styles ──────────────────────────────────────────────── */
const makeStyles = (isDark) => {
    // Professional blue-slate palette
    const bg = isDark ? "#0f172a" : "#f4f6f9";

    /*   STRONG HEADER (anchor) */
    const bgGroup = isDark ? "#1e293b" : "#465e80ff";

    /* medium header */
    const bgLabel = isDark ? "#334155" : "rgb(238, 242, 247)";

    /* clean areas */
    const bgFilter = isDark ? "#020617" : "#ffffff";
    const bgFoot = isDark ? "#1e293b" : "#eef2f7";

    /* structure */
    const border = isDark ? "#334155" : "#d6deeb";
    const text = isDark ? "#e2e8f0" : "#1f2937";

    /* rows */
    const altRow = isDark ? "#020617" : "#fafbfd";
    const hoverRow = isDark ? "#1e293b" : "#eef3ff";
    return {
        wrapper: {
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            fontSize: 13,
            color: text,
            borderRadius: 8,
            border: `1px solid ${border}`,
            overflow: "hidden",
            background: bg,
            boxShadow: isDark
                ? "0 2px 12px rgba(0,0,0,0.4)"
                : "0 2px 12px rgba(30,58,110,0.08)",
        },
        scrollContainer: {
            overflowX: "auto",
            overflowY: "auto",
        },
        table: {
            borderCollapse: "collapse",
            width: "100%",
            tableLayout: "fixed",
        },
        // Group row — dark navy, white text
        thGroup: {
            background: bgGroup,
            color: "#ffffff",
            fontWeight: "600",
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            textAlign: "center",
            padding: "8px 10px",
            border: "none",
            borderRight: `1px solid rgba(255,255,255,0.15)`,
            // box-shadow paints OVER the row below — no gap possible
            boxShadow: `inset 0 -2px 0 rgba(255,255,255,0.10)`,
            whiteSpace: "nowrap",
            position: "sticky",
            top: 0,
            zIndex: 5,
        },
        // Ungrouped group cell (Sr No, Customer, Diff) — slightly different shade
        thGroupEmpty: {
            background: bgGroup,
            color: "#ffffff",
            fontWeight: 700,
            fontSize: 11,
            textAlign: "center",
            padding: "8px 10px",
            border: "none",
            borderRight: `1px solid rgba(255,255,255,0.15)`,
            boxShadow: `inset 0 -2px 0 rgba(255,255,255,0.10)`,
            whiteSpace: "nowrap",
            position: "sticky",
            top: 0,
            zIndex: 5,
        },
        // Label row — slightly lighter navy
        thLabel: {
            background: bgLabel,
            color: "rgb(30, 58, 110)",
            fontWeight: 600,
            fontSize: 14,
            padding: "7px 10px",
            border: "none",
            borderRight: `1px solid rgba(255,255,255,0.12)`,
            // bottom shadow acts as the divider line between label row and filter row
            boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.08)`,
            cursor: "pointer",
            userSelect: "none",
            whiteSpace: "nowrap",
            position: "sticky",
            // top set dynamically via ref
            zIndex: 4,
        },
        // Filter row
        thFilter: {
            background: bgFilter,
            padding: "5px 6px",
            border: "none",
            borderRight: `1px solid ${border}`,
            // strong bottom shadow = divider between header and body
            boxShadow: `0 2px 4px -1px rgba(30,58,110,0.15), inset 0 -2px 0 ${border}`,
            position: "sticky",
            // top set dynamically via ref
            zIndex: 4,
        },
        filterInput: {
            width: "100%",
            border: `1px solid ${isDark ? "#2e3d6a" : "#b8c8e8"}`,
            borderRadius: 4,
            padding: "3px 7px",
            fontSize: 11,
            background: isDark ? "#1e2840" : "#ffffff",
            color: text,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
        },
        tdBase: {
            padding: "6px 10px",
            borderBottom: `1px solid ${border}`,
            borderRight: `1px solid ${border}`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
        },
        tfootTd: {
            background: bgFoot,
            fontWeight: 700,
            padding: "7px 10px",
            borderTop: `2px solid ${isDark ? "#2a3558" : "#a0b8e0"}`,
            borderRight: `1px solid ${border}`,
            position: "sticky",
            bottom: 0,
            zIndex: 3,
            whiteSpace: "nowrap",
            color: isDark ? "#dde4f5" : "#1e3a6e",
        },
        altRow,
        hoverRow,
        border,
    };
};

/* ── component ───────────────────────────────────────────── */
const MergedHeaderTable = ({
    columns = [],
    data = [],
    loading = false,
    isDark = false,
    maxHeight = "calc(100vh - 300px)",
    minWidth = "900px",
    showTotals = true,
    rowKey = null,
}) => {
    const [filters, setFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [hoveredRow, setHoveredRow] = useState(null);

    // Refs to measure actual rendered row heights for precise sticky offsets
    const groupRowRef = useRef(null);
    const labelRowRef = useRef(null);
    const [labelTop, setLabelTop] = useState(33);
    const [filterTop, setFilterTop] = useState(64);

    useLayoutEffect(() => {
        const groupH = groupRowRef.current?.getBoundingClientRect().height ?? 33;
        const labelH = labelRowRef.current?.getBoundingClientRect().height ?? 31;
        setLabelTop(groupH);
        setFilterTop(groupH + labelH);
    });

    const S = makeStyles(isDark);

    /* filter */
    const handleFilter = useCallback((key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    /* sort */
    const handleSort = useCallback((key) => {
        setSortConfig((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    }, []);

    /* filtered */
    const filtered = useMemo(() =>
        data.filter((row) => {
            for (const [key, val] of Object.entries(filters)) {
                if (!val) continue;
                const col = columns.find((c) => c.key === key);
                const search = val.toLowerCase();
                if (col?.sortType === "date") {
                    if (!row[key]) return false;
                    const d = new Date(row[key]);
                    const ds = `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-GB", { month: "short" })} ${d.getFullYear()}`.toLowerCase();
                    if (!ds.includes(search)) return false;
                } else {
                    if (!(row[key] ?? "").toString().toLowerCase().includes(search)) return false;
                }
            }
            return true;
        }), [data, filters, columns]);

    /* sorted */
    const sorted = useMemo(() => {
        if (!sortConfig.key) return filtered;
        const col = columns.find((c) => c.key === sortConfig.key);
        if (!col) return filtered;
        return [...filtered].sort((a, b) => {
            const av = getSortValue(a, col), bv = getSortValue(b, col);
            if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
            if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [filtered, sortConfig, columns]);

    /* totals */
    const totals = useMemo(() => {
        const acc = {};
        columns.forEach((c) => { if (c.sortType === "number" && c.totalType !== "none") acc[c.key] = 0; });
        sorted.forEach((row) => {
            columns.forEach((c) => { if (c.sortType === "number" && c.totalType !== "none") acc[c.key] += safeNum(row[c.key]); });
        });
        columns.forEach((c) => { if (typeof c.totalFn === "function") acc[c.key] = c.totalFn(acc); });
        return acc;
    }, [sorted, columns]);

    /* group spans */
    const groupSpans = useMemo(() => buildGroupSpans(columns), [columns]);

    /* first numeric col index for footer label span */
    const firstNumIdx = columns.findIndex((c) => c.sortType === "number");
    const labelSpan = Math.max(firstNumIdx, 1);

    /* cell renderer */
    const renderCell = (col, row, idx) => {
        if (col.cell) return col.cell(row, idx);
        const v = row[col.key] ?? "";
        if (col.sortType === "number") return fmt(v, col.decimals ?? 2);
        if (col.sortType === "date" && v) {
            return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
        }
        return v;
    };

    /* ── render ── */
    return (
        <div style={S.wrapper}>
            <div style={{ ...S.scrollContainer, maxHeight }}>
                <table style={{ ...S.table, minWidth }}>
                    <colgroup>
                        {columns.map((col) => (
                            <col key={col.key} style={{ width: col.width || "auto" }} />
                        ))}
                    </colgroup>

                    <thead>
                        {/* ── Group row ── */}
                        <tr ref={groupRowRef}>
                            {groupSpans.map((g, i) => {
                                const isLabeled = g.label.trim().length > 0;
                                return (
                                    <th
                                        key={i}
                                        colSpan={g.span}
                                        style={{
                                            ...(isLabeled ? S.thGroup : S.thGroupEmpty),
                                            borderLeft: i > 0 ? `1px solid rgba(255,255,255,0.15)` : undefined,
                                        }}
                                    >
                                        {isLabeled ? g.label : ""}
                                    </th>
                                );
                            })}
                        </tr>

                        {/* ── Label row ── */}
                        <tr ref={labelRowRef}>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{
                                        ...S.thLabel,
                                        top: labelTop,
                                        textAlign: col.align === "right" ? "right" : "left",
                                    }}
                                    onClick={() => col.sortType && handleSort(col.key)}
                                >
                                    {col.label}
                                    {col.sortType && <SortArrow colKey={col.key} sortConfig={sortConfig} />}
                                </th>
                            ))}
                        </tr>

                        {/* ── Filter row ── */}
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} style={{ ...S.thFilter, top: filterTop }}>
                                    <input
                                        style={S.filterInput}
                                        type="text"
                                        placeholder="Filter…"
                                        value={filters[col.key] || ""}
                                        onChange={(e) => handleFilter(col.key, e.target.value)}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} style={{ ...S.tdBase, textAlign: "center", padding: 32 }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#8898aa" }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round">
                                                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                                            </path>
                                        </svg>
                                        Loading data…
                                    </div>
                                </td>
                            </tr>
                        ) : sorted.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} style={{ ...S.tdBase, textAlign: "center", padding: 32, color: "#8898aa" }}>
                                    📋 No data matching filters
                                </td>
                            </tr>
                        ) : (
                            sorted.map((row, idx) => {
                                const key = rowKey ? row[rowKey] : (row.id ?? row.spUniqueCode ?? idx);
                                const isHovered = hoveredRow === idx;
                                const rowBg = isHovered
                                    ? S.hoverRow
                                    : idx % 2 === 1 ? S.altRow : "#ffffff";
                                return (
                                    <tr
                                        key={key}
                                        onMouseEnter={() => setHoveredRow(idx)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        style={{ background: rowBg, transition: "background 0.12s" }}
                                    >
                                        {columns.map((col) => (
                                            <td
                                                key={col.key}
                                                style={{
                                                    ...S.tdBase,
                                                    textAlign: col.align === "right" ? "right" : "left",
                                                }}
                                                title={col.sortType === "number"
                                                    ? fmt(row[col.key] ?? 0, col.decimals ?? 2)
                                                    : (row[col.key] ?? "").toString()}
                                            >
                                                {renderCell(col, row, idx)}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>

                    {showTotals && !loading && sorted.length > 0 && (
                        <tfoot>
                            <tr>
                                {/* label cell spanning up to first numeric col */}
                                <td
                                    colSpan={labelSpan}
                                    style={{ ...S.tfootTd, textAlign: "left" }}
                                >
                                    <span style={{ fontWeight: 700, fontSize: 12 }}>Overall Total</span>
                                    <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, opacity: 0.6 }}>
                                        {sorted.length} rows
                                    </span>
                                </td>

                                {columns.slice(labelSpan).map((col) => {
                                    const hasTotal = col.sortType === "number" &&
                                        (col.totalType !== "none" || typeof col.totalFn === "function");
                                    return (
                                        <td
                                            key={col.key}
                                            style={{ ...S.tfootTd, textAlign: "right" }}
                                        >
                                            {hasTotal ? fmt(totals[col.key], col.decimals ?? 2) : ""}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default MergedHeaderTable;
