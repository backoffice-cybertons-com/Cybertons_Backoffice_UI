import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  Form,
  FormFeedback,
  Input,
  Label,
  Row,
  Col,
  Button,
  FormGroup,
  Collapse,
} from "reactstrap";
import Select from "react-select";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import * as Yup from "yup";
import { useFormik } from "formik";
import Flatpickr from "react-flatpickr";
import moment from "moment";
import RecurrenceBuilder from "./RecurrenceBuilder";
import { getMonthlyRecurrenceFields } from "./recurrenceUtils";
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

/**
 * TaskModal Component
 * Overhauled UI for Date/Time handling similar to Google Calendar.
 */
const TaskModal = ({
  isOpen,
  toggle = () => {},
  selectedTask,
  selectedDate,
  onSave,
  onDelete,
  loading,
  users = [],
}) => {
  const [isEditButton, setIsEditButton] = useState(true);
  const [actionModal, setActionModal] = useState({ isOpen: false, type: null, pendingValues: null });
  const [actionScope, setActionScope] = useState("this");
  const [saveAction, setSaveAction] = useState("task");


  // Create a stable reference for "now" to avoid re-initialization on every render
  const now = useMemo(() => new Date(), [isOpen]);

  // Generate time intervals for dropdown (15-min increments)
  const timeIntervals = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";
      const m = min.toString().padStart(2, "0");
      const label = `${h}:${m} ${ampm}`;
      const value = `${hour.toString().padStart(2, "0")}:${m}:00`;
      timeIntervals.push({ label, value });
    }
  }

  // Helper: Get nearest 15-min time value
  const getNearestTime = (date, offsetHours = 0) => {
    const d = new Date(date);
    d.setHours(d.getHours() + offsetHours);
    const minutes = d.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    d.setMinutes(roundedMinutes);
    d.setSeconds(0);
    return moment(d).format("HH:mm:ss");
  };

  // Helper: Priority Colors
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "danger";
      case "Medium": return "warning";
      case "Low": return "success";
      case "Done": return "info";
      default: return "primary";
    }
  };

  // Helper: Status Colors
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "warning";
      case "Completed": return "success";
      case "Canceled": return "danger";
      default: return "warning";
    }
  };

  // Formik Validation & State Management
  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: (selectedTask && selectedTask.id) || "",
      title: (selectedTask && selectedTask.title) || "",
      category: (selectedTask && selectedTask.category) || "bg-info-subtle",
      description: (selectedTask && selectedTask.description) || "",
      assignedDate: (selectedTask && selectedTask.start) ? new Date(selectedTask.start) : (selectedDate ? new Date(selectedDate) : now),
      assignedTime: (selectedTask && selectedTask.start)
        ? moment(selectedTask.start).format("HH:mm:ss")
        : (selectedDate && moment(selectedDate).format("HH:mm:ss") !== "00:00:00"
          ? moment(selectedDate).format("HH:mm:ss")
          : getNearestTime(now)),
      expectedDate: (selectedTask && selectedTask.end) ? new Date(selectedTask.end) : (selectedTask && selectedTask.start ? new Date(selectedTask.start) : (selectedDate ? new Date(selectedDate) : now)),
      expectedTime: (selectedTask && selectedTask.end)
        ? moment(selectedTask.end).format("HH:mm:ss")
        : (selectedDate && moment(selectedDate).format("HH:mm:ss") !== "00:00:00"
          ? getNearestTime(selectedDate, 1)
          : getNearestTime(now, 1)),
      allDay: (selectedTask && selectedTask.allDay) || false,
      status: (selectedTask && selectedTask.status) || "Pending",
      priority: (selectedTask && selectedTask.priority) || "Medium",
      assignedUserId: (selectedTask && selectedTask.assignedUserId) || "",
      reminder: (selectedTask && (selectedTask.reminder || (selectedTask.isRecurring && selectedTask.reminderOffsetMinutes != null))) || false,
      reminderDate: (selectedTask && selectedTask.reminderDate)
        ? new Date(selectedTask.reminderDate)
        : (selectedTask && selectedTask.isRecurring && selectedTask.reminderOffsetMinutes != null && selectedTask.start)
          ? moment(selectedTask.start).add(selectedTask.reminderOffsetMinutes, 'minutes').toDate()
          : (selectedTask && selectedTask.start ? new Date(selectedTask.start) : (selectedDate ? new Date(selectedDate) : now)),
      reminderTime: (selectedTask && selectedTask.reminderDate)
        ? moment(selectedTask.reminderDate).format("HH:mm:ss")
        : (selectedTask && selectedTask.isRecurring && selectedTask.reminderOffsetMinutes != null && selectedTask.start)
          ? moment(selectedTask.start).add(selectedTask.reminderOffsetMinutes, 'minutes').format("HH:mm:ss")
          : getNearestTime(now),
      finishDate: (selectedTask && selectedTask.finishDate) || null,
      isRecurring: selectedTask?.isRecurring || false,
      recurringGroupId: selectedTask?.recurringGroupId || null,
      recurrenceParentId: selectedTask?.recurrenceParentId || null,
      recurrenceType: selectedTask?.recurrenceType?.toUpperCase() || "WEEKLY",
      recurrenceInterval: parseInt(selectedTask?.recurrenceInterval) || 1,
      recurrenceDays: (() => {
        if (Array.isArray(selectedTask?.recurrenceDays)) return selectedTask.recurrenceDays;
        if (typeof selectedTask?.recurrenceDays === 'string' && selectedTask.recurrenceDays) {
          return selectedTask.recurrenceDays.split(',').map(d => d.trim().toUpperCase());
        }
        return (selectedDate ? [moment(selectedDate).format("dd").toUpperCase().substring(0, 2)] : []);
      })(),
      recurrenceEndDate: selectedTask?.recurrenceEndDate ? new Date(selectedTask.recurrenceEndDate) : null,
      ...getMonthlyRecurrenceFields(
        selectedTask,
        selectedDate ? moment(selectedDate).date() : 1
      ),
      recurrenceYearMonth: selectedTask?.recurrenceYearMonth || (selectedDate ? moment(selectedDate).month() + 1 : 1),
      recurrenceYearDay: selectedTask?.recurrenceYearDay || (selectedDate ? moment(selectedDate).date() : 1),
      recurrenceEndType: selectedTask?.recurrenceEndType || (selectedTask?.recurrenceEndDate ? "DATE" : (selectedTask?.recurrenceOccurrenceCount ? "COUNT" : "NEVER")),
      recurrenceOccurrenceCount: selectedTask?.recurrenceOccurrenceCount || 10,
      reminderOffsetMinutes: selectedTask?.reminderOffsetMinutes || 0,
    },
    validationSchema: Yup.object({
      title: Yup.string().required("Please Enter Your Event Name"),
      assignedDate: Yup.date().required("Assigned Date is required"),
      status: Yup.string().required("Status is required"),
      priority: Yup.string().required("Priority is required"),
    }),
    onSubmit: (values) => {
      if (selectedTask?.id && selectedTask?.isRecurring) {
        if (saveAction === "recurrence") {
          processSave(values, "all");
        } else {
          setActionModal({ isOpen: true, type: "save", pendingValues: values });
        }
        return;
      }
      processSave(values, "this");
    },
  });

  const processSave = (values, scope) => {
    // Manual Validations
    const startDT = values.allDay
      ? moment(values.assignedDate).startOf("day")
      : moment(
        `${moment(values.assignedDate).format("YYYY-MM-DD")} ${values.assignedTime}`,
        "YYYY-MM-DD HH:mm:ss"
      );

    const endDT = values.allDay
      ? moment(values.expectedDate).add(1, "days").startOf("day")
      : moment(
        `${moment(values.expectedDate).format("YYYY-MM-DD")} ${values.expectedTime}`,
        "YYYY-MM-DD HH:mm:ss"
      );
    if (endDT.isBefore(startDT)) {
      toast.error("Expected Date/Time cannot be earlier than Assigned Date/Time", { autoClose: 3000 });
      return;
    }

    // Reminder Handling
    let payloadReminder = values.reminder;
    let payloadReminderOffsetMinutes = values.reminderOffsetMinutes;
    let reminderDate = null;

    if (payloadReminder) {
      reminderDate = moment(`${moment(values.reminderDate).format("YYYY-MM-DD")} ${values.reminderTime}`, "YYYY-MM-DD HH:mm:ss");
      if (reminderDate.isAfter(endDT)) {
        toast.error("Reminder Date/Time cannot be after Expected Date/Time", { autoClose: 3000 });
        return;
      }
      if (values.isRecurring) {
        payloadReminderOffsetMinutes = reminderDate.diff(startDT, 'minutes');
      } else {
        payloadReminderOffsetMinutes = null;
      }
    } else {
      payloadReminderOffsetMinutes = null;
    }

    // Completion Handling
    let finishDate = values.finishDate;
    if (values.status === "Completed") {
      if (!selectedTask || selectedTask.status !== "Completed") {
        finishDate = new Date();
      }
    } else {
      finishDate = null;
    }

    let recurrenceRule = null;
    if (values.isRecurring) {
      if (values.recurrenceType === "MONTHLY") {
        if (values.recurrenceMonthOption === "DAY") {
          recurrenceRule = String(values.recurrenceMonthDay);
        } else if (values.recurrenceMonthOption === "WEEKLY") {
          recurrenceRule = `${values.recurrenceWeekNumber}${values.recurrenceWeekDay}`;
        }
      }
    }

    onSave({
      ...values,
      start: startDT.toDate(),
      end: endDT.toDate(),
      reminder: payloadReminder,
      reminderDate: reminderDate ? reminderDate.toDate() : null,
      reminderOffsetMinutes: payloadReminderOffsetMinutes !== null ? parseInt(payloadReminderOffsetMinutes) : null,
      finishDate: finishDate,
      recurrenceRule: recurrenceRule
    }, !!selectedTask?.id, scope);

    if (actionModal.isOpen) {
      setActionModal({ isOpen: false, type: null, pendingValues: null });
    }
  };

  // Effect to manage View/Edit mode
  useEffect(() => {
    if (isOpen) {
      setIsEditButton(!selectedTask);
    }
  }, [isOpen, selectedTask]);

  const handleEditClick = (e) => {
    e.preventDefault();
    setIsEditButton(true);
  };

  const handleDeleteClick = () => {
    if (selectedTask?.isRecurring) {
      setActionModal({ isOpen: true, type: "delete", pendingValues: null });
    } else {
      onDelete(selectedTask.id);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} toggle={toggle} id="event-modal" centered size="lg" modalClassName="zoomIn">
        <div className="modal-header p-3 bg-info-subtle d-flex align-items-center justify-content-between">
          <h5 className="modal-title mb-0">
            {!!selectedTask?.id ? (isEditButton ? "Edit Task" : selectedTask.title) : "Add New Task"}
          </h5>
          <div className="d-flex align-items-center gap-2">
            {!selectedTask?.id && (
              <Button
                type="submit"
                form="form-event"
                color="success"
                size="sm"
                onClick={() => setSaveAction("task")}
                disabled={loading && saveAction === "task"}
              >
                {loading && saveAction === "task" ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="ri-add-line align-bottom me-1"></i> Create Task
                  </>
                )}
              </Button>
            )}
            <button type="button" className="btn-close m-0" onClick={toggle} aria-label="Close"></button>
          </div>
        </div>
        <ModalBody>
          <Form
            className={!!selectedTask && !isEditButton ? "needs-validation view-event" : "needs-validation"}
            name="event-form"
            id="form-event"
            onSubmit={(e) => {
              e.preventDefault();
              validation.handleSubmit();
              return false;
            }}
          >
            {!!selectedTask && !isEditButton ? (
              <div className="text-end mb-3 hstack gap-2 justify-content-end">
                <Button color="soft-danger" size="sm" onClick={handleDeleteClick}>
                  <i className="ri-delete-bin-line align-bottom me-1"></i> Delete
                </Button>
                <Button color="primary" size="sm" className="btn-soft-primary" onClick={handleEditClick}>
                  <i className="ri-edit-line align-bottom me-1"></i> Edit
                </Button>
              </div>
            ) : null}

            {/* VIEW MODE DETAILS */}
            {!isEditButton && selectedTask ? (
              <div className="event-details mb-4">
                <Row>
                  <Col sm={12}>
                    <div className="d-flex mb-3">
                      <div className="flex-shrink-0 me-3">
                        <i className="ri-calendar-event-line text-muted fs-18"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="fw-semibold mb-1">
                          {moment(selectedTask.start).format("DD MMMM, YYYY")}{" "}
                          {!selectedTask.allDay && `@ ${moment(selectedTask.start).format("hh:mm A")}`}
                          {selectedTask.end && (
                            <>
                              {" - "}
                              {moment(selectedTask.end).format("DD MMMM, YYYY")}{" "}
                              {!selectedTask.allDay && `@ ${moment(selectedTask.end).format("hh:mm A")}`}
                            </>
                          )}
                        </h6>
                        {selectedTask.allDay && <span className="badge bg-info-subtle text-info">All Day Task</span>}
                      </div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="d-flex align-items-center mb-3">
                      <div className="flex-shrink-0 me-3">
                        <i className="ri-flag-line text-muted fs-18"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-0">
                          Priority: <span className={`badge bg-${getPriorityColor(validation.values.priority)}-subtle text-${getPriorityColor(validation.values.priority)}`}>{validation.values.priority}</span>
                        </h6>
                      </div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="d-flex align-items-center mb-3">
                      <div className="flex-shrink-0 me-3">
                        <i className="ri-checkbox-circle-line text-muted fs-18"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-0">
                          Status: <span className={`badge bg-${getStatusColor(validation.values.status)}-subtle text-${getStatusColor(validation.values.status)}`}>{validation.values.status}</span>
                        </h6>
                      </div>
                    </div>
                  </Col>
                  <Col sm={12}>
                    <div className="d-flex align-items-center mb-3">
                      <div className="flex-shrink-0 me-3">
                        <i className="ri-user-follow-line text-muted fs-18"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-0">
                          Assigned To: <span className="text-primary">
                            {users.find(u => u.userId?.toString() === validation.values.assignedUserId?.toString())?.fullName || "Unassigned"}
                          </span>
                        </h6>
                      </div>
                    </div>
                  </Col>

                  <Col sm={12}>
                    <div className="d-flex mb-3">
                      <div className="flex-shrink-0 me-3">
                        <i className="ri-notification-3-line text-muted fs-18"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-0">
                          Reminder: {validation.values.reminder ? (
                            <span className="text-success">
                              Enabled @ {moment(validation.values.reminderDate).format("DD MMM, YYYY")} {moment(validation.values.reminderTime, "HH:mm:ss").format("hh:mm A")}
                            </span>
                          ) : <span className="text-muted">Disabled</span>}
                        </h6>
                      </div>
                    </div>
                    {validation.values.finishDate && (
                      <div className="d-flex mb-3">
                        <div className="flex-shrink-0 me-3">
                          <i className="ri-checkbox-circle-fill text-success fs-18"></i>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0">
                            Completed On: <span className="text-success">{moment(validation.values.finishDate).format("DD MMM, YYYY hh:mm A")}</span>
                          </h6>
                        </div>
                      </div>
                    )}
                    {validation.values.isRecurring && (
                      <div className="d-flex mb-3">
                        <div className="flex-shrink-0 me-3">
                          <i className="ri-repeat-2-line text-info fs-18"></i>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0">
                            Recurrence: <span className="text-info">
                              {(() => {
                                const v = validation.values;
                                let summary = `Every ${v.recurrenceInterval} ${v.recurrenceType.toLowerCase().replace("ly", "")}${v.recurrenceInterval > 1 ? "s" : ""}`;
                                if (v.recurrenceType === "WEEKLY" && v.recurrenceDays?.length > 0) {
                                  summary += ` on ${v.recurrenceDays.join(", ")}`;
                                } else if (v.recurrenceType === "MONTHLY") {
                                  if (v.recurrenceMonthOption === "DAY") summary += ` on day ${v.recurrenceMonthDay}`;
                                  else summary += ` on the ${v.recurrenceWeekNumber} ${v.recurrenceWeekDay}`;
                                }
                                if (v.recurrenceEndDate) summary += ` until ${moment(v.recurrenceEndDate).format("DD MMM YYYY")}`;
                                return summary;
                              })()}
                            </span>
                          </h6>
                        </div>
                      </div>
                    )}
                    <div className="d-flex">
                      <div className="flex-shrink-0 me-3">
                        <i className="ri-discuss-line text-muted fs-18"></i>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-0 text-muted">{selectedTask.description || "No Description Provided"}</p>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            ) : (
              /* EDIT/ADD FORM FIELDS */
              <Row className="event-form">
                <Col xs={12}>
                  <div className="mb-3">
                    <Label className="form-label">Task Title</Label>
                    <Input
                      placeholder="What needs to be done?"
                      type="text"
                      name="title"
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      value={validation.values.title || ""}
                      invalid={validation.touched.title && !!validation.errors.title}
                    />
                    <FormFeedback>{validation.errors.title}</FormFeedback>
                  </div>
                </Col>

                {/* DATE SELECTION OVERHAUL */}
                <Col md={12} className="mb-3">
                  <FormGroup check className="mb-2">
                    <Input
                      type="checkbox"
                      id="allDay"
                      name="allDay"
                      checked={validation.values.allDay}
                      onChange={validation.handleChange}
                    />
                    <Label check for="allDay" className="fw-medium">All Day Task</Label>
                  </FormGroup>
                </Col>

                {/* Assigned Date & Time */}
                <Col md={validation.values.allDay ? 12 : 7}>
                  <div className="mb-3">
                    <Label>Assigned Date</Label>
                    <div className="input-group">
                      <Flatpickr
                        className="form-control"
                        placeholder="Select Date"
                        options={{
                          dateFormat: "Y-m-d",
                          allowInput: true
                        }}
                        value={validation.values.assignedDate}
                        onChange={(date) => validation.setFieldValue("assignedDate", date[0])}
                      />
                      <span className="input-group-text"><i className="ri-calendar-event-line"></i></span>
                    </div>
                  </div>
                </Col>
                {!validation.values.allDay && (
                  <Col md={5}>
                    <div className="mb-3">
                      <Label>Assigned Time</Label>
                      <div className="input-group">
                        <Flatpickr
                          className="form-control"
                          options={{
                            enableTime: true,
                            noCalendar: true,
                            dateFormat: "h:i K",
                            allowInput: true,
                            minuteIncrement: 1
                          }}
                          value={moment(validation.values.assignedTime, "HH:mm:ss").toDate()}
                          onChange={(selectedDates) => {
                            if (selectedDates && selectedDates.length > 0) {
                              validation.setFieldValue("assignedTime", moment(selectedDates[0]).format("HH:mm:ss"));
                            }
                          }}
                          onClose={(selectedDates) => {
                            if (selectedDates && selectedDates.length > 0) {
                              validation.setFieldValue("assignedTime", moment(selectedDates[0]).format("HH:mm:ss"));
                            }
                          }}
                          onBlur={(e) => {
                            const parsedVal = parseManualTime(e.target.value, validation.values.assignedTime);
                            validation.setFieldValue("assignedTime", parsedVal);
                          }}
                        />
                        <span className="input-group-text"><i className="ri-time-line"></i></span>
                      </div>
                    </div>
                  </Col>
                )}

                {/* Expected Date & Time */}
                <Col md={validation.values.allDay ? 12 : 7}>
                  <div className="mb-3">
                    <Label>Expected Date</Label>
                    <div className="input-group">
                      <Flatpickr
                        className="form-control"
                        placeholder="Select Date"
                        options={{
                          dateFormat: "Y-m-d",
                          allowInput: true
                        }}
                        value={validation.values.expectedDate}
                        onChange={(date) => validation.setFieldValue("expectedDate", date[0])}
                      />
                      <span className="input-group-text"><i className="ri-calendar-check-line"></i></span>
                    </div>
                  </div>
                </Col>
                {!validation.values.allDay && (
                  <Col md={5}>
                    <div className="mb-3">
                      <Label>Expected Time</Label>
                      <div className="input-group">
                        <Flatpickr
                          className="form-control"
                          options={{
                            enableTime: true,
                            noCalendar: true,
                            dateFormat: "h:i K",
                            allowInput: true,
                            minuteIncrement: 1
                          }}
                          value={moment(validation.values.expectedTime, "HH:mm:ss").toDate()}
                          onChange={(selectedDates) => {
                            if (selectedDates && selectedDates.length > 0) {
                              validation.setFieldValue("expectedTime", moment(selectedDates[0]).format("HH:mm:ss"));
                            }
                          }}
                          onClose={(selectedDates) => {
                            if (selectedDates && selectedDates.length > 0) {
                              validation.setFieldValue("expectedTime", moment(selectedDates[0]).format("HH:mm:ss"));
                            }
                          }}
                          onBlur={(e) => {
                            const parsedVal = parseManualTime(e.target.value, validation.values.expectedTime);
                            validation.setFieldValue("expectedTime", parsedVal);
                          }}
                        />
                        <span className="input-group-text"><i className="ri-time-line"></i></span>
                      </div>
                    </div>
                  </Col>
                )}

                {/* REMINDER SECTION */}
                <Col xs={12} className="mb-3">
                  <FormGroup check className="mb-2">
                    <Input
                      type="checkbox"
                      id="reminder"
                      name="reminder"
                      checked={validation.values.reminder}
                      onChange={(e) => {
                        validation.handleChange(e);
                        // If enabling reminder and isRecurring, set custom reminderDate to assignedDate
                        if (e.target.checked && validation.values.isRecurring) {
                          validation.setFieldValue("reminderDate", validation.values.assignedDate);
                        }
                      }}
                    />
                    <Label check for="reminder" className="fw-medium">Enable Reminder</Label>
                  </FormGroup>
                  <Collapse isOpen={validation.values.reminder}>
                    <div
                      style={{
                        opacity: validation.values.reminder ? 1 : 0,
                        transform: validation.values.reminder
                          ? "translateY(0px)"
                          : "translateY(-8px)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div className="pt-2">
                        <Row className="g-3">
                          <Col md={7}>
                            <Label>Reminder Date</Label>
                            <div className="input-group">
                              <Flatpickr
                                className="form-control"
                                placeholder="Select Date"
                                options={{
                                  dateFormat: "Y-m-d",
                                  allowInput: true
                                }}
                                value={validation.values.reminderDate}
                                onChange={(date) =>
                                  validation.setFieldValue("reminderDate", date[0])
                                }
                              />
                              <span className="input-group-text">
                                <i className="ri-calendar-event-line"></i>
                              </span>
                            </div>
                          </Col>

                          <Col md={5}>
                            <Label>Reminder Time</Label>
                            <div className="input-group">
                              <Flatpickr
                                className="form-control"
                                options={{
                                  enableTime: true,
                                  noCalendar: true,
                                  dateFormat: "h:i K",
                                  allowInput: true,
                                  minuteIncrement: 1
                                }}
                                value={moment(validation.values.reminderTime, "HH:mm:ss").toDate()}
                                onChange={(selectedDates) => {
                                  if (selectedDates && selectedDates.length > 0) {
                                    validation.setFieldValue("reminderTime", moment(selectedDates[0]).format("HH:mm:ss"));
                                  }
                                }}
                                onClose={(selectedDates) => {
                                  if (selectedDates && selectedDates.length > 0) {
                                    validation.setFieldValue("reminderTime", moment(selectedDates[0]).format("HH:mm:ss"));
                                  }
                                }}
                                onBlur={(e) => {
                                  const parsedVal = parseManualTime(e.target.value, validation.values.reminderTime);
                                  validation.setFieldValue("reminderTime", parsedVal);
                                }}
                              />
                              <span className="input-group-text"><i className="ri-time-line"></i></span>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  </Collapse>
                </Col>

                <Col xs={6}>
                  <div className="mb-3">
                    <Label className="form-label">Priority</Label>
                    <Input
                      name="priority"
                      type="select"
                      className="form-select"
                      onChange={validation.handleChange}
                      value={validation.values.priority}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </Input>
                  </div>
                </Col>

                <Col xs={6}>
                  <div className="mb-3">
                    <Label className="form-label">Status</Label>
                    <Input
                      name="status"
                      type="select"
                      className="form-select"
                      onChange={validation.handleChange}
                      value={validation.values.status}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Canceled">Canceled</option>
                    </Input>
                  </div>
                </Col>

                <Col xs={12}>
                  <div className="mb-3">
                    <Label className="form-label">Assigned To</Label>
                    <Select
                      name="assignedUserId"
                      placeholder="Select User (Optional)"
                      options={(users || []).map((user) => ({
                        value: user.userId?.toString(),
                        label: user.fullName,
                      }))}
                      onChange={(selectedOption) => {
                        validation.setFieldValue("assignedUserId", selectedOption ? selectedOption.value : "");
                      }}
                      onBlur={() => validation.setFieldTouched("assignedUserId", true)}
                      value={
                        (() => {
                          const user = (users || []).find((u) => u.userId?.toString() === validation.values.assignedUserId?.toString());
                          return user ? { value: user.userId.toString(), label: user.fullName } : null;
                        })()
                      }
                      isClearable={true}
                      isSearchable={true}
                      classNamePrefix="select2-selection"
                    />
                  </div>
                </Col>

                <Col xs={12}>
                  <div className="mb-3">
                    <Label className="form-label">Category Color</Label>
                    <Input
                      name="category"
                      type="select"
                      className="form-select"
                      onChange={validation.handleChange}
                      value={validation.values.category}
                    >
                      <option value="bg-primary-subtle">Primary (Blue)</option>
                      <option value="bg-success-subtle">Success (Green)</option>
                      <option value="bg-danger-subtle">Danger (Red)</option>
                      <option value="bg-warning-subtle">Warning (Yellow)</option>
                      <option value="bg-info-subtle">Info (Cyan)</option>
                      <option value="bg-dark-subtle">Dark (Gray)</option>
                    </Input>
                  </div>
                </Col>

                <Col xs={12}>
                  <div className="mb-3">
                    <Label className="form-label">Description</Label>
                    <textarea
                      className="form-control"
                      name="description"
                      placeholder="Enter task description"
                      rows={3}
                      onChange={validation.handleChange}
                      value={validation.values.description || ""}
                    ></textarea>
                  </div>
                </Col>


                <Col xs={12}>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2 mb-3 border-top pt-4">
                    <div className="d-flex align-items-center">
                      {!(!!selectedTask?.id && selectedTask?.isRecurring) ? (
                        <FormGroup check className="mb-0">
                          <Input
                            type="checkbox"
                            id="isRecurring"
                            name="isRecurring"
                            checked={validation.values.isRecurring}
                            onChange={validation.handleChange}
                          />
                          <Label check for="isRecurring" className="fw-medium mb-0">
                            Repeat Task
                          </Label>
                        </FormGroup>
                      ) : (
                        <div className="section-title fw-bold text-primary mb-0">
                          Recurrence Settings
                        </div>
                      )}
                    </div>
                    <div className="hstack gap-2 ms-auto">
                      {!!selectedTask?.id && (
                        <Button
                          type="button"
                          color="soft-danger"
                          onClick={handleDeleteClick}
                        >
                          <i className="ri-delete-bin-line align-bottom"></i> Delete
                        </Button>
                      )}
                      {isEditButton && !!selectedTask?.id && (
                        <Button
                          type="submit"
                          color="success"
                          onClick={() => setSaveAction("task")}
                          disabled={loading && saveAction === "task"}
                        >
                          {loading && saveAction === "task" ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Saving...
                            </>
                          ) : (
                            "Save Task Changes"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </Col>
                {/* RECURRENCE SECTION */}
                <Col xs={12} className="mt-0">
                  <Collapse isOpen={validation.values.isRecurring}>
                    <RecurrenceBuilder
                      values={validation.values}
                      setFieldValue={validation.setFieldValue}
                    />
                    {!!selectedTask?.id && selectedTask?.isRecurring && isEditButton && (
                      <div className="hstack gap-2 justify-content-end mt-4">
                        <Button
                          type="submit"
                          color="primary"
                          onClick={() => setSaveAction("recurrence")}
                          disabled={loading && saveAction === "recurrence"}
                        >
                          {loading && saveAction === "recurrence" ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Updating...
                            </>
                          ) : (
                            "Update Recurrence Pattern"
                          )}
                        </Button>
                      </div>
                    )}
                  </Collapse>
                </Col>
              </Row>
            )}
          </Form>
        </ModalBody>
      </Modal>

      {/* Recurrence Action Modal */}
      <Modal isOpen={actionModal.isOpen} toggle={() => setActionModal({ isOpen: false, type: null, pendingValues: null })} centered size="sm">
        <ModalHeader toggle={() => setActionModal({ isOpen: false, type: null, pendingValues: null })} tag="h5" className="p-3 bg-light modal-title">
          {actionModal.type === "save" ? "Edit Recurring Task" : "Delete Recurring Task"}
        </ModalHeader>
        <ModalBody>
          <div className="mb-4 mt-2">
            <FormGroup check className="mb-3">
              <Input
                type="radio"
                name="actionScope"
                value="this"
                checked={actionScope === "this"}
                onChange={(e) => setActionScope(e.target.value)}
              />
              <Label check className="fw-medium fs-15">This event only</Label>
            </FormGroup>
            <FormGroup check className="mb-3">
              <Input
                type="radio"
                name="actionScope"
                value="future"
                checked={actionScope === "future"}
                onChange={(e) => setActionScope(e.target.value)}
              />
              <Label check className="fw-medium fs-15">This and following events</Label>
            </FormGroup>
            <FormGroup check>
              <Input
                type="radio"
                name="actionScope"
                value="all"
                checked={actionScope === "all"}
                onChange={(e) => setActionScope(e.target.value)}
              />
              <Label check className="fw-medium fs-15">All events in the series</Label>
            </FormGroup>
          </div>
          <div className="hstack gap-2 justify-content-end">
            <Button color="light" onClick={() => setActionModal({ isOpen: false, type: null, pendingValues: null })}>
              Cancel
            </Button>
            <Button
              color={actionModal.type === "save" ? "primary" : "danger"}
              onClick={() => {
                if (actionModal.type === "save") {
                  processSave(actionModal.pendingValues, actionScope);
                } else if (actionModal.type === "delete") {
                  onDelete(selectedTask.id, actionScope);
                  setActionModal({ isOpen: false, type: null, pendingValues: null });
                }
              }}
            >
              Ok
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default TaskModal;
