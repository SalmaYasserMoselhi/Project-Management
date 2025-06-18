"use client"

import { useState, useEffect, useCallback } from "react"
import { MoreHorizontal, Clock, Menu, ChevronDown } from "lucide-react"
import Chart from "react-apexcharts"
import Breadcrumb from "../Components/Breadcrumb"
import { useDispatch, useSelector } from "react-redux"
import { toggleSidebar } from "../features/Slice/ComponentSlice/sidebarSlice"
import CustomDropdown from "../Components/CustomDropdown"
// Import async actions from dashboardActions.js
import {
  fetchHighPriorityTasks,
  fetchCalendarDeadlines,
  fetchActivityLog,
  fetchTaskStats,
} from "../features/Slice/dashboard/dashboardActions"

// Import the action creator from dashboardSlice.js
import { setSelectedDate } from "../features/Slice/dashboard/dashboardSlice"
import axios from "axios"

const styles = `
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

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

.date-button {
  transition: all 0.2s ease-out;
}

.date-button:hover {
  transform: scale(1.05);
}

.date-button.selected {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(77, 45, 97, 0.3);
}

.avatar-hover {
  transition: all 0.2s ease-out;
}

.avatar-hover:hover {
  transform: scale(1.1) rotate(5deg);
}

.table-row {
  transition: all 0.2s ease-out;
}

.table-row:hover {
  background-color: rgba(77, 45, 97, 0.05);
  transform: translateX(4px);
}

.priority-badge {
  transition: all 0.2s ease-out;
}

.priority-badge:hover {
  transform: scale(1.05);
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

/* Chart animation */
.chart-container {
  opacity: 0;
  animation: fadeIn 0.8s ease-out 0.5s forwards;
}
`

// Skeleton components
const TaskCardSkeleton = () => (
  <div className="mb-2 bg-white border border-white rounded-lg p-3 last:mb-0 shadow-sm">
    <div className="loading-skeleton h-4 w-3/4 mb-2"></div>
    <div className="flex gap-2 mb-2">
      <div className="loading-skeleton h-6 w-20"></div>
      <div className="loading-skeleton h-6 w-16"></div>
    </div>
    <div className="border-t border-gray-200 my-2"></div>
    <div className="flex gap-1">
      <div className="loading-skeleton w-5 h-5 rounded-full"></div>
      <div className="loading-skeleton w-5 h-5 rounded-full"></div>
      <div className="loading-skeleton w-5 h-5 rounded-full"></div>
    </div>
  </div>
)

const ActivityRowSkeleton = () => (
  <tr className="border-t border-gray-100">
    <td className="py-2 px-2">
      <div className="loading-skeleton h-4 w-20"></div>
    </td>
    <td className="py-2 px-2">
      <div className="loading-skeleton h-4 w-24"></div>
    </td>
    <td className="py-2 px-2">
      <div className="loading-skeleton h-4 w-32"></div>
    </td>
    <td className="py-2 px-2">
      <div className="loading-skeleton h-4 w-16"></div>
    </td>
    <td className="py-2 px-2">
      <div className="loading-skeleton h-4 w-12"></div>
    </td>
  </tr>
)

function Dashboard() {
  const dispatch = useDispatch()
  const {
    highPriorityTasks,
    highPriorityTasksPagination,
    deadlines,
    activityLog,
    activityLogPagination,
    taskStats,
    selectedDate,
    loading,
    error,
  } = useSelector((state) => state.dashboard)

  const [isMobile, setIsMobile] = useState(false)
  const [initialScrollDone, setInitialScrollDone] = useState(false)
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [loadingMore, setLoadingMore] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [newItemsCount, setNewItemsCount] = useState(0)
  const [cardMembers, setCardMembers] = useState({});

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsInitialLoad(true)
      await Promise.all([
        dispatch(fetchHighPriorityTasks({ page: 1, limit: 10 })),
        dispatch(fetchCalendarDeadlines(selectedDate)),
        dispatch(fetchActivityLog({ page: 1, limit: 10 })),
        dispatch(fetchTaskStats("weekly")),
      ])

      // Add a small delay to show the loading animation
      setTimeout(() => {
        setIsInitialLoad(false)
      }, 800)
    }

    fetchData()
  }, [dispatch, selectedDate])

  // جلب أعضاء كل كارد عند تحميل highPriorityTasks
  useEffect(() => {
    if (Array.isArray(highPriorityTasks)) {
      highPriorityTasks.forEach(async (task) => {
        if (!task.id) return;
        try {
          const res = await axios.get(`http://localhost:3000/api/v1/cards/${task.id}/members`, { withCredentials: true });
          setCardMembers((prev) => ({ ...prev, [task.id]: res.data?.data?.members || [] }));
        } catch (err) {
          setCardMembers((prev) => ({ ...prev, [task.id]: [] }));
        }
      });
    }
  }, [highPriorityTasks]);

  // Get current date info
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentDay = currentDate.getDate()

  // Generate dates for the current month
  const generateDates = (month, year) => {
    const dates = []
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push({
        day: new Date(year, month, i).toLocaleDateString("en-EG", { weekday: "short" }).toLowerCase(),
        date: i,
      })
    }
    return dates
  }

  const dates = generateDates(currentMonth, currentDate.getFullYear())

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Scroll to current date
  useEffect(() => {
    if (!initialScrollDone && currentDay) {
      const todayElement = document.getElementById(`date-${currentDay}`)
      if (todayElement) {
        todayElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }
      setInitialScrollDone(true)
    }
  }, [currentDay, initialScrollDone])

  // Handle date selection with animation
  const handleDateSelect = (date) => {
    setSelectedDay(date)
    const selectedDate = new Date()
    selectedDate.setDate(date)
    const formattedDate = selectedDate.toISOString().split("T")[0]
    dispatch(setSelectedDate(formattedDate))
    dispatch(fetchCalendarDeadlines(formattedDate))

    // Add gentle bounce animation to selected date
    const dateElement = document.getElementById(`date-${date}`)
    if (dateElement) {
      dateElement.classList.add("animate-bounce-gentle")
      setTimeout(() => {
        dateElement.classList.remove("animate-bounce-gentle")
      }, 600)
    }
  }

  // Load more high priority tasks with animation
  const loadMoreHighPriorityTasks = useCallback(async () => {
    if (highPriorityTasksPagination.currentPage < highPriorityTasksPagination.totalPages && !loadingMore) {
      setLoadingMore(true)
      const prevCount = highPriorityTasks.length

      try {
        await dispatch(
          fetchHighPriorityTasks({
            page: highPriorityTasksPagination.currentPage + 1,
            limit: 10,
          }),
        )

        // Animate new items
        setTimeout(() => {
          const newItems = document.querySelectorAll(".task-card:nth-last-child(-n+10)")
          newItems.forEach((item, index) => {
            item.style.opacity = "0"
            item.style.transform = "translateY(20px)"
            setTimeout(() => {
              item.style.transition = "all 0.4s ease-out"
              item.style.opacity = "1"
              item.style.transform = "translateY(0)"
            }, index * 100)
          })
        }, 100)
      } finally {
        setLoadingMore(false)
      }
    }
  }, [dispatch, highPriorityTasksPagination, loadingMore, highPriorityTasks.length])

  // Load more activity log with animation
  const loadMoreActivityLog = useCallback(async () => {
    if (activityLogPagination.currentPage < activityLogPagination.totalPages && !loadingMore) {
      setLoadingMore(true)
      try {
        await dispatch(
          fetchActivityLog({
            page: activityLogPagination.currentPage + 1,
            limit: 10,
          }),
        )

        // Animate new rows
        setTimeout(() => {
          const newRows = document.querySelectorAll(".activity-row:nth-last-child(-n+10)")
          newRows.forEach((row, index) => {
            row.style.opacity = "0"
            row.style.transform = "translateX(-20px)"
            setTimeout(() => {
              row.style.transition = "all 0.3s ease-out"
              row.style.opacity = "1"
              row.style.transform = "translateX(0)"
            }, index * 50)
          })
        }, 100)
      } finally {
        setLoadingMore(false)
      }
    }
  }, [dispatch, activityLogPagination, loadingMore])

  // Format chart data from task stats
  const chartOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    grid: { show: false },
    xaxis: {
      categories: Array.isArray(taskStats?.breakdown) ? taskStats.breakdown.map((item) => item.period) : [],
      labels: { style: { fontSize: "12px" } },
    },
    yaxis: {
      min: 0,
      max:
        Array.isArray(taskStats?.breakdown) && taskStats.breakdown.length > 0
          ? Math.max(...taskStats.breakdown.map((item) => item.completed), 10)
          : 10,
      tickAmount: 6,
      labels: { style: { fontSize: "12px" } },
    },
    tooltip: {
      theme: "light",
    },
    colors: ["#4D2D61"],
    stroke: {
      curve: "smooth",
      width: 2,
      colors: ["#4D2D61"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.5,
        opacityFrom: 0.6,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
  }

  const chartSeries = [
    {
      name: "Tasks Completed",
      data: Array.isArray(taskStats?.breakdown) ? taskStats.breakdown.map((item) => item.completed) : [],
    },
  ]

  // Helper function to get avatar url (copy from TaskCard.jsx)
  const getUserAvatar = (user) => {
    if (user.avatar && user.avatar !== "null" && user.avatar !== "undefined") {
      return user.avatar;
    }
    if (
      user.user &&
      user.user.avatar &&
      user.user.avatar !== "null" &&
      user.user.avatar !== "undefined"
    ) {
      return user.user.avatar;
    }
    let initials;
    let firstName = user.firstName || (user.user && user.user.firstName);
    let lastName = user.lastName || (user.user && user.user.lastName);
    let username = user.username || (user.user && user.user.username);
    let email = user.email || (user.user && user.user.email);
    if (firstName && lastName) {
      initials = `${firstName[0]}${lastName[0]}`;
    } else if (username) {
      initials = username.substring(0, 2).toUpperCase();
    } else if (email) {
      initials = email.substring(0, 2).toUpperCase();
    } else {
      initials = "UN";
    }
    return `https://ui-avatars.com/api/?name=${initials}&background=4D2D61&color=fff&bold=true&size=128`;
  };

  return (
    <div className="bg-white min-h-screen">
      <style>{styles}</style>

      {/* Header with slide-in animation */}
      <div className="p-3 md:p-4 flex items-center animate-slide-in-left">
        {isMobile && (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="mr-2 p-1 rounded-md button-hover"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} className="text-[#4d2d61]" />
          </button>
        )}
        <Breadcrumb />
      </div>

      {/* Loading state with pulse animation */}
      {loading && isInitialLoad && (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4d2d61] animate-pulse-soft"></div>
        </div>
      )}

      {/* Error state with fade-in */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mb-4 animate-fade-in">
          {error.message || "Failed to load dashboard data"}
        </div>
      )}

      <div className="flex flex-col space-y-4 mx-auto px-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4">
          {/* High Priority Tasks with staggered animation */}
          <div className="lg:col-span-3 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200 card-hover animate-fade-in-up stagger-1">
            <h2 className="text-lg font-semibold mb-2 text-[#4d2d61]">High priority tasks</h2>
            <div className="h-[350px] md:h-[390px] flex flex-col">
              <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar px-1">
                {isInitialLoad ? (
                  // Show skeleton loading
                  Array.from({ length: 3 }).map((_, index) => <TaskCardSkeleton key={index} />)
                ) : Array.isArray(highPriorityTasks) && highPriorityTasks.length > 0 ? (
                  highPriorityTasks.map((task, index) => (
                    <div
                      key={`${task.id}-${index}`}
                      className="task-card my-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm card-hover cursor-pointer"
                      onClick={() => {
                        if (task.board && task.board.id) {
                          window.location.href = `/main/workspaces/${task.board.id}/boards/${task.board.id}?cardId=${task.id}`;
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-[#6a3b82] text-sm">{task.title}</span>
                        {task.board && (
                          <span className="text-xs text-gray-400 font-semibold ml-2 whitespace-nowrap" style={{ zIndex: 20 }}>
                            {task.board.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                        <span className="priority-badge bg-red-100 text-red-500 text-xs font-semibold px-2 py-1 rounded-lg">
                          High
                        </span>
                        <div className="flex items-center text-xs px-2 py-1 rounded-lg bg-gray-100">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {task.timeAgo}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      <div className="flex -space-x-0.5 mt-2 items-center">
                        {Array.isArray(cardMembers[task.id]) && cardMembers[task.id].slice(0, 3).map((member, i) => (
                          <div
                            key={i}
                            className="avatar-hover w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white overflow-hidden"
                            title={member.name}
                          >
                            <img
                              src={getUserAvatar(member.user || member)}
                              alt={member.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>
                        ))}
                        {Array.isArray(cardMembers[task.id]) && cardMembers[task.id].length > 3 && (
                          <div className="avatar-hover w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold border-2 border-white">
                            +{cardMembers[task.id].length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-gray-500 text-sm animate-fade-in">No high priority tasks</div>
                )}
              </div>

              {/* Load More Button with bounce animation */}
              {highPriorityTasksPagination.currentPage < highPriorityTasksPagination.totalPages && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <button
                    onClick={loadMoreHighPriorityTasks}
                    disabled={loadingMore}
                    className="w-full py-2 px-4 bg-[#4d2d61] text-white rounded-lg hover:bg-[#4a2c57] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm button-hover"
                  >
                    {loadingMore ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white animate-pulse-soft"></div>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Load More
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Deadlines with Enhanced Scrolling and animations */}
          <div className="lg:col-span-3 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200 card-hover animate-fade-in-up stagger-2">
            <h2 className="text-lg font-semibold text-[#4d2d61] mb-3">Deadlines</h2>
            <div className="h-[350px] md:h-[390px] flex flex-col">
              <div className="mb-4 bg-white border border-white rounded-lg p-3 shadow-sm">
                <h3 className="text-base font-semibold text-[#6a3b82] mb-3">{monthNames[currentMonth]}</h3>
                <div className="relative text-[#6a3b82]">
                  <div className="overflow-x-auto no-scrollbar">
                    <div className="flex space-x-3 mb-3 min-w-max pb-2 pt-3">
                      {dates.map((item) => (
                        <button
                          key={item.date}
                          id={`date-${item.date}`}
                          onClick={() => handleDateSelect(item.date)}
                          className={`date-button flex flex-col items-center min-w-[26px] md:min-w-[36px] rounded-lg px-2 md:px-3 py-1
                            ${
                              selectedDay === item.date
                                ? "bg-[#4d2d61] text-white selected"
                                : "hover:bg-gray-100 text-[#6a3b82]"
                            }
                            ${item.date === currentDay ? "animate-glow" : ""}`}
                        >
                          <span className="text-xs md:text-sm font-bold">{item.day}</span>
                          <span className="font-bold mt-1.5 md:mt-2 text-sm">{item.date}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  {Array.isArray(deadlines) && deadlines.length > 0 ? (
                    deadlines.map((event, index) => (
                      <div
                        key={event.id}
                        className="relative group animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="absolute left-3 top-0 bottom-0 w-1 rounded-full bg-[#4d2d61]" />
                        <div className="pl-4 md:pl-5">
                          <div className="flex justify-between items-start bg-white p-3 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 card-hover">
                            <div>
                              <p className="font-medium text-[#6a3b82] text-sm">{event.title}</p>
                              <p className="text-xs text-gray-500">
                                {event.dueTime} • {event.boardName}
                              </p>
                            </div>
                            <button className="p-1 rounded-full hover:bg-gray-100 transition-all duration-200 button-hover">
                              <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm animate-fade-in">
                      No deadlines for this date
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Total Tasks Chart with progressive animation */}
          <div className="lg:col-span-6 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200 card-hover animate-fade-in-up stagger-3">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-[#4d2d61]">Task Completion</h2>
              <CustomDropdown
                options={[
                  { label: "Weekly", value: "weekly" },
                  { label: "Monthly", value: "monthly" },
                  { label: "Yearly", value: "yearly" },
                ]}
                selected={taskStats?.period || "weekly"}
                onChange={(value) => dispatch(fetchTaskStats(value))}
              />
            </div>
            <div className="h-[190px] md:h-[280px] lg:h-[385px] chart-container">
              <Chart options={chartOptions} series={chartSeries} type="area" height="100%" width="100%" />
            </div>
          </div>
        </div>

        {/* Activity Log with staggered row animations */}
        <div className="bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200 overflow-x-auto card-hover animate-fade-in-up stagger-4 mb-6">
          <h2 className="text-lg font-semibold text-[#4d2d61] mb-3">Activity Log</h2>
          <div className="min-w-full max-h-[270px] overflow-y-auto no-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-gray-500 sticky top-0 z-10 bg-gray-50">
                  <th className="text-left py-2.5 px-2 md:px-3">Member</th>
                  <th className="text-left py-2.5 px-2 md:px-3">Board</th>
                  <th className="text-left py-2.5 px-2 md:px-3">Activity</th>
                  <th className="text-left py-2.5 px-2 md:px-3">Date</th>
                  <th className="text-left py-2.5 px-2 md:px-3">Time</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {isInitialLoad ? (
                  // Show skeleton loading
                  Array.from({ length: 5 }).map((_, index) => <ActivityRowSkeleton key={index} />)
                ) : Array.isArray(activityLog) && activityLog.length > 0 ? (
                  activityLog.map((activity, index) => (
                    <tr key={`${activity.id}-${index}`} className="activity-row border-t border-gray-100 table-row">
                      <td className="py-2 px-2">{activity.user.name}</td>
                      <td className="py-2 px-2">{activity.board.name}</td>
                      <td className="py-2 px-2">{activity.actionText}</td>
                      <td className="py-2 px-2">
                        {activity.formattedDate.split(",")[0]}, {activity.formattedDate.split(",")[1].split(" ")[1]}
                      </td>
                      <td className="py-2 px-2">
                        {activity.formattedDate.split(" ")[3]} {activity.formattedDate.split(" ")[4]}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-gray-500 animate-fade-in">
                      No activities found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Load More Button with bounce animation */}
          {activityLogPagination.currentPage < activityLogPagination.totalPages && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={loadMoreActivityLog}
                disabled={loadingMore}
                className="py-2 px-6 bg-[#4d2d61] text-white rounded-lg hover:bg-[#4a2c57] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 button-hover"
              >
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white animate-pulse-soft"></div>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Load More Activities
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
