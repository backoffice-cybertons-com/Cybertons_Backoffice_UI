// index.js
//    ├── CalendarLeftPanel
//    │        ├── TaskTemplates
//    │        └── UpcomingTasks
//    │
//    └── CalendarView
import React, { useState } from "react";
import SimpleBar from "simplebar-react";
import { Card, CardBody, Badge, Button, Nav, NavItem, NavLink } from "reactstrap";
import classnames from "classnames";
import AdvancedFilterModal from "./AdvancedFilterModal";

/**
 * UpcomingTasks Component
 * Displays a list of tasks synchronized with the Redux store.
 * Enhanced with Quick Filter chips and Advanced Filtering.
 */
const UpcomingTasks = ({ events = [], users = [], filters = {}, setFilters = {} }) => {
  const [isAdvancedModalOpen, setAdvancedModalOpen] = useState(false);

  const toggleAdvancedModal = () => setAdvancedModalOpen(!isAdvancedModalOpen);

  // Date Formatting Helper
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Time Formatting Helper
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper: Priority Color Mapping
  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case "High": return "danger";
      case "Medium": return "warning";
      case "Low": return "success";
      default: return "primary";
    }
  };

  // Helper: Status Color Mapping
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Pending": return "warning";
      case "Completed": return "success";
      case "Canceled": return "danger";
      default: return "warning";
    }
  };

  const getColorClass = (className) => {
    if (!className) return "primary";
    const parts = className.split("-");
    if (parts.length >= 2) return parts[1];
    return "primary";
  };

  const handleQuickFilter = (value) => {
    setFilters(prev => ({ ...prev, quick: value }));
  };

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-1">Task Schedule</h5>
          <p className="text-muted mb-0 fs-12">
            Manage your activities and deadlines
          </p>
        </div>
        <Button
          color="soft-primary"
          size="sm"
          outline
          onClick={toggleAdvancedModal}
          className="btn-icon waves-effect waves-light"
        >
          <i className="ri-filter-2-line"></i>
        </Button>
      </div>

      {/* Quick Filter Chips */}
      <div className="mb-3 overflow-auto">
        <Nav pills className="nav-success gap-1 flex-nowrap pb-1" style={{ fontSize: '12px' }}>
          {["All", "Pending", "Overdue", "Today", "Completed"].map((type) => (
            <NavItem key={type}>
              <NavLink
                href="#"
                className={classnames({ active: filters.quick === type }, "py-1 px-2 rounded-pill border")}
                onClick={(e) => { e.preventDefault(); handleQuickFilter(type); }}
                style={{ whiteSpace: 'nowrap' }}
              >
                {type}
              </NavLink>
            </NavItem>
          ))}
        </Nav>
      </div>

      <SimpleBar className="pe-2 me-n1 mb-3" style={{ height: "450px" }}>
        <div id="upcoming-event-list">
          {events.length > 0 ? (
            events.map((task, key) => (
              <Card className={classnames("mb-3 shadow-none border", { "border-start border-start-3": true, [`border-start-${getColorClass(task.className)}`]: true })} key={key}>
                <CardBody className="p-3">
                  <div className="d-flex mb-2 align-items-center justify-content-between">
                    <div className="flex-grow-1">
                      <span className="text-muted fs-11 fw-medium">
                        <i className="ri-calendar-event-line align-bottom me-1 text-primary"></i>
                        {formatDate(task.start)}
                        {task.end && formatDate(task.start) !== formatDate(task.end) && (
                          <>
                            <span className="mx-1 text-muted fw-normal">to</span>
                            {formatDate(task.end)}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex-shrink-0 align-self-start d-flex align-items-center">
                      {task.reminder && (
                        <span className="bg-warning-subtle text-warning rounded-circle d-inline-flex align-items-center justify-content-center me-2"
                          style={{ width: "24px", height: "24px" }}
                        >
                          <i className="ri-notification-3-fill fs-14"></i>
                        </span>
                      )}

                      {task.status === "Completed" ? (
                        <Badge color="success" className="bg-success-subtle text-success">
                          <i className="ri-check-line align-bottom me-1"></i> Done
                        </Badge>
                      ) : (
                        <Badge color={getPriorityBadgeColor(task.priority)} pill>
                          {task.priority || "Medium"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <h6 className="card-title fs-14 fw-semibold mb-1 text-dark text-truncate">
                    {task.title}
                  </h6>

                  <p className="text-muted text-truncate-two-lines mb-2 fs-12" style={{ minHeight: '36px' }}>
                    {task.description || "No description provided."}
                  </p>

                  <div className="d-flex align-items-center justify-content-between border-top pt-2">
                    <div className="d-flex align-items-center">
                      <Badge color={getStatusBadgeColor(task.status)} className="me-2">
                        {task.status}
                      </Badge>
                      {!task.allDay && (
                        <small className="text-muted fs-11">
                          <i className="ri-time-line align-bottom me-1"></i>
                          {formatTime(task.start)}
                        </small>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <small className="text-muted fs-11">
                        {users.find(u => u.userId?.toString() === task.assignedUserId?.toString())?.fullName || "Unassigned"}
                      </small>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          ) : (
            <div className="text-center py-5">
              <div className="avatar-md mx-auto mb-3">
                <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                  <i className="ri-task-line"></i>
                </div>
              </div>
              <h5 className="fs-15">No tasks found</h5>
              <p className="text-muted">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </SimpleBar>

      <AdvancedFilterModal
        isOpen={isAdvancedModalOpen}
        toggle={toggleAdvancedModal}
        filters={filters}
        setFilters={setFilters}
        users={users}
      />
    </div>
  );
};

export default UpcomingTasks;
