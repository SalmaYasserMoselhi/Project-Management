"use client";

import { Menu } from "lucide-react";
import { SlBell } from "react-icons/sl";
import { useEffect, useState, useRef } from "react";
import Breadcrumb from "./Breadcrumb";
import ProfilePopup from "./profilePopup";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../features/Slice/ComponentSlice/sidebarSlice";
import NotificationPopup from "../Board/NotificationPopup";
import { openPopup } from "../features/Slice/userSlice/profilePopupSlice";
import {
  togglePopup,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  selectNotifications,
  selectNotificationLoading,
  selectShowNotificationPopup,
  selectUnreadCount,
  selectTotalNotifications,
  selectCurrentPage,
  selectLimit,
  setPage,
} from "../features/Slice/userSlice/notificationSlice";
import { io } from "socket.io-client";

const Header = () => {
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const { isSidebarOpen } = useSelector((state) => state.sidebar);
  const [isMobile, setIsMobile] = useState(false);
  const popupRef = useRef(null);
  const socketRef = useRef(null);

  // Notification state from Redux
  const notifications = useSelector(selectNotifications);
  const notificationLoading = useSelector(selectNotificationLoading);
  const showPopup = useSelector(selectShowNotificationPopup);
  const unreadCount = useSelector(selectUnreadCount);
  const totalNotifications = useSelector(selectTotalNotifications);
  const currentPage = useSelector(selectCurrentPage);
  const limit = useSelector(selectLimit);

  // Debug unread count changes
  useEffect(() => {
    console.log('Unread count changed:', unreadCount);
  }, [unreadCount]);

  // Refresh data when popup opens
  useEffect(() => {
    if (showPopup) {
      console.log('Popup opened, refreshing notifications...');
      // Reset to first page and fetch fresh data
      dispatch(setPage(1));
      dispatch(fetchNotifications({ page: 1, limit }));
      dispatch(fetchUnreadCount());
    }
  }, [showPopup, dispatch, limit]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user?._id) {
      // Get JWT token from localStorage or cookies
      const token = localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      
      socketRef.current = io("http://localhost:5000", {
        auth: {
          userId: user._id,
          token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('Header Socket.IO connected');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Header Socket.IO disconnected');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Header Socket.IO connection error:', error);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user?._id]);

  // Determine background color based on route
  const headerBgColor = location.pathname.match(
    /^\/main\/workspaces\/[^/]+\/boards\/[^/]+/
  )
    ? "bg-[#f5f5f5]"
    : "bg-white";

  // Fetch unread count on component mount
  useEffect(() => {
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        dispatch(togglePopup());
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dispatch]);

  // Check for mobile view
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

  // Toggle notification popup
  const handleBellClick = () => {
    // If popup is closed, open it and fetch data
    if (!showPopup) {
      dispatch(togglePopup());
      
      // Always fetch fresh notifications when opening popup
      dispatch(fetchNotifications({ page: 1, limit }));
      
      // Refresh unread count
      dispatch(fetchUnreadCount());
    } else {
      // If popup is open, just close it
      dispatch(togglePopup());
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    dispatch(markAllNotificationsAsRead()).then(() => {
      dispatch(fetchUnreadCount());
      // Emit Socket.IO event
      if (socketRef.current) {
        socketRef.current.emit("all notifications read", { userId: user._id });
      }
    });
  };

  // Mark a single notification as read
  const handleMarkSingleAsRead = (notificationId) => {
    dispatch(markNotificationAsRead(notificationId)).then(() => {
      dispatch(fetchUnreadCount());
      // Emit Socket.IO event
      if (socketRef.current) {
        socketRef.current.emit("notification read", { 
          userId: user._id, 
          notificationId 
        });
      }
    });
  };

  // Delete a notification
  const handleDeleteNotification = (notificationId) => {
    dispatch(deleteNotification(notificationId)).then(() => {
      dispatch(fetchUnreadCount());
    });
  };

  // Handle pagination
  const handlePaginate = (direction) => {
    const newPage = direction === "next" ? currentPage + 1 : currentPage - 1;
    dispatch(setPage(newPage));
    dispatch(fetchNotifications({ page: newPage, limit }));
  };

  // Disable pagination buttons
  const isPaginateDisabled = (direction) => {
    if (direction === "prev") {
      return currentPage <= 1;
    }
    if (direction === "next") {
      return currentPage >= Math.ceil(totalNotifications / limit);
    }
    return false;
  };

  // Debug prop passing
  useEffect(() => {
    console.log("isPaginateDisabled type:", typeof isPaginateDisabled);
    console.log("isPaginateDisabled value:", isPaginateDisabled);
  }, []);

  return (
    <>
      <header className={`w-full px-6 py-1 ${headerBgColor} relative`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center animate-slide-in-left">
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

          <div className="flex items-center space-x-5">
            {/* Notifications */}
            <div
              className="relative cursor-pointer w-8 h-8 flex items-center justify-center"
              onClick={handleBellClick}
            >
              <SlBell size={20} className="text-gray-600 hover:text-gray-800" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* User Avatar */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => dispatch(openPopup())}
                  className="w-8 h-8 rounded-full border border-gray-300 hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all overflow-hidden"
                >
                  <img
                    src={user.avatar || ""}
                    onError={(e) => {
                      e.target.onerror = null;
                      const name = user.username || user.email || "User";
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        name
                      )}&background=4D2D61&color=fff&bold=true&size=128`;
                    }}
                    alt="User Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                </button>
                <div
                  className={`absolute bottom-2 -right-1.5 w-3.5 h-3.5 border-2 border-white rounded-full ${
                    user?.status === "online" ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></div>
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Popup */}
      {showPopup && (
        <div ref={popupRef}>
          <NotificationPopup
            notifications={notifications}
            loading={notificationLoading}
            unreadCount={unreadCount}
            onMarkAllAsRead={handleMarkAllAsRead}
            onMarkSingleAsRead={handleMarkSingleAsRead}
            onDeleteNotification={handleDeleteNotification}
            onPaginate={handlePaginate}
            isPaginateDisabled={isPaginateDisabled}
            onPage={currentPage}
            onTotal={totalNotifications}
            onLimit={limit}
          />
        </div>
      )}

      {/* Profile Popup */}
      <ProfilePopup user={user} />
    </>
  );
};

export default Header;

