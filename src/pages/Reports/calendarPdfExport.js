/** Months (YYYY-MM-01) from fromDate through toDate inclusive. */
export const getMonthsInRange = (fromYmd, toYmd) => {
  if (!fromYmd) return [];
  const endYmd = toYmd || fromYmd;
  const start = new Date(`${fromYmd}T12:00:00`);
  const end = new Date(`${endYmd}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const months = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  if (cur > last) {
    months.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-01`,
    );
    return months;
  }

  while (cur <= last) {
    months.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-01`,
    );
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
};

export const waitForPaint = (ms = 320) =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, ms);
      });
    });
  });

export const cloneCalendarPrintSection = (sourceEl) => {
  const clone = sourceEl.cloneNode(true);
  clone.removeAttribute("id");
  clone.querySelector(".dos-calendar-loading")?.remove();
  clone
    .querySelectorAll(".fc-prev-button, .fc-next-button, .fc-today-button")
    .forEach((el) => el.remove());
  clone.querySelector(".dos-cal-legend-hint")?.remove();
  clone
    .querySelectorAll(".dos-day-selected")
    .forEach((el) => el.classList.remove("dos-day-selected"));
  return clone.outerHTML;
};

const PRINT_ROOT_ID = "dos-calendar-print-root";
const PRINT_STYLE_ID = "dos-calendar-print-style";

const cleanupPrintArtifacts = () => {
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();
};

/**
 * Prints calendar in the current tab (no pop-up / no extra packages).
 * Each month in the date range is captured from the live calendar, then
 * shown only in the print preview — choose "Save as PDF" in the dialog.
 */
export const exportCalendarToPdf = async ({
  sourceEl,
  calendarApi,
  paintCells,
  fromDate,
  toDate,
}) => {
  const months = getMonthsInRange(fromDate, toDate);
  if (!months.length) return { ok: false, reason: "no-range" };

  const savedDate = calendarApi.getDate();
  const pageHtml = [];

  try {
    for (const monthStart of months) {
      calendarApi.gotoDate(monthStart);
      await waitForPaint();
      paintCells();
      await waitForPaint();
      pageHtml.push(
        `<div class="dos-pdf-page">${cloneCalendarPrintSection(sourceEl)}</div>`,
      );
    }
  } finally {
    calendarApi.gotoDate(savedDate);
    paintCells();
  }

  cleanupPrintArtifacts();

  const printRoot = document.createElement("div");
  printRoot.id = PRINT_ROOT_ID;
  printRoot.innerHTML = pageHtml.join("");

  const styleEl = document.createElement("style");
  styleEl.id = PRINT_STYLE_ID;
  styleEl.textContent = `
    @media screen {
      #${PRINT_ROOT_ID} {
        position: fixed;
        left: -99999px;
        top: 0;
        width: 0;
        height: 0;
        overflow: hidden;
        pointer-events: none;
      }
    }
   @media print {
  @page {
    size: A4 landscape;
    margin: 4mm; /* reduced margin */
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    zoom: 1; /* little zoom in */
  }

  body * {
    visibility: hidden !important;
  }

  #dos-calendar-print-root,
  #dos-calendar-print-root * {
    visibility: visible !important;
  }

  #dos-calendar-print-root {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    display: block !important;
    transform: scale(1.08);
    transform-origin: top center;
  }

  .dos-pdf-page {
    page-break-after: always;
    break-after: page;
    padding: 2mm;
  }

  .dos-pdf-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .dos-calendar-loading,
  .fc-prev-button,
  .fc-next-button,
  .fc-today-button,
  .dos-cal-legend-hint {
    display: none !important;
  }
}
  `;

  document.head.appendChild(styleEl);
  document.body.appendChild(printRoot);

  await waitForPaint(450);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      cleanupPrintArtifacts();
      resolve(ok ? { ok: true, mode: "print" } : { ok: false, reason: "print-cancelled" });
    };

    const onAfterPrint = () => {
      window.removeEventListener("afterprint", onAfterPrint);
      finish(true);
    };

    window.addEventListener("afterprint", onAfterPrint);

    try {
      window.print();
    } catch {
      finish(false);
      return;
    }

    setTimeout(() => {
      window.removeEventListener("afterprint", onAfterPrint);
      if (document.getElementById(PRINT_ROOT_ID)) {
        finish(true);
      }
    }, 3000);
  });
};
