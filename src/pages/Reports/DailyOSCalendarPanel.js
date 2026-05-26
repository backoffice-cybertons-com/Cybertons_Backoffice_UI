import React, {
  forwardRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useImperativeHandle,
} from "react";
import { toast } from "react-toastify";
import {
  Card,
  CardBody,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
} from "reactstrap";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";

import HeaderForAllReport from "../../Components/Common/HeaderForAllRpt";
import FooterForAllRpt from "../../Components/Common/FooterForAllRpt";

import "./DailyOSCalendarView.css";
import { exportCalendarToPdf } from "./calendarPdfExport";

const toLocalYMD = (d) => {
  if (!d) return "";
  if (typeof d === "string") {
    const iso = d.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
  }
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
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

const fmtAmount = (n) => {
  const num = Number(n);
  if (Number.isNaN(num) || !num) return "";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtTerms = (n) => {
  const num = Number(n);
  if (num == null || Number.isNaN(num) || !num) return "";
  return num.toFixed(2);
};

const fmtAmountCell = (n) => {
  const num = Number(n);
  if (Number.isNaN(num) || num === 0) return "-";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtTermsCell = (n) => {
  const num = Number(n);
  if (num == null || Number.isNaN(num) || num === 0) return "-";
  return num.toFixed(2);
};

const CALENDAR_METRICS = [
  {
    type: "sale",
    label: "S",
    title: "Sales",
    field: "totalSale",
    fmt: fmtAmountCell,
  },
  {
    type: "receipt",
    label: "R",
    title: "Receipt",
    field: "totalReceipt",
    fmt: fmtAmountCell,
  },
  {
    type: "os",
    label: "O",
    title: "Outstanding",
    field: "totalOs",
    fmt: fmtAmountCell,
  },
  {
    type: "term",
    label: "T",
    title: "Terms",
    field: "avgTerms",
    fmt: fmtTermsCell,
  },
];

const normalizeCalendarRow = (row) => ({
  reportDate: toLocalYMD(row.reportDate ?? row.ReportDate),
  totalSale: Number(row.totalSale ?? row.TotalSale ?? 0),
  totalReceipt: Number(row.totalReceipt ?? row.TotalReceipt ?? 0),
  totalOs: Number(row.totalOs ?? row.TotalOs ?? 0),
  avgTerms: Number(row.avgTerms ?? row.AvgTerms ?? 0),
});

const DailyOSCalendarPanel = forwardRef(
  (
    { fromDate, toDate, calendarData = [], loading = false, generated = false },
    ref,
  ) => {
    const today = useMemo(() => new Date(), []);
    const firstOfMonth = useMemo(
      () => new Date(today.getFullYear(), today.getMonth(), 1),
      [today],
    );

    const [selectedMonth, setSelectedMonth] = useState(() =>
      (fromDate || toLocalYMD(firstOfMonth)).slice(0, 7),
    );
    const [selectedDateDetails, setSelectedDateDetails] = useState(null);
    const [dateDetailModalOpen, setDateDetailModalOpen] = useState(false);
    const [highlightedDate, setHighlightedDate] = useState(null);
    const calendarRef = useRef(null);

    const calendarDataMap = useMemo(() => {
      const map = {};
      (calendarData || []).forEach((row) => {
        const normalized = normalizeCalendarRow(row);
        if (normalized.reportDate) {
          map[normalized.reportDate] = normalized;
        }
      });
      return map;
    }, [calendarData]);

    useEffect(() => {
      if (fromDate) {
        setSelectedMonth(fromDate.slice(0, 7));
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          calendarApi.gotoDate(fromDate);
        }
      }
    }, [fromDate, generated]);

    const handleCalendarDatesSet = useCallback((dateInfo) => {
      const viewStart = dateInfo.view?.currentStart ?? dateInfo.start;
      setSelectedMonth(
        `${viewStart.getFullYear()}-${String(viewStart.getMonth() + 1).padStart(2, "0")}`,
      );
    }, []);

    const handleCalendarDateClick = useCallback(
      (info) => {
        const dateKey = toLocalYMD(info.date);
        const details = calendarDataMap[dateKey] || {
          reportDate: dateKey,
          totalSale: 0,
          totalReceipt: 0,
          totalOs: 0,
          avgTerms: 0,
        };
        setHighlightedDate(dateKey);
        setSelectedDateDetails(details);
        setDateDetailModalOpen(true);
      },
      [calendarDataMap],
    );

    const buildMetricsHtml = useCallback((data) => {
      if (!data) return "";

      const rowHtml = CALENDAR_METRICS.map((m) => {
        const value = m.fmt(data[m.field]);
        const isEmpty = value === "-";
        const valueClass = isEmpty
          ? "metric-val metric-val--empty"
          : `metric-val metric-val--${m.type}`;
        return `<div class="metric-row">
          <span class="metric-key metric-key--${m.type}" title="${m.title}">${m.label}</span>
          <span class="${valueClass}">${value}</span>
        </div>`;
      }).join("");

      return `<div class="calendar-metrics">${rowHtml}</div>`;
    }, []);

    const paintCalendarCells = useCallback(() => {
      const root = calendarRef.current?.getApi()?.el;
      if (!root) return;

      root.querySelectorAll(".fc-daygrid-day").forEach((dayEl) => {
        const dateKey = dayEl.getAttribute("data-date");
        if (!dateKey) return;

        const frame = dayEl.querySelector(".fc-daygrid-day-frame");
        if (!frame) return;

        let metricsWrap = frame.querySelector(".calendar-metrics-host");
        if (!metricsWrap) {
          metricsWrap = document.createElement("div");
          metricsWrap.className = "calendar-metrics-host";
          frame.appendChild(metricsWrap);
        }

        const data = calendarDataMap[dateKey];
        metricsWrap.innerHTML = buildMetricsHtml(data);
        dayEl.classList.toggle("dos-day-selected", dateKey === highlightedDate);
      });
    }, [calendarDataMap, buildMetricsHtml, highlightedDate]);

    useEffect(() => {
      paintCalendarCells();
      calendarRef.current?.getApi()?.render();
    }, [calendarDataMap, paintCalendarCells, selectedMonth]);

    useImperativeHandle(
      ref,
      () => ({
        exportPdf: async () => {
          if (!calendarData?.length) {
            toast.warn("No calendar data to export.");
            return false;
          }
          const sourceEl = document.getElementById("dosCalendarPrintArea");
          const api = calendarRef.current?.getApi();
          if (!sourceEl || !api) {
            toast.warn("Calendar is not ready.");
            return false;
          }

          const toastId = "dos-cal-pdf";

          try {
            const result = await exportCalendarToPdf({
              sourceEl,
              calendarApi: api,
              paintCells: paintCalendarCells,
              fromDate,
              toDate: toDate || fromDate,
            });

            if (!result.ok) {
              return false;
            }

            return true;
          } catch (err) {
            console.error("Calendar PDF export failed:", err);
            toast.error("Failed to generate PDF.");
            return false;
          }
        },
      }),
      [calendarData, fromDate, toDate, paintCalendarCells],
    );

    return (
      <>
        <Card id="dosCalendarPrintArea">
          <div className="text-start">
            <HeaderForAllReport reportName="Daily Outstanding — Calendar Analytics" />
          </div>
          <CardBody className="pt-3 pb-3">
            <div className="dos-calendar-wrap position-relative">
              {loading && (
                <div className="dos-calendar-loading">
                  <Spinner size="sm" color="primary" className="me-2" />
                  Loading…
                </div>
              )}
              <FullCalendar
                ref={calendarRef}
                plugins={[BootstrapTheme, dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                themeSystem="bootstrap"
                initialDate={fromDate || toLocalYMD(firstOfMonth)}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "",
                }}
                fixedWeekCount={false}
                height="auto"
                dayMaxEvents={false}
                selectable={false}
                editable={false}
                datesSet={(info) => {
                  handleCalendarDatesSet(info);
                  requestAnimationFrame(paintCalendarCells);
                }}
                dateClick={handleCalendarDateClick}
                dayCellDidMount={() => {
                  requestAnimationFrame(paintCalendarCells);
                }}
              />
            </div>
            <div className="dos-cal-legend">
              <div className="dos-cal-legend-pills">
                <span className="dos-legend-pill dos-legend-pill--sale">
                  <span className="dos-legend-pill__key">S</span> Sales
                </span>
                <span className="dos-legend-pill dos-legend-pill--receipt">
                  <span className="dos-legend-pill__key">R</span> Receipt
                </span>
                <span className="dos-legend-pill dos-legend-pill--os">
                  <span className="dos-legend-pill__key">O</span> Outstanding
                </span>
                <span className="dos-legend-pill dos-legend-pill--term">
                  <span className="dos-legend-pill__key">T</span> Terms
                </span>
              </div>
              <span className="dos-cal-legend-hint">
                Click a day for full details
              </span>
            </div>
          </CardBody>
          <FooterForAllRpt />
        </Card>

        <Modal
          isOpen={dateDetailModalOpen}
          toggle={() => setDateDetailModalOpen(false)}
          centered
          size="sm"
        >
          <ModalHeader toggle={() => setDateDetailModalOpen(false)}>
            {selectedDateDetails?.reportDate
              ? fmtDate(selectedDateDetails.reportDate)
              : "Day summary"}
          </ModalHeader>
          <ModalBody className="dos-cal-detail-modal">
            {selectedDateDetails ? (
              (() => {
                const rows = [
                  {
                    key: "sale",
                    label: "Sales",
                    value: fmtAmount(selectedDateDetails.totalSale),
                  },
                  {
                    key: "receipt",
                    label: "Receipt",
                    value: fmtAmount(selectedDateDetails.totalReceipt),
                  },
                  {
                    key: "os",
                    label: "Outstanding",
                    value: fmtAmount(selectedDateDetails.totalOs),
                  },
                  {
                    key: "terms",
                    label: "Terms",
                    value: fmtTerms(selectedDateDetails.avgTerms),
                  },
                ].filter((r) => r.value);

                if (!rows.length) {
                  return (
                    <p className="text-muted mb-0">
                      No activity for this date.
                    </p>
                  );
                }

                return (
                  <ul className="list-unstyled mb-0 dos-cal-detail-list">
                    {rows.map((r) => (
                      <li key={r.key} className={`dos-detail-${r.key}`}>
                        <span>{r.label}</span>
                        <strong>{r.value}</strong>
                      </li>
                    ))}
                  </ul>
                );
              })()
            ) : (
              <p className="text-muted mb-0">No data for this date.</p>
            )}
          </ModalBody>
        </Modal>
      </>
    );
  },
);

DailyOSCalendarPanel.displayName = "DailyOSCalendarPanel";

export default DailyOSCalendarPanel;
