"use client";

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
import { fetchUserMeetings } from "../features/Slice/MeetingSlice/meetingsSlice";
import {
  openMeetingModalForEdit,
  updateMeetingName,
  updateMeetingDate,
  updateStartTime,
  updateEndTime,
  updateLink,
  updateInvitees,
  updateColor,
} from "../features/Slice/MeetingSlice/meetingModalSlice";

const styles = `
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Entrance animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0,0,0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(77, 45, 97, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(77, 45, 97, 0.6);
  }
}

/* Animation classes */
.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

.animate-slide-in-left {
  animation: slideInLeft 0.5s ease-out forwards;
}

.animate-pulse-soft {
  animation: pulse 2s ease-in-out infinite;
}

.animate-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}

.animate-bounce-gentle {
  animation: bounce 0.6s ease-out;
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

/* Hover and interaction effects */
.card-hover {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-hover:hover {
  box-shadow: 0 4px 16px rgba(77, 45, 97, 0.10);
  background-color: #faf9fc;
  border-color: #bda4e6;
  transform: scale(1.025);
  z-index: 10;
}

.button-hover {
  transition: all 0.2s ease-out;
}

.button-hover:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(77, 45, 97, 0.2);
}

.button-hover:active {
  transform: translateY(0);
}

.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

/* Staggered animation delays */
.stagger-1 { animation-delay: 0.1s; opacity: 0; }
.stagger-2 { animation-delay: 0.2s; opacity: 0; }
.stagger-3 { animation-delay: 0.3s; opacity: 0; }
.stagger-4 { animation-delay: 0.4s; opacity: 0; }
.stagger-5 { animation-delay: 0.5s; opacity: 0; }
.stagger-6 { animation-delay: 0.6s; opacity: 0; }
.stagger-7 { animation-delay: 0.7s; opacity: 0; }
`;

// Skeleton components for calendar loading
const CalendarHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row justify-between items-center mb-6">
    <div className="flex items-center">
      <div className="flex items-center gap-4 mb-4 md:mb-0">
        <div className="loading-skeleton w-8 h-8 rounded-full"></div>
        <div className="loading-skeleton h-6 w-40"></div>
        <div className="loading-skeleton w-8 h-8 rounded-full"></div>
      </div>
      <div className="ml-4 loading-skeleton h-8 w-16 rounded-lg"></div>
      <div className="ml-2 loading-skeleton h-8 w-8 rounded-lg"></div>
    </div>
    <div className="flex items-center overflow-hidden border border-gray-200 rounded-lg divide-x divide-gray-200">
      <div className="loading-skeleton h-8 w-12"></div>
      <div className="loading-skeleton h-8 w-16"></div>
      <div className="loading-skeleton h-8 w-16"></div>
    </div>
  </div>
);

const CalendarGridSkeleton = () => (
  <div className="w-full">
    {/* Calendar header days */}
    <div className="grid grid-cols-7 border-b border-gray-200">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="p-4 text-center border-r border-gray-200 last:border-r-0"
        >
          <div className="loading-skeleton h-4 w-8 mx-auto"></div>
        </div>
      ))}
    </div>

    {/* Calendar grid */}
    <div className="grid grid-cols-7 min-h-[600px]">
      {Array.from({ length: 35 }).map((_, index) => (
        <div
          key={index}
          className="border-r border-b border-gray-200 last:border-r-0 p-2 min-h-[100px]"
        >
          <div className="loading-skeleton h-4 w-6 mb-2"></div>
          {/* Random events skeleton */}
          {Math.random() > 0.7 && (
            <div className="space-y-1">
              <div className="loading-skeleton h-6 w-full rounded"></div>
              {Math.random() > 0.5 && (
                <div className="loading-skeleton h-6 w-3/4 rounded"></div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const WeekViewSkeleton = () => (
  <div className="w-full">
    {/* Time header */}
    <div className="flex border-b border-gray-200">
      <div className="w-16 p-2">
        <div className="loading-skeleton h-4 w-8"></div>
      </div>
      <div className="flex-1 grid grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="p-2 text-center border-r border-gray-200 last:border-r-0"
          >
            <div className="loading-skeleton h-4 w-8 mx-auto mb-1"></div>
            <div className="loading-skeleton h-6 w-6 mx-auto rounded-full"></div>
          </div>
        ))}
      </div>
    </div>

    {/* Time slots */}
    <div className="flex">
      <div className="w-16">
        {Array.from({ length: 24 }).map((_, index) => (
          <div key={index} className="h-16 p-1 border-b border-gray-200">
            <div className="loading-skeleton h-3 w-8"></div>
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7">
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <div
            key={dayIndex}
            className="border-r border-gray-200 last:border-r-0"
          >
            {Array.from({ length: 24 }).map((_, hourIndex) => (
              <div
                key={hourIndex}
                className="h-16 border-b border-gray-200 p-1"
              >
                {/* Random events */}
                {Math.random() > 0.85 && (
                  <div className="loading-skeleton h-12 w-full rounded"></div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DayViewSkeleton = () => (
  <div className="w-full">
    {/* Day header */}
    <div className="flex border-b border-gray-200 mb-4">
      <div className="w-16 p-2">
        <div className="loading-skeleton h-4 w-8"></div>
      </div>
      <div className="flex-1 p-4 text-center">
        <div className="loading-skeleton h-6 w-32 mx-auto mb-2"></div>
        <div className="loading-skeleton h-8 w-8 mx-auto rounded-full"></div>
      </div>
    </div>

    {/* Time slots */}
    <div className="flex">
      <div className="w-16">
        {Array.from({ length: 24 }).map((_, index) => (
          <div key={index} className="h-16 p-1 border-b border-gray-200">
            <div className="loading-skeleton h-3 w-8"></div>
          </div>
        ))}
      </div>
      <div className="flex-1 border-r border-gray-200">
        {Array.from({ length: 24 }).map((_, index) => (
          <div key={index} className="h-16 border-b border-gray-200 p-1">
            {/* Random events */}
            {Math.random() > 0.9 && (
              <div className="loading-skeleton h-12 w-full rounded"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CalendarLoadingSkeleton = ({ view = "month" }) => (
  <div className="min-h-screen flex flex-col items-center w-full overflow-y-auto bg-white rounded-xl">
    <style>{styles}</style>

    <div className="p-2 w-full h-full flex flex-col">
      {/* Loading indicator */}
      <div className="flex justify-center items-center p-4 mb-4 animate-fade-in-up stagger-1">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4d2d61] animate-pulse-soft"></div>
      </div>

      {/* Header skeleton with staggered animation */}
      <div className="animate-fade-in-up stagger-2">
        <CalendarHeaderSkeleton />
      </div>

      {/* Calendar content skeleton based on view */}
      <div className="animate-fade-in-up stagger-3">
        {view === "month" && <CalendarGridSkeleton />}
        {view === "week" && <WeekViewSkeleton />}
        {view === "day" && <DayViewSkeleton />}
      </div>
    </div>
  </div>
);

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
    const r = Number.parseInt(hexColor.slice(1, 3), 16);
    const g = Number.parseInt(hexColor.slice(3, 5), 16);
    const b = Number.parseInt(hexColor.slice(5, 7), 16);

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
    className: "button-hover",
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

  const handleViewBasedNavigation = (direction) => {
    let newDate = new Date(date);
    if (view === "month") {
      newDate = new Date(
        date.getFullYear(),
        date.getMonth() + (direction === "prev" ? -1 : 1),
        1
      );
    } else if (view === "week") {
      newDate.setDate(date.getDate() + (direction === "prev" ? -7 : 7));
    } else if (view === "day") {
      newDate.setDate(date.getDate() + (direction === "prev" ? -1 : 1));
    }
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

  // Enhanced loading state with sophisticated animations
  if (status === "loading") {
    return <CalendarLoadingSkeleton view={view} />;
  }

  // Error state
  if (status === "failed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center w-full overflow-y-auto bg-white rounded-xl">
        <style>{styles}</style>
        <div className="text-center animate-fade-in-up">
          <div className="text-red-500 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#4D2D61"
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
            className="mt-4 px-4 py-2 bg-[#4D2D61] text-white rounded-lg hover:bg-[#3a1f48] button-hover"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center w-full overflow-y-auto bg-white rounded-xl">
      <style>{styles}</style>
      <div className="p-2 w-full h-full flex flex-col">
        {/* Header Section with Month and Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <button
                className="rounded-full bg-gray-100 w-8 h-8 flex items-center justify-center button-hover"
                onClick={() => handleViewBasedNavigation("prev")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#4D2D61"
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
                className="rounded-full bg-gray-100 w-8 h-8 flex items-center justify-center button-hover"
                onClick={() => handleViewBasedNavigation("next")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#4D2D61"
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
              className="ml-4 text-sm px-3 py-1 rounded-lg text-[#4D2D61] bg-gray-100 button-hover"
              onClick={() => handleNavigate(new Date())}
            >
              Today
            </button>

            <button
              className="ml-2 text-sm px-3 py-1 rounded-lg text-[#4D2D61] bg-gray-100 hover:bg-gray-200 button-hover"
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
                stroke="#4D2D61"
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

          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors button-hover ${
                view === "month"
                  ? "bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white"
                  : "bg-gray-100 text-[#4D2D61] hover:bg-gray-200"
              }`}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors button-hover ${
                view === "week"
                  ? "bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white"
                  : "bg-gray-100 text-[#4D2D61] hover:bg-gray-200"
              }`}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors button-hover ${
                view === "day"
                  ? "bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white"
                  : "bg-gray-100 text-[#4D2D61] hover:bg-gray-200"
              }`}
              onClick={() => setView("day")}
            >
              Day
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
