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
import Logo from "../assets/Logo.png";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

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
        isSidebarOpen ? "w-60" : "w-24"
      }`}
    >
      {/* Logo and Close Button Section */}
      <div className="relative flex items-center justify-start w-full mb-8 mt-2">
        <img
          src={Logo}
          alt="Logo"
          className="h-10 transition-all duration-300"
        />
        <button
          onClick={toggleSidebar}
          className="absolute top-0 right-0 p-2 hover:bg-gray-100 transition-colors duration-200"
        >
          {isSidebarOpen ? (
            <ChevronsLeft size={20} />
          ) : (
            <ChevronsRight size={20} />
          )}
        </button>
      </div>

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
