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

/**
 * TaskModal Component
 * Overhauled UI for Date/Time handling similar to Google Calendar.
 */
const TaskModal = ({
  isOpen,
  toggle,
  selectedTask,
  selectedDate,
  onSave,
  onDelete,
  loading,
  users = [],
}) => {
  const [isEditButton, setIsEditButton] = useState(true);
  
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
      case "Low": return "secondary";
      case "Medium": return "primary";
      case "High": return "warning";
      case "Urgent": return "danger";
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
      reminder: (selectedTask && selectedTask.reminder) || false,
      reminderDate: (selectedTask && selectedTask.reminderDate) ? new Date(selectedTask.reminderDate) : (selectedTask && selectedTask.start ? new Date(selectedTask.start) : (selectedDate ? new Date(selectedDate) : now)),
      reminderTime: (selectedTask && selectedTask.reminderDate)
        ? moment(selectedTask.reminderDate).format("HH:mm:ss")
        : getNearestTime(now),
      finishDate: (selectedTask && selectedTask.finishDate) || null,
    },
    validationSchema: Yup.object({
      title: Yup.string().required("Please Enter Your Event Name"),
      assignedDate: Yup.date().required("Assigned Date is required"),
      status: Yup.string().required("Status is required"),
      priority: Yup.string().required("Priority is required"),
    }),
    onSubmit: (values) => {
      // Manual Validations
      const startDT = moment(moment(values.assignedDate).format("YYYY-MM-DD") + " " + (values.allDay ? "00:00:00" : values.assignedTime));
      const endDT = values.allDay
        ? moment(values.expectedDate).add(1, 'days').startOf('day')
        : moment(moment(values.expectedDate).format("YYYY-MM-DD") + " " + values.expectedTime);

      if (endDT.isBefore(startDT)) {
        toast.error("Expected Date/Time cannot be earlier than Assigned Date/Time", { autoClose: 3000 });
        return;
      }

      // Reminder Handling
      let reminderDate = null;
      if (values.reminder) {
        reminderDate = moment(moment(values.reminderDate).format("YYYY-MM-DD") + " " + values.reminderTime);
        if (reminderDate.isAfter(endDT)) {
          toast.error("Reminder Date/Time cannot be after Expected Date/Time", { autoClose: 3000 });
          return;
        }
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

      onSave({
        ...values,
        start: startDT.toDate(),
        end: endDT.toDate(),
        reminderDate: reminderDate ? reminderDate.toDate() : null,
        finishDate: finishDate
      }, !!selectedTask?.id);

      toggle();
    },
  });

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

  return (
    <Modal isOpen={isOpen} toggle={toggle} id="event-modal" centered size="lg">
      <ModalHeader toggle={toggle} tag="h5" className="p-3 bg-info-subtle modal-title">
        {!!selectedTask?.id ? (isEditButton ? "Edit Task" : selectedTask.title) : "Add New Task"}

      </ModalHeader>
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
            <div className="text-end mb-3">
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
                      options={{ dateFormat: "Y-m-d" }}
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
                    <Input
                      type="select"
                      name="assignedTime"
                      className="form-select"
                      value={validation.values.assignedTime}
                      onChange={validation.handleChange}
                    >
                      {timeIntervals.map((t) => (
                        <option key={`start-${t.value}`} value={t.value}>{t.label}</option>
                      ))}
                    </Input>
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
                      options={{ dateFormat: "Y-m-d" }}
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
                    <Input
                      type="select"
                      name="expectedTime"
                      className="form-select"
                      value={validation.values.expectedTime}
                      onChange={validation.handleChange}
                    >
                      {timeIntervals.map((t) => (
                        <option key={`end-${t.value}`} value={t.value}>{t.label}</option>
                      ))}
                    </Input>
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
                    onChange={validation.handleChange}
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
                              options={{ dateFormat: "Y-m-d" }}
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
                          <Input
                            type="select"
                            name="reminderTime"
                            className="form-select"
                            value={validation.values.reminderTime}
                            onChange={validation.handleChange}
                          >
                            {timeIntervals.map((t) => (
                              <option key={`rem-${t.value}`} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </Input>
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
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
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
                      (users || []).find((user) => user.userId?.toString() === validation.values.assignedUserId?.toString())
                        ? {
                          value: validation.values.assignedUserId?.toString(),
                          label: (users || []).find((user) => user.userId?.toString() === validation.values.assignedUserId?.toString())?.fullName,
                        }
                        : null
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
            </Row>
          )}

          <div className="hstack gap-2 justify-content-end mt-4">
            {!!selectedTask?.id && (

              <Button
                type="button"
                color="soft-danger"
                onClick={() => {
                  onDelete(selectedTask.id);
                  toggle();
                }}
              >
                <i className="ri-delete-bin-line align-bottom"></i> Delete
              </Button>
            )}
            {isEditButton && (
              <Button type="submit" color="success" id="btn-save-event" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Saving...
                  </>
                ) : (
                  !!selectedTask?.id ? "Update Task" : "Create Task"

                )}
              </Button>
            )}
          </div>
        </Form>
      </ModalBody>
    </Modal>
  );
};

export default TaskModal;
