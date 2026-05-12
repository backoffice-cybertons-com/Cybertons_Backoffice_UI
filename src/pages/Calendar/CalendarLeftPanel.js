// index.js
//    ├── CalendarLeftPanel
//    │        ├── TaskTemplates
//    │        └── UpcomingTasks
//    │
//    └── CalendarView
import React from "react";
import { Card, CardBody } from "reactstrap";
import FeatherIcon from "feather-icons-react";
import TaskTemplates from "./TaskTemplates";
import UpcomingTasks from "./UpcomingTasks";

const CalendarLeftPanel = ({ toggle, onDrag, events, users = [], filters, setFilters }) => {
  return (
    <React.Fragment>
      <Card className="card-h-100">
        <CardBody>
          <button
            className="btn btn-primary w-100"
            id="btn-new-event"
            onClick={toggle}
          >
            <i className="mdi mdi-plus"></i> Create New Event
          </button>

          <TaskTemplates onDrag={onDrag} />
        </CardBody>
      </Card>

      <UpcomingTasks
        events={events}
        users={users}
        filters={filters}
        setFilters={setFilters}
      />

      {/* <Card>
        <CardBody className="bg-info-subtle">
          <div className="d-flex">
            <div className="flex-shrink-0">
              <FeatherIcon
                icon="calendar"
                className="text-info icon-dual-info"
              />
            </div>
            <div className="flex-grow-1 ms-3">
              <h6 className="fs-15">Welcome to your Calendar!</h6>
              <p className="text-muted mb-0">
                Event that applications book will appear here. Click on an event
                to see the details and manage applicants event.
              </p>
            </div>
          </div>
        </CardBody>
      </Card> */}
    </React.Fragment>
  );
};

export default CalendarLeftPanel;
