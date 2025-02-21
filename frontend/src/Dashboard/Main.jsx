import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";
import { MoreHorizontal, Clock } from "lucide-react";

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

function Main() {
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState("");
  const [initialScrollDone, setInitialScrollDone] = useState(false);

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

    // نتحقق ما إذا كان هذا أول تحميل للمكون
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

  // eslint-disable-next-line react/prop-types
  const CustomTooltip = ({ active, payload }) => {
    // eslint-disable-next-line react/prop-types
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white text-sm rounded-lg px-3 py-1 shadow-md">
          {/*eslint-disable-next-line react/prop-types*/}
          {payload[0].value}
        </div>
      );
    }
    return null;
  };

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

  return (
    <div className=" bg-white min-h-screen font-sans">
      <style>{styles}</style>

      <div className="flex flex-col space-y-6 ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          {/* High Priority Tasks */}
          <div className="lg:col-span-3 bg-gray-50 rounded-2xl shadow-sm p-4 md:p-6 border border-purple-200  ">
            <h2 className="text-lg font-semibold mb-4 text-[#57356A]">
              High priority tasks
            </h2>
            <div className="space-y-3 overflow-auto no-scrollbar h-[350px]">
              {tasks.map((task, index) => (
                <div
                  key={index}
                  className="mb-3 bg-white border border-white rounded-lg p-3 last:mb-0 shadow-sm h-[115px]"
                >
                  <span className="block font-medium text-[#725483] mb-1">
                    {task.name}
                  </span>

                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                    <span className="bg-red-100 text-red-500 text-xs font-semibold px-2 py-1 rounded-lg">
                      High Priority
                    </span>
                    <div className="flex items-center text-xs px-2 py-1 rounded-lg bg-gray-100">
                      <Clock className="w-3.5 h-3.5 mr-1" />{" "}
                      {/* تصغير الأيقونة قليلاً */}
                      {task.time}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 my-1"></div>

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
          <div className=" lg:col-span-3 bg-gray-50 rounded-2xl shadow-sm p-4 md:p-6 border border-purple-200">
            <h2 className="text-lg font-semibold  text-[#57356A] mb-4">
              Deadlines
            </h2>
            <div className="mb-8 bg-white border border-white rounded-lg p-3 last:mb-0 shadow-sm h-36">
              <h3 className="text-lg font-semibold text-[#725483] mb-3">
                {selectedMonth}
              </h3>
              <div className="relative text-[#725483]">
                <div className="overflow-x-auto no-scrollbar">
                  <div className="flex space-x-3 md:space-x-4 mb-4 min-w-max pb-2">
                    {dates.map((item) => (
                      <button
                        key={item.date}
                        id={`date-${item.date}`}
                        onClick={() => setSelectedDate(item.date)}
                        className={`flex flex-col items-center min-w-[32px] md:min-w-[40px] transition-all
                          ${
                            selectedDate === item.date
                              ? "bg-purple-100 rounded-lg px-2 md:px-3 py-1"
                              : "hover:bg-gray-50 px-2 md:px-3 py-1"
                          }`}
                      >
                        <span className="text-sm font-bold text-[#725483]">
                          {item.day}
                        </span>
                        <span className="font-bold  mt-3">{item.date}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 overflow-auto no-scrollbar h-[180px]">
              {filteredEvents.map((event) => (
                <div key={event.id} className="relative group ">
                  <div className="absolute left-3 top-0 bottom-0 w-1  rounded-full bg-[#57356A]" />
                  <div className="pl-4 md:pl-6">
                    <div className="flex justify-between items-start bg-white p-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-[#725483] ">
                          {event.title}
                        </p>
                        <p className="text-sm text-gray-500">{event.time}</p>
                      </div>
                      <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredEvents.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No events scheduled for this date
                </div>
              )}
            </div>
          </div>

          {/* Total Tasks Chart */}
          <div className=" lg:col-span-6 bg-gray-50 rounded-2xl shadow-sm p-4 md:p-6 border border-purple-200">
            <div className="flex justify-between items-center mb-30">
              <h2 className="text-lg font-semibold  text-[#57356A]">
                Total Tasks
              </h2>
              <select className="text-sm border rounded-lg px-2 md:px-3 py-1 bg-gray-50 ">
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Yearly</option>
              </select>
            </div>
            <div className="h-48 md:h-52 flex flex-col  justify-end ">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 10, right: 0, left: -10, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    domain={[0, "dataMax + 10"]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: "3 3" }}
                  />
                  <defs>
                    <linearGradient
                      id="colorGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#4D2D61" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4D2D61" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="tasks"
                    stroke={false}
                    fill="url(#colorGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="tasks"
                    stroke="#4D2D61"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-gray-50 rounded-2xl shadow-sm p-4 md:p-6 border border-purple-200">
          <h2 className="text-lg font-semibold  text-[#57356A] mb-4">
            Activity Log
          </h2>
          <div className="min-w-[768px]">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-gray-500">
                  <th className="text-left py-3 px-4">Num</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Projects</th>
                  <th className="text-left py-3 px-4">Activity</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  {
                    name: "Jane Cooper",
                    project: "Google Backlight",
                    date: "August 24, 2013",
                    time: "02:30 pm",
                    status: "Active",
                  },
                  {
                    name: "Esther Howard",
                    project: "repeater.space",
                    date: "May 29, 2017",
                    time: "04:02 am",
                    status: "Active",
                  },
                  {
                    name: "Cameron Williamson",
                    project: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                    status: "In progress",
                  },
                  {
                    name: "Cameron Williamson",
                    project: "Trekverse",
                    date: "March 6, 2018",
                    time: "08:20 pm",
                    status: "Completed",
                  },
                ].map((item, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="py-4 px-4">{index + 1}</td>
                    <td className="py-4 px-4">{item.name}</td>
                    <td className="py-4 px-4">{item.project}</td>
                    <td className="py-4 px-4">Regular text column</td>
                    <td className="py-4 px-4">{item.date}</td>
                    <td className="py-4 px-4">{item.time}</td>
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

export default Main;
