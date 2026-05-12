// index.js
//    ├── CalendarLeftPanel
//    │        ├── TaskTemplates
//    │        └── UpcomingTasks
//    │
//    └── CalendarView
import React from "react";
import SimpleBar from "simplebar-react";
import { Card, CardBody, Badge } from "reactstrap";

/**
 * UpcomingTasks Component
 * Displays a list of tasks synchronized with the Redux store.
 * Filters for tasks from today onwards and sorts them by date.
 * Enhanced with Status and Priority badge indicators.
 */
const UpcomingTasks = ({ events, users = [] }) => {

  const [userFilter, setUserFilter] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // Single Source of Truth: Filter and Sort Redux events
  const upcomingEvents = (events || [])
    .filter(event => {
      const eventDate = new Date(event.start);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .filter(event => {
      if (userFilter && event.assignedUserId?.toString() !== userFilter) return false;
      if (priorityFilter && event.priority !== priorityFilter) return false;
      if (statusFilter && event.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start));

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
      case "Low": return "secondary";
      case "Medium": return "primary";
      case "High": return "warning";
      case "Urgent": return "danger";
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

  // Helper to get bootstrap color class from event className (for the icon)
  const getColorClass = (className) => {
    if (!className) return "primary";
    const parts = className.split("-");
    if (parts.length >= 2) return parts[1];
    return "primary";
  };

  return (
    <div className="mt-4">
      {/* <h5 className="mb-1">Upcoming Tasks</h5>
      <p className="text-muted">Don't miss scheduled business tasks</p>
       */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">

        <div>
          <h5 className="mb-1">Task Schedule</h5>

          <p className="text-muted mb-0 fs-13">
            Track upcoming and pending activities
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">

          {/* User Filter */}
          <select
            className="form-select form-select-sm"
            style={{ width: "140px" }}
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.userId} value={user.userId?.toString()}>
                {user.fullName}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            className="form-select form-select-sm"
            style={{ width: "120px" }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {/* Status Filter */}
          <select
            className="form-select form-select-sm"
            style={{ width: "120px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Canceled">Canceled</option>
          </select>

        </div>

      </div>
      <SimpleBar className="pe-2 me-n1 mb-3" style={{ height: "400px" }}>
        <div id="upcoming-event-list">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((task, key) => (
              <Card className="mb-3 shadow-none border" key={key}>
                <CardBody>
                  <div className="d-flex mb-3 align-items-center">
                    <div className="flex-grow-1">
                      <i className={`mdi mdi-checkbox-blank-circle me-2 text-${getColorClass(task.className)}`}></i>
                      <span className="fw-medium">
                        {formatDate(task.start)}
                        {task.end && formatDate(task.start) !== formatDate(task.end) && ` to ${formatDate(task.end)}`}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      {task.allDay ? (
                        <Badge color="info" className="bg-info-subtle text-info">Full day event</Badge>
                      ) : (
                        <small className="text-muted">
                          {formatTime(task.start)}
                          {task.end && ` - ${formatTime(task.end)}`}
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-3">

                    <h6 className="card-title fs-16 fw-semibold mb-0 text-dark">
                      {task.title}
                    </h6>

                    <div className="d-flex gap-2 flex-shrink-0">

                      {/* Priority Badge */}
                      <Badge color={getPriorityBadgeColor(task.priority)} pill>
                        {task.priority || "Medium"}
                      </Badge>

                      {/* Status Badge */}
                      <Badge color={getStatusBadgeColor(task.status)} pill>
                        {task.status || "Pending"}
                      </Badge>

                    </div>
                  </div>
                  <p className="text-muted text-truncate-two-lines mb-1 fs-13">
                    <span className="fw-medium">Assigned To: </span>
                    {users.find(u => u.userId?.toString() === task.assignedUserId?.toString())?.fullName || "Unassigned"}
                  </p>

                  <p className="text-muted text-truncate-two-lines mb-0 fs-13">
                    {task.description || "No description provided."}
                  </p>

                  {/* 
                      FUTURE DASHBOARD INTEGRATION:
                      - Add 'Assigned To' avatar here
                      - Add 'Due In' countdown
                      - Add 'Overdue' alert if applicable
                  */}
                </CardBody>
              </Card>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-muted">No upcoming tasks found.</p>
            </div>
          )}
        </div>
      </SimpleBar>
    </div>
  );
};

export default UpcomingTasks;
