

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardIcon from "../assets/Dashboard.png";
import WorkspaceIcon from "../assets/workspace.png";
import CollaborationIcon from "../assets/collabration.png";
import PrivateIcon from "../assets/private.png";
import CalendarIcon from "../assets/calender.png";
import SettingsIcon from "../assets/setting.png";
import AddIcon from "../assets/add.png";
import DropDownIcon from "../assets/drop-down.png";
import LogoIcon from "../assets/Logo.png";
import CloseIcon from "../assets/closee.png"; // Import the close icon

// eslint-disable-next-line react/prop-types
const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const navigate = useNavigate();

  const sidebarItems = [
    {
      icon: DashboardIcon,
      title: "Dashboard",
      path: "main",
    },
    {
      icon: WorkspaceIcon,
      title: "Workspace",
      hasAdd: true,
      hasDropdown: true,
      path: "workspace",
    },
    {
      icon: CollaborationIcon,
      title: "Collaboration",
      hasDropdown: true,
      path: "collaboration",
    },
    {
      icon: PrivateIcon,
      title: "Private",
      hasAdd: true,
      hasDropdown: true,
      path: "private",
    },
    { icon: CalendarIcon, title: "Calendar", path: "calendar" },
    { icon: SettingsIcon, title: "Settings", path: "setting" },
  ];

  const handleItemClick = (title, path) => {
    setActiveItem(title);
    navigate(`/dashboard/${path}`);
   
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  return (
    <div
      className={`fixed left-0 top-0 bottom-0 bg-white shadow-lg p-4 flex flex-col border-r border-gray-200 font-[Nunito] transition-all duration-300 z-50 ${
        isSidebarOpen ? "w-64" : "w-24"
      }`}
    >
      {/* Logo and Close Button Section */}
      <div className="flex items-center justify-between mb-10 mt-2">
        <div
          className={`flex items-center gap-0.5 overflow-hidden ${
            isSidebarOpen ? "ml-2" : "justify-center"
          }`}
        >
          <img
            src={LogoIcon}
            alt="Logo"
            className={`h-9 w-18 min-w-[32px] transition-transform duration-300 font-[Nunito] ${
              !isSidebarOpen && "scale-125"
            }`}
          />
          {isSidebarOpen && (
            <h1 className="logo text-4xl font-bold text-[#4D2D61] -mt-1 -ms-3">
              urora
            </h1>
          )}
        </div>

        {/* Close Button  */}
        {isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-purple-50 rounded-full transition-colors duration-200 -mt-10 "
          >
            <img
              src={CloseIcon}
              alt="Close"
              className="h-5 w-5 filter brightness-0"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(18%) sepia(23%) saturate(1234%) hue-rotate(244deg) brightness(93%) contrast(88%)",
              }} 
            />
          </button>
        )}
      </div>

      {/* Toggle Button  */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-purple-50 rounded-full transition-colors duration-200 mb-4 flex justify-center"
        >
          <img
            src={CloseIcon}
            alt="Toggle Sidebar"
            className="h-5 w-5 filter brightness-0"
            style={{
              filter:
                "brightness(0) saturate(100%) invert(18%) sepia(23%) saturate(1234%) hue-rotate(244deg) brightness(93%) contrast(88%)",
            }} 
          />
        </button>
      )}

      {/* Navigation Items */}
      <nav className="space-y-2">
        {sidebarItems.map((item) => (
          <div
            key={item.title}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
              activeItem === item.title
                ? "bg-[#4D2D61] text-white"
                : "text-gray-900 hover:bg-purple-50"
            } ${isSidebarOpen ? "w-full" : "w-14 justify-center"}`}
            onClick={(e) => {
              e.stopPropagation();
              handleItemClick(item.title, item.path);
            }}
          >
            <div className="flex items-center gap-3">
              <img
                src={item.icon}
                alt={`${item.title} icon`}
                className={`h-6 w-6 ${
                  activeItem === item.title
                    ? "filter brightness-0 invert"
                    : "filter brightness-0"
                }`}
              />
              {isSidebarOpen && (
                <span className="text-sm font-medium">{item.title}</span>
              )}
            </div>

            {isSidebarOpen && (item.hasAdd || item.hasDropdown) && (
              <div className="flex items-center gap-2 ml-2">
                {item.hasAdd && (
                  <img
                    src={AddIcon}
                    alt="Add"
                    className={`h-4 w-4 ${
                      activeItem === item.title
                        ? "filter brightness-0 invert"
                        : "filter brightness-0"
                    }`}
                  />
                )}
                {item.hasDropdown && (
                  <img
                    src={DropDownIcon}
                    alt="Dropdown"
                    className={`h-5 w-5 ${
                      activeItem === item.title
                        ? "filter brightness-0 invert"
                        : "filter brightness-0"
                    }`}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;