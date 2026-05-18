// Child
// ↓
// Parent callback
// ↓
// dispatch(action)
// ↓
// Redux store updates
// ↓
// Parent gets new Redux data
// ↓
// Parent re-renders

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Container, Row, Col } from "reactstrap";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "reselect";
// Components
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import CalendarLeftPanel from "./CalendarLeftPanel";
import CalendarView from "./CalendarView";
import TaskModal from "./TaskModal";
import { getMonthlyRecurrenceFields } from "./recurrenceUtils";

// Redux Actions
import {
  getEvents as onGetEvents,
  getCategories as onGetCategories,
  addNewEvent as onAddNewEvent,
  deleteEvent as onDeleteEvent,
  updateEvent as onUpdateEvent,
  getUpCommingEvent as onGetUpCommingEvent,
  getUsers as onGetUsers,
  getTemplates as onGetTemplates,
} from "../../slices/thunks";


/**
 * Calendar Controller Component
 * Responsible for state management, Redux interactions, and top-level layout.
 */
const companyId = localStorage.getItem("companyId");
const Calendar = () => {
  const dispatch = useDispatch();

  // --- STATE ---
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskIdToDelete, setTaskIdToDelete] = useState(null);

  // Unified Filter State
  const [filters, setFilters] = useState({
    user: "",
    priority: "",
    status: "",
    quick: "All",      // All, Pending, Overdue, Today, Completed
    category: "",    // Task Type
    dateRange: "All", // Upcoming, Overdue, All
    sortBy: "DateAsc" // DateAsc, DateDesc, Priority
  });



  // --- REDUX DATA ---
  const selectLayoutState = (state) => state.Calendar;
  const calendarDataProperties = createSelector(selectLayoutState, (state) => ({
    events: state.events,
    categories: state.categories,
    isEventUpdated: state.isEventUpdated,
    loading: state.loading,
    users: state.users,
  }));

  const { events, categories, isEventUpdated, loading, users } = useSelector(calendarDataProperties);

  // Enhanced Filtering & Sorting Engine
  const filteredEvents = React.useMemo(() => {
    let result = (events || []).filter(event => {
      // 1. User Filter
      if (filters.user && event.assignedUserId?.toString() !== filters.user) return false;

      // 2. Status & Priority (Advanced)
      if (filters.status && event.status !== filters.status) return false;
      if (filters.priority && event.priority !== filters.priority) return false;
      if (filters.category && event.category !== filters.category) return false;

      // 3. Quick Filters & Date Ranges
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);
      eventEnd.setHours(23, 59, 59, 999); // End of day check

      // Handle Quick Filter Logic
      if (filters.quick === "Pending") {
        if (event.status !== "Pending") return false;
      } else if (filters.quick === "Completed") {
        if (event.status !== "Completed") return false;
      } else if (filters.quick === "Today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (eventStart < today || eventStart > new Date(today.getTime() + 86400000)) return false;
      } else if (filters.quick === "Overdue") {
        if (event.status === "Completed" || eventEnd >= now) return false;
      }

      // Handle Advanced Date Range Filter
      if (filters.dateRange === "Overdue") {
        if (event.status === "Completed" || eventEnd >= now) return false;
      } else if (filters.dateRange === "Upcoming") {
        if (eventEnd < now) return false;
      }

      return true;
    });

    // 4. Sorting Engine
    result.sort((a, b) => {
      // A. Priority Sort (Highest first)
      if (filters.sortBy === "Priority") {
        const priorityOrder = { "High": 0, "Medium": 1, "Low": 2 };
        const scoreA = priorityOrder[a.priority] ?? 3;
        const scoreB = priorityOrder[b.priority] ?? 3;
        if (scoreA !== scoreB) return scoreA - scoreB;
      }



      // C. Date-based sorting
      const dateA = new Date(a.finishDate || a.end || a.start);
      const dateB = new Date(b.finishDate || b.end || b.start);

      if (filters.sortBy === "DateDesc") {
        return dateB - dateA;
      } else {
        // Standard Ascending (Oldest First) - also used for Default secondary sort
        return dateA - dateB;
      }
    });

    return result;
  }, [events, filters]);



  // --- EFFECTS ---
  useEffect(() => {
    dispatch(onGetEvents(companyId));
    dispatch(onGetCategories());
    dispatch(onGetUpCommingEvent(companyId));
    dispatch(onGetUsers(companyId));
    dispatch(onGetTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (isEventUpdated) {
      setSelectedTask(null);
      setModal(false);
      setDeleteModal(false);
    }
  }, [isEventUpdated]);

  // --- HANDLERS ---
  const toggle = () => {
    if (modal) {
      setModal(false);
      setSelectedTask(null);
      setSelectedDate(null);
    } else {
      setModal(true);
    }
  };

  const handleDateClick = (arg) => {
    setSelectedDate(arg["date"]);
    setSelectedTask(null);
    toggle();
  };

  const handleEventClick = (arg) => {
    const event = arg.event;
    const props = event.extendedProps || {};
    const getRecurrenceProp = (key) => props[key] ?? event[key];
    const taskFromEvent = {
      recurrenceType: getRecurrenceProp("recurrenceType") || "WEEKLY",
      recurrenceRule: getRecurrenceProp("recurrenceRule") || null,
      recurrenceMonthOption: getRecurrenceProp("recurrenceMonthOption"),
      recurrenceMonthDay: getRecurrenceProp("recurrenceMonthDay"),
      recurrenceWeekNumber: getRecurrenceProp("recurrenceWeekNumber"),
      recurrenceWeekDay: getRecurrenceProp("recurrenceWeekDay"),
    };

    setSelectedTask({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      className: event.classNames,
      category: event.classNames[0],
      description: props.description || "",
      status: props.status || "Pending",
      priority: (props.priority === "Urgent") ? "High" : (props.priority || "Medium"),
      assignedUserId: props.assignedUserId || null,
      reminder: props.reminder || false,
      reminderDate: props.reminderDate || null,
      finishDate: props.finishDate || null,
      isRecurring: props.isRecurring || false,
      recurringGroupId: props.recurringGroupId || null,
      recurrenceParentId: props.recurrenceParentId || null,
      recurrenceType: taskFromEvent.recurrenceType,
      recurrenceInterval: props.recurrenceInterval || 1,
      recurrenceDays: props.recurrenceDays || [],
      ...getMonthlyRecurrenceFields(taskFromEvent, event.start ? new Date(event.start).getDate() : 1),
      recurrenceEndDate: props.recurrenceEndDate || null,
      recurrenceOccurrenceCount: props.recurrenceOccurrenceCount || 10,
      reminderOffsetMinutes: props.reminderOffsetMinutes ?? 0,
      recurrenceYearMonth: props.recurrenceYearMonth || 1,
      recurrenceYearDay: props.recurrenceYearDay || 1,
      recurrenceEndType: props.recurrenceEndType || "NEVER",
      recurrenceRule: taskFromEvent.recurrenceRule,
    });
    toggle();
  };

  const handleSaveTask = (values, isEdit, updateScope = "this") => {
    const eventPayload = {
      title: values.title,
      className: values.category,
      category: values.category,
      start: values.start,
      end: values.end,
      allDay: values.allDay,
      description: values.description,
      status: values.status,
      priority: values.priority,
      assignedUserId: values.assignedUserId,
      reminder: values.reminder,
      reminderDate: values.reminderDate,
      finishDate: values.finishDate,
      isRecurring: values.isRecurring,
      recurrenceType: values.recurrenceType,
      recurrenceInterval: values.recurrenceInterval,
      recurrenceDays: values.recurrenceDays,
      recurrenceMonthDay: values.recurrenceMonthDay,
      recurrenceWeekNumber: values.recurrenceWeekNumber,
      recurrenceWeekDay: values.recurrenceWeekDay,
      recurrenceEndDate: values.recurrenceEndDate,
      recurrenceOccurrenceCount: values.recurrenceOccurrenceCount,
      reminderOffsetMinutes: values.reminderOffsetMinutes,
      recurrenceMonthOption: values.recurrenceMonthOption,
      recurrenceYearMonth: values.recurrenceYearMonth,
      recurrenceYearDay: values.recurrenceYearDay,
      recurrenceEndType: values.recurrenceEndType,
      recurringGroupId: values.recurringGroupId,
      recurrenceParentId: values.recurrenceParentId,
      recurrenceRule: values.recurrenceRule,
    };

    if (isEdit) {
      dispatch(onUpdateEvent({ event: { ...eventPayload, id: values.id }, updateType: updateScope }));
    } else {
      dispatch(onAddNewEvent({ ...eventPayload, id: Math.floor(Math.random() * 1000) }));
    }
  };

  const handleDeleteTask = () => {
    if (taskIdToDelete) {
      dispatch(onDeleteEvent({ taskId: taskIdToDelete, deleteType: "this" }));
      setDeleteModal(false);
      setTaskIdToDelete(null);
    }
  };

  const handleEventDrop = (arg) => {
    const { event } = arg;

    const updatedEventData = {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end || event.start,
      allDay: event.allDay,
      className: event.classNames.join(" "),
      category: event.classNames[0],
      description: event.extendedProps.description || "",
      status: event.extendedProps.status || "Pending",
      priority: (event.extendedProps.priority === "Urgent") ? "High" : (event.extendedProps.priority || "Medium"),
      assignedUserId: event.extendedProps.assignedUserId || null,
      reminder: event.extendedProps.reminder || false,
      reminderDate: event.extendedProps.reminderDate || null,
      finishDate: event.extendedProps.finishDate || null,
      isRecurring: event.extendedProps.isRecurring || false,
      recurringGroupId: event.extendedProps.recurringGroupId || null,
      recurrenceParentId: event.extendedProps.recurrenceParentId || null,
      recurrenceType: event.extendedProps.recurrenceType || "WEEKLY",
      recurrenceInterval: event.extendedProps.recurrenceInterval || 1,
      recurrenceDays: event.extendedProps.recurrenceDays || [],
      recurrenceMonthDay: event.extendedProps.recurrenceMonthDay || 1,
      recurrenceWeekNumber: event.extendedProps.recurrenceWeekNumber || 1,
      recurrenceWeekDay: event.extendedProps.recurrenceWeekDay || "MO",
      recurrenceEndDate: event.extendedProps.recurrenceEndDate || null,
      recurrenceOccurrenceCount: event.extendedProps.recurrenceOccurrenceCount || 10,
      reminderOffsetMinutes: event.extendedProps.reminderOffsetMinutes || 0,
      recurrenceMonthOption: event.extendedProps.recurrenceMonthOption || "DAY",
      recurrenceYearMonth: event.extendedProps.recurrenceYearMonth || 1,
      recurrenceYearDay: event.extendedProps.recurrenceYearDay || 1,
      recurrenceEndType: event.extendedProps.recurrenceEndType || "NEVER",
      recurrenceRule: event.extendedProps.recurrenceRule || null,
      successMessage: "Task rescheduled successfully",
    };

    dispatch(onUpdateEvent(updatedEventData));
  };

  const onDrag = (e) => e.preventDefault();

  const onDrop = (e) => {
    const date = e["date"];
    const modifiedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());
    const draggedEl = e.draggedEl;

    if (draggedEl.classList.contains("external-event")) {
      const templateDataAttr = draggedEl.getAttribute("data-template");
      if (templateDataAttr) {
        const template = JSON.parse(templateDataAttr);

        const newEvent = {
          title: template.template_name || template.templateName,
          description: template.description || "",
          status: template.default_status || template.defaultStatus || "Pending",
          priority: (template.default_priority === "Urgent" || template.defaultPriority === "Urgent") ? "High" : (template.default_priority || template.defaultPriority || "Medium"),
          category: template.template_color || template.templateColor || "bg-info-subtle",
          assignedUserId: template.default_assigned_user_id || template.defaultAssignedUserId || null,
          start: modifiedDate,
          end: modifiedDate,
          allDay: false
        };
        newEvent.className = newEvent.category;
        dispatch(onAddNewEvent(newEvent));
      } else {
        // Fallback for old static templates if any
        const modifiedData = {
          id: Math.floor(Math.random() * 1000),
          title: draggedEl.innerText,
          start: modifiedDate,
          className: draggedEl.className,
        };
        dispatch(onAddNewEvent(modifiedData));
      }
    }
  };


  document.title = "Calendar | ERP Task Management System";

  return (
    <React.Fragment>
      {/* Delete Confirmation Modal */}
      <DeleteModal
        show={deleteModal}
        onDeleteClick={handleDeleteTask}
        onCloseClick={() => setDeleteModal(false)}
        recordId={""}
      />

      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Calendar" pageTitle="Apps" />
          <Row>
            <Col xs={12}>
              <Row>
                <Col xl={3}>
                  <CalendarLeftPanel
                    toggle={toggle}
                    onDrag={onDrag}
                    events={filteredEvents}
                    users={users}
                    filters={filters}
                    setFilters={setFilters}
                  />

                </Col>
                <Col xl={9}>
                  <CalendarView
                    events={filteredEvents}
                    users={users}
                    handleDateClick={handleDateClick}
                    handleEventClick={handleEventClick}
                    onDrop={onDrop}
                    handleEventDrop={handleEventDrop}
                  />
                </Col>

              </Row>

              <div style={{ clear: "both" }}></div>

              {/* Modular Task Creation/Edit Modal */}
              <TaskModal
                isOpen={modal}
                toggle={toggle}
                selectedTask={selectedTask}
                selectedDate={selectedDate}
                onSave={handleSaveTask}
                loading={loading}
                users={users}
                onDelete={(id, scope) => {
                  if (scope) {
                    dispatch(onDeleteEvent({ taskId: id, deleteType: scope }));
                    toggle();
                  } else {
                    setTaskIdToDelete(id);
                    setDeleteModal(true);
                  }
                }}
              />
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

Calendar.propTypes = {
  events: PropTypes.any,
  categories: PropTypes.array,
  onGetEvents: PropTypes.func,
  onAddNewEvent: PropTypes.func,
  onUpdateEvent: PropTypes.func,
  onDeleteEvent: PropTypes.func,
  onGetCategories: PropTypes.func,
};

export default Calendar;
