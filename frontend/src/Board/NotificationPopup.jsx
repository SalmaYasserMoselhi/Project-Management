
import { forwardRef } from "react";
import notify from "../assets/NotificationImage.png";
import { X } from "lucide-react";

const NotificationPopup = forwardRef(
  ({ notifications, loading, unreadCount, onMarkAllAsRead, onDeleteNotification, onMarkAsRead }, ref) => {
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
          <button
            onClick={onMarkAllAsRead}
            className="text-sm text-gray-500 hover:underline disabled:text-gray-300"
            disabled={unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
          ) : notifications.length === 0 ? (
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
              {notifications.map((notif) => (
                <li
                  key={notif._id}
                  onClick={() => !notif.isRead && onMarkAsRead(notif._id)}
                  className={`px-5 py-3 text-sm text-gray-700 mb-2 mt-1 rounded-lg shadow-sm hover:bg-gray-50 transition-colors duration-200 cursor-pointer ${
                    notif.isRead ? "bg-gray-100" : "bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-gray-900">{notif.message}</div>
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
                        e.stopPropagation(); // Prevent marking as read when clicking delete
                        onDeleteNotification(notif._id);
                      }}
                      className="text-gray-500 hover:text-red-500"
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
      </div>
    );
  }
);

export default NotificationPopup;

