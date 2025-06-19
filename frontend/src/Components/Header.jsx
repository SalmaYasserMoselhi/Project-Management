"use client";

import { Bell, Menu } from "lucide-react";
import { SlBell } from "react-icons/sl";
import { useEffect, useState, useRef } from "react";
import Breadcrumb from "./Breadcrumb";
import ProfilePopup from "./profilePopup";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../features/Slice/ComponentSlice/sidebarSlice";
import NotificationPopup from "../Board/NotificationPopup";

const Header = () => {
  const user = useSelector((state) => state.user.user);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const dispatch = useDispatch();
  const { isSidebarOpen } = useSelector((state) => state.sidebar);
  const [isMobile, setIsMobile] = useState(false);
  const popupRef = useRef(null);

  // Determine background color based on route
  const headerBgColor = location.pathname.match(
    /^\/main\/workspaces\/[^/]+\/boards\/[^/]+/
  )
    ? "bg-[#f5f5f5]"
    : "bg-white";

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/v1/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch user data");
        }

        const data = await response.json();
        if (data.data && data.data.user) {
          setUser(data.data.user);
        } else {
          throw new Error("Invalid user data format");
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error);
        if (
          error.message.includes("logged in") ||
          error.message.includes("Unauthorized") ||
          error.message.includes("jwt")
        ) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Fetch notifications when popup is opened
  useEffect(() => {
    if (showPopup) {
      const fetchNotifications = async () => {
        setNotificationLoading(true);
        try {
          const response = await fetch("/api/v1/notifications", {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            if (response.status === 401) {
              window.location.href = "/login";
              return;
            }
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Failed to fetch notifications"
            );
          }

          const data = await response.json();
          setNotifications(data.data?.notifications || []);
        } catch (error) {
          console.error("Error fetching notifications:", error);
          if (
            error.message.includes("logged in") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("jwt")
          ) {
            window.location.href = "/login";
          }
        } finally {
          setNotificationLoading(false);
        }
      };

      fetchNotifications();
    }
  }, [showPopup]);

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    setShowPopup((prev) => !prev);
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/v1/notifications/mark-read", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to mark notifications as read"
        );
      }

      // Update notifications to mark them as read
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      if (
        error.message.includes("logged in") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("jwt")
      ) {
        window.location.href = "/login";
      }
    }
  };

  // Mark a single notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `/api/v1/notifications/${notificationId}/mark-read`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to mark notification as read"
        );
      }

      // Update the notification to mark it as read
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      if (
        error.message.includes("logged in") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("jwt")
      ) {
        window.location.href = "/login";
      }
    }
  };

  // Delete a notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete notification");
      }

      // Remove the deleted notification from state
      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
      if (
        error.message.includes("logged in") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("jwt")
      ) {
        window.location.href = "/login";
      }
    }
  };

  // Calculate unread notifications count
  const unreadCount = notifications.filter((notif) => !notif.isRead).length;

  return (
    <>
      <header className={`w-full px-6 py-2 ${headerBgColor}`}>
        {/* Top section with title and user info */}
        <div className="flex items-center justify-between mb-2">
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

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative cursor-pointer" onClick={handleBellClick}>
              <SlBell size={20} className="text-gray-600 hover:text-gray-800" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Notification Popup */}
            {showPopup && (
              <NotificationPopup
                ref={popupRef}
                notifications={notifications}
                loading={notificationLoading}
                unreadCount={unreadCount}
                onMarkAllAsRead={handleMarkAllAsRead}
                onDeleteNotification={handleDeleteNotification}
                onMarkAsRead={handleMarkAsRead}
              />
            )}

            {/* User Avatar */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfilePopupOpen(true)}
                  className="w-8 h-8 rounded-full border border-gray-300 hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all"
                >
                  <img
                    src={
                      user.avatar && user.avatar !== "default.jpg"
                        ? user.avatar
                        : "/Project-Management-main/frontend/src/assets/defaultAvatar.png"
                    }
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

      {/* Profile Popup */}
      <ProfilePopup
        isOpen={isProfilePopupOpen}
        onClose={() => setIsProfilePopupOpen(false)}
        user={user}
      />
    </>
  );
};

export default Header;
