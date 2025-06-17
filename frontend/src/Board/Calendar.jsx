import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import arSA from "date-fns/locale/ar-SA";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";
import { fetchUserMeetings } from "../features/Slice/ComponentSlice/meetingsSlice";
import {
  openMeetingModalForEdit,
  updateMeetingName,
  updateMeetingDate,
  updateStartTime,
  updateEndTime,
  updateLink,
  updateInvitees,
  updateColor,
} from "../features/Slice/ComponentSlice/meetingModalSlice";

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

// Helper function to convert time string to minutes
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

// Helper function to convert meetings to calendar events
const transformMeetingsToEvents = (meetings) => {
  return meetings.map((meeting, index) => {
    const meetingDate = new Date(meeting.date);

    // Parse start and end times
    const startMinutes = timeToMinutes(meeting.time.startTime);
    const endMinutes = timeToMinutes(meeting.time.endTime);

    // Create start and end datetime objects
    const startDateTime = new Date(meetingDate);
    startDateTime.setHours(
      Math.floor(startMinutes / 60),
      startMinutes % 60,
      0,
      0
    );

    const endDateTime = new Date(meetingDate);
    endDateTime.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

    // Use meeting color if available, otherwise fallback to default colors
    let eventColor = meeting.color || "#4D2D61"; // Default color

    // If no color is set, use fallback colors
    if (!meeting.color) {
      const colors = ["#4D2D61", "#0D9488", "#7DD3FC", "#F97316", "#6B7280"];
      const colorIndex = index % colors.length;
      eventColor = colors[colorIndex];
    }

    return {
      id: meeting._id,
      title: meeting.name,
      start: startDateTime,
      end: endDateTime,
      allDay: false,
      resource: eventColor, // Use the actual color instead of color name
      meetingData: meeting, // Store original meeting data for reference
    };
  });
};

// Custom event styling based on event color
const eventStyleGetter = (event) => {
  const backgroundColor = event.resource || "#6B7280"; // Use the color from resource or default gray

  // Determine text color based on background brightness
  const getTextColor = (hexColor) => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate brightness using luminance formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return black for light colors, white for dark colors
    return brightness > 128 ? "#000" : "#fff";
  };

  const style = {
    backgroundColor,
    borderRadius: "4px",
    opacity: 0.95,
    color: getTextColor(backgroundColor),
    border: "none",
    display: "block",
    fontWeight: "500",
  };

  return {
    style,
  };
};

const Calendar = () => {
  const dispatch = useDispatch();
  const { meetings, status, error } = useSelector((state) => state.meetings);

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("month");

  // Transform meetings to calendar events
  const events = transformMeetingsToEvents(meetings);

  // Fetch meetings when component mounts
  useEffect(() => {
    dispatch(fetchUserMeetings());
  }, [dispatch]);

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  // Handle event click to open meeting modal with meeting data
  const handleEventClick = (event) => {
    const meeting = event.meetingData;

    // Parse meeting date
    const meetingDate = new Date(meeting.date);

    // Parse start and end times
    const startTimeStr = meeting.time.startTime;
    const endTimeStr = meeting.time.endTime;

    // Create Date objects for start and end times
    const startTime = new Date();
    const [startHours, startMinutes] = startTimeStr.split(":").map(Number);
    startTime.setHours(startHours, startMinutes, 0, 0);

    const endTime = new Date();
    const [endHours, endMinutes] = endTimeStr.split(":").map(Number);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Populate the modal with meeting data
    dispatch(updateMeetingName(meeting.name || ""));
    dispatch(updateMeetingDate(meetingDate));
    dispatch(updateStartTime(startTime));
    dispatch(updateEndTime(endTime));
    dispatch(updateLink(meeting.onlineLink || ""));
    dispatch(updateInvitees(meeting.attendees || []));
    dispatch(updateColor(meeting.color || "#4D2D61"));

    // Open the modal in edit mode
    dispatch(openMeetingModalForEdit(meeting._id));
  };

  // Handle refresh button
  const handleRefresh = () => {
    dispatch(fetchUserMeetings());
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center w-full overflow-y-auto bg-white rounded-xl">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4D2D61]"></div>
          <span>Loading meetings...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "failed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center w-full overflow-y-auto bg-white rounded-xl">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Failed to load meetings</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => dispatch(fetchUserMeetings())}
            className="mt-4 px-4 py-2 bg-[#4D2D61] text-white rounded-lg hover:bg-[#3a1f48]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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

            <button
              className="ml-2 text-sm px-3 py-1 rounded-lg text-[#4D2D61] bg-gray-100 hover:bg-gray-200"
              onClick={handleRefresh}
              disabled={status === "loading"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${
                  status === "loading" ? "animate-spin" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center overflow-hidden border border-gray-200 rounded-lg divide-x divide-gray-200">
            <button
              className={`px-3 py-1 text-sm transition-colors ${
                view === "day"
                  ? "bg-[#4D2D61] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setView("day")}
            >
              Day
            </button>
            <button
              className={`px-3 py-1 text-sm transition-colors ${
                view === "week"
                  ? "bg-[#4D2D61] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={`px-3 py-1 text-sm transition-colors ${
                view === "month"
                  ? "bg-[#4D2D61] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setView("month")}
            >
              Month
            </button>
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
          onSelectEvent={handleEventClick}
          toolbar={false}
          formats={{
            monthHeaderFormat: (date) => format(date, "MMMM yyyy"),
            dayHeaderFormat: (date) => format(date, "EEEE, MMMM d, yyyy"),
            dayRangeHeaderFormat: ({ start, end }) =>
              `${format(start, "MMMM d")} - ${format(end, "d, yyyy")}`,
          }}
          components={{
            // Custom component for when there are no events
            noEventsLabel: () => (
              <div className="text-center text-gray-500 py-4">
                <p className="text-lg mb-2">No meetings scheduled</p>
                <p className="text-sm">
                  Your meetings will appear here once created
                </p>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
};

export default Calendar;
