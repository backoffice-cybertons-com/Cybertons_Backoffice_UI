import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Legacy route — redirects to the report page with calendar view active. */
const DailyOSCalendarView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeDates = location.state || {};

  useEffect(() => {
    navigate("/report/daily-outstanding-report", {
      replace: true,
      state: {
        viewMode: "calendar",
        fromDate: routeDates.fromDate,
        toDate: routeDates.toDate,
      },
    });
  }, [navigate, routeDates.fromDate, routeDates.toDate]);

  return null;
};

export default DailyOSCalendarView;
