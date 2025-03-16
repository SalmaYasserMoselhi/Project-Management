import { useState, useEffect } from "react";
import { MoreHorizontal, Clock, Menu } from "lucide-react";
import Chart from "react-apexcharts";
import Breadcrumb from "../Components/Breadcrumb";
import { useDispatch } from "react-redux";
import { toggleSidebar } from "../features/Slice/ComponentSlice/sidebarSlice";
import CustomDropdown from "../Components/CustomDropdown";

const data = [
  { name: "Mon", tasks: 20 },
  { name: "Tue", tasks: 35 },
  { name: "Wed", tasks: 30 },
  { name: "Thu", tasks: 55 },
  { name: "Fri", tasks: 40 },
  { name: "Sat", tasks: 50 },
  { name: "Sun", tasks: 35 },
];

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
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState("");
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  const generateDates = (month, year) => {
    const dates = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push({
        day: new Date(year, month, i)
          .toLocaleDateString("en-US", { weekday: "short" })
          .toLowerCase(),
        date: i,
      });
    }
    return dates;
  };

  const dates = generateDates(currentMonth, currentDate.getFullYear());

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  ];

  useEffect(() => {
    setSelectedMonth(monthNames[currentMonth]);

    if (!initialScrollDone) {
      const todayElement = document.getElementById(`date-${currentDay}`);
      if (todayElement) {
        todayElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      setInitialScrollDone(true);
    }
  }, [currentMonth, currentDay, monthNames, initialScrollDone]);

  const events = [
    {
      id: 1,
      title: "UI Motion",
      time: "10:00am - 12:00pm",
      date: 12,
    },
    {
      id: 2,
      title: "UI Design",
      time: "12:00pm - 01:00pm",
      date: 4,
    },
    {
      id: 3,
      title: " task-1",
      time: "10:00am - 12:00pm",
      date: 12,
    },
    {
      id: 4,
      title: " task-2",
      time: "11:00am - 11:30pm",
      date: 18,
    },
    {
      id: 5,
      title: " task-3",
      time: "11:00am - 11:30pm",
      date: 21,
    },
    {
      id: 6,
      title: "UI Motion",
      time: "10:00am - 12:00pm",
      date: 21,
    },
    {
      id: 7,
      title: "UI Motion",
      time: "10:00am - 12:00pm",
      date: 21,
    },
    {
      id: 8,
      title: "UI Motion",
      time: "10:00am - 12:00pm",
      date: 21,
    },
  ];

  const tasks = [
    { name: "Task name", time: "20 hrs ago" },
    { name: "Task name", time: "5 hrs ago" },
    { name: "Task name", time: "1 day ago" },
    { name: "Task name", time: "20 hrs ago" },
    { name: "Task name", time: "20 hrs ago" },
    { name: "Task name", time: "20 hrs ago" },
    { name: "Task name", time: "20 hrs ago" },
  ];
  const filteredEvents = events.filter((event) => event.date === selectedDate);

  const chartOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    grid: { show: false },
    xaxis: {
      categories: data.map((item) => item.name),
      labels: { style: { fontSize: "12px" } },
    },
    yaxis: {
      min: 0,
      max: 60,
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

  const chartSeries = [{ name: "Tasks", data: data.map((item) => item.tasks) }];

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
            <Menu size={24} className="text-[#57356A]" />
          </button>
        )}
        <Breadcrumb />
      </div>

      <div className="flex flex-col space-y-4 mx-auto px-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4">
          {/* High Priority Tasks */}
          <div className="lg:col-span-3 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200">
            <h2 className="text-lg font-semibold mb-2 text-[#57356A]">
              High priority tasks
            </h2>
            <div className="space-y-1 overflow-auto no-scrollbar h-[350px] md:h-[390px]">
              {tasks.map((task, index) => (
                <div
                  key={index}
                  className="mb-2 bg-white border border-white rounded-lg p-3 last:mb-0 shadow-sm"
                >
                  <span className="block font-medium text-[#725483] mb-2 text-sm">
                    {task.name}
                  </span>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                    <span className="bg-red-100 text-red-500 text-xs font-semibold px-2 py-1 rounded-lg">
                      High Priority
                    </span>
                    <div className="flex items-center text-xs px-2 py-1 rounded-lg bg-gray-100">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {task.time}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 my-2"></div>

                  <div className="flex -space-x-0.5 mt-2">
                    {["K", "R", "U"].map((initial, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white"
                      >
                        {initial}
                      </div>
                    ))}
                    <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold border-2 border-white">
                      +2
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deadlines */}
          <div className="lg:col-span-3 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200">
            <h2 className="text-lg font-semibold text-[#57356A] mb-3">
              Deadlines
            </h2>
            <div className="mb-4 bg-white border border-white rounded-lg p-3 last:mb-0 shadow-sm">
              <h3 className="text-base font-semibold text-[#725483] mb-3">
                {selectedMonth}
              </h3>
              <div className="relative text-[#725483]">
                <div className="overflow-x-auto no-scrollbar">
                  <div className="flex space-x-3 mb-3 min-w-max pb-2">
                    {dates.map((item) => (
                      <button
                        key={item.date}
                        id={`date-${item.date}`}
                        onClick={() => setSelectedDate(item.date)}
                        className={`flex flex-col items-center min-w-[26px] md:min-w-[36px] transition-all
                          ${
                            selectedDate === item.date
                              ? "bg-purple-100 rounded-lg px-2 md:px-3 py-1"
                              : "hover:bg-gray-50 px-2 md:px-3 py-1"
                          }`}
                      >
                        <span className="text-xs md:text-sm font-bold text-[#725483]">
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

            <div className="space-y-1 overflow-auto no-scrollbar h-[190px] md:h-[230px] ">
              {filteredEvents.map((event) => (
                <div key={event.id} className="relative group">
                  <div className="absolute left-3 top-0 bottom-0 w-1 rounded-full bg-[#57356A]" />
                  <div className="pl-4 md:pl-5">
                    <div className="flex justify-between items-start bg-white p-3 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-[#725483] text-sm">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500">{event.time}</p>
                      </div>
                      <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredEvents.length === 0 && (
                <div className="text-center py-3 text-gray-500 text-sm">
                  No events scheduled for this date
                </div>
              )}
            </div>
          </div>

          {/* Total Tasks Chart */}
          <div className="lg:col-span-6 bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-[#57356A]">
                Total Tasks
              </h2>

              <CustomDropdown />
            </div>
            <div className="h-[190px] md:h-[280px] lg:h-[385px]">
              <Chart
                options={{
                  ...chartOptions,
                  xaxis: {
                    ...chartOptions.xaxis,
                    labels: { style: { fontSize: "11px" } },
                  },
                  yaxis: {
                    ...chartOptions.yaxis,
                    labels: { style: { fontSize: "11px" } },
                  },
                }}
                series={chartSeries}
                type="area"
                height="100%"
                width="100%"
              />
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-gray-50 rounded-xl shadow-sm p-3 md:p-4 border border-purple-200 overflow-x-auto">
          <h2 className="text-lg font-semibold text-[#57356A] mb-3">
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
                {[
                  {
                    member: "Jane Cooper",
                    board: "Google Backlight",
                    date: "August 24, 2013",
                    time: "02:30 pm",
                  },
                  {
                    member: "Esther Howard",
                    board: "repeater.space",
                    date: "May 29, 2017",
                    time: "04:02 am",
                  },
                  {
                    member: "Cameron Williamson",
                    board: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                  },
                  {
                    member: "Cameron Williamson",
                    board: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                  },
                  {
                    member: "Cameron Williamson",
                    board: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                  },
                  {
                    member: "Cameron Williamson",
                    board: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                  },
                  {
                    member: "Cameron Williamson",
                    board: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                  },
                  {
                    member: "Cameron Williamson",
                    project: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                  },
                  {
                    member: "Cameron Williamson",
                    board: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                  },
                ].map((item, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="py-2 px-2">{item.member}</td>
                    <td className="py-2 px-2">{item.board}</td>
                    <td className="py-2 px-2">Regular text column</td>
                    <td className="py-2 px-2">{item.date}</td>
                    <td className="py-2 px-2">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
