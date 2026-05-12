// index.js
//    ├── CalendarLeftPanel
//    │        ├── TaskTemplates
//    │        └── UpcomingTasks
//    │
//    └── CalendarView


import React from "react";
import { Card, CardBody } from "reactstrap";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import multiMonthPlugin from "@fullcalendar/multimonth";
import listPlugin from "@fullcalendar/list";

const CalendarView = ({
  events,
  users = [],
  handleDateClick,
  handleEventClick,
  onDrop,
  handleEventDrop
}) => {
  // Render function for custom event content
  const renderEventContent = (eventInfo) => {
    const categoryClass = eventInfo.event.classNames[0] || "";
    const colorName = categoryClass.split("-")[1] || "primary";
    const textColorClass = `text-${colorName}`;

    return (
      <div className={`text-truncate text-center w-100 ${textColorClass}`} style={{ fontSize: '12px', fontWeight: '600' }}>
        {eventInfo.event.title}
      </div>
    );
  };

  return (
    <Card className="card-h-100">
      <CardBody>
        <FullCalendar
          plugins={[
            BootstrapTheme,
            dayGridPlugin,
            interactionPlugin,
            listPlugin,
            multiMonthPlugin,
          ]}
          initialView="multiMonthYear"
          slotDuration={"00:15:00"}
          handleWindowResize={true}
          themeSystem="bootstrap"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "multiMonthYear,dayGridMonth,dayGridWeek,dayGridDay,listWeek",
          }}
          events={events}
          eventContent={renderEventContent}
          editable={true}
          droppable={true}
          selectable={true}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          drop={onDrop}
          eventDrop={handleEventDrop}
        />
      </CardBody>
    </Card>
  );
};

export default CalendarView;
