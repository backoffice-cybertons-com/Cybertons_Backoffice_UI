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

    setSelectedTask({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      className: event.classNames,
      category: event.classNames[0],
      description: event.extendedProps.description || "",
      status: event.extendedProps.status || "Pending",
      priority: event.extendedProps.priority || "Medium",
      assignedUserId: event.extendedProps.assignedUserId || null,
      reminder: event.extendedProps.reminder || false,
      reminderDate: event.extendedProps.reminderDate || null,
      finishDate: event.extendedProps.finishDate || null,
    });
    toggle();
  };

  const handleSaveTask = (values, isEdit) => {
    if (isEdit) {
      const updateEventData = {
        id: values.id,
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
      };
      dispatch(onUpdateEvent(updateEventData));
    } else {
      const newEvent = {
        id: Math.floor(Math.random() * 1000),
        title: values.title,
        start: values.start,
        end: values.end,
        allDay: values.allDay,
        className: values.category,
        category: values.category,
        description: values.description,
        status: values.status,
        priority: values.priority,
        assignedUserId: values.assignedUserId,
        reminder: values.reminder,
        reminderDate: values.reminderDate,
        finishDate: values.finishDate,
      };
      dispatch(onAddNewEvent(newEvent));
    }
  };

  const handleDeleteTask = () => {
    if (taskIdToDelete) {
      dispatch(onDeleteEvent(taskIdToDelete));
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
      priority: event.extendedProps.priority || "Medium",
      assignedUserId: event.extendedProps.assignedUserId || null,
      reminder: event.extendedProps.reminder || false,
      reminderDate: event.extendedProps.reminderDate || null,
      finishDate: event.extendedProps.finishDate || null,
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
          priority: template.default_priority || template.defaultPriority || "Medium",
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
                  <CalendarLeftPanel toggle={toggle} onDrag={onDrag} events={events} users={users} />
                </Col>
                <Col xl={9}>
                  <CalendarView
                    events={events}
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
                onDelete={(id) => {
                  setTaskIdToDelete(id);
                  setDeleteModal(true);
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
