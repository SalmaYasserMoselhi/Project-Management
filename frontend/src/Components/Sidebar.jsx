import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  toggleSidebar,
  setActiveItem,
  toggleWorkspaceOpen,
} from "../features/Slice/ComponentSlice/sidebarSlice";
import { fetchUserData } from "../features/Slice/userSlice/userSlice";

import DashboardIcon from "../assets/Dashboard.png";
import WorkspaceIcon from "../assets/workspaces2.png";
import CollaborationIcon from "../assets/collabration.png";
import PrivateIcon from "../assets/private.png";
import chatIcon from "../assets/chat.png";
import notificationIcon from "../assets/notification.png";
import Avatar from "../assets/defaultAvatar.png";
import LogoF from "../assets/LogoF.png";
import LogoS from "../assets/Logo.png";

import { ChevronLeft, ChevronRight, ChevronsUpDown, X } from "lucide-react";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Get state from Redux store
  const { isSidebarOpen, activeItem, isWorkspaceOpen } = useSelector(
    (state) => state.sidebar
  );
  const { user } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchUserData());

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, [dispatch]);

  const sidebarItems = [
    {
      icon: WorkspaceIcon,
      title: "Workspace",
    },
    {
      icon: CollaborationIcon,
      title: "Collaboration",
    },
    {
      icon: PrivateIcon,
      title: "Private",
    },
  ];

  const handleItemClick = (title, path) => {
    dispatch(setActiveItem(title));
    navigate(`/main/${path}`);

    if (isMobile) {
      dispatch(toggleSidebar());
    }
  };

  return (
    <div
      className={`fixed left-0 top-0 bottom-0 bg-[#4D2D61] shadow-lg p-4 flex flex-col border-r rounded-r-lg border-gray-200 font-[Nunito] transition-all duration-300 z-50 
        ${isSidebarOpen ? "w-60" : "w-20"}
        ${
          isMobile
            ? isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "translate-x-0"
        }
        ${isMobile && "bg-opacity-30 backdrop-blur-xs"}
      `}
    >
      {/* Logo and Close Button Section */}
      <div className="relative flex items-center w-full mb-4 mt-1">
        {isSidebarOpen ? (
          <img
            src={LogoF}
            alt="Logo"
            className="h-10 transition-all duration-300"
          />
        ) : (
          <div className="flex justify-center w-full">
            <img
              src={LogoS}
              alt="Small Logo"
              className="h-8 w-10 transition-all duration-300"
            />
          </div>
        )}

        {/* Close button for mobile */}
        {isMobile && isSidebarOpen && (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="ml-auto p-1 rounded-full bg-white text-[#57356A]"
          >
            <X size={18} />
          </button>
        )}

        {/* Toggle button for desktop */}
        {!isMobile && (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className={`absolute ${
              isSidebarOpen ? "right-0" : "-right-7"
            } top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#57356A] transition-all duration-300 shadow-lg hover:bg-[#65437A] hover:text-white z-10`}
          >
            {isSidebarOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        )}
      </div>
      <hr className="border-t border-[#BBBBBB80] opacity-50 mb-3" />

      {/* Only render the user workspace section if user data is available */}
      {user && (
        <div className="mb-3">
          {isSidebarOpen ? (
            <div
              className="flex items-center justify-between cursor-pointer px-3 py-2.5 rounded-md hover:bg-[#6A3B82]"
              onClick={() => dispatch(toggleWorkspaceOpen())}
            >
              <div className="w-6 h-6 flex items-center justify-center bg-white text-[#4D2D61] font-bold rounded-sm text-sm">
                {user.firstName.charAt(0).toUpperCase()}
              </div>

              <span className="text-sm font-medium flex-1 px-2 truncate text-white">
                {user.firstName}&apos;s Workspaces
              </span>

              <ChevronsUpDown
                className="h-5 w-5 text-white transition-transform duration-200"
                style={{
                  transform: isWorkspaceOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-12 h-12 flex items-center justify-center bg-[#6A3B82] text-white font-bold rounded-xl text-sm">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          <div className="mt-2 space-y-2">
            {/* Notifications */}
            <div
              className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                activeItem === "Notifications"
                  ? "bg-[#6A3B82] text-white"
                  : "text-gray-900 hover:bg-[#6A3B82]"
              } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
              onClick={(e) => {
                e.preventDefault();
                handleItemClick("Notifications", "notifications");
              }}
            >
              <div className="flex items-center gap-3">
                <img
                  src={notificationIcon}
                  alt="Notifications"
                  className={`h-5 w-5 filter brightness-0 invert ${
                    activeItem === "Notifications"
                      ? "filter brightness-0 invert"
                      : "filter brightness-0 invert"
                  }`}
                />
                {isSidebarOpen && (
                  <span className="text-sm font-medium text-white">
                    Notifications
                  </span>
                )}
              </div>
            </div>
            <div
              className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                activeItem === "Chat"
                  ? "bg-[#6A3B82] text-white"
                  : "text-gray-900 hover:bg-[#6A3B82]"
              } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={chatIcon}
                  alt="chat"
                  className={`h-5 w-5 filter brightness-0 invert ${
                    activeItem === "Chat"
                      ? "filter brightness-0 invert"
                      : "filter brightness-0 invert"
                  }`}
                />
                {isSidebarOpen && (
                  <span className="text-sm font-medium text-white">Chat</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <hr className="border-t border-[#BBBBBB80] opacity-50 mb-3" />
      {/* Navigation Items */}
      <nav
        className="space-y-2 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div
          className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
            activeItem === "Dashboard"
              ? "bg-[#6A3B82] text-white"
              : "text-gray-900 hover:bg-[#6A3B82]"
          } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
          onClick={(e) => {
            e.preventDefault();
            handleItemClick("Dashboard", "dashboard");
          }}
        >
          <div className="flex items-center gap-3">
            <img
              src={DashboardIcon}
              alt="Dashboard"
              className={`h-5 w-5 filter brightness-0 invert ${
                activeItem === "Dashboard"
                  ? "filter brightness-0 invert"
                  : "filter brightness-0 invert"
              }`}
            />
            {isSidebarOpen && (
              <span className="text-sm font-medium text-white">Dashboard</span>
            )}
          </div>
        </div>
        {sidebarItems.map((item) => (
          <div
            key={item.title}
            className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
              activeItem === item.title
                ? "bg-[#6A3B82] text-white"
                : "text-gray-900 hover:bg-[#6A3B82]"
            } ${isSidebarOpen ? "w-full" : "w-12 justify-center"}`}
          >
            <div className="flex items-center gap-3">
              <img
                src={item.icon}
                alt={`${item.title} icon`}
                className={`h-5 w-5 filter brightness-0 invert ${
                  activeItem === item.title
                    ? "filter brightness-0 invert"
                    : "filter brightness-0 invert"
                }`}
              />
              {isSidebarOpen && (
                <span className="text-sm font-medium text-white">
                  {item.title}
                </span>
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto">
        <hr className="border-t border-[#BBBBBB80] opacity-50 mb-4" />
        {user && (
          <div
            className={`flex items-center p-3 rounded-2xl bg-[#6A3B82] text-white transition-all duration-300 ${
              isSidebarOpen
                ? "w-full flex-row"
                : "w-12 h-12 flex-col justify-center"
            }`}
          >
            <img
              src={
                user?.avatar && user.avatar !== "default.jpg"
                  ? user.avatar
                  : Avatar
              }
              alt="User Avatar"
              onError={(e) => (e.target.src = Avatar)}
              className={`rounded-full border-gray-600 transition-all duration-300 ${
                isSidebarOpen
                  ? "w-8 h-8 sm:w-10 sm:h-10"
                  : "w-6 h-6 sm:w-8 sm:h-8"
              }`}
            />

            {isSidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-xs sm:text-sm font-medium text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-300 truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;


