import { useState, useEffect, useCallback } from "react";
import { MoreHorizontal, Clock, Menu, ChevronDown } from "lucide-react";
import Chart from "react-apexcharts";
import Breadcrumb from "../Components/Breadcrumb";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../features/Slice/ComponentSlice/sidebarSlice";
import CustomDropdown from "../Components/CustomDropdown";
// Import async actions from dashboardActions.js
import {
  fetchHighPriorityTasks,
  fetchCalendarDeadlines,
  fetchActivityLog,
  fetchTaskStats
} from "../features/Slice/dashboard/dashboardActions";

// Import the action creator from dashboardSlice.js
import { setSelectedDate, resetHighPriorityTasks, resetActivityLog } from "../features/Slice/dashboard/dashboardSlice";

const styles = `
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
`;

function Dashboard() {
  const dispatch = useDispatch();
  const {
    highPriorityTasks,
    highPriorityTasksPagination,
    deadlines,
    activityLog,
    activityLogPagination,
    taskStats,
    selectedDate,
    loading,
    error
  } = useSelector((state) => state.dashboard);
  
  const [isMobile, setIsMobile] = useState(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [loadingMore, setLoadingMore] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchHighPriorityTasks({ page: 1, limit: 10 }));
    dispatch(fetchCalendarDeadlines(selectedDate));
    dispatch(fetchActivityLog({ page: 1, limit: 10 }));
    dispatch(fetchTaskStats('weekly'));
  }, [dispatch, selectedDate]);

  // Get current date info
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  // Generate dates for the current month
  const generateDates = (month, year) => {
    const dates = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push({
        day: new Date(year, month, i)
          .toLocaleDateString("en-EG", { weekday: "short" })
          .toLowerCase(),
        date: i,
      });
    }
    return dates;
  };

  const dates = generateDates(currentMonth, currentDate.getFullYear());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Scroll to current date
  useEffect(() => {
    if (!initialScrollDone && currentDay) {
      const todayElement = document.getElementById(`date-${currentDay}`);
      if (todayElement) {
        todayElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      setInitialScrollDone(true);
    }
  }, [currentDay, initialScrollDone]);

  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDay(date);
    const selectedDate = new Date();
    selectedDate.setDate(date);
    const formattedDate = selectedDate.toISOString().split('T')[0];
    dispatch(setSelectedDate(formattedDate));
    dispatch(fetchCalendarDeadlines(formattedDate));
  };

  // Load more high priority tasks
  const loadMoreHighPriorityTasks = useCallback(async () => {
    if (highPriorityTasksPagination.currentPage < highPriorityTasksPagination.totalPages && !loadingMore) {
      setLoadingMore(true);
      try {
        await dispatch(fetchHighPriorityTasks({ 
          page: highPriorityTasksPagination.currentPage + 1, 
          limit: 10 
        }));
      } finally {
        setLoadingMore(false);
      }
    }
  }, [dispatch, highPriorityTasksPagination, loadingMore]);

  // Load more activity log
  const loadMoreActivityLog = useCallback(async () => {
    if (activityLogPagination.currentPage < activityLogPagination.totalPages && !loadingMore) {
      setLoadingMore(true);
      try {
        await dispatch(fetchActivityLog({ 
          page: activityLogPagination.currentPage + 1, 
          limit: 10 
        }));
      } finally {
        setLoadingMore(false);
      }
    }
  }, [dispatch, activityLogPagination, loadingMore]);

  // Format chart data from task stats
  const chartOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    grid: { show: false },
    xaxis: {
      categories: Array.isArray(taskStats?.breakdown) 
        ? taskStats.breakdown.map(item => item.period) 
        : [],
      labels: { style: { fontSize: "12px" } },
    },
    yaxis: {
      min: 0,
      max: Array.isArray(taskStats?.breakdown) && taskStats.breakdown.length > 0
        ? Math.max(...taskStats.breakdown.map(item => item.completed), 10)
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
  };

  const chartSeries = [{
    name: "Tasks Completed",
    data: Array.isArray(taskStats?.breakdown) 
      ? taskStats.breakdown.map(item => item.completed) 
      : []
  }];

  return (
    <div className="bg-white min-h-screen">
      <style>{styles}</style>
      <div className="p-3 md:p-4 flex items-center">
        {isMobile && (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="mr-2 p-1 rounded-md"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} className="text-[#4d2d61]" />
          </button>
        )}
        <Breadcrumb />
      </div>

      {loading && (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4d2d61]"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mb-4">
          {error.message || 'Failed to load dashboard data'}
        </div>
      )}

      <div className="flex flex-col space-y-4 mx-auto px-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4">
          {/* High Priority Tasks with Pagination */}
          <div className="lg:col-span-3 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200">
            <h2 className="text-lg font-semibold mb-2 text-[#4d2d61]">
              High priority tasks
            </h2>
            <div className="h-[350px] md:h-[390px] flex flex-col">
              <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                {Array.isArray(highPriorityTasks) && highPriorityTasks.length > 0 ? (
                  highPriorityTasks.map((task, index) => (
                    <div
                      key={`${task.id}-${index}`}
                      className="mb-2 bg-white border border-white rounded-lg p-3 last:mb-0 shadow-sm"
                    >
                      <span className="block font-medium text-[#6a3b82] mb-2 text-sm">
                        {task.title}
                      </span>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                        <span className="bg-red-100 text-red-500 text-xs font-semibold px-2 py-1 rounded-lg">
                          High Priority
                        </span>
                        <div className="flex items-center text-xs px-2 py-1 rounded-lg bg-gray-100">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {task.timeAgo}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      <div className="flex -space-x-0.5 mt-2">
                        {Array.isArray(task.members) && task.members.slice(0, 3).map((member, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white"
                            title={member.name}
                          >
                            {member.name.charAt(0)}
                          </div>
                        ))}
                        {Array.isArray(task.members) && task.members.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold border-2 border-white">
                            +{task.members.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-gray-500 text-sm">
                    No high priority tasks
                  </div>
                )}
              </div>
              
              {/* Load More Button for High Priority Tasks */}
              {highPriorityTasksPagination.currentPage < highPriorityTasksPagination.totalPages && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <button
                    onClick={loadMoreHighPriorityTasks}
                    disabled={loadingMore}
                    className="w-full py-2 px-4 bg-[#4d2d61] text-white rounded-lg hover:bg-[#4a2c57] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {loadingMore ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

          {/* Deadlines with Enhanced Scrolling */}
          <div className="lg:col-span-3 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200">
            <h2 className="text-lg font-semibold text-[#4d2d61] mb-3">
              Deadlines
            </h2>
            <div className="h-[280px] md:h-[320px] flex flex-col">
              <div className="mb-4 bg-white border border-white rounded-lg p-3 shadow-sm">
                <h3 className="text-base font-semibold text-[#6a3b82] mb-3">
                  {monthNames[currentMonth]}
                </h3>
                <div className="relative text-[#6a3b82]">
                  <div className="overflow-x-auto no-scrollbar">
                    <div className="flex space-x-3 mb-3 min-w-max pb-2">
                      {dates.map((item) => (
                        <button
                          key={item.date}
                          id={`date-${item.date}`}
                          onClick={() => handleDateSelect(item.date)}
                          className={`flex flex-col items-center min-w-[26px] md:min-w-[36px] transition-all rounded-lg px-2 md:px-3 py-1
                            ${
                              selectedDay === item.date
                                ? "bg-[#4d2d61] text-white"
                                : "hover:bg-gray-100 text-[#6a3b82]"
                            }`}
                        >
                          <span className="text-xs md:text-sm font-bold">
                            {item.day}
                          </span>
                          <span className="font-bold mt-1.5 md:mt-2 text-sm">
                            {item.date}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  {Array.isArray(deadlines) && deadlines.length > 0 ? (
                    deadlines.map((event) => (
                      <div key={event.id} className="relative group">
                        <div className="absolute left-3 top-0 bottom-0 w-1 rounded-full bg-[#4d2d61]" />
                        <div className="pl-4 md:pl-5">
                          <div className="flex justify-between items-start bg-white p-3 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="font-medium text-[#6a3b82] text-sm">
                                {event.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {event.dueTime} • {event.boardName}
                              </p>
                            </div>
                            <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No deadlines for this date
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Total Tasks Chart */}
          <div className="lg:col-span-6 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-[#4d2d61]">
                Task Completion
              </h2>
              <CustomDropdown 
                options={[
                  { label: "Weekly", value: "weekly" },
                  { label: "Monthly", value: "monthly" },
                  { label: "Yearly", value: "yearly" }
                ]}
                selected={taskStats?.period || "weekly"}
                onChange={(value) => dispatch(fetchTaskStats(value))}
              />
            </div>
            <div className="h-[190px] md:h-[280px] lg:h-[385px]">
              <Chart
                options={chartOptions}
                series={chartSeries}
                type="area"
                height="100%"
                width="100%"
              />
            </div>
          </div>
        </div>

        {/* Activity Log with Pagination */}
        <div className="bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200 overflow-x-auto">
          <h2 className="text-lg font-semibold text-[#4d2d61] mb-3">
            Activity Log
          </h2>
          <div className="min-w-full max-h-[270px] overflow-y-auto no-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-gray-500">
                  <th className="text-left py-2.5 px-2 md:px-3">Member</th>
                  <th className="text-left py-2.5 px-2 md:px-3">Board</th>
                  <th className="text-left py-2.5 px-2 md:px-3">Activity</th>
                  <th className="text-left py-2.5 px-2 md:px-3">Date</th>
                  <th className="text-left py-2.5 px-2 md:px-3">Time</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {Array.isArray(activityLog) && activityLog.length > 0 ? (
                  activityLog.map((activity, index) => (
                    <tr key={`${activity.id}-${index}`} className="border-t border-gray-100">
                      <td className="py-2 px-2">{activity.user.name}</td>
                      <td className="py-2 px-2">{activity.board.name}</td>
                      <td className="py-2 px-2">{activity.actionText}</td>
                      <td className="py-2 px-2">
                        {activity.formattedDate.split(',')[0]}, {activity.formattedDate.split(',')[1].split(' ')[1]}
                      </td>
                      <td className="py-2 px-2">
                        {activity.formattedDate.split(' ')[3]} {activity.formattedDate.split(' ')[4]}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-gray-500">
                      No activities found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Load More Button for Activity Log */}
          {activityLogPagination.currentPage < activityLogPagination.totalPages && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={loadMoreActivityLog}
                disabled={loadingMore}
                className="py-2 px-6 bg-[#4d2d61] text-white rounded-lg hover:bg-[#4a2c57] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
  );
}

export default Dashboard;