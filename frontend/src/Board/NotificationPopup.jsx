// import { forwardRef } from "react";
// import { CheckCircle, X } from "lucide-react";
// import notify from "../assets/NotificationImage.png";

// const NotificationPopup = forwardRef(
//   (
//     {
//       notifications,
//       loading,
//       unreadCount,
//       onMarkAllAsRead,
//       onMarkSingleAsRead,
//       onDeleteNotification,
//       onPaginate,
//       isPaginateDisabled,
//       onPage,
//       onTotal,
//       onLimit,
//     },
//     ref
//   ) => {
//     // Fallback for isPaginateDisabled if not a function
//     const isDisabled = (direction) => {
//       if (typeof isPaginateDisabled === "function") {
//         return isPaginateDisabled(direction);
//       }
//       console.warn(
//         `isPaginateDisabled is not a function, received: ${typeof isPaginateDisabled}`
//       );
//       return false; // Default to enabled buttons if isPaginateDisabled is not provided
//     };

//     // Handle notification click to mark as read
//     const handleNotificationClick = (notification) => {
//       if (!notification.read && onMarkSingleAsRead) {
//         onMarkSingleAsRead(notification._id);
//       }
//     };

//     return (
//       <div
//         ref={ref}
//         className="absolute top-12 right-4 w-[350px] bg-white shadow-md rounded-lg z-50 border border-gray-200 transform transition-opacity duration-300 ease-in-out opacity-100"
//       >
//         {/* Header */}
//         <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
//           <h2 className="text-sm font-semibold text-black">
//             All Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
//           </h2>
//           <div className="flex items-center space-x-2">
//             <button
//               onClick={onMarkAllAsRead}
//               className="text-sm text-gray-500 hover:underline disabled:text-gray-300"
//               disabled={unreadCount === 0}
//             >
//               Mark all as read
//             </button>
//             {unreadCount === 0 && notifications.length > 0 && (
//               <CheckCircle size={16} className="text-green-500" />
//             )}
//           </div>
//         </div>

//         {/* Body */}
//         <div className="max-h-[300px] overflow-y-auto">
//           {loading ? (
//             <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
//               <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
//               <p className="text-sm text-gray-500">Loading notifications...</p>
//             </div>
//           ) : notifications.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
//               <img
//                 src={notify}
//                 alt="No notifications"
//                 className="w-[200px] h-[130px] mb-3 opacity-90 mt-10"
//               />
//               <p className="text-md font-semibold text-gray-800 mb-1">
//                 No notification yet
//               </p>
//               <p className="text-md text-gray-500">
//                 All notifications will show up here.
//               </p>
//             </div>
//           ) : (
//             <ul className="divide-y divide-gray-200">
//               {notifications.map((notif) => (
//                 <li
//                   key={notif._id}
//                   onClick={() => handleNotificationClick(notif)}
//                   className={`px-5 py-3 text-sm text-gray-700 mb-2 mt-1 rounded-lg shadow-sm transition-all duration-200 cursor-pointer ${
//                     notif.read
//                       ? "bg-gray-50 hover:bg-gray-100"
//                       : "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500 animate-pulse"
//                   }`}
//                 >
//                   <div className="flex justify-between items-start">
//                     <div className="flex-1">
//                       <div
//                         className={`${
//                           notif.read
//                             ? "text-gray-600"
//                             : "text-gray-900 font-medium"
//                         }`}
//                       >
//                         {notif.message}
//                       </div>
//                       <div className="text-xs text-gray-500 mt-1">
//                         {new Date(notif.createdAt)
//                           .toLocaleString("en-US", {
//                             weekday: "long",
//                             hour: "2-digit",
//                             minute: "2-digit",
//                           })
//                           .replace(" at ", " at ") || "Monday at 07:00"}
//                       </div>
//                     </div>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         onDeleteNotification(notif._id);
//                       }}
//                       className="text-gray-500 hover:text-red-500 ml-2"
//                       aria-label="Delete notification"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>

//         {/* Pagination Controls */}
//         {!loading && notifications.length > 0 && (
//           <div className="flex justify-between items-center px-4 py-2 border-t border-gray-200">
//             <button
//               onClick={() => onPaginate("prev")}
//               className="text-sm text-gray-500 hover:underline disabled:text-gray-300"
//               disabled={isDisabled("prev")}
//             >
//               Previous
//             </button>
//             <span className="text-sm text-gray-500">
//               Page {onPage} of {Math.ceil(onTotal / onLimit)}
//             </span>
//             <button
//               onClick={() => onPaginate("next")}
//               className="text-sm text-gray-500 hover:underline disabled:text-gray-300"
//               disabled={isDisabled("next")}
//             >
//               Next
//             </button>
//           </div>
//         )}
//       </div>
//     );
//   }
// );

// export default NotificationPopup;

import { forwardRef } from "react";
import {
  CheckCircle,
  X,
  Bell,
  User,
  MessageCircle,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import notify from "../assets/NotificationImage.png";
import { dateHandler } from "../utils/Date";

const NotificationPopup = forwardRef(
  (
    {
      notifications,
      loading,
      unreadCount,
      onMarkAllAsRead,
      onMarkSingleAsRead,
      onDeleteNotification,
      onPaginate,
      isPaginateDisabled,
      onPage,
      onTotal,
      onLimit,
    },
    ref
  ) => {
    // Fallback for isPaginateDisabled if not a function
    const isDisabled = (direction) => {
      if (typeof isPaginateDisabled === "function") {
        return isPaginateDisabled(direction);
      }
      console.warn(
        `isPaginateDisabled is not a function, received: ${typeof isPaginateDisabled}`
      );
      return false; // Default to enabled buttons if isPaginateDisabled is not provided
    };

    // Handle notification click to mark as read
    const handleNotificationClick = (notification) => {
      if (!notification.read && onMarkSingleAsRead) {
        onMarkSingleAsRead(notification._id);
      }
    };

    // Get notification icon based on type
    const getNotificationIcon = (notification) => {
      const type = notification.type || "general";
      const iconProps = { size: 18, className: "flex-shrink-0" };

      switch (type) {
        case "user_joined":
        case "user_added":
          return (
            <User {...iconProps} className="text-blue-500 flex-shrink-0" />
          );
        case "comment":
        case "comment_added":
          return (
            <MessageCircle
              {...iconProps}
              className="text-green-500 flex-shrink-0"
            />
          );
        case "meeting":
        case "meeting_scheduled":
          return (
            <Calendar
              {...iconProps}
              className="text-purple-500 flex-shrink-0"
            />
          );
        case "card_assigned":
        case "card_updated":
          return (
            <FileText
              {...iconProps}
              className="text-orange-500 flex-shrink-0"
            />
          );
        case "task_completed":
          return (
            <CheckCircle2
              {...iconProps}
              className="text-green-600 flex-shrink-0"
            />
          );
        case "deadline":
        case "due_date":
          return (
            <Clock {...iconProps} className="text-red-500 flex-shrink-0" />
          );
        default:
          return (
            <Bell {...iconProps} className="text-gray-500 flex-shrink-0" />
          );
      }
    };

    return (
      <div
        ref={ref}
        className="absolute top-12 right-2 sm:right-4 w-[calc(100vw-1rem)] sm:w-[380px] max-w-[380px] bg-white shadow-2xl rounded-xl z-50 border border-gray-100 transform transition-all duration-300 ease-out opacity-100 scale-100 backdrop-blur-sm"
        style={{
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] rounded-t-xl">
          <div className="flex items-center space-x-2">
            <Bell size={18} className="text-white sm:hidden" />
            <Bell size={20} className="text-white hidden sm:block" />
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onMarkAllAsRead}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200 disabled:text-gray-300 disabled:bg-white/10 disabled:cursor-not-allowed"
              disabled={unreadCount === 0}
            >
              <CheckCircle size={14} className="mr-1" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Mark all</span>
            </button>
            {unreadCount === 0 && notifications.length > 0 && (
              <CheckCircle size={18} className="text-green-400" />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[250px] sm:max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-purple-300 border-t-[#4d2d61] rounded-full animate-spin"></div>
                <Bell
                  size={20}
                  className="absolute inset-0 m-auto text-[#4d2d61]"
                />
              </div>
              <p className="text-sm text-gray-600 mt-4 font-medium">
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="relative mb-6">
                <img
                  src={notify}
                  alt="No notifications"
                  className="w-24 h-24 opacity-60"
                />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-300 rounded-full flex items-center justify-center">
                  <Bell size={16} className="text-[#4d2d61]" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                You're all caught up!
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                All notifications will appear here when you receive them.
              </p>
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((notif, index) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative mx-2 sm:mx-3 my-1.5 p-2.5 sm:p-3 rounded-lg transition-all duration-200 cursor-pointer border ${
                    notif.read
                      ? "bg-white hover:bg-gray-50 border-transparent hover:border-gray-200"
                      : "bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200 shadow-sm"
                  }`}
                >
                  {/* Unread indicator */}
                  {!notif.read && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-[#4d2d61] rounded-r-full"></div>
                  )}

                  <div className="flex items-start space-x-2.5">
                    {/* Notification Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notif)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm leading-snug ${
                          notif.read
                            ? "text-gray-700"
                            : "text-gray-900 font-medium"
                        }`}
                      >
                        {notif.message}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-500 font-medium">
                          {dateHandler(notif.createdAt)}
                        </span>
                        {!notif.read && (
                          <span className="inline-flex items-center text-xs text-[#4d2d61] font-medium">
                            <div className="w-2 h-2 bg-[#4d2d61] rounded-full mr-1"></div>
                            New
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(notif._id);
                      }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
                      aria-label="Delete notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && notifications.length > 0 && (
          <div className="flex justify-between items-center px-3 sm:px-4 py-3 sm:py-4 border-gray-100 bg-white rounded-b-xl">
            <button
              onClick={() => onPaginate("prev")}
              disabled={isDisabled("prev")}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-[#4d2d61] to-[#7b4397] border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-300 disabled:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ChevronLeft size={14} className="mr-1" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            <div className="flex items-center space-x-1.5 sm:space-x-2.5">
              <span className="text-xs sm:text-sm text-gray-600 font-medium">
                {onPage}/{Math.ceil(onTotal / onLimit)}
              </span>
              <div className="w-px h-3 sm:h-4 bg-gray-300"></div>
              <span className="text-xs text-gray-500 hidden sm:inline">
                {onTotal} total
              </span>
              <span className="text-xs text-gray-500 sm:hidden">{onTotal}</span>
            </div>

            <button
              onClick={() => onPaginate("next")}
              disabled={isDisabled("next")}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-[#4d2d61] to-[#7b4397] border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-300 disabled:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default NotificationPopup;
