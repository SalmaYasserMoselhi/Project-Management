"use client";

import { Bell, Menu } from "lucide-react";
import { SlBell } from "react-icons/sl";
import { useEffect, useState } from "react";
import Breadcrumb from "./Breadcrumb";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../features/Slice/ComponentSlice/sidebarSlice";

const Header = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { isSidebarOpen } = useSelector((state) => state.sidebar);
  const [isMobile, setIsMobile] = useState(false);

   // Determine background color based on route
  const headerBgColor = location.pathname.match(/^\/main\/workspaces\/[^/]+\/boards\/[^/]+/)
    ? "bg-[#f5f5f5]"
    : "bg-white";

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

  return (
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
          <div className="relative cursor-pointer">
            <SlBell size={20} className="text-gray-600 hover:text-gray-800" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>

          {/* User Avatar */}
          {loading ? (
            <div className="animate-pulse w-8 h-8 bg-gray-200 rounded-full"></div>
          ) : user ? (
            <img
              src={
                user.avatar && user.avatar !== "default.jpg"
                  ? user.avatar
                  : "/Project-Management-main/frontend/src/assets/defaultAvatar.png"
              }
              alt="User Avatar"
              className="w-7 h-7 rounded-full border border-gray-300"
            />
          ) : (
            <div className="w-7 h-7 bg-gray-300 rounded-full"></div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;



