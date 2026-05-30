import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";

import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";
import CommonTable from "../../Components/Common/CommonTable";
import "../../Components/Common/CommonTable.css";
import { APIClient } from "../../helpers/api_helper";
import * as url from "../../helpers/url_helper";
import secureStorage from "../../utils/secureStorage";

import DailyOSCalendarPanel from "./DailyOSCalendarPanel";
import "./DailyOSReport.css";

const api = new APIClient();

const toLocalYMD = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtMoneyOrBlank = (n) => {
  const num = Number(n);
  if (!num) return "";
  return fmtMoney(num);
};

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Trend heatmap palette — subtle ERP-style backgrounds */
const HEATMAP_COLORS = {
  increase: "#ffebee",
  decrease: "#e8f5e9",
};

/** xlsx-js-style expects RGB without # */
const heatmapRgb = (hex) => hex.replace("#", "").toUpperCase();

const getDelta = (current, previous) => {
  if (current == null || previous == null) return null;
  const cur = Number(current);
  const prev = Number(previous);
  if (Number.isNaN(cur) || Number.isNaN(prev)) return null;
  return cur - prev;
};

const getTrendFromDelta = (delta) => {
  if (delta == null) return null;
  if (delta > 0) return "increase";
  if (delta < 0) return "decrease";
  return "unchanged";
};

/** Arrows only on red/green heatmap cells (increase / decrease). */
const isColoredTrend = (trend) => trend === "increase" || trend === "decrease";

const getTrendIcon = (trend) => {
  if (!isColoredTrend(trend)) return null;
  const icons = { increase: "↑", decrease: "↓" };
  return icons[trend] ?? null;
};

const formatSignedMoney = (amount) => {
  const n = Number(amount) || 0;
  if (n === 0) return "₹0.00";
  const sign = n > 0 ? "+" : "−";
  return `${sign}₹${fmtMoney(Math.abs(n))}`;
};

const formatPercentChange = (delta, previous) => {
  const prev = Number(previous);
  if (!prev || delta == null) return null;
  const pct = (delta / prev) * 100;
  const sign = pct > 0 ? "+" : "";
  return `(${sign}${pct.toFixed(1)}%)`;
};

const getTooltipContent = ({
  date,
  outstanding,
  delta,
  previous,
  isFirstDate,
}) => {
  const lines = [fmtDate(date), `Outstanding: ₹${fmtMoney(outstanding)}`];
  if (!isFirstDate && delta != null) {
    const pct = formatPercentChange(delta, previous);
    const changeLine = `Change: ${formatSignedMoney(delta)}`;
    lines.push(pct ? `${changeLine} ${pct}` : changeLine);
  }
  return lines.join("\n");
};

/** Precompute per-party × date heatmap metadata (trend vs previous column). */
const buildPartyHeatmapCells = (party, dates) => {
  const cells = {};
  dates.forEach((d, idx) => {
    const current = party.cells[d];
    const isMissing = current === undefined || current === null;
    const num = isMissing ? null : Number(current);
    const isZero = num === 0;
    const hasVal = num !== null && !Number.isNaN(num) && !isZero;
    const isFirstDate = idx === 0;

    let previous = null;
    if (!isFirstDate) {
      const prevVal = party.cells[dates[idx - 1]];
      if (prevVal !== undefined && prevVal !== null) {
        previous = prevVal;
      }
    }

    let delta = null;
    let trend = null;
    if (hasVal && !isFirstDate && previous !== null) {
      delta = getDelta(current, previous);
      trend = getTrendFromDelta(delta);
    }

    cells[d] = {
      value: current,
      hasVal,
      isZero,
      isMissing,
      isFirstDate,
      previous,
      delta,
      trend,
      trendIcon:
        hasVal && !isFirstDate && isColoredTrend(trend)
          ? getTrendIcon(trend)
          : null,
      tooltip: hasVal
        ? getTooltipContent({
            date: d,
            outstanding: current,
            delta,
            previous,
            isFirstDate,
          })
        : null,
    };
  });
  return cells;
};

const normalizeRow = (row) => ({
  partyId: row.partyId ?? row.PartyId ?? 0,
  partyName: (row.partyName ?? row.PartyName ?? "").toString().trim() || "—",
  reportDate: row.reportDate ?? row.ReportDate ?? null,
  outstanding: Number(row.outstanding ?? row.Outstanding ?? 0),
});

const ALL_PARTIES_OPTION = { value: null, label: "All Parties" };

const selectMenuStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

const DailyOSReport = () => {
  document.title = "Daily Outstanding Report | SoftBook";

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const routeState = {
    viewMode: location.state?.viewMode || searchParams.get("viewMode"),
    fromDate: location.state?.fromDate || searchParams.get("fromDate"),
    toDate: location.state?.toDate || searchParams.get("toDate"),
    partyId: location.state?.partyId || searchParams.get("partyId"),
  };

  const today = useMemo(() => new Date(), []);
  const firstOfMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

  const [fromDate, setFromDate] = useState(toLocalYMD(firstOfMonth));
  const [toDate, setToDate] = useState(toLocalYMD(today));
  const [datePreset, setDatePreset] = useState("month");
  const [partyOptions, setPartyOptions] = useState([ALL_PARTIES_OPTION]);
  const [selectedParty, setSelectedParty] = useState(
    routeState.partyId ? { value: routeState.partyId, label: "Loading..." } : ALL_PARTIES_OPTION
  );

  const [viewMode, setViewMode] = useState(
    routeState.viewMode === "calendar" ? "calendar" : "table",
  );
  const [reportData, setReportData] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  /** Rows after CommonTable column filters + sort (null = use full tableData). */
  const [visibleTableRows, setVisibleTableRows] = useState(null);
  const tableRef = useRef(null);
  const calendarPanelRef = useRef(null);
  const didAutoFetchCalendar = useRef(false);
  const [calendarPdfExporting, setCalendarPdfExporting] = useState(false);

  const companyId =
    secureStorage.getPlain("companyId") || localStorage.getItem("companyId");

  useEffect(() => {
    if (routeState.fromDate) {
      setFromDate(toLocalYMD(routeState.fromDate));
    }
    if (routeState.toDate) {
      setToDate(toLocalYMD(routeState.toDate));
    }
    if (routeState.fromDate || routeState.toDate) {
      setDatePreset(null);
    }
  }, []);

  useEffect(() => {
    const loadParties = async () => {
      try {
        const res = await api.get(url.GET_PARTIES);
        const list = Array.isArray(res) ? res : res?.data || [];
        const options = list.map((p) => ({
          value: p.partyId ?? p.PartyId,
          label: p.displayName ?? p.DisplayName ?? p.partyName ?? p.PartyName,
        }));
        setPartyOptions([ALL_PARTIES_OPTION, ...options]);
        
        if (routeState.partyId) {
          const preselected = options.find((p) => String(p.value) === String(routeState.partyId));
          if (preselected) {
            setSelectedParty(preselected);
          }
        }
      } catch (err) {
        console.error("DailyOSReport: failed to load parties", err);
      }
    };
    loadParties();
  }, []);

  const normalizedRows = useMemo(
    () => (reportData || []).map(normalizeRow),
    [reportData],
  );

  const groupedByParty = useMemo(() => {
    const map = new Map();
    normalizedRows.forEach((row) => {
      const key = row.partyId || row.partyName;
      if (!map.has(key)) {
        map.set(key, {
          partyId: row.partyId,
          partyName: row.partyName,
          rows: [],
        });
      }
      map.get(key).rows.push(row);
    });

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        rows: [...g.rows].sort(
          (a, b) => new Date(a.reportDate) - new Date(b.reportDate),
        ),
      }))
      .sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [normalizedRows]);

  /** Pivot grid: parties × dates */
  const pivotData = useMemo(() => {
    const dateSet = new Set();
    normalizedRows.forEach((r) => {
      if (r.reportDate) dateSet.add(toLocalYMD(r.reportDate));
    });
    const dates = Array.from(dateSet).sort();

    const parties = groupedByParty.map((g) => {
      const cells = {};
      g.rows.forEach((r) => {
        cells[toLocalYMD(r.reportDate)] = r.outstanding;
      });
      return { partyId: g.partyId, partyName: g.partyName, cells };
    });

    return { dates, parties };
  }, [normalizedRows, groupedByParty]);

  const partyHeatmapCells = useMemo(() => {
    const { dates, parties } = pivotData;
    if (!dates.length) return new Map();
    const map = new Map();
    parties.forEach((p) => {
      const key = p.partyId || p.partyName;
      map.set(key, buildPartyHeatmapCells(p, dates));
    });
    return map;
  }, [pivotData]);

  /** Flat rows for CommonTable (sort / column filters). */
  const tableData = useMemo(() => {
    const { dates, parties } = pivotData;
    return parties.map((p) => {
      const rowKey = p.partyId || p.partyName;
      const row = {
        partyId: p.partyId,
        partyName: p.partyName,
        _rowKey: rowKey,
      };
      dates.forEach((d) => {
        const v = p.cells[d];
        const n = v !== undefined && v !== null ? Number(v) : null;
        row[d] = n !== null && n !== 0 ? n : null;
      });
      return row;
    });
  }, [pivotData]);

  const syncVisibleTableRows = useCallback(() => {
    const rows = tableRef.current?.getSortedData();
    if (!rows) return;
    setVisibleTableRows((prev) => {
      if (
        prev &&
        prev.length === rows.length &&
        prev.every((r, i) => r._rowKey === rows[i]._rowKey)
      ) {
        return prev;
      }
      return rows;
    });
  }, []);

  useEffect(() => {
    setVisibleTableRows(null);
  }, [tableData]);

  /** Keep day totals in sync with CommonTable filters/sort (no CommonTable changes). */
  useEffect(() => {
    if (!searched || !tableData.length) return undefined;

    syncVisibleTableRows();
    const timer = setTimeout(syncVisibleTableRows, 0);

    const wrap = document.querySelector(".dos-common-table-wrap");
    if (!wrap) {
      clearTimeout(timer);
      return undefined;
    }

    const onTableInteraction = () => {
      setTimeout(syncVisibleTableRows, 0);
    };
    wrap.addEventListener("input", onTableInteraction, true);
    wrap.addEventListener("click", onTableInteraction, true);
    return () => {
      clearTimeout(timer);
      wrap.removeEventListener("input", onTableInteraction, true);
      wrap.removeEventListener("click", onTableInteraction, true);
    };
  }, [searched, tableData, pivotData.dates.length, syncVisibleTableRows]);

  const rowsForTotals = visibleTableRows ?? tableData;

  const tableColumns = useMemo(() => {
    const { dates } = pivotData;
    const cols = [
      {
        key: "partyName",
        label: "Party Name",
        width: "220px",
        align: "left",
        sortType: "string",
        totalType: "none",
        cell: (row) => (
          <span className="dos-party-name fw-semibold" title={row.partyName}>
            {row.partyName}
          </span>
        ),
      },
    ];

    dates.forEach((d) => {
      cols.push({
        key: d,
        label: fmtDate(d),
        width: "120px",
        align: "right",
        sortType: "number",
        totalType: "sum",
        cell: (row) => {
          const meta = partyHeatmapCells.get(row._rowKey)?.[d];
          if (meta?.isZero) return "";
          if (meta?.isMissing || !meta?.hasVal) return "—";
          return (
            <span className="dos-cell-inner" title={meta.tooltip || undefined}>
              {meta.trendIcon && (
                <span
                  className={`dos-trend-icon dos-trend-${meta.trend}`}
                  aria-hidden="true"
                >
                  {meta.trendIcon}
                </span>
              )}
              <span className="dos-cell-amount">{fmtMoney(meta.value)}</span>
            </span>
          );
        },
        cellClassName: (row) => {
          const meta = partyHeatmapCells.get(row._rowKey)?.[d];
          if (meta?.isZero || meta?.isMissing || !meta?.hasVal) {
            return "dos-os-cell dos-os-cell-empty";
          }
          const trendClass = meta.trend
            ? ` dos-heatmap-${meta.trend}`
            : meta.isFirstDate
              ? " dos-heatmap-baseline"
              : "";
          return `dos-os-cell${trendClass}`;
        },
      });
    });

    return cols;
  }, [pivotData, partyHeatmapCells]);

  /** Per-date totals from visible (filtered/sorted) table rows. */
  const dateColumnTotals = useMemo(() => {
    const { dates } = pivotData;
    const totals = {};
    dates.forEach((d) => {
      totals[d] = rowsForTotals.reduce((sum, row) => {
        const v = row[d];
        if (v === undefined || v === null) return sum;
        const n = Number(v);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);
    });
    return totals;
  }, [pivotData, rowsForTotals]);

  const applyDatePreset = useCallback((preset) => {
    const now = new Date();
    if (preset === "month") {
      setFromDate(toLocalYMD(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(toLocalYMD(now));
    } else if (preset === "last30") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      setFromDate(toLocalYMD(start));
      setToDate(toLocalYMD(now));
    }
    setDatePreset(preset);
  }, []);

  const handleClear = useCallback(() => {
    setFromDate(toLocalYMD(firstOfMonth));
    setToDate(toLocalYMD(today));
    setDatePreset("month");
    setSelectedParty(ALL_PARTIES_OPTION);
    setReportData([]);
    setCalendarData([]);
    setError("");
    setSearched(false);
    setVisibleTableRows(null);
  }, [firstOfMonth, today]);

  const fetchTableReport = useCallback(async () => {
    const params = { companyId, fromDate, toDate };
    if (selectedParty?.value) {
      params.partyId = selectedParty.value;
    }

    const response = await api.get(url.GET_DAILY_REPORT, params);
    const rows = Array.isArray(response) ? response : response?.data || [];
    setReportData(rows);
    if (!rows.length) {
      toast.info("No records found for the selected filters.");
    }
  }, [companyId, fromDate, toDate, selectedParty]);

  const fetchCalendarReport = useCallback(async () => {
    debugger;
    const params = {
      company_id: Number(companyId) || companyId,
      from_date: fromDate,
      to_date: toDate,
    };
    if (selectedParty?.value) {
      params.party_id = selectedParty.value;
    }

    const response = await api.get(url.GET_CALENDAR_SUMMARY, params);
    const rows = Array.isArray(response) ? response : response?.data || [];
    setCalendarData(rows);
    if (!rows.length) {
      toast.info("No records found for the selected date range.");
    }
  }, [companyId, fromDate, toDate, selectedParty]);

  const runReport = useCallback(
    async (mode) => {
      if (!fromDate || !toDate) {
        setError("Please select both From Date and To Date.");
        return;
      }
      if (new Date(fromDate) > new Date(toDate)) {
        setError("From Date cannot be after To Date.");
        return;
      }
      if (!companyId) {
        setError("Company context not found. Please sign in again.");
        return;
      }

      setViewMode(mode);
      setLoading(true);
      setError("");
      setSearched(true);

      try {
        if (mode === "calendar") {
          await fetchCalendarReport();
        } else {
          await fetchTableReport();
        }
      } catch (err) {
        console.error("DailyOSReport fetch error:", err);
        const msg =
          typeof err === "string"
            ? err
            : err?.message ||
              (mode === "calendar"
                ? "Failed to load calendar summary."
                : "Failed to load Daily Outstanding Report.");
        setError(msg);
        if (mode === "calendar") {
          setCalendarData([]);
        } else {
          setReportData([]);
        }
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [companyId, fromDate, toDate, fetchCalendarReport, fetchTableReport],
  );

  useEffect(() => {
    if (
      didAutoFetchCalendar.current ||
      !routeState.fromDate ||
      !routeState.toDate
    ) {
      return;
    }
    didAutoFetchCalendar.current = true;
    const mode = routeState.viewMode === "calendar" ? "calendar" : "table";
    runReport(mode);
  }, []);

  const handleExportExcel = useCallback(() => {
    const exportRows =
      tableRef.current?.getSortedData() ?? visibleTableRows ?? tableData;

    if (!exportRows.length) {
      toast.warn("No data to export. Open Table View first.");
      return;
    }

    const { dates } = pivotData;
    const headerRow = ["Party Name", ...dates.map((d) => fmtDate(d))];
    const dataStartRow = 4;
    const aoa = [
      ["DAILY OUTSTANDING REPORT"],
      ["Duration", `${fmtDate(fromDate)} to ${fmtDate(toDate)}`],
      [""],
      headerRow,
    ];

    exportRows.forEach((row) => {
      const rowKey = row._rowKey;
      const heatmap = partyHeatmapCells.get(rowKey);
      aoa.push([
        row.partyName,
        ...dates.map((d) => {
          const meta = heatmap?.[d];
          if (meta?.isZero || meta?.isMissing || !meta?.hasVal) return "";
          return fmtMoney(meta.value);
        }),
      ]);
    });

    const exportTotals = {};
    dates.forEach((d) => {
      exportTotals[d] = exportRows.reduce((sum, row) => {
        const v = row[d];
        if (v === undefined || v === null) return sum;
        const n = Number(v);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);
    });
    aoa.push([""]);
    aoa.push([
      "Overall Total",
      ...dates.map((d) => fmtMoneyOrBlank(exportTotals[d])),
    ]);
    const totalRowIndex = dataStartRow + exportRows.length + 1;

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = dates.length;
    ws["!cols"] = [{ wch: 28 }, ...dates.map(() => ({ wch: 16 }))];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];

    const border = {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    };

    const titleStyle = {
      font: { bold: true, sz: 14, color: { rgb: "1E293B" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const labelStyle = {
      font: { bold: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "left" },
    };

    const headerStyle = {
      font: { bold: true, color: { rgb: "495057" } },
      fill: { patternType: "solid", fgColor: { rgb: "F3F6F9" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    };

    const partyNameStyle = {
      font: { bold: true, color: { rgb: "334155" } },
      alignment: { horizontal: "left", vertical: "center" },
      border,
    };

    const totalRowLabelStyle = {
      font: { bold: true, color: { rgb: "1E293B" } },
      fill: { patternType: "solid", fgColor: { rgb: "F8FAFC" } },
      alignment: { horizontal: "left", vertical: "center" },
      border,
    };

    const totalRowValueStyle = {
      font: { bold: true, color: { rgb: "1E293B" } },
      fill: { patternType: "solid", fgColor: { rgb: "F8FAFC" } },
      alignment: { horizontal: "right", vertical: "center" },
      border,
    };

    const cellTextColor = { rgb: "334155" };

    const heatmapFill = (bgHex) => ({
      patternType: "solid",
      fgColor: { rgb: heatmapRgb(bgHex) },
    });

    const getOsCellStyle = (meta) => {
      if (!meta?.hasVal) {
        return {
          alignment: { horizontal: "right", vertical: "center" },
          font: { color: { rgb: "94A3B8" } },
          border,
        };
      }
      const bg =
        meta.trend === "increase"
          ? HEATMAP_COLORS.increase
          : meta.trend === "decrease"
            ? HEATMAP_COLORS.decrease
            : null;
      const base = {
        font: { bold: true, color: cellTextColor },
        alignment: { horizontal: "right", vertical: "center" },
        border,
      };
      if (!bg) return base;
      return { ...base, fill: heatmapFill(bg) };
    };

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;

        if (R === 0) {
          cell.s = titleStyle;
          continue;
        }
        if (R === 1) {
          cell.s = C === 0 ? labelStyle : { alignment: { horizontal: "left" } };
          continue;
        }
        if (R === dataStartRow - 1) {
          cell.s =
            C === 0
              ? {
                  ...headerStyle,
                  alignment: { horizontal: "left", vertical: "center" },
                }
              : {
                  ...headerStyle,
                  alignment: { horizontal: "right", vertical: "center" },
                };
          continue;
        }
        if (R >= dataStartRow) {
          const rowIdx = R - dataStartRow;
          if (R === totalRowIndex) {
            cell.s = C === 0 ? totalRowLabelStyle : totalRowValueStyle;
            continue;
          }
          const row = exportRows[rowIdx];
          if (!row) continue;
          if (C === 0) {
            cell.s = partyNameStyle;
            continue;
          }
          const dateIdx = C - 1;
          const d = dates[dateIdx];
          const meta = partyHeatmapCells.get(row._rowKey)?.[d];
          cell.s = getOsCellStyle(meta);
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Outstanding");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      `Daily_Outstanding_${fromDate}_to_${toDate}.xlsx`,
    );
  }, [
    tableData,
    visibleTableRows,
    pivotData,
    partyHeatmapCells,
    fromDate,
    toDate,
  ]);

  const handleCalendarPdf = useCallback(async () => {
    setCalendarPdfExporting(true);
    try {
      await calendarPanelRef.current?.exportPdf?.();
    } finally {
      setCalendarPdfExporting(false);
    }
  }, []);

  const calendarExportReady =
    viewMode === "calendar" && searched && !loading && calendarData.length > 0;

  const dayTotalsRef = useRef(null);
  const hScrollRef = useRef(null);

  useEffect(() => {
    const scrollEl = document.querySelector(
      ".dos-table-scroll-area .ct-scroll-container",
    );
    const totalsEl = dayTotalsRef.current;
    const hScrollEl = hScrollRef.current;
    if (!scrollEl || !totalsEl || !hScrollEl) return undefined;

    let syncing = false;
    const syncScrollLeft = (source, left) => {
      if (syncing) return;
      syncing = true;
      if (source !== scrollEl) scrollEl.scrollLeft = left;
      if (source !== totalsEl) totalsEl.scrollLeft = left;
      if (source !== hScrollEl) hScrollEl.scrollLeft = left;
      syncing = false;
    };

    const onMainScroll = () => syncScrollLeft(scrollEl, scrollEl.scrollLeft);
    const onTotalsScroll = () => syncScrollLeft(totalsEl, totalsEl.scrollLeft);
    const onHScroll = () => syncScrollLeft(hScrollEl, hScrollEl.scrollLeft);

    scrollEl.addEventListener("scroll", onMainScroll);
    totalsEl.addEventListener("scroll", onTotalsScroll);
    hScrollEl.addEventListener("scroll", onHScroll);

    return () => {
      scrollEl.removeEventListener("scroll", onMainScroll);
      totalsEl.removeEventListener("scroll", onTotalsScroll);
      hScrollEl.removeEventListener("scroll", onHScroll);
    };
  }, [searched, pivotData.dates.length, tableData.length]);

  const renderReportTable = () => {
    const { dates, parties } = pivotData;

    if (!searched && !loading) {
      return (
        <div className="dos-empty-state">
          <i className="ri-grid-line" />
          <p className="mb-0">
            Select filters and click Search to generate the report.
          </p>
        </div>
      );
    }

    if (!dates.length || !parties.length) {
      return (
        <div className="dos-empty-state">
          <i className="ri-grid-line" />
          <p className="mb-0">
            No outstanding records for the selected period.
          </p>
        </div>
      );
    }

    const minWidth = `${Math.max(720, 220 + dates.length * 120)}px`;

    return (
      <div className="dos-common-table-wrap">
        <div className="dos-table-panel">
          <div className="dos-table-scroll-area">
            <CommonTable
              ref={tableRef}
              columns={tableColumns}
              data={tableData}
              loading={false}
              autoHeight
              autoHeightOffset={140}
              minWidth={minWidth}
              showTotals={false}
              rowsPerPage="all"
            />
          </div>
          <div
            ref={dayTotalsRef}
            className="dos-day-totals d-print-none"
            aria-label="Day-wise outstanding totals"
          >
            <table
              className="dos-day-totals-table mb-0"
              style={{ minWidth, width: minWidth }}
            >
              <colgroup>
                <col style={{ width: "220px" }} />
                {dates.map((d) => (
                  <col key={d} style={{ width: "120px" }} />
                ))}
              </colgroup>
              <tbody>
                <tr>
                  <td className="dos-day-totals-label">
                    <span className="dos-day-totals-badge">Overall Total</span>
                    <span className="dos-day-totals-count">
                      {rowsForTotals.length} parties
                    </span>
                  </td>
                  {dates.map((d) => (
                    <td key={d} className="dos-day-totals-value">
                      {fmtMoneyOrBlank(dateColumnTotals[d])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div
            ref={hScrollRef}
            className="dos-table-hscroll d-print-none"
            aria-hidden="true"
          >
            <div style={{ minWidth, width: minWidth, height: 1 }} />
          </div>
        </div>
      </div>
    );
  };

  const renderSkeleton = () => (
    <div className="px-3 py-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="dos-skeleton dos-skeleton-row" />
      ))}
    </div>
  );

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Row>
            <Col xs={12}>
              <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 className="mb-sm-0">Daily Outstanding Report</h4>
              </div>
            </Col>
          </Row>

          <Card className="mb-3">
            <CardBody>
              <Row className="g-3">
                <Col xs={12} md={6} xl={4}>
                  <Label>Party</Label>
                  <Select
                    value={selectedParty}
                    onChange={setSelectedParty}
                    options={partyOptions}
                    isClearable={false}
                    isSearchable
                    placeholder="All Parties"
                    classNamePrefix="dos-select"
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={selectMenuStyles}
                  />
                </Col>
                <Col xs={12} md={6} xl={4}>
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setDatePreset(null);
                    }}
                  />
                </Col>
                <Col xs={12} md={6} xl={4}>
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setDatePreset(null);
                    }}
                  />
                </Col>
              </Row>

              <Row className="mt-3 align-items-center">
                <Col md={8}>
                  <div className="dos-date-presets d-print-none">
                    <span className="dos-preset-label">Quick:</span>
                    <div className="dos-preset-group" role="group" aria-label="Quick date range">
                      <Button
                        type="button"
                        size="sm"
                        color={datePreset === "month" ? "soft-primary" : "light"}
                        className={`dos-preset-btn rounded-pill${datePreset === "month" ? " dos-preset-active" : ""}`}
                        onClick={() => applyDatePreset("month")}
                      >
                        This Month
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        color={datePreset === "last30" ? "soft-primary" : "light"}
                        className={`dos-preset-btn rounded-pill${datePreset === "last30" ? " dos-preset-active" : ""}`}
                        onClick={() => applyDatePreset("last30")}
                      >
                        Last 30 Days
                      </Button>
                    </div>
                  </div>
                </Col>
                <Col
                  md={4}
                  className="d-flex justify-content-end gap-2 text-end dos-filter-actions flex-wrap"
                >
                  <Button color="soft-secondary" onClick={handleClear}>
                    Clear
                  </Button>
                  <Button
                    color={viewMode === "table" ? "primary" : "soft-primary"}
                    className="d-print-none"
                    onClick={() => runReport("table")}
                    disabled={loading}
                  >
                    {loading && viewMode === "table" ? (
                      <Spinner size="sm" className="me-1" />
                    ) : (
                      <i className="ri-table-2 me-1" />
                    )}
                    Table View
                  </Button>
                  <Button
                    color={viewMode === "calendar" ? "info" : "soft-info"}
                    className="d-print-none"
                    onClick={() => runReport("calendar")}
                    disabled={loading}
                  >
                    {loading && viewMode === "calendar" ? (
                      <Spinner size="sm" className="me-1" />
                    ) : (
                      <i className="ri-calendar-2-line me-1" />
                    )}
                    Calendar View
                  </Button>
                  {viewMode === "table" ? (
                    <Button
                      color="link"
                      className="dos-excel-btn border-0 shadow-none text-success d-inline-flex align-items-center justify-content-center"
                      onClick={handleExportExcel}
                      disabled={!normalizedRows.length}
                      title="Export Excel"
                      style={{
                        fontSize: "2.4rem",
                        height: "40px",
                        width: "40px",
                        padding: 0,
                      }}
                    >
                      <i className="ri-file-excel-2-fill align-bottom" />
                    </Button>
                  ) : (
                    <Button
                      color="danger"
                      outline
                      size="sm"
                      onClick={handleCalendarPdf}
                      disabled={!calendarExportReady || calendarPdfExporting}
                      title="Download PDF"
                    >
                      {calendarPdfExporting ? (
                        <Spinner size="sm" />
                      ) : (
                        <i className="ri-file-pdf-line" />
                      )}
                    </Button>
                  )}
                </Col>
              </Row>

              {error && (
                <Alert color="danger" className="mt-3 mb-0 py-2">
                  <i className="ri-error-warning-line me-1" />
                  {error}
                </Alert>
              )}
            </CardBody>
          </Card>

          {viewMode === "calendar" && (searched || loading) && (
            <DailyOSCalendarPanel
              ref={calendarPanelRef}
              fromDate={fromDate}
              toDate={toDate}
              calendarData={calendarData}
              loading={loading}
              generated={searched && !loading}
            />
          )}

          {viewMode === "table" && (searched || loading) && (
            <Card>
              <div className="text-start">
                <HeaderForAllReport reportName="Daily Outstanding Report" />
              </div>

              <CardBody className="pt-3 pl-3 pr-3 pb-3">
                {loading ? renderSkeleton() : renderReportTable()}

                {normalizedRows.length > 0 && !loading && (
                  <div className="mt-2 dos-heatmap-legend d-flex flex-wrap gap-3 small d-print-none">
                    <span>
                      <span className="dos-legend-swatch dos-legend-increase" />
                      ↑ Increased vs prior day
                    </span>
                    <span>
                      <span className="dos-legend-swatch dos-legend-decrease" />
                      ↓ Decreased vs prior day
                    </span>
                  </div>
                )}
              </CardBody>

              <FooterForAllRpt />
            </Card>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default DailyOSReport;
