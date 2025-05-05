import { useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import arSA from "date-fns/locale/ar-SA";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

const locales = {
  "en-US": enUS,
  "ar-SA": arSA,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Sample events data - replace with your actual data
const events = [
  {
    title: "Weekly Meeting",
    start: new Date(2025, 4, 7, 10, 0), // July 7, 2023, 10:00 AM
    end: new Date(2025, 4, 7, 11, 0),
    allDay: false,
    resource: "purple",
  },
  {
    title: "Project Kickoff",
    start: new Date(2025, 4, 7, 8, 0), // July 3, 2023, 8:00 AM
    end: new Date(2025, 4, 7, 9, 0),
    allDay: false,
    resource: "gray",
  },
  {
    title: "Creative Workshop",
    start: new Date(2025, 4, 7, 12, 0), // July 14, 2023, 10:00 AM
    end: new Date(2025, 4, 7, 14, 0),
    allDay: false,
    resource: "teal",
  },
  {
    title: "Project Kickoff",
    start: new Date(2025, 4, 8, 11, 0), // July 3, 2023, 8:00 AM
    end: new Date(2025, 4, 8, 12, 0),
    allDay: false,
    resource: "gray",
  },
  {
    title: "One-on-One",
    start: new Date(2025, 4, 27, 13, 0), // July 10, 2023, 1:00 PM
    end: new Date(2025, 4, 27, 14, 0),
    allDay: false,
    resource: "lightblue",
  },
  {
    title: "Weekly Meeting",
    start: new Date(2025, 4, 29, 13, 0), // July 14, 2023, 1:00 PM
    end: new Date(2025, 4, 29, 14, 0),
    allDay: false,
    resource: "purple",
  },
];

// Custom event styling based on event type
const eventStyleGetter = (event) => {
  let backgroundColor = "#6B7280"; // Default gray

  switch (event.resource) {
    case "purple":
      backgroundColor = "#4D2D61";
      break;
    case "teal":
      backgroundColor = "#0D9488";
      break;
    case "lightblue":
      backgroundColor = "#7DD3FC";
      break;
    case "orange":
      backgroundColor = "#F97316";
      break;
    default:
      backgroundColor = "#6B7280";
  }

  const style = {
    backgroundColor,
    borderRadius: "4px",
    opacity: 0.95,
    color: backgroundColor === "#7DD3FC" ? "#000" : "#fff",
    border: "none",
    display: "block",
    fontWeight: "500",
  };

  return {
    style,
  };
};

const Calendar = () => {
  const [date, setDate] = useState(new Date(2025, 4, 29)); // July 10, 2023
  const [view, setView] = useState("month");

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  return (
    <div className="min-h-screen flex flex-col items-center w-full overflow-y-auto bg-white rounded-xl">
      <div className="p-2 w-full h-full flex flex-col">
        {/* Header Section with Month and Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <button
                className="rounded-full bg-gray-100 w-8 h-8 flex items-center justify-center"
                onClick={() =>
                  handleNavigate(
                    new Date(date.getFullYear(), date.getMonth() - 1, 1)
                  )
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <h2 className="text-xl font-semibold mx-4">
                {view === "day"
                  ? format(date, "EEE, MMMM d, yyyy")
                  : format(date, "MMMM, yyyy")}
              </h2>

              <button
                className="rounded-full bg-gray-100 w-8 h-8 flex items-center justify-center"
                onClick={() =>
                  handleNavigate(
                    new Date(date.getFullYear(), date.getMonth() + 1, 1)
                  )
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <button
              className="ml-4 text-sm px-3 py-1 rounded-lg text-[#4D2D61] bg-gray-100"
              onClick={() => handleNavigate(new Date())}
            >
              Today
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className={`px-3 py-1 text-sm border-r-1 border-[#4D2D61] ${
                view === "day"
                  ? "bg-[#4D2D61] text-white rounded-lg"
                  : "text-[#4D2D61]"
              }`}
              onClick={() => setView("day")}
            >
              Day
            </button>
            <button
              className={`px-3 py-1 text-sm border-r-1 border-[#4D2D61] ${
                view === "week"
                  ? "bg-[#4D2D61] text-white rounded-lg"
                  : "text-[#4D2D61]"
              }`}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-lg ${
                view === "month" ? "bg-[#4D2D61] text-white" : "text-[#4D2D61]"
              }`}
              onClick={() => setView("month")}
            >
              Month
            </button>
            {/* <button
              className={`px-3 py-1 text-sm rounded-md ${
                view === "agenda"
                  ? "bg-[#4D2D61] text-white"
                  : "bg-gray-100 text-[#000000D9]"
              }`}
              onClick={() => setView("agenda")}
            >
              Agenda
            </button> */}
          </div>
        </div>
      </div>
      {/* Calendar Component */}
      <div className="w-full">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100vh" }}
          date={date}
          onNavigate={handleNavigate}
          view={view}
          onView={setView}
          eventPropGetter={eventStyleGetter}
          toolbar={false}
          formats={{
            monthHeaderFormat: (date) => format(date, "MMMM yyyy"),
            dayHeaderFormat: (date) => format(date, "EEEE, MMMM d, yyyy"),
            dayRangeHeaderFormat: ({ start, end }) =>
              `${format(start, "MMMM d")} - ${format(end, "d, yyyy")}`,
          }}
        />
      </div>
    </div>
  );
};

export default Calendar;
