import { forwardRef } from "react";
import { CheckCircle, X } from "lucide-react";
import notify from "../assets/NotificationImage.png";

const NotificationPopup = forwardRef(
  ({ notifications, loading, unreadCount, onMarkAllAsRead, onMarkSingleAsRead, onDeleteNotification, onPaginate, isPaginateDisabled, onPage, onTotal, onLimit }, ref) => {
    // Fallback for isPaginateDisabled if not a function
    const isDisabled = (direction) => {
      if (typeof isPaginateDisabled === "function") {
        return isPaginateDisabled(direction);
      }
      console.warn(`isPaginateDisabled is not a function, received: ${typeof isPaginateDisabled}`);
      return false; // Default to enabled buttons if isPaginateDisabled is not provided
    };

    // Handle notification click to mark as read
    const handleNotificationClick = (notification) => {
      if (!notification.read && onMarkSingleAsRead) {
        onMarkSingleAsRead(notification._id);
      }
    };

    // Sort notifications: unread first, then by creation date
    const sortedNotifications = [...notifications].sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1; // Unread first
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
    });

    return (
      <div
        ref={ref}
        className="absolute top-12 right-4 w-[350px] bg-white shadow-md rounded-lg z-50 border border-gray-200 transform transition-opacity duration-300 ease-in-out opacity-100"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-black">
            All Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-gray-500 hover:underline disabled:text-gray-300"
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
            {unreadCount === 0 && notifications.length > 0 && (
              <CheckCircle size={16} className="text-green-500" />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
          ) : sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <img
                src={notify}
                alt="No notifications"
                className="w-[200px] h-[130px] mb-3 opacity-90 mt-10"
              />
              <p className="text-md font-semibold text-gray-800 mb-1">
                No notification yet
              </p>
              <p className="text-md text-gray-500">
                All notifications will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {sortedNotifications.map((notif) => (
                <li
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-5 py-3 text-sm text-gray-700 mb-2 mt-1 rounded-lg shadow-sm transition-all duration-200 cursor-pointer ${
                    notif.read 
                      ? 'bg-gray-50 hover:bg-gray-100' 
                      : 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500 animate-pulse'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className={`${notif.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                        {notif.message}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(notif.createdAt).toLocaleString("en-US", {
                          weekday: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).replace(" at ", " at ") || "Monday at 07:00"}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(notif._id);
                      }}
                      className="text-gray-500 hover:text-red-500 ml-2"
                      aria-label="Delete notification"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && sortedNotifications.length > 0 && (
          <div className="flex justify-between items-center px-4 py-2 border-t border-gray-200">
            <button
              onClick={() => onPaginate("prev")}
              className="text-sm text-gray-500 hover:underline disabled:text-gray-300"
              disabled={isDisabled("prev")}
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {onPage} of {Math.ceil(onTotal / onLimit)}
            </span>
            <button
              onClick={() => onPaginate("next")}
              className="text-sm text-gray-500 hover:underline disabled:text-gray-300"
              disabled={isDisabled("next")}
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default NotificationPopup;

