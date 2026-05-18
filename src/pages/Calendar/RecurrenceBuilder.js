import React, { useMemo, useState } from "react";
import { Row, Col, Label, Input, FormGroup, Button } from "reactstrap";
import Flatpickr from "react-flatpickr";
import moment from "moment";
import "./recurrence.css";

const parseManualTime = (timeStr, currentVal) => {
  if (!timeStr) return currentVal;
  
  const formats = [
    "hh:mm A", "hh:mm a", "h:mm A", "h:mm a", 
    "HH:mm", "H:mm", "HH:mm:ss", "hh:mma", "hh:mmA"
  ];
  let parsed = moment(timeStr, formats, true);
  
  if (parsed.isValid()) {
    return parsed.format("HH:mm:ss");
  }

  parsed = moment(timeStr, ["HH:mm", "H:mm", "HH:mm:ss"], false);
  if (parsed.isValid()) {
    let hour = parsed.hour();
    const currentIsPM = moment(currentVal, "HH:mm:ss").format("A") === "PM";
    if (currentIsPM && hour < 12 && !/pm/i.test(timeStr) && !/am/i.test(timeStr)) {
      hour += 12;
    }
    parsed.hour(hour);
    return parsed.format("HH:mm:ss");
  }

  return currentVal;
};

const RecurrenceBuilder = ({ values, setFieldValue }) => {
  const recurrenceTypes = [
    { label: "Daily", value: "DAILY" },
    { label: "Weekly", value: "WEEKLY" },
    { label: "Monthly", value: "MONTHLY" },
    { label: "Yearly", value: "YEARLY" },
  ];

  const weekdays = [
    { label: "M", full: "Monday", value: "MO" },
    { label: "T", full: "Tuesday", value: "TU" },
    { label: "W", full: "Wednesday", value: "WE" },
    { label: "T", full: "Thursday", value: "TH" },
    { label: "F", full: "Friday", value: "FR" },
    { label: "S", full: "Saturday", value: "SA" },
    { label: "S", full: "Sunday", value: "SU" },
  ];

  const weekNumbers = [
    { label: "First", value: 1 },
    { label: "Second", value: 2 },
    { label: "Third", value: 3 },
    { label: "Fourth", value: 4 },
    { label: "Last", value: -1 },
  ];

  const weekDaysFull = [
    { label: "Monday", value: "MO" },
    { label: "Tuesday", value: "TU" },
    { label: "Wednesday", value: "WE" },
    { label: "Thursday", value: "TH" },
    { label: "Friday", value: "FR" },
    { label: "Saturday", value: "SA" },
    { label: "Sunday", value: "SU" },
  ];

  const months = [
    { label: "January", value: 1 },
    { label: "February", value: 2 },
    { label: "March", value: 3 },
    { label: "April", value: 4 },
    { label: "May", value: 5 },
    { label: "June", value: 6 },
    { label: "July", value: 7 },
    { label: "August", value: 8 },
    { label: "September", value: 9 },
    { label: "October", value: 10 },
    { label: "November", value: 11 },
    { label: "December", value: 12 },
  ];

  const reminders = [
    { label: "Same day", value: 0 },
    { label: "1 day before", value: -1440 },
    { label: "2 days before", value: -2880 },
    { label: "3 days before", value: -4320 },
    { label: "1 week before", value: -10080 },
  ];

  // Helper to extract base day offset based on calendar days difference
  const getBaseDayOffset = (offsetMinutes) => {
    if (offsetMinutes === null || offsetMinutes === undefined) return "";
    
    const reminderVal = values.reminderDate ? values.reminderDate : new Date();
    const assignedVal = values.assignedDate ? values.assignedDate : new Date();
    
    const reminderDT = moment(reminderVal);
    const assignedDT = moment(assignedVal);
    
    if (!reminderDT.isValid() || !assignedDT.isValid()) {
      return Math.ceil(offsetMinutes / 1440) * 1440;
    }
    
    const diffDays = reminderDT.startOf("day").diff(assignedDT.startOf("day"), 'days');
    return diffDays * 1440;
  };

  const currentBaseDay = getBaseDayOffset(values.reminderOffsetMinutes);
  const isPredefined = values.reminderOffsetMinutes !== null && values.reminderOffsetMinutes !== undefined && reminders.some(r => r.value === currentBaseDay);

  const [isCustomMode, setIsCustomMode] = useState(() => {
    if (values.reminderOffsetMinutes === null || values.reminderOffsetMinutes === undefined) return false;
    return !isPredefined;
  });

  const currentSelectValue = isCustomMode ? "custom" : ((values.reminderOffsetMinutes === null || values.reminderOffsetMinutes === undefined) ? "" : (isPredefined ? currentBaseDay : "custom"));

  const handleReminderTimeChange = (newReminderTimeStr) => {
    setFieldValue("reminderTime", newReminderTimeStr);
    const aTime = moment(values.assignedTime || "00:00:00", "HH:mm:ss");
    const rTime = moment(newReminderTimeStr, "HH:mm:ss");
    let timeDiff = rTime.diff(aTime, 'minutes');
    const newOffset = currentBaseDay + timeDiff;
    setFieldValue("reminderOffsetMinutes", newOffset);

    const aDateStr = moment(values.assignedDate || new Date()).format("YYYY-MM-DD");
    const calculatedReminderDT = moment(`${aDateStr} ${values.assignedTime || "00:00:00"}`, "YYYY-MM-DD HH:mm:ss").add(newOffset, 'minutes');
    setFieldValue("reminderDate", calculatedReminderDT.toDate());
  };

  const handleCustomReminderTimeChange = (newReminderTimeStr) => {
    setFieldValue("reminderTime", newReminderTimeStr);
    const startDT = values.allDay
      ? moment(values.assignedDate || new Date()).startOf("day")
      : moment(
        `${moment(values.assignedDate || new Date()).format("YYYY-MM-DD")} ${values.assignedTime || "00:00:00"}`,
        "YYYY-MM-DD HH:mm:ss"
      );
    const reminderDT = moment(`${moment(values.reminderDate || values.assignedDate || new Date()).format("YYYY-MM-DD")} ${newReminderTimeStr}`, "YYYY-MM-DD HH:mm:ss");
    setFieldValue("reminderOffsetMinutes", reminderDT.diff(startDT, 'minutes'));
  };

  const toggleDay = (dayValue) => {
    const currentDays = values.recurrenceDays || [];
    if (currentDays.includes(dayValue)) {
      setFieldValue(
        "recurrenceDays",
        currentDays.filter((d) => d !== dayValue)
      );
    } else {
      setFieldValue("recurrenceDays", [...currentDays, dayValue]);
    }
  };

  const generateSummary = useMemo(() => {
    let summary = "Every ";
    const interval = values.recurrenceInterval || 1;
    const type = values.recurrenceType;

    if (type === "DAILY") {
      summary += interval === 1 ? "day" : `${interval} days`;
    } else if (type === "WEEKLY") {
      summary += interval === 1 ? "week" : `${interval} weeks`;
      const selectedDays = values.recurrenceDays || [];
      if (selectedDays.length > 0) {
        const dayNames = weekdays
          .filter((d) => selectedDays.includes(d.value))
          .map((d) => d.full);
        if (dayNames.length === 1) {
          summary += ` on ${dayNames[0]}`;
        } else if (dayNames.length > 1) {
          const last = dayNames.pop();
          summary += ` on ${dayNames.join(", ")} and ${last}`;
        }
      }
    } else if (type === "MONTHLY") {
      summary += interval === 1 ? "month" : `${interval} months`;
      if (values.recurrenceMonthOption === "DAY") {
        summary += ` on day ${values.recurrenceMonthDay || 1}`;
      } else {
        const weekNum = weekNumbers.find(
          (w) => w.value === values.recurrenceWeekNumber
        )?.label;
        const weekDay = weekDaysFull.find(
          (d) => d.value === values.recurrenceWeekDay
        )?.label;
        summary += ` on the ${weekNum} ${weekDay}`;
      }
    } else if (type === "YEARLY") {
      const month = months.find((m) => m.value === values.recurrenceYearMonth)?.label;
      summary += ` year on ${month} ${values.recurrenceYearDay || 1}`;
    }

    if (values.recurrenceEndType === "DATE" && values.recurrenceEndDate) {
      summary += ` until ${moment(values.recurrenceEndDate).format("DD MMM YYYY")}`;
    } else if (values.recurrenceEndType === "COUNT" && values.recurrenceOccurrenceCount) {
      summary += ` for ${values.recurrenceOccurrenceCount} occurrences`;
    }

    return summary;
  }, [values]);

  return (
    <div className="recurrence-builder-card">
      <div className="recurrence-type-selector">
        {recurrenceTypes.map((type) => (
          <div
            key={type.value}
            className={`type-card ${values.recurrenceType === type.value ? "active" : ""
              }`}
            onClick={() => setFieldValue("recurrenceType", type.value)}
          >
            {type.label}
          </div>
        ))}
      </div>

      <div className="recurrence-config-content">
        {/* REPEAT EVERY SECTION */}
        <Row className="align-items-center mb-4">
          <Col xs="auto">
            <span className="section-label mb-0">Every</span>
          </Col>
          <Col xs="auto">
            <Input
              type="number"
              min="1"
              className="form-control input-number-sm"
              value={values.recurrenceInterval}
              onChange={(e) =>
                setFieldValue("recurrenceInterval", parseInt(e.target.value) || 1)
              }
            />
          </Col>
          <Col xs="auto">
            <span className="section-label mb-0">
              {values.recurrenceType === "DAILY"
                ? "day(s)"
                : values.recurrenceType === "WEEKLY"
                  ? "week(s)"
                  : values.recurrenceType === "MONTHLY"
                    ? "month(s)"
                    : "year(s)"}
            </span>
          </Col>
        </Row>

        {/* WEEKLY SPECIFIC UI */}
        {values.recurrenceType === "WEEKLY" && (
          <div className="mb-4">
            <Label className="section-label">Repeat on</Label>
            <div className="weekday-selector">
              {weekdays.map((day) => (
                <div
                  key={day.value}
                  className={`weekday-circle ${(values.recurrenceDays || []).includes(day.value) ? "active" : ""
                    }`}
                  onClick={() => toggleDay(day.value)}
                  title={day.full}
                >
                  {day.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MONTHLY SPECIFIC UI */}
        {values.recurrenceType === "MONTHLY" && (
          <div className="mb-4">
            <Label className="section-label">Repeat on</Label>
            <FormGroup check className="mb-2">
              <Input
                name="recurrenceMonthOption"
                type="radio"
                checked={values.recurrenceMonthOption === "DAY"}
                onChange={() => setFieldValue("recurrenceMonthOption", "DAY")}
              />{" "}
              <Label check>
                Day{" "}
                <Input
                  type="number"
                  min="1"
                  max="31"
                  style={{ width: "60px", display: "inline-block", margin: "0 5px" }}
                  className="form-control form-control-sm"
                  value={values.recurrenceMonthDay}
                  onChange={(e) => setFieldValue("recurrenceMonthDay", e.target.value)}
                  disabled={values.recurrenceMonthOption !== "DAY"}
                />
              </Label>
            </FormGroup>
            <FormGroup check>
              <Input
                name="recurrenceMonthOption"
                type="radio"
                checked={values.recurrenceMonthOption === "WEEKLY"}
                onChange={() => setFieldValue("recurrenceMonthOption", "WEEKLY")}
              />{" "}
              <Label check>
                On the{" "}
                <select
                  className="form-select form-select-sm d-inline-block w-auto mx-1"
                  value={values.recurrenceWeekNumber}
                  onChange={(e) => setFieldValue("recurrenceWeekNumber", parseInt(e.target.value))}
                  disabled={values.recurrenceMonthOption !== "WEEKLY"}
                >
                  {weekNumbers.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
                <select
                  className="form-select form-select-sm d-inline-block w-auto mx-1"
                  value={values.recurrenceWeekDay}
                  onChange={(e) => setFieldValue("recurrenceWeekDay", e.target.value)}
                  disabled={values.recurrenceMonthOption !== "WEEKLY"}
                >
                  {weekDaysFull.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Label>
            </FormGroup>
          </div>
        )}

        {/* YEARLY SPECIFIC UI */}
        {values.recurrenceType === "YEARLY" && (
          <div className="mb-4">
            <Label className="section-label">On</Label>
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm w-auto"
                value={values.recurrenceYearMonth}
                onChange={(e) => setFieldValue("recurrenceYearMonth", parseInt(e.target.value))}
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <Input
                type="number"
                min="1"
                max="31"
                className="form-control form-control-sm w-auto"
                style={{ width: "60px" }}
                value={values.recurrenceYearDay}
                onChange={(e) => setFieldValue("recurrenceYearDay", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* END CONDITION */}
        <div className="mb-4 pt-3 border-top">
          <Label className="section-label">Ends</Label>
          <div className="d-flex flex-column gap-2">
            <FormGroup check>
              <Input
                name="recurrenceEndType"
                type="radio"
                checked={values.recurrenceEndType === "NEVER"}
                onChange={() => setFieldValue("recurrenceEndType", "NEVER")}
              />{" "}
              <Label check>Never</Label>
            </FormGroup>
            <FormGroup check className="d-flex align-items-center gap-2">
              <Input
                name="recurrenceEndType"
                type="radio"
                checked={values.recurrenceEndType === "DATE"}
                onChange={() => setFieldValue("recurrenceEndType", "DATE")}
              />{" "}
              <Label check className="mb-0">On</Label>
              <Flatpickr
                className="form-control form-control-sm w-auto"
                options={{ dateFormat: "Y-m-d" }}
                value={values.recurrenceEndDate}
                onChange={(date) => setFieldValue("recurrenceEndDate", date[0])}
                disabled={values.recurrenceEndType !== "DATE"}
              />
            </FormGroup>
            <FormGroup check className="d-flex align-items-center gap-2">
              <Input
                name="recurrenceEndType"
                type="radio"
                checked={values.recurrenceEndType === "COUNT"}
                onChange={() => setFieldValue("recurrenceEndType", "COUNT")}
              />{" "}
              <Label check className="mb-0">After</Label>
              <Input
                type="number"
                min="1"
                className="form-control form-control-sm w-auto"
                style={{ width: "60px" }}
                value={values.recurrenceOccurrenceCount}
                onChange={(e) => setFieldValue("recurrenceOccurrenceCount", e.target.value)}
                disabled={values.recurrenceEndType !== "COUNT"}
              />
              <span className="fs-12 text-muted">occurrences</span>
            </FormGroup>
          </div>
        </div>

        {/* REMINDER OFFSET */}
        <div className="mb-4 pt-3 border-top">
          <Label className="section-label">Reminder</Label>
          <div className="d-flex flex-column gap-2">
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm w-auto"
                value={currentSelectValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setIsCustomMode(false);
                    setFieldValue("reminderOffsetMinutes", null);
                    setFieldValue("reminder", false);
                  } else if (val === "custom") {
                    setIsCustomMode(true);
                    setFieldValue("reminder", true);
                    if (!values.reminderDate) {
                      setFieldValue("reminderDate", values.assignedDate || new Date());
                    }
                    const startDT = values.allDay
                      ? moment(values.assignedDate || new Date()).startOf("day")
                      : moment(
                        `${moment(values.assignedDate || new Date()).format("YYYY-MM-DD")} ${values.assignedTime || "00:00:00"}`,
                        "YYYY-MM-DD HH:mm:ss"
                      );
                    const reminderDT = moment(`${moment(values.reminderDate || values.assignedDate || new Date()).format("YYYY-MM-DD")} ${values.reminderTime || "09:00:00"}`, "YYYY-MM-DD HH:mm:ss");
                    setFieldValue("reminderOffsetMinutes", reminderDT.diff(startDT, 'minutes'));
                  } else {
                    setIsCustomMode(false);
                    const newBase = parseInt(val);
                    const aTime = moment(values.assignedTime || "00:00:00", "HH:mm:ss");
                    const rTime = moment(values.reminderTime || values.assignedTime || "00:00:00", "HH:mm:ss");
                    let timeDiff = rTime.diff(aTime, 'minutes');
                    const newOffset = newBase + timeDiff;
                    setFieldValue("reminderOffsetMinutes", newOffset);
                    setFieldValue("reminder", true);

                    const aDateStr = moment(values.assignedDate || new Date()).format("YYYY-MM-DD");
                    const calculatedReminderDT = moment(`${aDateStr} ${values.assignedTime || "00:00:00"}`, "YYYY-MM-DD HH:mm:ss").add(newOffset, 'minutes');
                    setFieldValue("reminderDate", calculatedReminderDT.toDate());
                    setFieldValue("reminderTime", calculatedReminderDT.format("HH:mm:ss"));
                  }
                }}
              >
                <option value="">No Reminder</option>
                {reminders.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                <option value="custom">Custom Date</option>
              </select>

              {values.reminderOffsetMinutes !== null && currentSelectValue !== "custom" && (
                <div className="input-group input-group-sm w-auto">
                  <Flatpickr
                    className="form-control"
                    options={{
                      enableTime: true,
                      noCalendar: true,
                      dateFormat: "h:i K",
                      allowInput: true,
                      minuteIncrement: 1
                    }}
                    value={moment(values.reminderTime, "HH:mm:ss").toDate()}
                    onChange={(selectedDates) => {
                      if (selectedDates && selectedDates.length > 0) {
                        handleReminderTimeChange(moment(selectedDates[0]).format("HH:mm:ss"));
                      }
                    }}
                    onClose={(selectedDates) => {
                      if (selectedDates && selectedDates.length > 0) {
                        handleReminderTimeChange(moment(selectedDates[0]).format("HH:mm:ss"));
                      }
                    }}
                    onBlur={(e) => {
                      const parsedVal = parseManualTime(e.target.value, values.reminderTime);
                      handleReminderTimeChange(parsedVal);
                    }}
                  />
                  <span className="input-group-text"><i className="ri-time-line"></i></span>
                </div>
              )}
            </div>

            {currentSelectValue === "custom" && (
              <div className="d-flex align-items-center gap-2 mt-1 flex-wrap animation-fade-in">
                <div className="input-group input-group-sm w-auto">
                  <Flatpickr
                    className="form-control"
                    placeholder="Select Reminder Date"
                    options={{
                      dateFormat: "Y-m-d",
                      allowInput: true
                    }}
                    value={values.reminderDate}
                    onChange={(date) => {
                      if (date && date.length > 0) {
                        setFieldValue("reminderDate", date[0]);
                        const startDT = values.allDay
                          ? moment(values.assignedDate || new Date()).startOf("day")
                          : moment(
                            `${moment(values.assignedDate || new Date()).format("YYYY-MM-DD")} ${values.assignedTime || "00:00:00"}`,
                            "YYYY-MM-DD HH:mm:ss"
                          );
                        const reminderDT = moment(`${moment(date[0]).format("YYYY-MM-DD")} ${values.reminderTime || "09:00:00"}`, "YYYY-MM-DD HH:mm:ss");
                        setFieldValue("reminderOffsetMinutes", reminderDT.diff(startDT, 'minutes'));
                      }
                    }}
                  />
                  <span className="input-group-text"><i className="ri-calendar-event-line"></i></span>
                </div>

                <div className="input-group input-group-sm w-auto">
                  <Flatpickr
                    className="form-control"
                    options={{
                      enableTime: true,
                      noCalendar: true,
                      dateFormat: "h:i K",
                      allowInput: true,
                      minuteIncrement: 1
                    }}
                    value={moment(values.reminderTime, "HH:mm:ss").toDate()}
                    onChange={(selectedDates) => {
                      if (selectedDates && selectedDates.length > 0) {
                        handleCustomReminderTimeChange(moment(selectedDates[0]).format("HH:mm:ss"));
                      }
                    }}
                    onClose={(selectedDates) => {
                      if (selectedDates && selectedDates.length > 0) {
                        handleCustomReminderTimeChange(moment(selectedDates[0]).format("HH:mm:ss"));
                      }
                    }}
                    onBlur={(e) => {
                      const parsedVal = parseManualTime(e.target.value, values.reminderTime);
                      handleCustomReminderTimeChange(parsedVal);
                    }}
                  />
                  <span className="input-group-text"><i className="ri-time-line"></i></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SUMMARY BOX */}
        <div className="recurrence-summary-box">
          <span className="summary-label">Summary</span>
          <p>{generateSummary}</p>
        </div>
      </div>
    </div>
  );
};

export default RecurrenceBuilder;
